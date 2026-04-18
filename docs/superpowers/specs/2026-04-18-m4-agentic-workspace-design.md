# M4 Agentic Workspace — MVP Design Spec

**Date:** 2026-04-18
**Status:** Approved for implementation
**Scope:** Inference layer + Obsidian vault + Granola meeting pipeline
**Out of scope (later):** Email triage integration, voice interface, enterprise federation

---

## 1. Goals

Transition from reactive AI usage to a proactive local background daemon that:
- Ingests Granola meeting transcripts automatically
- Extracts structured signals (people, risks, opportunities, tasks) via PydanticAI agents
- Writes structured knowledge into an Obsidian-style markdown vault
- Runs entirely on-device (no data egress)
- Is reproducible: anyone can clone and run with `docker compose up`

---

## 2. Architecture

### Runtime split

| Layer | Where | Why |
|---|---|---|
| Ollama (inference) | Native macOS | Full M4 Metal GPU access; Docker on Mac loses this via Linux VM |
| All other services | Docker Compose | Portable, reproducible, single-command startup |

### Docker Compose services

| Service | Port | Technology | Role |
|---|---|---|---|
| `n8n` | 5678 | n8n | Orchestrator: file watchers, cron, webhooks |
| `qdrant` | 6333 | Qdrant | Vector memory for semantic search |
| `open-webui` | 3000 | Open WebUI | Chat UI connected to native Ollama |
| `obsidian-mcp` | 3001 | TypeScript (existing project) | Local vault read/write via MCP protocol |
| `agent-host` | 8000 | FastAPI + PydanticAI | Specialist agent factory |

### Ollama models

| Model | Role | Hardware target |
|---|---|---|
| `gemma3:9b` | Signal extraction agents (parallel, fast) | CPU + GPU |
| `qwen2.5:32b` | Reasoning, synthesis, complex planning | GPU (MLX) |

### Data flow

```
Granola app (native macOS)
  └── syncs transcript → ~/granola-sync/   (bind-mounted into n8n)
        └── n8n File Watcher detects new file
              └── POST agent-host:8000/ingest/meeting
                    └── asyncio.gather → 4 parallel PydanticAI agents
                          └── MCP calls → obsidian-mcp:3001 → vault writes
                                └── git commit: "agent(meeting): ingest <title>"
```

### Connection topology

```
agent-host  →  host.docker.internal:11434  (Ollama, native)
agent-host  →  obsidian-mcp:3001           (vault writes, Docker internal)
agent-host  →  qdrant:6333                 (vector memory, Docker internal)
n8n         →  agent-host:8000             (webhook trigger)
open-webui  →  host.docker.internal:11434  (chat, native Ollama)
```

### VPS opt-in

Users with a VPS-hosted `obsidian-mcp` can set `OBSIDIAN_MCP_URL` in `.env` to override the local service. Default is `http://obsidian-mcp:3001`.

---

## 3. Vault Structure

The vault lives at `./vault/` (bind-mounted into `obsidian-mcp`). It is a git repository — every agent write triggers a commit. This is the immutable audit trail.

```
vault/
  _system/             # Meta — agents read, humans rarely touch
    CLAUDE.md          # Constitution: schema rules, link conventions, merge rules
    index.md           # Dynamic dashboard: active projects, weekly priorities, signals
    log.md             # Append-only human-readable agent action log
  journal/
    daily/             # YYYY-MM-DD.md
    weekly/            # YYYY-Www.md (synthesized from dailies)
    monthly/           # YYYY-MM.md (synthesized from weeklies)
  projects/            # Any active project — work, personal, research
  areas/               # Ongoing responsibilities (not time-bounded)
  people/              # Anyone worth tracking: colleagues, clients, contacts
  resources/           # Concepts, patterns, reference material
  inbox/               # Processing queue (temporary)
    meetings/          # Granola transcripts land here first (immutable)
    voice/             # Future: voice notes
    email/             # Future: email snippets
  library/             # Permanent raw captures (never modified after write)
    web/               # Saved pages: URL + clipped content as markdown
    pdf/               # PDF files + extracted text sidecar (.md)
    video/             # Links + transcripts/summaries
    audio/             # Voice memos, recordings
    misc/
  private/             # git-crypt encrypted — never included in cross-vault federation
    journal/
    projects/
    people/
    notes/             # Freeform personal captures
```

### Privacy model (three tiers)

| Tier | Location | Encrypted | Local agents | Cross-vault |
|---|---|---|---|---|
| **Private** | `private/` | Yes (git-crypt + GPG) | Yes | Never |
| **Internal** | everywhere else, `privacy: local` frontmatter | No | Yes | No |
| **Federated** | everywhere else (default) | No | Yes | Yes |

Per-note opt-out via frontmatter:
```yaml
---
privacy: local   # internal only, excluded from cross-vault
---
```

Notes without a `privacy` field are eligible for cross-vault reasoning by default.

### Vault constitution (`_system/CLAUDE.md`)

All agents must follow:
- Every note has frontmatter: `type`, `updated`, `created`, `privacy` (optional)
- Links use wikilink syntax: `[[person-name]]`, `[[project-slug]]`
- Agents **append only** — never overwrite existing content
- Frontmatter fields are upserted (merged, not replaced)
- Every agent action appends one line to `_system/log.md`: `YYYY-MM-DDTHH:MM:SS | <agent> | <action> | <target>`

### Audit trail

| Layer | Mechanism | Immutability |
|---|---|---|
| **Git history** | Every vault write = one `git commit` | Hard — ground truth, revert via `git revert` |
| **`_system/log.md`** | Append-only human-readable log | Soft — readable summary, backed by git |
| **`inbox/meetings/`** | Raw transcripts never modified after write | Enforced by agent merge rules |

---

## 4. Granola Meeting Pipeline

### Trigger

n8n watches `~/granola-sync/` (bind-mounted) for new files. On detection, it POSTs to `agent-host:8000/ingest/meeting` with transcript content and file metadata.

### Agent-host processing

`POST /ingest/meeting` → writes raw transcript to `inbox/meetings/YYYY-MM-DD-<slug>.md` → fans out four agents via `asyncio.gather()`:

| Agent | Model | Extracts | Writes to |
|---|---|---|---|
| `EntityAgent` | gemma3:9b | People, titles, relationships, rapport signals | `people/<name>.md` (upsert) |
| `RiskAgent` | gemma3:9b | Hedging language, timeline slippage, blockers | `projects/<initiative>.md` (append) |
| `OpportunityAgent` | gemma3:9b | Expansion opps, new workflows, lateral problems | `resources/` + `projects/` |
| `TaskAgent` | gemma3:9b | Next steps, owners, ETAs | `journal/daily/YYYY-MM-DD.md` (append) |

All four run in parallel against the same transcript. A coordinator in `agent-host` collects all results via `asyncio.gather()`, then writes them sequentially to the vault (one MCP call at a time) to avoid race conditions on shared files like `_system/log.md` and `journal/daily/`.

### PydanticAI schema (example: MeetingSignals)

```python
class Entity(BaseModel):
    name: str
    title: str | None
    relationship: str           # e.g. "client", "stakeholder", "colleague"
    rapport_notes: list[str]

class Risk(BaseModel):
    description: str
    severity: Literal["low", "medium", "high"]
    project_slug: str | None    # links to projects/ file

class Opportunity(BaseModel):
    description: str
    type: Literal["expansion", "workflow", "lateral"]

class Task(BaseModel):
    description: str
    owner: str | None
    eta: str | None             # ISO date string if mentioned

class MeetingSignals(BaseModel):
    entities: list[Entity]
    risks: list[Risk]
    opportunities: list[Opportunity]
    tasks: list[Task]
```

### Post-processing

After all agents complete:
1. Append summary line to `_system/log.md`
2. Update `_system/index.md` dashboard if new projects or risks detected
3. Run `git add -A && git commit -m "agent(meeting): ingest <slug>"` in vault repo

---

## 5. Reporting Engine (post-MVP, designed now)

| Cadence | n8n trigger | Agent action |
|---|---|---|
| Daily | Cron 11 PM | Summarize `_system/log.md` → append to `journal/daily/YYYY-MM-DD.md` |
| Weekly | Cron Sunday 10 PM | Synthesize week's dailies → write `journal/weekly/YYYY-Www.md` |
| Monthly | Cron last day 10 PM | Deep-crawl `resources/` for forgotten opportunities → write `journal/monthly/YYYY-MM.md` |

Uses `qwen2.5:32b` (reasoning model) for synthesis. Designed now, wired in after the meeting loop is stable.

---

## 6. Security & Compliance

- **Local-first:** zero data egress; all inference on Apple Silicon via Ollama
- **Encryption:** `git-crypt` on `private/` using GPG (same pattern as `email-triage` project)
- **Auditability:** git history of vault is the immutable ground truth; `_system/log.md` is the human-readable summary
- **Versioning:** vault is a git repo; agent hallucinations are reverted via `git revert <commit>`
- **Agent permissions:** agents append only; destructive operations require explicit human git action
- **Cross-vault federation:** `obsidian-mcp` will expose a `federated` auth scope that excludes `private/` and `privacy: local` notes (implemented when federation is built)

---

## 7. Project Layout

```
projects/m4-agentic-workspace/
  docker-compose.yml         # All Docker services
  .env.example               # Required env vars
  vault/                     # The Obsidian vault (git repo)
    _system/
    journal/ projects/ areas/ people/ resources/ inbox/ library/ private/
  agent-host/                # Python FastAPI + PydanticAI service
    src/
      m4_agent_host/
        domain/
        application/
        infrastructure/
          ai/                # Ollama client (adapted from email-triage)
          mcp/               # obsidian-mcp client
          vault/             # Git commit helper
        entrypoints/         # FastAPI routes
    tests/
    pyproject.toml
    Dockerfile
  n8n-workflows/             # Exported n8n workflow JSON files (version-controlled)
  skills/
    onboarding.md            # Non-technical setup walkthrough
    vault-capture.md
    vault-search.md
    project-status.md
    weekly-review.md
    add-person.md
    vault-health.md
  scripts/
    init-vault.sh            # Scaffold vault structure + git init + git-crypt setup
    pull-models.sh           # Pull required Ollama models

CLAUDE.md                    # Project-specific context
README.md
.env.example
```

---

## 8. Environment Variables

```bash
# Inference
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_TRIAGE_MODEL=gemma3:9b
OLLAMA_REASONING_MODEL=qwen2.5:32b

# Vault
OBSIDIAN_MCP_URL=http://obsidian-mcp:3001   # override for VPS
OBSIDIAN_MCP_TOKEN=<bearer-token>
VAULT_PATH=./vault                           # bind-mounted into obsidian-mcp at /vault; obsidian-mcp reads from /vault internally

# Granola
GRANOLA_SYNC_PATH=${HOME}/granola-sync      # bind mount source (absolute; tilde not valid in Docker)

# Vector memory
QDRANT_URL=http://qdrant:6333

# n8n
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<password>

# GPG (private/ encryption)
GPG_KEY_ID=<key-id>
```

---

## 9. Skill Layer

Skills are markdown instruction files (`.md`) that Claude Code loads on demand. They encode repeatable workflows so non-technical users never need to read documentation or remember commands.

### 9.1 Onboarding Skill (`onboarding`)

Target user: non-technical. Goal: get from zero to a running system in one session.

Checklist the skill walks through:
1. Verify Ollama is installed and running (`ollama --version`)
2. Pull required models (`scripts/pull-models.sh`)
3. Copy `.env.example` → `.env`, fill in required values
4. Run `docker compose up -d` and confirm all services healthy
5. Run `scripts/init-vault.sh` to scaffold vault + initialize git + configure git-crypt
6. Open n8n at `localhost:5678` and import workflows from `n8n-workflows/`
7. Configure Granola sync folder path in `.env`
8. Test the pipeline: drop a sample transcript into `~/granola-sync/` and verify vault update

The skill is conversational — it checks each step before proceeding and surfaces errors with plain-English fixes.

### 9.2 Skill Library

Operational skills for day-to-day use. All read/write the vault via `obsidian-mcp`.

| Skill | Trigger phrase | What it does |
|---|---|---|
| `vault-capture` | "capture this" | Quick-write freeform note to `inbox/` with timestamp and auto-tag |
| `vault-search` | "find anything about X" | Semantic search via Qdrant + surface top matches with links |
| `project-status` | "status of [project]" | Synthesize `projects/<slug>.md` + recent log entries into a summary |
| `weekly-review` | "run weekly review" | Trigger n8n weekly cron manually; preview output before committing |
| `add-person` | "add [name]" | Stub a new `people/<name>.md` with prompted fields (title, relationship, context) |
| `vault-health` | "check vault" | Audit: broken wikilinks, notes missing frontmatter, unprocessed inbox items |

Each skill enforces the vault constitution (append-only, wikilink syntax, required frontmatter) so casual users can't accidentally corrupt the schema.

### 9.3 Skill Storage

```
projects/m4-agentic-workspace/
  skills/
    onboarding.md
    vault-capture.md
    vault-search.md
    project-status.md
    weekly-review.md
    add-person.md
    vault-health.md
```

Skills are plain markdown — no code, no dependencies. They compose with the existing Claude Code skill infrastructure.

---

## 10. Model Selection Guide

Annotates which Claude model to use for each class of task in this project, balancing capability against token cost.

| Model | ID | Best for | Avoid when |
|---|---|---|---|
| **Haiku** | `claude-haiku-4-5-20251001` | Boilerplate, file scaffolding, schema validation, simple transforms | Complex reasoning, multi-file architecture decisions |
| **Sonnet** | `claude-sonnet-4-6` | Code implementation, debugging, agent prompt engineering, integration wiring | Trivial tasks (overkill), deep architectural trade-off analysis |
| **Opus** | `claude-opus-4-7` | Architecture decisions, spec writing, complex multi-step planning, prompt design for agents | Routine implementation (expensive) |

### Task-level model assignments (implementation plan)

| Task category | Recommended model | Rationale |
|---|---|---|
| Scaffold `docker-compose.yml` + Dockerfiles | Haiku | Mechanical, pattern-based, well-defined output |
| Write vault init script + constitution | Sonnet | Requires judgment on schema design |
| Implement `agent-host` FastAPI routes | Sonnet | Standard implementation, known patterns |
| Design PydanticAI agent schemas | Sonnet | Schema design needs precision, not deep reasoning |
| Write agent system prompts | Opus | Prompt quality directly impacts extraction quality |
| Wire n8n workflows (JSON config) | Haiku | JSON transformation, no reasoning needed |
| Implement Qdrant embedding + retrieval | Sonnet | Standard RAG pattern, some judgment on chunking |
| Write onboarding skill | Sonnet | Instructional writing + error handling paths |
| Write operational skills (vault-capture, etc.) | Haiku | Short, templated instruction files |
| Debug agent extraction quality | Opus | Requires understanding failure modes and prompt repair |
| Write tests | Sonnet | Standard pytest patterns, some judgment on coverage |

**Token optimization rule:** default to Sonnet. Step down to Haiku for pure scaffolding/boilerplate. Step up to Opus only for prompt engineering and architectural decisions where quality directly determines system behavior.

---

## 11. Key Constraints & Decisions

- **Ollama runs natively** (not in Docker) to preserve M4 Metal GPU access. Docker on Mac runs via a Linux VM, losing direct GPU passthrough.
- **obsidian-mcp is reused** from `projects/obsidian-mcp/` — Dockerized locally, same codebase as the VPS deployment.
- **agent-host adapts Ollama client** from `projects/email-triage/` rather than reimplementing.
- **Agents append-only** as the primary hallucination guard — no single agent can destroy information.
- **git-crypt** for `private/` matches the GPG pattern in `email-triage` (consistent toolchain).
- **n8n workflows are version-controlled** as exported JSON in `n8n-workflows/` so the orchestration logic is reproducible.
- **Qdrant included from day one** — lightweight, no configuration burden, avoids a future rewire.
- **Voice interface, email integration, enterprise federation** are explicitly out of MVP scope.
