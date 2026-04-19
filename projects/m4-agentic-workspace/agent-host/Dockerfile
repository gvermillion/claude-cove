FROM python:3.12-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install uv

COPY pyproject.toml .
RUN uv sync --no-dev

COPY src/ src/

CMD ["uv", "run", "uvicorn", "m4_agent_host.entrypoints.api:app", \
     "--host", "0.0.0.0", "--port", "8000"]
