"""Unit tests for the in-memory session store."""

from __future__ import annotations

from telegram_triage_bot.models import SessionState
from telegram_triage_bot.session import SessionStore


def _make_session(account: str = "phdata") -> SessionState:
    return SessionState(account=account)


class TestSessionStore:
    """Tests for SessionStore get/set/clear/has_active_session."""

    def setup_method(self) -> None:
        """Create a fresh store for each test."""
        self.store = SessionStore()

    def test_get_returns_none_when_empty(self) -> None:
        # Arrange / Act
        result = self.store.get(12345)

        # Assert
        assert result is None

    def test_set_and_get_roundtrip(self) -> None:
        # Arrange
        session = _make_session()

        # Act
        self.store.set(12345, session)
        result = self.store.get(12345)

        # Assert
        assert result is not None
        assert result.account == "phdata"

    def test_set_overwrites_existing(self) -> None:
        # Arrange
        self.store.set(12345, _make_session("phdata"))

        # Act
        self.store.set(12345, _make_session("pgmc"))
        result = self.store.get(12345)

        # Assert
        assert result is not None
        assert result.account == "pgmc"

    def test_clear_removes_session(self) -> None:
        # Arrange
        self.store.set(12345, _make_session())

        # Act
        self.store.clear(12345)

        # Assert
        assert self.store.get(12345) is None

    def test_clear_no_op_when_missing(self) -> None:
        # Arrange / Act / Assert — should not raise
        self.store.clear(99999)

    def test_has_active_session_false_when_empty(self) -> None:
        # Arrange / Act
        result = self.store.has_active_session(12345)

        # Assert
        assert result is False

    def test_has_active_session_true_after_set(self) -> None:
        # Arrange
        self.store.set(12345, _make_session())

        # Act
        result = self.store.has_active_session(12345)

        # Assert
        assert result is True

    def test_has_active_session_false_after_clear(self) -> None:
        # Arrange
        self.store.set(12345, _make_session())
        self.store.clear(12345)

        # Act
        result = self.store.has_active_session(12345)

        # Assert
        assert result is False

    def test_multiple_sessions_are_independent(self) -> None:
        # Arrange
        self.store.set(111, _make_session("phdata"))
        self.store.set(222, _make_session("pgmc"))

        # Act
        self.store.clear(111)

        # Assert
        assert self.store.get(111) is None
        assert self.store.get(222) is not None
        assert self.store.get(222).account == "pgmc"  # type: ignore[union-attr]
