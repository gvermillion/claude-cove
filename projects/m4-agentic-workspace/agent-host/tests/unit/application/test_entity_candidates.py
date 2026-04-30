"""Tests for candidate entity extractor."""

from __future__ import annotations

from m4_agent_host.application.entity_candidates import NameCandidate, extract_candidates
from m4_agent_host.domain.models import ParticipantInfo
from m4_agent_host.infrastructure.ai.stoplist import COMPANY_STOPLIST


def test_stoplist_tokens_excluded() -> None:
    transcript = "Latium and Snowflake discussed the proposal with Alice."
    result = extract_candidates(transcript, COMPANY_STOPLIST)
    names = [c.name for c in result]
    assert "Latium" not in names
    assert "Snowflake" not in names
    assert "Alice" in names


def test_first_occurrence_order_preserved() -> None:
    transcript = "Charlie met Bravo, then Alice joined. Charlie spoke again."
    result = extract_candidates(transcript, frozenset())
    names = [c.name for c in result]
    # Deduplicated, first-occurrence order
    assert names.index("Charlie") < names.index("Bravo") < names.index("Alice")
    assert names.count("Charlie") == 1


def test_multiword_capitalized_names_extracted() -> None:
    transcript = "Omar Garcia and Sarah Kim joined the call."
    result = extract_candidates(transcript, frozenset())
    names = [c.name for c in result]
    assert "Omar Garcia" in names
    assert "Sarah Kim" in names


def test_participants_seeded_first() -> None:
    """Participant names appear before regex-discovered names."""
    participants = [
        ParticipantInfo(name="saichakravarthy", company="Acme"),
        ParticipantInfo(name="Abby Rodriguez", email="abby@acme.com"),
    ]
    transcript = "Charlie mentioned the timeline. Omar joined later."
    result = extract_candidates(transcript, frozenset(), participants=participants)
    names = [c.name for c in result]
    # Participants come first
    assert names[0] == "saichakravarthy"
    assert names[1] == "Abby Rodriguez"
    # Regex names follow
    assert "Charlie" in names
    assert "Omar" in names


def test_participants_have_participant_source() -> None:
    participants = [ParticipantInfo(name="Gabriel Diaz")]
    transcript = "Gabriel Diaz presented the roadmap."
    result = extract_candidates(transcript, frozenset(), participants=participants)
    # Should appear once with participant source (not duplicated by regex)
    gabriel = [c for c in result if "gabriel" in c.name.lower()]
    assert len(gabriel) == 1
    assert gabriel[0].source == "participant"


def test_granola_header_parsed() -> None:
    transcript = (
        "**Participants:** Sarah Chen (Snowflake), Omar Garcia (phData)\n\n"
        "The meeting started with introductions."
    )
    result = extract_candidates(transcript, frozenset())
    names = [c.name for c in result]
    sources = {c.name: c.source for c in result}
    assert "Sarah Chen" in names
    assert "Omar Garcia" in names
    assert sources["Sarah Chen"] == "granola_header"
    assert sources["Omar Garcia"] == "granola_header"


def test_grant_vermillion_excluded_from_participants() -> None:
    participants = [
        ParticipantInfo(name="Grant Vermillion"),
        ParticipantInfo(name="Sarah Chen"),
    ]
    transcript = "Grant Vermillion hosted the call. Sarah Chen presented."
    result = extract_candidates(transcript, frozenset(), participants=participants)
    names = [c.name for c in result]
    assert "Grant Vermillion" not in names
    assert "Sarah Chen" in names


def test_deduplication_across_sources() -> None:
    """A name found in participants AND regex should only appear once (participant wins)."""
    participants = [ParticipantInfo(name="Omar Garcia")]
    transcript = "Omar Garcia joined the call and spoke about the project."
    result = extract_candidates(transcript, frozenset(), participants=participants)
    omar = [c for c in result if "omar" in c.name.lower()]
    assert len(omar) == 1
    assert omar[0].source == "participant"


def test_returns_name_candidates() -> None:
    """Return type is list[NameCandidate], not bare strings."""
    transcript = "Alice spoke to Bob."
    result = extract_candidates(transcript, frozenset())
    assert all(isinstance(c, NameCandidate) for c in result)
    assert all(c.source == "regex" for c in result)
