"""Meeting ingest service.

Orchestrates sequential three-pass agent execution then writes results to the vault.
Each agent run is traced to vault/_system/llm-traces.jsonl and exported as OTel
spans to Arize Phoenix.

After vault write and git commit, an async judge post-processing step scores each
extraction category against the source transcript and extractor reasoning.

NOTE: Categories run sequentially (not in parallel) because Ollama serialises all
requests to a single model — parallel asyncio.gather offers no throughput benefit
and causes unpredictable timeouts as requests queue behind each other.
"""

from __future__ import annotations

import re
from dataclasses import asdict
from datetime import date, datetime
from pathlib import Path

import structlog
from opentelemetry import trace as otel_trace

from m4_agent_host.config import settings
from m4_agent_host.domain.models import MeetingIngestRequest, MeetingSignals, MeetingSynthesis
from m4_agent_host.infrastructure.telemetry.tracer import tracer
from m4_agent_host.infrastructure.ai.agents import (
    ExtractionTrace,
    extract_entities,
    extract_opportunities,
    extract_risks,
    extract_tasks,
    summarize_meeting,
)
from m4_agent_host.infrastructure.ai.judge import judge_extraction
from m4_agent_host.infrastructure.ai.stoplist import COMPANY_STOPLIST, scrub_entities
from m4_agent_host.application.date_resolver import resolve_due_hint
from m4_agent_host.application.synthesizer import synthesize
from m4_agent_host.infrastructure.telemetry.trace_writer import TraceWriter
from openinference.semconv.trace import OpenInferenceSpanKindValues, SpanAttributes
from opentelemetry.trace import Status, StatusCode
from m4_agent_host.infrastructure.vault.git_helper import commit_vault
from m4_agent_host.infrastructure.vault.writer import VaultWriter
from m4_agent_host.infrastructure.vault.reader import VaultReader

log = structlog.get_logger(__name__)


class IngestService:
    """Orchestrate meeting ingestion: sequential three-pass agents, trace, write vault, judge.

    Pattern: Facade over the agent layer, trace writer, and vault writer.
    """

    def __init__(
        self,
        vault_writer: VaultWriter | None = None,
        trace_writer: TraceWriter | None = None,
        vault_reader: VaultReader | None = None,
    ) -> None:
        self.writer = vault_writer or VaultWriter()
        self.tracer = trace_writer or TraceWriter(settings.vault_path)
        self.reader = vault_reader or VaultReader(settings.vault_path)

    async def ingest_meeting(self, req: MeetingIngestRequest) -> MeetingSignals:
        """Ingest a meeting transcript, run two-pass agents sequentially, persist signals.

        Args:
            req: Meeting ingest request containing transcript and metadata.

        Returns:
            MeetingSignals populated with entities, risks, opportunities, and tasks.
            Individual agent failures degrade gracefully to empty lists.
        """
        slug = _make_slug(req.filename)
        meeting_date = _parse_date(req.meeting_date)

        with tracer.start_as_current_span("ingest.pipeline") as root_span:
            root_span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
            root_span.set_attribute(SpanAttributes.SESSION_ID, req.meeting_date or "unknown")
            root_span.set_attribute(SpanAttributes.USER_ID, settings.user_email)
            root_span.set_attribute(SpanAttributes.LLM_MODEL_NAME, settings.ollama_triage_model)
            root_span.set_attribute("meeting.slug", slug)
            root_span.set_attribute("meeting.filename", req.filename)
            root_span.set_attribute("meeting.date", req.meeting_date or "unknown")
            root_span.set_attribute("meeting.title", req.title or slug)
            root_span.set_attribute("meeting.transcript_chars", len(req.transcript))
            root_span.set_attribute("meeting.has_granola_summary", bool(req.granola_summary))
            root_span.set_attribute("meeting.participant_count", len(req.participants or []))
            root_span.set_attribute("meeting.batch_mode", req.batch_mode)
            root_span.set_attribute(SpanAttributes.INPUT_VALUE,
                f"{req.filename} ({len(req.transcript):,} chars"
                + (f", granola summary {len(req.granola_summary)} chars" if req.granola_summary else "")
                + (f", {len(req.participants)} participants" if req.participants else "")
                + ")")

            try:
                signals = await self._run_pipeline(req, slug, meeting_date, root_span)
                root_span.set_attribute(SpanAttributes.OUTPUT_VALUE,
                    f"{len(signals.entities)} entities, {len(signals.risks)} risks, "
                    f"{len(signals.opportunities)} opportunities, {len(signals.tasks)} tasks"
                    + (" + synthesis" if signals.synthesis else "")
                    + (f", {len(signals.dropped)} dropped" if signals.dropped else ""))
                root_span.set_attribute("result.entity_count", len(signals.entities))
                root_span.set_attribute("result.risk_count", len(signals.risks))
                root_span.set_attribute("result.opportunity_count", len(signals.opportunities))
                root_span.set_attribute("result.task_count", len(signals.tasks))
                root_span.set_attribute("result.dropped_count", len(signals.dropped))
                root_span.set_attribute("result.has_synthesis", signals.synthesis is not None)
                root_span.set_status(Status(StatusCode.OK))
                return signals
            except Exception as exc:
                root_span.set_status(Status(StatusCode.ERROR, str(exc)))
                root_span.set_attribute("pipeline.error", str(exc))
                raise

    async def _run_pipeline(
        self,
        req: MeetingIngestRequest,
        slug: str,
        meeting_date: date | None,
        root_span: otel_trace.Span,
    ) -> MeetingSignals:
        """Inner pipeline logic, runs inside the root ingest.pipeline span."""
        # Load prior context from vault for entity resolution
        prior_context = self.reader.list_known_people()
        log.info("prior_context_loaded", slug=slug, known_people=len(prior_context))

        # Batch mode: skip judge + citations for fast backfill
        if req.batch_mode:
            req = req.model_copy(update={"skip_judge": True})

        # 1. Write raw transcript — immutable record
        self.writer.write_raw_transcript(req.filename, req.transcript)
        log.info("transcript_written", filename=req.filename)

        # 2. Run categories sequentially — Ollama serialises requests anyway;
        #    sequential avoids model-eviction churn and makes timeouts predictable.
        #    Each extractor now runs its own focused pass3 citation step internally.
        entities, risks, opps, tasks = [], [], [], []
        all_citations = []
        extraction_traces: list[ExtractionTrace] = []
        _pipeline = [
            ("entities",      extract_entities),
            ("risks",         extract_risks),
            ("opportunities", extract_opportunities),
            ("tasks",         extract_tasks),
        ]

        for category, extract_fn in _pipeline:
            log.info(f"pipeline | starting {category}", slug=slug, model=settings.ollama_triage_model)
            try:
                if category == "entities":
                    items, citations, trace = await extract_fn(
                        req.transcript, slug,
                        settings.ollama_triage_model, settings.ollama_base_url,
                        granola_summary=req.granola_summary,
                        participants=req.participants or [],
                        prior_context=prior_context,
                    )
                else:
                    items, citations, trace = await extract_fn(
                        req.transcript, slug,
                        settings.ollama_triage_model, settings.ollama_base_url,
                        granola_summary=req.granola_summary,
                    )
                all_citations.extend(citations)
                extraction_traces.append(trace)
                item_count = len(items)
                log.info(
                    f"pipeline | {category} complete",
                    slug=slug, items=item_count, citations=len(citations),
                )
                await self.tracer.write({**asdict(trace), "slug": slug, "otel_trace_id": _current_trace_id()})
                if category == "entities":
                    entities = items
                elif category == "risks":
                    risks = items
                elif category == "opportunities":
                    opps = items
                elif category == "tasks":
                    tasks = items
            except Exception as exc:
                log.warning(
                    "agent_failed",
                    category=category,
                    error=str(exc),
                    error_type=type(exc).__name__,
                    exc_info=True,
                )
                await self.tracer.write({
                    "slug": slug,
                    "category": category,
                    "model": settings.ollama_triage_model,
                    "p2_error": str(exc),
                    "otel_trace_id": _current_trace_id(),
                })

        # Meeting summary — use Granola summary if available (free), otherwise one LLM call.
        log.info("pipeline | summarizing meeting", slug=slug)
        meeting_summary = await summarize_meeting(
            req.transcript, req.granola_summary, slug,
            settings.ollama_triage_model, settings.ollama_base_url,
        )

        synthesis_obj = (
            MeetingSynthesis(meeting_summary=meeting_summary, citations=all_citations)
            if meeting_summary or all_citations
            else None
        )
        if synthesis_obj:
            log.info(
                "synthesis_assembled",
                slug=slug,
                citations=len(all_citations),
                has_summary=bool(meeting_summary),
            )

        p1_thinking = {t.category: t.p1_thinking for t in extraction_traces if t.p1_thinking}

        signals = MeetingSignals(
            entities=entities,
            risks=risks,
            opportunities=opps,
            tasks=tasks,
            synthesis=synthesis_obj,
            p1_thinking=p1_thinking,
        )

        # 2b. Post-extract: stoplist scrub → synthesizer → date resolution
        with tracer.start_as_current_span("post_extract.scrub") as scrub_span:
            scrub_span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
            scrub_span.set_attribute(SpanAttributes.INPUT_VALUE,
                f"{len(signals.entities)} entities to scrub, transcript {len(req.transcript)} chars")
            survivors, dropped_entities = scrub_entities(signals.entities, req.transcript)
            signals.entities = survivors
            signals.dropped.extend(dropped_entities)
            scrub_span.set_attribute("entities.input_count", len(survivors) + len(dropped_entities))
            scrub_span.set_attribute("entities.survivors", len(survivors))
            scrub_span.set_attribute("entities.dropped", len(dropped_entities))
            dropped_names = [d.text for d in dropped_entities[:10]]
            scrub_span.set_attribute(SpanAttributes.OUTPUT_VALUE,
                f"{len(survivors)} survived, {len(dropped_entities)} dropped: {dropped_names}")
            scrub_span.set_status(Status(StatusCode.OK))

        # Synthesizer: single-call LLM consolidation (dedup, re-categorize, ground)
        signals = await synthesize(signals, req.transcript, meeting_date, COMPANY_STOPLIST)

        with tracer.start_as_current_span("post_extract.date_resolve") as dr_span:
            dr_span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
            dr_span.set_attribute(SpanAttributes.INPUT_VALUE,
                f"{len(signals.tasks)} tasks to resolve, meeting_date={meeting_date}")
            resolved = 0
            for t in signals.tasks:
                iso = resolve_due_hint(t.due_hint, meeting_date)
                if iso:
                    resolved += 1
                    dr_span.set_attribute(f"task.{resolved}.due_resolved", iso)
            dr_span.set_attribute("tasks.total", len(signals.tasks))
            dr_span.set_attribute("tasks.resolved", resolved)
            dr_span.set_attribute(SpanAttributes.OUTPUT_VALUE,
                f"{resolved}/{len(signals.tasks)} task dates resolved")
            dr_span.set_status(Status(StatusCode.OK))

        # 3. Write sequentially — avoid race conditions on shared files
        with tracer.start_as_current_span("vault.persist") as vspan:
            vspan.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
            vspan.set_attribute(SpanAttributes.INPUT_VALUE,
                f"slug={slug} entities={len(signals.entities)} risks={len(signals.risks)} "
                f"opportunities={len(signals.opportunities)} tasks={len(signals.tasks)}")
            vspan.set_attribute("vault.slug", slug)
            vspan.set_attribute("vault.entity_count", len(signals.entities))
            vspan.set_attribute("vault.risk_count", len(signals.risks))
            vspan.set_attribute("vault.opportunity_count", len(signals.opportunities))
            vspan.set_attribute("vault.task_count", len(signals.tasks))
            vspan.set_attribute("vault.has_synthesis", signals.synthesis is not None)

            meeting_date_str = req.meeting_date or (meeting_date.isoformat() if meeting_date else None)
            for entity in signals.entities:
                self.writer.upsert_person(entity, meeting_slug=slug, meeting_date=meeting_date_str)
                self.writer.append_log("entity_agent", "upsert_person", entity.name)

            self.writer.append_risks(signals.risks, slug)
            for risk in signals.risks:
                self.writer.append_log("risk_agent", "append_risk", risk.summary[:60])

            self.writer.append_opportunities(signals.opportunities)
            for opp in signals.opportunities:
                self.writer.append_log("opportunity_agent", "append_opportunity", opp.name[:60])

            self.writer.append_tasks_to_daily(signals.tasks, for_date=meeting_date)
            for task in signals.tasks:
                self.writer.append_log("task_agent", "append_task", task.action[:60])

            if signals.synthesis:
                self.writer.write_meeting_synthesis(slug, signals.synthesis, meeting_date)

            # Update people index
            self.writer.write_people_index()

            vspan.set_attribute(SpanAttributes.OUTPUT_VALUE,
                f"wrote {len(signals.entities)} people, {len(signals.risks)} risks, "
                f"{len(signals.opportunities)} opportunities, {len(signals.tasks)} tasks"
                + (" + synthesis" if signals.synthesis else ""))
            vspan.set_status(Status(StatusCode.OK))

        # Write dropped items for weekly review
        self.writer.append_dropped(signals.dropped)
        self.writer.append_log("synthesizer", "dropped_count", str(len(signals.dropped)))

        # 4. Single atomic vault commit
        commit_vault(f"agent(meeting): ingest {slug}")
        log.info(
            "pipeline | ingest complete",
            slug=slug,
            entities=len(entities),
            risks=len(risks),
            opportunities=len(opps),
            tasks=len(tasks),
        )

        # 5. Blocking judge — scores extractions against the transcript +
        #    extractor reasoning.  Runs before returning so Ollama isn't
        #    contended between judge and the next case's extraction.
        #    Skipped when req.skip_judge=True (e.g. golden eval runs).
        if extraction_traces and not req.skip_judge:
            await self._run_judge(extraction_traces, req.transcript, slug)

        return signals

    async def _run_judge(
        self,
        traces: list[ExtractionTrace],
        transcript: str,
        slug: str,
    ) -> None:
        """Run per-category judges and log results. Never raises."""
        try:
            scores = await judge_extraction(traces, transcript)
            for s in scores:
                log.info(
                    "judge_score",
                    slug=slug,
                    category=s.category,
                    mean=round(s.mean, 3),
                    faithfulness=s.faithfulness,
                    precision=s.precision,
                    reasoning_quality=s.reasoning_quality,
                    schema=s.schema_score,
                )
                await self.tracer.write({
                    "slug": slug,
                    "category": f"judge.{s.category}",
                    "model": settings.ollama_judge_model,
                    "faithfulness": s.faithfulness,
                    "precision": s.precision,
                    "reasoning_quality": s.reasoning_quality,
                    "schema_score": s.schema_score,
                    "citation_quality": s.citation_quality,
                    "mean_score": s.mean,
                    "judge_reasoning": s.judge_reasoning,
                    "judge_thinking": s.judge_thinking[:1000],
                    "otel_trace_id": _current_trace_id(),
                })
        except Exception as exc:
            log.warning("judge_post_process_failed", slug=slug, error=str(exc))


def _current_trace_id() -> str:
    """Return the current OTel trace_id as a hex string, or empty string."""
    ctx = otel_trace.get_current_span().get_span_context()
    if ctx and ctx.is_valid:
        return format(ctx.trace_id, "032x")
    return ""


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
