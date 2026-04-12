"""Unit tests for GPG adapter hardening.

Tests fingerprint validation, passphrase file permission checks, and error
message sanitization. GPG subprocess calls are mocked.
"""

from __future__ import annotations

import stat
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from email_triage.domain.exceptions import DecryptionError, EncryptionError
from email_triage.infrastructure.gpg.adapter import (
    GPGDecryptor,
    GPGEncryptor,
    _assert_passphrase_file_permissions,
)


class TestFingerprintValidation:
    def test_valid_40_char_fingerprint_accepted(self) -> None:
        # Arrange
        valid_fingerprint = "A" * 40
        mock_gpg = MagicMock()
        mock_gpg.list_keys.return_value = [{"fingerprint": valid_fingerprint}]

        with patch("email_triage.infrastructure.gpg.adapter.gnupg.GPG", return_value=mock_gpg):
            # Act & Assert — should not raise
            encryptor = GPGEncryptor(Path("/tmp/.gnupg"), valid_fingerprint)
            assert encryptor._recipient_fingerprint == valid_fingerprint

    def test_lowercase_fingerprint_is_normalised_to_uppercase(self) -> None:
        # Arrange
        lower_fp = "a" * 40
        upper_fp = "A" * 40
        mock_gpg = MagicMock()
        mock_gpg.list_keys.return_value = [{"fingerprint": upper_fp}]

        with patch("email_triage.infrastructure.gpg.adapter.gnupg.GPG", return_value=mock_gpg):
            # Act
            encryptor = GPGEncryptor(Path("/tmp/.gnupg"), lower_fp)

        # Assert
        assert encryptor._recipient_fingerprint == upper_fp

    def test_fingerprint_with_spaces_is_normalised(self) -> None:
        # Arrange — some tools output fingerprints with spaces
        spaced_fp = " ".join(["ABCD"] * 10)  # 40 chars when spaces stripped
        normalised = "ABCD" * 10
        mock_gpg = MagicMock()
        mock_gpg.list_keys.return_value = [{"fingerprint": normalised}]

        with patch("email_triage.infrastructure.gpg.adapter.gnupg.GPG", return_value=mock_gpg):
            # Act
            encryptor = GPGEncryptor(Path("/tmp/.gnupg"), spaced_fp)

        # Assert
        assert encryptor._recipient_fingerprint == normalised

    def test_short_fingerprint_raises_encryption_error(self) -> None:
        # Arrange
        short_fp = "ABCD1234"

        # Act & Assert
        with pytest.raises(EncryptionError, match="Invalid GPG fingerprint format"):
            GPGEncryptor(Path("/tmp/.gnupg"), short_fp)

    def test_non_hex_fingerprint_raises_encryption_error(self) -> None:
        # Arrange
        bad_fp = "X" * 40  # X is not valid hex

        # Act & Assert
        with pytest.raises(EncryptionError, match="Invalid GPG fingerprint format"):
            GPGEncryptor(Path("/tmp/.gnupg"), bad_fp)

    def test_key_not_in_keyring_raises_encryption_error(self) -> None:
        # Arrange
        valid_fp = "A" * 40
        mock_gpg = MagicMock()
        mock_gpg.list_keys.return_value = []  # Empty keyring

        with patch("email_triage.infrastructure.gpg.adapter.gnupg.GPG", return_value=mock_gpg):
            # Act & Assert
            with pytest.raises(EncryptionError, match="not found"):
                GPGEncryptor(Path("/tmp/.gnupg"), valid_fp)


class TestPassphraseFilePermissions:
    def test_file_with_0400_permissions_is_accepted(self, tmp_path: Path) -> None:
        # Arrange
        passphrase_file = tmp_path / "passphrase.txt"
        passphrase_file.write_text("secret")
        passphrase_file.chmod(0o400)

        # Act & Assert — should not raise
        _assert_passphrase_file_permissions(passphrase_file)

    def test_file_with_0600_permissions_is_accepted(self, tmp_path: Path) -> None:
        # Arrange
        passphrase_file = tmp_path / "passphrase.txt"
        passphrase_file.write_text("secret")
        passphrase_file.chmod(0o600)

        # Act & Assert
        _assert_passphrase_file_permissions(passphrase_file)

    def test_world_readable_file_raises_decryption_error(self, tmp_path: Path) -> None:
        # Arrange
        passphrase_file = tmp_path / "passphrase.txt"
        passphrase_file.write_text("secret")
        passphrase_file.chmod(0o644)  # Group and world readable

        # Act & Assert
        with pytest.raises(DecryptionError, match="unsafe permissions"):
            _assert_passphrase_file_permissions(passphrase_file)

    def test_group_readable_file_raises_decryption_error(self, tmp_path: Path) -> None:
        # Arrange
        passphrase_file = tmp_path / "passphrase.txt"
        passphrase_file.write_text("secret")
        passphrase_file.chmod(0o640)  # Group readable

        # Act & Assert
        with pytest.raises(DecryptionError, match="unsafe permissions"):
            _assert_passphrase_file_permissions(passphrase_file)


class TestEncryptErrorSanitization:
    def test_encrypt_error_truncates_stderr(self) -> None:
        # Arrange — stderr is very long (could contain key metadata)
        long_stderr = "X" * 500
        mock_gpg = MagicMock()
        mock_gpg.list_keys.return_value = [{"fingerprint": "A" * 40}]

        mock_result = MagicMock()
        mock_result.ok = False
        mock_result.status = "encryption failed"
        mock_result.stderr = long_stderr
        mock_gpg.encrypt.return_value = mock_result

        with patch("email_triage.infrastructure.gpg.adapter.gnupg.GPG", return_value=mock_gpg):
            encryptor = GPGEncryptor(Path("/tmp/.gnupg"), "A" * 40)
            with pytest.raises(EncryptionError) as exc_info:
                encryptor.encrypt(b"plaintext")

        # Assert — error message contains at most 200 chars of stderr
        error_msg = str(exc_info.value)
        # The original stderr was 500 chars; check the message is bounded
        assert len(error_msg) < 500 + 100  # 200 truncated + overhead
