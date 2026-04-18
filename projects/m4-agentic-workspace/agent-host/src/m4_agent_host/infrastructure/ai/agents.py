"""PydanticAI specialist agents for meeting signal extraction.

Four agents run in parallel on the same transcript, each enforcing a
typed schema. All use gemma3:9b (fast, parallel-safe on M4).
"""

from __future__ import annotations

from pydantic_ai import Agent
from pydantic_ai.models.ollama import OllamaModel
from pydantic_ai.providers.ollama import OllamaProvider

from m4_agent_host.config import settings
from m4_agent_host.domain.models import Entity, Opportunity, Risk, Task

_triage_model = OllamaModel(
    model_name=settings.ollama_triage_model,
    provider=OllamaProvider(base_url=settings.ollama_base_url),
)

entity_agent: Agent[None, list[Entity]] = Agent(
    _triage_model,
    output_type=list[Entity],
    system_prompt=(
        "You are an entity extraction specialist. Extract every person explicitly named "
        "in the meeting transcript.\n\n"
        "For each person capture:\n"
        "- name: full name as spoken\n"
        "- title: job title or role if mentioned, otherwise omit\n"
        "- relationship: one of client|colleague|stakeholder|vendor|unknown\n"
        "- rapport_notes: personal details, communication style, shared context "
        "(empty list if none)\n\n"
        "Rules: only include people explicitly named. Return an empty list if none. "
        "Never invent or infer names not stated in the text."
    ),
)

risk_agent: Agent[None, list[Risk]] = Agent(
    _triage_model,
    output_type=list[Risk],
    system_prompt=(
        "You are a risk detection specialist. Identify signals of churn risk, timeline "
        "slippage, blockers, or stakeholder dissatisfaction in the transcript.\n\n"
        "Detection signals:\n"
        "- Hedging language: 'we'll try', 'hopefully', 'might', 'if possible'\n"
        "- Timeline slippage: missed deadlines, pushed dates, vague timelines\n"
        "- Unresolved blockers: dependencies waiting on third parties\n"
        "- Budget or scope concerns raised\n"
        "- Disengagement signals: short answers, topic avoidance\n\n"
        "Severity: high=immediate threat, medium=needs monitoring, low=noted.\n"
        "project_slug: hyphen-lowercase slug of the affected project if identifiable.\n"
        "Return an empty list if no risks are detected."
    ),
)

opportunity_agent: Agent[None, list[Opportunity]] = Agent(
    _triage_model,
    output_type=list[Opportunity],
    system_prompt=(
        "You are an opportunity detection specialist. Identify expansion opportunities, "
        "unmet workflow needs, or lateral problems mentioned in the transcript.\n\n"
        "Detection signals:\n"
        "- Pain points mentioned casually ('we still do this manually')\n"
        "- Requests adjacent to current work ('it would be great if...')\n"
        "- References to other teams or systems that face similar problems\n"
        "- Capability gaps the speaker doesn't know you can fill\n\n"
        "type: expansion=grow current engagement, workflow=process improvement, "
        "lateral=different team or product.\n"
        "Return an empty list if none found."
    ),
)

task_agent: Agent[None, list[Task]] = Agent(
    _triage_model,
    output_type=list[Task],
    system_prompt=(
        "You are a task extraction specialist. Extract all action items, commitments, "
        "and next steps from the transcript.\n\n"
        "Include:\n"
        "- Explicit commitments: 'I'll send that by Friday', 'we'll schedule a follow-up'\n"
        "- Implicit commitments: 'let me know what you think', 'can you look into X'\n"
        "- Decisions that require follow-up action\n\n"
        "owner: first name or full name of who is responsible (omit if unclear).\n"
        "eta: ISO date string if a deadline is mentioned, otherwise omit.\n"
        "Return an empty list if no tasks found."
    ),
)
