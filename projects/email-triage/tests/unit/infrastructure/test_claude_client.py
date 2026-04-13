"""Unit tests for the Claude triage client.

All Anthropic API calls are mocked. Tests verify the mapping from API
response to TriageResult, forced tool_choice usage, retry behaviour,
and error handling.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock, patch

import anthropic
import pytest

from email_triage.domain.exceptions import TriageAnalysisError
from email_triage.domain.models import EmailCategory, EmailPriority
from email_triage.infrastructure.ai.claude_client import ClaudeTriageClient
from email_triage.infrastructure.ai.prompts import TRIAGE_TOOL_SCHEMA


def _make_raw_email() -> bytes:
    """Return minimal RFC 2822 email bytes for testing."""
    return (
        b"From: sender@example.com\r\n"
        b"To: recipient@company.com\r\n"
        b"Subject: Test Email\r\n"
        b"Date: Sat, 12 Apr 2026 10:00:00 +0000\r\n"
        b"Message-ID: <test@example.com>\r\n"
        b"\r\n"
        b"This is a test email body."
    )


def _make_mock_response(tool_input: dict[str, Any]) -> MagicMock:
    """Create a mock Anthropic Message response with a tool_use block."""
    tool_use_block = MagicMock()
    tool_use_block.type = "tool_use"
    tool_use_block.input = tool_input

    usage = MagicMock()
    usage.input_tokens = 150
    usage.output_tokens = 75

    response = MagicMock()
    response.content = [tool_use_block]
    response.usage = usage
    response.stop_reason = "tool_use"
    return response


_VALID_TOOL_INPUT: dict[str, Any] = {
    "priority": "high",
    "category": "financial",
    "summary": "Invoice from vendor requiring approval before payment.",
    "subject_line": "Invoice #1234",
    "sender_domain": "vendor.com",
    "action_items": [
        {
            "description": "Approve payment",
            "deadline": "2026-04-15",
            "is_time_sensitive": True,
        }
    ],
    "requires_reply": True,
    "estimated_read_minutes": 1.0,
    "routing_tags": ["finance-team"],
}


class TestClaudeTriageClientAnalyze:
    def test_analyze_maps_tool_response_to_triage_result(self) -> None:
        # Arrange
        mock_response = _make_mock_response(_VALID_TOOL_INPUT)
        client = ClaudeTriageClient(api_key="test-key")

        with patch.object(client._client.messages, "create", return_value=mock_response):
            import asyncio

            # Act
            result = asyncio.get_event_loop().run_until_complete(
                client.analyze(_make_raw_email(), "test_file.gpg")
            )

        # Assert
        assert result.priority == EmailPriority.HIGH
        assert result.category == EmailCategory.FINANCIAL
        assert result.summary == "Invoice from vendor requiring approval before payment."
        assert result.subject_line == "Invoice #1234"
        assert result.sender_domain == "vendor.com"
        assert result.requires_reply is True
        assert result.estimated_read_minutes == 1.0
        assert result.routing_tags == ["finance-team"]
        assert len(result.action_items) == 1
        assert result.action_items[0].description == "Approve payment"
        assert result.action_items[0].is_time_sensitive is True
        assert result.queue_file == "test_file.gpg"
        assert result.model_used == "claude-opus-4-6"
        assert result.input_tokens == 150
        assert result.output_tokens == 75

    def test_analyze_uses_forced_tool_choice(self) -> None:
        # Arrange
        mock_response = _make_mock_response(_VALID_TOOL_INPUT)
        client = ClaudeTriageClient(api_key="test-key")

        with patch.object(
            client._client.messages, "create", return_value=mock_response
        ) as mock_create:
            import asyncio

            asyncio.get_event_loop().run_until_complete(
                client.analyze(_make_raw_email(), "test.gpg")
            )

        # Assert — tool_choice must always force the specific tool
        call_kwargs = mock_create.call_args.kwargs
        assert call_kwargs["tool_choice"] == {
            "type": "tool",
            "name": "record_triage_result",
        }

    def test_analyze_raises_triage_analysis_error_when_no_tool_use_block(self) -> None:
        # Arrange
        text_block = MagicMock()
        text_block.type = "text"

        usage = MagicMock()
        usage.input_tokens = 100
        usage.output_tokens = 50

        bad_response = MagicMock()
        bad_response.content = [text_block]
        bad_response.usage = usage
        bad_response.stop_reason = "end_turn"

        client = ClaudeTriageClient(api_key="test-key")

        with patch.object(client._client.messages, "create", return_value=bad_response):
            import asyncio

            # Act & Assert
            with pytest.raises(TriageAnalysisError, match="no tool_use block"):
                asyncio.get_event_loop().run_until_complete(
                    client.analyze(_make_raw_email(), "test.gpg")
                )

    def test_analyze_raises_triage_analysis_error_on_api_error(self) -> None:
        # Arrange
        client = ClaudeTriageClient(api_key="test-key")

        with patch.object(
            client._client.messages,
            "create",
            side_effect=anthropic.APIStatusError(
                "Internal server error",
                response=MagicMock(status_code=500),
                body={},
            ),
        ):
            import asyncio

            # Act & Assert
            with pytest.raises(TriageAnalysisError):
                asyncio.get_event_loop().run_until_complete(
                    client.analyze(_make_raw_email(), "test.gpg")
                )


class TestEmailParsing:
    def test_parse_email_extracts_headers_and_body(self) -> None:
        # Arrange
        raw = _make_raw_email()

        # Act
        headers_text, body_text = ClaudeTriageClient._parse_email(raw)

        # Assert
        assert "Subject: Test Email" in headers_text
        assert "This is a test email body." in body_text

    def test_parse_email_strips_html_tags_from_html_body(self) -> None:
        # Arrange
        raw = (
            b"From: sender@example.com\r\n"
            b"Content-Type: text/html\r\n"
            b"\r\n"
            b"<html><body><p>Hello <b>world</b></p></body></html>"
        )

        # Act
        _, body_text = ClaudeTriageClient._parse_email(raw)

        # Assert
        assert "<html>" not in body_text
        assert "Hello" in body_text
        assert "world" in body_text

    def test_parse_email_truncates_body_at_limit(self) -> None:
        # Arrange
        long_body = "x" * 10_000
        raw = (
            f"Subject: Test\r\n\r\n{long_body}".encode()
        )

        # Act
        _, body_text = ClaudeTriageClient._parse_email(raw)

        # Assert
        assert len(body_text) <= 8_000
