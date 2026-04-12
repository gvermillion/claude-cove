"""Unit tests for RelayService.

All dependencies (fetchers, encryptor, queue) are mocked. Tests verify
orchestration behaviour: retry logic, per-email error isolation, and
mark_processed only on full success.
"""

from __future__ import annotations

import threading
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import MagicMock, call

import pytest

from email_triage.application.relay_service import RelayService
from email_triage.domain.exceptions import EncryptionError
from email_triage.domain.models import EncryptedEmail, RawEmail, RelayRunStats


def _make_raw_email(uid: str = "1", source: str = "gmail") -> RawEmail:
    """Factory for RawEmail test instances."""
    return RawEmail(
        uid=uid,
        source=source,
        message_id=f"<{uid}@example.com>",
        fetched_at=datetime.now(UTC),
        raw_bytes=b"raw email bytes",
    )


def _make_mock_fetcher(
    source: str = "gmail",
    emails: list[RawEmail] | None = None,
) -> MagicMock:
    """Create a mock EmailFetcher returning the given emails."""
    fetcher = MagicMock()
    fetcher.source_name = source
    fetcher.fetch_new_emails.return_value = iter(emails or [])
    return fetcher


def _make_mock_encryptor(return_value: bytes = b"ENCRYPTED") -> MagicMock:
    """Create a mock Encryptor."""
    encryptor = MagicMock()
    encryptor.encrypt.return_value = return_value
    return encryptor


def _make_mock_queue(queue_path: Path = Path("/tmp/queue/test.gpg")) -> MagicMock:
    """Create a mock EmailQueue."""
    q = MagicMock()
    q.enqueue.return_value = queue_path
    return q


class TestRelayServiceRunOnce:
    def test_run_once_returns_correct_stats_on_success(self) -> None:
        # Arrange
        email1 = _make_raw_email("1")
        email2 = _make_raw_email("2")
        fetcher = _make_mock_fetcher(emails=[email1, email2])
        service = RelayService(
            fetchers=[fetcher],
            encryptor=_make_mock_encryptor(),
            queue=_make_mock_queue(),
            poll_interval_seconds=60,
        )

        # Act
        stats = service.run_once()

        # Assert
        assert stats.fetched == 2
        assert stats.enqueued == 2
        assert stats.failed == 0

    def test_run_once_marks_processed_after_successful_enqueue(self) -> None:
        # Arrange
        email = _make_raw_email("42")
        fetcher = _make_mock_fetcher(emails=[email])
        service = RelayService(
            fetchers=[fetcher],
            encryptor=_make_mock_encryptor(),
            queue=_make_mock_queue(),
            poll_interval_seconds=60,
        )

        # Act
        service.run_once()

        # Assert — mark_processed called with the correct UID
        fetcher.mark_processed.assert_called_once_with("42")

    def test_run_once_does_not_mark_processed_when_encryption_fails(self) -> None:
        # Arrange
        email = _make_raw_email("99")
        fetcher = _make_mock_fetcher(emails=[email])
        encryptor = _make_mock_encryptor()
        encryptor.encrypt.side_effect = EncryptionError("GPG failed")

        service = RelayService(
            fetchers=[fetcher],
            encryptor=encryptor,
            queue=_make_mock_queue(),
            poll_interval_seconds=60,
        )

        # Act
        stats = service.run_once()

        # Assert — mark_processed must NOT be called
        fetcher.mark_processed.assert_not_called()
        assert stats.failed == 1
        assert stats.enqueued == 0

    def test_run_once_continues_other_providers_when_one_fails(self) -> None:
        # Arrange
        failing_fetcher = _make_mock_fetcher(source="gmail")
        failing_fetcher.fetch_new_emails.side_effect = Exception("connection error")

        working_email = _make_raw_email("1", source="proton")
        working_fetcher = _make_mock_fetcher(source="proton", emails=[working_email])

        service = RelayService(
            fetchers=[failing_fetcher, working_fetcher],
            encryptor=_make_mock_encryptor(),
            queue=_make_mock_queue(),
            poll_interval_seconds=60,
        )

        # Act
        stats = service.run_once()

        # Assert — working fetcher processed its email despite gmail failure
        working_fetcher.mark_processed.assert_called_once_with("1")
        assert stats.enqueued == 1

    def test_run_once_with_no_new_emails_returns_zero_stats(self) -> None:
        # Arrange
        fetcher = _make_mock_fetcher(emails=[])
        service = RelayService(
            fetchers=[fetcher],
            encryptor=_make_mock_encryptor(),
            queue=_make_mock_queue(),
            poll_interval_seconds=60,
        )

        # Act
        stats = service.run_once()

        # Assert
        assert stats.fetched == 0
        assert stats.enqueued == 0


class TestRelayServiceRunForever:
    def test_run_forever_exits_when_stop_event_set(self) -> None:
        # Arrange
        fetcher = _make_mock_fetcher(emails=[])
        service = RelayService(
            fetchers=[fetcher],
            encryptor=_make_mock_encryptor(),
            queue=_make_mock_queue(),
            poll_interval_seconds=1,
        )
        stop_event = threading.Event()

        # Act — set stop event immediately to exit after first cycle
        stop_event.set()
        service.run_forever(stop_event)  # Should return without hanging

        # Assert — at least one poll cycle occurred
        fetcher.fetch_new_emails.assert_called_once()
