"""Configuration module for the Telegram triage bot.

Loads all settings from environment variables / .env file using pydantic-settings.
Every required field will raise a ValidationError on startup if missing.
"""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    All fields are required unless a default is provided. Load once at startup
    and inject into modules that need it — never read os.environ directly.
    """

    # Telegram
    telegram_bot_token: str = Field(description="Bot token from @BotFather")
    owner_chat_id: int = Field(description="Numeric Telegram user ID of the sole authorized user")

    # Anthropic
    anthropic_api_key: str = Field(description="Anthropic API key (sk-ant-...)")
    anthropic_model: str = Field(
        default="claude-opus-4-6",
        description="Claude model ID to use for triage and drafting",
    )

    # 2FA
    totp_secret: str = Field(description="Base32 TOTP secret for send authorization")
    totp_grace_minutes: int = Field(
        default=20,
        description="Minutes after a successful TOTP verify before requiring another",
    )

    # Gmail MCP
    gmail_mcp_credentials_base: str = Field(
        default="~/.gmail-mcp",
        description="Base path for Gmail MCP credential directories (one subdir per account)",
    )

    # Logging
    log_level: str = Field(default="INFO", description="Logging level (DEBUG/INFO/WARNING/ERROR)")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


def load_settings() -> Settings:
    """Load and validate settings from environment.

    Returns:
        Validated Settings instance.

    Raises:
        ValidationError: If any required environment variable is missing or invalid.
    """
    return Settings()  # type: ignore[call-arg]
