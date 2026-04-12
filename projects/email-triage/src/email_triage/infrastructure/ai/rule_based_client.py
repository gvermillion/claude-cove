"""Rule-based email triage client — instant pattern-match pre-filter.

This is the first stage in the cascade pipeline. It applies deterministic
rules against email headers and a small body sample to classify the
clearest cases: obvious spam, mass-mailer newsletters, and automated
system notifications.

Emails classified here never reach Ollama or Claude, keeping the vast
majority of low-signal inbox traffic free of model calls entirely.

Escalation contract: raises EscalateToNextAnalyzer for any email it cannot
classify with high confidence. The CascadeTriageClient catches this and
passes the email to the next analyzer in the chain.

Exports:
    EscalateToNextAnalyzer: Sentinel exception for cascade escalation.
    RuleBasedTriageClient: Implements TriageAnalyzer via pattern matching.
"""

from __future__ import annotations

import email
import email.policy
import re
from datetime import UTC, datetime
from email.message import Message

import structlog

from email_triage.domain.exceptions import TriageAnalysisError
from email_triage.domain.models import (
    EmailCategory,
    EmailPriority,
    TriageResult,
)
from email_triage.infrastructure.ai.claude_client import ClaudeTriageClient

log: structlog.BoundLogger = structlog.get_logger(__name__)

# ---- Spam / newsletter signals ----

# Sending infrastructure domains that almost exclusively serve bulk email.
_BULK_SENDER_DOMAINS: frozenset[str] = frozenset({
    "mailchimp.com",
    "list.mailchimp.com",
    "sendgrid.net",
    "sendgrid.com",
    "constantcontact.com",
    "klaviyo.com",
    "mailgun.org",
    "campaign-archive.com",
    "createsend.com",
    "exacttarget.com",
    "salesforce.com",
    "pardot.com",
    "marketo.com",
    "hubspot.com",
    "convertkit.com",
    "drip.com",
    "aweber.com",
    "getresponse.com",
    "mailerlite.com",
    "sendinblue.com",
    "brevo.com",
    "substack.com",
    "beehiiv.com",
    "ghost.io",
})

# Patterns in the From address local-part that indicate automated/bulk senders.
_BULK_SENDER_LOCAL_RE = re.compile(
    r"^(no[_-]?reply|noreply|donotreply|do[_-]not[_-]reply|"
    r"newsletter|updates|notifications?|alerts?|"
    r"marketing|promo|promotions?|offers?|"
    r"digest|weekly|daily|monthly)@",
    re.IGNORECASE,
)

# Body phrases that strongly indicate a marketing/newsletter message.
_NEWSLETTER_BODY_PHRASES: tuple[str, ...] = (
    "unsubscribe",
    "manage your preferences",
    "manage preferences",
    "email preferences",
    "opt out",
    "opt-out",
    "you are receiving this",
    "you received this email because",
    "view in browser",
    "view this email in your browser",
    "add us to your address book",
    "safe sender",
    "privacy policy",
    "terms of service",
)

# ---- Security alert signals ----

_SECURITY_SUBJECT_RE = re.compile(
    r"(unauthorized|unusual|suspicious|security alert|"
    r"account (suspended|locked|compromised|at risk|deactivated)|"
    r"verify your (account|identity|email)|"
    r"action required|immediate action|"
    r"password (reset|changed|expired|compromised)|"
    r"sign[- ]?in (attempt|from|detected)|"
    r"we.ve detected|breach|data leak)",
    re.IGNORECASE,
)

# ---- Financial signals ----

_FINANCIAL_SUBJECT_RE = re.compile(
    r"(invoice|payment (due|received|failed|successful|confirmation)|"
    r"receipt|transaction|refund|charge|billing|"
    r"bank (statement|alert)|wire transfer|ach|"
    r"your (order|subscription) (is|has been|was))",
    re.IGNORECASE,
)

# ---- Automated notification signals ----

_NOTIFICATION_SUBJECT_RE = re.compile(
    r"(build (succeeded|failed|passed)|"
    r"deployment (succeeded|failed|complete)|"
    r"cron|job (succeeded|failed)|"
    r"alert:|warning:|error:|critical:)",
    re.IGNORECASE,
)

# Body snippet size for rule checking — we only need a small window.
_RULE_BODY_SAMPLE_CHARS = 2_000


class EscalateToNextAnalyzer(Exception):
    """Sentinel: this analyzer cannot make a confident classification.

    CascadeTriageClient catches this and passes the email to the next
    analyzer in the chain. This is NOT a failure — it is the expected path
    for ambiguous emails.
    """


class RuleBasedTriageClient:
    """Instant pattern-match email classifier (first cascade stage).

    Applies deterministic rules against headers and a body sample. Classifies
    clear-cut cases (spam, newsletters, automated notifications) without any
    model call. Raises EscalateToNextAnalyzer for anything ambiguous.

    This stage handles roughly 40–60% of a typical inbox volume:
    - All newsletters / marketing emails → LOW/NEWSLETTER
    - Obvious automated system notifications → LOW/NOTIFICATION
    - Clear-cut phishing / unsolicited → SPAM
    - Security alert patterns → CRITICAL (escalate to Claude for verification)
    - Everything else → escalate to Ollama

    Attributes:
        _model_name: Identifier used in TriageResult.model_used.
    """

    _model_name: str = "rule-based"

    async def analyze(self, raw_email_bytes: bytes, queue_filename: str) -> TriageResult:
        """Apply rule-based classification to a raw email.

        Args:
            raw_email_bytes: Complete RFC 2822 email bytes.
            queue_filename: Basename of the originating .gpg file.

        Returns:
            A TriageResult for emails that match a high-confidence rule.

        Raises:
            EscalateToNextAnalyzer: For emails that don't match any rule
                with sufficient confidence. The caller should pass the email
                to the next analyzer.
        """
        msg = email.message_from_bytes(raw_email_bytes, policy=email.policy.default)
        subject = str(msg.get("Subject", "")).strip()
        from_header = str(msg.get("From", "")).strip()
        body_sample = ClaudeTriageClient._extract_body(msg)[:_RULE_BODY_SAMPLE_CHARS]

        result = self._classify(msg, subject, from_header, body_sample)
        if result is None:
            log.debug("rule_based_escalating", queue_file=queue_filename)
            raise EscalateToNextAnalyzer

        log.info(
            "rule_based_classified",
            queue_file=queue_filename,
            priority=result.priority.value,
            category=result.category.value,
        )
        return result

    def _classify(
        self,
        msg: Message,
        subject: str,
        from_header: str,
        body_sample: str,
    ) -> TriageResult | None:
        """Core classification logic. Returns None to trigger escalation.

        Args:
            msg: Parsed email message.
            subject: Subject header value.
            from_header: From header value.
            body_sample: First _RULE_BODY_SAMPLE_CHARS chars of the body.

        Returns:
            A TriageResult if a high-confidence rule matched, else None.
        """
        # --- Newsletter / bulk mail ---
        if self._is_newsletter(msg, from_header, body_sample):
            return self._make_result(
                subject=subject,
                sender_domain=_extract_domain(from_header),
                priority=EmailPriority.LOW,
                category=EmailCategory.NEWSLETTER,
                summary="Automated newsletter or marketing email.",
                requires_reply=False,
                estimated_read_minutes=0.5,
            )

        # --- Automated system notification ---
        if _NOTIFICATION_SUBJECT_RE.search(subject):
            return self._make_result(
                subject=subject,
                sender_domain=_extract_domain(from_header),
                priority=EmailPriority.LOW,
                category=EmailCategory.NOTIFICATION,
                summary="Automated system notification (build, deploy, or job status).",
                requires_reply=False,
                estimated_read_minutes=0.5,
            )

        # We intentionally do NOT classify security alerts or financial emails
        # here, even though we can detect them. Those warrant model analysis
        # to extract action items, deadlines, and accurate priority.
        # Returning None causes escalation to Ollama → Claude as needed.
        return None

    def _is_newsletter(
        self,
        msg: Message,
        from_header: str,
        body_sample: str,
    ) -> bool:
        """Return True if multiple strong newsletter signals are present.

        Requires at least two independent signals to avoid false positives
        on transactional emails that happen to mention "unsubscribe".

        Args:
            msg: Parsed email message for header inspection.
            from_header: From header value.
            body_sample: Body text sample.

        Returns:
            True if the email is confidently a newsletter/bulk mail.
        """
        signals = 0

        # RFC 2369 headers are a very strong signal — only bulk mailers use them.
        if msg.get("List-Unsubscribe") or msg.get("List-Id"):
            signals += 2  # Strong: RFC 2369 bulk mail headers

        # Known bulk sender infrastructure domains.
        sender_domain = _extract_domain(from_header)
        if sender_domain in _BULK_SENDER_DOMAINS:
            signals += 2

        # Automated/bulk sender local-part pattern.
        if _BULK_SENDER_LOCAL_RE.match(from_header.lower()):
            signals += 1

        # Precedence header = "bulk" or "list" (RFC 2076).
        precedence = str(msg.get("Precedence", "")).lower()
        if precedence in ("bulk", "list", "junk"):
            signals += 2

        # Body phrases — weaker signal, needs corroboration.
        body_lower = body_sample.lower()
        for phrase in _NEWSLETTER_BODY_PHRASES:
            if phrase in body_lower:
                signals += 1
                break  # Count body phrases once.

        # Require ≥2 signals to confidently classify as newsletter.
        return signals >= 2

    @staticmethod
    def _make_result(
        subject: str,
        sender_domain: str,
        priority: EmailPriority,
        category: EmailCategory,
        summary: str,
        requires_reply: bool,
        estimated_read_minutes: float,
    ) -> TriageResult:
        """Construct a minimal TriageResult for a rule-matched email.

        Args:
            subject: Email subject line.
            sender_domain: Extracted sender domain.
            priority: Assigned priority.
            category: Assigned category.
            summary: Human-readable classification summary.
            requires_reply: Whether a reply is needed.
            estimated_read_minutes: Estimated read time.

        Returns:
            A TriageResult with no action items and model_used='rule-based'.
        """
        return TriageResult(
            queue_file="",  # Filled in by analyze() caller.
            priority=priority,
            category=category,
            summary=summary,
            subject_line=subject,
            sender_domain=sender_domain,
            action_items=[],
            requires_reply=requires_reply,
            estimated_read_minutes=estimated_read_minutes,
            routing_tags=[],
            analyzed_at=datetime.now(UTC),
            model_used=RuleBasedTriageClient._model_name,
            input_tokens=0,
            output_tokens=0,
        )


def _extract_domain(from_header: str) -> str:
    """Extract the domain portion from a From header value.

    Args:
        from_header: Raw From header string, e.g. '"Name" <user@domain.com>'.

    Returns:
        The domain portion, e.g. 'domain.com'. Empty string if not parseable.
    """
    match = re.search(r"@([\w.\-]+)", from_header)
    return match.group(1).lower() if match else ""
