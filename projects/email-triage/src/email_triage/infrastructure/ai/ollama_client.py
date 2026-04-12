"""Ollama-based email triage client — local model second-pass.

This is the second stage in the cascade pipeline. It handles emails that
the rule-based pre-filter couldn't classify with confidence, using a local
LLM served by Ollama (e.g. llama3.2, mistral, phi3, gemma2).

Because Ollama runs locally, there is no per-call cost, no data leaves the
VPS, and latency is bounded by the local hardware rather than network RTT.

Escalation contract: raises EscalateToNextAnalyzer when:
  - The model returns CRITICAL or HIGH priority (verify with Claude)
  - The model returns UNKNOWN category (uncertain, let Claude decide)
  - The model response cannot be parsed as a valid TriageResult

This means Ollama handles all LOW/NORMAL/SPAM definitively and forwards
only genuinely important or ambiguous emails to Claude (~5–15% of inbox).

Exports:
    OllamaTriageClient: Implements TriageAnalyzer via Ollama HTTP API.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

import httpx
import orjson
import structlog
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from email_triage.domain.exceptions import TriageAnalysisError
from email_triage.domain.models import (
    ActionItem,
    EmailCategory,
    EmailPriority,
    TriageResult,
)
from email_triage.infrastructure.ai.claude_client import ClaudeTriageClient
from email_triage.infrastructure.ai.rule_based_client import EscalateToNextAnalyzer

log: structlog.BoundLogger = structlog.get_logger(__name__)

# Ollama context window is smaller than Claude's. Keep prompt lean.
_BODY_MAX_CHARS = 3_000
_HEADERS_MAX_CHARS = 800

# Priorities that always escalate to the next (more powerful) analyzer.
_ESCALATE_PRIORITIES: frozenset[EmailPriority] = frozenset({
    EmailPriority.CRITICAL,
    EmailPriority.HIGH,
})

_OLLAMA_SYSTEM_PROMPT = """\
You are a concise email classifier. Analyse the provided email and return a \
JSON object with these exact fields:

{
  "priority": one of: "critical" | "high" | "normal" | "low" | "spam",
  "category": one of: "security_alert" | "financial" | "legal" | \
"customer_support" | "vendor" | "internal" | "newsletter" | "notification" | \
"personal" | "unknown",
  "summary": "one sentence, no PII, no email addresses",
  "subject_line": "exact subject header",
  "sender_domain": "domain only, e.g. stripe.com",
  "requires_reply": true or false,
  "estimated_read_minutes": 0.5 | 1 | 2 | 5 | 10,
  "action_items": [],
  "routing_tags": []
}

Priority rules:
- critical: security breaches, legal deadlines <24h, fraud alerts
- high: same-day response required, important business decisions
- normal: standard business email
- low: newsletters, notifications, FYI
- spam: unsolicited, phishing, scam

Return ONLY the JSON object. No explanation, no markdown, no code blocks.\
"""


class OllamaTriageClient:
    """Local LLM email classifier via the Ollama HTTP API (second cascade stage).

    Implements the TriageAnalyzer protocol. Uses Ollama's chat endpoint with
    JSON format mode to encourage structured output. Response is parsed and
    validated via Pydantic.

    On parse failure or high-priority classification, raises
    EscalateToNextAnalyzer so CascadeTriageClient passes the email to Claude.

    Attributes:
        _model: Ollama model name, e.g. "llama3.2:3b".
        _base_url: Ollama API base URL, default "http://localhost:11434".
        _timeout_seconds: Per-request timeout for model inference.
    """

    def __init__(
        self,
        model: str = "llama3.2:3b",
        base_url: str = "http://localhost:11434",
        timeout_seconds: float = 60.0,
    ) -> None:
        """Initialise the Ollama triage client.

        Args:
            model: Ollama model name to use for inference. Smaller models
                (3B–8B params) are sufficient for classification.
            base_url: Base URL of the Ollama API server.
            timeout_seconds: Maximum seconds to wait for a model response.
                Tune based on local hardware. Defaults to 60s.
        """
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

        log.info(
            "ollama_client_ready",
            model=model,
            base_url=base_url,
            timeout_seconds=timeout_seconds,
        )

    async def analyze(self, raw_email_bytes: bytes, queue_filename: str) -> TriageResult:
        """Classify an email using a local Ollama model.

        Args:
            raw_email_bytes: Complete RFC 2822 email bytes.
            queue_filename: Basename of the originating .gpg file.

        Returns:
            A TriageResult for LOW/NORMAL/SPAM emails with a known category.

        Raises:
            EscalateToNextAnalyzer: When the result is CRITICAL/HIGH, the
                category is UNKNOWN, or the model response cannot be parsed.
        """
        headers_text, body_text = ClaudeTriageClient._parse_email(raw_email_bytes)
        # Use a tighter body limit for local models (smaller context windows).
        body_text = body_text[:_BODY_MAX_CHARS]
        headers_text = headers_text[:_HEADERS_MAX_CHARS]

        user_message = (
            f"=== HEADERS ===\n{headers_text}\n\n"
            f"=== BODY ===\n{body_text}"
        )

        log.debug(
            "ollama_triage_request",
            queue_file=queue_filename,
            model=self._model,
        )

        raw_json = await self._call_ollama(user_message)
        return self._parse_response(raw_json, queue_filename)

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=20),
        stop=stop_after_attempt(2),
        retry=retry_if_exception_type(httpx.TransportError),
        before_sleep=before_sleep_log(log, logging.WARNING),
        reraise=True,
    )
    async def _call_ollama(self, user_message: str) -> bytes:
        """POST to the Ollama chat endpoint and return the raw response bytes.

        Uses Ollama's JSON format mode to strongly encourage structured output.
        Retries once on transient transport errors (connection reset, timeout).

        Args:
            user_message: Formatted email headers + body.

        Returns:
            Raw JSON response bytes from Ollama.

        Raises:
            EscalateToNextAnalyzer: If Ollama is unreachable after retries.
        """
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": _OLLAMA_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.0,
                "num_predict": 512,
            },
        }

        try:
            async with httpx.AsyncClient(
                base_url=self._base_url,
                timeout=self._timeout_seconds,
            ) as client:
                response = await client.post("/api/chat", content=orjson.dumps(payload))
                response.raise_for_status()
                return response.content
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            log.warning(
                "ollama_unreachable",
                error=str(exc),
                model=self._model,
            )
            raise EscalateToNextAnalyzer from exc
        except httpx.HTTPStatusError as exc:
            log.warning(
                "ollama_http_error",
                status_code=exc.response.status_code,
                model=self._model,
            )
            raise EscalateToNextAnalyzer from exc

    def _parse_response(self, raw_response: bytes, queue_filename: str) -> TriageResult:
        """Parse the Ollama API response and validate it as a TriageResult.

        Args:
            raw_response: Raw bytes from the Ollama API.
            queue_filename: Queue file basename for TriageResult.queue_file.

        Returns:
            A validated TriageResult.

        Raises:
            EscalateToNextAnalyzer: If the response cannot be parsed, validation
                fails, priority is CRITICAL/HIGH, or category is UNKNOWN.
        """
        try:
            api_response: dict[str, object] = orjson.loads(raw_response)
            content: str = str(
                api_response.get("message", {}).get("content", "")  # type: ignore[union-attr]
            )
            if not content:
                raise ValueError("Empty content in Ollama response")

            # Ollama JSON mode sometimes wraps in markdown fences despite instructions.
            content = _strip_markdown_fences(content)
            data: dict[str, object] = orjson.loads(content)

        except (orjson.JSONDecodeError, ValueError, KeyError) as exc:
            log.warning(
                "ollama_parse_failed",
                error=str(exc),
                queue_file=queue_filename,
            )
            raise EscalateToNextAnalyzer from exc

        try:
            priority = EmailPriority(str(data.get("priority", "normal")))
            category = EmailCategory(str(data.get("category", "unknown")))
        except ValueError as exc:
            log.warning("ollama_invalid_enum", error=str(exc), queue_file=queue_filename)
            raise EscalateToNextAnalyzer from exc

        # Escalate CRITICAL/HIGH to Claude — these are high-stakes, verify them.
        if priority in _ESCALATE_PRIORITIES:
            log.info(
                "ollama_escalating_high_priority",
                queue_file=queue_filename,
                priority=priority.value,
            )
            raise EscalateToNextAnalyzer

        # Escalate UNKNOWN category — Ollama is uncertain, let Claude decide.
        if category == EmailCategory.UNKNOWN:
            log.info(
                "ollama_escalating_unknown_category",
                queue_file=queue_filename,
            )
            raise EscalateToNextAnalyzer

        action_items = [
            ActionItem(
                description=str(item.get("description", "")),
                deadline=item.get("deadline"),  # type: ignore[arg-type]
                is_time_sensitive=bool(item.get("is_time_sensitive", False)),
            )
            for item in (data.get("action_items") or [])  # type: ignore[union-attr]
        ]

        result = TriageResult(
            queue_file=queue_filename,
            priority=priority,
            category=category,
            summary=str(data.get("summary", ""))[:500],
            subject_line=str(data.get("subject_line", "")),
            sender_domain=str(data.get("sender_domain", "")),
            action_items=action_items,
            requires_reply=bool(data.get("requires_reply", False)),
            estimated_read_minutes=float(str(data.get("estimated_read_minutes", 1.0))),
            routing_tags=[str(t) for t in (data.get("routing_tags") or [])],  # type: ignore[union-attr]
            analyzed_at=datetime.now(UTC),
            model_used=self._model,
            input_tokens=0,   # Ollama doesn't report token counts in all versions.
            output_tokens=0,
        )

        log.info(
            "ollama_triage_complete",
            queue_file=queue_filename,
            priority=priority.value,
            category=category.value,
            model=self._model,
        )
        return result


def _strip_markdown_fences(text: str) -> str:
    """Remove markdown code fences from a string.

    Some models ignore the JSON-only instruction and wrap output in
    ```json ... ``` fences. Strip these before parsing.

    Args:
        text: Raw model output string.

    Returns:
        The string with leading/trailing markdown fences removed.
    """
    text = text.strip()
    if text.startswith("```"):
        # Remove opening fence (```json or ```)
        text = text[text.index("\n") + 1:] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[: text.rfind("```")]
    return text.strip()
