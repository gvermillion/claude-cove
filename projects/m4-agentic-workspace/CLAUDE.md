# m4-agentic-workspace

Local-first agentic workspace running on M4 Apple Silicon. Auto-ingests Granola meeting
transcripts via PydanticAI agents and writes structured signals to an Obsidian vault.

## Architecture

Ollama runs natively (full Metal GPU access). All other services (n8n, Qdrant, Open WebUI,
obsidian-mcp, agent-host) run in Docker Compose. Vault is a git-tracked markdown directory
with git-crypt on `private/`. Every agent write triggers a git commit.

## How to Run

    bash scripts/pull-models.sh       # Pull Ollama models (one-time)
    cp .env.example .env && $EDITOR .env
    bash scripts/init-vault.sh        # Scaffold vault + git init
    docker compose up -d
    # Import n8n-workflows/granola-meeting-ingest.json in n8n UI

## Environment Variables

    OLLAMA_BASE_URL         http://host.docker.internal:11434
    OLLAMA_TRIAGE_MODEL     gemma3:9b
    OLLAMA_REASONING_MODEL  qwen2.5:32b
    MCP_API_KEY             bearer token for obsidian-mcp (≥16 chars)
    GRANOLA_SYNC_PATH       absolute path to Granola sync folder
    N8N_BASIC_AUTH_USER     n8n admin username
    N8N_BASIC_AUTH_PASSWORD n8n admin password

## Key Decisions

- Ollama is native (not in Docker) to preserve M4 Metal GPU. All Docker services connect
  to it via `host.docker.internal:11434`.
- agent-host writes directly to the vault filesystem (bind-mounted at /vault). It does not
  go through the obsidian-mcp HTTP layer — that layer serves external LLM clients only.
- Agents are append-only. No agent can overwrite or delete existing vault content.
- git-crypt encrypts `vault/private/`. Notes with `privacy: local` frontmatter are excluded
  from future cross-vault federation queries.
- n8n workflows are version-controlled as JSON in `n8n-workflows/`.

## Standards Overrides

No overrides — workspace standards apply in full.
