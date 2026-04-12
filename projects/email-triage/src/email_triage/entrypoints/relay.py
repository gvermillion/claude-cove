"""Relay process entrypoint.

Wires up all dependencies (fetchers, encryptor, queue) and runs the
RelayService poll loop. Handles SIGTERM and SIGINT for graceful shutdown.

Usage:
    email-triage-relay [--config PATH_TO_ENV_FILE]
    uv run email-triage-relay --config .env
"""

from __future__ import annotations

import signal
import threading
from pathlib import Path
from typing import Annotated

import structlog
import typer

from email_triage.config import GmailConfig, ProtonConfig, RelayConfig, Settings
from email_triage.domain.interfaces import EmailFetcher
from email_triage.entrypoints.logging_setup import configure_logging
from email_triage.infrastructure.gpg.adapter import GPGEncryptor, configure_gpg_logging
from email_triage.infrastructure.imap.gmail import GmailFetcher
from email_triage.infrastructure.imap.proton import ProtonBridgeFetcher
from email_triage.infrastructure.queue.file_queue import FileQueue
from email_triage.application.relay_service import RelayService

app = typer.Typer(help="Email triage relay: poll → encrypt → enqueue.")
log: structlog.BoundLogger = structlog.get_logger("relay")


@app.command()
def main(
    config_file: Annotated[
        Path | None,
        typer.Option("--config", help="Path to .env file (optional)."),
    ] = None,
) -> None:
    """Start the email relay process.

    Polls all configured email providers, GPG-encrypts each raw email in
    memory, and writes opaque .gpg files to the queue directory on tmpfs.
    """
    settings = Settings(_env_file=config_file or Path(".env"))  # type: ignore[call-arg]
    configure_logging(settings.log_level, settings.log_format)
    configure_gpg_logging()

    relay_cfg = settings.relay
    relay_cfg.queue_dir.mkdir(parents=True, exist_ok=True)
    relay_cfg.state_dir.mkdir(parents=True, exist_ok=True)

    fetchers = _build_fetchers(relay_cfg)
    if not fetchers:
        log.error("relay_no_providers_enabled")
        raise typer.Exit(code=1)

    encryptor = GPGEncryptor(
        gpg_home=relay_cfg.gpg_home,
        recipient_fingerprint=relay_cfg.gpg_recipient_fingerprint,
    )
    queue = FileQueue(queue_dir=relay_cfg.queue_dir)
    relay_service = RelayService(
        fetchers=fetchers,
        encryptor=encryptor,
        queue=queue,
        poll_interval_seconds=relay_cfg.poll_interval_seconds,
    )

    stop_event = threading.Event()

    def _handle_signal(signum: int, _frame: object) -> None:
        log.info("relay_shutdown_signal", signal=signum)
        stop_event.set()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    log.info(
        "relay_starting",
        sources=[f.source_name for f in fetchers],
        queue_dir=str(relay_cfg.queue_dir),
        poll_interval_seconds=relay_cfg.poll_interval_seconds,
    )

    try:
        relay_service.run_forever(stop_event)
    finally:
        for fetcher in fetchers:
            fetcher.close()
        log.info("relay_stopped")


def _build_fetchers(cfg: RelayConfig) -> list[EmailFetcher]:
    """Construct the list of enabled email fetchers from configuration.

    Args:
        cfg: The relay configuration block.

    Returns:
        A list of instantiated, enabled EmailFetcher strategies.
    """
    fetchers: list[EmailFetcher] = []

    if cfg.gmail.enabled:
        fetchers.append(_build_gmail_fetcher(cfg.gmail, cfg))

    if cfg.proton.enabled:
        fetchers.append(_build_proton_fetcher(cfg.proton, cfg))

    return fetchers


def _build_gmail_fetcher(gmail_cfg: GmailConfig, relay_cfg: RelayConfig) -> GmailFetcher:
    """Construct a GmailFetcher from the gmail config block.

    Args:
        gmail_cfg: Gmail-specific configuration.
        relay_cfg: Relay-wide configuration (state_dir, max size).

    Returns:
        Configured GmailFetcher instance.
    """
    return GmailFetcher(
        username=gmail_cfg.username,
        password=gmail_cfg.app_password.get_secret_value(),
        state_dir=relay_cfg.state_dir,
        mailbox=gmail_cfg.mailbox,
        max_email_size_bytes=relay_cfg.max_email_size_bytes,
    )


def _build_proton_fetcher(
    proton_cfg: ProtonConfig,
    relay_cfg: RelayConfig,
) -> ProtonBridgeFetcher:
    """Construct a ProtonBridgeFetcher from the proton config block.

    Args:
        proton_cfg: Proton Bridge-specific configuration.
        relay_cfg: Relay-wide configuration (state_dir, max size).

    Returns:
        Configured ProtonBridgeFetcher instance.
    """
    return ProtonBridgeFetcher(
        username=proton_cfg.username,
        password=proton_cfg.password.get_secret_value(),
        state_dir=relay_cfg.state_dir,
        host=proton_cfg.host,
        port=proton_cfg.port,
        mailbox=proton_cfg.mailbox,
        max_email_size_bytes=relay_cfg.max_email_size_bytes,
    )
