"""Triage agent process entrypoint.

Wires up all dependencies (queue reader, decryptor, analyzer chain, router)
and runs the TriageService async loop. Handles SIGTERM and SIGINT for
graceful shutdown.

The analyzer chain is selected via AGENT__ANALYZER_BACKEND:
  "cascade"  (recommended) — rules → ollama → claude
  "claude"   — claude only
  "ollama"   — ollama only (no API cost, data stays local)
  "rules"    — rule-based only (instant, limited coverage)

Usage:
    email-triage-agent [--config PATH_TO_ENV_FILE]
    uv run email-triage-agent --config .env
"""

from __future__ import annotations

import asyncio
import signal
from pathlib import Path
from typing import Annotated

import httpx
import structlog
import typer

from email_triage.application.triage_service import EmailRouter, TriageService
from email_triage.config import AgentConfig, Settings
from email_triage.domain.interfaces import TriageAnalyzer
from email_triage.entrypoints.logging_setup import configure_logging
from email_triage.infrastructure.ai.cascade_client import CascadeTriageClient
from email_triage.infrastructure.ai.claude_client import ClaudeTriageClient
from email_triage.infrastructure.ai.ollama_client import OllamaTriageClient
from email_triage.infrastructure.ai.rule_based_client import RuleBasedTriageClient
from email_triage.infrastructure.gpg.adapter import GPGDecryptor, configure_gpg_logging
from email_triage.infrastructure.queue.file_queue import FileQueueReader

app = typer.Typer(help="Email triage agent: decrypt → analyse → route.")
log: structlog.BoundLogger = structlog.get_logger("agent")


@app.command()
def main(
    config_file: Annotated[
        Path | None,
        typer.Option("--config", help="Path to .env file (optional)."),
    ] = None,
) -> None:
    """Start the email triage agent process.

    Watches the queue directory for new .gpg files, decrypts each one in
    memory, runs the configured analyzer chain for structured classification,
    and routes results to configured destinations.
    """
    settings = Settings(_env_file=config_file or Path(".env"))  # type: ignore[call-arg]
    configure_logging(settings.log_level, settings.log_format)
    configure_gpg_logging()

    agent_cfg = settings.agent
    agent_cfg.state_dir.mkdir(parents=True, exist_ok=True)
    agent_cfg.done_dir.mkdir(parents=True, exist_ok=True)
    agent_cfg.failed_dir.mkdir(parents=True, exist_ok=True)

    decryptor = GPGDecryptor(
        gpg_home=agent_cfg.gpg_home,
        passphrase_file=agent_cfg.gpg_private_key_passphrase_file,
    )
    queue_reader = FileQueueReader(
        queue_dir=agent_cfg.queue_dir,
        done_dir=agent_cfg.done_dir,
        failed_dir=agent_cfg.failed_dir,
    )
    analyzer = _build_analyzer(settings)

    webhook_url = str(agent_cfg.webhook_url) if agent_cfg.webhook_url else None
    webhook_secret = (
        agent_cfg.webhook_secret.get_secret_value() if agent_cfg.webhook_secret else None
    )

    asyncio.run(
        _run_agent(agent_cfg, decryptor, queue_reader, analyzer, webhook_url, webhook_secret)
    )


def _build_analyzer(settings: Settings) -> TriageAnalyzer:
    """Construct the configured analyzer chain from settings.

    Backend options (AGENT__ANALYZER_BACKEND):
      "cascade" — rules → ollama (if enabled) → claude  [recommended]
      "claude"  — claude only
      "ollama"  — ollama only
      "rules"   — rule-based only

    Args:
        settings: Root application settings.

    Returns:
        A TriageAnalyzer ready to use.

    Raises:
        typer.Exit: If an unknown backend is specified.
    """
    cfg = settings.agent
    backend = cfg.analyzer_backend.lower()

    claude = ClaudeTriageClient(
        api_key=settings.anthropic_api_key.get_secret_value(),
        model=cfg.claude_model,
        max_tokens=cfg.claude_max_tokens,
        temperature=cfg.claude_temperature,
    )

    if backend == "claude":
        log.info("analyzer_backend_selected", backend="claude", model=cfg.claude_model)
        return claude

    if backend == "ollama":
        log.info(
            "analyzer_backend_selected",
            backend="ollama",
            model=cfg.ollama.model,
        )
        return OllamaTriageClient(
            model=cfg.ollama.model,
            base_url=cfg.ollama.base_url,
            timeout_seconds=cfg.ollama.timeout_seconds,
        )

    if backend == "rules":
        log.info("analyzer_backend_selected", backend="rules")
        return RuleBasedTriageClient()

    if backend == "cascade":
        chain: list[TriageAnalyzer] = [RuleBasedTriageClient()]

        if cfg.ollama.enabled:
            chain.append(
                OllamaTriageClient(
                    model=cfg.ollama.model,
                    base_url=cfg.ollama.base_url,
                    timeout_seconds=cfg.ollama.timeout_seconds,
                )
            )
            log.info(
                "cascade_stage_added",
                stage="ollama",
                model=cfg.ollama.model,
            )
        else:
            log.info(
                "cascade_ollama_disabled",
                advice="Set AGENT__OLLAMA__ENABLED=true to add Ollama as a cascade stage.",
            )

        chain.append(claude)
        stage_names = [type(s).__name__ for s in chain]
        log.info("analyzer_backend_selected", backend="cascade", stages=stage_names)
        return CascadeTriageClient(chain=chain)

    log.error("unknown_analyzer_backend", backend=backend)
    raise typer.Exit(code=1)


async def _run_agent(
    agent_cfg: AgentConfig,
    decryptor: GPGDecryptor,
    queue_reader: FileQueueReader,
    analyzer: TriageAnalyzer,
    webhook_url: str | None,
    webhook_secret: str | None,
) -> None:
    """Async entry point for the triage agent.

    Args:
        agent_cfg: Agent configuration block.
        decryptor: GPG decryptor instance.
        queue_reader: File queue reader instance.
        analyzer: TriageAnalyzer (may be cascade, Claude, Ollama, or rules).
        webhook_url: Optional webhook URL for priority notifications.
        webhook_secret: Optional HMAC secret for webhook signing.
    """
    stop_event = asyncio.Event()

    def _handle_signal(signum: int) -> None:
        log.info("agent_shutdown_signal", signal=signum)
        stop_event.set()

    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGTERM, _handle_signal, signal.SIGTERM)
    loop.add_signal_handler(signal.SIGINT, _handle_signal, signal.SIGINT)

    async with httpx.AsyncClient(timeout=30.0) as http_client:
        router = EmailRouter(
            http_client=http_client,
            webhook_url=webhook_url,
            webhook_secret=webhook_secret,
        )
        triage_service = TriageService(
            queue_reader=queue_reader,
            decryptor=decryptor,
            analyzer=analyzer,
            router=router,
            max_concurrent=agent_cfg.max_concurrent_emails,
        )

        log.info(
            "agent_starting",
            queue_dir=str(agent_cfg.queue_dir),
            analyzer=type(analyzer).__name__,
            max_concurrent=agent_cfg.max_concurrent_emails,
        )

        try:
            await triage_service.run_forever(stop_event)
        finally:
            log.info("agent_stopped")
