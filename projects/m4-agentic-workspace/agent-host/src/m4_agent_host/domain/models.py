from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class Entity(BaseModel):
    name: str
    title: str | None = None
    relationship: Literal["client", "colleague", "stakeholder", "vendor", "unknown"] = "unknown"
    rapport_notes: list[str] = []


class Risk(BaseModel):
    description: str
    severity: Literal["low", "medium", "high"]
    project_slug: str | None = None


class Opportunity(BaseModel):
    description: str
    type: Literal["expansion", "workflow", "lateral"]


class Task(BaseModel):
    description: str
    owner: str | None = None
    eta: str | None = None


class ParticipantInfo(BaseModel):
    name: str
    email: str | None = None
    company: str | None = None


class SignalCitation(BaseModel):
    category: Literal["entity", "risk", "opportunity", "task"]
    signal: str          # brief label of the extracted signal (e.g. "Risk: missing S1 pipe expansion")
    evidence: str        # verbatim or near-verbatim quote from transcript supporting the signal


class MeetingSynthesis(BaseModel):
    meeting_summary: str            # 3-5 sentence executive summary
    citations: list[SignalCitation] # one citation per key signal


class MeetingSignals(BaseModel):
    entities: list[Entity] = []
    risks: list[Risk] = []
    opportunities: list[Opportunity] = []
    tasks: list[Task] = []
    synthesis: MeetingSynthesis | None = None


class MeetingIngestRequest(BaseModel):
    transcript: str
    filename: str
    title: str | None = None
    meeting_date: str | None = None
    granola_summary: str | None = None   # Granola's AI-generated summary
    participants: list[ParticipantInfo] = []  # known attendees from calendar
