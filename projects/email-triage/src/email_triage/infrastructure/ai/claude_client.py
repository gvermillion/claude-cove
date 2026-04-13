"""Claude-based email triage client (Adapter pattern).

Wraps the Anthropic SDK to provide structured email classification via
forced tool use. Using tool_choice={"type": "tool", "name": "..."} forces
Claude to always return a single tool call — eliminating JSON parsing
fragility and making the output schema the ground truth.

Email parsing (headers + body extraction) happens here, before the content
reaches Claude. The full raw email bytes are parsed in memory; only the
relevant text is sent to the API.

Exports:
    ClaudeTriageClient: Implements the TriageAnalyzer protocol.
"""

from __future__ import annotations

import email
import email.policy
import html
import logging
import re
from datetime import UTC, datetime
from email.message import Message

import anthropic
import structlog
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from email_triage.domain.exceptions import TriageAnalysisError
from email_triage.domain.models import ActionItem, EmailCategory, EmailPriority, TriageResult
from email_triage.infrastructure.ai.prompts import TRIAGE_SYSTEM_PROMPT, TRIAGE_TOOL_SCHEMA

log: structlog.BoundLogger = structlog.get_logger(__name__)

# Truncate body at this many characters before sending to Claude.
# Leaves headroom for system prompt, tool definition, and headers.
_BODY_MAX_CHARS = 8_000

# Maximum characters of header block to include.
_HEADERS_MAX_CHARS = 2_000

# HTML tag pattern for simple stripping.
_HTML_TAG_RE = re.compile(r"<[^>]+>")


class ClaudeTriageClient:
    """Adapter wrapping the Anthropic SDK for structured email triage.

    Implements the TriageAnalyzer protocol. Uses forced tool use
    (tool_choice={"type": "tool"}) so Claude always returns exactly one
    record_triage_result tool call — the response structure is guaranteed
    by the API, not by fragile string parsing.

    Rate-limit errors are retried with exponential backoff via tenacity.
    Other API errors propagate as TriageAnalysisError.

    Attributes:
        _client: Anthropic SDK client.
        _model: Claude model ID, e.g. "claude-opus-4-6".
        _max_tokens: Maximum output tokens per call.
        _temperature: Sampling temperature (0.0 for deterministic output).
    """

    def __init__(
        self,
        api_key: str,
        model: str = "claude-opus-4-6",
        max_tokens: int = 1024,
        temperature: float = 0.0,
    ) -> None:
        """Initialise the Claude triage client.

        Args:
            api_key: Anthropic API key (ANTHROPIC_API_KEY).
            model: Claude model ID to use. Defaults to claude-opus-4-6.
            max_tokens: Maximum tokens in the response. 1024 is sufficient
                for structured tool output.
            temperature: Sampling temperature. 0.0 gives deterministic
                classification results.
        """
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model
        self._max_tokens = max_tokens
        self._temperature = temperature

        log.info(
            "claude_triage_client_ready",
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )

    async def analyze(self, raw_email_bytes: bytes, queue_filename: str) -> TriageResult:
        """Analyse an email and return a structured TriageResult.

        Parses headers and body from the raw email bytes, sends them to
        Claude with forced tool use, and maps the tool call arguments to a
        validated TriageResult model.

        Args:
            raw_email_bytes: Complete RFC 2822 email bytes (headers + body).
            queue_filename: Basename of the .gpg file being processed.
                Stored in TriageResult.queue_file for traceability.

        Returns:
            A fully validated TriageResult.

        Raises:
            TriageAnalysisError: If the API call fails after retries or if
                Claude returns an unexpected response structure.
        """
        headers_text, body_text = self._parse_email(raw_email_bytes)
        user_message = self._build_user_message(headers_text, body_text)

        log.debug(
            "claude_triage_request",
            queue_file=queue_filename,
            headers_chars=len(headers_text),
            body_chars=len(body_text),
        )

        response = await self._call_claude(user_message)
        return self._map_response_to_result(response, queue_filename)

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type(anthropic.RateLimitError),
        before_sleep=before_sleep_log(log, logging.WARNING),
        reraise=True,
    )
    async def _call_claude(self, user_message: str) -> anthropic.types.Message:
        """Call the Claude API with forced tool use and retry on rate limits.

        Args:
            user_message: The formatted prompt combining email headers + body.

        Returns:
            The raw Anthropic API Message response.

        Raises:
            TriageAnalysisError: On non-rate-limit API errors.
            anthropic.RateLimitError: Retried up to 3 times by tenacity.
        """
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=self._max_tokens,
                temperature=self._temperature,
                system=TRIAGE_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
                tools=[TRIAGE_TOOL_SCHEMA],  # type: ignore[list-item]
                tool_choice={"type": "tool", "name": "record_triage_result"},
            )
        except anthropic.RateLimitError:
            raise
        except anthropic.APIError as exc:
            raise TriageAnalysisError(
                f"Anthropic API error during triage: {exc}"
            ) from exc

        log.info(
            "claude_triage_response",
            model=self._model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            stop_reason=response.stop_reason,
        )
        return response

    def _map_response_to_result(
        self,
        response: anthropic.types.Message,
        queue_filename: str,
    ) -> TriageResult:
        """Map an Anthropic API response to a validated TriageResult.

        Args:
            response: The raw API response from _call_claude.
            queue_filename: Passed through to TriageResult.queue_file.

        Returns:
            A validated TriageResult model instance.

        Raises:
            TriageAnalysisError: If no tool_use block is found in the response.
        """
        tool_use_block = next(
            (block for block in response.content if block.type == "tool_use"),
            None,
        )
        if tool_use_block is None:
            raise TriageAnalysisError(
                f"Claude response contained no tool_use block for {queue_filename}. "
                f"Stop reason: {response.stop_reason!r}. "
                f"Content types: {[b.type for b in response.content]}"
            )

        args: dict[str, object] = tool_use_block.input  # type: ignore[assignment]

        action_items = [
            ActionItem(
                description=str(item.get("description", "")),
                deadline=item.get("deadline"),  # type: ignore[arg-type]
                is_time_sensitive=bool(item.get("is_time_sensitive", False)),
            )
            for item in (args.get("action_items") or [])  # type: ignore[union-attr]
        ]

        return TriageResult(
            queue_file=queue_filename,
            priority=EmailPriority(str(args["priority"])),
            category=EmailCategory(str(args["category"])),
            summary=str(args["summary"]),
            subject_line=str(args["subject_line"]),
            sender_domain=str(args["sender_domain"]),
            action_items=action_items,
            requires_reply=bool(args["requires_reply"]),
            estimated_read_minutes=float(str(args["estimated_read_minutes"])),
            routing_tags=[str(t) for t in (args.get("routing_tags") or [])],  # type: ignore[union-attr]
            analyzed_at=datetime.now(UTC),
            model_used=self._model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )

    @staticmethod
    def _parse_email(raw_bytes: bytes) -> tuple[str, str]:
        """Parse RFC 2822 email bytes into a headers string and body string.

        Extracts a curated set of headers (Subject, From, Date, To, CC)
        and decodes the body, preferring plain text over HTML. HTML bodies
        are stripped of tags. Both are truncated to safe limits.

        Args:
            raw_bytes: Complete RFC 2822 email bytes.

        Returns:
            A tuple of (headers_text, body_text), both as plain strings.
        """
        msg: Message = email.message_from_bytes(raw_bytes, policy=email.policy.default)

        # Curated headers — only what Claude needs; no full addresses.
        header_lines: list[str] = []
        for header_name in ("Subject", "Date", "From", "To", "CC", "Content-Type"):
            value = msg.get(header_name, "")
            if value:
                header_lines.append(f"{header_name}: {value}")
        headers_text = "\n".join(header_lines)[:_HEADERS_MAX_CHARS]

        body_text = ClaudeTriageClient._extract_body(msg)
        return headers_text, body_text[:_BODY_MAX_CHARS]

    @staticmethod
    def _extract_body(msg: Message) -> str:
        """Extract the best available text body from an email Message.

        Prefers text/plain. Falls back to text/html (with tag stripping).
        Returns an empty string if no readable body is found.

        Args:
            msg: Parsed email.message.Message object.

        Returns:
            Plain text body content.
        """
        plain_part: str | None = None
        html_part: str | None = None

        if msg.is_multipart():
            for part in msg.walk():
                ct = part.get_content_type()
                if ct == "text/plain" and plain_part is None:
                    payload = part.get_payload(decode=True)
                    if isinstance(payload, bytes):
                        charset = part.get_content_charset() or "utf-8"
                        plain_part = payload.decode(charset, errors="replace")
                elif ct == "text/html" and html_part is None:
                    payload = part.get_payload(decode=True)
                    if isinstance(payload, bytes):
                        charset = part.get_content_charset() or "utf-8"
                        html_part = payload.decode(charset, errors="replace")
        else:
            payload = msg.get_payload(decode=True)
            if isinstance(payload, bytes):
                charset = msg.get_content_charset() or "utf-8"
                text = payload.decode(charset, errors="replace")
                if msg.get_content_type() == "text/html":
                    html_part = text
                else:
                    plain_part = text

        if plain_part is not None:
            return plain_part
        if html_part is not None:
            # Strip HTML tags and unescape entities.
            stripped = _HTML_TAG_RE.sub(" ", html_part)
            return html.unescape(stripped)
        return ""

    @staticmethod
    def _build_user_message(headers_text: str, body_text: str) -> str:
        """Format the user message combining email headers and body.

        Args:
            headers_text: Selected email headers as plain text.
            body_text: Decoded email body, truncated.

        Returns:
            Formatted user message string for the Claude API call.
        """
        return (
            "Please triage the following email.\n\n"
            "=== HEADERS ===\n"
            f"{headers_text}\n\n"
            "=== BODY ===\n"
            f"{body_text}\n\n"
            "Call record_triage_result with your analysis."
        )
