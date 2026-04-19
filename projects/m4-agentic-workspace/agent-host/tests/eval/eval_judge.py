"""LLM-as-judge scorer for M4 agent extraction evals.

Uses qwen3:8b with thinking mode enabled (think: true) so the judge exposes
its full reasoning chain before committing to scores. This makes the judge
auditable and calibratable — you can read why it scored something low and
adjust extraction prompts accordingly.

Rubric (per category, 0.0–1.0 each):
  completeness  Did the agent find all expected signals?
  faithfulness  Are descriptions accurate to the source content?
  precision     Are returned items grounded (not hallucinated)?
  schema        Correct enum values (severity / type / relationship)?

The macro_score is the mean of all four rubric dimensions averaged across
all four categories.

Usage:
    uv run python run_evals.py --judge
    uv run python run_evals.py --judge --judge-model qwen3:14b
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

import httpx
from openinference.semconv.trace import OpenInferenceSpanKindValues, SpanAttributes
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import Status, StatusCode

from golden_evals import (
    ExpectedEntity,
    ExpectedOpportunity,
    ExpectedRisk,
    ExpectedTask,
)

# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------


@dataclass
class CategoryJudgment:
    """Judge scores and reasoning for one signal category."""

    completeness: float  # 0.0–1.0
    faithfulness: float  # 0.0–1.0
    precision: float  # 0.0–1.0
    schema_score: float  # 0.0–1.0
    reasoning: str  # judge's written explanation for this category
    thinking: str  # raw <think>...</think> content (empty if not present)

    @property
    def mean(self) -> float:
        """Mean of all four rubric dimensions for this category."""
        return (
            self.completeness + self.faithfulness + self.precision + self.schema_score
        ) / 4


@dataclass
class JudgeCaseResult:
    """Aggregated judge scores for one eval case."""

    case_id: str
    entities: CategoryJudgment
    risks: CategoryJudgment
    opportunities: CategoryJudgment
    tasks: CategoryJudgment
    error: str | None = None

    @property
    def macro_score(self) -> float:
        """Mean of all four category means."""
        return (
            self.entities.mean
            + self.risks.mean
            + self.opportunities.mean
            + self.tasks.mean
        ) / 4


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

_JUDGE_SYSTEM = """/think
You are an expert evaluator assessing how well an AI agent extracted structured signals from a meeting transcript.

You will receive:
1. EXPECTED signals — the ground-truth labels
2. RETURNED signals — what the agent actually extracted

Score each of the four categories (entities, risks, opportunities, tasks) on four dimensions:

RUBRIC:
- completeness (0.0–1.0): What fraction of expected signals were found? Use semantic matching, not keyword matching. "Chakra needs to grant permissions" matches "Saichakravarthy Annam permissions PTO" if they refer to the same thing.
- faithfulness (0.0–1.0): Are the returned descriptions accurate to what was actually discussed? Penalize distortions, fabrications, or significant omissions.
- precision (0.0–1.0): What fraction of returned items are genuinely grounded in the meeting content? Penalize hallucinated signals not supported by the expected set or the transcript.
- schema (0.0–1.0): Are enum values correct? (severity: high/medium/low, type: expansion/workflow/lateral, relationship: client/colleague/stakeholder/vendor/unknown)

Score 1.0 if the category has no expected items AND no returned items (vacuously correct).
Score completeness=0.0 only if NO expected signals were found at all.

Output ONLY valid JSON — no markdown fences, no explanation outside the JSON:
{
  "entities":      {"completeness": 0.0, "faithfulness": 0.0, "precision": 0.0, "schema": 0.0, "reasoning": "..."},
  "risks":         {"completeness": 0.0, "faithfulness": 0.0, "precision": 0.0, "schema": 0.0, "reasoning": "..."},
  "opportunities": {"completeness": 0.0, "faithfulness": 0.0, "precision": 0.0, "schema": 0.0, "reasoning": "..."},
  "tasks":         {"completeness": 0.0, "faithfulness": 0.0, "precision": 0.0, "schema": 0.0, "reasoning": "..."}
}
"""

# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------


def _build_judge_prompt(
    returned: dict,
    expected_entities: list[ExpectedEntity],
    expected_risks: list[ExpectedRisk],
    expected_opportunities: list[ExpectedOpportunity],
    expected_tasks: list[ExpectedTask],
) -> str:
    """Build the structured comparison prompt for the judge.

    Args:
        returned: Raw JSON response from the ingest endpoint.
        expected_entities: Ground-truth entity list.
        expected_risks: Ground-truth risk list.
        expected_opportunities: Ground-truth opportunity list.
        expected_tasks: Ground-truth task list.

    Returns:
        Formatted multi-section string showing expected vs returned signals.
    """
    lines: list[str] = ["=== EXPECTED SIGNALS ===", ""]

    lines.append("ENTITIES:")
    for e in expected_entities:
        suffix = f", title: {e.title}" if e.title else ""
        lines.append(f"  - {e.name} ({e.relationship}){suffix}")

    lines.append("\nRISKS:")
    for r in expected_risks:
        lines.append(f"  - [{r.severity}] keywords: {', '.join(r.keywords)}")

    lines.append("\nOPPORTUNITIES:")
    for o in expected_opportunities:
        lines.append(f"  - [{o.type}] keywords: {', '.join(o.keywords)}")

    lines.append("\nTASKS:")
    for t in expected_tasks:
        owner = f" → {t.owner}" if t.owner else ""
        lines.append(f"  - keywords: {', '.join(t.keywords)}{owner}")

    lines.append("\n=== RETURNED SIGNALS ===\n")

    lines.append("ENTITIES:")
    for e in returned.get("entities", []):
        lines.append(
            f"  - {e.get('name')} ({e.get('relationship')}) title={e.get('title')}"
        )

    lines.append("\nRISKS:")
    for r in returned.get("risks", []):
        lines.append(f"  - [{r.get('severity')}] {r.get('description', '')[:100]}")

    lines.append("\nOPPORTUNITIES:")
    for o in returned.get("opportunities", []):
        lines.append(f"  - [{o.get('type')}] {o.get('description', '')[:100]}")

    lines.append("\nTASKS:")
    for t in returned.get("tasks", []):
        owner = f" → {t.get('owner')}" if t.get("owner") else ""
        lines.append(f"  - {t.get('description', '')[:100]}{owner}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------


def _parse_judge_response(
    raw_content: str, thinking_content: str = ""
) -> tuple[dict, str]:
    """Extract thinking and JSON scores from qwen3 response.

    Handles two formats:
    1. Thinking in separate 'thinking' field (newer Ollama)
    2. <think>...</think> tags embedded in content

    Args:
        raw_content: The message content string from the chat completion.
        thinking_content: Pre-extracted thinking from a separate API field, if any.

    Returns:
        Tuple of (scores_dict, thinking_str).

    Raises:
        ValueError: If no valid JSON block is found in the response.
    """
    # Extract <think> block if present in content
    think_match = re.search(r"<think>(.*?)</think>", raw_content, re.DOTALL)
    if think_match:
        thinking_content = think_match.group(1).strip()
        raw_content = raw_content[think_match.end() :].strip()

    # Extract JSON — find first { to last }
    start = raw_content.find("{")
    end = raw_content.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(
            f"No JSON found in judge response: {raw_content[:200]}"
        )

    scores: dict = json.loads(raw_content[start:end])
    return scores, thinking_content


def _make_judgment(
    scores: dict, category: str, thinking: str
) -> CategoryJudgment:
    """Build a CategoryJudgment from the parsed scores dict.

    Args:
        scores: Full scores dict from the judge (all four categories).
        category: Key to extract (entities / risks / opportunities / tasks).
        thinking: Raw thinking content shared across all categories.

    Returns:
        CategoryJudgment with clamped float scores.
    """
    cat = scores.get(category, {})
    return CategoryJudgment(
        completeness=float(cat.get("completeness", 0.0)),
        faithfulness=float(cat.get("faithfulness", 0.0)),
        precision=float(cat.get("precision", 0.0)),
        schema_score=float(cat.get("schema", 0.0)),
        reasoning=cat.get("reasoning", ""),
        thinking=thinking,
    )


def _zero_judgment(thinking: str = "", reasoning: str = "") -> CategoryJudgment:
    """Return an all-zero CategoryJudgment for error cases."""
    return CategoryJudgment(
        completeness=0.0,
        faithfulness=0.0,
        precision=0.0,
        schema_score=0.0,
        reasoning=reasoning,
        thinking=thinking,
    )


# ---------------------------------------------------------------------------
# OTel tracer — initialised once by run_evals.py when --judge is active
# ---------------------------------------------------------------------------

_tracer: trace.Tracer = trace.get_tracer(__name__)  # no-op until init_tracer() called


def init_tracer(phoenix_endpoint: str = "http://localhost:6006/v1/traces") -> None:
    """Set up a TracerProvider that exports judge spans to Arize Phoenix.

    Call once from run_evals.py before running any judge cases.

    Args:
        phoenix_endpoint: OTLP HTTP endpoint for Phoenix (default: localhost:4318).
    """
    global _tracer
    provider = TracerProvider(
        resource=Resource({"service.name": "m4-eval-judge"}),
    )
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=phoenix_endpoint))
    )
    trace.set_tracer_provider(provider)
    _tracer = trace.get_tracer(__name__)


# ---------------------------------------------------------------------------
# Core scoring function
# ---------------------------------------------------------------------------


async def judge_case(
    case_id: str,
    returned: dict,
    expected_entities: list[ExpectedEntity],
    expected_risks: list[ExpectedRisk],
    expected_opportunities: list[ExpectedOpportunity],
    expected_tasks: list[ExpectedTask],
    model: str = "qwen3:8b",
    base_url: str = "http://localhost:11434",
) -> JudgeCaseResult:
    """Score one eval case using a local LLM judge with thinking mode.

    Uses the native Ollama /api/chat endpoint (not OpenAI-compat) so that
    think:true is honoured and the thinking field is always populated.
    The /v1/chat/completions endpoint silently ignores think: at temperature=0,
    causing qwen3 to put output in the thinking field and return null content.

    Args:
        case_id: Identifier for the eval case.
        returned: Raw JSON response from the ingest endpoint.
        expected_entities: Ground-truth ExpectedEntity list.
        expected_risks: Ground-truth ExpectedRisk list.
        expected_opportunities: Ground-truth ExpectedOpportunity list.
        expected_tasks: Ground-truth ExpectedTask list.
        model: Ollama model name. Must support think mode (qwen3 family).
        base_url: Ollama base URL (no /v1 suffix — uses native /api/chat).

    Returns:
        JudgeCaseResult with per-category scores and judge reasoning.
        On any error, returns a result with all scores 0.0 and error set.
    """
    user_msg = _build_judge_prompt(
        returned,
        expected_entities,
        expected_risks,
        expected_opportunities,
        expected_tasks,
    )

    # Normalise: strip /v1 suffix if the caller passed an OpenAI-compat URL
    ollama_base = base_url.rstrip("/").removesuffix("/v1")

    with _tracer.start_as_current_span(f"judge.{case_id}") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.LLM.value)
        span.set_attribute(SpanAttributes.LLM_MODEL_NAME, model)
        span.set_attribute(SpanAttributes.INPUT_VALUE, user_msg[:2000])
        span.set_attribute("eval.case_id", case_id)

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{ollama_base}/api/chat",
                    json={
                        "model": model,
                        "think": True,
                        "stream": False,
                        "options": {
                            "temperature": 0,
                            "num_predict": 3000,  # 4 categories × reasoning needs headroom
                        },
                        "messages": [
                            {"role": "system", "content": _JUDGE_SYSTEM},
                            {"role": "user", "content": user_msg},
                        ],
                    },
                    timeout=600.0,
                )
                resp.raise_for_status()
                payload = resp.json()
        except httpx.HTTPStatusError as exc:
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            return JudgeCaseResult(
                case_id=case_id,
                entities=_zero_judgment(),
                risks=_zero_judgment(),
                opportunities=_zero_judgment(),
                tasks=_zero_judgment(),
                error=f"HTTP {exc.response.status_code}: {exc.response.text[:200]}",
            )
        except Exception as exc:  # noqa: BLE001
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            return JudgeCaseResult(
                case_id=case_id,
                entities=_zero_judgment(),
                risks=_zero_judgment(),
                opportunities=_zero_judgment(),
                tasks=_zero_judgment(),
                error=f"{type(exc).__name__}: {exc}",
            )

        # Native /api/chat response: {"message": {"role": "...", "content": "...", "thinking": "..."}}
        message = payload.get("message", {})
        raw_content: str = message.get("content") or ""
        thinking_field: str = message.get("thinking") or ""

        try:
            scores, thinking = _parse_judge_response(raw_content, thinking_field)
        except (ValueError, json.JSONDecodeError) as exc:
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            return JudgeCaseResult(
                case_id=case_id,
                entities=_zero_judgment(thinking=thinking_field),
                risks=_zero_judgment(thinking=thinking_field),
                opportunities=_zero_judgment(thinking=thinking_field),
                tasks=_zero_judgment(thinking=thinking_field),
                error=f"Parse error: {exc} | raw (first 400): {raw_content[:400]}",
            )

        result = JudgeCaseResult(
            case_id=case_id,
            entities=_make_judgment(scores, "entities", thinking),
            risks=_make_judgment(scores, "risks", thinking),
            opportunities=_make_judgment(scores, "opportunities", thinking),
            tasks=_make_judgment(scores, "tasks", thinking),
        )
        span.set_attribute(SpanAttributes.OUTPUT_VALUE, json.dumps({
            "macro_score": result.macro_score,
            "entities": result.entities.mean,
            "risks": result.risks.mean,
            "opportunities": result.opportunities.mean,
            "tasks": result.tasks.mean,
        }))
        span.set_attribute("eval.macro_score", result.macro_score)
        span.set_status(Status(StatusCode.OK))
        return result
