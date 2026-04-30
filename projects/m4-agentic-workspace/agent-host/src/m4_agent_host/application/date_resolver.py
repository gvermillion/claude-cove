from __future__ import annotations

import re
from datetime import date, datetime, time

import dateparser

RELATIVE_MARKERS = re.compile(
    r"\b(next|this|last|in\s+\d+|by|before|after|week|month|quarter|today|tomorrow"
    r"|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday"
    r"|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec"
    r"|january|february|march|april|may|june|july|august|september|october|november|december"
    r"|q[1-4])\b",
    re.IGNORECASE,
)

ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _is_relative(phrase: str) -> bool:
    return bool(RELATIVE_MARKERS.search(phrase))


def resolve_due_hint(phrase: str | None, meeting_date: date | None) -> str | None:
    """Resolve a relative date phrase to ISO YYYY-MM-DD anchored to meeting_date.

    Returns None if phrase is None, meeting_date is None, or dateparser fails.
    If phrase is already ISO, return it unchanged.
    """
    if not phrase:
        return None
    s = phrase.strip()
    if ISO_RE.match(s):
        return s
    if meeting_date is None:
        return None  # Never hallucinate a date without an anchor
    try:
        parsed = dateparser.parse(
            s,
            settings={
                "RELATIVE_BASE": datetime.combine(meeting_date, time.min),
                "PREFER_DATES_FROM": "future",
            },
        )
    except Exception:  # noqa: BLE001
        return None
    return parsed.date().isoformat() if parsed else None
