"""Tests for the LLM synthesizer — monkeypatched, no real Ollama calls."""
from __future__ import annotations

import json
from datetime import date
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from m4_agent_host.application.synthesizer import synthesize
from m4_agent_host.domain.models import (
    Dropped,
    Entity,
    MeetingSignals,
    Opportunity,
    Risk,
    Task,
)


def _make_signals() -> MeetingSignals:
    """Build a baseline MeetingSignals with known items."""
    return MeetingSignals(
        entities=[
            Entity(name="Sarah Chen", relationship="colleague", evidence="Sarah Chen presented"),
        ],
        risks=[
            Risk(summary="Pipeline delay", severity="high", project="alpha", evidence="pipeline delayed"),
        ],
        opportunities=[
            Opportunity(name="EU expansion", type="expansion", evidence="EU team interested"),
        ],
        tasks=[
            Task(action="Send credentials", owner="Priya", due_hint="next week",
                 commitment="hard", evidence="Priya will send creds"),
            Task(action="Review proposal", owner="Sarah", due_hint="Monday",
                 commitment="soft", evidence="should review the proposal"),
        ],
    )


def _ollama_response(signals_dict: dict) -> httpx.Response:
    """Build a fake httpx.Response mimicking Ollama /api/chat JSON mode."""
    body = {
        "message": {"content": json.dumps(signals_dict)},
        "prompt_eval_count": 500,
        "eval_count": 300,
    }
    return httpx.Response(200, json=body, request=httpx.Request("POST", "http://fake/api/chat"))


@pytest.mark.asyncio()
async def test_synthesize_dedupes_and_drops(monkeypatch: pytest.MonkeyPatch) -> None:
    """Synth removes one task and adds a dropped entry."""
    input_signals = _make_signals()

    synth_output = {
        "entities": [{"name": "Sarah Chen", "relationship": "colleague", "evidence": "Sarah Chen presented"}],
        "risks": [{"summary": "Pipeline delay", "severity": "high", "project": "alpha",
                    "evidence": "pipeline delayed"}],
        "opportunities": [{"name": "EU expansion", "type": "expansion",
                           "evidence": "EU team interested"}],
        "tasks": [
            {"action": "Send credentials", "owner": "Priya", "due_hint": "next week",
             "commitment": "hard", "evidence": "Priya will send creds"},
        ],
        "dropped": [
            {"text": "Review proposal", "reason": "fact_not_task"},
        ],
    }

    mock_post = AsyncMock(return_value=_ollama_response(synth_output))
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    result = await synthesize(input_signals, "some transcript", date(2026, 4, 14), frozenset())

    assert len(result.tasks) == 1
    assert result.tasks[0].action == "Send credentials"
    assert len(result.dropped) == 1
    assert result.dropped[0].reason == "fact_not_task"
    assert result.dropped[0].text == "Review proposal"


@pytest.mark.asyncio()
async def test_synthesize_graceful_on_http_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Network error → returns input signals unchanged."""
    input_signals = _make_signals()

    mock_post = AsyncMock(side_effect=httpx.ConnectError("connection refused"))
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    result = await synthesize(input_signals, "transcript", date(2026, 4, 14), frozenset())

    # Must be identical to input
    assert len(result.tasks) == 2
    assert len(result.entities) == 1
    assert result.dropped == []


@pytest.mark.asyncio()
async def test_synthesize_graceful_on_malformed_json(monkeypatch: pytest.MonkeyPatch) -> None:
    """Malformed JSON in response → returns input signals unchanged."""
    input_signals = _make_signals()

    bad_resp = httpx.Response(
        200,
        json={"message": {"content": "not valid json {"}, "prompt_eval_count": 0, "eval_count": 0},
        request=httpx.Request("POST", "http://fake/api/chat"),
    )
    mock_post = AsyncMock(return_value=bad_resp)
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    result = await synthesize(input_signals, "transcript", date(2026, 4, 14), frozenset())

    assert len(result.tasks) == 2
    assert len(result.entities) == 1


@pytest.mark.asyncio()
async def test_synthesize_graceful_on_schema_violation(monkeypatch: pytest.MonkeyPatch) -> None:
    """Valid JSON but bad schema → returns input signals unchanged."""
    input_signals = _make_signals()

    bad_schema = {"entities": "not_a_list", "risks": 42}
    mock_post = AsyncMock(return_value=_ollama_response(bad_schema))
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    result = await synthesize(input_signals, "transcript", date(2026, 4, 14), frozenset())

    assert len(result.tasks) == 2
    assert len(result.entities) == 1


@pytest.mark.asyncio()
async def test_synthesize_preserves_synthesis_and_p1_thinking(monkeypatch: pytest.MonkeyPatch) -> None:
    """synthesis and p1_thinking from input survive even though LLM doesn't produce them."""
    from m4_agent_host.domain.models import MeetingSynthesis

    input_signals = _make_signals()
    input_signals.synthesis = MeetingSynthesis(meeting_summary="Summary text", citations=[])
    input_signals.p1_thinking = {"entities": "thought about it"}

    synth_output = {
        "entities": [{"name": "Sarah Chen", "relationship": "colleague", "evidence": "Sarah Chen presented"}],
        "risks": [],
        "opportunities": [],
        "tasks": [],
        "dropped": [],
    }

    mock_post = AsyncMock(return_value=_ollama_response(synth_output))
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    result = await synthesize(input_signals, "transcript", date(2026, 4, 14), frozenset())

    assert result.synthesis is not None
    assert result.synthesis.meeting_summary == "Summary text"
    assert result.p1_thinking == {"entities": "thought about it"}
