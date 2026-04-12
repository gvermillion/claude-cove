"""Relay service use case: orchestrates the full fetch → encrypt → enqueue pipeline.

RelayService depends only on the EmailFetcher, Encryptor, and EmailQueue
protocols (DIP). No concrete infrastructure classes are imported here.

The relay loop is designed for resilience: a failure in one provider does
not stop other providers from being polled. Errors are logged and counted
but do not terminate the loop.

Exports:
    RelayService: Orchestrates the relay pipeline for all configured providers.
"""

from __future__ import annotations

import threading
import time
from collections.abc import Sequence

import structlog

from email_triage.domain.interfaces import EmailFetcher, EmailQueue, Encryptor
from email_triage.domain.models import RelayRunStats

log: structlog.BoundLogger = structlog.get_logger(__name__)


class RelayService:
    """Orchestrates the relay pipeline for all configured email providers.

    Pipeline per provider per poll cycle:
        fetch_new_emails() → encrypt() → enqueue() → mark_processed()

    Each email is processed individually. If encryption or enqueueing fails
    for a given message, it is NOT marked as processed, so it will be
    retried in the next poll cycle.

    Satisfies DIP: all dependencies are injected as protocols.

    Attributes:
        _fetchers: One fetcher per configured email provider.
        _encryptor: GPG encryptor that receives raw email bytes.
        _queue: File queue that receives encrypted email bytes.
        _poll_interval_seconds: Sleep duration between poll cycles.
    """

    def __init__(
        self,
        fetchers: Sequence[EmailFetcher],
        encryptor: Encryptor,
        queue: EmailQueue,
        poll_interval_seconds: int,
    ) -> None:
        """Initialise the relay service.

        Args:
            fetchers: One EmailFetcher per configured email provider.
                Must be non-empty.
            encryptor: GPGEncryptor (or compatible Encryptor) for encrypting
                raw email bytes before queuing.
            queue: FileQueue (or compatible EmailQueue) for writing .gpg files.
            poll_interval_seconds: Seconds to sleep between full poll cycles
                across all providers.
        """
        self._fetchers = fetchers
        self._encryptor = encryptor
        self._queue = queue
        self._poll_interval_seconds = poll_interval_seconds

    def run_once(self) -> RelayRunStats:
        """Run one full poll cycle across all configured fetchers.

        Processes each provider in sequence. A failure in one provider's
        fetch loop logs the error and continues to the next provider.

        Returns:
            RelayRunStats with counts of fetched, encrypted, enqueued,
            and failed emails, plus total wall-clock duration.
        """
        stats = RelayRunStats()
        start_time = time.monotonic()

        for fetcher in self._fetchers:
            bound_log = log.bind(source=fetcher.source_name)
            bound_log.info("relay_poll_started")

            try:
                for raw_email in fetcher.fetch_new_emails():
                    stats.fetched += 1
                    success = self._process_one_email(fetcher, raw_email)
                    if success:
                        stats.encrypted += 1
                        stats.enqueued += 1
                    else:
                        stats.failed += 1
            except Exception as exc:  # noqa: BLE001
                # Provider-level failure: log and continue to next provider.
                bound_log.error(
                    "relay_provider_poll_failed",
                    error=str(exc),
                    error_type=type(exc).__name__,
                )
                stats.failed += 1

        stats.duration_ms = (time.monotonic() - start_time) * 1000
        log.info(
            "relay_poll_completed",
            fetched=stats.fetched,
            enqueued=stats.enqueued,
            failed=stats.failed,
            duration_ms=round(stats.duration_ms, 1),
        )
        return stats

    def run_forever(self, stop_event: threading.Event) -> None:
        """Poll all providers in a loop until stop_event is set.

        Each cycle calls run_once(), then sleeps for poll_interval_seconds.
        The sleep is interruptible: it checks the stop_event every second
        so shutdown happens promptly.

        Args:
            stop_event: When set, the loop exits cleanly after the current
                cycle completes. Set by the SIGTERM/SIGINT handler.
        """
        log.info(
            "relay_loop_starting",
            providers=[f.source_name for f in self._fetchers],
            poll_interval_seconds=self._poll_interval_seconds,
        )

        while not stop_event.is_set():
            try:
                self.run_once()
            except Exception as exc:  # noqa: BLE001
                log.error(
                    "relay_loop_unexpected_error",
                    error=str(exc),
                    error_type=type(exc).__name__,
                )

            # Interruptible sleep: check stop_event every second.
            for _ in range(self._poll_interval_seconds):
                if stop_event.is_set():
                    break
                time.sleep(1)

        log.info("relay_loop_stopped")

    def _process_one_email(
        self,
        fetcher: EmailFetcher,
        raw_email: "email_triage.domain.models.RawEmail",  # type: ignore[name-defined]
    ) -> bool:
        """Encrypt and enqueue one email atomically.

        Marks the UID as processed only after both encryption AND queue write
        succeed. If either step fails, the UID remains unprocessed so the
        relay retries it on the next poll cycle.

        Args:
            fetcher: The fetcher that produced this email (for mark_processed).
            raw_email: The in-memory raw email to process.

        Returns:
            True if the email was successfully encrypted and enqueued.
            False if any step failed.
        """
        from email_triage.domain.models import EncryptedEmail
        from datetime import UTC, datetime
        from pathlib import Path

        bound_log = log.bind(source=raw_email.source, uid=raw_email.uid)

        try:
            # Encrypt entirely in memory.
            encrypted_bytes = self._encryptor.encrypt(raw_email.raw_bytes)
            bound_log.debug("relay_email_encrypted", ciphertext_size=len(encrypted_bytes))

            encrypted_email = EncryptedEmail(
                queue_path=Path(""),  # Filled in by queue.enqueue()
                encrypted_bytes=encrypted_bytes,
                source=raw_email.source,
                fetched_at=raw_email.fetched_at,
            )

            queue_path = self._queue.enqueue(encrypted_email)
            bound_log.info(
                "relay_email_queued",
                queue_file=queue_path.name,
            )

            # Only mark processed after a successful queue write.
            fetcher.mark_processed(raw_email.uid)
            return True

        except Exception as exc:  # noqa: BLE001
            bound_log.error(
                "relay_email_processing_failed",
                error=str(exc),
                error_type=type(exc).__name__,
            )
            return False
