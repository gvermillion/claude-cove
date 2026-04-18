from __future__ import annotations
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from m4_agent_host.application.ingest_service import IngestService, _make_slug, _parse_date
from m4_agent_host.domain.models import (
    Entity, MeetingIngestRequest, MeetingSignals, Task
)
from m4_agent_host.infrastructure.vault.writer import VaultWriter


@pytest.fixture()
def vault(tmp_path: Path) -> Path:
    for d in ["_system", "inbox/meetings", "journal/daily", "people", "resources"]:
        (tmp_path / d).mkdir(parents=True)
    (tmp_path / "_system" / "log.md").write_text("")
    return tmp_path


@pytest.fixture()
def service(vault: Path) -> IngestService:
    return IngestService(vault_writer=VaultWriter(vault_path=str(vault)))


def test_make_slug_strips_extension_and_slugifies() -> None:
    assert _make_slug("2024-01-15 Acme Standup.md") == "2024-01-15-acme-standup"


def test_parse_date_returns_none_for_invalid() -> None:
    assert _parse_date("not-a-date") is None
    assert _parse_date(None) is None


def test_parse_date_parses_iso() -> None:
    from datetime import date
    result = _parse_date("2024-01-15")
    assert result == date(2024, 1, 15)


@pytest.mark.asyncio()
async def test_ingest_meeting_writes_raw_transcript(service: IngestService, vault: Path) -> None:
    mock_result = MagicMock()
    mock_result.output = []  # pydantic-ai 1.x uses .output

    with patch("m4_agent_host.application.ingest_service.entity_agent") as ea, \
         patch("m4_agent_host.application.ingest_service.risk_agent") as ra, \
         patch("m4_agent_host.application.ingest_service.opportunity_agent") as oa, \
         patch("m4_agent_host.application.ingest_service.task_agent") as ta, \
         patch("m4_agent_host.application.ingest_service.commit_vault"):
        for agent in [ea, ra, oa, ta]:
            agent.run = AsyncMock(return_value=mock_result)

        req = MeetingIngestRequest(transcript="Test meeting", filename="2024-01-15-test.md")
        signals = await service.ingest_meeting(req)

    assert (vault / "inbox" / "meetings" / "2024-01-15-test.md").exists()
    assert isinstance(signals, MeetingSignals)


@pytest.mark.asyncio()
async def test_ingest_meeting_handles_agent_exception_gracefully(
    service: IngestService, vault: Path
) -> None:
    mock_result = MagicMock()
    mock_result.output = []  # pydantic-ai 1.x uses .output

    with patch("m4_agent_host.application.ingest_service.entity_agent") as ea, \
         patch("m4_agent_host.application.ingest_service.risk_agent") as ra, \
         patch("m4_agent_host.application.ingest_service.opportunity_agent") as oa, \
         patch("m4_agent_host.application.ingest_service.task_agent") as ta, \
         patch("m4_agent_host.application.ingest_service.commit_vault"):
        ea.run = AsyncMock(side_effect=RuntimeError("Ollama down"))
        for agent in [ra, oa, ta]:
            agent.run = AsyncMock(return_value=mock_result)

        req = MeetingIngestRequest(transcript="Test", filename="test.md")
        signals = await service.ingest_meeting(req)

    assert signals.entities == []  # degraded gracefully
