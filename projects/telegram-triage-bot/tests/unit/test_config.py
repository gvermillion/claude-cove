"""Unit tests for the Settings configuration model.

Tests required-field enforcement, default values, and field types.
All Settings instances are constructed with explicit kwargs so tests do not
depend on environment variables or the presence of a .env file.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from telegram_triage_bot.config import Settings


def _required() -> dict[str, object]:
    """Return a dict containing the minimum required Settings fields."""
    return {
        "telegram_bot_token": "test_bot_token",
        "owner_chat_id": 12345,
        "anthropic_api_key": "sk-ant-test",
        "totp_secret": "JBSWY3DPEHPK3PXP",  # valid base32
    }


class TestSettingsRequiredFields:
    """Tests that missing required fields raise ValidationError."""

    def test_all_required_fields_accepted(self) -> None:
        # Arrange / Act
        settings = Settings(**_required())  # type: ignore[arg-type]

        # Assert
        assert settings.telegram_bot_token == "test_bot_token"
        assert settings.owner_chat_id == 12345
        assert settings.anthropic_api_key == "sk-ant-test"
        assert settings.totp_secret == "JBSWY3DPEHPK3PXP"

    def test_missing_telegram_bot_token_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # Arrange — ensure env var is absent
        monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
        fields = _required()
        del fields["telegram_bot_token"]

        # Act / Assert
        with pytest.raises(ValidationError):
            Settings(**fields)  # type: ignore[arg-type]

    def test_missing_owner_chat_id_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # Arrange
        monkeypatch.delenv("OWNER_CHAT_ID", raising=False)
        fields = _required()
        del fields["owner_chat_id"]

        # Act / Assert
        with pytest.raises(ValidationError):
            Settings(**fields)  # type: ignore[arg-type]

    def test_missing_anthropic_api_key_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # Arrange
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        fields = _required()
        del fields["anthropic_api_key"]

        # Act / Assert
        with pytest.raises(ValidationError):
            Settings(**fields)  # type: ignore[arg-type]

    def test_missing_totp_secret_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # Arrange
        monkeypatch.delenv("TOTP_SECRET", raising=False)
        fields = _required()
        del fields["totp_secret"]

        # Act / Assert
        with pytest.raises(ValidationError):
            Settings(**fields)  # type: ignore[arg-type]


class TestSettingsDefaults:
    """Tests for optional field defaults."""

    def test_default_model_is_opus(self) -> None:
        # Arrange / Act
        settings = Settings(**_required())  # type: ignore[arg-type]

        # Assert
        assert settings.anthropic_model == "claude-opus-4-6"

    def test_default_grace_minutes_is_twenty(self) -> None:
        # Arrange / Act
        settings = Settings(**_required())  # type: ignore[arg-type]

        # Assert
        assert settings.totp_grace_minutes == 20

    def test_default_credentials_base(self) -> None:
        # Arrange / Act
        settings = Settings(**_required())  # type: ignore[arg-type]

        # Assert
        assert settings.gmail_mcp_credentials_base == "~/.gmail-mcp"

    def test_default_log_level_is_info(self) -> None:
        # Arrange / Act
        settings = Settings(**_required())  # type: ignore[arg-type]

        # Assert
        assert settings.log_level == "INFO"

    def test_model_can_be_overridden(self) -> None:
        # Arrange / Act
        settings = Settings(**_required(), anthropic_model="claude-sonnet-4-6")  # type: ignore[arg-type]

        # Assert
        assert settings.anthropic_model == "claude-sonnet-4-6"

    def test_grace_minutes_can_be_overridden(self) -> None:
        # Arrange / Act
        settings = Settings(**_required(), totp_grace_minutes=5)  # type: ignore[arg-type]

        # Assert
        assert settings.totp_grace_minutes == 5

    def test_owner_chat_id_is_int(self) -> None:
        # Arrange / Act
        settings = Settings(**_required())  # type: ignore[arg-type]

        # Assert
        assert isinstance(settings.owner_chat_id, int)
