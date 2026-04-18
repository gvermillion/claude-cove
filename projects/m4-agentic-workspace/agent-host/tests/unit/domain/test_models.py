from m4_agent_host.domain.models import (
    Entity, Risk, Opportunity, Task, MeetingSignals, MeetingIngestRequest
)


def test_meeting_signals_defaults_to_empty_lists() -> None:
    signals = MeetingSignals()
    assert signals.entities == []
    assert signals.risks == []
    assert signals.opportunities == []
    assert signals.tasks == []


def test_entity_relationship_defaults_to_unknown() -> None:
    entity = Entity(name="Jane Doe")
    assert entity.relationship == "unknown"
    assert entity.rapport_notes == []


def test_risk_requires_severity() -> None:
    risk = Risk(description="Timeline slipping", severity="high")
    assert risk.project_slug is None


def test_task_all_optional_except_description() -> None:
    task = Task(description="Send proposal")
    assert task.owner is None
    assert task.eta is None


def test_meeting_ingest_request_minimal() -> None:
    req = MeetingIngestRequest(transcript="hello", filename="2024-01-15.md")
    assert req.title is None
    assert req.meeting_date is None
