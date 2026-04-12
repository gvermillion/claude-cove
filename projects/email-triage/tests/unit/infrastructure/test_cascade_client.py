"""Unit tests for CascadeTriageClient.

Tests the chain iteration logic: first stage resolution, escalation to
next stage, all-stages-escalate error, and ValueError on empty chain.
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from email_triage.domain.exceptions import TriageAnalysisError
from email_triage.domain.models import EmailCategory, EmailPriority, TriageResult
from email_triage.infrastructure.ai.cascade_client import CascadeTriageClient
from email_triage.infrastructure.ai.rule_based_client import EscalateToNextAnalyzer


def _make_triage_result(
    priority: EmailPriority = EmailPriority.NORMAL,
    model_used: str = "test-model",
) -> TriageResult:
    """Factory for TriageResult test instances."""
    return TriageResult(
        queue_file="test.gpg",
        priority=priority,
        category=EmailCategory.INTERNAL,
        summary="Test.",
        subject_line="Test",
        sender_domain="example.com",
        requires_reply=False,
        estimated_read_minutes=1.0,
        analyzed_at=datetime.now(UTC),
        model_used=model_used,
        input_tokens=0,
        output_tokens=0,
    )


def _mock_escalating_analyzer() -> AsyncMock:
    """Create an analyzer mock that always escalates."""
    analyzer = AsyncMock()
    analyzer.analyze.side_effect = EscalateToNextAnalyzer
    return analyzer


def _mock_resolving_analyzer(result: TriageResult) -> AsyncMock:
    """Create an analyzer mock that returns a result."""
    analyzer = AsyncMock()
    analyzer.analyze.return_value = result
    return analyzer


class TestCascadeTriageClientChain:
    @pytest.mark.asyncio
    async def test_first_stage_resolves_without_calling_subsequent_stages(self) -> None:
        # Arrange
        result = _make_triage_result(model_used="rules")
        stage1 = _mock_resolving_analyzer(result)
        stage2 = _mock_escalating_analyzer()
        cascade = CascadeTriageClient(chain=[stage1, stage2])

        # Act
        final = await cascade.analyze(b"raw email", "test.gpg")

        # Assert
        assert final.model_used == "rules"
        stage2.analyze.assert_not_called()

    @pytest.mark.asyncio
    async def test_first_stage_escalates_second_stage_resolves(self) -> None:
        # Arrange
        result = _make_triage_result(model_used="ollama")
        stage1 = _mock_escalating_analyzer()
        stage2 = _mock_resolving_analyzer(result)
        stage3 = _mock_escalating_analyzer()
        cascade = CascadeTriageClient(chain=[stage1, stage2, stage3])

        # Act
        final = await cascade.analyze(b"raw email", "test.gpg")

        # Assert
        assert final.model_used == "ollama"
        stage3.analyze.assert_not_called()

    @pytest.mark.asyncio
    async def test_last_stage_always_called_when_all_prior_escalate(self) -> None:
        # Arrange
        result = _make_triage_result(model_used="claude-opus-4-6")
        stage1 = _mock_escalating_analyzer()
        stage2 = _mock_escalating_analyzer()
        stage3 = _mock_resolving_analyzer(result)
        cascade = CascadeTriageClient(chain=[stage1, stage2, stage3])

        # Act
        final = await cascade.analyze(b"raw email", "test.gpg")

        # Assert
        assert final.model_used == "claude-opus-4-6"
        stage1.analyze.assert_called_once()
        stage2.analyze.assert_called_once()
        stage3.analyze.assert_called_once()

    @pytest.mark.asyncio
    async def test_all_stages_escalating_raises_triage_analysis_error(self) -> None:
        # Arrange
        stage1 = _mock_escalating_analyzer()
        stage2 = _mock_escalating_analyzer()
        cascade = CascadeTriageClient(chain=[stage1, stage2])

        # Act & Assert
        with pytest.raises(TriageAnalysisError, match="cascade stages escalated"):
            await cascade.analyze(b"raw email", "test.gpg")

    @pytest.mark.asyncio
    async def test_non_escalation_exception_propagates_immediately(self) -> None:
        # Arrange — stage1 raises a real error, not EscalateToNextAnalyzer
        stage1 = AsyncMock()
        stage1.analyze.side_effect = TriageAnalysisError("API down")
        stage2 = _mock_resolving_analyzer(_make_triage_result())
        cascade = CascadeTriageClient(chain=[stage1, stage2])

        # Act & Assert — should not silently fall through to stage2
        with pytest.raises(TriageAnalysisError, match="API down"):
            await cascade.analyze(b"raw email", "test.gpg")

        stage2.analyze.assert_not_called()

    def test_empty_chain_raises_value_error(self) -> None:
        # Arrange & Act & Assert
        with pytest.raises(ValueError, match="at least one analyzer"):
            CascadeTriageClient(chain=[])

    @pytest.mark.asyncio
    async def test_single_stage_chain_resolves(self) -> None:
        # Arrange
        result = _make_triage_result()
        stage1 = _mock_resolving_analyzer(result)
        cascade = CascadeTriageClient(chain=[stage1])

        # Act
        final = await cascade.analyze(b"raw email", "test.gpg")

        # Assert
        assert final is result
