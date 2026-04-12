"""Triage agent process entrypoint.

Wires up all dependencies (queue reader, decryptor, Claude client, router)
and runs the TriageService async loop. Handles SIGTERM and SIGINT for
graceful shutdown.

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
from email_triage.entrypoints.logging_setup import configure_logging
from email_triage.infrastructure.ai.claude_client import ClaudeTriageClient
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
    memory, calls Claude for structured classification, and routes results
    to configured destinations.
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

    claude_client = ClaudeTriageClient(
        api_key=settings.anthropic_api_key.get_secret_value(),
        model=agent_cfg.claude_model,
        max_tokens=agent_cfg.claude_max_tokens,
        temperature=agent_cfg.claude_temperature,
    )

    webhook_url = str(agent_cfg.webhook_url) if agent_cfg.webhook_url else None
    webhook_secret = (
        agent_cfg.webhook_secret.get_secret_value()
        if agent_cfg.webhook_secret
        else None
    )

    asyncio.run(_run_agent(agent_cfg, decryptor, queue_reader, claude_client, webhook_url, webhook_secret))


async def _run_agent(
    agent_cfg: AgentConfig,
    decryptor: GPGDecryptor,
    queue_reader: FileQueueReader,
    claude_client: ClaudeTriageClient,
    webhook_url: str | None,
    webhook_secret: str | None,
) -> None:
    """Async entry point for the triage agent.

    Args:
        agent_cfg: Agent configuration block.
        decryptor: GPG decryptor instance.
        queue_reader: File queue reader instance.
        claude_client: Claude triage client instance.
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
            analyzer=claude_client,
            router=router,
            max_concurrent=agent_cfg.max_concurrent_emails,
        )

        log.info(
            "agent_starting",
            queue_dir=str(agent_cfg.queue_dir),
            model=agent_cfg.claude_model,
            max_concurrent=agent_cfg.max_concurrent_emails,
        )

        try:
            await triage_service.run_forever(stop_event)
        finally:
            log.info("agent_stopped")
