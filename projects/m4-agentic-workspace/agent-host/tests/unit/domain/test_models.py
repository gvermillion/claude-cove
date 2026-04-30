from __future__ import annotations

from m4_agent_host.domain.models import (
    Dropped,
    Entity,
    MeetingIngestRequest,
    MeetingSignals,
    Opportunity,
    Risk,
    Task,
)


def test_meeting_signals_defaults_to_empty_lists() -> None:
    signals = MeetingSignals()
    assert signals.entities == []
    assert signals.risks == []
    assert signals.opportunities == []
    assert signals.tasks == []
    assert signals.dropped == []


def test_entity_relationship_defaults_to_unknown() -> None:
    entity = Entity(name="Jane Doe")
    assert entity.relationship == "unknown"
    assert entity.rapport_notes == []
    assert entity.aliases == []
    assert entity.evidence == ""


def test_risk_requires_severity() -> None:
    risk = Risk(summary="Timeline slipping", severity="high")
    assert risk.project is None
    assert risk.evidence == ""


def test_risk_backcompat_description_alias() -> None:
    risk = Risk(description="Timeline slipping", severity="high", project_slug="acme")
    assert risk.summary == "Timeline slipping"
    assert risk.project == "acme"


def test_opportunity_new_fields() -> None:
    opp = Opportunity(name="Expand into EMEA", type="expansion")
    assert opp.name == "Expand into EMEA"
    assert opp.account is None
    assert opp.evidence == ""


def test_opportunity_backcompat_description_alias() -> None:
    opp = Opportunity(description="Expand into EMEA", type="expansion")
    assert opp.name == "Expand into EMEA"


def test_task_new_fields() -> None:
    task = Task(action="Send proposal")
    assert task.owner is None
    assert task.due_hint is None
    assert task.commitment == "implied"
    assert task.blocks is None
    assert task.evidence == ""


def test_task_backcompat_description_eta_aliases() -> None:
    task = Task(description="Send proposal", eta="next week")
    assert task.action == "Send proposal"
    assert task.due_hint == "next week"


def test_dropped_model() -> None:
    d = Dropped(text="Snowflake", reason="stoplist_entity")
    assert d.text == "Snowflake"
    assert d.reason == "stoplist_entity"


def test_meeting_ingest_request_minimal() -> None:
    req = MeetingIngestRequest(transcript="hello", filename="2024-01-15.md")
    assert req.title is None
    assert req.meeting_date is None
