#!/usr/bin/env python3
"""Backfill vault from Granola meeting data.

Parses the MCP markdown export and local Granola cache, merges them, and
ingests each meeting through IngestService in chronological order.

Usage:
    # From agent-host/:
    uv run python scripts/backfill_granola.py                    # full run
    uv run python scripts/backfill_granola.py --dry-run          # parse + merge only
    uv run python scripts/backfill_granola.py --limit 5          # first N meetings
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Environment overrides — must happen BEFORE importing app code so
# pydantic-settings picks them up at module-load time.
# ---------------------------------------------------------------------------
_VAULT_PATH = os.environ.get(
    "VAULT_PATH",
    str(Path.home() / "vaults" / "m4-vault"),
)
os.environ.setdefault("VAULT_PATH", _VAULT_PATH)
os.environ.setdefault("ENRICH_CITATIONS", "false")
os.environ.setdefault("OLLAMA_BASE_URL", "http://localhost:11434/v1")
# Phoenix is exposed on localhost:6006 via Docker — override Docker hostname
os.environ.setdefault("PHOENIX_COLLECTOR_ENDPOINT", "http://localhost:6006/v1/traces")

# Now safe to import app code
from m4_agent_host.application.ingest_service import IngestService  # noqa: E402
from m4_agent_host.domain.models import MeetingIngestRequest, ParticipantInfo  # noqa: E402

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
MCP_EXPORT = Path.home() / "Downloads" / "granola" / "files" / "all_meetings_export.md"
CACHE_JSON = Path.home() / "Library" / "Application Support" / "Granola" / "cache-v6.json"

# Months lookup for the MCP export date headers
MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}


# ---------------------------------------------------------------------------
# Data classes for parsed meetings
# ---------------------------------------------------------------------------
@dataclass
class MCPMeeting:
    title: str
    date: str  # ISO date e.g. "2026-04-22"
    time: str  # e.g. "6:18 PM"
    participants: list[str] = field(default_factory=list)
    summary: str = ""


@dataclass
class CacheDoc:
    doc_id: str
    title: str
    created_at: str  # ISO datetime
    attendees: list[ParticipantInfo] = field(default_factory=list)
    transcript: str | None = None  # flattened text, only if available


@dataclass
class MergedMeeting:
    title: str
    date: str
    time: str
    transcript: str  # cache transcript or MCP summary (whichever is richer)
    granola_summary: str | None
    participants: list[ParticipantInfo]
    has_real_transcript: bool = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _normalize(s: str) -> str:
    """Lowercase, strip non-alphanum for fuzzy matching."""
    return re.sub(r"[^a-z0-9]", "", s.lower())


# ---------------------------------------------------------------------------
# 1. Parse MCP markdown export
# ---------------------------------------------------------------------------
def parse_mcp_export(path: Path) -> list[MCPMeeting]:
    """Parse both the Meeting Index and Detailed Summaries sections.

    The Meeting Index has all 75 meetings with one-line descriptions.
    The Detailed Summaries section may only cover a subset with full content.
    We parse both and merge — detailed summaries override index descriptions.
    """
    text = path.read_text()

    # --- Phase 1: Parse Meeting Index for all meetings ---
    index_meetings = _parse_meeting_index(text)

    # --- Phase 2: Parse Detailed Summaries (may be partial) ---
    detail_map = _parse_detailed_summaries(text)

    # --- Phase 3: Merge — detailed summaries enrich index entries ---
    meetings: list[MCPMeeting] = []
    for m in index_meetings:
        key = (_normalize(m.title), m.date)
        detail = detail_map.get(key)
        if detail:
            # Use rich summary + participants from detailed section
            m.summary = detail.summary or m.summary
            m.participants = detail.participants or m.participants
        meetings.append(m)

    return meetings


def _parse_meeting_index(text: str) -> list[MCPMeeting]:
    """Parse the '## Meeting Index' section.

    Format:
        ### April 22, 2026
        1. **New note** (6:18 PM) - AI Strategy Workshop Overview
        2. **WM AI Workshop** (6:09 PM) - No summary
    """
    marker = "## Meeting Index"
    idx = text.find(marker)
    if idx == -1:
        return []
    # End at next ## section
    end_idx = text.find("\n## ", idx + len(marker))
    section = text[idx:end_idx] if end_idx != -1 else text[idx:]

    meetings: list[MCPMeeting] = []
    current_date = ""
    date_pattern = re.compile(r"^### (\w+ \d{1,2}, \d{4})", re.MULTILINE)
    # Match: 1. **Title** (6:18 PM) - Description
    # Also handle titles with special chars like <>, /
    entry_pattern = re.compile(
        r"^\d+\.\s+\*\*(.+?)\*\*\s+\((\d{1,2}:\d{2}\s*[AP]M)\)\s*-\s*(.*)",
        re.MULTILINE,
    )

    for line in section.split("\n"):
        dm = date_pattern.match(line)
        if dm:
            current_date = _parse_date_header(dm.group(1))
            continue

        em = entry_pattern.match(line)
        if em and current_date:
            title = em.group(1).strip()
            time = em.group(2).strip()
            description = em.group(3).strip()

            # "No summary" means no useful content
            if description.lower() == "no summary":
                description = ""

            meetings.append(MCPMeeting(
                title=title,
                date=current_date,
                time=time,
                summary=description,  # one-liner from index; may be overridden
            ))

    return meetings


def _parse_detailed_summaries(text: str) -> dict[tuple[str, str], MCPMeeting]:
    """Parse '## Detailed Summaries' section, return {(norm_title, date): MCPMeeting}."""
    marker = "## Detailed Summaries"
    idx = text.find(marker)
    if idx == -1:
        return {}
    # End at next ## section
    end_idx = text.find("\n## ", idx + len(marker))
    section = text[idx:end_idx] if end_idx != -1 else text[idx:]

    result: dict[tuple[str, str], MCPMeeting] = {}
    current_date = ""
    date_pattern = re.compile(r"^### (\w+ \d{1,2}, \d{4})", re.MULTILINE)
    meeting_pattern = re.compile(
        r"^#### (.+?) \((\d{1,2}:\d{2}\s*[AP]M)\)\s*$",
        re.MULTILINE,
    )

    lines = section.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]

        dm = date_pattern.match(line)
        if dm:
            current_date = _parse_date_header(dm.group(1))
            i += 1
            continue

        mm = meeting_pattern.match(line)
        if mm and current_date:
            title = mm.group(1).strip()
            time = mm.group(2).strip()

            # Collect body until next #### or ### or end
            i += 1
            body_lines: list[str] = []
            while i < len(lines):
                if lines[i].startswith("#### ") or lines[i].startswith("### "):
                    break
                body_lines.append(lines[i])
                i += 1

            body = "\n".join(body_lines).strip()

            # Extract participants
            participants: list[str] = []
            for bl in body_lines:
                if bl.startswith("**Participants:**"):
                    raw = bl.replace("**Participants:**", "").strip()
                    participants = [p.strip() for p in raw.split(",") if p.strip()]
                    break

            # Extract summary
            summary = ""
            no_summary = "no summary available" in body.lower()
            if not no_summary:
                sum_match = re.search(r"\*\*Summary:\*\*\s*", body)
                if sum_match:
                    summary = body[sum_match.end():].strip()

            key = (_normalize(title), current_date)
            result[key] = MCPMeeting(
                title=title, date=current_date, time=time,
                participants=participants, summary=summary,
            )
            continue

        i += 1

    return result


def _parse_date_header(s: str) -> str:
    """'April 22, 2026' -> '2026-04-22'"""
    parts = s.split()
    if len(parts) != 3:
        return ""
    month_name, day_str, year_str = parts
    month = MONTHS.get(month_name.lower(), 0)
    day = int(day_str.rstrip(","))
    year = int(year_str)
    return f"{year}-{month:02d}-{day:02d}"


# ---------------------------------------------------------------------------
# 2. Parse Granola local cache
# ---------------------------------------------------------------------------
def parse_cache(path: Path) -> dict[str, CacheDoc]:
    """Return {doc_id: CacheDoc} from the Granola cache JSON."""
    raw = json.loads(path.read_text())
    state = raw["cache"]["state"]
    documents = state["documents"]
    transcripts = state.get("transcripts", {})

    cache_docs: dict[str, CacheDoc] = {}

    for doc_id, doc in documents.items():
        if not doc:
            continue
        title = doc.get("title") or ""
        created_at = doc.get("created_at", "")

        # Attendees
        attendees: list[ParticipantInfo] = []
        people = doc.get("people")
        if isinstance(people, dict):
            for att in people.get("attendees", []):
                email = att.get("email")
                details = att.get("details", {})
                person = details.get("person", {})
                full_name = person.get("name", {}).get("fullName", "")
                employment = person.get("employment", {})
                company_name = employment.get("name") or details.get("company", {}).get("name")

                # Try to get a reasonable name — sometimes fullName is just an email prefix
                name = full_name or (email.split("@")[0] if email else "")
                if name:
                    attendees.append(ParticipantInfo(
                        name=name,
                        email=email,
                        company=company_name,
                    ))

        # Transcript — flatten utterances to "[source] text" lines
        transcript_text = None
        if doc_id in transcripts:
            utterances = transcripts[doc_id]
            if isinstance(utterances, list) and utterances:
                lines = []
                for u in utterances:
                    source = u.get("source", "unknown")
                    text = u.get("text", "").strip()
                    if text:
                        lines.append(f"[{source}] {text}")
                if lines:
                    transcript_text = "\n".join(lines)

        cache_docs[doc_id] = CacheDoc(
            doc_id=doc_id,
            title=title,
            created_at=created_at,
            attendees=attendees,
            transcript=transcript_text,
        )

    return cache_docs


# ---------------------------------------------------------------------------
# 3. Merge MCP meetings with cache docs
# ---------------------------------------------------------------------------
def merge(mcp_meetings: list[MCPMeeting], cache_docs: dict[str, CacheDoc]) -> list[MergedMeeting]:
    """Match MCP meetings to cache docs by title + date, produce merged list."""

    # Build lookup: (normalized_title, date_prefix) -> CacheDoc
    # date_prefix = "2026-04-20" from created_at "2026-04-20T17:00:39.244Z"
    cache_by_key: dict[tuple[str, str], CacheDoc] = {}
    for cd in cache_docs.values():
        if not cd.title:
            continue
        date_prefix = cd.created_at[:10] if cd.created_at else ""
        key = (_normalize(cd.title), date_prefix)
        cache_by_key[key] = cd

    # Minimum chars of content to bother sending to LLM
    MIN_CONTENT_CHARS = 50

    merged: list[MergedMeeting] = []
    matched = 0
    unmatched = 0
    skipped_short = 0

    for m in mcp_meetings:
        # Try to find matching cache doc
        key = (_normalize(m.title), m.date)
        cd = cache_by_key.get(key)

        # Determine best available content
        has_transcript = bool(cd and cd.transcript)
        if has_transcript:
            best_content = cd.transcript  # type: ignore[union-attr]
        elif m.summary:
            # Build a synthetic transcript from title + summary + participants
            # so the extractors have enough context to work with.
            parts = [f"Meeting: {m.title}", f"Date: {m.date}"]
            if m.participants:
                parts.append(f"Participants: {', '.join(m.participants)}")
            parts.append(f"\nSummary:\n{m.summary}")
            best_content = "\n".join(parts)
        else:
            best_content = ""

        # Skip meetings with insufficient content for meaningful extraction
        if len(best_content) < MIN_CONTENT_CHARS:
            skipped_short += 1
            continue

        if cd:
            matched += 1
        else:
            unmatched += 1

        # Participants: prefer cache attendees (have email/company), fallback to MCP names
        participants: list[ParticipantInfo] = []
        if cd and cd.attendees:
            participants = cd.attendees
        elif m.participants:
            participants = [ParticipantInfo(name=p) for p in m.participants]

        merged.append(MergedMeeting(
            title=m.title,
            date=m.date,
            time=m.time,
            transcript=best_content,
            granola_summary=m.summary or None,
            participants=participants,
            has_real_transcript=has_transcript,
        ))

    print(f"  Merge: {matched} matched to cache, {unmatched} MCP-only, {skipped_short} skipped (too short)")
    return merged


# ---------------------------------------------------------------------------
# 4. Ingest
# ---------------------------------------------------------------------------
def _slugify(date: str, title: str) -> str:
    """'2026-04-22', 'New note' -> '2026-04-22-new-note.md'"""
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:50]
    return f"{date}-{slug}.md"


async def run_backfill(meetings: list[MergedMeeting], *, limit: int | None = None, dry_run: bool = False) -> None:
    """Ingest meetings in chronological order (oldest first)."""

    # Sort oldest-first
    meetings.sort(key=lambda m: m.date)

    if limit:
        meetings = meetings[:limit]

    total = len(meetings)
    with_transcript = sum(1 for m in meetings if m.has_real_transcript)
    summary_only = total - with_transcript

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Backfill: {total} meetings "
          f"({with_transcript} with transcripts, {summary_only} summary-only)")

    if dry_run:
        print("\nWould ingest:")
        for i, m in enumerate(meetings, 1):
            flag = "T" if m.has_real_transcript else "S"
            pcount = len(m.participants)
            print(f"  [{i:2d}/{total}] {m.date} {m.title[:50]:<50} [{flag}] {pcount} participants")
        return

    svc = IngestService()
    success = 0
    failed = 0

    for i, m in enumerate(meetings, 1):
        filename = _slugify(m.date, m.title)
        req = MeetingIngestRequest(
            transcript=m.transcript,
            filename=filename,
            title=m.title,
            meeting_date=m.date,
            granola_summary=m.granola_summary,
            participants=m.participants,
            batch_mode=True,
            skip_judge=True,
        )

        flag = "T" if m.has_real_transcript else "S"
        print(f"\n[{i:2d}/{total}] {m.date} {m.title[:50]} [{flag}]", flush=True)

        try:
            signals = await svc.ingest_meeting(req)
            e = len(signals.entities)
            r = len(signals.risks)
            o = len(signals.opportunities)
            t = len(signals.tasks)
            print(f"  -> {e} entities, {r} risks, {o} opportunities, {t} tasks")
            success += 1
        except Exception as exc:
            print(f"  ** FAILED: {type(exc).__name__}: {exc}")
            failed += 1

    print(f"\n{'='*60}")
    print(f"Done: {success} succeeded, {failed} failed out of {total}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill vault from Granola data")
    parser.add_argument("--dry-run", action="store_true", help="Parse and merge only, no LLM calls")
    parser.add_argument("--limit", type=int, default=None, help="Ingest only first N meetings (after sort)")
    parser.add_argument("--mcp-export", type=str, default=str(MCP_EXPORT), help="Path to MCP markdown export")
    parser.add_argument("--cache-json", type=str, default=str(CACHE_JSON), help="Path to Granola cache JSON")
    parser.add_argument("--vault-path", type=str, default=None, help="Override vault path")
    args = parser.parse_args()

    if args.vault_path:
        os.environ["VAULT_PATH"] = args.vault_path

    mcp_path = Path(args.mcp_export)
    cache_path = Path(args.cache_json)

    print(f"MCP export:  {mcp_path}")
    print(f"Cache JSON:  {cache_path}")
    print(f"Vault:       {os.environ.get('VAULT_PATH')}")
    print()

    if not mcp_path.exists():
        print(f"ERROR: MCP export not found: {mcp_path}")
        sys.exit(1)

    # Step 1: Parse MCP export
    print("Parsing MCP export...")
    mcp_meetings = parse_mcp_export(mcp_path)
    with_summary = sum(1 for m in mcp_meetings if m.summary)
    print(f"  Found {len(mcp_meetings)} meetings ({with_summary} with summaries)")

    # Step 2: Parse cache (optional — enriches with transcripts + attendee details)
    cache_docs: dict[str, CacheDoc] = {}
    if cache_path.exists():
        print("Parsing Granola cache...")
        cache_docs = parse_cache(cache_path)
        with_transcript = sum(1 for cd in cache_docs.values() if cd.transcript)
        with_attendees = sum(1 for cd in cache_docs.values() if cd.attendees)
        print(f"  Found {len(cache_docs)} docs ({with_transcript} with transcripts, {with_attendees} with attendees)")
    else:
        print(f"  Cache not found at {cache_path}, proceeding with MCP data only")

    # Step 3: Merge
    print("Merging sources...")
    merged = merge(mcp_meetings, cache_docs)
    print(f"  {len(merged)} meetings ready to ingest")

    if not merged:
        print("Nothing to ingest.")
        return

    # Step 4: Run
    asyncio.run(run_backfill(merged, limit=args.limit, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
