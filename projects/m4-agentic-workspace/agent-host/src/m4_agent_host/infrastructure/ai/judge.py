"""Per-category production judge — async post-processing after vault write.

Scores each extraction category independently against the source transcript
and the extractor's chain-of-thought reasoning.  Unlike the offline eval judge
which compares against ground-truth labels, this production judge evaluates
whether extractions are faithful to the source text and whether the extractor's
reasoning supports its conclusions.

All judge logic (two-pass Ollama, span creation, JSON parsing) is delegated to
``judge_core.run_two_pass_judge`` — this module only builds per-category rubrics
and maps ``JudgeResult`` → ``CategoryScore``.

Span hierarchy (produced by judge_core):
  judge.{category}              ← EVALUATOR  (set here)
    judge.{category}.analysis   ← LLM        (set by run_two_pass_judge)
    judge.{category}.score      ← LLM        (set by run_two_pass_judge)
"""

from __future__ import annotations

import json
from dataclasses import dataclass

import structlog
from openinference.semconv.trace import OpenInferenceSpanKindValues, SpanAttributes
from opentelemetry.trace import Status, StatusCode

from m4_agent_host.config import settings
from m4_agent_host.infrastructure.ai.agents import ExtractionTrace
from m4_agent_host.infrastructure.ai.judge_core import (
    DIMENSIONS,
    JudgeResult,
    JudgeRubric,
    build_analysis_system,
    build_judge_user_message,
    run_two_pass_judge,
)
from m4_agent_host.infrastructure.telemetry.tracer import tracer

log = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class CategoryScore:
    """Judge scores for one extraction category."""

    category: str
    faithfulness: float
    precision: float
    reasoning_quality: float
    schema_score: float
    citation_quality: float
    judge_reasoning: str
    judge_thinking: str

    @property
    def mean(self) -> float:
        return (self.faithfulness + self.precision + self.reasoning_quality + self.schema_score + self.citation_quality) / 5


# ---------------------------------------------------------------------------
# Schema hints (per-category enum/field descriptions for the schema dimension)
# ---------------------------------------------------------------------------

_SCHEMA_HINTS = {
    "entities": "relationship: colleague/client/vendor/partner/prospect/unknown",
    "risks": "severity: high/medium/low; summary (not description); project (not project_slug)",
    "opportunities": "type: new_logo/expansion/workflow/lateral; name (not description)",
    "tasks": "action (not description); owner should be a person name or null; due_hint (not eta)",
}

# Production dimensions — all unconditional (no ground truth in production).
_PROD_DIMENSIONS = [
    DIMENSIONS["faithfulness"],
    DIMENSIONS["precision"],
    DIMENSIONS["reasoning_quality"],
    DIMENSIONS["schema"],
    DIMENSIONS["citation_quality"],
]


# ---------------------------------------------------------------------------
# Rubric builder
# ---------------------------------------------------------------------------

def _build_rubric(category: str) -> JudgeRubric:
    """Build a production JudgeRubric for one extraction category."""
    schema_hint = _SCHEMA_HINTS.get(category, "fields should match expected types")
    # Create a temporary rubric to render the system prompt via build_analysis_system.
    temp_rubric = JudgeRubric(name=category, dimensions=_PROD_DIMENSIONS, analysis_system="")
    analysis_system = build_analysis_system(temp_rubric, category, schema_hint)
    return JudgeRubric(name=category, dimensions=_PROD_DIMENSIONS, analysis_system=analysis_system)


# ---------------------------------------------------------------------------
# Core scoring
# ---------------------------------------------------------------------------

async def judge_category(
    category: str,
    trace: ExtractionTrace,
    transcript: str,
    *,
    ground_truth: list | None = None,
) -> CategoryScore:
    """Score one extraction category with one focused judge per dimension.

    Creates a ``judge.{category}`` CHAIN span that groups per-dimension
    EVALUATOR spans.  Each dimension gets its own two-pass judge call
    (analysis + score) so the model focuses on a single evaluation axis.

    Span hierarchy::

        judge.{category}                             [CHAIN]
          judge.{category}.faithfulness               [EVALUATOR]
            judge.{category}.faithfulness.analysis    [LLM]
            judge.{category}.faithfulness.score       [LLM]
          judge.{category}.precision                  [EVALUATOR]
            ...

    Args:
        category: One of entities/risks/opportunities/tasks.
        trace: The ExtractionTrace from the extraction run.
        transcript: Original meeting transcript.
        ground_truth: Optional ground-truth labels (enables completeness scoring).

    Returns:
        CategoryScore with per-dimension scores and judge reasoning.
    """
    model = settings.ollama_judge_model
    ollama_base = settings.ollama_base_url
    schema_hint = _SCHEMA_HINTS.get(category, "fields should match expected types")

    # Dimensions to evaluate — add completeness only when ground truth exists.
    dims = list(_PROD_DIMENSIONS)
    if ground_truth is not None:
        dims.append(DIMENSIONS["completeness"])

    # User message is the same for every dimension (transcript + items + ground truth).
    user_message = build_judge_user_message(
        transcript_excerpt=transcript[:5000],
        extractor_thinking=trace.p1_thinking[:3000] if trace.p1_thinking else "",
        extracted_items=trace.p2_result,
        ground_truth=ground_truth,
    )

    with tracer.start_as_current_span(f"judge.{category}") as cat_span:
        cat_span.set_attribute(
            SpanAttributes.OPENINFERENCE_SPAN_KIND,
            OpenInferenceSpanKindValues.CHAIN.value,
        )
        cat_span.set_attribute("judge.category", category)
        cat_span.set_attribute("judge.slug", trace.slug)
        cat_span.set_attribute(SpanAttributes.INPUT_VALUE,
            f"category={category} slug={trace.slug} items={len(trace.p2_result)} "
            f"transcript_chars={len(transcript)} thinking_chars={len(trace.p1_thinking)}")

        scores: dict[str, float] = {}
        reasonings: list[str] = []
        thinkings: list[str] = []

        for dim in dims:
            # Build a single-dimension rubric so the model focuses on one axis.
            temp = JudgeRubric(name=dim.name, dimensions=[dim], analysis_system="")
            analysis_system = build_analysis_system(temp, category, schema_hint, ground_truth)
            rubric = JudgeRubric(name=dim.name, dimensions=[dim], analysis_system=analysis_system)

            span_prefix = f"judge.{category}.{dim.name}"

            with tracer.start_as_current_span(span_prefix) as dim_span:
                dim_span.set_attribute(
                    SpanAttributes.OPENINFERENCE_SPAN_KIND,
                    OpenInferenceSpanKindValues.EVALUATOR.value,
                )
                dim_span.set_attribute("judge.dimension", dim.name)
                dim_span.set_attribute(SpanAttributes.INPUT_VALUE,
                    f"dimension={dim.name} category={category}")

                result: JudgeResult = await run_two_pass_judge(
                    rubric=rubric,
                    user_message=user_message,
                    span_prefix=span_prefix,
                    model=model,
                    ollama_base=ollama_base,
                    ground_truth=ground_truth,
                )

                if result.error:
                    log.warning("judge_dim_failed", category=category,
                                dimension=dim.name, error=result.error)
                    dim_span.set_status(Status(StatusCode.ERROR, result.error))
                    scores[dim.name] = 0.0
                else:
                    dim_score = result.scores.get(dim.name, 0.0)
                    scores[dim.name] = dim_score
                    if result.reasoning:
                        reasonings.append(f"{dim.name}: {result.reasoning}")
                    if result.thinking:
                        thinkings.append(result.thinking)

                    dim_span.set_attribute(SpanAttributes.OUTPUT_VALUE, json.dumps({
                        dim.name: dim_score,
                        "reasoning": result.reasoning,
                    }))
                    dim_span.set_attribute(f"judge.{dim.name}", dim_score)
                    dim_span.set_status(Status(StatusCode.OK))

        combined_reasoning = " ".join(reasonings)
        combined_thinking = "\n---\n".join(thinkings)

        score = CategoryScore(
            category=category,
            faithfulness=scores.get("faithfulness", 0.0),
            precision=scores.get("precision", 0.0),
            reasoning_quality=scores.get("reasoning_quality", 0.0),
            schema_score=scores.get("schema", 0.0),
            citation_quality=scores.get("citation_quality", 0.0),
            judge_reasoning=combined_reasoning,
            judge_thinking=combined_thinking,
        )

        cat_span.set_attribute(SpanAttributes.OUTPUT_VALUE, json.dumps({
            "mean": round(score.mean, 3),
            "faithfulness": score.faithfulness,
            "precision": score.precision,
            "reasoning_quality": score.reasoning_quality,
            "schema": score.schema_score,
            "citation_quality": score.citation_quality,
        }))
        cat_span.set_attribute("judge.mean_score", score.mean)
        cat_span.set_status(Status(StatusCode.OK))
        return score


def _zero_score(category: str, thinking: str = "", reasoning: str = "") -> CategoryScore:
    return CategoryScore(
        category=category,
        faithfulness=0.0,
        precision=0.0,
        reasoning_quality=0.0,
        schema_score=0.0,
        citation_quality=0.0,
        judge_reasoning=reasoning,
        judge_thinking=thinking,
    )


# ---------------------------------------------------------------------------
# Batch runner — called from ingest_service post-processing
# ---------------------------------------------------------------------------

async def judge_extraction(
    traces: list[ExtractionTrace],
    transcript: str,
) -> list[CategoryScore]:
    """Run per-category judges sequentially for all extraction traces.

    Sequential because Ollama serialises requests to a single model.

    Args:
        traces: ExtractionTrace objects from the extraction pipeline.
        transcript: Original meeting transcript.

    Returns:
        List of CategoryScore results, one per trace.
    """
    results: list[CategoryScore] = []
    for t in traces:
        score = await judge_category(t.category, t, transcript)
        results.append(score)
    return results
