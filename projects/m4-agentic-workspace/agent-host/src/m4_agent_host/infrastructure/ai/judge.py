"""Per-category production judge — async post-processing after vault write.

Scores each extraction category independently against the source transcript
and the extractor's chain-of-thought reasoning. Unlike the offline eval judge
(tests/eval/eval_judge.py) which compares against ground-truth labels, this
production judge evaluates whether extractions are faithful to the source text
and whether the extractor's reasoning supports its conclusions.

Uses qwen3 with think:true so the judge's own reasoning chain is visible in
Phoenix traces — the judge scrutinises the extractor's reasoning.

Rubric (0.0-1.0 each):
  faithfulness  Are extracted items accurate to what was actually discussed?
  precision     Are all items grounded in the transcript (not hallucinated)?
  reasoning     Does the extractor's chain-of-thought logically support its output?
  schema        Are enum values and field formats correct?
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass

import httpx
import structlog
from openinference.semconv.trace import MessageAttributes, OpenInferenceSpanKindValues, SpanAttributes
from opentelemetry.trace import Status, StatusCode

from m4_agent_host.config import settings
from m4_agent_host.infrastructure.ai.agents import ExtractionTrace
from m4_agent_host.infrastructure.ai.tokenizer import count_tokens
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
# Per-category system prompts
# ---------------------------------------------------------------------------

_JUDGE_SYSTEM_TEMPLATE = """\
You are an expert evaluator assessing how well an AI agent extracted {category} from a meeting transcript.

You will receive:
1. TRANSCRIPT EXCERPT — the source text the extractor worked from
2. EXTRACTOR REASONING — the chain-of-thought the extractor used (may be empty)
3. EXTRACTED ITEMS — the structured output the extractor produced

Score on five dimensions (0.0-1.0 each):

RUBRIC:
- faithfulness (0.0-1.0): Are the extracted items accurate to what was actually discussed? Penalize distortions or fabrications.
- precision (0.0-1.0): Are ALL items grounded in the transcript? Penalize hallucinated signals not supported by the text.
- reasoning_quality (0.0-1.0): Does the extractor's chain-of-thought logically support the extracted items? Score 0.5 if no reasoning was provided. Penalize reasoning that contradicts the output or misses obvious signals.
- schema (0.0-1.0): Are enum values correct? ({schema_hint})
- citation_quality (0.0-1.0): Do extracted items have accurate evidence quotes that match the source text at cited line numbers? Score 0.5 if no citations/evidence fields are present. Penalize fabricated quotes or wrong line numbers.

If no items were extracted AND the transcript genuinely contains none for this category, score 1.0 across all dimensions.

Output ONLY valid JSON — no markdown fences, no explanation outside the JSON:
{{"faithfulness": 0.0, "precision": 0.0, "reasoning_quality": 0.0, "schema": 0.0, "citation_quality": 0.0, "reasoning": "..."}}
"""

_SCHEMA_HINTS = {
    "entities": "relationship: client/colleague/stakeholder/vendor/unknown",
    "risks": "severity: high/medium/low",
    "opportunities": "type: expansion/workflow/lateral",
    "tasks": "owner should be a person name or null, description should be actionable",
}


def _build_judge_prompt(
    category: str,
    transcript_excerpt: str,
    extractor_thinking: str,
    extracted_items: list[dict],
) -> tuple[str, str]:
    """Build system + user prompts for judging one category.

    Returns:
        (system_prompt, user_prompt)
    """
    system = _JUDGE_SYSTEM_TEMPLATE.format(
        category=category,
        schema_hint=_SCHEMA_HINTS.get(category, "fields should match expected types"),
    )

    lines = ["=== TRANSCRIPT EXCERPT ===", transcript_excerpt[:5000], ""]

    if extractor_thinking:
        lines.extend(["=== EXTRACTOR REASONING ===", extractor_thinking[:3000], ""])
    else:
        lines.extend(["=== EXTRACTOR REASONING ===", "(no reasoning captured)", ""])

    lines.append(f"=== EXTRACTED {category.upper()} ===")
    for item in extracted_items:
        lines.append(f"  {json.dumps(item)}")

    return system, "\n".join(lines)


# ---------------------------------------------------------------------------
# Core scoring
# ---------------------------------------------------------------------------

async def judge_category(
    category: str,
    trace: ExtractionTrace,
    transcript: str,
) -> CategoryScore:
    """Score one extraction category using the judge LLM.

    Args:
        category: One of entities/risks/opportunities/tasks.
        trace: The ExtractionTrace from the extraction run.
        transcript: Original meeting transcript.

    Returns:
        CategoryScore with per-dimension scores and judge reasoning.
    """
    model = settings.ollama_judge_model
    ollama_base = settings.ollama_base_url.rstrip("/").removesuffix("/v1")

    system, user_msg = _build_judge_prompt(
        category=category,
        transcript_excerpt=transcript[:5000],
        extractor_thinking=trace.p1_thinking,
        extracted_items=trace.p2_result,
    )

    with tracer.start_as_current_span(f"judge.{category}") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.LLM.value)
        span.set_attribute(SpanAttributes.LLM_MODEL_NAME, model)
        span.set_attribute("judge.category", category)
        span.set_attribute("judge.slug", trace.slug)
        span.set_attribute(SpanAttributes.INPUT_VALUE, user_msg[:2000])
        # OpenInference LLM input messages
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}", "system")
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}", system)
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_ROLE}", "user")
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_CONTENT}", user_msg)

        try:
            log.info("judge_llm_started", category=category, slug=trace.slug, model=model)
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{ollama_base}/api/chat",
                    json={
                        "model": model,
                        "think": True,
                        "stream": False,
                        "options": {"num_predict": 4096},
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user_msg},
                        ],
                    },
                    timeout=180.0,
                )
                resp.raise_for_status()

            payload = resp.json()
            msg = payload["message"]
            raw_content: str = msg.get("content") or ""
            thinking: str = (msg.get("thinking") or "").strip()

            prompt_tokens = payload.get("prompt_eval_count", 0)
            completion_tokens = payload.get("eval_count", 0)
            # Ollama eval_count includes thinking tokens — estimate the split.
            thinking_tokens: int = count_tokens(thinking, model) if thinking else 0
            visible_tokens: int = max(completion_tokens - thinking_tokens, 0)
            log.info(
                "judge_llm_complete",
                category=category,
                slug=trace.slug,
                prompt_tok=prompt_tokens,
                completion_tok=completion_tokens,
                thinking_tok=thinking_tokens,
                visible_tok=visible_tokens,
            )

            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, prompt_tokens)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, completion_tokens)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, prompt_tokens + completion_tokens)
            if thinking:
                span.set_attribute("llm.thinking_tokens", thinking_tokens)
                span.set_attribute("llm.visible_tokens", visible_tokens)

            # Parse — handle <think> tags embedded in content (older Ollama)
            think_match = re.search(r"<think>(.*?)</think>", raw_content, re.DOTALL)
            if think_match:
                thinking = think_match.group(1).strip()
                raw_content = raw_content[think_match.end():].strip()

            start = raw_content.find("{")
            end = raw_content.rfind("}") + 1
            if start == -1 or end == 0:
                log.warning("judge_no_json", category=category, content=raw_content[:200])
                span.set_status(Status(StatusCode.ERROR, "No JSON in judge response"))
                return _zero_score(category, thinking, "No JSON found in judge response")

            scores = json.loads(raw_content[start:end])

            result = CategoryScore(
                category=category,
                faithfulness=float(scores.get("faithfulness", 0.0)),
                precision=float(scores.get("precision", 0.0)),
                reasoning_quality=float(scores.get("reasoning_quality", 0.0)),
                schema_score=float(scores.get("schema", 0.0)),
                citation_quality=float(scores.get("citation_quality", 0.0)),
                judge_reasoning=scores.get("reasoning", ""),
                judge_thinking=thinking,
            )

            span.set_attribute(SpanAttributes.OUTPUT_VALUE, json.dumps({
                "mean": result.mean,
                "faithfulness": result.faithfulness,
                "precision": result.precision,
                "reasoning_quality": result.reasoning_quality,
                "schema": result.schema_score,
                "citation_quality": result.citation_quality,
            }))
            span.set_attribute("judge.mean_score", result.mean)
            span.set_attribute("judge.faithfulness", result.faithfulness)
            span.set_attribute("judge.precision", result.precision)
            span.set_attribute("judge.reasoning_quality", result.reasoning_quality)
            span.set_attribute("judge.schema_score", result.schema_score)
            span.set_attribute("judge.citation_quality", result.citation_quality)
            # OpenInference LLM output message
            span.set_attribute(f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}", "assistant")
            span.set_attribute(f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}", raw_content)

            # Expose judge chain-of-thought so it's visible in Phoenix traces
            if thinking:
                span.set_attribute("llm.thinking", thinking)
            if result.judge_reasoning:
                span.set_attribute("judge.reasoning", result.judge_reasoning)

            span.set_status(Status(StatusCode.OK))
            return result

        except Exception as exc:
            log.warning("judge_failed", category=category, error=str(exc))
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            return _zero_score(category, "", str(exc))


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
        with tracer.start_as_current_span("judge_extraction") as span:
            span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
            span.set_attribute("judge.slug", t.slug)
            span.set_attribute("judge.category", t.category)

            score = await judge_category(t.category, t, transcript)
            results.append(score)

            span.set_attribute("judge.mean_score", score.mean)
            span.set_attribute("judge.faithfulness", score.faithfulness)
            span.set_attribute("judge.precision", score.precision)
            span.set_attribute("judge.reasoning_quality", score.reasoning_quality)
            span.set_attribute("judge.schema_score", score.schema_score)
            span.set_attribute("judge.citation_quality", score.citation_quality)
            span.set_status(Status(StatusCode.OK))

    return results
