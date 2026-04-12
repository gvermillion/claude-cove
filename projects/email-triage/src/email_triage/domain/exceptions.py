"""Custom exception hierarchy for the email-triage system.

All application exceptions derive from EmailTriageError, making it easy to
catch the entire surface at entrypoint boundaries while still distinguishing
between failure categories in business logic.
"""

from __future__ import annotations


class EmailTriageError(Exception):
    """Base exception for all email-triage errors."""


# --- Provider / IMAP ---


class ProviderConnectionError(EmailTriageError):
    """Raised when an IMAP provider is unreachable after all retry attempts."""


class ProviderAuthError(EmailTriageError):
    """Raised when IMAP credentials are rejected by the server."""


class EmailSizeLimitExceeded(EmailTriageError):
    """Raised when a fetched email exceeds the configured size limit.

    Args:
        uid: The IMAP UID of the oversized message.
        size_bytes: The actual size of the message.
        limit_bytes: The configured maximum size.
    """

    def __init__(self, uid: str, size_bytes: int, limit_bytes: int) -> None:
        super().__init__(
            f"Email UID {uid} is {size_bytes} bytes, exceeds limit of {limit_bytes} bytes"
        )
        self.uid = uid
        self.size_bytes = size_bytes
        self.limit_bytes = limit_bytes


# --- GPG ---


class EncryptionError(EmailTriageError):
    """Raised when GPG encryption fails."""


class DecryptionError(EmailTriageError):
    """Raised when GPG decryption fails (wrong key, bad passphrase, corrupt data)."""


# --- Queue ---


class QueueWriteError(EmailTriageError):
    """Raised when writing an encrypted file to the queue directory fails."""


class QueueClaimError(EmailTriageError):
    """Raised when a race condition prevents claiming a queue file."""


# --- AI Triage ---


class TriageAnalysisError(EmailTriageError):
    """Raised when Claude returns unexpected output or the API call fails after retries."""


# --- Routing ---


class RoutingError(EmailTriageError):
    """Raised when webhook delivery fails after retries."""
