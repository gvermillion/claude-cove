"""LLM-as-judge scorer for M4 agent extraction evals.

Uses qwen3:8b with thinking mode enabled (think: true) so the judge exposes
its full reasoning chain before committing to scores. This makes the judge
auditable and calibratable — you can read why it scored something low and
adjust extraction prompts accordingly.

One LLM call per category (entities / risks / opportunities / tasks), matching
the production judge architecture. Each call scores four dimensions:

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
# Per-category system prompts
# ---------------------------------------------------------------------------

_JUDGE_SYSTEM_TEMPLATE = """/think
You are an expert evaluator assessing how well an AI agent extracted {category} from a meeting transcript.

You will receive:
1. EXPECTED {category_upper} — the ground-truth labels
2. RETURNED {category_upper} — what the agent actually extracted

Score on four dimensions:

RUBRIC:
- completeness (0.0–1.0): What fraction of expected signals were found? Use semantic matching, not keyword matching. "Chakra needs to grant permissions" matches "Saichakravarthy Annam permissions PTO" if they refer to the same thing.
- faithfulness (0.0–1.0): Are the returned descriptions accurate to what was actually discussed? Penalize distortions, fabrications, or significant omissions.
- precision (0.0–1.0): What fraction of returned items are genuinely grounded in the meeting content? Penalize hallucinated signals not supported by the expected set.
- schema (0.0–1.0): Are enum values correct? ({schema_hint})

Score 1.0 across all dimensions if there are no expected items AND no returned items (vacuously correct).
Score completeness=0.0 only if NO expected signals were found at all.

Output ONLY valid JSON — no markdown fences, no explanation outside the JSON:
{{"completeness": 0.0, "faithfulness": 0.0, "precision": 0.0, "schema": 0.0, "reasoning": "..."}}
"""

_SCHEMA_HINTS = {
    "entities": "relationship: client/colleague/stakeholder/vendor/unknown",
    "risks": "severity: high/medium/low",
    "opportunities": "type: expansion/workflow/lateral",
    "tasks": "owner should be a person name or null, description should be actionable",
}


# ---------------------------------------------------------------------------
# Per-category prompt builder
# ---------------------------------------------------------------------------


def _build_category_prompt(
    category: str,
    expected_items: list,
    returned_items: list[dict],
) -> tuple[str, str]:
    """Build system + user prompts for judging one category.

    Args:
        category: One of entities/risks/opportunities/tasks.
        expected_items: Ground-truth list for this category.
        returned_items: Extracted items from the ingest endpoint.

    Returns:
        (system_prompt, user_prompt)
    """
    system = _JUDGE_SYSTEM_TEMPLATE.format(
        category=category,
        category_upper=category.upper(),
        schema_hint=_SCHEMA_HINTS.get(category, "fields should match expected types"),
    )

    lines: list[str] = [f"=== EXPECTED {category.upper()} ===", ""]

    if category == "entities":
        for e in expected_items:
            suffix = f", title: {e.title}" if e.title else ""
            lines.append(f"  - {e.name} ({e.relationship}){suffix}")
    elif category == "risks":
        for r in expected_items:
            lines.append(f"  - [{r.severity}] {r.description}")
    elif category == "opportunities":
        for o in expected_items:
            lines.append(f"  - [{o.type}] {o.description}")
    elif category == "tasks":
        for t in expected_items:
            owner = f" → {t.owner}" if t.owner else ""
            lines.append(f"  - {t.description}{owner}")

    lines.extend(["", f"=== RETURNED {category.upper()} ===", ""])

    if category == "entities":
        for e in returned_items:
            lines.append(
                f"  - {e.get('name')} ({e.get('relationship')}) title={e.get('title')}"
            )
    elif category == "risks":
        for r in returned_items:
            lines.append(f"  - [{r.get('severity')}] {r.get('description', '')[:100]}")
    elif category == "opportunities":
        for o in returned_items:
            lines.append(f"  - [{o.get('type')}] {o.get('description', '')[:100]}")
    elif category == "tasks":
        for t in returned_items:
            owner = f" → {t.get('owner')}" if t.get("owner") else ""
            lines.append(f"  - {t.get('description', '')[:100]}{owner}")

    return system, "\n".join(lines)


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------


def _parse_category_response(
    raw_content: str, thinking_content: str = ""
) -> tuple[dict, str]:
    """Extract thinking and JSON scores from a single-category qwen3 response.

    Args:
        raw_content: The message content string from the chat completion.
        thinking_content: Pre-extracted thinking from a separate API field, if any.

    Returns:
        Tuple of (scores_dict, thinking_str).

    Raises:
        ValueError: If no valid JSON block is found in the response.
    """
    think_match = re.search(r"<think>(.*?)</think>", raw_content, re.DOTALL)
    if think_match:
        thinking_content = think_match.group(1).strip()
        raw_content = raw_content[think_match.end():].strip()

    start = raw_content.find("{")
    end = raw_content.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(f"No JSON found in judge response: {raw_content[:200]}")

    scores: dict = json.loads(raw_content[start:end])
    return scores, thinking_content


def _make_judgment(scores: dict, thinking: str) -> CategoryJudgment:
    """Build a CategoryJudgment from a single-category scores dict.

    Args:
        scores: Scores dict for one category (completeness/faithfulness/precision/schema/reasoning).
        thinking: Raw thinking content for this category.

    Returns:
        CategoryJudgment with clamped float scores.
    """
    return CategoryJudgment(
        completeness=float(scores.get("completeness", 0.0)),
        faithfulness=float(scores.get("faithfulness", 0.0)),
        precision=float(scores.get("precision", 0.0)),
        schema_score=float(scores.get("schema", 0.0)),
        reasoning=scores.get("reasoning", ""),
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
# Per-category scoring
# ---------------------------------------------------------------------------


async def _judge_one_category(
    case_id: str,
    category: str,
    expected_items: list,
    returned_items: list[dict],
    model: str,
    ollama_base: str,
) -> CategoryJudgment:
    """Score one extraction category using the judge LLM.

    Args:
        case_id: Identifier for the eval case (used in span name).
        category: One of entities/risks/opportunities/tasks.
        expected_items: Ground-truth list for this category.
        returned_items: Extracted items from the ingest endpoint.
        model: Ollama model name.
        ollama_base: Ollama base URL (no /v1 suffix).

    Returns:
        CategoryJudgment. On error, returns all-zero judgment with error set.
    """
    system, user_msg = _build_category_prompt(category, expected_items, returned_items)

    with _tracer.start_as_current_span(f"judge.{case_id}.{category}") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.LLM.value)
        span.set_attribute(SpanAttributes.LLM_MODEL_NAME, model)
        span.set_attribute(SpanAttributes.INPUT_VALUE, user_msg[:2000])
        span.set_attribute("eval.case_id", case_id)
        span.set_attribute("eval.category", category)

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
                            "num_predict": 1500,  # single category needs less headroom
                        },
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user_msg},
                        ],
                    },
                    timeout=300.0,
                )
                resp.raise_for_status()
                payload = resp.json()
        except httpx.HTTPStatusError as exc:
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            return _zero_judgment(reasoning=f"HTTP {exc.response.status_code}: {exc.response.text[:200]}")
        except Exception as exc:  # noqa: BLE001
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            return _zero_judgment(reasoning=f"{type(exc).__name__}: {exc}")

        message = payload.get("message", {})
        raw_content: str = message.get("content") or ""
        thinking_field: str = message.get("thinking") or ""

        try:
            scores, thinking = _parse_category_response(raw_content, thinking_field)
        except (ValueError, json.JSONDecodeError) as exc:
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            return _zero_judgment(
                thinking=thinking_field,
                reasoning=f"Parse error: {exc} | raw (first 400): {raw_content[:400]}",
            )

        result = _make_judgment(scores, thinking)
        span.set_attribute(SpanAttributes.OUTPUT_VALUE, json.dumps({
            "mean": result.mean,
            "completeness": result.completeness,
            "faithfulness": result.faithfulness,
            "precision": result.precision,
            "schema": result.schema_score,
            "reasoning": result.reasoning[:200],
        }))
        span.set_attribute(f"eval.{category}.mean", result.mean)
        span.set_attribute(f"eval.{category}.completeness", result.completeness)
        span.set_attribute(f"eval.{category}.faithfulness", result.faithfulness)
        span.set_attribute(f"eval.{category}.precision", result.precision)
        span.set_attribute(f"eval.{category}.schema", result.schema_score)
        span.set_status(Status(StatusCode.OK))
        return result


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
    """Score one eval case using a local LLM judge — one call per category.

    Uses the native Ollama /api/chat endpoint (not OpenAI-compat) so that
    think:true is honoured and the thinking field is always populated.

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
    """
    ollama_base = base_url.rstrip("/").removesuffix("/v1")

    # Sequential: Ollama serialises requests to a single model anyway
    entities = await _judge_one_category(
        case_id, "entities", expected_entities,
        returned.get("entities", []), model, ollama_base,
    )
    risks = await _judge_one_category(
        case_id, "risks", expected_risks,
        returned.get("risks", []), model, ollama_base,
    )
    opportunities = await _judge_one_category(
        case_id, "opportunities", expected_opportunities,
        returned.get("opportunities", []), model, ollama_base,
    )
    tasks = await _judge_one_category(
        case_id, "tasks", expected_tasks,
        returned.get("tasks", []), model, ollama_base,
    )

    return JudgeCaseResult(
        case_id=case_id,
        entities=entities,
        risks=risks,
        opportunities=opportunities,
        tasks=tasks,
    )
