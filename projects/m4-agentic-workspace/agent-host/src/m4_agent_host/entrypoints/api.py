from __future__ import annotations
from fastapi import FastAPI
from m4_agent_host.entrypoints.logging_setup import configure_logging

configure_logging()
app = FastAPI(title="M4 Agent Host", version="0.1.0")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def main() -> None:
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
