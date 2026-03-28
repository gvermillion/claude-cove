"""Unit tests for data models.

Tests model validation, defaults, and field constraints.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from telegram_triage_bot.models import (
    DraftState,
    SessionState,
    TriageItem,
    VALID_ACCOUNTS,
)


def _make_item(**kwargs) -> TriageItem:
    """Factory for TriageItem with sensible defaults."""
    defaults = {
        "account": "phdata",
        "sender": "alice@example.com",
        "subject": "Meeting tomorrow",
        "urgency": "normal",
        "action": "reply",
        "reasoning": "Sender expects a response.",
        "body_snippet": "Can we meet at 2pm?",
        "is_sensitive": False,
        "thread_id": "thread_abc123",
        "message_id": "msg_xyz456",
    }
    return TriageItem(**{**defaults, **kwargs})


class TestTriageItem:
    """Tests for TriageItem model validation."""

    def test_valid_item_creation(self) -> None:
        # Arrange / Act
        item = _make_item()

        # Assert
        assert item.account == "phdata"
        assert item.urgency == "normal"
        assert item.is_sensitive is False

    def test_sensitive_defaults_to_false(self) -> None:
        # Arrange / Act
        item = _make_item()

        # Assert
        assert item.is_sensitive is False

    def test_invalid_urgency_raises(self) -> None:
        # Arrange / Act / Assert
        with pytest.raises(ValidationError):
            _make_item(urgency="urgent")  # not a valid enum value

    def test_invalid_action_raises(self) -> None:
        # Arrange / Act / Assert
        with pytest.raises(ValidationError):
            _make_item(action="delete")  # not a valid enum value

    def test_all_urgency_levels_accepted(self) -> None:
        # Arrange
        levels = ["critical", "high", "normal", "low", "informational"]

        for level in levels:
            # Act
            item = _make_item(urgency=level)
            # Assert
            assert item.urgency == level

    def test_all_action_types_accepted(self) -> None:
        # Arrange
        actions = ["reply", "acknowledge", "forward", "file", "none"]

        for action in actions:
            # Act
            item = _make_item(action=action)
            # Assert
            assert item.action == action

    def test_sensitive_item_flagged(self) -> None:
        # Arrange / Act
        item = _make_item(sender="ron.wills@crowdstrike.com", is_sensitive=True)

        # Assert
        assert item.is_sensitive is True


class TestDraftState:
    """Tests for DraftState model."""

    def test_defaults(self) -> None:
        # Arrange
        item = _make_item()

        # Act
        draft = DraftState(item=item, draft_body="Hello, thanks for reaching out.")

        # Assert
        assert draft.telegram_message_id is None
        assert draft.edit_pending is False

    def test_edit_pending_can_be_set(self) -> None:
        # Arrange
        item = _make_item()
        draft = DraftState(item=item, draft_body="original body")

        # Act
        draft.edit_pending = True

        # Assert
        assert draft.edit_pending is True


class TestSessionState:
    """Tests for SessionState model."""

    def test_defaults(self) -> None:
        # Arrange / Act
        session = SessionState(account="phdata")

        # Assert
        assert session.triage_items == []
        assert session.pending_drafts == []
        assert session.current_draft is None
        assert session.awaiting_totp is False
        assert session.last_totp_verified_at is None
        assert session.triage_in_progress is False
        assert session.draft_in_progress is False

    def test_triage_items_can_be_set(self) -> None:
        # Arrange
        item = _make_item()
        session = SessionState(account="phdata")

        # Act
        session.triage_items = [item]

        # Assert
        assert len(session.triage_items) == 1
        assert session.triage_items[0].sender == "alice@example.com"


class TestValidAccounts:
    """Tests for the VALID_ACCOUNTS constant."""

    def test_contains_expected_accounts(self) -> None:
        assert "phdata" in VALID_ACCOUNTS
        assert "pgmc" in VALID_ACCOUNTS
        assert "multdems" in VALID_ACCOUNTS
        assert "personal" in VALID_ACCOUNTS

    def test_no_unexpected_accounts(self) -> None:
        assert len(VALID_ACCOUNTS) == 4
