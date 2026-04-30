"""Tests for entity stoplist and scrub_entities."""

from __future__ import annotations

from m4_agent_host.domain.models import Entity
from m4_agent_host.infrastructure.ai.stoplist import scrub_entities


def test_stoplist_token_dropped() -> None:
    entities = [Entity(name="Latium")]
    survivors, dropped = scrub_entities(entities, "We talked to Latium about the deal.")
    assert survivors == []
    assert len(dropped) == 1
    assert dropped[0].text == "Latium"
    assert dropped[0].reason == "stoplist_entity"


def test_single_name_without_disambiguator_dropped() -> None:
    entities = [Entity(name="Omar")]
    survivors, dropped = scrub_entities(entities, "Omar mentioned the timeline.")
    assert survivors == []
    assert len(dropped) == 1
    assert dropped[0].text == "Omar"
    assert dropped[0].reason == "stoplist_entity"


def test_single_name_with_disambiguator_survives() -> None:
    # "Name at <Org>" pattern
    entities_at = [Entity(name="Omar")]
    survivors, dropped = scrub_entities(entities_at, "Omar at Precisely said the pipeline is ready.")
    assert len(survivors) == 1
    assert survivors[0].name == "Omar"
    assert dropped == []

    # "Name Lastname" pattern
    entities_full = [Entity(name="Omar Garcia")]
    survivors2, dropped2 = scrub_entities(entities_full, "Omar Garcia joined the call.")
    assert len(survivors2) == 1
    assert survivors2[0].name == "Omar Garcia"
    assert dropped2 == []


def test_participant_sourced_single_name_survives() -> None:
    """Single-name entities sourced from calendar participants bypass the disambiguator check."""
    entities = [Entity(name="Chakra", source="participant")]
    survivors, dropped = scrub_entities(entities, "Chakra mentioned the timeline.")
    assert len(survivors) == 1
    assert survivors[0].name == "Chakra"
    assert dropped == []


def test_granola_header_sourced_single_name_survives() -> None:
    """Single-name entities from Granola header bypass disambiguator."""
    entities = [Entity(name="Abby", source="granola_header")]
    survivors, dropped = scrub_entities(entities, "Abby discussed the proposal.")
    assert len(survivors) == 1
    assert survivors[0].name == "Abby"
    assert dropped == []


def test_participant_sourced_stoplist_still_dropped() -> None:
    """Even participant-sourced entities are dropped if they match the hard stoplist."""
    entities = [Entity(name="Latium", source="participant")]
    survivors, dropped = scrub_entities(entities, "Latium was on the call.")
    assert survivors == []
    assert len(dropped) == 1
    assert dropped[0].reason == "stoplist_entity"
