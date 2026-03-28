"""Telegram message formatting utilities.

All functions are pure (no I/O, no side effects). Handles MarkdownV2 escaping,
message chunking (Telegram's 4096-char limit), triage item rendering, and
draft preview rendering.

Pattern: Pure utility functions (no class needed — these don't share state).
"""

from __future__ import annotations

import re

from .models import DraftState, TriageItem

# Telegram's maximum message length.
MAX_MESSAGE_LENGTH = 4096

# Characters that must be escaped in MarkdownV2.
_MD2_SPECIAL = r"\_*[]()~`>#+-=|{}.!"
_MD2_ESCAPE_RE = re.compile(r"([" + re.escape(_MD2_SPECIAL) + r"])")


def escape_md(text: str) -> str:
    """Escape a string for Telegram MarkdownV2 format.

    Args:
        text: Plain text to escape.

    Returns:
        Text with all MarkdownV2 special characters backslash-escaped.

    Example:
        >>> escape_md("Hello (world)!")
        'Hello \\\\(world\\\\)\\\\!'
    """
    return _MD2_ESCAPE_RE.sub(r"\\\1", text)


def urgency_emoji(urgency: str) -> str:
    """Return an emoji representing the urgency level.

    Args:
        urgency: One of critical, high, normal, low, informational.

    Returns:
        Single emoji character.
    """
    return {
        "critical": "🔴",
        "high": "🟠",
        "normal": "🟡",
        "low": "🟢",
        "informational": "⚪",
    }.get(urgency, "⚪")


def action_label(action: str) -> str:
    """Return a short label for an action type.

    Args:
        action: One of reply, acknowledge, forward, file, none.

    Returns:
        Short display label.
    """
    return {
        "reply": "Reply",
        "acknowledge": "Ack",
        "forward": "Forward",
        "file": "File",
        "none": "Skip",
    }.get(action, action)


def format_triage_item(item: TriageItem, index: int) -> str:
    """Format a single TriageItem as a Telegram MarkdownV2 message.

    Args:
        item: The classified email thread.
        index: 1-based display index for reference.

    Returns:
        MarkdownV2-formatted string ready to send to Telegram.
    """
    emoji = urgency_emoji(item.urgency)
    label = action_label(item.action)
    sensitive_flag = " ⚠️ SENSITIVE" if item.is_sensitive else ""

    lines = [
        f"{emoji} *{escape_md(item.subject)}*{escape_md(sensitive_flag)}",
        f"From: {escape_md(item.sender)}",
        f"Urgency: {escape_md(item.urgency)} · Action: {escape_md(label)}",
        f"_{escape_md(item.reasoning)}_",
    ]

    if item.body_snippet:
        snippet = item.body_snippet[:300]
        if len(item.body_snippet) > 300:
            snippet += "…"
        lines.append(f"\n```\n{escape_md(snippet)}\n```")

    return "\n".join(lines)


def format_triage_summary(items: list[TriageItem]) -> list[str]:
    """Format a complete triage run into a list of Telegram messages.

    Groups informational items into a compact table at the end. All other
    items are rendered individually. Messages are split to respect the 4096
    character limit.

    Args:
        items: All classified TriageItems, expected sorted by urgency.

    Returns:
        List of MarkdownV2 strings, each within Telegram's message limit.
    """
    if not items:
        return ["📭 No unread messages in the last 48 hours\\."]

    actionable = [i for i in items if i.urgency != "informational"]
    informational = [i for i in items if i.urgency == "informational"]

    messages: list[str] = []

    # Header
    messages.append(
        f"📬 *Triage complete* — {escape_md(str(len(items)))} messages\n"
        f"{escape_md(str(len(actionable)))} need attention · "
        f"{escape_md(str(len(informational)))} informational"
    )

    # Actionable items — one message per item (avoids chunking complexity).
    for idx, item in enumerate(actionable, start=1):
        messages.append(format_triage_item(item, idx))

    # Informational summary table.
    if informational:
        rows = [f"  • {escape_md(i.sender[:40])} — {escape_md(i.subject[:50])}" for i in informational]
        info_block = "*Informational \\(" + escape_md(str(len(informational))) + "\\)*\n" + "\n".join(rows)
        messages.append(info_block)

    # Count items that need a reply/ack.
    needs_draft = [i for i in actionable if i.action in ("reply", "acknowledge") and not i.is_sensitive]
    sensitive_count = sum(1 for i in actionable if i.is_sensitive)

    footer_parts = []
    if needs_draft:
        footer_parts.append(
            f"*{escape_md(str(len(needs_draft)))} draft{'s' if len(needs_draft) != 1 else ''} queued*"
        )
    if sensitive_count:
        footer_parts.append(f"⚠️ {escape_md(str(sensitive_count))} sensitive — draft manually")
    if not needs_draft and not sensitive_count:
        footer_parts.append("Nothing to draft\\.")

    messages.append("\n".join(footer_parts) if footer_parts else "")
    return [m for m in messages if m]


def format_draft_preview(draft: DraftState, position: str = "") -> str:
    """Format a draft for Telegram display with Approve / Edit / Skip prompt.

    Args:
        draft: The DraftState containing item metadata and draft body.
        position: Optional position indicator like "1 of 3".

    Returns:
        MarkdownV2-formatted draft preview string.
    """
    item = draft.item
    pos_suffix = f" \\({escape_md(position)}\\)" if position else ""

    header = (
        f"✏️ *Draft reply*{pos_suffix}\n"
        f"To: {escape_md(item.sender)}\n"
        f"Re: {escape_md(item.subject)}\n"
    )

    body = f"```\n{escape_md(draft.draft_body)}\n```"

    footer = "\nTap a button below to *Approve*, *Edit*, or *Skip* this draft\\."

    return header + "\n" + body + footer


def format_sensitive_item(item: TriageItem) -> str:
    """Format a sensitive-sender item with the manual-draft warning.

    Args:
        item: A TriageItem with is_sensitive=True.

    Returns:
        MarkdownV2-formatted warning message.
    """
    return (
        f"⚠️ *SENSITIVE — draft manually*\n"
        f"From: {escape_md(item.sender)}\n"
        f"Re: {escape_md(item.subject)}\n"
        f"_{escape_md(item.reasoning)}_\n\n"
        f"Reply to this thread manually\\."
    )


def split_message(text: str, max_length: int = MAX_MESSAGE_LENGTH) -> list[str]:
    """Split a long plain-text string into chunks within Telegram's size limit.

    Splits on newlines where possible to avoid breaking mid-sentence.

    Args:
        text: Text to split.
        max_length: Maximum chunk length in characters.

    Returns:
        List of strings, each at most max_length characters.
    """
    if len(text) <= max_length:
        return [text]

    chunks: list[str] = []
    current = ""
    for line in text.splitlines(keepends=True):
        if len(current) + len(line) > max_length:
            if current:
                chunks.append(current.rstrip())
            current = line
        else:
            current += line
    if current:
        chunks.append(current.rstrip())
    return chunks
