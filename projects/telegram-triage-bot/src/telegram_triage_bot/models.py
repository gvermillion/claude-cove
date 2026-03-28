"""Data models for the Telegram triage bot.

All models use pydantic v2. These are the core domain types shared across
the session store, triage agent, and Telegram handlers.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# Valid account identifiers — must match keys in .mcp.json
VALID_ACCOUNTS: tuple[str, ...] = ("phdata", "pgmc", "multdems", "personal")

UrgencyLevel = Literal["critical", "high", "normal", "low", "informational"]
ActionType = Literal["reply", "acknowledge", "forward", "file", "none"]


class TriageItem(BaseModel):
    """A single classified email thread from triage.

    Produced by the triage agent after Claude classifies each unread thread.
    Immutable after creation — create a new instance if any field needs updating.
    """

    account: str = Field(description="Account identifier (e.g. 'phdata')")
    sender: str = Field(description="From: address of the most recent message")
    subject: str = Field(description="Subject line of the thread")
    urgency: UrgencyLevel = Field(description="Classified urgency tier")
    action: ActionType = Field(description="Recommended action type")
    reasoning: str = Field(description="One-sentence explanation of classification")
    body_snippet: str = Field(description="Short excerpt from the latest message body")
    is_sensitive: bool = Field(
        default=False,
        description="True if sender matches the sensitive senders list — no AI drafting",
    )
    thread_id: str = Field(description="Gmail thread ID for fetching and replying")
    message_id: str = Field(description="Gmail message ID of the latest message")


class DraftState(BaseModel):
    """A pending draft reply awaiting user action.

    Created when the agent generates a draft for a TriageItem.
    Tracks the current draft body and any pending user interaction.
    """

    item: TriageItem = Field(description="The triage item this draft responds to")
    draft_body: str = Field(description="Current draft reply body")
    telegram_message_id: int | None = Field(
        default=None,
        description="Telegram message ID of the displayed draft (for editing)",
    )
    edit_pending: bool = Field(
        default=False,
        description="True when waiting for user to send a replacement draft body",
    )


class SessionState(BaseModel):
    """Per-session state for a single triage session.

    Lives in the in-memory SessionStore. Lost on bot restart — this is acceptable
    for v0.5. The owner must run /triage again after a restart.
    """

    account: str = Field(description="Account being triaged in this session")
    triage_items: list[TriageItem] = Field(
        default_factory=list,
        description="All classified items from this triage run",
    )
    pending_drafts: list[DraftState] = Field(
        default_factory=list,
        description="Queue of drafts awaiting user review (FIFO)",
    )
    current_draft: DraftState | None = Field(
        default=None,
        description="The draft currently displayed to the user",
    )
    awaiting_totp: bool = Field(
        default=False,
        description="True when waiting for the user to enter a TOTP code",
    )
    last_totp_verified_at: datetime | None = Field(
        default=None,
        description="Timestamp of the most recent successful TOTP verification (UTC)",
    )
    triage_in_progress: bool = Field(
        default=False,
        description="True while the triage MCP session is running — guards against double-triage",
    )
    draft_in_progress: bool = Field(
        default=False,
        description="True while a draft is being generated",
    )
