from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from m4_agent_host.application.ingest_service import IngestService, _make_slug, _parse_date
from m4_agent_host.domain.models import MeetingIngestRequest, MeetingSignals
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


def test_make_slug_strips_extension_and_slugifies() -> None:
    assert _make_slug("2024-01-15 Acme Standup.md") == "2024-01-15-acme-standup"


def test_parse_date_returns_none_for_invalid() -> None:
    assert _parse_date("not-a-date") is None
    assert _parse_date(None) is None


def test_parse_date_parses_iso() -> None:
    from datetime import date

    result = _parse_date("2024-01-15")
    assert result == date(2024, 1, 15)


def _make_extract_mock(items: list, category: str, slug: str = "test") -> AsyncMock:
    """Build an AsyncMock that returns (items, citations, ExtractionTrace)."""
    trace = ExtractionTrace(
        category=category,
        slug=slug,
        model="test-model",
        p1_system="sys",
        p1_response="resp",
        p1_thinking="",
        p2_input="inp",
    )
    return AsyncMock(return_value=(items, [], trace))


async def _passthrough_synthesize(signals, transcript, meeting_date, stoplist):
    return signals


@pytest.mark.asyncio()
async def test_ingest_meeting_writes_raw_transcript(service: IngestService, vault: Path) -> None:
    with (
        patch("m4_agent_host.application.ingest_service.extract_entities", _make_extract_mock([], "entities")),
        patch("m4_agent_host.application.ingest_service.extract_risks", _make_extract_mock([], "risks")),
        patch("m4_agent_host.application.ingest_service.extract_opportunities", _make_extract_mock([], "opportunities")),
        patch("m4_agent_host.application.ingest_service.extract_tasks", _make_extract_mock([], "tasks")),
        patch("m4_agent_host.application.ingest_service.summarize_meeting", AsyncMock(return_value="")),
        patch("m4_agent_host.application.ingest_service.commit_vault"),
        patch("m4_agent_host.application.ingest_service.synthesize", side_effect=_passthrough_synthesize),
    ):
        req = MeetingIngestRequest(transcript="Test meeting", filename="2024-01-15-test.md")
        signals = await service.ingest_meeting(req)

    assert (vault / "inbox" / "meetings" / "2024-01-15-test.md").exists()
    assert isinstance(signals, MeetingSignals)


@pytest.mark.asyncio()
async def test_ingest_meeting_handles_agent_exception_gracefully(
    service: IngestService, vault: Path
) -> None:
    with (
        patch(
            "m4_agent_host.application.ingest_service.extract_entities",
            AsyncMock(side_effect=RuntimeError("Ollama down")),
        ),
        patch("m4_agent_host.application.ingest_service.extract_risks", _make_extract_mock([], "risks")),
        patch("m4_agent_host.application.ingest_service.extract_opportunities", _make_extract_mock([], "opportunities")),
        patch("m4_agent_host.application.ingest_service.extract_tasks", _make_extract_mock([], "tasks")),
        patch("m4_agent_host.application.ingest_service.summarize_meeting", AsyncMock(return_value="")),
        patch("m4_agent_host.application.ingest_service.commit_vault"),
        patch("m4_agent_host.application.ingest_service.synthesize", side_effect=_passthrough_synthesize),
    ):
        req = MeetingIngestRequest(transcript="Test", filename="test.md")
        signals = await service.ingest_meeting(req)

    assert signals.entities == []  # degraded gracefully


@pytest.mark.asyncio()
async def test_ingest_meeting_passes_prior_context_to_entities(service: IngestService, vault: Path) -> None:
    """Verify prior_context kwarg is passed to extract_entities."""
    extract_mock = _make_extract_mock([], "entities")
    with (
        patch("m4_agent_host.application.ingest_service.extract_entities", extract_mock),
        patch("m4_agent_host.application.ingest_service.extract_risks", _make_extract_mock([], "risks")),
        patch("m4_agent_host.application.ingest_service.extract_opportunities", _make_extract_mock([], "opportunities")),
        patch("m4_agent_host.application.ingest_service.extract_tasks", _make_extract_mock([], "tasks")),
        patch("m4_agent_host.application.ingest_service.summarize_meeting", AsyncMock(return_value="")),
        patch("m4_agent_host.application.ingest_service.commit_vault"),
        patch("m4_agent_host.application.ingest_service.synthesize", side_effect=_passthrough_synthesize),
    ):
        req = MeetingIngestRequest(transcript="Test meeting", filename="test.md")
        await service.ingest_meeting(req)

    extract_mock.assert_called_once()
    call_kwargs = extract_mock.call_args
    assert "prior_context" in call_kwargs.kwargs
