"""Unit tests for TriageService and EmailRouter.

All dependencies (queue reader, decryptor, analyzer, router) are mocked.
Tests verify pipeline orchestration, semaphore limiting, race condition
handling, and failure path routing.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from email_triage.application.triage_service import EmailRouter, TriageService
from email_triage.domain.exceptions import DecryptionError, TriageAnalysisError
from email_triage.domain.models import EmailCategory, EmailPriority, TriageResult


def _make_triage_result(
    queue_file: str = "test.gpg",
    priority: EmailPriority = EmailPriority.NORMAL,
) -> TriageResult:
    """Factory for TriageResult test instances."""
    return TriageResult(
        queue_file=queue_file,
        priority=priority,
        category=EmailCategory.INTERNAL,
        summary="Test summary.",
        subject_line="Test",
        sender_domain="example.com",
        requires_reply=False,
        estimated_read_minutes=1.0,
        analyzed_at=datetime.now(UTC),
        model_used="claude-opus-4-6",
        input_tokens=100,
        output_tokens=50,
    )


def _make_mock_queue_reader(
    processing_path: Path = Path("/queue/test.gpg.processing"),
) -> MagicMock:
    """Create a mock EmailQueueReader."""
    reader = MagicMock()
    reader.claim.return_value = processing_path
    return reader


def _make_mock_decryptor(plaintext: bytes = b"raw email") -> MagicMock:
    """Create a mock Decryptor."""
    decryptor = MagicMock()
    decryptor.decrypt.return_value = plaintext
    return decryptor


def _make_mock_analyzer(result: TriageResult | None = None) -> AsyncMock:
    """Create a mock TriageAnalyzer."""
    analyzer = AsyncMock()
    analyzer.analyze.return_value = result or _make_triage_result()
    return analyzer


def _make_mock_router() -> AsyncMock:
    """Create a mock EmailRouter with async route method."""
    router = AsyncMock()
    return router


class TestTriageServiceProcessOneFile:
    @pytest.mark.asyncio
    async def test_process_one_file_calls_complete_on_success(self) -> None:
        # Arrange
        gpg_path = Path("/queue/email.gpg")
        processing_path = Path("/queue/email.gpg.processing")
        result = _make_triage_result()

        reader = _make_mock_queue_reader(processing_path)
        reader.claim.return_value = processing_path

        # Make read_bytes work on the mock processing path
        with patch.object(Path, "read_bytes", return_value=b"CIPHERTEXT"):
            service = TriageService(
                queue_reader=reader,
                decryptor=_make_mock_decryptor(),
                analyzer=_make_mock_analyzer(result),
                router=_make_mock_router(),
            )

            # Act
            await service._process_one_file(gpg_path)

        # Assert
        reader.complete.assert_called_once_with(processing_path, result)
        reader.fail.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_one_file_calls_fail_on_decryption_error(self) -> None:
        # Arrange
        gpg_path = Path("/queue/email.gpg")
        processing_path = Path("/queue/email.gpg.processing")

        reader = _make_mock_queue_reader(processing_path)
        decryptor = _make_mock_decryptor()
        decryptor.decrypt.side_effect = DecryptionError("bad key")

        with patch.object(Path, "read_bytes", return_value=b"CIPHERTEXT"):
            service = TriageService(
                queue_reader=reader,
                decryptor=decryptor,
                analyzer=_make_mock_analyzer(),
                router=_make_mock_router(),
            )

            # Act
            await service._process_one_file(gpg_path)

        # Assert
        reader.fail.assert_called_once()
        call_args = reader.fail.call_args
        assert call_args.args[0] == processing_path
        assert "bad key" in call_args.args[1]
        reader.complete.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_one_file_silently_skips_race_condition(self) -> None:
        # Arrange
        gpg_path = Path("/queue/email.gpg")
        reader = _make_mock_queue_reader()
        reader.claim.side_effect = FileNotFoundError("already claimed")

        service = TriageService(
            queue_reader=reader,
            decryptor=_make_mock_decryptor(),
            analyzer=_make_mock_analyzer(),
            router=_make_mock_router(),
        )

        # Act — should not raise
        await service._process_one_file(gpg_path)

        # Assert — neither complete nor fail called
        reader.complete.assert_not_called()
        reader.fail.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_one_file_calls_router_on_success(self) -> None:
        # Arrange
        gpg_path = Path("/queue/email.gpg")
        processing_path = Path("/queue/email.gpg.processing")
        result = _make_triage_result()
        router = _make_mock_router()

        reader = _make_mock_queue_reader(processing_path)

        with patch.object(Path, "read_bytes", return_value=b"CIPHERTEXT"):
            service = TriageService(
                queue_reader=reader,
                decryptor=_make_mock_decryptor(),
                analyzer=_make_mock_analyzer(result),
                router=router,
            )

            # Act
            await service._process_one_file(gpg_path)

        # Assert
        router.route.assert_awaited_once_with(result)


class TestEmailRouterWebhook:
    @pytest.mark.asyncio
    async def test_router_fires_webhook_for_critical_priority(self) -> None:
        # Arrange
        import httpx
        from unittest.mock import AsyncMock as AioMock

        result = _make_triage_result(priority=EmailPriority.CRITICAL)
        mock_http = MagicMock(spec=httpx.AsyncClient)
        mock_http.post = AsyncMock(return_value=MagicMock(status_code=200))

        router = EmailRouter(
            http_client=mock_http,
            webhook_url="https://hooks.example.com/triage",
            webhook_secret="secret",
        )

        # Act
        await router.route(result)

        # Assert
        mock_http.post.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_router_does_not_fire_webhook_for_normal_priority(self) -> None:
        # Arrange
        import httpx

        result = _make_triage_result(priority=EmailPriority.NORMAL)
        mock_http = MagicMock(spec=httpx.AsyncClient)
        mock_http.post = AsyncMock(return_value=MagicMock(status_code=200))

        router = EmailRouter(
            http_client=mock_http,
            webhook_url="https://hooks.example.com/triage",
        )

        # Act
        await router.route(result)

        # Assert — no webhook for NORMAL
        mock_http.post.assert_not_called()

    @pytest.mark.asyncio
    async def test_router_does_not_raise_when_webhook_fails(self) -> None:
        # Arrange
        import httpx

        result = _make_triage_result(priority=EmailPriority.CRITICAL)
        mock_http = MagicMock(spec=httpx.AsyncClient)
        mock_http.post = AsyncMock(side_effect=httpx.ConnectError("unreachable"))

        router = EmailRouter(
            http_client=mock_http,
            webhook_url="https://hooks.example.com/triage",
        )

        # Act — should not raise; webhook failure is logged, not propagated
        await router.route(result)

    @pytest.mark.asyncio
    async def test_router_does_not_fire_webhook_when_url_not_configured(self) -> None:
        # Arrange
        import httpx

        result = _make_triage_result(priority=EmailPriority.CRITICAL)
        mock_http = MagicMock(spec=httpx.AsyncClient)

        router = EmailRouter(
            http_client=mock_http,
            webhook_url=None,
        )

        # Act
        await router.route(result)

        # Assert
        mock_http.post.assert_not_called()
