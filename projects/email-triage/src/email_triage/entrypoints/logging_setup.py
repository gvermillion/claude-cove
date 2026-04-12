"""Structured logging configuration for both relay and agent processes.

Sets up structlog with either a JSON renderer (production) or a
ConsoleRenderer (development). All log entries include timestamp, level,
and service name as standard fields.

Exports:
    configure_logging: Call once at process startup before any logging occurs.
"""

from __future__ import annotations

import logging
import sys

import structlog


def configure_logging(level: str = "INFO", log_format: str = "json") -> None:
    """Configure structlog for the process.

    Args:
        level: Log level string, e.g. "INFO", "DEBUG", "WARNING".
        log_format: "json" for machine-readable production logs;
            "console" for human-readable development output.
    """
    log_level = getattr(logging, level.upper(), logging.INFO)

    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if log_format == "console":
        renderer: structlog.types.Processor = structlog.dev.ConsoleRenderer()
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
        foreign_pre_chain=shared_processors,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(log_level)
