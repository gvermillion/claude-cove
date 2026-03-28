"""Entrypoint for the Telegram triage bot.

Initializes structlog, loads settings, builds the Telegram Application,
registers all handlers with partial injection of Settings, and starts
long-polling.

Run with:
    uv run python -m telegram_triage_bot
"""

from __future__ import annotations

import functools
import logging
import sys

import structlog
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    MessageHandler,
    filters,
)

from .config import Settings, load_settings
from .handlers import (
    button_callback,
    cancel_command,
    message_handler,
    status_command,
    triage_command,
)


def _configure_logging(log_level: str) -> None:
    """Configure structlog with JSON output for production, pretty for dev.

    Args:
        log_level: Logging level string (DEBUG/INFO/WARNING/ERROR).
    """
    level = getattr(logging, log_level.upper(), logging.INFO)

    # Route stdlib logging through structlog.
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

    is_tty = sys.stdout.isatty()
    processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]
    if is_tty:
        processors.append(structlog.dev.ConsoleRenderer())
    else:
        processors.append(structlog.processors.JSONRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def _bind_settings(handler_fn, settings: Settings):  # type: ignore[no-untyped-def]
    """Return a partial that injects settings as the third argument.

    python-telegram-bot passes (update, context) to handlers. We need to
    inject Settings without reaching for a global. functools.partial binds
    it as a keyword argument so the handler signature stays clean.

    Args:
        handler_fn: An async handler function expecting (update, context, settings).
        settings: Settings instance to inject.

    Returns:
        Partial function with settings pre-bound.
    """
    return functools.partial(handler_fn, settings=settings)


def build_application(settings: Settings) -> Application:  # type: ignore[type-arg]
    """Build and configure the Telegram Application.

    Registers all command, callback, and message handlers with Settings injected.

    Args:
        settings: Validated application settings.

    Returns:
        Configured Application ready to run.
    """
    app = Application.builder().token(settings.telegram_bot_token).build()

    app.add_handler(CommandHandler("triage", _bind_settings(triage_command, settings)))
    app.add_handler(CommandHandler("status", _bind_settings(status_command, settings)))
    app.add_handler(CommandHandler("cancel", _bind_settings(cancel_command, settings)))
    app.add_handler(CallbackQueryHandler(_bind_settings(button_callback, settings)))
    app.add_handler(
        MessageHandler(
            filters.TEXT & ~filters.COMMAND,
            _bind_settings(message_handler, settings),
        )
    )

    return app


def main() -> None:
    """Load settings, configure logging, and start the bot polling loop."""
    settings = load_settings()
    _configure_logging(settings.log_level)

    log = structlog.get_logger(__name__)
    log.info(
        "bot_starting",
        model=settings.anthropic_model,
        owner_chat_id=settings.owner_chat_id,
        totp_grace_minutes=settings.totp_grace_minutes,
    )

    app = build_application(settings)
    log.info("bot_polling")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
