"""Application configuration via pydantic-settings.

All configuration is loaded from environment variables. The double-underscore
delimiter (RELAY__GMAIL_USERNAME) maps to nested model attributes.

Usage:
    settings = Settings()                    # loads from environment
    settings = Settings(_env_file=".env")    # loads from a .env file
"""

from __future__ import annotations

from pathlib import Path

from pydantic import HttpUrl, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class GmailConfig(BaseSettings):
    """Configuration for the Gmail / Google Workspace IMAP source.

    Attributes:
        enabled: Whether this source is active in the relay loop.
        host: IMAP server hostname.
        port: IMAP server port (SSL).
        username: Gmail address.
        app_password: Gmail app password (not the account password).
        mailbox: Mailbox folder to poll.
    """

    model_config = SettingsConfigDict(env_prefix="RELAY__GMAIL__", extra="ignore")

    enabled: bool = True
    host: str = "imap.gmail.com"
    port: int = 993
    username: str = ""
    app_password: SecretStr = SecretStr("")
    mailbox: str = "INBOX"


class ProtonConfig(BaseSettings):
    """Configuration for the Proton Mail local Bridge IMAP source.

    The Bridge exposes a plaintext IMAP endpoint on loopback only.
    No SSL is used because the connection never leaves the host.

    Attributes:
        enabled: Whether this source is active in the relay loop.
        host: Bridge loopback address.
        port: Bridge IMAP port.
        username: Bridge-provided IMAP username.
        password: Bridge-generated IMAP password.
        mailbox: Mailbox folder to poll.
    """

    model_config = SettingsConfigDict(env_prefix="RELAY__PROTON__", extra="ignore")

    enabled: bool = False
    host: str = "127.0.0.1"
    port: int = 1143
    username: str = ""
    password: SecretStr = SecretStr("")
    mailbox: str = "INBOX"


class RelayConfig(BaseSettings):
    """Configuration for the relay process.

    Attributes:
        poll_interval_seconds: Seconds to sleep between full poll cycles.
        queue_dir: Path to the tmpfs directory where .gpg files are written.
        state_dir: Path to a persistent directory for UID tracking state files.
        gpg_home: GPG home directory containing only the recipient public key.
        gpg_recipient_fingerprint: Full 40-character GPG fingerprint to encrypt to.
        max_email_size_bytes: Emails larger than this are skipped with a warning.
        gmail: Nested Gmail source configuration.
        proton: Nested Proton Bridge source configuration.
    """

    model_config = SettingsConfigDict(env_prefix="RELAY__", extra="ignore")

    poll_interval_seconds: int = 60
    queue_dir: Path = Path("/run/email-triage/queue")
    state_dir: Path = Path("/var/lib/email-triage/relay")
    gpg_home: Path = Path("/var/lib/email-triage/relay/.gnupg")
    gpg_recipient_fingerprint: str = ""
    max_email_size_bytes: int = 10_000_000

    gmail: GmailConfig = GmailConfig()
    proton: ProtonConfig = ProtonConfig()


class OllamaConfig(BaseSettings):
    """Configuration for the local Ollama LLM server (second cascade stage).

    Attributes:
        enabled: Whether Ollama is used as a cascade stage.
        base_url: Ollama API server URL. Must be reachable from the VPS.
        model: Ollama model tag to use, e.g. "llama3.2:3b", "mistral:7b".
        timeout_seconds: Per-request inference timeout.
    """

    model_config = SettingsConfigDict(env_prefix="AGENT__OLLAMA__", extra="ignore")

    enabled: bool = False
    base_url: str = "http://localhost:11434"
    model: str = "llama3.2:3b"
    timeout_seconds: float = 60.0


class AgentConfig(BaseSettings):
    """Configuration for the triage agent process.

    Attributes:
        queue_dir: Must match RelayConfig.queue_dir.
        state_dir: Persistent state directory for the agent.
        gpg_home: GPG home directory containing the private key.
        gpg_private_key_passphrase_file: Path to a file containing the
            private key passphrase. Must have 0400 permissions.
        done_dir: Directory for successfully processed .gpg files.
        failed_dir: Directory for .gpg files that failed processing.
        processing_timeout_seconds: Max seconds allowed for one email.
        analyzer_backend: Controls which analyzer chain is used.
            "claude"   — ClaudeTriageClient only (original behaviour).
            "cascade"  — RuleBasedTriageClient → OllamaTriageClient
                         → ClaudeTriageClient (recommended for production).
            "ollama"   — OllamaTriageClient only (no Claude, no cost).
            "rules"    — RuleBasedTriageClient only (fastest, limited coverage).
        claude_model: Claude model ID to use for triage analysis.
        claude_max_tokens: Maximum output tokens per Claude call.
        claude_temperature: Sampling temperature (0.0 = deterministic).
        max_concurrent_emails: Semaphore limit for concurrent analyzer calls.
        ollama: Nested Ollama server configuration.
        webhook_url: Optional URL for CRITICAL/HIGH priority notifications.
        webhook_secret: HMAC-SHA256 secret for webhook signature header.
    """

    model_config = SettingsConfigDict(env_prefix="AGENT__", extra="ignore")

    queue_dir: Path = Path("/run/email-triage/queue")
    state_dir: Path = Path("/var/lib/email-triage/agent")
    gpg_home: Path = Path("/var/lib/email-triage/agent/.gnupg")
    gpg_private_key_passphrase_file: Path = Path("/etc/email-triage/agent-key.passphrase")
    done_dir: Path = Path("/var/lib/email-triage/done")
    failed_dir: Path = Path("/var/lib/email-triage/failed")
    processing_timeout_seconds: int = 120

    analyzer_backend: str = "claude"

    claude_model: str = "claude-opus-4-6"
    claude_max_tokens: int = 1024
    claude_temperature: float = 0.0
    max_concurrent_emails: int = 3

    ollama: OllamaConfig = OllamaConfig()

    webhook_url: HttpUrl | None = None
    webhook_secret: SecretStr | None = None


class Settings(BaseSettings):
    """Root application settings aggregating relay and agent configurations.

    Loads from environment variables with double-underscore nesting and
    optionally from a .env file.

    Example:
        >>> settings = Settings(_env_file=".env")
        >>> settings.relay.poll_interval_seconds
        60
    """

    model_config = SettingsConfigDict(
        env_nested_delimiter="__",
        extra="ignore",
    )

    anthropic_api_key: SecretStr = SecretStr("")
    log_level: str = "INFO"
    log_format: str = "json"
    env: str = "production"

    relay: RelayConfig = RelayConfig()
    agent: AgentConfig = AgentConfig()
