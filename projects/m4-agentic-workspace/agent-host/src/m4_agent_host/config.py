from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ollama_base_url: str = "http://host.docker.internal:11434/v1"
    ollama_triage_model: str = "gemma2:latest"
    ollama_reasoning_model: str = "mistral:latest"
    ollama_judge_model: str = "qwen3:8b"

    vault_path: str = "/vault"
    qdrant_url: str = "http://qdrant:6333"
    log_level: str = "INFO"
    phoenix_collector_endpoint: str = "http://phoenix:6006/v1/traces"
    phoenix_project_name: str = "m4-agent-host"
    user_email: str = "gvermillion@phdata.io"
    enrich_citations: bool = True


settings = Settings()
