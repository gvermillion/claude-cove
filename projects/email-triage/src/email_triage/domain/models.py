"""Domain models for the email-triage system.

Defines the core data shapes that flow through the pipeline:
  RawEmail → EncryptedEmail → TriageResult

RawEmail is intentionally never serialized to disk in plaintext. It flows
from IMAP fetchers directly to the GPG encryptor and exists only in process
heap memory.
"""

from __future__ import annotations

import enum
from datetime import datetime
from pathlib import Path

from pydantic import BaseModel, Field


class EmailPriority(str, enum.Enum):
    """Triage priority assigned by Claude.

    Determines routing urgency and whether a webhook notification fires.
    """

    CRITICAL = "critical"
    """Requires immediate human action (< 15 min response time)."""

    HIGH = "high"
    """Requires same-day response."""

    NORMAL = "normal"
    """Standard inbox queue."""

    LOW = "low"
    """Newsletters, FYI notifications — can be batched."""

    SPAM = "spam"
    """Unsolicited or phishing — archive without review."""


class EmailCategory(str, enum.Enum):
    """Semantic category assigned by Claude."""

    SECURITY_ALERT = "security_alert"
    FINANCIAL = "financial"
    LEGAL = "legal"
    CUSTOMER_SUPPORT = "customer_support"
    VENDOR = "vendor"
    INTERNAL = "internal"
    NEWSLETTER = "newsletter"
    NOTIFICATION = "notification"
    PERSONAL = "personal"
    UNKNOWN = "unknown"


class RawEmail(BaseModel):
    """An email fetched from an IMAP source, held entirely in process memory.

    This object MUST NOT be serialized to disk in plaintext. It is passed
    directly from the IMAP fetcher to the GPGEncryptor and then discarded.

    Attributes:
        uid: IMAP UID, scoped to the source provider and mailbox.
        source: Provider identifier, e.g. "gmail" or "proton".
        message_id: RFC 2822 Message-ID header value.
        fetched_at: UTC timestamp when the message was retrieved.
        raw_bytes: Complete RFC 2822 message bytes (headers + body).
    """

    uid: str
    source: str
    message_id: str
    fetched_at: datetime
    raw_bytes: bytes

    model_config = {"arbitrary_types_allowed": True}


class EncryptedEmail(BaseModel):
    """A GPG-encrypted email ready to be written to the queue directory.

    The encrypted_bytes field contains ASCII-armored GPG ciphertext. No
    plaintext data is present in this model.

    Attributes:
        queue_path: Opaque file path: <timestamp_ns>_<random8>.gpg.
        encrypted_bytes: ASCII-armored GPG ciphertext.
        source: Provider identifier carried through for observability.
        fetched_at: Original fetch timestamp for latency tracking.
    """

    queue_path: Path
    encrypted_bytes: bytes
    source: str
    fetched_at: datetime


class ActionItem(BaseModel):
    """A concrete action the recipient should take, extracted by Claude.

    Attributes:
        description: Human-readable description of the action.
        deadline: ISO date string if a deadline is mentioned, else None.
        is_time_sensitive: True if the action must happen within 24 hours.
    """

    description: str
    deadline: str | None = None
    is_time_sensitive: bool = False


class TriageResult(BaseModel):
    """The complete output of one Claude triage analysis.

    This is the data contract between ClaudeTriageClient and TriageService.
    It is persisted as JSON to the done/ directory alongside the archived
    .gpg file for auditability.

    Attributes:
        queue_file: Basename of the .gpg file that was processed.
        priority: Urgency level assigned by Claude.
        category: Semantic category assigned by Claude.
        summary: Neutral one-paragraph summary, must not contain PII.
        subject_line: Extracted from the email Subject header.
        sender_domain: Domain portion of the From address only.
        action_items: Concrete next steps extracted from the email body.
        requires_reply: Whether the email explicitly requires a response.
        estimated_read_minutes: Estimated time to read and action the email.
        routing_tags: Optional tags for downstream routing (e.g. "finance-team").
        analyzed_at: UTC timestamp when Claude completed analysis.
        model_used: Exact model ID used for analysis.
        input_tokens: Token count from the API response usage object.
        output_tokens: Token count from the API response usage object.
    """

    queue_file: str
    priority: EmailPriority
    category: EmailCategory
    summary: str = Field(..., max_length=500)
    subject_line: str
    sender_domain: str
    action_items: list[ActionItem] = Field(default_factory=list)
    requires_reply: bool
    estimated_read_minutes: float
    routing_tags: list[str] = Field(default_factory=list)
    analyzed_at: datetime
    model_used: str
    input_tokens: int
    output_tokens: int

    @property
    def should_trigger_webhook(self) -> bool:
        """Returns True if this result warrants an immediate webhook notification."""
        return self.priority in (EmailPriority.CRITICAL, EmailPriority.HIGH)

    @property
    def archive_immediately(self) -> bool:
        """Returns True if the email should be archived without human review."""
        return self.priority == EmailPriority.SPAM

    @property
    def routing_label(self) -> str:
        """Composite label used for filesystem sub-directory routing.

        Example:
            >>> result.routing_label
            'critical/security_alert'
        """
        return f"{self.priority.value}/{self.category.value}"


class RelayRunStats(BaseModel):
    """Statistics from a single relay poll cycle.

    Attributes:
        fetched: Total emails fetched across all providers.
        encrypted: Emails successfully encrypted.
        enqueued: Emails successfully written to the queue.
        failed: Emails that encountered an error at any stage.
        duration_ms: Wall-clock duration of the poll cycle.
    """

    fetched: int = 0
    encrypted: int = 0
    enqueued: int = 0
    failed: int = 0
    duration_ms: float = 0.0
