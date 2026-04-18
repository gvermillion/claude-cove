from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_triage_model: str = "gemma3:9b"
    ollama_reasoning_model: str = "qwen2.5:32b"

    vault_path: str = "/vault"
    qdrant_url: str = "http://qdrant:6333"
    log_level: str = "INFO"


settings = Settings()
