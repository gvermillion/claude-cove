"""Gmail / Google Workspace IMAP fetcher.

Connects to imap.gmail.com:993 using an App Password (not the account
password). The App Password must be generated in the Google Account security
settings after enabling 2-Step Verification.

Exports:
    GmailFetcher: Concrete EmailFetcher strategy for Gmail.
"""

from __future__ import annotations

from pathlib import Path

import structlog

from email_triage.infrastructure.imap.base import BaseIMAPFetcher

log: structlog.BoundLogger = structlog.get_logger(__name__)

_GMAIL_HOST = "imap.gmail.com"
_GMAIL_PORT = 993


class GmailFetcher(BaseIMAPFetcher):
    """Concrete EmailFetcher strategy for Gmail / Google Workspace.

    Thin subclass of BaseIMAPFetcher that hard-codes the Gmail IMAP endpoint.
    All IMAP logic, UID tracking, and retry behaviour is inherited.

    Example:
        >>> fetcher = GmailFetcher(
        ...     username="you@gmail.com",
        ...     password="xxxx-xxxx-xxxx-xxxx",
        ...     state_dir=Path("/var/lib/email-triage/relay"),
        ... )
        >>> for raw_email in fetcher.fetch_new_emails():
        ...     process(raw_email)
    """

    def __init__(
        self,
        username: str,
        password: str,
        state_dir: Path,
        mailbox: str = "INBOX",
        max_email_size_bytes: int = 10_000_000,
    ) -> None:
        """Initialise the Gmail fetcher.

        Args:
            username: Gmail or Google Workspace email address.
            password: App Password generated in Google Account Security.
                This is NOT the account login password.
            state_dir: Directory for persisting seen-UID state files.
            mailbox: Mailbox folder to monitor. Defaults to "INBOX".
                Use "[Gmail]/All Mail" to monitor all labels.
            max_email_size_bytes: Skip emails larger than this. Defaults to 10 MB.
        """
        super().__init__(
            host=_GMAIL_HOST,
            port=_GMAIL_PORT,
            username=username,
            password=password,
            mailbox=mailbox,
            use_ssl=True,
            state_dir=state_dir,
            max_email_size_bytes=max_email_size_bytes,
        )
        log.info(
            "gmail_fetcher_initialised",
            username=username,
            mailbox=mailbox,
        )

    @property
    def source_name(self) -> str:
        """Returns the stable provider identifier for this fetcher."""
        return "gmail"
