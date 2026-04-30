"""Single-call LLM synthesizer — consolidates, dedupes, and re-categorizes signals.

Uses Ollama /api/chat with format:"json" to produce a clean MeetingSignals
object. Graceful degradation: any failure returns the input signals unchanged.
"""

from __future__ import annotations

import json
from datetime import date

import httpx
import structlog
from openinference.semconv.trace import MessageAttributes, OpenInferenceSpanKindValues, SpanAttributes
from opentelemetry.trace import Status, StatusCode

from m4_agent_host.config import settings
from m4_agent_host.domain.models import MeetingSignals
from m4_agent_host.infrastructure.telemetry.tracer import tracer

log = structlog.get_logger(__name__)

_SYNTHESIZE_SYSTEM = (
    "You are a meeting-intelligence synthesizer. You receive four extracted lists\n"
    "(entities, risks, opportunities, tasks) and the meeting transcript. Your job\n"
    "is to return a SINGLE consolidated object that is deduped, correctly\n"
    "categorized, and grounded in the transcript.\n\n"
    "Rules (apply in order):\n\n"
    "1. CANONICAL CATEGORY. Every item has exactly one home:\n"
    "   - task       → someone must do something; has an actor OR imperative verb\n"
    "                   AND a commitment or time marker.\n"
    "   - risk       → a named threat, blocker, uncertainty, or negative trend.\n"
    "   - opportunity→ a named deal, account, expansion, or capability to pursue.\n"
    "   - entity     → a person.\n"
    "   If an item fits multiple, pick the strongest signal and DROP the weaker\n"
    "   duplicates. Never emit the same signal under two categories.\n\n"
    "2. DEDUPE. Two items are duplicates if they refer to the same underlying\n"
    "   signal even if worded differently. Merge into one, keeping the most\n"
    "   specific phrasing and union of fields.\n\n"
    "3. FACTS ARE NOT TASKS. Remove items that are observations, metrics, news,\n"
    "   or historical statements with no action required.\n\n"
    "4. ENTITIES. Drop any person whose name matches a company/product token\n"
    "   from the STOPLIST. Drop single-name entries unless the transcript\n"
    "   unambiguously identifies one person by that single name.\n\n"
    "5. GROUND EVERY ITEM. For each surviving item, cite one short verbatim\n"
    "   quote from the transcript (<=160 chars) as `evidence`. If you cannot\n"
    "   cite, drop the item with reason=\"ungrounded\".\n\n"
    "6. RELATIVE DATES STAY RELATIVE. Do not convert \"next week\", \"Monday\",\n"
    "   \"1-2 weeks\", \"May\" to ISO dates. Leave them as the original phrase in\n"
    "   `due_hint`.\n\n"
    "Populate `dropped` with every removed item and its reason:\n"
    "fact_not_task | duplicate | stoplist_entity | ungrounded | wrong_category.\n\n"
    "Output ONLY valid JSON matching the schema. No prose, no markdown."
)


async def synthesize(
    signals: MeetingSignals,
    transcript: str,
    meeting_date: date | None,
    stoplist: frozenset[str],
) -> MeetingSignals:
    """Consolidate extracted signals via a single LLM call.

    On any failure (network, parse, validation), returns the original
    signals unchanged — synthesis must never break the pipeline.
    """
    with tracer.start_as_current_span("synthesize.merge") as span:
        span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.CHAIN.value)
        span.set_attribute(SpanAttributes.LLM_MODEL_NAME, settings.ollama_reasoning_model)
        span.set_attribute("synth.input_entities", len(signals.entities))
        span.set_attribute("synth.input_risks", len(signals.risks))
        span.set_attribute("synth.input_opportunities", len(signals.opportunities))
        span.set_attribute("synth.input_tasks", len(signals.tasks))
        span.set_attribute("synth.transcript_chars", len(transcript))

        user_msg = _build_user_message(signals, transcript, meeting_date, stoplist)
        span.set_attribute(SpanAttributes.INPUT_VALUE, user_msg[:3000])

        # Set LLM input messages for Phoenix visibility
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}", "system")
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}", _SYNTHESIZE_SYSTEM)
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_ROLE}", "user")
        span.set_attribute(f"{SpanAttributes.LLM_INPUT_MESSAGES}.1.{MessageAttributes.MESSAGE_CONTENT}", user_msg[:5000])

        try:
            ollama_base = settings.ollama_base_url.rstrip("/").removesuffix("/v1")
            payload = {
                "model": settings.ollama_reasoning_model,
                "format": "json",
                "think": False,
                "stream": False,
                "options": {"num_predict": 4096},
                "messages": [
                    {"role": "system", "content": _SYNTHESIZE_SYSTEM},
                    {"role": "user", "content": user_msg},
                ],
            }

            log.info("synthesize_started", model=settings.ollama_reasoning_model)
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{ollama_base}/api/chat",
                    json=payload,
                    timeout=600.0,
                )
                resp.raise_for_status()

            body = resp.json()
            content: str = body["message"].get("content") or ""
            prompt_tokens: int = body.get("prompt_eval_count", 0)
            completion_tokens: int = body.get("eval_count", 0)

            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, prompt_tokens)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, completion_tokens)
            span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, prompt_tokens + completion_tokens)

            # Set LLM output messages for Phoenix visibility
            span.set_attribute(f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_ROLE}", "assistant")
            span.set_attribute(f"{SpanAttributes.LLM_OUTPUT_MESSAGES}.0.{MessageAttributes.MESSAGE_CONTENT}", content[:3000])

            data = json.loads(content.strip())

            # Preserve synthesis and p1_thinking from the original signals —
            # the LLM synthesizer doesn't produce these.
            data.setdefault("synthesis", signals.synthesis.model_dump() if signals.synthesis else None)
            data.setdefault("p1_thinking", signals.p1_thinking)

            result = MeetingSignals.model_validate(data)

            span.set_attribute("synth.output_entities", len(result.entities))
            span.set_attribute("synth.output_risks", len(result.risks))
            span.set_attribute("synth.output_opportunities", len(result.opportunities))
            span.set_attribute("synth.output_tasks", len(result.tasks))
            span.set_attribute("synth.dropped_count", len(result.dropped))
            span.set_attribute(SpanAttributes.OUTPUT_VALUE,
                f"entities={len(result.entities)} risks={len(result.risks)} "
                f"opps={len(result.opportunities)} tasks={len(result.tasks)} "
                f"dropped={len(result.dropped)}")
            span.set_status(Status(StatusCode.OK))

            log.info(
                "synthesize_complete",
                entities=len(result.entities),
                risks=len(result.risks),
                opportunities=len(result.opportunities),
                tasks=len(result.tasks),
                dropped=len(result.dropped),
                prompt_tok=prompt_tokens,
                completion_tok=completion_tokens,
            )
            return result

        except Exception as exc:
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            span.set_attribute("synth.error", str(exc))
            log.warning("synthesize_failed", error=str(exc), error_type=type(exc).__name__)
            return signals


def _build_user_message(
    signals: MeetingSignals,
    transcript: str,
    meeting_date: date | None,
    stoplist: frozenset[str],
) -> str:
    """Build the user message containing all inputs for the synthesizer."""
    parts = [
        f"MEETING_DATE: {meeting_date.isoformat() if meeting_date else 'unknown'}",
        f"STOPLIST: {', '.join(sorted(stoplist))}",
        "",
        "ENTITIES:",
        json.dumps([e.model_dump() for e in signals.entities], default=str),
        "",
        "RISKS:",
        json.dumps([r.model_dump() for r in signals.risks], default=str),
        "",
        "OPPORTUNITIES:",
        json.dumps([o.model_dump() for o in signals.opportunities], default=str),
        "",
        "TASKS:",
        json.dumps([t.model_dump() for t in signals.tasks], default=str),
        "",
        "TRANSCRIPT:",
        transcript[:8000],
    ]
    return "\n".join(parts)
