"""Base IMAP fetcher with shared connection management and UID tracking.

Concrete provider fetchers (Gmail, Proton) extend this class, supplying
only the connection parameters. All IMAP protocol logic lives here.

Exports:
    BaseIMAPFetcher: Abstract base class implementing the EmailFetcher protocol.
"""

from __future__ import annotations

import email
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import imapclient
import orjson
import structlog
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from email_triage.domain.exceptions import (
    EmailSizeLimitExceeded,
    ProviderAuthError,
    ProviderConnectionError,
)
from email_triage.domain.models import RawEmail

log: structlog.BoundLogger = structlog.get_logger(__name__)

# Maximum number of seen UIDs to persist; prevents unbounded file growth.
_MAX_SEEN_UIDS = 5000


class BaseIMAPFetcher:
    """Shared IMAP logic for all email provider fetchers.

    Implements the EmailFetcher protocol. Subclasses configure connection
    parameters in __init__ and expose a source_name property.

    UID tracking strategy: seen UIDs are persisted to a JSON file in
    state_dir after each successful mark_processed() call. On reconnect,
    only UIDs not in the seen set are fetched.

    Connection management: the IMAP connection is established lazily on
    first fetch and reused across calls. A keepalive check (NOOP command)
    is performed before each fetch; if it fails, the connection is
    re-established.

    Attributes:
        _host: IMAP server hostname.
        _port: IMAP server port.
        _username: IMAP account username.
        _password: IMAP account password.
        _mailbox: Mailbox folder to poll.
        _use_ssl: Whether to use SSL/TLS for the connection.
        _state_dir: Directory for persisting the seen UID file.
        _max_email_size_bytes: Emails larger than this are skipped.
        _client: Active IMAPClient connection, or None if not connected.
        _seen_uids: In-memory set of already-processed IMAP UIDs.
    """

    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        mailbox: str,
        use_ssl: bool,
        state_dir: Path,
        max_email_size_bytes: int,
    ) -> None:
        """Initialise the base fetcher.

        Args:
            host: IMAP server hostname.
            port: IMAP server port.
            username: IMAP account username.
            password: IMAP account password or app password.
            mailbox: Mailbox folder name to monitor, e.g. "INBOX".
            use_ssl: True for standard SSL/TLS; False for plaintext (loopback only).
            state_dir: Directory for the seen-UIDs state file.
            max_email_size_bytes: Skip emails larger than this with a WARNING log.
        """
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._mailbox = mailbox
        self._use_ssl = use_ssl
        self._state_dir = state_dir
        self._max_email_size_bytes = max_email_size_bytes
        self._client: imapclient.IMAPClient | None = None
        self._seen_uids: set[str] = self._load_seen_uids()

    @property
    def source_name(self) -> str:
        """Stable string identifier for this provider. Must be overridden."""
        raise NotImplementedError

    def fetch_new_emails(self) -> Iterator[RawEmail]:
        """Yield RawEmail objects for each unseen message in the mailbox.

        Reconnects if the IMAP connection has dropped. Skips messages that
        exceed the size limit with a WARNING log rather than failing.

        Yields:
            RawEmail for each new, in-limit message.

        Raises:
            ProviderConnectionError: If the server is unreachable after retries.
            ProviderAuthError: If credentials are rejected.
        """
        client = self._get_connected_client()
        client.select_folder(self._mailbox)

        all_uids: list[int] = client.search(["ALL"])
        new_uids = [uid for uid in all_uids if str(uid) not in self._seen_uids]

        if not new_uids:
            log.debug("imap_no_new_messages", source=self.source_name, mailbox=self._mailbox)
            return

        log.info(
            "imap_new_messages_found",
            source=self.source_name,
            count=len(new_uids),
            mailbox=self._mailbox,
        )

        # Fetch RFC822 (full message) and RFC822.SIZE for size pre-check.
        fetch_data = client.fetch(new_uids, ["RFC822", "RFC822.SIZE"])

        for uid, data in fetch_data.items():
            size_bytes: int = int(data.get(b"RFC822.SIZE", 0))
            if size_bytes > self._max_email_size_bytes:
                log.warning(
                    "imap_email_size_exceeded",
                    source=self.source_name,
                    uid=str(uid),
                    size_bytes=size_bytes,
                    limit_bytes=self._max_email_size_bytes,
                )
                raise EmailSizeLimitExceeded(
                    uid=str(uid),
                    size_bytes=size_bytes,
                    limit_bytes=self._max_email_size_bytes,
                )

            raw_bytes: bytes = data[b"RFC822"]
            message_id = self._extract_message_id(raw_bytes)

            log.debug(
                "imap_email_fetched",
                source=self.source_name,
                uid=str(uid),
                size_bytes=len(raw_bytes),
            )

            yield RawEmail(
                uid=str(uid),
                source=self.source_name,
                message_id=message_id,
                fetched_at=datetime.now(UTC),
                raw_bytes=raw_bytes,
            )

    def mark_processed(self, uid: str) -> None:
        """Persist that a UID has been successfully enqueued.

        Adds the UID to the in-memory seen set and immediately writes the
        updated set to disk so it survives a relay restart.

        Args:
            uid: The IMAP UID to mark as processed.
        """
        self._seen_uids.add(uid)
        self._save_seen_uids()
        log.debug("imap_uid_marked_processed", source=self.source_name, uid=uid)

    def close(self) -> None:
        """Cleanly log out and close the IMAP connection."""
        if self._client is not None:
            try:
                self._client.logout()
            except Exception:  # noqa: BLE001
                pass
            self._client = None
            log.debug("imap_connection_closed", source=self.source_name)

    # --- Connection management ---

    def _get_connected_client(self) -> imapclient.IMAPClient:
        """Return an active IMAPClient, reconnecting if necessary.

        Returns:
            A connected IMAPClient instance.

        Raises:
            ProviderConnectionError: If the server is unreachable after retries.
            ProviderAuthError: If credentials are rejected.
        """
        if self._client is not None and self._is_connection_alive():
            return self._client
        self._client = self._connect_with_retry()
        return self._client

    def _is_connection_alive(self) -> bool:
        """Check if the current connection is still responsive via NOOP.

        Returns:
            True if the NOOP command succeeds; False otherwise.
        """
        try:
            assert self._client is not None
            self._client.noop()
            return True
        except Exception:  # noqa: BLE001
            log.debug("imap_connection_dead", source=self.source_name)
            return False

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=60),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type(Exception),
        before_sleep=before_sleep_log(log, 20),  # 20 = logging.WARNING
        reraise=False,
    )
    def _connect_with_retry(self) -> imapclient.IMAPClient:
        """Establish a new IMAP connection with exponential backoff.

        Returns:
            A freshly authenticated IMAPClient.

        Raises:
            ProviderConnectionError: If all retry attempts fail.
            ProviderAuthError: If credentials are rejected (no retry).
        """
        try:
            client = imapclient.IMAPClient(
                host=self._host,
                port=self._port,
                ssl=self._use_ssl,
                use_uid=True,
            )
            client.login(self._username, self._password)
            log.info(
                "imap_connected",
                source=self.source_name,
                host=self._host,
                port=self._port,
            )
            return client
        except imapclient.exceptions.LoginError as exc:
            raise ProviderAuthError(
                f"IMAP authentication failed for {self._username} on {self._host}: {exc}"
            ) from exc
        except Exception as exc:
            raise ProviderConnectionError(
                f"Cannot connect to IMAP server {self._host}:{self._port}: {exc}"
            ) from exc

    # --- UID state persistence ---

    @property
    def _state_file(self) -> Path:
        """Path to the JSON file tracking seen UIDs for this provider."""
        self._state_dir.mkdir(parents=True, exist_ok=True)
        return self._state_dir / f"{self.source_name}_seen_uids.json"

    def _load_seen_uids(self) -> set[str]:
        """Load the seen UID set from disk.

        Returns:
            The persisted set of seen UIDs, or an empty set if no file exists.
        """
        try:
            if not hasattr(self, "_state_dir"):
                return set()
            data: Any = orjson.loads(self._state_file.read_bytes())
            uids: set[str] = set(data.get("seen_uids", []))
            log.debug(
                "imap_uids_loaded",
                source=getattr(self, "source_name", "unknown"),
                count=len(uids),
            )
            return uids
        except (FileNotFoundError, orjson.JSONDecodeError):
            return set()

    def _save_seen_uids(self) -> None:
        """Persist the seen UID set to disk.

        Keeps only the most recent _MAX_SEEN_UIDS entries to bound file size.
        """
        uids_to_save = list(self._seen_uids)[-_MAX_SEEN_UIDS:]
        data = {"seen_uids": uids_to_save}
        self._state_file.write_bytes(orjson.dumps(data))

    @staticmethod
    def _extract_message_id(raw_bytes: bytes) -> str:
        """Extract the Message-ID header from raw RFC 2822 bytes.

        Args:
            raw_bytes: Complete raw email bytes.

        Returns:
            The Message-ID header value, or an empty string if absent.
        """
        try:
            msg = email.message_from_bytes(raw_bytes)
            return msg.get("Message-ID", "").strip()
        except Exception:  # noqa: BLE001
            return ""
