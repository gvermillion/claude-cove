"""Unit tests for Telegram message formatting utilities."""

from __future__ import annotations

import pytest

from telegram_triage_bot.formatting import (
    MAX_MESSAGE_LENGTH,
    action_label,
    escape_md,
    format_draft_preview,
    format_sensitive_item,
    format_triage_item,
    format_triage_summary,
    split_message,
    urgency_emoji,
)
from telegram_triage_bot.models import DraftState, TriageItem


def _make_item(**kwargs) -> TriageItem:
    defaults = {
        "account": "phdata",
        "sender": "alice@example.com",
        "subject": "Meeting tomorrow",
        "urgency": "normal",
        "action": "reply",
        "reasoning": "Sender expects a response.",
        "body_snippet": "Can we meet at 2pm?",
        "is_sensitive": False,
        "thread_id": "thread_abc",
        "message_id": "msg_xyz",
    }
    return TriageItem(**{**defaults, **kwargs})


class TestEscapeMd:
    """Tests for MarkdownV2 escaping."""

    def test_plain_text_unchanged(self) -> None:
        # Arrange / Act / Assert
        assert escape_md("hello world") == "hello world"

    def test_special_chars_escaped(self) -> None:
        # Arrange / Act
        result = escape_md("(hello)")

        # Assert
        assert result == "\\(hello\\)"

    def test_dot_escaped(self) -> None:
        assert escape_md("hello.world") == "hello\\.world"

    def test_exclamation_escaped(self) -> None:
        assert escape_md("hello!") == "hello\\!"

    def test_empty_string(self) -> None:
        assert escape_md("") == ""


class TestUrgencyEmoji:
    """Tests for urgency level emoji mapping."""

    def test_critical_is_red(self) -> None:
        assert urgency_emoji("critical") == "🔴"

    def test_high_is_orange(self) -> None:
        assert urgency_emoji("high") == "🟠"

    def test_normal_is_yellow(self) -> None:
        assert urgency_emoji("normal") == "🟡"

    def test_low_is_green(self) -> None:
        assert urgency_emoji("low") == "🟢"

    def test_informational_is_white(self) -> None:
        assert urgency_emoji("informational") == "⚪"

    def test_unknown_falls_back_to_white(self) -> None:
        assert urgency_emoji("unknown_level") == "⚪"


class TestActionLabel:
    """Tests for action type label mapping."""

    def test_reply_label(self) -> None:
        assert action_label("reply") == "Reply"

    def test_acknowledge_label(self) -> None:
        assert action_label("acknowledge") == "Ack"

    def test_unknown_falls_back_to_value(self) -> None:
        assert action_label("mystery") == "mystery"


class TestFormatTriageItem:
    """Tests for single TriageItem formatting."""

    def test_contains_subject(self) -> None:
        # Arrange
        item = _make_item(subject="Project update")

        # Act
        result = format_triage_item(item, 1)

        # Assert
        assert "Project update" in result

    def test_contains_sender(self) -> None:
        # Arrange
        item = _make_item(sender="bob@example.com")

        # Act
        result = format_triage_item(item, 1)

        # Assert
        assert "bob@example\\.com" in result  # dot is escaped in MarkdownV2

    def test_sensitive_item_shows_flag(self) -> None:
        # Arrange
        item = _make_item(is_sensitive=True)

        # Act
        result = format_triage_item(item, 1)

        # Assert
        assert "SENSITIVE" in result

    def test_non_sensitive_has_no_flag(self) -> None:
        # Arrange
        item = _make_item(is_sensitive=False)

        # Act
        result = format_triage_item(item, 1)

        # Assert
        assert "SENSITIVE" not in result

    def test_body_snippet_truncated_at_300(self) -> None:
        # Arrange
        long_snippet = "x" * 400
        item = _make_item(body_snippet=long_snippet)

        # Act
        result = format_triage_item(item, 1)

        # Assert
        assert "…" in result


class TestFormatTriageSummary:
    """Tests for full triage summary formatting."""

    def test_empty_inbox_message(self) -> None:
        # Arrange / Act
        messages = format_triage_summary([])

        # Assert
        assert len(messages) == 1
        assert "No unread" in messages[0]

    def test_informational_items_grouped(self) -> None:
        # Arrange
        items = [
            _make_item(urgency="informational", action="none", sender="newsletter@co.com"),
            _make_item(urgency="informational", action="none", sender="digest@co.com"),
        ]

        # Act
        messages = format_triage_summary(items)
        combined = " ".join(messages)

        # Assert
        assert "Informational" in combined

    def test_actionable_items_appear_individually(self) -> None:
        # Arrange
        items = [
            _make_item(urgency="critical", subject="URGENT: System down"),
            _make_item(urgency="high", subject="Board vote needed"),
        ]

        # Act
        messages = format_triage_summary(items)
        combined = " ".join(messages)

        # Assert
        assert "URGENT" in combined
        assert "Board vote" in combined

    def test_returns_list_of_strings(self) -> None:
        # Arrange
        items = [_make_item()]

        # Act
        result = format_triage_summary(items)

        # Assert
        assert isinstance(result, list)
        assert all(isinstance(m, str) for m in result)


class TestFormatDraftPreview:
    """Tests for draft preview formatting."""

    def test_contains_sender(self) -> None:
        # Arrange
        item = _make_item(sender="carol@example.com")
        draft = DraftState(item=item, draft_body="Thanks for reaching out.")

        # Act
        result = format_draft_preview(draft)

        # Assert
        assert "carol@example" in result

    def test_contains_draft_body(self) -> None:
        # Arrange
        item = _make_item()
        draft = DraftState(item=item, draft_body="My draft reply here.")

        # Act
        result = format_draft_preview(draft)

        # Assert
        assert "My draft reply here" in result

    def test_position_suffix_included(self) -> None:
        # Arrange
        item = _make_item()
        draft = DraftState(item=item, draft_body="body")

        # Act
        result = format_draft_preview(draft, position="2 of 5")

        # Assert
        assert "2 of 5" in result


class TestFormatSensitiveItem:
    """Tests for sensitive sender warning formatting."""

    def test_contains_sensitive_flag(self) -> None:
        # Arrange
        item = _make_item(is_sensitive=True, sender="legal@client.com")

        # Act
        result = format_sensitive_item(item)

        # Assert
        assert "SENSITIVE" in result

    def test_contains_sender(self) -> None:
        # Arrange
        item = _make_item(is_sensitive=True, sender="legal@client.com")

        # Act
        result = format_sensitive_item(item)

        # Assert
        assert "legal@client" in result


class TestSplitMessage:
    """Tests for message splitting at the Telegram character limit."""

    def test_short_message_not_split(self) -> None:
        # Arrange
        text = "hello world"

        # Act
        result = split_message(text)

        # Assert
        assert result == ["hello world"]

    def test_long_message_split(self) -> None:
        # Arrange
        text = ("x" * 100 + "\n") * 50  # 5050 chars with newlines

        # Act
        result = split_message(text, max_length=MAX_MESSAGE_LENGTH)

        # Assert
        assert len(result) > 1
        assert all(len(chunk) <= MAX_MESSAGE_LENGTH for chunk in result)

    def test_all_content_preserved(self) -> None:
        # Arrange
        lines = [f"Line {i}" for i in range(200)]
        text = "\n".join(lines)

        # Act
        result = split_message(text)
        reconstructed = "\n".join(result)

        # Assert — all lines appear somewhere in the output
        for line in lines:
            assert line in reconstructed
