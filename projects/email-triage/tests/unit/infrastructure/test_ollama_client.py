"""Unit tests for OllamaTriageClient.

All HTTP calls are mocked via respx. Tests verify JSON parsing, escalation
triggers (CRITICAL/HIGH priority, UNKNOWN category, parse failure), and
graceful handling of Ollama connectivity errors.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import orjson
import pytest
import respx

from email_triage.domain.models import EmailCategory, EmailPriority
from email_triage.infrastructure.ai.ollama_client import (
    OllamaTriageClient,
    _strip_markdown_fences,
)
from email_triage.infrastructure.ai.rule_based_client import EscalateToNextAnalyzer


def _make_raw_email() -> bytes:
    return (
        b"From: sender@example.com\r\n"
        b"Subject: Q3 budget review\r\n"
        b"\r\n"
        b"Please review the attached Q3 budget."
    )


def _make_ollama_response(content: dict) -> bytes:
    """Build a mock Ollama API response envelope."""
    return orjson.dumps({
        "model": "llama3.2:3b",
        "message": {
            "role": "assistant",
            "content": orjson.dumps(content).decode(),
        },
        "done": True,
    })


_VALID_LOW_RESPONSE = {
    "priority": "low",
    "category": "newsletter",
    "summary": "A newsletter about company updates.",
    "subject_line": "Q3 budget review",
    "sender_domain": "example.com",
    "requires_reply": False,
    "estimated_read_minutes": 0.5,
    "action_items": [],
    "routing_tags": [],
}

_VALID_NORMAL_RESPONSE = {
    "priority": "normal",
    "category": "internal",
    "summary": "Budget review request from a colleague.",
    "subject_line": "Q3 budget review",
    "sender_domain": "example.com",
    "requires_reply": True,
    "estimated_read_minutes": 2.0,
    "action_items": [],
    "routing_tags": [],
}


class TestOllamaTriageClientAnalyze:
    @pytest.mark.asyncio
    async def test_analyze_returns_result_for_low_priority(self) -> None:
        # Arrange
        client = OllamaTriageClient(base_url="http://localhost:11434")
        response_bytes = _make_ollama_response(_VALID_LOW_RESPONSE)

        with respx.mock:
            respx.post("http://localhost:11434/api/chat").mock(
                return_value=httpx.Response(200, content=response_bytes)
            )

            # Act
            result = await client.analyze(_make_raw_email(), "test.gpg")

        # Assert
        assert result.priority == EmailPriority.LOW
        assert result.category == EmailCategory.NEWSLETTER
        assert result.model_used == "llama3.2:3b"

    @pytest.mark.asyncio
    async def test_analyze_returns_result_for_normal_priority(self) -> None:
        # Arrange
        client = OllamaTriageClient(base_url="http://localhost:11434")
        response_bytes = _make_ollama_response(_VALID_NORMAL_RESPONSE)

        with respx.mock:
            respx.post("http://localhost:11434/api/chat").mock(
                return_value=httpx.Response(200, content=response_bytes)
            )

            # Act
            result = await client.analyze(_make_raw_email(), "test.gpg")

        # Assert
        assert result.priority == EmailPriority.NORMAL
        assert result.requires_reply is True

    @pytest.mark.asyncio
    async def test_analyze_escalates_for_critical_priority(self) -> None:
        # Arrange
        client = OllamaTriageClient(base_url="http://localhost:11434")
        critical_response = {**_VALID_NORMAL_RESPONSE, "priority": "critical"}
        response_bytes = _make_ollama_response(critical_response)

        with respx.mock:
            respx.post("http://localhost:11434/api/chat").mock(
                return_value=httpx.Response(200, content=response_bytes)
            )

            # Act & Assert
            with pytest.raises(EscalateToNextAnalyzer):
                await client.analyze(_make_raw_email(), "test.gpg")

    @pytest.mark.asyncio
    async def test_analyze_escalates_for_high_priority(self) -> None:
        # Arrange
        client = OllamaTriageClient(base_url="http://localhost:11434")
        high_response = {**_VALID_NORMAL_RESPONSE, "priority": "high"}
        response_bytes = _make_ollama_response(high_response)

        with respx.mock:
            respx.post("http://localhost:11434/api/chat").mock(
                return_value=httpx.Response(200, content=response_bytes)
            )

            # Act & Assert
            with pytest.raises(EscalateToNextAnalyzer):
                await client.analyze(_make_raw_email(), "test.gpg")

    @pytest.mark.asyncio
    async def test_analyze_escalates_for_unknown_category(self) -> None:
        # Arrange
        client = OllamaTriageClient(base_url="http://localhost:11434")
        unknown_response = {**_VALID_NORMAL_RESPONSE, "category": "unknown"}
        response_bytes = _make_ollama_response(unknown_response)

        with respx.mock:
            respx.post("http://localhost:11434/api/chat").mock(
                return_value=httpx.Response(200, content=response_bytes)
            )

            # Act & Assert
            with pytest.raises(EscalateToNextAnalyzer):
                await client.analyze(_make_raw_email(), "test.gpg")

    @pytest.mark.asyncio
    async def test_analyze_escalates_when_ollama_unreachable(self) -> None:
        # Arrange
        client = OllamaTriageClient(
            base_url="http://localhost:11434",
            timeout_seconds=0.1,
        )

        with respx.mock:
            respx.post("http://localhost:11434/api/chat").mock(
                side_effect=httpx.ConnectError("Connection refused")
            )

            # Act & Assert — connectivity failure should escalate, not crash
            with pytest.raises(EscalateToNextAnalyzer):
                await client.analyze(_make_raw_email(), "test.gpg")

    @pytest.mark.asyncio
    async def test_analyze_escalates_on_malformed_json_response(self) -> None:
        # Arrange
        client = OllamaTriageClient(base_url="http://localhost:11434")
        bad_response = orjson.dumps({
            "message": {"role": "assistant", "content": "not valid json at all"},
        })

        with respx.mock:
            respx.post("http://localhost:11434/api/chat").mock(
                return_value=httpx.Response(200, content=bad_response)
            )

            # Act & Assert
            with pytest.raises(EscalateToNextAnalyzer):
                await client.analyze(_make_raw_email(), "test.gpg")

    @pytest.mark.asyncio
    async def test_analyze_strips_markdown_fences_from_response(self) -> None:
        # Arrange — some models wrap JSON in ```json fences
        client = OllamaTriageClient(base_url="http://localhost:11434")
        fenced_content = "```json\n" + orjson.dumps(_VALID_LOW_RESPONSE).decode() + "\n```"
        fenced_response = orjson.dumps({
            "message": {"role": "assistant", "content": fenced_content},
        })

        with respx.mock:
            respx.post("http://localhost:11434/api/chat").mock(
                return_value=httpx.Response(200, content=fenced_response)
            )

            # Act
            result = await client.analyze(_make_raw_email(), "test.gpg")

        # Assert
        assert result.priority == EmailPriority.LOW


class TestStripMarkdownFences:
    def test_strips_json_fences(self) -> None:
        text = '```json\n{"key": "value"}\n```'
        assert _strip_markdown_fences(text) == '{"key": "value"}'

    def test_strips_plain_fences(self) -> None:
        text = '```\n{"key": "value"}\n```'
        assert _strip_markdown_fences(text) == '{"key": "value"}'

    def test_leaves_plain_json_unchanged(self) -> None:
        text = '{"key": "value"}'
        assert _strip_markdown_fences(text) == '{"key": "value"}'
