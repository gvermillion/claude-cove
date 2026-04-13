"""Protocol definitions for all major dependency boundaries.

Using typing.Protocol (structural typing) means concrete implementations
do not need to inherit from these interfaces — they just need to provide
the right shape. This satisfies DIP without requiring an inheritance tree.

All protocols are marked runtime_checkable to allow isinstance() checks
in tests and dependency wiring code.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path
from typing import Protocol, runtime_checkable

from email_triage.domain.models import EncryptedEmail, RawEmail, TriageResult


@runtime_checkable
class EmailFetcher(Protocol):
    """Strategy: fetches new emails from one IMAP provider.

    Each concrete implementation handles one IMAP endpoint. RelayService
    calls fetch_new_emails() on each registered fetcher in sequence.

    Implementations are responsible for tracking seen UIDs so that
    fetch_new_emails() only yields messages not previously processed.
    """

    @property
    def source_name(self) -> str:
        """Stable string identifier for this provider, e.g. 'gmail' or 'proton'."""
        ...

    def fetch_new_emails(self) -> Iterator[RawEmail]:
        """Yield RawEmail objects for each unseen message in the configured mailbox.

        Implementations must:
        - Connect (or reuse a keepalive connection) to the IMAP server.
        - Filter out UIDs previously passed to mark_processed().
        - Respect the max_email_size_bytes limit (raise EmailSizeLimitExceeded or skip).
        - Use tenacity for retry logic on transient IMAP errors.

        Raises:
            ProviderConnectionError: If the server is unreachable after all retries.
            ProviderAuthError: If credentials are rejected.
        """
        ...

    def mark_processed(self, uid: str) -> None:
        """Persist that a UID has been successfully enqueued.

        Called by RelayService only after GPG encryption and queue write both
        succeed. Only after this call should the UID be excluded from future
        fetch_new_emails() results.

        Args:
            uid: The IMAP UID to mark as processed.
        """
        ...

    def close(self) -> None:
        """Release the IMAP connection cleanly."""
        ...


@runtime_checkable
class Encryptor(Protocol):
    """Encrypts arbitrary bytes, returning GPG ciphertext bytes."""

    def encrypt(self, plaintext: bytes) -> bytes:
        """Encrypt plaintext and return ASCII-armored GPG ciphertext.

        The plaintext is never written to disk. It flows from the caller's
        memory directly to the GPG subprocess stdin.

        Args:
            plaintext: Raw bytes to encrypt (complete RFC 2822 email).

        Returns:
            ASCII-armored GPG ciphertext as bytes.

        Raises:
            EncryptionError: If GPG reports any failure.
        """
        ...


@runtime_checkable
class Decryptor(Protocol):
    """Decrypts GPG ciphertext bytes, returning plaintext bytes in memory."""

    def decrypt(self, ciphertext: bytes) -> bytes:
        """Decrypt ASCII-armored GPG ciphertext and return plaintext bytes.

        The result is returned as bytes in memory and must not be written to
        disk by the caller.

        Args:
            ciphertext: ASCII-armored GPG ciphertext to decrypt.

        Returns:
            Decrypted plaintext bytes (complete RFC 2822 email).

        Raises:
            DecryptionError: If the private key is missing, passphrase is
                wrong, or the ciphertext is corrupt.
        """
        ...


@runtime_checkable
class EmailQueue(Protocol):
    """Write side of the queue: relay enqueues encrypted files."""

    def enqueue(self, email: EncryptedEmail) -> Path:
        """Atomically write the encrypted email to the queue directory.

        Writes to a .tmp file first, then os.rename() for atomicity, so the
        agent never sees a partially written file.

        Args:
            email: The encrypted email to write.

        Returns:
            The Path of the written .gpg file.

        Raises:
            QueueWriteError: On any I/O failure (e.g., tmpfs full).
        """
        ...


@runtime_checkable
class EmailQueueReader(Protocol):
    """Read side of the queue: agent watches and consumes encrypted files."""

    def watch(self) -> Iterator[Path]:
        """Block-iterate over .gpg files as they appear in the queue directory.

        Performs a startup sweep for existing .gpg and .gpg.processing files
        (crash recovery) before starting the inotify observer.

        Yields:
            Path objects pointing to .gpg files ready to be claimed.
        """
        ...

    def claim(self, path: Path) -> Path:
        """Atomically rename <name>.gpg to <name>.gpg.processing.

        Args:
            path: Path to the .gpg file to claim.

        Returns:
            The new .gpg.processing path.

        Raises:
            FileNotFoundError: If another process already claimed the file.
                Callers should silently skip on this exception.
        """
        ...

    def complete(self, processing_path: Path, result: TriageResult) -> None:
        """Move a .processing file to the done directory and write result JSON.

        Args:
            processing_path: The .gpg.processing file to finalize.
            result: The triage result to persist as a sidecar JSON file.
        """
        ...

    def fail(self, processing_path: Path, error: str) -> None:
        """Move a .processing file to the failed directory with error metadata.

        Args:
            processing_path: The .gpg.processing file that failed.
            error: Human-readable error description for diagnostics.
        """
        ...


@runtime_checkable
class TriageAnalyzer(Protocol):
    """Runs Claude analysis on a decrypted raw email and returns structured output."""

    async def analyze(self, raw_email_bytes: bytes, queue_filename: str) -> TriageResult:
        """Analyze an email and return a structured TriageResult.

        Args:
            raw_email_bytes: Complete RFC 2822 email bytes (headers + body).
            queue_filename: Basename of the originating .gpg file, used to
                populate TriageResult.queue_file.

        Returns:
            A fully populated TriageResult.

        Raises:
            TriageAnalysisError: If Claude returns unexpected output or the
                API call fails after all retries.
        """
        ...
