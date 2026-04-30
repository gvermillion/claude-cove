from __future__ import annotations

from typing import Literal

from pydantic import AliasChoices, BaseModel, Field


class Entity(BaseModel):
    name: str
    role: str | None = None
    org: str | None = None
    relationship: Literal["colleague", "client", "vendor", "partner", "prospect", "unknown"] = "unknown"
    aliases: list[str] = []
    evidence: str = ""
    # Backcompat fields for telemetry / vault writer
    title: str | None = None
    rapport_notes: list[str] = []
    evidence_quote: str | None = None  # 5-8 word verbatim snippet from transcript
    source_line: int | None = None  # line number in transcript where entity appears
    confidence: Literal["verified", "inferred"] | None = None
    # Provenance: how was this entity discovered?
    source: Literal["participant", "regex", "granola_header"] | None = None


class Risk(BaseModel):
    summary: str = Field(..., validation_alias=AliasChoices("summary", "description"))
    severity: Literal["low", "medium", "high"]
    project: str | None = Field(default=None, validation_alias=AliasChoices("project", "project_slug"))
    evidence: str = ""


class Opportunity(BaseModel):
    name: str = Field(..., validation_alias=AliasChoices("name", "description"))
    type: Literal["new_logo", "expansion", "lateral", "workflow"]
    account: str | None = None
    value_hint: str | None = None
    stage_hint: str | None = None
    evidence: str = ""


class Task(BaseModel):
    action: str = Field(..., validation_alias=AliasChoices("action", "description"))
    owner: str | None = None
    due_hint: str | None = Field(default=None, validation_alias=AliasChoices("due_hint", "eta"))
    commitment: Literal["hard", "soft", "implied"] = "implied"
    blocks: str | None = None
    evidence: str = ""


class Dropped(BaseModel):
    text: str
    reason: Literal["fact_not_task", "duplicate", "stoplist_entity", "ungrounded", "wrong_category"]


class ParticipantInfo(BaseModel):
    name: str
    email: str | None = None
    company: str | None = None


class SignalCitation(BaseModel):
    category: Literal["entity", "risk", "opportunity", "task"]
    signal: str          # brief label of the extracted signal (e.g. "Risk: missing S1 pipe expansion")
    evidence: str        # verbatim or near-verbatim quote from transcript supporting the signal
    source_line: int | None = None  # line number in transcript where evidence appears


class MeetingSynthesis(BaseModel):
    meeting_summary: str            # 3-5 sentence executive summary
    citations: list[SignalCitation] # one citation per key signal


class MeetingSignals(BaseModel):
    entities: list[Entity] = []
    risks: list[Risk] = []
    opportunities: list[Opportunity] = []
    tasks: list[Task] = []
    dropped: list[Dropped] = []
    synthesis: MeetingSynthesis | None = None
    p1_thinking: dict[str, str] = {}  # category → extractor chain-of-thought


class MeetingIngestRequest(BaseModel):
    transcript: str
    filename: str
    title: str | None = None
    meeting_date: str | None = None
    granola_summary: str | None = None   # Granola's AI-generated summary
    participants: list[ParticipantInfo] = []  # known attendees from calendar
    skip_judge: bool = False  # set True in evals to skip production judge
    batch_mode: bool = False  # skip judge + citations for fast backfill
