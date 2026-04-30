"""Shared judge machinery used by both production and eval judge code.

Provides the two-pass Ollama judge implementation (analysis + scoring),
data classes, dimension definitions, and prompt-building helpers so that
production (judge.py) and offline eval (tests/eval/judge_evals.py) share a
single code path.

Key exports:
    JudgeDimension  — descriptor for a single rubric dimension
    JudgeResult     — output of one judge run (scores + reasoning + thinking)
    JudgeRubric     — named rubric with ordered dimensions and rendered system prompt
    DIMENSIONS      — canonical dimension registry keyed by name
    run_two_pass_judge  — async core: analysis pass + scoring pass → JudgeResult
    build_judge_user_message  — format transcript + items (+ optional ground truth) for pass 1
    build_analysis_system     — render analysis system prompt from a rubric
"""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from dataclasses import dataclass, field

import httpx
import structlog
from openinference.semconv.trace import (
    MessageAttributes,
    OpenInferenceSpanKindValues,
    SpanAttributes,
)
from opentelemetry.trace import Status, StatusCode

from m4_agent_host.infrastructure.ai.tokenizer import count_tokens
from m4_agent_host.infrastructure.telemetry.tracer import tracer

log = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class JudgeDimension:
    """Descriptor for a single rubric dimension.

    Args:
        name: Machine-readable identifier used as the JSON key in scores.
        description: Human-readable rubric text rendered into the analysis prompt.
            May contain ``{schema_hint}`` which ``build_analysis_system`` replaces.
        conditional: When True the dimension is only scored when ground truth is
            provided.  A conditional dimension absent from ``scores`` is excluded
            from the mean calculation.
    """

    name: str
    description: str
    conditional: bool = False


@dataclass
class JudgeResult:
    """Output of one two-pass judge run.

    Args:
        rubric_name: Name of the rubric that produced this result.
        scores: Mapping of dimension name → float score (0.0–1.0).  Only
            dimensions that were actually scored appear here — conditional
            dimensions are absent when ground truth was not provided.
        reasoning: Per-dimension reasoning string from pass-2 JSON.
        thinking: Pass-1 chain-of-thought extracted from the analysis model.
        error: Non-None when the judge failed to parse a valid score JSON.
    """

    rubric_name: str
    scores: dict[str, float]
    reasoning: str
    thinking: str
    error: str | None = None

    @property
    def mean(self) -> float:
        """Mean of all scores present in ``scores``.

        Conditional dimensions that were not scored (absent from the dict) are
        excluded automatically because they were never added to the dict.

        Returns:
            0.0 if no scores are present; otherwise the arithmetic mean.
        """
        if not self.scores:
            return 0.0
        return sum(self.scores.values()) / len(self.scores)


@dataclass(frozen=True)
class JudgeRubric:
    """Named rubric used to configure a two-pass judge run.

    Args:
        name: Short identifier, e.g. ``"entities"``.  Used as span prefix prefix.
        dimensions: Ordered list of dimensions to evaluate.  Pass all unconditional
            dimensions plus any conditional ones you want included.
        analysis_system: Fully rendered pass-1 system prompt.  Build this with
            ``build_analysis_system`` rather than constructing it manually.
    """

    name: str
    dimensions: list[JudgeDimension]
    analysis_system: str


# ---------------------------------------------------------------------------
# Canonical dimension registry
# ---------------------------------------------------------------------------

DIMENSIONS: dict[str, JudgeDimension] = {
    "faithfulness": JudgeDimension(
        name="faithfulness",
        description=(
            "Are extracted items accurate to what was actually discussed? "
            "Penalize distortions or fabrications."
        ),
    ),
    "precision": JudgeDimension(
        name="precision",
        description=(
            "Are ALL items grounded in the transcript (not hallucinated)? "
            "Penalize items not supported by the text."
        ),
    ),
    "reasoning_quality": JudgeDimension(
        name="reasoning_quality",
        description=(
            "Does the extractor's chain-of-thought logically support the extracted items? "
            "Score 0.5 if no reasoning was provided. "
            "Penalize reasoning that contradicts the output or misses obvious signals."
        ),
    ),
    "schema": JudgeDimension(
        name="schema",
        description="Are enum values and field formats correct? ({schema_hint})",
    ),
    "citation_quality": JudgeDimension(
        name="citation_quality",
        description=(
            "Do extracted items have accurate evidence quotes that match the source text? "
            "Score 0.5 if no citations/evidence fields are present. "
            "Penalize fabricated quotes."
        ),
    ),
    "completeness": JudgeDimension(
        name="completeness",
        description=(
            "What fraction of expected signals were found? "
            "Use semantic matching. "
            "Score 1.0 if both expected and returned are empty."
        ),
        conditional=True,
    ),
}

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

def _build_score_system(dimensions: list[JudgeDimension]) -> str:
    """Build the pass-2 score system prompt scoped to the rubric's dimensions."""
    dim_keys = [d.name for d in dimensions]
    keys_str = ", ".join(dim_keys)
    example_obj = ", ".join(f'"{k}": 0.0' for k in dim_keys)
    reasoning_parts = ". ".join(f"{k}: <why>" for k in dim_keys)
    return (
        "Based on the analysis provided, output ONLY valid JSON scores — "
        "no markdown fences, no explanation outside the JSON.\n"
        f"Score ONLY these dimensions: {keys_str}.\n"
        f'Format: {{{example_obj}, '
        f'"reasoning": "{reasoning_parts}"}}'
    )

# Pass-1 analysis template.  Placeholders resolved by build_analysis_system.
_ANALYSIS_TEMPLATE: str = """\
You are an expert evaluator assessing how well an AI agent extracted {category} from a meeting transcript.

You will receive:
1. TRANSCRIPT EXCERPT — the source text the extractor worked from
2. EXTRACTOR REASONING — the chain-of-thought the extractor used (may be empty)
3. EXTRACTED ITEMS — the structured output the extractor produced
{ground_truth_section}
Analyse on the following dimensions (0.0-1.0 each):

RUBRIC:
{rubric_lines}

If no items were extracted AND the transcript genuinely contains none for this category, all dimensions are 1.0.

Write a detailed analysis covering all dimensions. Be specific — cite which items are faithful or hallucinated, note schema errors, evaluate whether the extractor's reasoning supports its conclusions.
"""

_GROUND_TRUTH_SECTION: str = (
    "4. EXPECTED ITEMS — ground-truth labels for completeness scoring\n"
)


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def build_judge_user_message(
    transcript_excerpt: str,
    extractor_thinking: str,
    extracted_items: list[dict],
    ground_truth: list | None = None,
    ground_truth_formatter: Callable[[list], str] | None = None,
) -> str:
    """Build the user message for pass-1 of a two-pass judge run.

    Assembles the four-section document the analysis model reads:
    TRANSCRIPT EXCERPT, EXTRACTOR REASONING, EXTRACTED ITEMS, and
    optionally EXPECTED ITEMS when ground truth is supplied.

    Args:
        transcript_excerpt: Raw transcript text (will be truncated to 5000 chars
            by the caller if needed; this function does not truncate).
        extractor_thinking: Chain-of-thought from the extractor model.  An empty
            string causes a ``(no reasoning captured)`` placeholder to be emitted.
        extracted_items: Structured extraction output as a list of dicts.
        ground_truth: Optional list of expected items.  When non-None the
            EXPECTED ITEMS section is appended.
        ground_truth_formatter: Optional callable that converts ``ground_truth``
            to a display string.  Defaults to one JSON line per item.

    Returns:
        Formatted multi-section user message string.
    """
    lines: list[str] = [
        "=== TRANSCRIPT EXCERPT ===",
        transcript_excerpt,
        "",
    ]

    if extractor_thinking:
        lines.extend(["=== EXTRACTOR REASONING ===", extractor_thinking, ""])
    else:
        lines.extend(["=== EXTRACTOR REASONING ===", "(no reasoning captured)", ""])

    lines.append("=== EXTRACTED ITEMS ===")
    for item in extracted_items:
        lines.append(f"  {json.dumps(item)}")
    lines.append("")

    if ground_truth is not None:
        lines.append("=== EXPECTED ITEMS ===")
        if ground_truth_formatter is not None:
            lines.append(ground_truth_formatter(ground_truth))
        else:
            for item in ground_truth:
                lines.append(f"  {json.dumps(item)}")
        lines.append("")

    return "\n".join(lines)


def build_analysis_system(
    rubric: JudgeRubric,
    category: str,
    schema_hint: str,
    ground_truth: list | None = None,
) -> str:
    """Render the pass-1 analysis system prompt for a rubric.

    Builds the rubric lines from ``rubric.dimensions``, substituting
    ``{schema_hint}`` into the schema dimension description.  When
    ``ground_truth`` is provided the completeness dimension line and
    the ground-truth input section header are added.

    Args:
        rubric: The rubric whose dimensions define the evaluation axes.
        category: Human-readable extraction category, e.g. ``"entities"``.
        schema_hint: Short description of valid enum / field values inserted
            into the schema dimension rubric line.
        ground_truth: Optional ground-truth list.  Its presence (not contents)
            controls whether completeness appears in the rubric.

    Returns:
        Fully rendered pass-1 system prompt string.
    """
    rubric_lines_parts: list[str] = []
    for dim in rubric.dimensions:
        if dim.conditional and ground_truth is None:
            # Skip conditional dimensions when no ground truth is available.
            continue
        desc = dim.description.replace("{schema_hint}", schema_hint)
        rubric_lines_parts.append(f"- {dim.name} (0.0-1.0): {desc}")

    ground_truth_section = _GROUND_TRUTH_SECTION if ground_truth is not None else ""

    return _ANALYSIS_TEMPLATE.format(
        category=category,
        ground_truth_section=ground_truth_section,
        rubric_lines="\n".join(rubric_lines_parts),
    )


# ---------------------------------------------------------------------------
# Two-pass judge
# ---------------------------------------------------------------------------


async def run_two_pass_judge(
    rubric: JudgeRubric,
    user_message: str,
    span_prefix: str,
    model: str,
    ollama_base: str,
    ground_truth: list | None = None,
) -> JudgeResult:
    """Run the two-pass Ollama judge and return structured scores.

    Pass 1 — analysis (``think:True``, ``num_predict:3000``, timeout 180 s):
        The model reasons freely over the user message.  Its chain-of-thought
        is captured from ``message.thinking`` or from ``<think>…</think>`` tags
        in the content string.

    Pass 2 — scoring (``think:False``, ``num_predict:256``, timeout 60 s):
        The model receives the pass-1 analysis as context and emits only a
        compact JSON object with per-dimension scores.

    Both passes are recorded as child LLM spans under ``span_prefix``:
    ``{span_prefix}.analysis`` and ``{span_prefix}.score``.

    Args:
        rubric: Rubric that produced ``user_message``; used for ``rubric_name``
            in the result and for the analysis system prompt.
        user_message: Formatted user message (transcript + items ± ground truth),
            typically produced by ``build_judge_user_message``.
        span_prefix: Dot-separated OTel span name prefix, e.g. ``"judge.entities"``.
            Child spans are ``{span_prefix}.analysis`` and ``{span_prefix}.score``.
        model: Ollama model identifier, e.g. ``"qwen3:14b"``.
        ollama_base: Ollama base URL without trailing slash or ``/v1`` suffix.
        ground_truth: Optional ground-truth list; its presence determines whether
            conditional dimensions (completeness) appear in scores.

    Returns:
        ``JudgeResult`` with scores, reasoning, and thinking.  On JSON parse
        failure, ``error`` is set and ``scores`` is an empty dict.
    """
    base = ollama_base.rstrip("/").removesuffix("/v1")

    # ── Pass 1: analysis ─────────────────────────────────────────────────
    with tracer.start_as_current_span(f"{span_prefix}.analysis") as analysis_span:
        analysis_span.set_attribute(
            SpanAttributes.OPENINFERENCE_SPAN_KIND,
            OpenInferenceSpanKindValues.LLM.value,
        )
        analysis_span.set_attribute(SpanAttributes.LLM_MODEL_NAME, model)
        analysis_span.set_attribute(SpanAttributes.INPUT_VALUE, user_message[:2000])
        analysis_span.set_attribute(
            f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}",
            "system",
        )
        analysis_span.set_attribute(
            f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}",
            rubric.analysis_system,
        )
        analysis_span.set_attribute(
            f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_ROLE}",
            "user",
        )
        analysis_span.set_attribute(
            f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_CONTENT}",
            user_message,
        )

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{base}/api/chat",
                    json={
                        "model": model,
                        "think": True,
                        "stream": False,
                        "options": {"num_predict": 3000},
                        "messages": [
                            {"role": "system", "content": rubric.analysis_system},
                            {"role": "user", "content": user_message},
                        ],
                    },
                    timeout=180.0,
                )
                resp.raise_for_status()
        except Exception as exc:
            err = f"analysis pass failed: {exc}"
            log.warning("judge_core_analysis_failed", span_prefix=span_prefix, error=err)
            analysis_span.set_status(Status(StatusCode.ERROR, err))
            return JudgeResult(
                rubric_name=rubric.name,
                scores={},
                reasoning="",
                thinking="",
                error=err,
            )

        payload = resp.json()
        analysis_msg = payload["message"]
        analysis_text: str = analysis_msg.get("content") or ""
        thinking: str = (analysis_msg.get("thinking") or "").strip()

        # Handle <think> tags embedded in content (older Ollama versions).
        think_match = re.search(r"<think>(.*?)</think>", analysis_text, re.DOTALL)
        if think_match:
            thinking = think_match.group(1).strip()
            analysis_text = analysis_text[think_match.end():].strip()

        p1_prompt_tok: int = payload.get("prompt_eval_count", 0)
        p1_completion_tok: int = payload.get("eval_count", 0)
        thinking_tokens: int = count_tokens(thinking, model) if thinking else 0

        analysis_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, p1_prompt_tok)
        analysis_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, p1_completion_tok)
        analysis_span.set_attribute(
            SpanAttributes.LLM_TOKEN_COUNT_TOTAL, p1_prompt_tok + p1_completion_tok
        )
        if thinking:
            analysis_span.set_attribute("llm.thinking_tokens", thinking_tokens)
            analysis_span.set_attribute("llm.thinking", thinking[:2000])
        analysis_span.set_attribute(
            f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}",
            "assistant",
        )
        analysis_span.set_attribute(
            f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}",
            analysis_text,
        )
        analysis_span.set_attribute(SpanAttributes.OUTPUT_VALUE, analysis_text[:1000])
        analysis_span.set_status(Status(StatusCode.OK))

    # ── Pass 2: scoring ──────────────────────────────────────────────────
    score_system = _build_score_system(rubric.dimensions)
    score_user_msg = (
        f"Based on this analysis:\n\n{analysis_text}\n\n"
        "Output ONLY the JSON scores."
    )

    with tracer.start_as_current_span(f"{span_prefix}.score") as score_span:
        score_span.set_attribute(
            SpanAttributes.OPENINFERENCE_SPAN_KIND,
            OpenInferenceSpanKindValues.LLM.value,
        )
        score_span.set_attribute(SpanAttributes.LLM_MODEL_NAME, model)
        score_span.set_attribute(SpanAttributes.INPUT_VALUE, score_user_msg[:1000])
        score_span.set_attribute(
            f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}",
            "system",
        )
        score_span.set_attribute(
            f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}",
            score_system,
        )
        score_span.set_attribute(
            f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_ROLE}",
            "user",
        )
        score_span.set_attribute(
            f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_CONTENT}",
            score_user_msg,
        )

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{base}/api/chat",
                    json={
                        "model": model,
                        "think": False,
                        "stream": False,
                        "options": {"num_predict": 256},
                        "messages": [
                            {"role": "system", "content": score_system},
                            {"role": "user", "content": score_user_msg},
                        ],
                    },
                    timeout=60.0,
                )
                resp.raise_for_status()
        except Exception as exc:
            err = f"score pass failed: {exc}"
            log.warning("judge_core_score_failed", span_prefix=span_prefix, error=err)
            score_span.set_status(Status(StatusCode.ERROR, err))
            return JudgeResult(
                rubric_name=rubric.name,
                scores={},
                reasoning="",
                thinking=thinking,
                error=err,
            )

        payload = resp.json()
        raw_content: str = payload["message"].get("content") or ""

        p2_prompt_tok: int = payload.get("prompt_eval_count", 0)
        p2_completion_tok: int = payload.get("eval_count", 0)

        log.info(
            "judge_core_complete",
            span_prefix=span_prefix,
            p1_prompt_tok=p1_prompt_tok,
            p1_completion_tok=p1_completion_tok,
            p2_prompt_tok=p2_prompt_tok,
            p2_completion_tok=p2_completion_tok,
            thinking_tok=thinking_tokens,
        )

        score_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, p2_prompt_tok)
        score_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, p2_completion_tok)
        score_span.set_attribute(
            SpanAttributes.LLM_TOKEN_COUNT_TOTAL, p2_prompt_tok + p2_completion_tok
        )

        # Extract JSON object from raw content (model may emit leading prose).
        start = raw_content.find("{")
        end = raw_content.rfind("}") + 1
        if start == -1 or end == 0:
            err = "no JSON found in judge score response"
            log.warning("judge_core_no_json", span_prefix=span_prefix, content=raw_content[:200])
            score_span.set_status(Status(StatusCode.ERROR, err))
            return JudgeResult(
                rubric_name=rubric.name,
                scores={},
                reasoning="",
                thinking=thinking,
                error=err,
            )

        try:
            parsed: dict = json.loads(raw_content[start:end])
        except json.JSONDecodeError as exc:
            err = f"JSON parse error: {exc}"
            log.warning("judge_core_json_parse_error", span_prefix=span_prefix, error=err)
            score_span.set_status(Status(StatusCode.ERROR, err))
            return JudgeResult(
                rubric_name=rubric.name,
                scores={},
                reasoning="",
                thinking=thinking,
                error=err,
            )

        score_span.set_attribute(
            f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}",
            "assistant",
        )
        score_span.set_attribute(
            f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}",
            raw_content,
        )
        score_span.set_attribute(SpanAttributes.OUTPUT_VALUE, raw_content)
        score_span.set_status(Status(StatusCode.OK))

    # Build scores dict from parsed JSON; exclude non-float "reasoning" key.
    scores: dict[str, float] = {
        k: float(v)
        for k, v in parsed.items()
        if k != "reasoning" and isinstance(v, (int, float))
    }
    reasoning: str = parsed.get("reasoning", "")

    return JudgeResult(
        rubric_name=rubric.name,
        scores=scores,
        reasoning=reasoning,
        thinking=thinking,
    )
