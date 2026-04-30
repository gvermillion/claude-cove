# m4-agentic-workspace

Local-first agentic workspace running on M4 Apple Silicon. Auto-ingests Granola meeting
transcripts via PydanticAI agents and writes structured signals to an Obsidian vault.

## Architecture

Ollama runs natively (full Metal GPU access). All other services run in Docker Compose:

- **n8n** (`:5678`) — workflow orchestration, triggers Granola ingest
- **agent-host** (`:8003`) — PydanticAI FastAPI service: triage, reasoning, judge, synthesizer
- **obsidian-mcp** (`:3004`) — MCP HTTP server exposing the vault to external LLM clients
- **qdrant** (`:6333`) — vector memory for entity candidates and semantic recall
- **open-webui** (`:3009`) — chat UI over native Ollama
- **phoenix** (`:6006`, OTLP `:4317`/`:4318`) — Arize Phoenix for LLM tracing; agent-host
  emits OpenInference spans via OTLP HTTP for every LLM call

Vault is a git-tracked markdown directory with git-crypt on `private/`. Every agent write
triggers a git commit.

### agent-host layout

`src/m4_agent_host/` follows the workspace layered layout:

- `domain/` — Pydantic models for signals, entities, meetings
- `application/` — `ingest_service`, `synthesizer`, `date_resolver`, `entity_candidates`
- `infrastructure/ai/` — PydanticAI agents, LLM-as-judge, tokenizer, stoplist
- `infrastructure/vault/` — filesystem reader/writer + git commit helper
- `infrastructure/telemetry/` — OTel tracer → Phoenix, local JSONL trace writer
- `entrypoints/` — FastAPI app and structlog setup

## How to Run

    bash scripts/pull-models.sh       # Pull Ollama models (one-time)
    cp .env.example .env && $EDITOR .env
    bash scripts/init-vault.sh        # Scaffold vault + git init
    docker compose up -d
    # Import n8n-workflows/granola-meeting-ingest.json in n8n UI

## Environment Variables

    OLLAMA_BASE_URL              http://host.docker.internal:11434
    OLLAMA_TRIAGE_MODEL          gemma3:9b
    OLLAMA_REASONING_MODEL       qwen2.5:32b
    OLLAMA_JUDGE_MODEL           qwen3:8b         (agent-host default)
    MCP_API_KEY                  bearer token for obsidian-mcp (≥16 chars)
    GRANOLA_SYNC_PATH            absolute path to Granola sync folder
    N8N_BASIC_AUTH_USER          n8n admin username
    N8N_BASIC_AUTH_PASSWORD      n8n admin password
    PHOENIX_COLLECTOR_ENDPOINT   http://phoenix:6006/v1/traces  (OTLP target)
    PHOENIX_PROJECT_NAME         m4-agent-host                  (span service.name)
    OBSIDIAN_MCP_URL             override to point agent-host at a remote vault MCP

## Key Decisions

- Ollama is native (not in Docker) to preserve M4 Metal GPU. All Docker services connect
  to it via `host.docker.internal:11434`.
- agent-host writes directly to the vault filesystem (bind-mounted at /vault). It does not
  go through the obsidian-mcp HTTP layer — that layer serves external LLM clients only.
- Agents are append-only. No agent can overwrite or delete existing vault content.
- git-crypt encrypts `vault/private/`. Notes with `privacy: local` frontmatter are excluded
  from future cross-vault federation queries.
- n8n workflows are version-controlled as JSON in `n8n-workflows/`.
- LLM observability uses Arize Phoenix over OpenTelemetry (OTLP HTTP). Spans follow the
  OpenInference convention so prompts, responses, token counts, and tool calls are visible
  in the Phoenix UI at http://localhost:6006.

## Standards Overrides

No overrides — workspace standards apply in full.
