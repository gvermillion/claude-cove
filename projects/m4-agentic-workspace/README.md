# M4 Agentic Workspace

A local-first background daemon for M4 Apple Silicon. Automatically processes Granola
meeting transcripts through specialist AI agents and builds a structured knowledge base
in your Obsidian vault — with zero data leaving your machine.

## Quick Start

**Prerequisites:** Docker Desktop, Ollama, git-crypt (optional, for vault encryption)

```bash
git clone <this-repo>
cd projects/m4-agentic-workspace

# 1. Pull models (~23 GB total)
bash scripts/pull-models.sh

# 2. Configure
cp .env.example .env
# Edit .env with your GRANOLA_SYNC_PATH and credentials

# 3. Initialize vault
bash scripts/init-vault.sh

# 4. Start
docker compose up -d

# 5. Import workflow in n8n
# Open http://localhost:5678 → Import → n8n-workflows/granola-meeting-ingest.json
```

For non-technical setup, use the onboarding skill in Claude Code: `/onboarding`

## Services

| Service | URL | Purpose |
|---|---|---|
| Open WebUI | http://localhost:3000 | Chat with local Ollama models |
| n8n | http://localhost:5678 | Workflow orchestration |
| Agent Host | http://localhost:8000 | PydanticAI signal extraction API |
| obsidian-mcp | http://localhost:3001 | Vault MCP interface for Claude |
| Qdrant | http://localhost:6333 | Vector memory |

## Skills

- `/onboarding` — guided first-time setup
- `/vault-capture` — quick note capture
- `/vault-search` — search the vault
- `/project-status` — summarize a project
- `/weekly-review` — synthesize the week
- `/add-person` — add/update a person
- `/vault-health` — audit vault integrity
