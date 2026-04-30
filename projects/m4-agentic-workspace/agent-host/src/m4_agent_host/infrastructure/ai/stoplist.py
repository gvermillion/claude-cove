"""Entity stoplist — drops known non-person tokens and ambiguous single names."""

from __future__ import annotations

import re

from m4_agent_host.domain.models import Dropped, Entity

COMPANY_STOPLIST: frozenset[str] = frozenset(
    t.lower()
    for t in [
        "Latium",
        "Precisely",
        "CrowdStrike",
        "Stride",
        "InterNova",
        "Leonard",
        "Chick-fil-A",
        "Snowflake",
        "AWS",
        "Delta",
        "Workday",
        "Nikke",
        "Q-IT",
        "George",
        "Marketing",
        "Granola",
        "Rook",
        "Phoenix",
        "Ollama",
        "Qwen",
        "Mistral",
        "Gemma",
        "OpenAI",
        "Anthropic",
        "Claude",
    ]
)

# Disambiguator patterns — anchored after the candidate name.
# Uses case-sensitive surname class [A-Z][a-z]+ but case-insensitive
# for preposition/title words via inline (?i:...) groups.
_DISAMBIGUATORS: list[re.Pattern[str]] = [
    # "Name Lastname" — surname must start uppercase
    re.compile(r"{name}\s+[A-Z][a-z]+"),
    # "Name at <Org>"
    re.compile(r"{name}\s+(?i:at)\s+[A-Z]"),
    # "Name, <Title>"
    re.compile(r"{name},\s*\S"),
    # "Name is a <role>"
    re.compile(r"{name}\s+(?i:is\s+a)\s+\S"),
]


def _has_disambiguator(name: str, transcript: str) -> bool:
    """Return True if the transcript contains context that confirms *name* is a person."""
    for template in _DISAMBIGUATORS:
        pattern = re.compile(template.pattern.replace("{name}", re.escape(name)))
        if pattern.search(transcript):
            return True
    return False


def scrub_entities(
    entities: list[Entity],
    transcript: str,
) -> tuple[list[Entity], list[Dropped]]:
    """Filter entities through the stoplist and single-name disambiguator.

    Returns (survivors, dropped_records).
    """
    survivors: list[Entity] = []
    dropped: list[Dropped] = []

    for e in entities:
        low = e.name.strip().lower()

        # Hard stoplist match
        if low in COMPANY_STOPLIST:
            dropped.append(Dropped(text=e.name, reason="stoplist_entity"))
            continue

        # Single-word name without disambiguator — but participant-sourced
        # entities bypass this check (calendar already verified them as people)
        if (
            " " not in e.name.strip()
            and e.source not in ("participant", "granola_header")
            and not _has_disambiguator(e.name.strip(), transcript)
        ):
            dropped.append(Dropped(text=e.name, reason="stoplist_entity"))
            continue

        survivors.append(e)

    return survivors, dropped
