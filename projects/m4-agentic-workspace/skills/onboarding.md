---
name: onboarding
description: Non-technical guided setup for the M4 Agentic Workspace. Walk through every step from zero to a running pipeline.
type: process
---

# M4 Agentic Workspace — Onboarding

Guide the user through setup one step at a time. Check each step before proceeding. Surface errors with plain-English fixes — no jargon.

## Checklist

Run each check in order. Do not skip ahead.

1. **Verify Ollama is installed**
   - Run: `ollama --version`
   - If missing: direct user to https://ollama.com/download
   - If found: confirm version ≥ 0.3.0

2. **Pull required models**
   - Run: `bash projects/m4-agentic-workspace/scripts/pull-models.sh`
   - This pulls `gemma3:9b` (3.7 GB) and `qwen2.5:32b` (19 GB). Warn user about download size.
   - Verify: `ollama list` shows both models

3. **Configure environment**
   - Run: `cp projects/m4-agentic-workspace/.env.example projects/m4-agentic-workspace/.env`
   - Ask the user for their Granola sync folder path (usually `~/Library/Application Support/Granola/notes` on Mac)
   - Ask them to choose a password for n8n (any string, stored locally)
   - Write the values into `.env` using Edit tool
   - Set `GRANOLA_SYNC_PATH` to the absolute path (expand `~` to full path)
   - Set `MCP_API_KEY` to any random string ≥ 16 characters

4. **Initialize the vault**
   - Run: `bash projects/m4-agentic-workspace/scripts/init-vault.sh`
   - Expected: "Vault initialized at .../vault"
   - If git-crypt not found: note that `private/` will not be encrypted. Optional install: `brew install git-crypt`

5. **Start the stack**
   - Run: `cd projects/m4-agentic-workspace && docker compose up -d`
   - Wait 30 seconds, then run: `docker compose ps`
   - All 5 services must show status `running`. If any show `exited`, run `docker compose logs <service-name>` and help diagnose.

6. **Verify each service**
   - Agent host: `curl http://localhost:8000/health` → `{"status":"ok"}`
   - Qdrant: `curl http://localhost:6333/healthz` → contains `"title":"qdrant - healthy"`
   - n8n: open `http://localhost:5678` in browser → login page appears
   - Open WebUI: open `http://localhost:3000` → chat interface appears

7. **Import n8n workflow**
   - Open `http://localhost:5678`, log in with credentials from `.env`
   - Click **+** → **Import from file**
   - Select `projects/m4-agentic-workspace/n8n-workflows/granola-meeting-ingest.json`
   - Click the **Activate** toggle

8. **Test the pipeline**
   - Ask user: "Do you have a Granola meeting transcript we can test with, or should I create a sample?"
   - If sample: write a fake transcript to the Granola sync folder
   - Wait 30 seconds, then check: `ls projects/m4-agentic-workspace/vault/inbox/meetings/`
   - If the file appears: pipeline is working. Show the user what was extracted from the vault.
   - If not: check n8n execution log at `http://localhost:5678` → Executions

## Common Errors

| Error | Fix |
|---|---|
| `docker: command not found` | Install Docker Desktop from https://docker.com/products/docker-desktop |
| `GRANOLA_SYNC_PATH` has a `~` | Replace `~` with your full home path, e.g. `/Users/yourname` |
| `MCP_API_KEY must be at least 16 characters` | Generate one: `openssl rand -hex 16` |
| n8n shows `Connection refused` to agent-host | Wait 30s after `docker compose up` for agent-host to finish building |
| Vault git commit fails | Run `git -C vault config user.email "agents@local"` |
