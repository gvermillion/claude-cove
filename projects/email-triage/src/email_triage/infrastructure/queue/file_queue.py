"""File-based queue backed by a tmpfs directory.

The queue is the sole communication channel between the relay and agent
processes. Only GPG-encrypted ciphertext (.gpg files) is ever written here.

Queue file naming convention: <timestamp_ns>_<8 random hex chars>.gpg
This naming is deliberately opaque — it contains no sender address, subject,
or any other metadata that could leak information if the file listing is observed.

Exports:
    FileQueue: Write side (relay process).
    FileQueueReader: Read side (agent process) with inotify-based watching.
"""

from __future__ import annotations

import os
import queue
import secrets
import threading
import time
from collections.abc import Iterator
from pathlib import Path

import orjson
import structlog
from watchdog.events import FileCreatedEvent, FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from email_triage.domain.exceptions import QueueWriteError
from email_triage.domain.models import EncryptedEmail, TriageResult

log: structlog.BoundLogger = structlog.get_logger(__name__)

_GPG_SUFFIX = ".gpg"
_PROCESSING_SUFFIX = ".gpg.processing"


class FileQueue:
    """Writes encrypted email files to a tmpfs directory atomically.

    Implements the EmailQueue protocol.

    File naming: <timestamp_ns>_<8 random hex chars>.gpg
    Example: 1712841234567890123_a3f8b2c1.gpg

    Atomic write strategy: write to <name>.tmp first, then os.rename() so
    the agent's inotify observer only sees a complete file.

    Attributes:
        _queue_dir: Path to the tmpfs queue directory.
    """

    def __init__(self, queue_dir: Path) -> None:
        """Initialise the file queue.

        Args:
            queue_dir: Path to the tmpfs queue directory. Must already exist
                and be writable by the relay process user.
        """
        self._queue_dir = queue_dir
        log.info("file_queue_ready", queue_dir=str(queue_dir))

    def enqueue(self, email: EncryptedEmail) -> Path:
        """Atomically write an encrypted email to the queue directory.

        Args:
            email: The encrypted email to write.

        Returns:
            The Path of the written .gpg file.

        Raises:
            QueueWriteError: On any I/O failure (e.g., tmpfs full, permissions).
        """
        filename = self._generate_opaque_filename()
        final_path = self._queue_dir / filename
        tmp_path = self._queue_dir / f"{filename}.tmp"

        try:
            tmp_path.write_bytes(email.encrypted_bytes)
            os.rename(tmp_path, final_path)
        except OSError as exc:
            # Best-effort cleanup of the .tmp file.
            try:
                tmp_path.unlink(missing_ok=True)
            except OSError:
                pass
            raise QueueWriteError(
                f"Failed to write encrypted email to queue: {exc}"
            ) from exc

        log.debug(
            "file_queue_enqueued",
            queue_file=filename,
            size_bytes=len(email.encrypted_bytes),
            source=email.source,
        )
        return final_path

    @staticmethod
    def _generate_opaque_filename() -> str:
        """Generate an opaque queue filename with no metadata leakage.

        Returns:
            A filename of the form '<timestamp_ns>_<8 hex chars>.gpg'.
        """
        return f"{time.time_ns()}_{secrets.token_hex(4)}{_GPG_SUFFIX}"


class _NewGPGFileHandler(FileSystemEventHandler):
    """watchdog event handler that feeds new .gpg files into a thread-safe queue."""

    def __init__(self, path_queue: queue.Queue[Path]) -> None:
        super().__init__()
        self._path_queue = path_queue

    def on_created(self, event: FileSystemEvent) -> None:
        """React to file creation events, filtering for .gpg files only."""
        if not isinstance(event, FileCreatedEvent):
            return
        src_path = Path(str(event.src_path))
        if src_path.suffix == _GPG_SUFFIX and not event.is_directory:
            log.debug("queue_file_detected", path=str(src_path))
            self._path_queue.put(src_path)


class FileQueueReader:
    """Watches the queue directory for new .gpg files using inotify.

    Implements the EmailQueueReader protocol.

    On Linux, uses watchdog's InotifyObserver for sub-second file detection.
    Falls back to polling if inotify is unavailable (e.g., some containers).

    On startup, sweeps the directory for:
    - *.gpg files: arrived while the agent was down — yield immediately.
    - *.gpg.processing files: agent crashed mid-processing — recover by
      renaming back to .gpg and re-queuing.

    Attributes:
        _queue_dir: Path to the tmpfs queue directory.
        _done_dir: Directory where completed files are archived.
        _failed_dir: Directory where failed files are archived.
    """

    def __init__(
        self,
        queue_dir: Path,
        done_dir: Path,
        failed_dir: Path,
    ) -> None:
        """Initialise the queue reader.

        Args:
            queue_dir: Path to the tmpfs queue directory to watch.
            done_dir: Directory for successfully processed files.
            failed_dir: Directory for failed files.
        """
        self._queue_dir = queue_dir
        self._done_dir = done_dir
        self._failed_dir = failed_dir

        done_dir.mkdir(parents=True, exist_ok=True)
        failed_dir.mkdir(parents=True, exist_ok=True)

        log.info(
            "file_queue_reader_ready",
            queue_dir=str(queue_dir),
            done_dir=str(done_dir),
            failed_dir=str(failed_dir),
        )

    def watch(self, stop_event: threading.Event | None = None) -> Iterator[Path]:
        """Block-iterate over .gpg files as they appear in the queue directory.

        Performs a crash-recovery startup sweep before starting the observer.

        Args:
            stop_event: Optional threading.Event. When set, the iterator
                terminates cleanly after the current batch is exhausted.

        Yields:
            Path objects pointing to .gpg files ready to be claimed.
        """
        # --- Startup sweep: crash recovery ---
        recovered = self._recover_processing_files()
        if recovered:
            log.warning("queue_startup_recovery", recovered_count=recovered)

        existing = sorted(self._queue_dir.glob(f"*{_GPG_SUFFIX}"))
        if existing:
            log.info("queue_startup_backlog", count=len(existing))
        for path in existing:
            yield path

        # --- inotify observer ---
        path_queue: queue.Queue[Path] = queue.Queue()
        handler = _NewGPGFileHandler(path_queue)
        observer = Observer()
        observer.schedule(handler, str(self._queue_dir), recursive=False)
        observer.start()
        log.info("queue_observer_started", queue_dir=str(self._queue_dir))

        try:
            while stop_event is None or not stop_event.is_set():
                try:
                    path = path_queue.get(timeout=1.0)
                    yield path
                except queue.Empty:
                    continue
        finally:
            observer.stop()
            observer.join()
            log.info("queue_observer_stopped")

    def claim(self, path: Path) -> Path:
        """Atomically rename <name>.gpg to <name>.gpg.processing.

        Args:
            path: Path to the .gpg file to claim.

        Returns:
            The new .gpg.processing path.

        Raises:
            FileNotFoundError: If another agent process already claimed the
                file. Callers should silently skip on this exception.
        """
        processing_path = path.with_suffix("").with_suffix(_PROCESSING_SUFFIX)
        # os.rename is atomic on POSIX when source and destination are on the
        # same filesystem (which they always are here — both on tmpfs).
        os.rename(path, processing_path)
        log.debug("queue_file_claimed", processing_path=str(processing_path))
        return processing_path

    def complete(self, processing_path: Path, result: TriageResult) -> None:
        """Move a .processing file to the done directory and write sidecar JSON.

        Args:
            processing_path: The .gpg.processing file to finalise.
            result: The triage result to persist as a JSON sidecar.
        """
        stem = processing_path.name.removesuffix(_PROCESSING_SUFFIX)
        done_gpg = self._done_dir / f"{stem}{_GPG_SUFFIX}"
        done_json = self._done_dir / f"{stem}.json"

        done_json.write_bytes(orjson.dumps(result.model_dump(mode="json"), option=orjson.OPT_INDENT_2))
        os.rename(processing_path, done_gpg)

        log.info(
            "queue_file_completed",
            stem=stem,
            priority=result.priority.value,
            category=result.category.value,
        )

    def fail(self, processing_path: Path, error: str) -> None:
        """Move a .processing file to the failed directory with error metadata.

        Args:
            processing_path: The .gpg.processing file that failed.
            error: Human-readable error description for diagnostics.
        """
        stem = processing_path.name.removesuffix(_PROCESSING_SUFFIX)
        failed_gpg = self._failed_dir / f"{stem}{_GPG_SUFFIX}"
        failed_json = self._failed_dir / f"{stem}.error.json"

        error_meta = {"stem": stem, "error": error, "failed_at": time.time()}
        failed_json.write_bytes(orjson.dumps(error_meta))

        try:
            os.rename(processing_path, failed_gpg)
        except FileNotFoundError:
            pass  # File may have already been moved by a concurrent cleanup.

        log.error("queue_file_failed", stem=stem, error=error)

    def _recover_processing_files(self) -> int:
        """Rename any .gpg.processing files back to .gpg for reprocessing.

        Returns:
            The number of files recovered.
        """
        recovered = 0
        for processing_path in self._queue_dir.glob(f"*{_PROCESSING_SUFFIX}"):
            stem = processing_path.name.removesuffix(_PROCESSING_SUFFIX)
            gpg_path = self._queue_dir / f"{stem}{_GPG_SUFFIX}"
            try:
                os.rename(processing_path, gpg_path)
                log.warning("queue_processing_file_recovered", stem=stem)
                recovered += 1
            except OSError as exc:
                log.error(
                    "queue_recovery_failed",
                    processing_path=str(processing_path),
                    error=str(exc),
                )
        return recovered
