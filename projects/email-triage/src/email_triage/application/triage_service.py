"""Triage service use case: orchestrates the decrypt → analyse → route pipeline.

TriageService runs as the agent process main loop. It watches the queue for
new .gpg files, decrypts each one in memory, calls Claude for classification,
routes the result, and moves the file to done/ or failed/.

Concurrency: multiple emails can be analysed simultaneously up to
max_concurrent (bounded by asyncio.Semaphore). This prevents Claude API
calls from serialising on one email at a time while keeping memory pressure
bounded.

Exports:
    TriageService: Orchestrates the agent pipeline for each queued file.
    EmailRouter: Routes TriageResult to configured destinations.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import threading
from pathlib import Path

import httpx
import structlog

from email_triage.domain.interfaces import Decryptor, EmailQueueReader, TriageAnalyzer
from email_triage.domain.models import TriageResult

log: structlog.BoundLogger = structlog.get_logger(__name__)


class EmailRouter:
    """Routes TriageResult to appropriate destinations.

    Currently supported destinations:
    - Structured log (always, for all priorities)
    - HTTPS webhook (for CRITICAL and HIGH priority, if configured)

    Designed for extension: additional destinations (Slack, PagerDuty,
    database write) can be added via constructor injection without modifying
    this class.

    Attributes:
        _webhook_url: Optional URL for priority notifications.
        _webhook_secret: Optional HMAC-SHA256 secret for request signing.
        _http_client: httpx async client for webhook delivery.
    """

    def __init__(
        self,
        http_client: httpx.AsyncClient,
        webhook_url: str | None = None,
        webhook_secret: str | None = None,
    ) -> None:
        """Initialise the email router.

        Args:
            http_client: Shared httpx.AsyncClient for webhook calls.
            webhook_url: Optional HTTPS URL to POST triage results to.
            webhook_secret: Optional HMAC-SHA256 secret. If set, a
                X-Email-Triage-Signature header is added to webhook requests.
        """
        self._http_client = http_client
        self._webhook_url = webhook_url
        self._webhook_secret = webhook_secret

        if webhook_url:
            log.info("email_router_webhook_configured", webhook_url=webhook_url)

    async def route(self, result: TriageResult) -> None:
        """Route a triage result to all configured destinations.

        Always emits a structured log entry. Fires the webhook if configured
        and the priority warrants it.

        Args:
            result: The triage result to route.
        """
        log.info(
            "triage_result_routed",
            queue_file=result.queue_file,
            priority=result.priority.value,
            category=result.category.value,
            routing_label=result.routing_label,
            requires_reply=result.requires_reply,
            action_item_count=len(result.action_items),
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            model=result.model_used,
        )

        if result.should_trigger_webhook and self._webhook_url:
            await self._fire_webhook(result)

    async def _fire_webhook(self, result: TriageResult) -> None:
        """POST the triage result as JSON to the configured webhook URL.

        Includes an HMAC-SHA256 signature header if a secret is configured.
        Logs the outcome but does not raise on failure — webhook errors
        should not prevent the email from being archived.

        Args:
            result: The triage result to send.
        """
        payload_bytes = result.model_dump_json().encode()
        headers: dict[str, str] = {"Content-Type": "application/json"}

        if self._webhook_secret:
            sig = hmac.new(
                self._webhook_secret.encode(),
                payload_bytes,
                hashlib.sha256,
            ).hexdigest()
            headers["X-Email-Triage-Signature"] = f"sha256={sig}"

        try:
            response = await self._http_client.post(
                self._webhook_url,  # type: ignore[arg-type]
                content=payload_bytes,
                headers=headers,
            )
            log.info(
                "triage_webhook_fired",
                queue_file=result.queue_file,
                priority=result.priority.value,
                status_code=response.status_code,
            )
        except Exception as exc:  # noqa: BLE001
            log.error(
                "triage_webhook_failed",
                queue_file=result.queue_file,
                error=str(exc),
            )


class TriageService:
    """Orchestrates the agent pipeline for each queued encrypted file.

    Pipeline per .gpg file:
        claim() → read bytes → decrypt() → analyze() → route() → complete()

    On crash recovery (agent restart), any .gpg.processing files found by
    FileQueueReader.watch() are automatically re-queued and reprocessed.

    Concurrency: up to max_concurrent files are processed simultaneously,
    each running a separate Claude API call. An asyncio.Semaphore enforces
    the limit.

    Attributes:
        _queue_reader: Watches and manages files in the queue directory.
        _decryptor: GPG decryptor for in-memory decryption.
        _analyzer: Claude-based email classifier.
        _router: Destination router for triage results.
        _max_concurrent: Maximum simultaneous Claude calls.
    """

    def __init__(
        self,
        queue_reader: EmailQueueReader,
        decryptor: Decryptor,
        analyzer: TriageAnalyzer,
        router: EmailRouter,
        max_concurrent: int = 3,
    ) -> None:
        """Initialise the triage service.

        Args:
            queue_reader: Watches the queue directory and manages file state.
            decryptor: GPGDecryptor for in-memory email decryption.
            analyzer: ClaudeTriageClient for structured email classification.
            router: EmailRouter for delivering results to destinations.
            max_concurrent: Semaphore limit for simultaneous Claude calls.
        """
        self._queue_reader = queue_reader
        self._decryptor = decryptor
        self._analyzer = analyzer
        self._router = router
        self._max_concurrent = max_concurrent

    async def run_forever(self, stop_event: asyncio.Event) -> None:
        """Watch the queue and process files concurrently until stop_event is set.

        Launches each file as an independent asyncio task bounded by a
        semaphore. The watch() generator runs in a thread (watchdog is
        synchronous) and feeds paths into an asyncio.Queue.

        Args:
            stop_event: When set, stops accepting new files and exits after
                all in-flight tasks complete.
        """
        semaphore = asyncio.Semaphore(self._max_concurrent)
        path_queue: asyncio.Queue[Path] = asyncio.Queue()
        threading_stop = threading.Event()

        log.info("triage_agent_starting", max_concurrent=self._max_concurrent)

        # Run the synchronous watchdog observer in a thread pool thread.
        watcher_task = asyncio.create_task(
            asyncio.to_thread(self._feed_path_queue, path_queue, threading_stop)
        )

        in_flight: set[asyncio.Task[None]] = set()

        try:
            while not stop_event.is_set():
                try:
                    gpg_path = await asyncio.wait_for(path_queue.get(), timeout=1.0)
                except TimeoutError:
                    continue

                task = asyncio.create_task(
                    self._process_with_semaphore(gpg_path, semaphore)
                )
                in_flight.add(task)
                task.add_done_callback(in_flight.discard)

        finally:
            threading_stop.set()
            if in_flight:
                log.info("triage_draining_in_flight", count=len(in_flight))
                await asyncio.gather(*in_flight, return_exceptions=True)
            await watcher_task
            log.info("triage_agent_stopped")

    async def _process_with_semaphore(
        self,
        gpg_path: Path,
        semaphore: asyncio.Semaphore,
    ) -> None:
        """Acquire the semaphore and process one file.

        Args:
            gpg_path: Path to the .gpg file to process.
            semaphore: Limits concurrent Claude API calls.
        """
        async with semaphore:
            await self._process_one_file(gpg_path)

    async def _process_one_file(self, gpg_path: Path) -> None:
        """Full pipeline for one .gpg file: claim → decrypt → analyse → route → complete.

        On FileNotFoundError during claim(), silently skips (another agent
        claimed the file in a race). On any other error, moves the file to
        failed/ with error metadata.

        Args:
            gpg_path: Path to the .gpg file.
        """
        processing_path: Path | None = None
        bound_log = log.bind(queue_file=gpg_path.name)

        try:
            processing_path = self._queue_reader.claim(gpg_path)
            bound_log.debug("triage_file_claimed")

            ciphertext = processing_path.read_bytes()
            plaintext = self._decryptor.decrypt(ciphertext)
            bound_log.debug("triage_decrypt_complete", plaintext_size_bytes=len(plaintext))

            result = await self._analyzer.analyze(plaintext, gpg_path.name)
            bound_log.info(
                "triage_analysis_complete",
                priority=result.priority.value,
                category=result.category.value,
            )

            await self._router.route(result)
            self._queue_reader.complete(processing_path, result)

        except FileNotFoundError:
            # Race condition: another agent claimed the file first. Skip silently.
            bound_log.debug("triage_file_already_claimed")

        except Exception as exc:  # noqa: BLE001
            bound_log.error(
                "triage_file_failed",
                error=str(exc),
                error_type=type(exc).__name__,
            )
            if processing_path is not None:
                self._queue_reader.fail(processing_path, str(exc))

    def _feed_path_queue(
        self,
        path_queue: asyncio.Queue[Path],
        stop_event: threading.Event,
    ) -> None:
        """Run the synchronous queue watcher and feed paths into asyncio.Queue.

        Runs in a ThreadPoolExecutor thread. Converts the synchronous
        FileQueueReader.watch() iterator into asyncio-compatible events using
        call_soon_threadsafe.

        Args:
            path_queue: asyncio.Queue to put discovered paths into.
            stop_event: threading.Event signalling the watcher to stop.
        """
        loop = asyncio.get_event_loop()
        for path in self._queue_reader.watch(stop_event):  # type: ignore[call-arg]
            loop.call_soon_threadsafe(path_queue.put_nowait, path)
