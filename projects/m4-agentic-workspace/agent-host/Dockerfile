# syntax=docker/dockerfile:1

# ---- builder stage ----
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

COPY src/ src/

# ---- runtime stage ----
FROM python:3.12-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system app && useradd --system --gid app app

WORKDIR /app

COPY --from=builder /app /app

RUN chown -R app:app /app

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["/app/.venv/bin/uvicorn", "m4_agent_host.entrypoints.api:app", \
     "--host", "0.0.0.0", "--port", "8000"]
