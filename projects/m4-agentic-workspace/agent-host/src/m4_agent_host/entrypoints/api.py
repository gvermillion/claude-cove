from __future__ import annotations

from datetime import UTC, datetime

import structlog
from fastapi import FastAPI, HTTPException
from openinference.semconv.trace import OpenInferenceSpanKindValues, SpanAttributes
from opentelemetry.trace import Status, StatusCode

from m4_agent_host.application.ingest_service import IngestService
from m4_agent_host.config import settings
from m4_agent_host.domain.models import MeetingIngestRequest, MeetingSignals
from m4_agent_host.entrypoints.logging_setup import configure_logging
from m4_agent_host.infrastructure.telemetry.tracer import tracer

configure_logging()
log = structlog.get_logger(__name__)

app = FastAPI(title="M4 Agent Host", version="0.1.0")
_ingest_service = IngestService()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest/meeting", response_model=MeetingSignals)
async def ingest_meeting(req: MeetingIngestRequest) -> MeetingSignals:
    with tracer.start_as_current_span("ingest_meeting") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
        # Session = daily bucket; lets Phoenix "Sessions" view group all ingests per day
        span.set_attribute(SpanAttributes.SESSION_ID, datetime.now(UTC).strftime("%Y-%m-%d"))
        span.set_attribute(SpanAttributes.USER_ID, settings.user_email)
        span.set_attribute("request.filename", req.filename)
        span.set_attribute("request.transcript_chars", len(req.transcript))
        span.set_attribute("request.has_granola_summary", bool(req.granola_summary))
        span.set_attribute("request.participant_count", len(req.participants or []))
        if req.meeting_date:
            span.set_attribute("request.meeting_date", req.meeting_date)
        span.set_attribute(SpanAttributes.INPUT_VALUE,
            f"{req.filename} ({len(req.transcript):,} chars"
            + (", granola summary" if req.granola_summary else "")
            + (f", {len(req.participants)} participants" if req.participants else "")
            + ")")
        try:
            result = await _ingest_service.ingest_meeting(req)
            span.set_attribute(SpanAttributes.OUTPUT_VALUE,
                f"{len(result.entities)} entities, {len(result.risks)} risks, "
                f"{len(result.opportunities)} opportunities, {len(result.tasks)} tasks"
                + (" + synthesis" if result.synthesis else ""))
            span.set_attribute("response.entity_count", len(result.entities))
            span.set_attribute("response.risk_count", len(result.risks))
            span.set_attribute("response.opportunity_count", len(result.opportunities))
            span.set_attribute("response.task_count", len(result.tasks))
            span.set_attribute("response.has_synthesis", result.synthesis is not None)
            span.set_status(Status(StatusCode.OK))
            return result
        except Exception as exc:
            log.error("ingest_meeting_failed", error=str(exc), exc_info=True)
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            raise HTTPException(status_code=500, detail="Ingest failed") from exc


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)  # noqa: S104
