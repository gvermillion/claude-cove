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


class MeetingSignals(BaseModel):
    entities: list[Entity] = []
    risks: list[Risk] = []
    opportunities: list[Opportunity] = []
    tasks: list[Task] = []


class MeetingIngestRequest(BaseModel):
    transcript: str
    filename: str
    title: str | None = None
    meeting_date: str | None = None
