"""Candidate entity extractor — participant-seeded + regex-based name finder."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

from m4_agent_host.domain.models import ParticipantInfo

_NAME_RE = re.compile(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b")

# Parse "**Participants:** Name (Org), Name2 (Org2)" from Granola markdown
_GRANOLA_PARTICIPANTS_RE = re.compile(
    r"\*\*Participants:\*\*\s*(.+?)(?:\n|$)", re.IGNORECASE
)
# Individual participant entry: "Name (Org)" or just "Name"
_GRANOLA_ENTRY_RE = re.compile(r"([A-Za-z][A-Za-z .'-]+?)(?:\s*\([^)]*\))?\s*(?:,|$)")


@dataclass(frozen=True)
class NameCandidate:
    """A candidate name with provenance tracking."""
    name: str
    source: Literal["participant", "regex", "granola_header"]


def _parse_granola_participants(text: str) -> list[str]:
    """Extract participant names from Granola's **Participants:** header."""
    match = _GRANOLA_PARTICIPANTS_RE.search(text)
    if not match:
        return []
    line = match.group(1).strip()
    return [
        m.group(1).strip()
        for m in _GRANOLA_ENTRY_RE.finditer(line)
        if m.group(1).strip()
    ]


def extract_candidates(
    transcript: str,
    stoplist: frozenset[str],
    participants: list[ParticipantInfo] | None = None,
) -> list[NameCandidate]:
    """Extract name candidates from *transcript*, seeded by known participants.

    Priority order:
    1. Calendar participants (verified people — always included)
    2. Granola **Participants:** header names
    3. Regex-extracted Title Case names from transcript body

    Applies case-insensitive stoplist subtraction to regex candidates only.
    Participant-sourced names bypass the stoplist (they're verified people).
    Preserves first-occurrence order and deduplicates across all sources.
    """
    seen: set[str] = set()
    result: list[NameCandidate] = []

    # --- Source 1: Calendar participants (highest trust) ---
    for p in participants or []:
        name = p.name.strip()
        if not name:
            continue
        # Skip the user (Grant Vermillion) — but mark as seen to prevent regex re-discovery
        if name.lower() in ("grant vermillion", "grant"):
            seen.add(name.lower())
            continue
        if name.lower() in seen:
            continue
        seen.add(name.lower())
        result.append(NameCandidate(name=name, source="participant"))

    # --- Source 2: Granola **Participants:** header ---
    for name in _parse_granola_participants(transcript):
        if not name or name.lower() in seen:
            continue
        if name.lower() in ("grant vermillion", "grant"):
            seen.add(name.lower())
            continue
        seen.add(name.lower())
        result.append(NameCandidate(name=name, source="granola_header"))

    # --- Source 3: Regex extraction (supplementary) ---
    for match in _NAME_RE.finditer(transcript):
        name = match.group()
        if name.lower() in stoplist:
            continue
        if name.lower() in seen:
            continue
        seen.add(name.lower())
        result.append(NameCandidate(name=name, source="regex"))

    return result
