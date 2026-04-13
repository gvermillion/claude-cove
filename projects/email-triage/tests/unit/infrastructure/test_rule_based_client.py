"""Unit tests for RuleBasedTriageClient.

Tests the newsletter detection signal logic, automated notification detection,
and correct escalation for emails that don't match any rule.
"""

from __future__ import annotations

import asyncio

import pytest

from email_triage.domain.models import EmailCategory, EmailPriority
from email_triage.infrastructure.ai.rule_based_client import (
    EscalateToNextAnalyzer,
    RuleBasedTriageClient,
    _extract_domain,
)


def _make_raw_email(
    subject: str = "Test",
    from_header: str = "sender@example.com",
    extra_headers: dict[str, str] | None = None,
    body: str = "Hello world.",
) -> bytes:
    """Construct minimal RFC 2822 email bytes for testing."""
    headers = f"From: {from_header}\r\nSubject: {subject}\r\n"
    for name, value in (extra_headers or {}).items():
        headers += f"{name}: {value}\r\n"
    return (headers + f"\r\n{body}").encode()


class TestNewsletterDetection:
    @pytest.mark.asyncio
    async def test_list_unsubscribe_header_plus_bulk_domain_classifies_as_newsletter(self) -> None:
        # Arrange — two strong signals: RFC 2369 header + bulk sender domain
        raw = _make_raw_email(
            from_header="newsletter@mailchimp.com",
            extra_headers={"List-Unsubscribe": "<mailto:unsub@example.com>"},
        )
        client = RuleBasedTriageClient()

        # Act
        result = await client.analyze(raw, "test.gpg")

        # Assert
        assert result.priority == EmailPriority.LOW
        assert result.category == EmailCategory.NEWSLETTER
        assert result.requires_reply is False

    @pytest.mark.asyncio
    async def test_list_id_header_plus_noreply_sender_classifies_as_newsletter(self) -> None:
        # Arrange
        raw = _make_raw_email(
            from_header="noreply@company.com",
            extra_headers={"List-Id": "<updates.company.com>"},
        )
        client = RuleBasedTriageClient()

        # Act
        result = await client.analyze(raw, "test.gpg")

        # Assert
        assert result.category == EmailCategory.NEWSLETTER

    @pytest.mark.asyncio
    async def test_precedence_bulk_plus_unsubscribe_body_classifies_as_newsletter(self) -> None:
        # Arrange
        raw = _make_raw_email(
            from_header="updates@somecompany.com",
            extra_headers={"Precedence": "bulk"},
            body="Great deals this week! Click here to unsubscribe from future emails.",
        )
        client = RuleBasedTriageClient()

        # Act
        result = await client.analyze(raw, "test.gpg")

        # Assert
        assert result.category == EmailCategory.NEWSLETTER

    @pytest.mark.asyncio
    async def test_single_newsletter_signal_escalates(self) -> None:
        # Arrange — only ONE signal (body phrase), not enough for classification
        raw = _make_raw_email(
            from_header="alice@example.com",
            body="Thanks for your order! Click here to unsubscribe.",
        )
        client = RuleBasedTriageClient()

        # Act & Assert — one signal is not enough
        with pytest.raises(EscalateToNextAnalyzer):
            await client.analyze(raw, "test.gpg")


class TestNotificationDetection:
    @pytest.mark.asyncio
    async def test_build_failed_subject_classifies_as_notification(self) -> None:
        # Arrange
        raw = _make_raw_email(subject="[CI] Build failed: main branch")
        client = RuleBasedTriageClient()

        # Act
        result = await client.analyze(raw, "test.gpg")

        # Assert
        assert result.priority == EmailPriority.LOW
        assert result.category == EmailCategory.NOTIFICATION

    @pytest.mark.asyncio
    async def test_deployment_succeeded_classifies_as_notification(self) -> None:
        # Arrange
        raw = _make_raw_email(subject="Deployment succeeded to production")
        client = RuleBasedTriageClient()

        # Act
        result = await client.analyze(raw, "test.gpg")

        # Assert
        assert result.category == EmailCategory.NOTIFICATION

    @pytest.mark.asyncio
    async def test_cron_job_subject_classifies_as_notification(self) -> None:
        # Arrange
        raw = _make_raw_email(subject="Cron job output: backup.sh")
        client = RuleBasedTriageClient()

        # Act
        result = await client.analyze(raw, "test.gpg")

        # Assert
        assert result.category == EmailCategory.NOTIFICATION


class TestEscalation:
    @pytest.mark.asyncio
    async def test_regular_business_email_escalates(self) -> None:
        # Arrange
        raw = _make_raw_email(
            subject="Re: Project proposal",
            from_header="colleague@company.com",
            body="Following up on our discussion yesterday.",
        )
        client = RuleBasedTriageClient()

        # Act & Assert
        with pytest.raises(EscalateToNextAnalyzer):
            await client.analyze(raw, "test.gpg")

    @pytest.mark.asyncio
    async def test_security_alert_email_escalates_for_model_verification(self) -> None:
        # Arrange — security patterns are intentionally escalated to models
        raw = _make_raw_email(
            subject="Unusual sign-in attempt detected on your account",
            from_header="security@google.com",
        )
        client = RuleBasedTriageClient()

        # Act & Assert — we escalate rather than classify without context
        with pytest.raises(EscalateToNextAnalyzer):
            await client.analyze(raw, "test.gpg")

    @pytest.mark.asyncio
    async def test_invoice_email_escalates(self) -> None:
        # Arrange
        raw = _make_raw_email(
            subject="Invoice #1234 from Acme Corp",
            from_header="billing@acme.com",
        )
        client = RuleBasedTriageClient()

        # Act & Assert
        with pytest.raises(EscalateToNextAnalyzer):
            await client.analyze(raw, "test.gpg")


class TestHelpers:
    def test_extract_domain_from_angle_bracket_address(self) -> None:
        assert _extract_domain('"Alice" <alice@example.com>') == "example.com"

    def test_extract_domain_from_plain_address(self) -> None:
        assert _extract_domain("bob@company.io") == "company.io"

    def test_extract_domain_returns_empty_for_unparseable(self) -> None:
        assert _extract_domain("not an email") == ""
