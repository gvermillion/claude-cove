from __future__ import annotations
from fastapi import FastAPI, HTTPException
from m4_agent_host.application.ingest_service import IngestService
from m4_agent_host.domain.models import MeetingIngestRequest, MeetingSignals
from m4_agent_host.entrypoints.logging_setup import configure_logging

configure_logging()
app = FastAPI(title="M4 Agent Host", version="0.1.0")
_ingest_service = IngestService()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest/meeting", response_model=MeetingSignals)
async def ingest_meeting(req: MeetingIngestRequest) -> MeetingSignals:
    try:
        return await _ingest_service.ingest_meeting(req)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def main() -> None:
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
