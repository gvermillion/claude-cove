"""Meeting signal extraction — combined single-pass per category.

Each category (risks, opportunities, tasks) uses a single Ollama /api/chat call
with ``format: "json"`` to extract AND structure in one shot.

Entities use a two-stage flow: regex candidate extraction → single LLM resolution call.

Pass 3 (_cite_for_category) is optional, gated by ``settings.enrich_citations``.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from typing import TypeVar

import httpx
import structlog
from openinference.semconv.trace import MessageAttributes, OpenInferenceSpanKindValues, SpanAttributes
from opentelemetry.trace import Status, StatusCode
from pydantic import BaseModel, field_validator

from m4_agent_host.config import settings
from m4_agent_host.domain.models import Dropped, Entity, MeetingSignals, MeetingSynthesis, Opportunity, ParticipantInfo, Risk, SignalCitation, Task
from m4_agent_host.infrastructure.ai.tokenizer import count_tokens
from m4_agent_host.infrastructure.ai.stoplist import COMPANY_STOPLIST
from m4_agent_host.infrastructure.vault.reader import PersonContext
from m4_agent_host.application.entity_candidates import NameCandidate, extract_candidates
from m4_agent_host.infrastructure.telemetry.tracer import tracer

log = structlog.get_logger(__name__)

log.info(
    "agents_init",
    ollama_base_url=settings.ollama_base_url,
    triage_model=settings.ollama_triage_model,
    reasoning_model=settings.ollama_reasoning_model,
)

_M = TypeVar("_M", bound=BaseModel)


class _ResolvedEntity(BaseModel):
    """Intermediate Pydantic model for entity-resolve Pass 2 (includes drop flag)."""
    name: str
    role: str | None = None
    org: str | None = None
    relationship: str = "unknown"
    aliases: list[str] = []
    evidence: str = ""
    drop: bool = False

    @field_validator("aliases", mode="before")
    @classmethod
    def _coerce_aliases(cls, v: object) -> list[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [v] if v else []
        return v  # type: ignore[return-value]

    @field_validator("relationship", mode="before")
    @classmethod
    def _coerce_relationship(cls, v: object) -> str:
        if v is None:
            return "unknown"
        return str(v)


# ---------------------------------------------------------------------------
# Line-numbering utility for transcript traceability
# ---------------------------------------------------------------------------

def _number_lines(text: str) -> str:
    """Prepend zero-padded line numbers to each line of text.

    Used to give the extraction model line-number awareness so it can
    cite specific source locations in its output.

    >>> _number_lines("hello\\nworld")
    '01: hello\\n02: world'
    """
    lines = text.split("\n")
    width = len(str(len(lines)))
    return "\n".join(f"{i + 1:0{width}d}: {line}" for i, line in enumerate(lines))


def _validate_entity_citations(
    entities: list[Entity],
    numbered_text: str,
) -> list[Entity]:
    """Deterministic post-Pass-2 validation: check entity evidence against source.

    For each entity:
    1. If ``source_line`` is set, verify the entity's name (or a surname token)
       appears on that line of the numbered transcript.
    2. If the check fails, downgrade ``confidence`` to ``"inferred"``.
    3. Hard-filter: drop entities whose ``evidence_quote`` is empty.
    4. Hard-filter: drop entities named "Grant Vermillion" (the user).

    Args:
        entities: Structured entities from Pass 2.
        numbered_text: The line-numbered transcript that was sent to the model.

    Returns:
        Filtered list of entities with ``confidence`` adjusted.
    """
    source_lines = numbered_text.split("\n")
    validated: list[Entity] = []

    for entity in entities:
        # Hard-filter: never extract the user
        if entity.name.lower().strip() in ("grant vermillion", "grant"):
            log.debug("validate_entity_dropped_user", name=entity.name)
            continue

        # Hard-filter: require evidence
        if not entity.evidence_quote or not entity.evidence_quote.strip():
            log.debug("validate_entity_dropped_no_evidence", name=entity.name)
            continue

        # Soft-check: verify source_line contains the entity's name
        if entity.source_line is not None and entity.source_line > 0:
            idx = entity.source_line - 1  # 0-based
            if idx < len(source_lines):
                line_text = source_lines[idx].lower()
                # Check for full name or surname (last token)
                name_lower = entity.name.lower()
                surname = name_lower.split()[-1] if name_lower.split() else name_lower
                if name_lower not in line_text and surname not in line_text:
                    entity = entity.model_copy(update={"confidence": "inferred"})
                    log.debug(
                        "validate_entity_line_mismatch",
                        name=entity.name,
                        source_line=entity.source_line,
                        line_content=source_lines[idx][:80],
                    )
            else:
                entity = entity.model_copy(update={"confidence": "inferred"})

        validated.append(entity)

    return validated


# ---------------------------------------------------------------------------
# Pass 1 — free-form extraction instructions (one per category)
# ---------------------------------------------------------------------------

_ENTITY_EXTRACT_INSTRUCTION = (
    "You are a high-precision Executive Assistant to Grant Vermillion (phData).\n"
    "Your task: extract ONLY people who are explicitly named in the SOURCE_TRANSCRIPT.\n\n"
    "IDENTITY RULES:\n"
    "- Grant Vermillion = the USER. NEVER extract Grant as an entity.\n"
    "- phData employees = 'colleague'\n"
    "- Client organization employees = 'client' or 'stakeholder'\n"
    "- All others = 'vendor' or 'unknown'\n\n"
    "EXTRACTION PROTOCOL:\n"
    "1. SCAN the transcript line by line for proper nouns that are person names.\n"
    "2. EXISTENCE CHECK: For each candidate name, confirm it appears in the SOURCE_TRANSCRIPT section.\n"
    "   Names that appear ONLY in ATTENDEE_REFERENCE_DATA but NOT in the transcript must be SKIPPED.\n"
    "3. For each verified person, output:\n"
    "   - Evidence Quote: the 5-8 word verbatim snippet where they appear\n"
    "   - Line Number: the line number from the transcript\n"
    "   - Full Name: their full name (use ATTENDEE_REFERENCE_DATA to resolve first-name-only mentions)\n"
    "   - Title: job title if mentioned, otherwise 'unknown'\n"
    "   - Relationship: client/colleague/stakeholder/vendor/unknown\n"
    "   - Personal Notes: communication style, preferences, rapport details\n\n"
    "HARD RULES:\n"
    "- NO PLACEHOLDERS: if you cannot find evidence, do not include the person.\n"
    "- NO GRANT VERMILLION: never extract the user.\n"
    "- EVIDENCE FIRST: always cite before naming.\n"
    "Plain bullet points. No JSON."
)

_RISK_EXTRACT_INSTRUCTION = (
    "List every risk, concern, blocker, or uncertainty mentioned in this meeting transcript.\n"
    "For each: describe it clearly, state severity (high/medium/low), "
    "and note which project it relates to.\n"
    "Plain bullet points. No JSON.\n"
    "- Do NOT emit metrics as risks unless paired with a named threat.\n"
    "- Every risk MUST include a short verbatim quote (<=160 chars) as `evidence`."
)

_OPP_EXTRACT_INSTRUCTION = (
    "List every business opportunity, unmet need, or expansion possibility mentioned "
    "in this meeting transcript.\n"
    "For each: describe it and categorize as expansion/workflow/lateral.\n"
    "Plain bullet points. No JSON.\n"
    "- Do NOT emit staffing/ops actions as opportunities (those are tasks).\n"
    "- Every opportunity MUST include a short verbatim quote (<=160 chars) as `evidence`."
)

_TASK_EXTRACT_INSTRUCTION = (
    "Extract ACTION ITEMS only. An action item requires BOTH:\n"
    "  (a) an actor OR an imperative verb (\"schedule\", \"send\", \"connect\",\n"
    "      \"identify\", \"close\", \"write\", \"draft\", \"review\", \"decide\"),\n"
    "  (b) a commitment or time marker (\"by\", \"next week\", \"Monday\", \"before\",\n"
    "      \"this quarter\", \"ETA\", \"on track for\") OR an explicit owner.\n\n"
    "REJECT:\n"
    "  - observations, metrics, status reports\n"
    "  - historical facts\n"
    "  - aspirational framing without a committed actor\n"
    "  - restatements of what someone ELSE said without a next step\n\n"
    "For each action item, infer `commitment`:\n"
    "  hard    - explicit promise or scheduled event\n"
    "  soft    - \"should\", \"plan to\", \"want to\"\n"
    "  implied - logically required but not stated\n\n"
    "Keep `due_hint` as the verbatim phrase from the transcript. DO NOT\n"
    "convert to dates. Every item MUST include a short verbatim quote\n"
    "(<=160 chars) as `evidence`. If no such quote exists, drop the item.\n\n"
    "Output a plain numbered or bulleted list; Pass-2 will structure it."
)


# ---------------------------------------------------------------------------
# Pass 2 — system prompts (direct JSON array output, no tool calling)
# ---------------------------------------------------------------------------

_ENTITY_RESOLVE_INSTRUCTION = (
    "You are given a transcript and a list of candidate names. For each name, "
    "return role, org, relationship, aliases, and evidence based ONLY on how "
    "they appear in the transcript. Do NOT add names not in the candidate "
    "list. Do NOT invent details — leave fields null if unstated.\n\n"
    "CRITICAL: Entities are PEOPLE only — not companies, products, services, "
    "teams, projects, or concepts. If a candidate is not a human person, "
    "set drop=true. Examples of non-people to drop: Cortex Analyst, Drive Nexus, "
    "Telemetry, Marketing, Phoenix (when referring to a project/city).\n\n"
    "Every kept entity MUST include a short verbatim quote (<=160 chars) as evidence."
)

_ENTITY_RESOLVE_STRUCTURE_SYSTEM = (
    "You are a JSON formatter. You will receive a plain-text list of resolved "
    "entity profiles from a meeting transcript.\n\n"
    "Convert it into a JSON array. Return ONLY the JSON array — no explanation, "
    "no markdown fences, no extra text.\n"
    "Only include entities from the input list — do NOT add extras.\n"
    "If the input is empty or no entities are listed, return [].\n\n"
    "Each object: {\"name\": str, \"role\": str|null, \"org\": str|null, "
    "\"relationship\": \"colleague\"|\"client\"|\"vendor\"|\"partner\"|\"prospect\"|\"unknown\", "
    "\"aliases\": [str], \"evidence\": str, \"drop\": bool}\n"
    "drop: true if the candidate is actually a company, product, or place — not a person.\n"
    "evidence: short verbatim quote (<=160 chars) from the transcript.\n\n"
    "Example output:\n"
    "[\n"
    "  {\"name\": \"Sarah Chen\", \"role\": \"Product Lead\", \"org\": \"Acme\", "
    "\"relationship\": \"client\", \"aliases\": [\"Sarah\"], "
    "\"evidence\": \"Sarah Chen presented the product roadmap\", \"drop\": false},\n"
    "  {\"name\": \"Phoenix\", \"role\": null, \"org\": null, "
    "\"relationship\": \"unknown\", \"aliases\": [], "
    "\"evidence\": \"\", \"drop\": true}\n"
    "]"
)

_ENTITY_STRUCTURE_SYSTEM = (
    "You are a JSON formatter. You will receive a plain-text list of people "
    "extracted from a meeting transcript.\n\n"
    "Convert it into a JSON array. Return ONLY the JSON array — no explanation, "
    "no markdown fences, no extra text.\n"
    "Only include people from the input list — do NOT add extras.\n"
    "Do NOT include Grant Vermillion — he is the user, not an entity.\n"
    "If the input is empty or no people are listed, return [].\n\n"
    "Each object: {\"evidence_quote\": str, \"source_line\": int|null, "
    "\"name\": str, \"title\": str|null, "
    "\"relationship\": \"client\"|\"colleague\"|\"stakeholder\"|\"vendor\"|\"unknown\", "
    "\"rapport_notes\": [str], "
    "\"confidence\": \"verified\"|\"inferred\"}\n\n"
    "Rules:\n"
    "- evidence_quote: 5-8 word verbatim snippet from transcript where the person is mentioned. "
    "REQUIRED — drop entries with no evidence.\n"
    "- source_line: line number from the transcript (if line numbers were provided). null if unknown.\n"
    "- confidence: 'verified' if name and relationship are explicitly stated, "
    "'inferred' if you had to guess title or relationship.\n\n"
    "Example output:\n"
    "[\n"
    "  {\"evidence_quote\": \"Sarah Chen presented the product roadmap\", \"source_line\": 12, "
    "\"name\": \"Sarah Chen\", \"title\": \"Product Lead\", \"relationship\": \"client\", "
    "\"rapport_notes\": [\"new to the role\"], \"confidence\": \"verified\"},\n"
    "  {\"evidence_quote\": \"Lin Park asked about scalability\", \"source_line\": 45, "
    "\"name\": \"Lin Park\", \"title\": \"CTO\", \"relationship\": \"stakeholder\", "
    "\"rapport_notes\": [\"metrics-driven\"], \"confidence\": \"verified\"}\n"
    "]"
)

_RISK_STRUCTURE_SYSTEM = (
    "You are a JSON formatter. You will receive a plain-text list of risks "
    "extracted from a meeting transcript.\n\n"
    "Convert it into a JSON array. Return ONLY the JSON array — no explanation, "
    "no markdown fences, no extra text.\n"
    "Only include risks from the input list — do NOT add extras.\n"
    "If the input is empty or no risks are listed, return [].\n\n"
    "Each object: {\"summary\": str, "
    "\"severity\": \"low\"|\"medium\"|\"high\", "
    "\"project\": str|null, \"evidence\": str}\n"
    "evidence: short verbatim quote (<=160 chars) from the transcript.\n\n"
    "Example output:\n"
    "[\n"
    "  {\"summary\": \"Supplier delivery unconfirmed; causes 2-week delay\", "
    "\"severity\": \"high\", \"project\": \"foundation-build\", "
    "\"evidence\": \"supplier hasn't confirmed the delivery date yet\"}\n"
    "]"
)

_OPP_STRUCTURE_SYSTEM = (
    "You are a JSON formatter. You will receive a plain-text list of business opportunities "
    "extracted from a meeting transcript.\n\n"
    "Convert it into a JSON array. Return ONLY the JSON array — no explanation, "
    "no markdown fences, no extra text.\n"
    "Only include opportunities from the input list — do NOT add extras.\n"
    "If the input is empty or no opportunities are listed, return [].\n\n"
    "Each object: {\"name\": str, "
    "\"type\": \"new_logo\"|\"expansion\"|\"workflow\"|\"lateral\", "
    "\"account\": str|null, \"value_hint\": str|null, \"stage_hint\": str|null, "
    "\"evidence\": str}\n"
    "evidence: short verbatim quote (<=160 chars) from the transcript.\n\n"
    "Example output:\n"
    "[\n"
    "  {\"name\": \"Ops team spends 2 days/month on manual reports\", \"type\": \"workflow\", "
    "\"account\": null, \"value_hint\": null, \"stage_hint\": null, "
    "\"evidence\": \"ops team manually compiles reports twice a month\"},\n"
    "  {\"name\": \"European division would adopt if NA succeeds\", \"type\": \"expansion\", "
    "\"account\": \"Acme EU\", \"value_hint\": null, \"stage_hint\": \"early\", "
    "\"evidence\": \"if North America goes well the EU team wants to adopt\"}\n"
    "]"
)

_TASK_STRUCTURE_SYSTEM = (
    "You are a JSON formatter. You will receive a plain-text list of action items "
    "extracted from a meeting transcript.\n\n"
    "Convert it into a JSON array. Return ONLY the JSON array — no explanation, "
    "no markdown fences, no extra text.\n"
    "Only include tasks from the input list — do NOT add extras.\n"
    "If the input is empty or no tasks are listed, return [].\n\n"
    "Each object: {\"action\": str, \"owner\": str|null, \"due_hint\": str|null, "
    "\"commitment\": \"hard\"|\"soft\"|\"implied\", \"blocks\": str|null, \"evidence\": str}\n"
    "owner: first name or full name of responsible person (null if unclear).\n"
    "due_hint: verbatim phrase from transcript (e.g. \"next week\", \"by Monday\"). "
    "Do NOT convert to ISO dates.\n"
    "commitment: hard = explicit promise/scheduled, soft = should/plan to, "
    "implied = logically required but unstated.\n"
    "blocks: what this task blocks (null if nothing).\n"
    "evidence: short verbatim quote (<=160 chars) from the transcript.\n\n"
    "Example output:\n"
    "[\n"
    "  {\"action\": \"Send API credentials\", \"owner\": \"Priya\", "
    "\"due_hint\": \"by end of week\", \"commitment\": \"hard\", "
    "\"blocks\": \"sandbox setup\", \"evidence\": \"Priya said she would send the API creds by end of week\"},\n"
    "  {\"action\": \"Set up sandbox\", \"owner\": null, \"due_hint\": null, "
    "\"commitment\": \"implied\", \"blocks\": null, \"evidence\": \"we need the sandbox ready before testing\"}\n"
    "]"
)


# ---------------------------------------------------------------------------
# Combined system prompts — merge extraction + structuring into one call
# ---------------------------------------------------------------------------

_RISK_COMBINED_SYSTEM = (
    _RISK_EXTRACT_INSTRUCTION
    + "\n\nReturn ONLY a JSON array matching this schema:\n"
    + _RISK_STRUCTURE_SYSTEM.split("Each object:")[1].split("Example output:")[0].strip()
    + "\n\n"
    + _RISK_STRUCTURE_SYSTEM.split("Example output:")[1]
)

_OPP_COMBINED_SYSTEM = (
    _OPP_EXTRACT_INSTRUCTION
    + "\n\nReturn ONLY a JSON array matching this schema:\n"
    + _OPP_STRUCTURE_SYSTEM.split("Each object:")[1].split("Example output:")[0].strip()
    + "\n\n"
    + _OPP_STRUCTURE_SYSTEM.split("Example output:")[1]
)

_TASK_COMBINED_SYSTEM = (
    _TASK_EXTRACT_INSTRUCTION
    + "\n\nReturn ONLY a JSON array matching this schema:\n"
    + _TASK_STRUCTURE_SYSTEM.split("Each object:")[1].split("Example output:")[0].strip()
    + "\n\n"
    + _TASK_STRUCTURE_SYSTEM.split("Example output:")[1]
)

_ENTITY_RESOLVE_COMBINED_SYSTEM = (
    _ENTITY_RESOLVE_INSTRUCTION
    + "\n\nReturn ONLY a JSON array matching this schema:\n"
    + _ENTITY_RESOLVE_STRUCTURE_SYSTEM.split("Each object:")[1].split("Example output:")[0].strip()
    + "\n\n"
    + _ENTITY_RESOLVE_STRUCTURE_SYSTEM.split("Example output:")[1]
)


_CITATION_STRUCTURE_SYSTEM = (
    "You are a citation extractor. You will receive:\n"
    "1. A CATEGORY label (entity/risk/opportunity/task)\n"
    "2. A SIGNALS list — the items extracted from this meeting for that category\n"
    "3. A TRANSCRIPT EXCERPT — the source text (with line numbers)\n\n"
    "For each signal, find a short verbatim or near-verbatim quote from the transcript "
    "that supports it. Return ONLY a JSON array — no explanation, no markdown fences.\n\n"
    "Rules:\n"
    "- Only include signals you can find clear evidence for — skip the rest.\n"
    "- Keep evidence quotes under 140 characters; truncate with '...' if needed.\n"
    "- category field must match the CATEGORY label exactly.\n"
    "- source_line: the line number where the evidence appears (from the numbered transcript). null if unknown.\n"
    "- Return [] if no clear evidence exists.\n"
    "- Limit to 5 citations maximum.\n\n"
    "Each object: {\"category\": str, \"signal\": str, \"evidence\": str, \"source_line\": int|null}\n\n"
    "Example output:\n"
    "[\n"
    "  {\"category\": \"risk\", \"signal\": \"API credentials not shared\", "
    "\"evidence\": \"Tom mentioned the credentials haven't come through yet\", \"source_line\": 42}\n"
    "]"
)


# ---------------------------------------------------------------------------
# Pass 2 helper — direct Ollama JSON structuring (no tool calling)
# ---------------------------------------------------------------------------

async def _structure_pass2(
    raw: str,
    system: str,
    item_model: type[_M],
    model: str,
    base_url: str,
    span: trace.Span | None = None,
) -> tuple[list[_M], int, int]:
    """Call Ollama natively for JSON structuring and validate with Pydantic.

    Avoids PydanticAI tool-calling which fails on many local Ollama models
    (null content in assistant messages causes 400 on retry).

    Args:
        raw: Free-form extracted text from pass 1.
        system: Category-specific structuring system prompt.
        item_model: Pydantic model class to validate each array item against.
        model: Ollama model name.
        base_url: Ollama base URL (may include /v1 — stripped internally).
        span: Optional span to attach LLM input/output message attributes to.

    Returns:
        Tuple of (validated items, prompt_tokens, completion_tokens).
        Returns ([], 0, 0) on any parse failure.
    """
    if span is not None:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.LLM.value)
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}", "system")
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}", system)
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_ROLE}", "user")
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_CONTENT}", raw)

    ollama_base = base_url.rstrip("/").removesuffix("/v1")
    log.info("pass2_structuring_started", model=model, input_len=len(raw))
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ollama_base}/api/chat",
            json={
                "model": model,
                "think": False,
                "stream": False,
                "options": {"num_predict": 2048},
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": raw},
                ],
            },
            timeout=600.0,
        )
        resp.raise_for_status()

    payload = resp.json()
    content: str = payload["message"].get("content") or ""
    content = content.strip()

    prompt_tokens: int = payload.get("prompt_eval_count", 0)
    completion_tokens: int = payload.get("eval_count", 0)
    log.info("pass2_structuring_complete", model=model, prompt_tok=prompt_tokens, completion_tok=completion_tokens)

    # Set LLM output message on span for Phoenix visibility
    if span is not None:
        span.set_attribute(f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}", "assistant")
        span.set_attribute(f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}", content[:3000])

    # Extract outermost JSON array from the response (model may add prose around it)
    start = content.find("[")
    end = content.rfind("]") + 1
    if start == -1 or end == 0:
        log.warning("structure_pass2_no_json", model=model, content_preview=content[:200])
        return [], prompt_tokens, completion_tokens

    data: list[dict] = json.loads(content[start:end])  # type: ignore[assignment]
    return [item_model.model_validate(item) for item in data], prompt_tokens, completion_tokens


# ---------------------------------------------------------------------------
# TraceRecord — collects data from both passes for a single category run
# ---------------------------------------------------------------------------

@dataclass
class ExtractionTrace:
    """Data captured from an extraction run for one category.

    For risks/opportunities/tasks this is a single combined LLM call
    (p2 fields are zeroed). For entities this is the two-stage regex+LLM
    flow. Pass 3 citations are optional, gated by ``settings.enrich_citations``.
    """

    category: str
    slug: str
    model: str
    p1_system: str
    p1_response: str
    p1_thinking: str
    p2_input: str
    p2_result: list[dict] = field(default_factory=list)  # type: ignore[type-arg]
    p2_error: str | None = None
    p3_error: str | None = None
    p1_prompt_tokens: int = 0
    p1_completion_tokens: int = 0
    p1_thinking_tokens: int = 0
    p2_prompt_tokens: int = 0
    p2_completion_tokens: int = 0
    p3_prompt_tokens: int = 0
    p3_completion_tokens: int = 0
    dropped: list[Dropped] = field(default_factory=list)
    combined_duration_ms: float = 0.0


# ---------------------------------------------------------------------------
# Pass 3 helper — focused per-category citation run
# ---------------------------------------------------------------------------

async def _cite_for_category(
    transcript: str,
    category: str,
    items_text: str,
) -> tuple[list[SignalCitation], int, int]:
    """Run the citation agent for a single extraction category.

    Args:
        transcript: Original meeting transcript (source of truth for quotes).
        category: One of entity|risk|opportunity|task.
        items_text: Bullet-point summary of extracted items for this category.

    Returns:
        Tuple of (citations, prompt_tokens, completion_tokens).  Returns ([], 0, 0) on failure.
    """
    excerpt = transcript[:5000]  # focused window — citations rarely need full text
    numbered_excerpt = _number_lines(excerpt)
    user_msg = f"CATEGORY: {category}\nSIGNALS:\n{items_text}\n\nTRANSCRIPT EXCERPT:\n{numbered_excerpt}"

    with tracer.start_as_current_span("pass3.citations") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
        span.set_attribute(SpanAttributes.INPUT_VALUE, items_text[:500])
        span.set_attribute("pass3.category", category)
        try:
            log.info("pass3_citations_started", category=category)
            citations, p_tok, c_tok = await _structure_pass2(
                user_msg, _CITATION_STRUCTURE_SYSTEM, SignalCitation,
                settings.ollama_reasoning_model, settings.ollama_base_url,
                span=span,
            )
            log.info("pass3_citations_complete", category=category, count=len(citations), prompt_tok=p_tok, completion_tok=c_tok)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, p_tok)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, c_tok)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, p_tok + c_tok)
            span.set_attribute(SpanAttributes.OUTPUT_VALUE, json.dumps([c.model_dump() for c in citations]))
            span.set_attribute("pass3.citation_count", len(citations))
            span.set_status(Status(StatusCode.OK))
            return citations, p_tok, c_tok
        except Exception as exc:
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            log.warning("citation_failed", category=category, error=str(exc))
            return [], 0, 0


# ---------------------------------------------------------------------------
# Combined single-pass helper — extract + structure in one LLM call
# ---------------------------------------------------------------------------

async def _extract_structured(
    *,
    category: str,
    system_prompt: str,
    user_content: str,
    model: str,
    timeout_s: int = 120,
    think: bool = True,
) -> tuple[list[dict], str, int, int, float]:
    """Single Ollama call that extracts AND returns structured JSON.

    Uses ``format: "json"`` to force JSON mode. The system prompt must
    contain the schema example so the model knows the target shape.

    Returns:
        (parsed_list, thinking_text, prompt_tokens, completion_tokens, duration_ms).
        On any failure returns ([], "", 0, 0, 0.0).
    """
    ollama_base = settings.ollama_base_url.rstrip("/").removesuffix("/v1")

    with tracer.start_as_current_span(f"extract.{category}.combined") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.LLM.value)
        span.set_attribute(SpanAttributes.LLM_MODEL_NAME, model)
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}", "system")
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}", system_prompt[:5000])
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_ROLE}", "user")
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_CONTENT}", user_content[:4000])
        span.set_attribute("extract.category", category)

        t0 = time.monotonic()
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{ollama_base}/api/chat",
                    json={
                        "model": model,
                        "format": "json",
                        "think": think,
                        "stream": False,
                        "options": {"num_predict": 2048},
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_content},
                        ],
                    },
                    timeout=float(timeout_s),
                )
                resp.raise_for_status()

            duration_ms = (time.monotonic() - t0) * 1000
            payload = resp.json()
            content: str = payload["message"].get("content") or ""
            thinking: str = (payload["message"].get("thinking") or "").strip()
            prompt_tokens: int = payload.get("prompt_eval_count", 0)
            completion_tokens: int = payload.get("eval_count", 0)

            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, prompt_tokens)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, completion_tokens)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, prompt_tokens + completion_tokens)
            span.set_attribute("extract.duration_ms", duration_ms)
            # Set LLM output message for Phoenix visibility
            span.set_attribute(f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}", "assistant")
            span.set_attribute(f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}", content[:3000])
            if thinking:
                span.set_attribute("llm.thinking", thinking[:2000])

            # Parse JSON array from response
            content = content.strip()
            # Try to find a JSON array or object in the response
            if content.startswith("{"):
                # Might be a wrapper object with an array inside
                data = json.loads(content)
                # Look for the first list value
                for v in data.values():
                    if isinstance(v, list):
                        parsed = v
                        break
                else:
                    parsed = [data] if isinstance(data, dict) else []
            elif content.startswith("["):
                parsed = json.loads(content)
            else:
                start = content.find("[")
                end = content.rfind("]") + 1
                if start != -1 and end > 0:
                    parsed = json.loads(content[start:end])
                else:
                    log.warning("extract_structured_no_json", category=category, preview=content[:200])
                    span.set_status(Status(StatusCode.ERROR, "no JSON array found"))
                    return [], "", prompt_tokens, completion_tokens, duration_ms

            log.info("extract_structured_complete", category=category, items=len(parsed),
                     prompt_tok=prompt_tokens, completion_tok=completion_tokens, duration_ms=round(duration_ms))
            span.set_attribute(SpanAttributes.OUTPUT_VALUE, json.dumps(parsed)[:3000])
            span.set_status(Status(StatusCode.OK))
            return parsed, thinking, prompt_tokens, completion_tokens, duration_ms

        except Exception as exc:
            duration_ms = (time.monotonic() - t0) * 1000
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            log.warning("extract_structured_failed", category=category, error=str(exc))
            return [], "", 0, 0, duration_ms


# ---------------------------------------------------------------------------
# Pass 1 helper (kept for summarize_meeting which still uses free-form output)
# ---------------------------------------------------------------------------

async def _raw_extract(
    source_text: str,
    instruction: str,
    model: str,
    base_url: str,
    span: trace.Span | None = None,
) -> tuple[str, str, str, int, int]:
    """Call Ollama directly for free-form extraction (no schema enforcement).

    Sets OpenInference LLM attributes directly on *span* (the caller's
    ``extract.*`` span) so prompts, output, and thinking are visible in
    Phoenix without relying on child-span export.

    Args:
        source_text: Meeting text to extract from (transcript or Granola summary).
        instruction: Category-specific extraction instruction.
        model: Ollama model name (e.g. "mistral:latest").
        base_url: Ollama base URL including /v1 (e.g. "http://...11434/v1").
        span: Parent span to attach LLM attributes to.  When *None* attributes
            are silently skipped (useful in tests).

    Returns:
        Tuple of (extracted_text, system_prompt_used, thinking, prompt_tokens, completion_tokens, thinking_tokens).
    """
    # Truncate very long transcripts to keep inference time under ~60s per call.
    # Keep the first 8000 chars (opening context, introductions) and last 3000
    # (closing action items, next steps) — the most signal-dense sections.
    _MAX_CHARS = 11_000
    if len(source_text) > _MAX_CHARS:
        source_text = (
            source_text[:8_000]
            + "\n\n[... middle section truncated for length ...]\n\n"
            + source_text[-3_000:]
        )

    system = (
        "You are a careful extraction assistant. Read the meeting transcript below.\n"
        f"{instruction}\n\n"
        "Think step-by-step about what is present in the transcript before answering. "
        "Be specific and conservative — only include items clearly stated in the text. "
        "Do NOT format as JSON — plain bullet points or sentences are fine."
    )
    user_msg = f"TRANSCRIPT:\n{source_text}"

    # Set input attributes before the LLM call so they're visible even if it times out
    if span is not None:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.LLM.value)
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}", "system")
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}", system)
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_ROLE}", "user")
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_CONTENT}", user_msg)

    log.info("pass1_extraction_started", model=model, input_len=len(source_text))
    async with httpx.AsyncClient() as client:
        ollama_base = base_url.rstrip("/v1").rstrip("/")
        resp = await client.post(
            f"{ollama_base}/api/chat",
            json={
                "model": model,
                "think": False,
                "stream": False,
                "options": {"num_predict": 1024},
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_msg},
                ],
            },
            timeout=300.0,
        )
        resp.raise_for_status()

    payload = resp.json()
    msg = payload["message"]

    # Token counts from Ollama native response
    prompt_tokens: int = payload.get("prompt_eval_count", 0)
    completion_tokens: int = payload.get("eval_count", 0)

    # Chain-of-thought reasoning (populated when think=True)
    thinking: str = (msg.get("thinking") or "").strip()
    # Ollama eval_count includes thinking tokens — estimate the split.
    thinking_tokens: int = count_tokens(thinking, model) if thinking else 0
    visible_tokens: int = max(completion_tokens - thinking_tokens, 0)
    log.info(
        "pass1_extraction_complete",
        model=model,
        prompt_tok=prompt_tokens,
        completion_tok=completion_tokens,
        thinking_tok=thinking_tokens,
        visible_tok=visible_tokens,
        has_thinking=bool(thinking),
    )

    raw: str | None = msg.get("content") or msg.get("thinking")
    content: str = raw.strip() if raw else "(no content returned)"

    # Set output attributes on the parent span
    if span is not None:
        span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, prompt_tokens)
        span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, completion_tokens)
        span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, prompt_tokens + completion_tokens)
        span.set_attribute(f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}", "assistant")
        span.set_attribute(f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}", content)
        span.set_attribute(SpanAttributes.OUTPUT_VALUE, content)
        if thinking:
            span.set_attribute("llm.thinking", thinking)
            span.set_attribute("llm.thinking_tokens", thinking_tokens)
            span.set_attribute("llm.visible_tokens", visible_tokens)

    return content, system, thinking, prompt_tokens, completion_tokens, thinking_tokens


# ---------------------------------------------------------------------------
# Public two-pass runners (one per category)
# ---------------------------------------------------------------------------

async def extract_entities(
    transcript: str,
    slug: str,
    triage_model: str,
    base_url: str,
    granola_summary: str | None = None,
    participants: list[ParticipantInfo] | None = None,
    prior_context: dict[str, PersonContext] | None = None,
) -> tuple[list[Entity], list[SignalCitation], ExtractionTrace]:
    """Two-stage entity extraction: candidate regex → LLM resolution → citations.

    Stage 0: Regex extracts capitalized-name candidates, filtered by stoplist.
    Stage 1 (Pass 1): LLM resolves candidates against transcript context.
    Stage 2 (Pass 2): JSON structuring with drop flag.
    Stage 3 (Pass 3): Citation extraction.
    """
    with tracer.start_as_current_span("extract.entities") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
        span.set_attribute(SpanAttributes.INPUT_VALUE, transcript[:2000])
        span.set_attribute("meeting.slug", slug)
        span.set_attribute(SpanAttributes.LLM_MODEL_NAME, triage_model)
        span.set_attribute("meeting.participant_count", len(participants) if participants else 0)

        source_text = granola_summary if granola_summary else transcript

        # Stage 0 — candidate extraction: participants + Granola header + regex (no LLM)
        with tracer.start_as_current_span("pass0.candidate_extract") as p0_span:
            candidates = extract_candidates(source_text, COMPANY_STOPLIST, participants=participants)
            p0_span.set_attribute("pass0.candidate_count", len(candidates))
            p0_span.set_attribute("pass0.participant_seeded", sum(1 for c in candidates if c.source == "participant"))
            p0_span.set_attribute(SpanAttributes.OUTPUT_VALUE, ", ".join(c.name for c in candidates[:20]))
            p0_span.set_status(Status(StatusCode.OK))

        # Build a lookup from candidate name → provenance source
        _candidate_source: dict[str, str] = {c.name.lower(): c.source for c in candidates}
        candidate_names = [c.name for c in candidates]

        span.set_attribute("pass0.candidate_count", len(candidates))
        log.info("entities | candidates extracted", slug=slug, count=len(candidates),
                 names=candidate_names[:10],
                 participant_seeded=sum(1 for c in candidates if c.source == "participant"))

        # Empty candidates → skip LLM entirely
        if not candidates:
            log.info("entities | no candidates, skipping LLM", slug=slug)
            empty_trace = ExtractionTrace(
                category="entities", slug=slug, model=triage_model,
                p1_system="", p1_response="(no candidates)", p1_thinking="", p2_input="",
            )
            span.set_attribute(SpanAttributes.OUTPUT_VALUE, "[]")
            span.set_status(Status(StatusCode.OK))
            return [], [], empty_trace

        # Build ATTENDEE_REFERENCE_DATA from prior context + participants
        ref_lines: list[str] = []
        if prior_context:
            for pc in prior_context.values():
                parts = [pc.name]
                if pc.org:
                    parts.append(pc.org)
                if pc.relationship:
                    parts.append(pc.relationship)
                detail = f"{pc.encounter_count} prior meetings"
                if pc.last_seen:
                    detail += f", last seen {pc.last_seen[:10]}"
                ref_lines.append(f"- {' | '.join(parts)} — {detail}")
        # Add participant info not already covered by prior context
        if participants:
            known_lower = set(prior_context.keys()) if prior_context else set()
            for p in participants:
                if p.name.lower() not in known_lower:
                    parts = [p.name]
                    if p.company:
                        parts.append(p.company)
                    ref_lines.append(f"- {' | '.join(parts)} — calendar attendee")

        attendee_block = ""
        if ref_lines:
            attendee_block = "\n\nATTENDEE_REFERENCE_DATA:\n" + "\n".join(ref_lines) + "\n"

        # Stage 1 — LLM candidate resolution (Pass 1)
        candidate_user_msg = (
            f"TRANSCRIPT:\n<<<\n{source_text}\n>>>"
            + attendee_block
            + f"\n\nCANDIDATES:\n"
            + "\n".join(candidate_names)
        )

        log.info("entities | resolving candidates", slug=slug, chars=len(source_text), model=triage_model)
        with tracer.start_as_current_span("pass1.raw_extract") as p1_span:
            p1_span.set_attribute("pass1.category", "entities")
            p1_span.set_attribute(SpanAttributes.INPUT_VALUE, candidate_user_msg[:2000])
            raw, system, thinking, p1_pt, p1_ct, p1_tt = await _raw_extract(
                candidate_user_msg, _ENTITY_RESOLVE_INSTRUCTION, triage_model, base_url, span=p1_span,
            )
            p1_span.set_attribute("pass1.response_chars", len(raw))
            p1_span.set_attribute("pass1.extraction", raw[:1000])
            p1_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, p1_pt)
            p1_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, p1_ct)
            p1_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, p1_pt + p1_ct)
            p1_span.set_status(Status(StatusCode.OK))
        log.info("entities | resolution done", slug=slug, raw_chars=len(raw), tokens=p1_pt + p1_ct)

        trace = ExtractionTrace(
            category="entities",
            slug=slug,
            model=triage_model,
            p1_system=system,
            p1_response=raw,
            p1_thinking=thinking,
            p2_input=raw,
            p1_prompt_tokens=p1_pt,
            p1_completion_tokens=p1_ct,
            p1_thinking_tokens=p1_tt,
        )
        try:
            # Stage 2 — JSON structuring with drop flag (Pass 2)
            log.info("entities | structuring schema", slug=slug)
            with tracer.start_as_current_span("pass2.schema_structure") as p2_span:
                p2_span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
                p2_span.set_attribute(SpanAttributes.INPUT_VALUE, raw[:2000])
                p2_span.set_attribute("pass2.category", "entities")
                resolved, p2_pt, p2_ct = await _structure_pass2(
                    raw, _ENTITY_RESOLVE_STRUCTURE_SYSTEM, _ResolvedEntity, triage_model, base_url, span=p2_span,
                )
                p2_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, p2_pt)
                p2_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, p2_ct)
                p2_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, p2_pt + p2_ct)
                p2_span.set_attribute(SpanAttributes.OUTPUT_VALUE, json.dumps([r.model_dump() for r in resolved]))
                p2_span.set_status(Status(StatusCode.OK))

            # Split survivors vs dropped
            items: list[Entity] = []
            dropped_entities: list[Dropped] = []
            for r in resolved:
                if r.drop:
                    dropped_entities.append(Dropped(text=r.name, reason="stoplist_entity"))
                else:
                    # Propagate provenance from pass0 candidate source
                    entity_source = _candidate_source.get(r.name.lower())
                    items.append(Entity(
                        name=r.name, role=r.role, org=r.org,
                        relationship=r.relationship if r.relationship in ("colleague", "client", "vendor", "partner", "prospect", "unknown") else "unknown",
                        aliases=r.aliases, evidence=r.evidence,
                        source=entity_source,
                    ))

            trace.p2_result = [e.model_dump() for e in items]
            trace.p2_prompt_tokens = p2_pt
            trace.p2_completion_tokens = p2_ct
            trace.dropped = dropped_entities
            span.set_attribute("pass2.items_extracted", len(items))
            span.set_attribute("pass2.dropped_count", len(dropped_entities))
            log.info("entities | found entities", slug=slug, count=len(items),
                     names=[e.name for e in items], dropped=len(dropped_entities))

            # Pass 2.5 — deterministic validation: filter Grant, empty evidence, line mismatches
            numbered_source = _number_lines(source_text)
            pre_filter_count = len(items)
            items = _validate_entity_citations(items, numbered_source)
            dropped_count = pre_filter_count - len(items)
            if dropped_count:
                log.info("entities | validation filtered", slug=slug, dropped=dropped_count, remaining=len(items))
            span.set_attribute("pass2_5.pre_filter_count", pre_filter_count)
            span.set_attribute("pass2_5.post_filter_count", len(items))

            # Pass 3 — focused citation extraction for entities (gated)
            citations: list[SignalCitation] = []
            if settings.enrich_citations:
                log.info("entities | extracting citations", slug=slug, items=len(items))
                items_text = "\n".join(f"  - {e.name} ({e.relationship})" for e in items)
                citations, p3_pt, p3_ct = await _cite_for_category(transcript, "entity", items_text)
                trace.p3_prompt_tokens = p3_pt
                trace.p3_completion_tokens = p3_ct
                span.set_attribute("pass3.citations_count", len(citations))
                log.info("entities | citations done", slug=slug, count=len(citations))

            total_pt = p1_pt + p2_pt + trace.p3_prompt_tokens
            total_ct = p1_ct + p2_ct + trace.p3_completion_tokens
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, total_pt)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, total_ct)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, total_pt + total_ct)

            span.set_attribute(SpanAttributes.OUTPUT_VALUE, json.dumps([e.model_dump() for e in items]))
            span.set_status(Status(StatusCode.OK))
            return items, citations, trace
        except Exception as exc:
            trace.p2_error = str(exc)
            span.set_attribute("pass2.error", str(exc))
            span.set_attribute(SpanAttributes.OUTPUT_VALUE, f"ERROR: {exc}")
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            raise


async def extract_risks(
    transcript: str,
    slug: str,
    triage_model: str,
    base_url: str,
    granola_summary: str | None = None,
) -> tuple[list[Risk], list[SignalCitation], ExtractionTrace]:
    """Single-pass risk extraction with optional citation enrichment."""
    with tracer.start_as_current_span("extract.risks") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
        span.set_attribute(SpanAttributes.INPUT_VALUE, transcript[:2000])
        span.set_attribute("meeting.slug", slug)
        span.set_attribute(SpanAttributes.LLM_MODEL_NAME, triage_model)

        source_text = granola_summary if granola_summary else transcript
        log.info("risks | combined extraction", slug=slug, chars=len(source_text), model=triage_model)

        parsed, thinking, p1_pt, p1_ct, duration_ms = await _extract_structured(
            category="risks",
            system_prompt=_RISK_COMBINED_SYSTEM,
            user_content=source_text,
            model=triage_model,
        )

        items = [Risk.model_validate(d) for d in parsed]

        trace = ExtractionTrace(
            category="risks",
            slug=slug,
            model=triage_model,
            p1_system=_RISK_COMBINED_SYSTEM,
            p1_response=json.dumps(parsed),
            p1_thinking=thinking,
            p2_input="",
            p2_result=[r.model_dump() for r in items],
            p1_prompt_tokens=p1_pt,
            p1_completion_tokens=p1_ct,
            combined_duration_ms=duration_ms,
        )
        try:
            span.set_attribute("combined.items_extracted", len(items))
            log.info("risks | found risks", slug=slug, count=len(items), severities=[r.severity for r in items])

            citations: list[SignalCitation] = []
            if settings.enrich_citations:
                log.info("risks | extracting citations", slug=slug, items=len(items))
                items_text = "\n".join(f"  - [{r.severity}] {r.summary[:80]}" for r in items)
                citations, p3_pt, p3_ct = await _cite_for_category(transcript, "risk", items_text)
                trace.p3_prompt_tokens = p3_pt
                trace.p3_completion_tokens = p3_ct
                span.set_attribute("pass3.citations_count", len(citations))
                log.info("risks | citations done", slug=slug, count=len(citations))

            total_pt = p1_pt + trace.p3_prompt_tokens
            total_ct = p1_ct + trace.p3_completion_tokens
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, total_pt)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, total_ct)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, total_pt + total_ct)

            span.set_attribute(SpanAttributes.OUTPUT_VALUE, json.dumps([r.model_dump() for r in items]))
            span.set_status(Status(StatusCode.OK))
            return items, citations, trace
        except Exception as exc:
            trace.p2_error = str(exc)
            span.set_attribute("extract.error", str(exc))
            span.set_attribute(SpanAttributes.OUTPUT_VALUE, f"ERROR: {exc}")
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            raise


async def extract_opportunities(
    transcript: str,
    slug: str,
    triage_model: str,
    base_url: str,
    granola_summary: str | None = None,
) -> tuple[list[Opportunity], list[SignalCitation], ExtractionTrace]:
    """Single-pass opportunity extraction with optional citation enrichment."""
    with tracer.start_as_current_span("extract.opportunities") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
        span.set_attribute(SpanAttributes.INPUT_VALUE, transcript[:2000])
        span.set_attribute("meeting.slug", slug)
        span.set_attribute(SpanAttributes.LLM_MODEL_NAME, triage_model)

        source_text = granola_summary if granola_summary else transcript
        log.info("opportunities | combined extraction", slug=slug, chars=len(source_text), model=triage_model)

        parsed, thinking, p1_pt, p1_ct, duration_ms = await _extract_structured(
            category="opportunities",
            system_prompt=_OPP_COMBINED_SYSTEM,
            user_content=source_text,
            model=triage_model,
        )

        items = [Opportunity.model_validate(d) for d in parsed]

        trace = ExtractionTrace(
            category="opportunities",
            slug=slug,
            model=triage_model,
            p1_system=_OPP_COMBINED_SYSTEM,
            p1_response=json.dumps(parsed),
            p1_thinking=thinking,
            p2_input="",
            p2_result=[o.model_dump() for o in items],
            p1_prompt_tokens=p1_pt,
            p1_completion_tokens=p1_ct,
            combined_duration_ms=duration_ms,
        )
        try:
            span.set_attribute("combined.items_extracted", len(items))
            log.info("opportunities | found opportunities", slug=slug, count=len(items), types=[o.type for o in items])

            citations: list[SignalCitation] = []
            if settings.enrich_citations:
                log.info("opportunities | extracting citations", slug=slug, items=len(items))
                items_text = "\n".join(f"  - [{o.type}] {o.name[:80]}" for o in items)
                citations, p3_pt, p3_ct = await _cite_for_category(transcript, "opportunity", items_text)
                trace.p3_prompt_tokens = p3_pt
                trace.p3_completion_tokens = p3_ct
                span.set_attribute("pass3.citations_count", len(citations))
                log.info("opportunities | citations done", slug=slug, count=len(citations))

            total_pt = p1_pt + trace.p3_prompt_tokens
            total_ct = p1_ct + trace.p3_completion_tokens
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, total_pt)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, total_ct)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, total_pt + total_ct)

            span.set_attribute(SpanAttributes.OUTPUT_VALUE, json.dumps([o.model_dump() for o in items]))
            span.set_status(Status(StatusCode.OK))
            return items, citations, trace
        except Exception as exc:
            trace.p2_error = str(exc)
            span.set_attribute("extract.error", str(exc))
            span.set_attribute(SpanAttributes.OUTPUT_VALUE, f"ERROR: {exc}")
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            raise


async def extract_tasks(
    transcript: str,
    slug: str,
    triage_model: str,
    base_url: str,
    granola_summary: str | None = None,
) -> tuple[list[Task], list[SignalCitation], ExtractionTrace]:
    """Single-pass task extraction with optional citation enrichment."""
    with tracer.start_as_current_span("extract.tasks") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
        span.set_attribute(SpanAttributes.INPUT_VALUE, transcript[:2000])
        span.set_attribute("meeting.slug", slug)
        span.set_attribute(SpanAttributes.LLM_MODEL_NAME, triage_model)

        source_text = granola_summary if granola_summary else transcript
        log.info("tasks | combined extraction", slug=slug, chars=len(source_text), model=triage_model)

        parsed, thinking, p1_pt, p1_ct, duration_ms = await _extract_structured(
            category="tasks",
            system_prompt=_TASK_COMBINED_SYSTEM,
            user_content=source_text,
            model=triage_model,
        )

        items = [Task.model_validate(d) for d in parsed]

        trace = ExtractionTrace(
            category="tasks",
            slug=slug,
            model=triage_model,
            p1_system=_TASK_COMBINED_SYSTEM,
            p1_response=json.dumps(parsed),
            p1_thinking=thinking,
            p2_input="",
            p2_result=[t.model_dump() for t in items],
            p1_prompt_tokens=p1_pt,
            p1_completion_tokens=p1_ct,
            combined_duration_ms=duration_ms,
        )
        try:
            span.set_attribute("combined.items_extracted", len(items))
            log.info("tasks | found tasks", slug=slug, count=len(items), owners=list({t.owner for t in items if t.owner}))

            citations: list[SignalCitation] = []
            if settings.enrich_citations:
                log.info("tasks | extracting citations", slug=slug, items=len(items))
                items_text = "\n".join(
                    f"  - {t.action[:80]}" + (f" → {t.owner}" if t.owner else "") for t in items
                )
                citations, p3_pt, p3_ct = await _cite_for_category(transcript, "task", items_text)
                trace.p3_prompt_tokens = p3_pt
                trace.p3_completion_tokens = p3_ct
                span.set_attribute("pass3.citations_count", len(citations))
                log.info("tasks | citations done", slug=slug, count=len(citations))

            total_pt = p1_pt + trace.p3_prompt_tokens
            total_ct = p1_ct + trace.p3_completion_tokens
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, total_pt)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, total_ct)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, total_pt + total_ct)

            span.set_attribute(SpanAttributes.OUTPUT_VALUE, json.dumps([t.model_dump() for t in items]))
            span.set_status(Status(StatusCode.OK))
            return items, citations, trace
        except Exception as exc:
            trace.p2_error = str(exc)
            span.set_attribute("extract.error", str(exc))
            span.set_attribute(SpanAttributes.OUTPUT_VALUE, f"ERROR: {exc}")
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            raise


_SUMMARIZE_SYSTEM = (
    "You are a meeting analyst. Write a concise 3-5 sentence executive summary of the "
    "meeting transcript below. Capture: main purpose, key decisions, and critical next steps. "
    "Plain prose — no bullet points, no headings. Focus on WHAT was decided, not WHO said it."
)


async def summarize_meeting(
    transcript: str,
    granola_summary: str | None,
    slug: str,
    triage_model: str,
    base_url: str,
) -> str | None:
    """Generate a plain-text executive meeting summary.

    If a Granola AI summary is already available it is used directly (no LLM call).
    Otherwise a single _raw_extract call generates the summary.

    Args:
        transcript: Original full transcript.
        granola_summary: Optional pre-existing Granola summary.
        slug: Meeting slug for tracing.
        triage_model: Ollama model name.
        base_url: Ollama base URL.

    Returns:
        Meeting summary string, or None on failure.
    """
    # Prefer pre-existing Granola summary — it's already well-written and free.
    if granola_summary:
        return granola_summary.strip()

    with tracer.start_as_current_span("summarize_meeting") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
        span.set_attribute("meeting.slug", slug)
        try:
            summary, _, _, s_pt, s_ct, _ = await _raw_extract(transcript, _SUMMARIZE_SYSTEM, triage_model, base_url, span=span)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, s_pt)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, s_ct)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, s_pt + s_ct)
            span.set_attribute(SpanAttributes.OUTPUT_VALUE, summary[:500])
            span.set_status(Status(StatusCode.OK))
            return summary.strip() or None
        except Exception as exc:
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            log.warning("summarize_failed", slug=slug, error=str(exc))
            return None
