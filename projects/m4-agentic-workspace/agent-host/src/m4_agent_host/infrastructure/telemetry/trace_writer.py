"""Async JSONL writer for LLM interaction traces.

Appends one record per extraction category per ingest run to:
  vault/_system/llm-traces.jsonl

Each record captures both passes so a stronger model can review failures.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import structlog

log = structlog.get_logger(__name__)


class TraceWriter:
    """Append-only JSONL trace log, async-safe via asyncio.Lock.

    Pattern: Repository (write-only side) for LLM trace records.
    """

    def __init__(self, vault_path: str) -> None:
        self._path = Path(vault_path) / "_system" / "llm-traces.jsonl"
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()

    async def write(self, record: dict[str, Any]) -> None:
        """Append a single trace record as a JSON line.

        Args:
            record: Arbitrary dict; ts field is injected automatically.
        """
        record["ts"] = datetime.now(timezone.utc).isoformat()
        line = json.dumps(record, default=str) + "\n"
        async with self._lock:
            with self._path.open("a", encoding="utf-8") as fh:
                fh.write(line)
        log.debug("trace_written", category=record.get("category"), slug=record.get("slug"))
