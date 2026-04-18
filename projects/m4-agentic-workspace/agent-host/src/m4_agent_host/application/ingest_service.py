"""Meeting ingest service.

Orchestrates parallel agent execution then sequentially writes results
to the vault to avoid race conditions on shared files.
"""
from __future__ import annotations
import asyncio
import re
from datetime import UTC, datetime, date
from pathlib import Path
import structlog
from m4_agent_host.domain.models import MeetingIngestRequest, MeetingSignals
from m4_agent_host.infrastructure.ai.agents import (
    entity_agent, risk_agent, opportunity_agent, task_agent,
)
from m4_agent_host.infrastructure.vault.writer import VaultWriter
from m4_agent_host.infrastructure.vault.git_helper import commit_vault

log = structlog.get_logger(__name__)


class IngestService:
    """Orchestrate meeting ingestion: fan-out to agents, then write vault sequentially.

    Pattern: Facade over the agent layer and vault writer.
    """

    def __init__(self, vault_writer: VaultWriter | None = None) -> None:
        self.writer = vault_writer or VaultWriter()

    async def ingest_meeting(self, req: MeetingIngestRequest) -> MeetingSignals:
        """Ingest a meeting transcript, run agents in parallel, and persist signals.

        Args:
            req: Meeting ingest request containing transcript and metadata.

        Returns:
            MeetingSignals populated with entities, risks, opportunities, and tasks.
            Individual agent failures degrade gracefully to empty lists.
        """
        slug = _make_slug(req.filename)
        meeting_date = _parse_date(req.meeting_date)

        # 1. Write raw transcript — immutable record
        self.writer.write_raw_transcript(req.filename, req.transcript)
        log.info("transcript_written", filename=req.filename)

        # 2. Fan out — all four agents run simultaneously
        results = await asyncio.gather(
            entity_agent.run(req.transcript),
            risk_agent.run(req.transcript),
            opportunity_agent.run(req.transcript),
            task_agent.run(req.transcript),
            return_exceptions=True,
        )

        # pydantic-ai 1.x: result accessor is .output
        entities = results[0].output if not isinstance(results[0], Exception) else []
        risks = results[1].output if not isinstance(results[1], Exception) else []
        opps = results[2].output if not isinstance(results[2], Exception) else []
        tasks = results[3].output if not isinstance(results[3], Exception) else []

        for i, exc in enumerate(results):
            if isinstance(exc, Exception):
                log.warning("agent_failed", agent_index=i, error=str(exc))

        signals = MeetingSignals(entities=entities, risks=risks, opportunities=opps, tasks=tasks)

        # 3. Write sequentially — avoid race conditions on shared files
        for entity in signals.entities:
            self.writer.upsert_person(entity)
            self.writer.append_log("entity_agent", "upsert_person", entity.name)

        self.writer.append_risks(signals.risks, slug)
        for risk in signals.risks:
            self.writer.append_log("risk_agent", "append_risk", risk.description[:60])

        self.writer.append_opportunities(signals.opportunities)
        for opp in signals.opportunities:
            self.writer.append_log("opportunity_agent", "append_opportunity", opp.description[:60])

        self.writer.append_tasks_to_daily(signals.tasks, for_date=meeting_date)
        for task in signals.tasks:
            self.writer.append_log("task_agent", "append_task", task.description[:60])

        # 4. Single atomic vault commit
        commit_vault(f"agent(meeting): ingest {slug}")
        log.info(
            "meeting_ingested",
            slug=slug,
            entities=len(entities),
            risks=len(risks),
            opportunities=len(opps),
            tasks=len(tasks),
        )
        return signals


def _make_slug(filename: str) -> str:
    """Convert a filename to a URL-safe slug, max 60 chars."""
    stem = Path(filename).stem
    return re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")[:60]


def _parse_date(date_str: str | None) -> date | None:
    """Parse an ISO date string; returns None on failure or missing input."""
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str).date()
    except ValueError:
        return None
