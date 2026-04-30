"""Unit tests for entity extraction utilities: _number_lines and _validate_entity_citations."""

from __future__ import annotations

from m4_agent_host.domain.models import Entity
from m4_agent_host.infrastructure.ai.agents import _number_lines, _validate_entity_citations


# ---------------------------------------------------------------------------
# _number_lines
# ---------------------------------------------------------------------------


def test_number_lines_basic() -> None:
    result = _number_lines("hello\nworld")
    assert result == "1: hello\n2: world"


def test_number_lines_zero_pads_for_large_input() -> None:
    text = "\n".join(f"line {i}" for i in range(100))
    result = _number_lines(text)
    lines = result.split("\n")
    # 3-digit zero-padded: 001, 002, ...
    assert lines[0].startswith("001: ")
    assert lines[99].startswith("100: ")


def test_number_lines_single_line() -> None:
    result = _number_lines("only one line")
    assert result == "1: only one line"


def test_number_lines_empty_string() -> None:
    result = _number_lines("")
    assert result == "1: "


def test_number_lines_preserves_content() -> None:
    text = "first line\nsecond line\nthird line"
    result = _number_lines(text)
    assert "first line" in result
    assert "second line" in result
    assert "third line" in result


# ---------------------------------------------------------------------------
# _validate_entity_citations
# ---------------------------------------------------------------------------


def _make_entity(
    name: str = "Jane Doe",
    evidence_quote: str | None = "Jane Doe presented the update",
    source_line: int | None = 3,
    confidence: str = "verified",
    relationship: str = "client",
) -> Entity:
    return Entity(
        name=name,
        evidence_quote=evidence_quote,
        source_line=source_line,
        confidence=confidence,
        relationship=relationship,
    )


def test_validate_drops_grant_vermillion() -> None:
    numbered = "1: Grant Vermillion opened the meeting\n2: Jane Doe presented"
    entities = [
        _make_entity(name="Grant Vermillion", source_line=1, evidence_quote="Grant Vermillion opened"),
        _make_entity(name="Jane Doe", source_line=2, evidence_quote="Jane Doe presented"),
    ]
    result = _validate_entity_citations(entities, numbered)
    assert len(result) == 1
    assert result[0].name == "Jane Doe"


def test_validate_drops_grant_first_name_only() -> None:
    numbered = "1: Grant opened the meeting"
    entities = [_make_entity(name="Grant", source_line=1, evidence_quote="Grant opened")]
    result = _validate_entity_citations(entities, numbered)
    assert len(result) == 0


def test_validate_drops_empty_evidence() -> None:
    numbered = "1: Jane Doe presented"
    entities = [_make_entity(evidence_quote=None), _make_entity(evidence_quote="")]
    result = _validate_entity_citations(entities, numbered)
    assert len(result) == 0


def test_validate_keeps_entity_with_valid_line() -> None:
    numbered = "1: First line\n2: Second line\n3: Jane Doe presented the update"
    entities = [_make_entity(source_line=3, evidence_quote="Jane Doe presented")]
    result = _validate_entity_citations(entities, numbered)
    assert len(result) == 1
    assert result[0].confidence == "verified"


def test_validate_downgrades_confidence_on_line_mismatch() -> None:
    numbered = "1: First line\n2: Second line\n3: Bob Smith presented"
    # Entity claims to be on line 3, but name is Jane Doe — mismatch
    entities = [_make_entity(name="Jane Doe", source_line=3, evidence_quote="Jane Doe presented")]
    result = _validate_entity_citations(entities, numbered)
    assert len(result) == 1
    assert result[0].confidence == "inferred"


def test_validate_matches_surname() -> None:
    numbered = "1: First line\n2: Second line\n3: Doe presented the update"
    entities = [_make_entity(name="Jane Doe", source_line=3, evidence_quote="Doe presented")]
    result = _validate_entity_citations(entities, numbered)
    assert len(result) == 1
    assert result[0].confidence == "verified"


def test_validate_no_source_line_keeps_entity() -> None:
    """Entities without source_line should pass through (no line check possible)."""
    numbered = "1: Jane Doe presented"
    entities = [_make_entity(source_line=None, evidence_quote="Jane Doe presented")]
    result = _validate_entity_citations(entities, numbered)
    assert len(result) == 1
    assert result[0].confidence == "verified"


def test_validate_out_of_range_line_downgrades() -> None:
    numbered = "1: Only one line"
    entities = [_make_entity(source_line=99, evidence_quote="Jane Doe presented")]
    result = _validate_entity_citations(entities, numbered)
    assert len(result) == 1
    assert result[0].confidence == "inferred"


def test_validate_case_insensitive_name_match() -> None:
    numbered = "1: First line\n2: JANE DOE presented the update"
    entities = [_make_entity(name="Jane Doe", source_line=2, evidence_quote="JANE DOE presented")]
    result = _validate_entity_citations(entities, numbered)
    assert len(result) == 1
    assert result[0].confidence == "verified"


def test_validate_preserves_other_fields() -> None:
    numbered = "1: Jane Doe presented"
    entity = Entity(
        name="Jane Doe",
        title="VP Engineering",
        relationship="client",
        rapport_notes=["Very technical"],
        evidence_quote="Jane Doe presented",
        source_line=1,
        confidence="verified",
    )
    result = _validate_entity_citations([entity], numbered)
    assert len(result) == 1
    assert result[0].title == "VP Engineering"
    assert result[0].rapport_notes == ["Very technical"]
    assert result[0].relationship == "client"
