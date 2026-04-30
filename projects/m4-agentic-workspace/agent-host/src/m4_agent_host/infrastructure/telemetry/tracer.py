"""OpenTelemetry tracer configured to export to Arize Phoenix via OTLP HTTP.

All LLM calls use the native Ollama /api/chat endpoint with manual
OpenInference span attributes — no auto-instrumentation needed.
"""

from __future__ import annotations

import structlog
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from m4_agent_host.config import settings

log = structlog.get_logger(__name__)

_resource = Resource.create({"service.name": settings.phoenix_project_name})
_provider = TracerProvider(resource=_resource)

try:
    _exporter = OTLPSpanExporter(endpoint=settings.phoenix_collector_endpoint)
    _provider.add_span_processor(BatchSpanProcessor(_exporter))
    log.info("otel_configured", endpoint=settings.phoenix_collector_endpoint)
except Exception as exc:  # noqa: BLE001
    log.warning("otel_setup_failed", error=str(exc))

trace.set_tracer_provider(_provider)

tracer: trace.Tracer = trace.get_tracer("m4_agent_host")
