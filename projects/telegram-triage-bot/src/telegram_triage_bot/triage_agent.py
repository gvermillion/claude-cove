"""Triage agent — Anthropic API calls for triage, drafting, and sending.

Three public async functions:
  - run_triage: fetches and classifies unread email via a manual agentic loop
  - generate_draft: drafts a reply for a single TriageItem
  - send_reply: re-fetches thread and sends an approved draft

The manual agentic loop in run_triage uses a custom `submit_triage_results`
tool alongside the Gmail MCP tools. When Claude calls `submit_triage_results`,
the loop captures the structured data and stops — giving structured TriageItem
objects without requiring Claude to output parseable JSON in free text.

Pattern: Use-case layer (orchestrates Anthropic API + MCP, no Telegram concerns).
"""

from __future__ import annotations

import json
from typing import Any

import structlog
from anthropic import AsyncAnthropic
from mcp import ClientSession
from pydantic import ValidationError

from .config import Settings
from .gmail_client import call_tool, list_tools, mcp_tools_as_anthropic_defs
from .models import TriageItem
from .prompts import (
    ACCOUNT_PERSONAS,
    DRAFT_INSTRUCTION,
    SEND_INSTRUCTION,
    SYSTEM_PROMPT,
    TRIAGE_INSTRUCTION,
)

log = structlog.get_logger(__name__)

# ------------------------------------------------------------------
# Tool definition for the custom submit_triage_results tool.
# Claude MUST call this to end the triage loop with structured data.
# ------------------------------------------------------------------
_SUBMIT_TRIAGE_TOOL: dict[str, Any] = {
    "name": "submit_triage_results",
    "description": (
        "Submit the complete triage classification results after processing all "
        "unread emails. Call this ONCE when you have finished classifying every "
        "thread. Do not call it until all threads have been examined."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "description": "All classified email threads",
                "items": {
                    "type": "object",
                    "required": [
                        "account",
                        "sender",
                        "subject",
                        "urgency",
                        "action",
                        "reasoning",
                        "body_snippet",
                        "is_sensitive",
                        "thread_id",
                        "message_id",
                    ],
                    "properties": {
                        "account": {"type": "string"},
                        "sender": {"type": "string"},
                        "subject": {"type": "string"},
                        "urgency": {
                            "type": "string",
                            "enum": ["critical", "high", "normal", "low", "informational"],
                        },
                        "action": {
                            "type": "string",
                            "enum": ["reply", "acknowledge", "forward", "file", "none"],
                        },
                        "reasoning": {"type": "string"},
                        "body_snippet": {"type": "string"},
                        "is_sensitive": {"type": "boolean"},
                        "thread_id": {"type": "string"},
                        "message_id": {"type": "string"},
                    },
                    "additionalProperties": False,
                },
            },
        },
        "required": ["items"],
        "additionalProperties": False,
    },
}

# Tool returned from Claude when it detects new messages in the thread.
_NEW_MESSAGES_TOOL: dict[str, Any] = {
    "name": "new_messages_detected",
    "description": (
        "Call this if new messages have arrived in the thread since triage, "
        "before sending the approved draft."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {
                "type": "string",
                "description": "Brief summary of the new messages",
            }
        },
        "required": ["summary"],
        "additionalProperties": False,
    },
}

# Sentinel returned by send_reply when new messages were detected.
NEW_MESSAGES_SENTINEL = "__NEW_MESSAGES__"


async def run_triage(
    account: str,
    mcp_session: ClientSession,
    settings: Settings,
) -> list[TriageItem]:
    """Triage the inbox for an account and return classified email threads.

    Runs a manual agentic loop where Claude uses Gmail MCP tools freely and
    must call `submit_triage_results` with structured classifications when done.
    The loop terminates when `submit_triage_results` is called or `end_turn`
    is reached (with a warning if no items were submitted).

    Args:
        account: Account identifier (e.g. "phdata").
        mcp_session: Initialized Gmail MCP ClientSession for this account.
        settings: Application settings (model, API key).

    Returns:
        List of TriageItem objects, ordered by urgency (critical first).
        Empty list if no unread messages or triage produced no items.

    Raises:
        anthropic.APIError: On API communication failures.
        RuntimeError: If the MCP session fails during tool execution.
    """
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    mcp_tools = await list_tools(mcp_session)
    gmail_tool_defs = mcp_tools_as_anthropic_defs(mcp_tools)
    all_tools = [*gmail_tool_defs, _SUBMIT_TRIAGE_TOOL]

    messages: list[dict[str, Any]] = [
        {
            "role": "user",
            "content": TRIAGE_INSTRUCTION.format(account=account),
        }
    ]

    submitted_items: list[dict[str, Any]] | None = None
    max_iterations = 30  # hard cap to prevent runaway loops
    iteration = 0

    log.info("triage_starting", account=account, model=settings.anthropic_model)

    while iteration < max_iterations:
        iteration += 1
        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            tools=all_tools,  # type: ignore[arg-type]
            messages=messages,  # type: ignore[arg-type]
        )

        log.debug(
            "triage_iteration",
            iteration=iteration,
            stop_reason=response.stop_reason,
            content_blocks=len(response.content),
        )

        if response.stop_reason == "end_turn":
            log.warning("triage_ended_without_submit", account=account, iteration=iteration)
            break

        # Append assistant turn to history.
        messages.append({"role": "assistant", "content": response.content})  # type: ignore[arg-type]

        tool_results: list[dict[str, Any]] = []
        stop_loop = False

        for block in response.content:
            if block.type != "tool_use":
                continue

            if block.name == "submit_triage_results":
                submitted_items = block.input.get("items", [])  # type: ignore[union-attr]
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": "Triage results submitted. Thank you.",
                    }
                )
                stop_loop = True
                log.info(
                    "triage_submitted",
                    account=account,
                    item_count=len(submitted_items),
                )
                break

            # Route all other tool calls to the Gmail MCP session.
            try:
                tool_output = await call_tool(
                    mcp_session,
                    block.name,
                    block.input or {},  # type: ignore[arg-type]
                )
            except RuntimeError as exc:
                tool_output = f"Error: {exc}"
                log.warning("mcp_tool_failed", tool=block.name, error=str(exc))

            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": tool_output,
                }
            )

        if stop_loop:
            break

        if tool_results:
            messages.append({"role": "user", "content": tool_results})  # type: ignore[arg-type]

    if submitted_items is None:
        log.warning("triage_no_items_submitted", account=account)
        return []

    # Parse and validate each item; skip malformed ones with a warning.
    parsed: list[TriageItem] = []
    for raw in submitted_items:
        try:
            parsed.append(TriageItem(**raw))
        except (ValidationError, TypeError) as exc:
            log.warning("triage_item_invalid", error=str(exc), raw=raw)

    # Sort: critical → high → normal → low → informational.
    urgency_order = {"critical": 0, "high": 1, "normal": 2, "low": 3, "informational": 4}
    parsed.sort(key=lambda x: urgency_order.get(x.urgency, 5))

    log.info("triage_complete", account=account, item_count=len(parsed))
    return parsed


async def generate_draft(
    item: TriageItem,
    mcp_session: ClientSession,
    settings: Settings,
) -> str:
    """Generate a draft reply for a single TriageItem.

    Claude fetches the full thread via Gmail MCP tools for context, then
    writes a draft reply using the persona appropriate for the account.
    Returns only the draft body text.

    Args:
        item: The TriageItem to draft a reply for.
        mcp_session: Initialized Gmail MCP ClientSession for the item's account.
        settings: Application settings.

    Returns:
        Draft reply body as a plain string.

    Raises:
        ValueError: If item is marked sensitive (no AI drafting allowed).
        anthropic.APIError: On API communication failures.
    """
    if item.is_sensitive:
        raise ValueError(
            f"Sensitive sender '{item.sender}' — AI drafting is not allowed. "
            "Draft this reply manually."
        )

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    mcp_tools = await list_tools(mcp_session)
    gmail_tool_defs = mcp_tools_as_anthropic_defs(mcp_tools)

    persona = ACCOUNT_PERSONAS.get(item.account, "Professional")
    instruction = DRAFT_INSTRUCTION.format(
        account=item.account,
        thread_id=item.thread_id,
        sender=item.sender,
        subject=item.subject,
        persona=persona,
    )

    messages: list[dict[str, Any]] = [{"role": "user", "content": instruction}]
    max_iterations = 15
    iteration = 0
    final_text = ""

    log.info(
        "draft_starting",
        account=item.account,
        thread_id=item.thread_id,
        sender=item.sender,
    )

    while iteration < max_iterations:
        iteration += 1
        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=gmail_tool_defs,  # type: ignore[arg-type]
            messages=messages,  # type: ignore[arg-type]
        )

        # Capture the latest text block as the draft.
        for block in response.content:
            if block.type == "text":
                final_text = block.text

        if response.stop_reason == "end_turn":
            break

        messages.append({"role": "assistant", "content": response.content})  # type: ignore[arg-type]

        tool_results: list[dict[str, Any]] = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            try:
                tool_output = await call_tool(mcp_session, block.name, block.input or {})  # type: ignore[arg-type]
            except RuntimeError as exc:
                tool_output = f"Error: {exc}"
            tool_results.append(
                {"type": "tool_result", "tool_use_id": block.id, "content": tool_output}
            )

        if tool_results:
            messages.append({"role": "user", "content": tool_results})  # type: ignore[arg-type]

    log.info(
        "draft_complete",
        account=item.account,
        thread_id=item.thread_id,
        draft_length=len(final_text),
    )
    return final_text.strip()


async def send_reply(
    item: TriageItem,
    draft_body: str,
    mcp_session: ClientSession,
    settings: Settings,
) -> str:
    """Re-fetch the thread and send an approved draft reply.

    Fetches the current thread to check for new messages since triage. If new
    messages are detected, returns NEW_MESSAGES_SENTINEL and a summary instead
    of sending. Otherwise sends the approved draft.

    Args:
        item: The TriageItem identifying the thread to reply to.
        draft_body: The approved draft text to send.
        mcp_session: Initialized Gmail MCP ClientSession for the item's account.
        settings: Application settings.

    Returns:
        Confirmation string on success, or NEW_MESSAGES_SENTINEL + "||" + summary
        if new messages were detected before sending.

    Raises:
        anthropic.APIError: On API communication failures.
    """
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    mcp_tools = await list_tools(mcp_session)
    gmail_tool_defs = mcp_tools_as_anthropic_defs(mcp_tools)
    all_tools = [*gmail_tool_defs, _NEW_MESSAGES_TOOL]

    instruction = SEND_INSTRUCTION.format(
        account=item.account,
        thread_id=item.thread_id,
        sender=item.sender,
        subject=item.subject,
        draft_body=draft_body,
    )

    messages: list[dict[str, Any]] = [{"role": "user", "content": instruction}]
    max_iterations = 15
    iteration = 0
    final_text = ""
    new_messages_summary: str | None = None

    log.info(
        "send_starting",
        account=item.account,
        thread_id=item.thread_id,
        sender=item.sender,
    )

    while iteration < max_iterations:
        iteration += 1
        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=all_tools,  # type: ignore[arg-type]
            messages=messages,  # type: ignore[arg-type]
        )

        for block in response.content:
            if block.type == "text":
                final_text = block.text

        if response.stop_reason == "end_turn":
            break

        messages.append({"role": "assistant", "content": response.content})  # type: ignore[arg-type]

        tool_results: list[dict[str, Any]] = []
        stop_loop = False

        for block in response.content:
            if block.type != "tool_use":
                continue

            if block.name == "new_messages_detected":
                new_messages_summary = block.input.get("summary", "New messages detected.")  # type: ignore[union-attr]
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": "New messages flagged. Stopping send.",
                    }
                )
                stop_loop = True
                log.warning(
                    "send_blocked_new_messages",
                    thread_id=item.thread_id,
                    summary=new_messages_summary,
                )
                break

            try:
                tool_output = await call_tool(mcp_session, block.name, block.input or {})  # type: ignore[arg-type]
            except RuntimeError as exc:
                tool_output = f"Error: {exc}"
                log.error("send_tool_error", tool=block.name, error=str(exc))

            tool_results.append(
                {"type": "tool_result", "tool_use_id": block.id, "content": tool_output}
            )

        if stop_loop:
            break

        if tool_results:
            messages.append({"role": "user", "content": tool_results})  # type: ignore[arg-type]

    if new_messages_summary is not None:
        return f"{NEW_MESSAGES_SENTINEL}||{new_messages_summary}"

    log.info(
        "send_complete",
        account=item.account,
        thread_id=item.thread_id,
        sender=item.sender,
    )
    return final_text.strip() or f"✅ Sent reply to {item.sender} — {item.subject}"
