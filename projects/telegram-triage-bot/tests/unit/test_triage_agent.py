"""Unit tests for triage_agent use-case functions.

Tests the agentic loop logic, urgency sorting, malformed item filtering,
sensitive-item guard, and the NEW_MESSAGES_SENTINEL contract. All Anthropic
API calls and MCP sessions are mocked — no network I/O occurs.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from telegram_triage_bot.config import Settings
from telegram_triage_bot.models import TriageItem
from telegram_triage_bot.triage_agent import (
    NEW_MESSAGES_SENTINEL,
    generate_draft,
    run_triage,
    send_reply,
)


# ---------------------------------------------------------------------------
# Factories
# ---------------------------------------------------------------------------


def _make_settings() -> Settings:
    """Build a Settings instance suitable for unit tests."""
    return Settings(
        telegram_bot_token="tok",
        owner_chat_id=1,
        anthropic_api_key="sk-ant-fake",
        totp_secret="JBSWY3DPEHPK3PXP",
    )  # type: ignore[call-arg]


_BASE_ITEM_DATA: dict[str, Any] = {
    "account": "phdata",
    "sender": "alice@example.com",
    "subject": "Hello",
    "urgency": "normal",
    "action": "reply",
    "reasoning": "Needs a reply",
    "body_snippet": "Can we meet?",
    "is_sensitive": False,
    "thread_id": "thread_1",
    "message_id": "msg_1",
}


def _make_item(**kwargs: Any) -> TriageItem:
    return TriageItem(**{**_BASE_ITEM_DATA, **kwargs})


def _make_item_data(**kwargs: Any) -> dict[str, Any]:
    """Return a raw dict suitable for submit_triage_results input."""
    return {**_BASE_ITEM_DATA, **kwargs}


def _tool_block(name: str, input_data: dict[str, Any], block_id: str = "b1") -> MagicMock:
    """Build a mock tool_use content block."""
    block = MagicMock()
    block.type = "tool_use"
    block.name = name
    block.input = input_data
    block.id = block_id
    return block


def _text_block(text: str) -> MagicMock:
    """Build a mock text content block."""
    block = MagicMock()
    block.type = "text"
    block.text = text
    return block


def _api_response(stop_reason: str, blocks: list[MagicMock]) -> MagicMock:
    """Build a mock Anthropic API response."""
    response = MagicMock()
    response.stop_reason = stop_reason
    response.content = blocks
    return response


def _mock_client(responses: list[MagicMock]) -> MagicMock:
    """Build a mock AsyncAnthropic client that returns responses in sequence."""
    client = AsyncMock()
    client.messages.create = AsyncMock(side_effect=responses)
    return client


def _mock_mcp_session() -> AsyncMock:
    """Build a minimal mock MCP ClientSession."""
    return AsyncMock()


# ---------------------------------------------------------------------------
# Tests: NEW_MESSAGES_SENTINEL
# ---------------------------------------------------------------------------


class TestNewMessagesSentinel:
    """Tests for the sentinel constant used to signal new-message detection."""

    def test_sentinel_is_nonempty_string(self) -> None:
        assert isinstance(NEW_MESSAGES_SENTINEL, str)
        assert len(NEW_MESSAGES_SENTINEL) > 0

    def test_sentinel_does_not_appear_in_normal_confirmation(self) -> None:
        # Guard: a success message should never start with the sentinel.
        normal_msg = "✅ Sent reply to alice@example.com — Hello"
        assert not normal_msg.startswith(NEW_MESSAGES_SENTINEL)

    def test_sentinel_format_parseable(self) -> None:
        # Callers split on "||" to extract the summary.
        combined = f"{NEW_MESSAGES_SENTINEL}||new thread arrived"
        parts = combined.split("||", 1)
        assert parts[0] == NEW_MESSAGES_SENTINEL
        assert parts[1] == "new thread arrived"


# ---------------------------------------------------------------------------
# Tests: generate_draft
# ---------------------------------------------------------------------------


class TestGenerateDraft:
    """Tests for the generate_draft use-case function."""

    @pytest.mark.asyncio
    async def test_raises_for_sensitive_item(self) -> None:
        # Arrange
        item = _make_item(is_sensitive=True, sender="ceo@example.com")
        settings = _make_settings()

        # Act / Assert — ValueError raised before any API call
        with pytest.raises(ValueError, match="(?i)sensitive"):
            await generate_draft(item, _mock_mcp_session(), settings)

    @pytest.mark.asyncio
    async def test_sensitive_check_happens_before_api_call(self) -> None:
        # Arrange
        item = _make_item(is_sensitive=True)
        settings = _make_settings()
        mock_anthropic = MagicMock()

        # Act
        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_anthropic),
            pytest.raises(ValueError),
        ):
            await generate_draft(item, _mock_mcp_session(), settings)

        # Assert — Anthropic constructor was never invoked with API calls
        mock_anthropic.messages.create.assert_not_called()

    @pytest.mark.asyncio
    async def test_returns_text_from_final_end_turn_block(self) -> None:
        # Arrange
        item = _make_item(is_sensitive=False)
        settings = _make_settings()

        end_turn_response = _api_response("end_turn", [_text_block("Draft body text")])
        mock_client = _mock_client([end_turn_response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            result = await generate_draft(item, _mock_mcp_session(), settings)

        # Assert
        assert result == "Draft body text"

    @pytest.mark.asyncio
    async def test_strips_whitespace_from_result(self) -> None:
        # Arrange
        item = _make_item(is_sensitive=False)
        settings = _make_settings()

        end_turn_response = _api_response("end_turn", [_text_block("  Draft with spaces  ")])
        mock_client = _mock_client([end_turn_response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            result = await generate_draft(item, _mock_mcp_session(), settings)

        assert result == "Draft with spaces"


# ---------------------------------------------------------------------------
# Tests: run_triage — urgency sorting
# ---------------------------------------------------------------------------


class TestRunTriageUrgencySorting:
    """Tests for run_triage urgency ordering."""

    @pytest.mark.asyncio
    async def test_items_sorted_critical_first(self) -> None:
        # Arrange
        raw_items = [
            _make_item_data(urgency="low", thread_id="t3", message_id="m3"),
            _make_item_data(urgency="critical", thread_id="t1", message_id="m1"),
            _make_item_data(urgency="high", thread_id="t2", message_id="m2"),
        ]
        submit_block = _tool_block("submit_triage_results", {"items": raw_items})
        response = _api_response("tool_use", [submit_block])
        mock_client = _mock_client([response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            items = await run_triage("phdata", _mock_mcp_session(), _make_settings())

        # Assert
        assert len(items) == 3
        assert items[0].urgency == "critical"
        assert items[1].urgency == "high"
        assert items[2].urgency == "low"

    @pytest.mark.asyncio
    async def test_all_urgency_levels_sorted_correctly(self) -> None:
        # Arrange — submitted in reverse order
        raw_items = [
            _make_item_data(urgency="informational", thread_id="t5", message_id="m5"),
            _make_item_data(urgency="low", thread_id="t4", message_id="m4"),
            _make_item_data(urgency="normal", thread_id="t3", message_id="m3"),
            _make_item_data(urgency="high", thread_id="t2", message_id="m2"),
            _make_item_data(urgency="critical", thread_id="t1", message_id="m1"),
        ]
        submit_block = _tool_block("submit_triage_results", {"items": raw_items})
        response = _api_response("tool_use", [submit_block])
        mock_client = _mock_client([response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            items = await run_triage("phdata", _mock_mcp_session(), _make_settings())

        expected_order = ["critical", "high", "normal", "low", "informational"]
        assert [i.urgency for i in items] == expected_order


# ---------------------------------------------------------------------------
# Tests: run_triage — termination behaviour
# ---------------------------------------------------------------------------


class TestRunTriageTermination:
    """Tests for how run_triage ends (submit tool vs end_turn)."""

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_end_turn_without_submit(self) -> None:
        # Arrange — Claude immediately returns end_turn with no tool call
        response = _api_response("end_turn", [_text_block("No emails found.")])
        mock_client = _mock_client([response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            items = await run_triage("phdata", _mock_mcp_session(), _make_settings())

        # Assert
        assert items == []

    @pytest.mark.asyncio
    async def test_terminates_immediately_on_submit_no_extra_iterations(self) -> None:
        # Arrange
        submit_block = _tool_block("submit_triage_results", {"items": [_make_item_data()]})
        response = _api_response("tool_use", [submit_block])
        mock_client = _mock_client([response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            await run_triage("phdata", _mock_mcp_session(), _make_settings())

        # Assert — only one API call was made
        assert mock_client.messages.create.call_count == 1

    @pytest.mark.asyncio
    async def test_empty_items_list_in_submit_returns_empty(self) -> None:
        # Arrange
        submit_block = _tool_block("submit_triage_results", {"items": []})
        response = _api_response("tool_use", [submit_block])
        mock_client = _mock_client([response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            items = await run_triage("phdata", _mock_mcp_session(), _make_settings())

        assert items == []


# ---------------------------------------------------------------------------
# Tests: run_triage — malformed item filtering
# ---------------------------------------------------------------------------


class TestRunTriageMalformedItems:
    """Tests that invalid items in submit_triage_results are skipped gracefully."""

    @pytest.mark.asyncio
    async def test_malformed_item_skipped_valid_items_returned(self) -> None:
        # Arrange — one valid item, one with an invalid urgency value
        raw_items = [
            _make_item_data(urgency="critical", thread_id="t1", message_id="m1"),
            {**_make_item_data(), "urgency": "not_a_real_level"},  # invalid
        ]
        submit_block = _tool_block("submit_triage_results", {"items": raw_items})
        response = _api_response("tool_use", [submit_block])
        mock_client = _mock_client([response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            items = await run_triage("phdata", _mock_mcp_session(), _make_settings())

        # Assert — only the valid item is returned
        assert len(items) == 1
        assert items[0].urgency == "critical"

    @pytest.mark.asyncio
    async def test_all_malformed_items_returns_empty(self) -> None:
        # Arrange — both items are invalid
        raw_items = [
            {**_make_item_data(), "urgency": "BAD"},
            {**_make_item_data(), "action": "INVALID_ACTION"},
        ]
        submit_block = _tool_block("submit_triage_results", {"items": raw_items})
        response = _api_response("tool_use", [submit_block])
        mock_client = _mock_client([response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            items = await run_triage("phdata", _mock_mcp_session(), _make_settings())

        assert items == []

    @pytest.mark.asyncio
    async def test_item_missing_required_field_skipped(self) -> None:
        # Arrange — missing thread_id
        incomplete = {k: v for k, v in _make_item_data().items() if k != "thread_id"}
        submit_block = _tool_block("submit_triage_results", {"items": [incomplete]})
        response = _api_response("tool_use", [submit_block])
        mock_client = _mock_client([response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            items = await run_triage("phdata", _mock_mcp_session(), _make_settings())

        assert items == []


# ---------------------------------------------------------------------------
# Tests: send_reply — NEW_MESSAGES_SENTINEL path
# ---------------------------------------------------------------------------


class TestSendReplyNewMessages:
    """Tests for the new-messages-detected path in send_reply."""

    @pytest.mark.asyncio
    async def test_returns_sentinel_when_new_messages_detected(self) -> None:
        # Arrange
        item = _make_item()
        settings = _make_settings()
        summary_text = "Alice replied 5 minutes ago with a new question."

        new_msg_block = _tool_block(
            "new_messages_detected",
            {"summary": summary_text},
        )
        response = _api_response("tool_use", [new_msg_block])
        mock_client = _mock_client([response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            result = await send_reply(item, "draft body", _mock_mcp_session(), settings)

        # Assert
        assert result.startswith(NEW_MESSAGES_SENTINEL)
        assert summary_text in result

    @pytest.mark.asyncio
    async def test_sentinel_result_contains_double_pipe_separator(self) -> None:
        # Arrange
        item = _make_item()
        settings = _make_settings()

        new_msg_block = _tool_block(
            "new_messages_detected",
            {"summary": "Thread updated."},
        )
        response = _api_response("tool_use", [new_msg_block])
        mock_client = _mock_client([response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            result = await send_reply(item, "draft body", _mock_mcp_session(), settings)

        # The caller splits on "||" — verify this is parseable
        parts = result.split("||", 1)
        assert len(parts) == 2
        assert parts[0] == NEW_MESSAGES_SENTINEL
        assert parts[1] == "Thread updated."

    @pytest.mark.asyncio
    async def test_success_path_does_not_return_sentinel(self) -> None:
        # Arrange — Claude ends with end_turn (no new messages)
        item = _make_item()
        settings = _make_settings()

        response = _api_response("end_turn", [_text_block("Reply sent.")])
        mock_client = _mock_client([response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            result = await send_reply(item, "draft body", _mock_mcp_session(), settings)

        assert not result.startswith(NEW_MESSAGES_SENTINEL)

    @pytest.mark.asyncio
    async def test_success_with_no_text_block_falls_back_to_default(self) -> None:
        # Arrange — end_turn with no text block; fallback confirmation used
        item = _make_item(sender="bob@example.com", subject="Project update")
        settings = _make_settings()

        response = _api_response("end_turn", [])  # no text blocks
        mock_client = _mock_client([response])

        with (
            patch("telegram_triage_bot.triage_agent.AsyncAnthropic", return_value=mock_client),
            patch("telegram_triage_bot.triage_agent.list_tools", new_callable=AsyncMock, return_value=[]),
            patch("telegram_triage_bot.triage_agent.mcp_tools_as_anthropic_defs", return_value=[]),
        ):
            result = await send_reply(item, "draft body", _mock_mcp_session(), settings)

        # Assert — fallback string mentions sender and subject
        assert "bob@example.com" in result
        assert "Project update" in result
