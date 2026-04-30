"""Tests for Phase 2+3 post-extract wiring in ingest_service (scrub, synth, date_resolve, dropped)."""
from __future__ import annotations

from contextlib import ExitStack
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from m4_agent_host.application.ingest_service import IngestService
from m4_agent_host.domain.models import (
    Dropped,
    Entity,
    MeetingIngestRequest,
    MeetingSignals,
    Risk,
    Task,
)
from m4_agent_host.infrastructure.ai.agents import ExtractionTrace
from m4_agent_host.infrastructure.vault.writer import VaultWriter
from m4_agent_host.infrastructure.vault.reader import VaultReader


@pytest.fixture()
def vault(tmp_path: Path) -> Path:
    for d in ["_system", "inbox/meetings", "journal/daily", "people", "resources"]:
        (tmp_path / d).mkdir(parents=True)
    (tmp_path / "_system" / "log.md").write_text("")
    return tmp_path


@pytest.fixture()
def service(vault: Path) -> IngestService:
    from m4_agent_host.infrastructure.telemetry.trace_writer import TraceWriter

    tw = TraceWriter(str(vault))
    return IngestService(
        vault_writer=VaultWriter(vault_path=str(vault)),
        trace_writer=tw,
        vault_reader=VaultReader(str(vault)),
    )


def _make_trace(items: list, category: str, slug: str = "test") -> ExtractionTrace:
    return ExtractionTrace(
        category=category,
        slug=slug,
        model="test-model",
        p1_system="sys",
        p1_response="resp",
        p1_thinking="",
        p2_input="inp",
    )


def _entity_mock() -> AsyncMock:
    """Return entities including one stoplist candidate (Latium)."""
    items = [
        Entity(name="Latium", relationship="client", evidence="Latium project update"),
        Entity(name="Sarah Chen", relationship="colleague", evidence="Sarah Chen presented", evidence_quote="Sarah Chen presented"),
    ]
    trace = _make_trace(items, "entities")
    return AsyncMock(return_value=(items, [], trace))


def _risk_mock() -> AsyncMock:
    items = [Risk(summary="Pipeline delay", severity="high", project="alpha")]
    return AsyncMock(return_value=(items, [], _make_trace(items, "risks")))


def _opp_mock() -> AsyncMock:
    return AsyncMock(return_value=([], [], _make_trace([], "opportunities")))


def _task_mock() -> AsyncMock:
    items = [
        Task(action="Send credentials", owner="Priya", due_hint="next week", commitment="hard", evidence="send creds by next week"),
    ]
    return AsyncMock(return_value=(items, [], _make_trace(items, "tasks")))


async def _passthrough_synthesize(signals, transcript, meeting_date, stoplist):
    """Passthrough synthesizer mock — returns signals unchanged."""
    return signals


def _common_patches() -> ExitStack:
    """Build an ExitStack with all mocks needed for ingest tests."""
    stack = ExitStack()
    stack.enter_context(patch("m4_agent_host.application.ingest_service.extract_entities", _entity_mock()))
    stack.enter_context(patch("m4_agent_host.application.ingest_service.extract_risks", _risk_mock()))
    stack.enter_context(patch("m4_agent_host.application.ingest_service.extract_opportunities", _opp_mock()))
    stack.enter_context(patch("m4_agent_host.application.ingest_service.extract_tasks", _task_mock()))
    stack.enter_context(patch("m4_agent_host.application.ingest_service.summarize_meeting", AsyncMock(return_value="")))
    stack.enter_context(patch("m4_agent_host.application.ingest_service.commit_vault"))
    stack.enter_context(patch("m4_agent_host.application.ingest_service.judge_extraction", AsyncMock(return_value=[])))
    stack.enter_context(patch("m4_agent_host.application.ingest_service.synthesize", side_effect=_passthrough_synthesize))
    return stack


def _make_request() -> MeetingIngestRequest:
    return MeetingIngestRequest(
        transcript="Sarah Chen presented the roadmap. Latium project update.",
        filename="2026-04-14-test.md",
        meeting_date="2026-04-14",
        skip_judge=True,
    )


@pytest.mark.asyncio()
async def test_scrub_drops_stoplist_entity_and_preserves_due_hint(
    service: IngestService, vault: Path
) -> None:
    """Verify stoplist scrub removes Latium and date resolver doesn't mutate due_hint."""
    upsert_calls: list[Entity] = []
    original_upsert = service.writer.upsert_person

    def tracking_upsert(entity: Entity, **kwargs) -> None:
        upsert_calls.append(entity)
        return original_upsert(entity, **kwargs)

    service.writer.upsert_person = tracking_upsert  # type: ignore[assignment]

    with _common_patches():
        signals = await service.ingest_meeting(_make_request())

    # Latium should be in dropped list
    stoplist_dropped = [d for d in signals.dropped if d.reason == "stoplist_entity"]
    assert any(d.text == "Latium" for d in stoplist_dropped), (
        f"Expected Latium in dropped, got: {signals.dropped}"
    )

    # Sarah Chen should survive
    assert any(e.name == "Sarah Chen" for e in signals.entities)
    assert not any(e.name == "Latium" for e in signals.entities)

    # Writer should only have been called with survivors
    assert all(e.name != "Latium" for e in upsert_calls)

    # Task due_hint stays verbatim "next week" — not mutated to ISO
    assert len(signals.tasks) == 1
    assert signals.tasks[0].due_hint == "next week"


@pytest.mark.asyncio()
async def test_append_dropped_called_with_dropped_items(
    service: IngestService, vault: Path
) -> None:
    """Verify writer.append_dropped is invoked with the dropped list contents."""
    dropped_calls: list[list[Dropped]] = []
    original_append = service.writer.append_dropped

    def tracking_append(dropped: list[Dropped]) -> None:
        dropped_calls.append(list(dropped))
        return original_append(dropped)

    service.writer.append_dropped = tracking_append  # type: ignore[assignment]

    with _common_patches():
        signals = await service.ingest_meeting(_make_request())

    # append_dropped should have been called exactly once
    assert len(dropped_calls) == 1
    # The call should include the Latium stoplist drop
    assert any(d.text == "Latium" and d.reason == "stoplist_entity" for d in dropped_calls[0])

    # The dropped.md file should exist in the vault
    dropped_file = vault / "_system" / "dropped.md"
    assert dropped_file.exists()
    content = dropped_file.read_text()
    assert "Latium" in content
    assert "stoplist_entity" in content
