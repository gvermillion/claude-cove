"""Proton Mail IMAP fetcher via the local Proton Bridge.

Proton Bridge runs as a local process on the VPS and exposes a plaintext
IMAP endpoint at 127.0.0.1:1143. SSL is NOT used because the connection
never leaves the host loopback interface — the Bridge handles E2E
decryption internally and re-presents the messages as standard IMAP.

Prerequisites:
    - protonmail-bridge-cli must be installed and running.
    - The account must be logged in via `protonmail-bridge --cli`.
    - Obtain IMAP credentials with the `info` command in the Bridge CLI.

Exports:
    ProtonBridgeFetcher: Concrete EmailFetcher strategy for Proton Mail.
"""

from __future__ import annotations

from pathlib import Path

import structlog

from email_triage.infrastructure.imap.base import BaseIMAPFetcher

log: structlog.BoundLogger = structlog.get_logger(__name__)

_PROTON_BRIDGE_DEFAULT_HOST = "127.0.0.1"
_PROTON_BRIDGE_DEFAULT_PORT = 1143


class ProtonBridgeFetcher(BaseIMAPFetcher):
    """Concrete EmailFetcher strategy for Proton Mail via local Bridge.

    Thin subclass of BaseIMAPFetcher that defaults to the Proton Bridge
    loopback endpoint. All IMAP logic, UID tracking, and retry behaviour
    is inherited from BaseIMAPFetcher.

    The lack of SSL is intentional and safe: the connection is loopback-only
    and the Bridge handles the actual Proton end-to-end encryption layer.

    Example:
        >>> fetcher = ProtonBridgeFetcher(
        ...     username="bridge-imap-user",
        ...     password="bridge-generated-password",
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
        host: str = _PROTON_BRIDGE_DEFAULT_HOST,
        port: int = _PROTON_BRIDGE_DEFAULT_PORT,
        mailbox: str = "INBOX",
        max_email_size_bytes: int = 10_000_000,
    ) -> None:
        """Initialise the Proton Bridge fetcher.

        Args:
            username: IMAP username as shown by `protonmail-bridge --cli info`.
            password: Bridge-generated IMAP password (NOT the Proton account
                password).
            state_dir: Directory for persisting seen-UID state files.
            host: Bridge IMAP host. Defaults to 127.0.0.1 (loopback only).
            port: Bridge IMAP port. Defaults to 1143.
            mailbox: Mailbox folder to monitor. Defaults to "INBOX".
            max_email_size_bytes: Skip emails larger than this. Defaults to 10 MB.
        """
        super().__init__(
            host=host,
            port=port,
            username=username,
            password=password,
            mailbox=mailbox,
            use_ssl=False,  # Loopback-only; Bridge handles E2E encryption.
            state_dir=state_dir,
            max_email_size_bytes=max_email_size_bytes,
        )
        log.info(
            "proton_bridge_fetcher_initialised",
            username=username,
            host=host,
            port=port,
            mailbox=mailbox,
        )

    @property
    def source_name(self) -> str:
        """Returns the stable provider identifier for this fetcher."""
        return "proton"
