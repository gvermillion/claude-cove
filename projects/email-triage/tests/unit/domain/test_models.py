"""Unit tests for domain models.

Tests the business logic properties on TriageResult and the structural
integrity of all domain data models.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from email_triage.domain.models import (
    ActionItem,
    EmailCategory,
    EmailPriority,
    EncryptedEmail,
    RelayRunStats,
    TriageResult,
)


def _make_triage_result(
    priority: EmailPriority = EmailPriority.NORMAL,
    category: EmailCategory = EmailCategory.INTERNAL,
) -> TriageResult:
    """Factory for TriageResult with sensible defaults for testing."""
    return TriageResult(
        queue_file="1234567890_abc12345.gpg",
        priority=priority,
        category=category,
        summary="Test email summary.",
        subject_line="Test Subject",
        sender_domain="example.com",
        requires_reply=False,
        estimated_read_minutes=1.0,
        analyzed_at=datetime.now(UTC),
        model_used="claude-opus-4-6",
        input_tokens=100,
        output_tokens=50,
    )


class TestTriageResultWebhookTrigger:
    def test_critical_priority_triggers_webhook(self) -> None:
        # Arrange
        result = _make_triage_result(priority=EmailPriority.CRITICAL)

        # Act & Assert
        assert result.should_trigger_webhook is True

    def test_high_priority_triggers_webhook(self) -> None:
        # Arrange
        result = _make_triage_result(priority=EmailPriority.HIGH)

        # Act & Assert
        assert result.should_trigger_webhook is True

    def test_normal_priority_does_not_trigger_webhook(self) -> None:
        # Arrange
        result = _make_triage_result(priority=EmailPriority.NORMAL)

        # Act & Assert
        assert result.should_trigger_webhook is False

    def test_low_priority_does_not_trigger_webhook(self) -> None:
        # Arrange
        result = _make_triage_result(priority=EmailPriority.LOW)

        # Act & Assert
        assert result.should_trigger_webhook is False

    def test_spam_priority_does_not_trigger_webhook(self) -> None:
        # Arrange
        result = _make_triage_result(priority=EmailPriority.SPAM)

        # Act & Assert
        assert result.should_trigger_webhook is False


class TestTriageResultArchiveImmediately:
    def test_spam_archives_immediately(self) -> None:
        # Arrange
        result = _make_triage_result(priority=EmailPriority.SPAM)

        # Act & Assert
        assert result.archive_immediately is True

    def test_critical_does_not_archive_immediately(self) -> None:
        # Arrange
        result = _make_triage_result(priority=EmailPriority.CRITICAL)

        # Act & Assert
        assert result.archive_immediately is False

    def test_normal_does_not_archive_immediately(self) -> None:
        # Arrange
        result = _make_triage_result(priority=EmailPriority.NORMAL)

        # Act & Assert
        assert result.archive_immediately is False


class TestTriageResultRoutingLabel:
    def test_routing_label_combines_priority_and_category(self) -> None:
        # Arrange
        result = _make_triage_result(
            priority=EmailPriority.CRITICAL,
            category=EmailCategory.SECURITY_ALERT,
        )

        # Act
        label = result.routing_label

        # Assert
        assert label == "critical/security_alert"

    def test_routing_label_normal_newsletter(self) -> None:
        # Arrange
        result = _make_triage_result(
            priority=EmailPriority.LOW,
            category=EmailCategory.NEWSLETTER,
        )

        # Act & Assert
        assert result.routing_label == "low/newsletter"


class TestTriageResultSummaryLength:
    def test_summary_exceeding_500_chars_raises_validation_error(self) -> None:
        # Arrange
        long_summary = "x" * 501

        # Act & Assert
        with pytest.raises(Exception):  # pydantic ValidationError
            TriageResult(
                queue_file="test.gpg",
                priority=EmailPriority.NORMAL,
                category=EmailCategory.UNKNOWN,
                summary=long_summary,
                subject_line="Subject",
                sender_domain="example.com",
                requires_reply=False,
                estimated_read_minutes=1.0,
                analyzed_at=datetime.now(UTC),
                model_used="claude-opus-4-6",
                input_tokens=0,
                output_tokens=0,
            )

    def test_summary_at_500_chars_is_valid(self) -> None:
        # Arrange
        exact_summary = "x" * 500

        # Act
        result = TriageResult(
            queue_file="test.gpg",
            priority=EmailPriority.NORMAL,
            category=EmailCategory.UNKNOWN,
            summary=exact_summary,
            subject_line="Subject",
            sender_domain="example.com",
            requires_reply=False,
            estimated_read_minutes=1.0,
            analyzed_at=datetime.now(UTC),
            model_used="claude-opus-4-6",
            input_tokens=0,
            output_tokens=0,
        )

        # Assert
        assert len(result.summary) == 500


class TestActionItem:
    def test_action_item_defaults_deadline_to_none(self) -> None:
        # Arrange & Act
        item = ActionItem(description="Do something", is_time_sensitive=False)

        # Assert
        assert item.deadline is None

    def test_action_item_with_deadline(self) -> None:
        # Arrange & Act
        item = ActionItem(
            description="Sign contract",
            deadline="2026-04-15",
            is_time_sensitive=True,
        )

        # Assert
        assert item.deadline == "2026-04-15"
        assert item.is_time_sensitive is True


class TestRelayRunStats:
    def test_relay_run_stats_defaults_to_zero(self) -> None:
        # Arrange & Act
        stats = RelayRunStats()

        # Assert
        assert stats.fetched == 0
        assert stats.encrypted == 0
        assert stats.enqueued == 0
        assert stats.failed == 0
        assert stats.duration_ms == 0.0
