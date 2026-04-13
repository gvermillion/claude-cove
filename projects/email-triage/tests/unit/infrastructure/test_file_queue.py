"""Unit tests for the file queue infrastructure.

Tests atomic write, opaque filename generation, claim/complete/fail state
transitions, and crash recovery on startup.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import patch

import pytest

from email_triage.domain.models import EmailCategory, EmailPriority, EncryptedEmail, TriageResult
from email_triage.infrastructure.queue.file_queue import (
    FileQueue,
    FileQueueReader,
    _GPG_SUFFIX,
    _PROCESSING_SUFFIX,
)


def _make_encrypted_email(encrypted_bytes: bytes = b"ENCRYPTED") -> EncryptedEmail:
    """Factory for EncryptedEmail test instances."""
    return EncryptedEmail(
        queue_path=Path(""),
        encrypted_bytes=encrypted_bytes,
        source="gmail",
        fetched_at=datetime.now(UTC),
    )


def _make_triage_result(queue_file: str = "test.gpg") -> TriageResult:
    """Factory for TriageResult test instances."""
    return TriageResult(
        queue_file=queue_file,
        priority=EmailPriority.NORMAL,
        category=EmailCategory.INTERNAL,
        summary="Test.",
        subject_line="Test",
        sender_domain="example.com",
        requires_reply=False,
        estimated_read_minutes=1.0,
        analyzed_at=datetime.now(UTC),
        model_used="claude-opus-4-6",
        input_tokens=10,
        output_tokens=5,
    )


class TestFileQueueEnqueue:
    def test_enqueue_writes_gpg_file_to_queue_dir(self, tmp_path: Path) -> None:
        # Arrange
        queue = FileQueue(queue_dir=tmp_path)
        email = _make_encrypted_email(b"CIPHERTEXT")

        # Act
        result_path = queue.enqueue(email)

        # Assert
        assert result_path.exists()
        assert result_path.read_bytes() == b"CIPHERTEXT"

    def test_enqueue_generates_gpg_suffix(self, tmp_path: Path) -> None:
        # Arrange
        queue = FileQueue(queue_dir=tmp_path)
        email = _make_encrypted_email()

        # Act
        result_path = queue.enqueue(email)

        # Assert
        assert result_path.suffix == _GPG_SUFFIX

    def test_enqueue_filename_is_opaque(self, tmp_path: Path) -> None:
        # Arrange
        queue = FileQueue(queue_dir=tmp_path)
        email = _make_encrypted_email()

        # Act
        result_path = queue.enqueue(email)

        # Assert — no sender info, subject, or provider name in filename
        name = result_path.name
        assert "gmail" not in name
        assert "proton" not in name
        assert "@" not in name

    def test_enqueue_uses_atomic_rename(self, tmp_path: Path) -> None:
        # Arrange
        queue = FileQueue(queue_dir=tmp_path)
        email = _make_encrypted_email(b"DATA")

        # Act
        result_path = queue.enqueue(email)

        # Assert — no leftover .tmp files
        tmp_files = list(tmp_path.glob("*.tmp"))
        assert tmp_files == []
        assert result_path.exists()

    def test_enqueue_two_emails_get_different_filenames(self, tmp_path: Path) -> None:
        # Arrange
        queue = FileQueue(queue_dir=tmp_path)

        # Act
        path1 = queue.enqueue(_make_encrypted_email(b"A"))
        path2 = queue.enqueue(_make_encrypted_email(b"B"))

        # Assert
        assert path1 != path2


class TestFileQueueReaderClaim:
    def test_claim_renames_gpg_to_processing(self, tmp_path: Path) -> None:
        # Arrange
        done_dir = tmp_path / "done"
        failed_dir = tmp_path / "failed"
        reader = FileQueueReader(
            queue_dir=tmp_path,
            done_dir=done_dir,
            failed_dir=failed_dir,
        )
        gpg_file = tmp_path / f"1234{_GPG_SUFFIX}"
        gpg_file.write_bytes(b"CIPHERTEXT")

        # Act
        processing_path = reader.claim(gpg_file)

        # Assert
        assert not gpg_file.exists()
        assert processing_path.exists()
        assert processing_path.name.endswith(_PROCESSING_SUFFIX)

    def test_claim_raises_file_not_found_on_race_condition(self, tmp_path: Path) -> None:
        # Arrange
        done_dir = tmp_path / "done"
        failed_dir = tmp_path / "failed"
        reader = FileQueueReader(
            queue_dir=tmp_path,
            done_dir=done_dir,
            failed_dir=failed_dir,
        )
        gpg_file = tmp_path / f"1234{_GPG_SUFFIX}"
        # Do NOT create the file — simulates another agent claiming it first.

        # Act & Assert
        with pytest.raises(FileNotFoundError):
            reader.claim(gpg_file)


class TestFileQueueReaderComplete:
    def test_complete_moves_processing_to_done_dir(self, tmp_path: Path) -> None:
        # Arrange
        done_dir = tmp_path / "done"
        failed_dir = tmp_path / "failed"
        reader = FileQueueReader(
            queue_dir=tmp_path,
            done_dir=done_dir,
            failed_dir=failed_dir,
        )
        processing_file = tmp_path / f"1234{_PROCESSING_SUFFIX}"
        processing_file.write_bytes(b"CIPHERTEXT")
        result = _make_triage_result(queue_file="1234.gpg")

        # Act
        reader.complete(processing_file, result)

        # Assert
        assert not processing_file.exists()
        done_gpg = done_dir / "1234.gpg"
        done_json = done_dir / "1234.json"
        assert done_gpg.exists()
        assert done_json.exists()

    def test_complete_writes_valid_json_sidecar(self, tmp_path: Path) -> None:
        # Arrange
        import orjson

        done_dir = tmp_path / "done"
        failed_dir = tmp_path / "failed"
        reader = FileQueueReader(
            queue_dir=tmp_path,
            done_dir=done_dir,
            failed_dir=failed_dir,
        )
        processing_file = tmp_path / f"1234{_PROCESSING_SUFFIX}"
        processing_file.write_bytes(b"CIPHERTEXT")
        result = _make_triage_result()

        # Act
        reader.complete(processing_file, result)

        # Assert
        json_data = orjson.loads((done_dir / "1234.json").read_bytes())
        assert json_data["priority"] == "normal"
        assert json_data["category"] == "internal"


class TestFileQueueReaderFail:
    def test_fail_moves_processing_to_failed_dir(self, tmp_path: Path) -> None:
        # Arrange
        done_dir = tmp_path / "done"
        failed_dir = tmp_path / "failed"
        reader = FileQueueReader(
            queue_dir=tmp_path,
            done_dir=done_dir,
            failed_dir=failed_dir,
        )
        processing_file = tmp_path / f"1234{_PROCESSING_SUFFIX}"
        processing_file.write_bytes(b"CIPHERTEXT")

        # Act
        reader.fail(processing_file, "decryption error")

        # Assert
        assert not processing_file.exists()
        assert (failed_dir / "1234.gpg").exists()
        assert (failed_dir / "1234.error.json").exists()


class TestFileQueueReaderStartupRecovery:
    def test_startup_recovers_processing_files(self, tmp_path: Path) -> None:
        # Arrange
        done_dir = tmp_path / "done"
        failed_dir = tmp_path / "failed"

        # Simulate a .gpg.processing file left from a previous crash.
        processing_file = tmp_path / f"stale{_PROCESSING_SUFFIX}"
        processing_file.write_bytes(b"CIPHERTEXT")

        reader = FileQueueReader(
            queue_dir=tmp_path,
            done_dir=done_dir,
            failed_dir=failed_dir,
        )

        # Act — _recover_processing_files is called from watch() via __init__
        recovered = reader._recover_processing_files()

        # Assert
        assert recovered == 1
        assert not processing_file.exists()
        assert (tmp_path / f"stale{_GPG_SUFFIX}").exists()
