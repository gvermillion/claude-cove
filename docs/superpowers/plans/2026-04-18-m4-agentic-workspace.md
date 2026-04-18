# M4 Agentic Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first agentic workspace that auto-ingests Granola meeting transcripts, extracts structured signals via PydanticAI agents, and writes them to a versioned Obsidian vault — all running on M4 Apple Silicon with zero data egress.

**Architecture:** Ollama runs natively for full M4 Metal GPU access. All other services (n8n, Qdrant, Open WebUI, obsidian-mcp, agent-host) run in Docker Compose. The vault is a bind-mounted git repo; every agent write triggers a commit. Skills provide non-technical users a guided setup and day-to-day operational interface.

**Tech Stack:** Python 3.12, FastAPI, PydanticAI, pydantic-settings, structlog, httpx, python-frontmatter, uv, Docker Compose, n8n, Qdrant, Open WebUI, TypeScript obsidian-mcp (reused), git-crypt

---

## File Map

```
projects/m4-agentic-workspace/
  docker-compose.yml
  .env.example
  .gitignore
  CLAUDE.md
  README.md
  vault/                                   # git-tracked Obsidian vault
    .gitattributes                         # git-crypt config
    _system/CLAUDE.md                      # vault constitution
    _system/index.md
    _system/log.md
    journal/daily/  weekly/  monthly/
    projects/  areas/  people/  resources/
    inbox/meetings/  inbox/voice/  inbox/email/
    library/web/  library/pdf/  library/video/  library/audio/  library/misc/
    private/journal/  private/projects/  private/people/  private/notes/
  agent-host/
    Dockerfile
    pyproject.toml
    .python-version
    src/m4_agent_host/
      __init__.py
      config.py
      domain/
        __init__.py
        models.py
      application/
        __init__.py
        ingest_service.py
      infrastructure/
        __init__.py
        ai/
          __init__.py
          agents.py
        vault/
          __init__.py
          writer.py
          git_helper.py
      entrypoints/
        __init__.py
        api.py
        logging_setup.py
    tests/
      unit/domain/test_models.py
      unit/application/test_ingest_service.py
      unit/infrastructure/vault/test_writer.py
      unit/infrastructure/vault/test_git_helper.py
      integration/test_pipeline.py
    .pre-commit-config.yaml
  n8n-workflows/
    granola-meeting-ingest.json
  scripts/
    init-vault.sh
    pull-models.sh
  skills/
    onboarding.md
    vault-capture.md
    vault-search.md
    project-status.md
    weekly-review.md
    add-person.md
    vault-health.md
```

**Note on obsidian-mcp env var:** The existing `projects/obsidian-mcp/src/config.ts` uses `MCP_API_KEY` (not `MCP_AUTH_TOKEN`). Use `MCP_API_KEY` in all configs.

---

## Phase 0: Infrastructure

### Task 1: Project scaffold + Docker Compose
`model: haiku` | `effort: M`

**Files:**
- Create: `projects/m4-agentic-workspace/docker-compose.yml`
- Create: `projects/m4-agentic-workspace/.env.example`
- Create: `projects/m4-agentic-workspace/.gitignore`

- [ ] **Step 1: Create the project directory**

```bash
mkdir -p projects/m4-agentic-workspace
cd projects/m4-agentic-workspace
```

- [ ] **Step 2: Write `.gitignore`**

```
.env
vault/private/
*.pyc
__pycache__/
.venv/
```

- [ ] **Step 3: Write `docker-compose.yml`**

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_BASIC_AUTH_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_BASIC_AUTH_PASSWORD}
      - WEBHOOK_URL=http://localhost:5678/
    volumes:
      - n8n_data:/home/node/.n8n
      - ${GRANOLA_SYNC_PATH}:/granola-sync:ro
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - agentic

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    networks:
      - agentic

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    ports:
      - "3000:8080"
    environment:
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
    volumes:
      - open_webui_data:/app/backend/data
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - agentic

  obsidian-mcp:
    build:
      context: ../obsidian-mcp
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      - VAULT_PATH=/vault
      - MCP_API_KEY=${MCP_API_KEY}
      - NODE_ENV=production
    volumes:
      - ./vault:/vault
    networks:
      - agentic

  agent-host:
    build:
      context: ./agent-host
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
      - OLLAMA_TRIAGE_MODEL=${OLLAMA_TRIAGE_MODEL:-gemma3:9b}
      - OLLAMA_REASONING_MODEL=${OLLAMA_REASONING_MODEL:-qwen2.5:32b}
      - VAULT_PATH=/vault
      - QDRANT_URL=http://qdrant:6333
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
    volumes:
      - ./vault:/vault
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - qdrant
      - obsidian-mcp
    networks:
      - agentic

volumes:
  n8n_data:
  qdrant_data:
  open_webui_data:

networks:
  agentic:
    driver: bridge
```

- [ ] **Step 4: Write `.env.example`**

```bash
# Inference (Ollama runs natively — not in Docker)
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_TRIAGE_MODEL=gemma3:9b
OLLAMA_REASONING_MODEL=qwen2.5:32b

# Vault
MCP_API_KEY=your-secret-key-min-16-chars

# Granola sync (absolute path — tilde not valid in Docker bind mounts)
GRANOLA_SYNC_PATH=/Users/yourname/granola-sync

# n8n
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=changeme

# Optional
LOG_LEVEL=INFO
```

- [ ] **Step 5: Commit**

```bash
git add projects/m4-agentic-workspace/docker-compose.yml \
        projects/m4-agentic-workspace/.env.example \
        projects/m4-agentic-workspace/.gitignore
git commit -m "feat(m4-agentic-workspace): add Docker Compose infrastructure"
```

---

### Task 2: Vault scaffold + git-crypt + constitution
`model: sonnet` | `effort: M`

**Files:**
- Create: `projects/m4-agentic-workspace/scripts/init-vault.sh`
- Create: `projects/m4-agentic-workspace/vault/_system/CLAUDE.md`
- Create: `projects/m4-agentic-workspace/vault/_system/index.md`
- Create: `projects/m4-agentic-workspace/vault/_system/log.md`

- [ ] **Step 1: Write `scripts/init-vault.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

VAULT_DIR="$(cd "$(dirname "$0")/.." && pwd)/vault"

echo "Initializing vault at $VAULT_DIR..."

# Create all directories
dirs=(
  "_system"
  "journal/daily" "journal/weekly" "journal/monthly"
  "projects" "areas" "people" "resources"
  "inbox/meetings" "inbox/voice" "inbox/email"
  "library/web" "library/pdf" "library/video" "library/audio" "library/misc"
  "private/journal" "private/projects" "private/people" "private/notes"
)
for d in "${dirs[@]}"; do
  mkdir -p "$VAULT_DIR/$d"
done

# Initialize git if not already
if [ ! -d "$VAULT_DIR/.git" ]; then
  git -C "$VAULT_DIR" init
  git -C "$VAULT_DIR" config user.name "agentic-workspace"
  git -C "$VAULT_DIR" config user.email "agents@local"
fi

# Configure git-crypt for private/
if command -v git-crypt &>/dev/null; then
  if [ ! -f "$VAULT_DIR/.git-crypt/keys/default" ]; then
    git -C "$VAULT_DIR" crypt init
    echo "private/** filter=git-crypt diff=git-crypt" >> "$VAULT_DIR/.gitattributes"
    echo "*.gpg filter=git-crypt diff=git-crypt" >> "$VAULT_DIR/.gitattributes"
    echo "git-crypt initialized. Run 'git-crypt add-gpg-user <KEY_ID>' to add your GPG key."
  fi
else
  echo "WARNING: git-crypt not found. Install it to encrypt private/. Skipping."
fi

# Write seed files if they don't exist
[ -f "$VAULT_DIR/_system/log.md" ] || echo "# Agent Action Log

| Timestamp | Agent | Action | Target |
|---|---|---|---|
" > "$VAULT_DIR/_system/log.md"

[ -f "$VAULT_DIR/_system/index.md" ] || echo "# Dashboard

_Updated by agents. Edit manually to set priorities._

## Active Projects

## This Week's Focus

## Recent Risks

## Open Tasks
" > "$VAULT_DIR/_system/index.md"

# Initial commit
git -C "$VAULT_DIR" add -A
git -C "$VAULT_DIR" commit -m "chore(vault): initialize structure" --allow-empty

echo "Vault initialized at $VAULT_DIR"
```

```bash
chmod +x scripts/init-vault.sh
```

- [ ] **Step 2: Write vault constitution `vault/_system/CLAUDE.md`**

```markdown
# Vault Constitution

All agents writing to this vault MUST follow these rules.

## Frontmatter Schema

Every note must include:

\`\`\`yaml
---
type: person | project | area | resource | note | transcript
created: ISO-8601 datetime
updated: ISO-8601 datetime
privacy: local          # optional — omit for federated-eligible
---
\`\`\`

## Linking

Use wikilink syntax: \`[[slug]]\`. Slugs are lowercase, hyphen-separated (e.g. \`[[jane-doe]]\`, \`[[acme-corp]]\`).

## Merge Rules

- **Append only.** Never overwrite existing content.
- Frontmatter fields are upserted (merged, not replaced).
- New entities get a stub file if none exists.
- Every write appends one line to \`_system/log.md\`.

## Log Format

\`\`\`
YYYY-MM-DDTHH:MM:SSZ | <agent_name> | <action> | <target>
\`\`\`

## Privacy

- \`private/\` is git-crypt encrypted. Never federated.
- Notes with \`privacy: local\` frontmatter are excluded from cross-vault queries.
- Default (no privacy field) = eligible for federation.

## Prohibited

- Overwriting or truncating existing note content
- Deleting files (use deprecation frontmatter instead: \`status: deprecated\`)
- Writing binary files to any folder other than \`library/\`
```

- [ ] **Step 3: Run init script and verify**

```bash
cd projects/m4-agentic-workspace
bash scripts/init-vault.sh
```

Expected output: `Vault initialized at .../vault`

```bash
ls vault/_system/   # should show CLAUDE.md  index.md  log.md
git -C vault log --oneline  # should show one commit
```

- [ ] **Step 4: Commit**

```bash
git add projects/m4-agentic-workspace/scripts/init-vault.sh \
        projects/m4-agentic-workspace/vault/
git commit -m "feat(m4-agentic-workspace): add vault scaffold and constitution"
```

---

### Task 3: Model pull script + stack smoke test
`model: haiku` | `effort: S`

**Files:**
- Create: `projects/m4-agentic-workspace/scripts/pull-models.sh`

- [ ] **Step 1: Write `scripts/pull-models.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Pulling Ollama models..."
ollama pull gemma3:9b
ollama pull qwen2.5:32b
echo "Done. Verify with: ollama list"
```

```bash
chmod +x scripts/pull-models.sh
```

- [ ] **Step 2: Copy and fill in `.env`**

```bash
cd projects/m4-agentic-workspace
cp .env.example .env
# Edit .env: set GRANOLA_SYNC_PATH to your absolute granola folder path
# Set MCP_API_KEY to any string >= 16 chars
mkdir -p $(grep GRANOLA_SYNC_PATH .env | cut -d= -f2)
```

- [ ] **Step 3: Start the stack and verify all services are healthy**

```bash
docker compose up -d
sleep 15
docker compose ps
```

Expected: all 5 services show `running`. Verify:
- `curl http://localhost:8000/health` → `{"status":"ok"}` (after agent-host is built in Task 7)
- `curl http://localhost:3001/health` → `200 OK`
- `curl http://localhost:6333/healthz` → `{"title":"qdrant - healthy",...}`
- Open `http://localhost:5678` → n8n login page
- Open `http://localhost:3000` → Open WebUI

- [ ] **Step 4: Commit**

```bash
git add projects/m4-agentic-workspace/scripts/pull-models.sh
git commit -m "feat(m4-agentic-workspace): add model pull script"
```

---

## Phase 1: Agent Host Core

### Task 4: Python project setup
`model: haiku` | `effort: S`

**Files:**
- Create: `projects/m4-agentic-workspace/agent-host/pyproject.toml`
- Create: `projects/m4-agentic-workspace/agent-host/.python-version`
- Create: `projects/m4-agentic-workspace/agent-host/Dockerfile`
- Create: `projects/m4-agentic-workspace/agent-host/src/m4_agent_host/__init__.py`

- [ ] **Step 1: Write `pyproject.toml`**

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "m4-agent-host"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "pydantic>=2.8",
    "pydantic-settings>=2.4",
    "pydantic-ai[ollama]>=0.0.13",
    "python-frontmatter>=1.1",
    "structlog>=24.4",
    "httpx>=0.27",
    "orjson>=3.10",
    "tenacity>=8.3",
]

[project.scripts]
agent-host = "m4_agent_host.entrypoints.api:main"

[tool.hatch.build.targets.wheel]
packages = ["src/m4_agent_host"]

[tool.uv]
dev-dependencies = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
    "pytest-cov>=5.0",
    "respx>=0.21",
    "ruff>=0.6",
    "pyright>=1.1.380",
    "pre-commit>=3.8",
]

[tool.ruff]
target-version = "py312"
line-length = 100
src = ["src", "tests"]

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "ANN", "S", "B", "A", "C4", "RET", "SIM"]
ignore = ["ANN101", "ANN102"]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["ANN", "S101"]

[tool.pyright]
pythonVersion = "3.12"
typeCheckingMode = "strict"
venvPath = "."
venv = ".venv"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "--strict-markers"
markers = [
    "integration: marks tests requiring external services",
    "unit: marks fast isolated unit tests",
]

[tool.coverage.run]
source = ["src"]
[tool.coverage.report]
fail_under = 80
```

- [ ] **Step 2: Write `.python-version`**

```
3.12
```

- [ ] **Step 3: Write `Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml .
RUN uv sync --no-dev

COPY src/ src/

CMD ["uv", "run", "uvicorn", "m4_agent_host.entrypoints.api:app", \
     "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: Create package `__init__.py` files and install deps**

```bash
cd projects/m4-agentic-workspace/agent-host
mkdir -p src/m4_agent_host/{domain,application,infrastructure/{ai,vault},entrypoints}
touch src/m4_agent_host/__init__.py
touch src/m4_agent_host/domain/__init__.py
touch src/m4_agent_host/application/__init__.py
touch src/m4_agent_host/infrastructure/__init__.py
touch src/m4_agent_host/infrastructure/ai/__init__.py
touch src/m4_agent_host/infrastructure/vault/__init__.py
touch src/m4_agent_host/entrypoints/__init__.py
mkdir -p tests/unit/domain tests/unit/application \
         tests/unit/infrastructure/vault \
         tests/integration
touch tests/__init__.py tests/unit/__init__.py \
      tests/unit/domain/__init__.py \
      tests/unit/application/__init__.py \
      tests/unit/infrastructure/__init__.py \
      tests/unit/infrastructure/vault/__init__.py \
      tests/integration/__init__.py
uv sync
```

- [ ] **Step 5: Commit**

```bash
git add projects/m4-agentic-workspace/agent-host/
git commit -m "feat(agent-host): add Python project scaffold"
```

---

### Task 5: Config + domain models
`model: sonnet` | `effort: S`

**Files:**
- Create: `agent-host/src/m4_agent_host/config.py`
- Create: `agent-host/src/m4_agent_host/domain/models.py`
- Create: `agent-host/tests/unit/domain/test_models.py`

- [ ] **Step 1: Write failing tests**

`tests/unit/domain/test_models.py`:
```python
from m4_agent_host.domain.models import (
    Entity, Risk, Opportunity, Task, MeetingSignals, MeetingIngestRequest
)


def test_meeting_signals_defaults_to_empty_lists() -> None:
    signals = MeetingSignals()
    assert signals.entities == []
    assert signals.risks == []
    assert signals.opportunities == []
    assert signals.tasks == []


def test_entity_relationship_defaults_to_unknown() -> None:
    entity = Entity(name="Jane Doe")
    assert entity.relationship == "unknown"
    assert entity.rapport_notes == []


def test_risk_requires_severity() -> None:
    risk = Risk(description="Timeline slipping", severity="high")
    assert risk.project_slug is None


def test_task_all_optional_except_description() -> None:
    task = Task(description="Send proposal")
    assert task.owner is None
    assert task.eta is None


def test_meeting_ingest_request_minimal() -> None:
    req = MeetingIngestRequest(transcript="hello", filename="2024-01-15.md")
    assert req.title is None
    assert req.meeting_date is None
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd agent-host
uv run pytest tests/unit/domain/test_models.py -v
```

Expected: `ERROR` — `ModuleNotFoundError: No module named 'm4_agent_host'`

- [ ] **Step 3: Write `config.py`**

```python
from __future__ import annotations
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_triage_model: str = "gemma3:9b"
    ollama_reasoning_model: str = "qwen2.5:32b"

    vault_path: str = "/vault"
    qdrant_url: str = "http://qdrant:6333"
    log_level: str = "INFO"


settings = Settings()
```

- [ ] **Step 4: Write `domain/models.py`**

```python
from __future__ import annotations
from typing import Literal
from pydantic import BaseModel


class Entity(BaseModel):
    name: str
    title: str | None = None
    relationship: Literal["client", "colleague", "stakeholder", "vendor", "unknown"] = "unknown"
    rapport_notes: list[str] = []


class Risk(BaseModel):
    description: str
    severity: Literal["low", "medium", "high"]
    project_slug: str | None = None


class Opportunity(BaseModel):
    description: str
    type: Literal["expansion", "workflow", "lateral"]


class Task(BaseModel):
    description: str
    owner: str | None = None
    eta: str | None = None


class MeetingSignals(BaseModel):
    entities: list[Entity] = []
    risks: list[Risk] = []
    opportunities: list[Opportunity] = []
    tasks: list[Task] = []


class MeetingIngestRequest(BaseModel):
    transcript: str
    filename: str
    title: str | None = None
    meeting_date: str | None = None
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
uv run pytest tests/unit/domain/test_models.py -v
```

Expected: `5 passed`

- [ ] **Step 6: Commit**

```bash
git add agent-host/src/m4_agent_host/config.py \
        agent-host/src/m4_agent_host/domain/models.py \
        agent-host/tests/unit/domain/test_models.py
git commit -m "feat(agent-host): add config and domain models"
```

---

### Task 6: Vault writer
`model: sonnet` | `effort: M`

**Files:**
- Create: `agent-host/src/m4_agent_host/infrastructure/vault/writer.py`
- Create: `agent-host/src/m4_agent_host/infrastructure/vault/git_helper.py`
- Create: `agent-host/tests/unit/infrastructure/vault/test_writer.py`
- Create: `agent-host/tests/unit/infrastructure/vault/test_git_helper.py`

- [ ] **Step 1: Write failing tests for vault writer**

`tests/unit/infrastructure/vault/test_writer.py`:
```python
from __future__ import annotations
from datetime import date
from pathlib import Path
import pytest
from m4_agent_host.domain.models import Entity, Risk, Opportunity, Task
from m4_agent_host.infrastructure.vault.writer import VaultWriter, _slugify


@pytest.fixture()
def vault(tmp_path: Path) -> Path:
    for d in [
        "_system", "inbox/meetings", "journal/daily",
        "people", "projects", "resources",
    ]:
        (tmp_path / d).mkdir(parents=True)
    (tmp_path / "_system" / "log.md").write_text("")
    return tmp_path


def test_write_raw_transcript_creates_file(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    path = writer.write_raw_transcript("2024-01-15-standup.md", "# Standup\nContent here")
    assert path.exists()
    assert path.read_text() == "# Standup\nContent here"


def test_write_raw_transcript_is_idempotent(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    writer.write_raw_transcript("test.md", "original")
    writer.write_raw_transcript("test.md", "original")  # should not raise
    assert (vault / "inbox" / "meetings" / "test.md").read_text() == "original"


def test_upsert_person_creates_stub(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    entity = Entity(name="Jane Doe", title="VP Engineering", relationship="client")
    writer.upsert_person(entity)
    path = vault / "people" / "jane-doe.md"
    assert path.exists()
    content = path.read_text()
    assert "Jane Doe" in content
    assert "VP Engineering" in content


def test_upsert_person_appends_rapport_notes(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    entity = Entity(name="Bob Smith", rapport_notes=["Likes hiking", "Dog owner"])
    writer.upsert_person(entity)
    content = (vault / "people" / "bob-smith.md").read_text()
    assert "Likes hiking" in content
    assert "Dog owner" in content


def test_append_tasks_to_daily_creates_file(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    tasks = [Task(description="Send proposal", owner="Alice", eta="2024-01-16")]
    writer.append_tasks_to_daily(tasks, for_date=date(2024, 1, 15))
    path = vault / "journal" / "daily" / "2024-01-15.md"
    assert path.exists()
    content = path.read_text()
    assert "Send proposal" in content
    assert "@Alice" in content


def test_append_log_writes_structured_line(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    writer.append_log("entity_agent", "upsert_person", "Jane Doe")
    log = (vault / "_system" / "log.md").read_text()
    assert "entity_agent" in log
    assert "upsert_person" in log
    assert "Jane Doe" in log


def test_slugify_lowercases_and_replaces_spaces() -> None:
    assert _slugify("Jane Doe") == "jane-doe"
    assert _slugify("Acme Corp.") == "acme-corp-"
    assert _slugify("  Test  ") == "test"
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
uv run pytest tests/unit/infrastructure/vault/test_writer.py -v
```

Expected: `ERROR` — `ModuleNotFoundError`

- [ ] **Step 3: Write `infrastructure/vault/writer.py`**

```python
from __future__ import annotations
import re
from datetime import UTC, datetime, date
from pathlib import Path
import frontmatter
from m4_agent_host.config import settings
from m4_agent_host.domain.models import Entity, Risk, Opportunity, Task


class VaultWriter:
    """Append-only filesystem writer for the markdown vault.

    Implements the merge rules defined in _system/CLAUDE.md:
    all writes are additive; existing content is never overwritten.
    """

    def __init__(self, vault_path: str = settings.vault_path) -> None:
        self.root = Path(vault_path)

    def write_raw_transcript(self, filename: str, content: str) -> Path:
        """Write transcript to inbox/meetings/. No-op if file exists (immutable)."""
        dest = self.root / "inbox" / "meetings" / filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            dest.write_text(content, encoding="utf-8")
        return dest

    def upsert_person(self, entity: Entity) -> None:
        """Create or update a person note. Appends new data, never overwrites."""
        slug = _slugify(entity.name)
        path = self.root / "people" / f"{slug}.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        now = datetime.now(UTC).isoformat()

        if path.exists():
            post = frontmatter.load(str(path))
            post.metadata["updated"] = now
            if entity.title:
                post.metadata["title"] = entity.title
            if entity.rapport_notes:
                additions = "\n".join(f"- {n}" for n in entity.rapport_notes)
                post.content = post.content + f"\n\n### Rapport ({now[:10]})\n{additions}"
        else:
            rapport = "\n".join(f"- {n}" for n in entity.rapport_notes)
            post = frontmatter.Post(
                content=f"## Notes\n\n## Rapport\n{rapport}",
                type="person",
                created=now,
                updated=now,
                name=entity.name,
                title=entity.title,
                relationship=entity.relationship,
            )
        path.write_text(frontmatter.dumps(post), encoding="utf-8")

    def append_risks(self, risks: list[Risk], meeting_slug: str) -> None:
        """Append risks to relevant project files."""
        for risk in risks:
            if risk.project_slug:
                project_path = self.root / "projects" / f"{risk.project_slug}.md"
                if project_path.exists():
                    existing = project_path.read_text(encoding="utf-8")
                    project_path.write_text(
                        existing + f"\n### Risk — {meeting_slug}\n"
                        f"- **[{risk.severity}]** {risk.description}\n",
                        encoding="utf-8",
                    )

    def append_opportunities(self, opportunities: list[Opportunity]) -> None:
        """Append opportunities to resources/opportunities.md."""
        if not opportunities:
            return
        path = self.root / "resources" / "opportunities.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        header = "# Opportunities\n\n" if not path.exists() else ""
        existing = path.read_text(encoding="utf-8") if path.exists() else ""
        additions = "\n".join(
            f"- [{opp.type}] {opp.description}" for opp in opportunities
        )
        path.write_text(header + existing + additions + "\n", encoding="utf-8")

    def append_tasks_to_daily(
        self, tasks: list[Task], for_date: date | None = None
    ) -> None:
        """Append tasks to the daily journal note for for_date."""
        if not tasks:
            return
        target = for_date or datetime.now(UTC).date()
        path = self.root / "journal" / "daily" / f"{target.isoformat()}.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        header = f"# {target.isoformat()}\n\n" if not path.exists() else ""
        existing = path.read_text(encoding="utf-8") if path.exists() else ""
        lines = "\n".join(
            f"- [ ] {t.description}"
            + (f" (@{t.owner})" if t.owner else "")
            + (f" — {t.eta}" if t.eta else "")
            for t in tasks
        )
        path.write_text(
            header + existing + f"\n## Tasks\n{lines}\n", encoding="utf-8"
        )

    def append_log(self, agent: str, action: str, target: str) -> None:
        """Append one structured line to _system/log.md."""
        path = self.root / "_system" / "log.md"
        ts = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
        with path.open("a", encoding="utf-8") as f:
            f.write(f"{ts} | {agent} | {action} | {target}\n")


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
```

- [ ] **Step 4: Write `infrastructure/vault/git_helper.py`**

```python
from __future__ import annotations
import subprocess
from pathlib import Path
from m4_agent_host.config import settings


def commit_vault(message: str) -> None:
    """Stage all vault changes and create a git commit."""
    vault = Path(settings.vault_path)
    subprocess.run(["git", "add", "-A"], cwd=vault, check=True, capture_output=True)
    subprocess.run(
        ["git", "commit", "-m", message, "--allow-empty"],
        cwd=vault,
        check=True,
        capture_output=True,
    )
```

`tests/unit/infrastructure/vault/test_git_helper.py`:
```python
from __future__ import annotations
from pathlib import Path
from unittest.mock import patch, call
import pytest
from m4_agent_host.infrastructure.vault.git_helper import commit_vault


def test_commit_vault_runs_git_add_then_commit(tmp_path: Path) -> None:
    with patch("m4_agent_host.infrastructure.vault.git_helper.settings") as mock_settings, \
         patch("subprocess.run") as mock_run:
        mock_settings.vault_path = str(tmp_path)
        commit_vault("test: commit message")
        assert mock_run.call_count == 2
        first_call_args = mock_run.call_args_list[0][0][0]
        assert first_call_args == ["git", "add", "-A"]
        second_call_args = mock_run.call_args_list[1][0][0]
        assert "git" in second_call_args
        assert "commit" in second_call_args
        assert "test: commit message" in second_call_args
```

- [ ] **Step 5: Run all vault tests**

```bash
uv run pytest tests/unit/infrastructure/vault/ -v
```

Expected: `8 passed`

- [ ] **Step 6: Commit**

```bash
git add agent-host/src/m4_agent_host/infrastructure/vault/ \
        agent-host/tests/unit/infrastructure/vault/
git commit -m "feat(agent-host): add vault writer and git helper"
```

---

### Task 7: FastAPI skeleton + /health
`model: haiku` | `effort: S`

**Files:**
- Create: `agent-host/src/m4_agent_host/entrypoints/logging_setup.py`
- Create: `agent-host/src/m4_agent_host/entrypoints/api.py`

- [ ] **Step 1: Write `entrypoints/logging_setup.py`**

```python
from __future__ import annotations
import logging
import structlog
from m4_agent_host.config import settings


def configure_logging() -> None:
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelName(settings.log_level)
        ),
    )
```

- [ ] **Step 2: Write `entrypoints/api.py`**

```python
from __future__ import annotations
from fastapi import FastAPI
from m4_agent_host.entrypoints.logging_setup import configure_logging

configure_logging()
app = FastAPI(title="M4 Agent Host", version="0.1.0")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def main() -> None:
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

- [ ] **Step 3: Verify /health responds locally**

```bash
uv run uvicorn m4_agent_host.entrypoints.api:app --port 8000 &
sleep 2
curl http://localhost:8000/health
# Expected: {"status":"ok"}
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add agent-host/src/m4_agent_host/entrypoints/
git commit -m "feat(agent-host): add FastAPI skeleton with /health"
```

---

## Phase 2: Agent Pipeline

### Task 8: PydanticAI specialist agents
`model: opus` | `effort: M`

**Files:**
- Create: `agent-host/src/m4_agent_host/infrastructure/ai/agents.py`

Note: Agent prompt quality directly determines extraction quality. This task uses Opus.

- [ ] **Step 1: Write `infrastructure/ai/agents.py`**

```python
"""PydanticAI specialist agents for meeting signal extraction.

Four agents run in parallel on the same transcript, each enforcing a
typed schema. All use gemma3:9b (fast, parallel-safe on M4).
"""
from __future__ import annotations
from pydantic_ai import Agent
from pydantic_ai.models.ollama import OllamaModel
from m4_agent_host.config import settings
from m4_agent_host.domain.models import Entity, Risk, Opportunity, Task

_triage_model = OllamaModel(
    model_name=settings.ollama_triage_model,
    base_url=settings.ollama_base_url,
)

entity_agent: Agent[None, list[Entity]] = Agent(
    _triage_model,
    result_type=list[Entity],
    system_prompt=(
        "You are an entity extraction specialist. Extract every person explicitly named "
        "in the meeting transcript.\n\n"
        "For each person capture:\n"
        "- name: full name as spoken\n"
        "- title: job title or role if mentioned, otherwise omit\n"
        "- relationship: one of client|colleague|stakeholder|vendor|unknown\n"
        "- rapport_notes: personal details, communication style, shared context "
        "(empty list if none)\n\n"
        "Rules: only include people explicitly named. Return an empty list if none. "
        "Never invent or infer names not stated in the text."
    ),
)

risk_agent: Agent[None, list[Risk]] = Agent(
    _triage_model,
    result_type=list[Risk],
    system_prompt=(
        "You are a risk detection specialist. Identify signals of churn risk, timeline "
        "slippage, blockers, or stakeholder dissatisfaction in the transcript.\n\n"
        "Detection signals:\n"
        "- Hedging language: 'we'll try', 'hopefully', 'might', 'if possible'\n"
        "- Timeline slippage: missed deadlines, pushed dates, vague timelines\n"
        "- Unresolved blockers: dependencies waiting on third parties\n"
        "- Budget or scope concerns raised\n"
        "- Disengagement signals: short answers, topic avoidance\n\n"
        "Severity: high=immediate threat, medium=needs monitoring, low=noted.\n"
        "project_slug: hyphen-lowercase slug of the affected project if identifiable.\n"
        "Return an empty list if no risks are detected."
    ),
)

opportunity_agent: Agent[None, list[Opportunity]] = Agent(
    _triage_model,
    result_type=list[Opportunity],
    system_prompt=(
        "You are an opportunity detection specialist. Identify expansion opportunities, "
        "unmet workflow needs, or lateral problems mentioned in the transcript.\n\n"
        "Detection signals:\n"
        "- Pain points mentioned casually ('we still do this manually')\n"
        "- Requests adjacent to current work ('it would be great if...')\n"
        "- References to other teams or systems that face similar problems\n"
        "- Capability gaps the speaker doesn't know you can fill\n\n"
        "type: expansion=grow current engagement, workflow=process improvement, "
        "lateral=different team or product.\n"
        "Return an empty list if none found."
    ),
)

task_agent: Agent[None, list[Task]] = Agent(
    _triage_model,
    result_type=list[Task],
    system_prompt=(
        "You are a task extraction specialist. Extract all action items, commitments, "
        "and next steps from the transcript.\n\n"
        "Include:\n"
        "- Explicit commitments: 'I'll send that by Friday', 'we'll schedule a follow-up'\n"
        "- Implicit commitments: 'let me know what you think', 'can you look into X'\n"
        "- Decisions that require follow-up action\n\n"
        "owner: first name or full name of who is responsible (omit if unclear).\n"
        "eta: ISO date string if a deadline is mentioned, otherwise omit.\n"
        "Return an empty list if no tasks found."
    ),
)
```

- [ ] **Step 2: Verify agents import without error**

```bash
uv run python -c "from m4_agent_host.infrastructure.ai.agents import entity_agent, risk_agent, opportunity_agent, task_agent; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add agent-host/src/m4_agent_host/infrastructure/ai/agents.py
git commit -m "feat(agent-host): add four parallel PydanticAI specialist agents"
```

---

### Task 9: Ingest service
`model: sonnet` | `effort: M`

**Files:**
- Create: `agent-host/src/m4_agent_host/application/ingest_service.py`
- Create: `agent-host/tests/unit/application/test_ingest_service.py`

- [ ] **Step 1: Write failing tests**

`tests/unit/application/test_ingest_service.py`:
```python
from __future__ import annotations
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from m4_agent_host.application.ingest_service import IngestService, _make_slug, _parse_date
from m4_agent_host.domain.models import (
    Entity, MeetingIngestRequest, MeetingSignals, Task
)
from m4_agent_host.infrastructure.vault.writer import VaultWriter


@pytest.fixture()
def vault(tmp_path: Path) -> Path:
    for d in ["_system", "inbox/meetings", "journal/daily", "people", "resources"]:
        (tmp_path / d).mkdir(parents=True)
    (tmp_path / "_system" / "log.md").write_text("")
    return tmp_path


@pytest.fixture()
def service(vault: Path) -> IngestService:
    return IngestService(vault_writer=VaultWriter(vault_path=str(vault)))


def test_make_slug_strips_extension_and_slugifies() -> None:
    assert _make_slug("2024-01-15 Acme Standup.md") == "2024-01-15-acme-standup"


def test_parse_date_returns_none_for_invalid() -> None:
    assert _parse_date("not-a-date") is None
    assert _parse_date(None) is None


def test_parse_date_parses_iso() -> None:
    from datetime import date
    result = _parse_date("2024-01-15")
    assert result == date(2024, 1, 15)


@pytest.mark.asyncio()
async def test_ingest_meeting_writes_raw_transcript(service: IngestService, vault: Path) -> None:
    mock_result = MagicMock()
    mock_result.data = []

    with patch("m4_agent_host.application.ingest_service.entity_agent") as ea, \
         patch("m4_agent_host.application.ingest_service.risk_agent") as ra, \
         patch("m4_agent_host.application.ingest_service.opportunity_agent") as oa, \
         patch("m4_agent_host.application.ingest_service.task_agent") as ta, \
         patch("m4_agent_host.application.ingest_service.commit_vault"):
        for agent in [ea, ra, oa, ta]:
            agent.run = AsyncMock(return_value=mock_result)

        req = MeetingIngestRequest(transcript="Test meeting", filename="2024-01-15-test.md")
        signals = await service.ingest_meeting(req)

    assert (vault / "inbox" / "meetings" / "2024-01-15-test.md").exists()
    assert isinstance(signals, MeetingSignals)


@pytest.mark.asyncio()
async def test_ingest_meeting_handles_agent_exception_gracefully(
    service: IngestService, vault: Path
) -> None:
    mock_result = MagicMock()
    mock_result.data = []

    with patch("m4_agent_host.application.ingest_service.entity_agent") as ea, \
         patch("m4_agent_host.application.ingest_service.risk_agent") as ra, \
         patch("m4_agent_host.application.ingest_service.opportunity_agent") as oa, \
         patch("m4_agent_host.application.ingest_service.task_agent") as ta, \
         patch("m4_agent_host.application.ingest_service.commit_vault"):
        ea.run = AsyncMock(side_effect=RuntimeError("Ollama down"))
        for agent in [ra, oa, ta]:
            agent.run = AsyncMock(return_value=mock_result)

        req = MeetingIngestRequest(transcript="Test", filename="test.md")
        signals = await service.ingest_meeting(req)

    assert signals.entities == []  # degraded gracefully
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
uv run pytest tests/unit/application/test_ingest_service.py -v
```

Expected: `ERROR` — `ModuleNotFoundError`

- [ ] **Step 3: Write `application/ingest_service.py`**

```python
"""Meeting ingest service.

Orchestrates parallel agent execution then sequentially writes results
to the vault to avoid race conditions on shared files.
"""
from __future__ import annotations
import asyncio
import re
from datetime import UTC, datetime, date
from pathlib import Path
import structlog
from m4_agent_host.domain.models import MeetingIngestRequest, MeetingSignals
from m4_agent_host.infrastructure.ai.agents import (
    entity_agent, risk_agent, opportunity_agent, task_agent,
)
from m4_agent_host.infrastructure.vault.writer import VaultWriter
from m4_agent_host.infrastructure.vault.git_helper import commit_vault

log = structlog.get_logger(__name__)


class IngestService:
    def __init__(self, vault_writer: VaultWriter | None = None) -> None:
        self.writer = vault_writer or VaultWriter()

    async def ingest_meeting(self, req: MeetingIngestRequest) -> MeetingSignals:
        slug = _make_slug(req.filename)
        meeting_date = _parse_date(req.meeting_date)

        # 1. Write raw transcript — immutable record
        self.writer.write_raw_transcript(req.filename, req.transcript)
        log.info("transcript_written", filename=req.filename)

        # 2. Fan out — all four agents run simultaneously
        results = await asyncio.gather(
            entity_agent.run(req.transcript),
            risk_agent.run(req.transcript),
            opportunity_agent.run(req.transcript),
            task_agent.run(req.transcript),
            return_exceptions=True,
        )

        entities = results[0].data if not isinstance(results[0], Exception) else []
        risks = results[1].data if not isinstance(results[1], Exception) else []
        opps = results[2].data if not isinstance(results[2], Exception) else []
        tasks = results[3].data if not isinstance(results[3], Exception) else []

        for i, exc in enumerate(results):
            if isinstance(exc, Exception):
                log.warning("agent_failed", agent_index=i, error=str(exc))

        signals = MeetingSignals(entities=entities, risks=risks, opportunities=opps, tasks=tasks)

        # 3. Write sequentially — avoid race conditions on shared files
        for entity in signals.entities:
            self.writer.upsert_person(entity)
            self.writer.append_log("entity_agent", "upsert_person", entity.name)

        self.writer.append_risks(signals.risks, slug)
        for risk in signals.risks:
            self.writer.append_log("risk_agent", "append_risk", risk.description[:60])

        self.writer.append_opportunities(signals.opportunities)
        for opp in signals.opportunities:
            self.writer.append_log("opportunity_agent", "append_opportunity", opp.description[:60])

        self.writer.append_tasks_to_daily(signals.tasks, for_date=meeting_date)
        for task in signals.tasks:
            self.writer.append_log("task_agent", "append_task", task.description[:60])

        # 4. Single atomic vault commit
        commit_vault(f"agent(meeting): ingest {slug}")
        log.info(
            "meeting_ingested",
            slug=slug,
            entities=len(entities),
            risks=len(risks),
            opportunities=len(opps),
            tasks=len(tasks),
        )
        return signals


def _make_slug(filename: str) -> str:
    stem = Path(filename).stem
    return re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")[:60]


def _parse_date(date_str: str | None) -> date | None:
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str).date()
    except ValueError:
        return None
```

- [ ] **Step 4: Run tests**

```bash
uv run pytest tests/unit/application/test_ingest_service.py -v
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add agent-host/src/m4_agent_host/application/ingest_service.py \
        agent-host/tests/unit/application/test_ingest_service.py
git commit -m "feat(agent-host): add meeting ingest service with parallel agents"
```

---

### Task 10: Wire /ingest/meeting endpoint + build image
`model: sonnet` | `effort: S`

**Files:**
- Modify: `agent-host/src/m4_agent_host/entrypoints/api.py`

- [ ] **Step 1: Add /ingest/meeting to api.py**

```python
from __future__ import annotations
from fastapi import FastAPI, HTTPException
from m4_agent_host.application.ingest_service import IngestService
from m4_agent_host.domain.models import MeetingIngestRequest, MeetingSignals
from m4_agent_host.entrypoints.logging_setup import configure_logging

configure_logging()
app = FastAPI(title="M4 Agent Host", version="0.1.0")
_ingest_service = IngestService()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest/meeting", response_model=MeetingSignals)
async def ingest_meeting(req: MeetingIngestRequest) -> MeetingSignals:
    try:
        return await _ingest_service.ingest_meeting(req)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def main() -> None:
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

- [ ] **Step 2: Run full test suite**

```bash
uv run pytest tests/unit/ -v --cov=m4_agent_host --cov-report=term-missing
```

Expected: all unit tests pass, coverage ≥ 80%

- [ ] **Step 3: Build Docker image**

```bash
cd projects/m4-agentic-workspace
docker compose build agent-host
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Restart stack and verify endpoint**

```bash
docker compose up -d agent-host
sleep 5
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Commit**

```bash
git add agent-host/src/m4_agent_host/entrypoints/api.py
git commit -m "feat(agent-host): wire /ingest/meeting endpoint"
```

---

## Phase 3: Pipeline Integration

### Task 11: n8n Granola workflow
`model: haiku` | `effort: M`

**Files:**
- Create: `n8n-workflows/granola-meeting-ingest.json`

- [ ] **Step 1: Write the n8n workflow JSON**

`n8n-workflows/granola-meeting-ingest.json`:
```json
{
  "name": "Granola Meeting Ingest",
  "nodes": [
    {
      "parameters": {
        "path": "/granola-sync",
        "events": ["create"],
        "options": {}
      },
      "id": "trigger",
      "name": "Watch Granola Folder",
      "type": "n8n-nodes-base.localFileTrigger",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "filePath": "={{ $json.path }}",
        "options": {}
      },
      "id": "read-file",
      "name": "Read Transcript",
      "type": "n8n-nodes-base.readBinaryFiles",
      "typeVersion": 1,
      "position": [460, 300]
    },
    {
      "parameters": {
        "url": "http://agent-host:8000/ingest/meeting",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "transcript",
              "value": "={{ Buffer.from($binary.data.data, 'base64').toString('utf-8') }}"
            },
            {
              "name": "filename",
              "value": "={{ $('Watch Granola Folder').item.json.name }}"
            }
          ]
        },
        "options": {
          "timeout": 120000
        }
      },
      "id": "call-agent",
      "name": "Send to Agent Host",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [680, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.statusCode }}",
              "operation": "isNot",
              "value2": "200"
            }
          ]
        }
      },
      "id": "error-check",
      "name": "Check Response",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [900, 300]
    }
  ],
  "connections": {
    "Watch Granola Folder": {
      "main": [[ { "node": "Read Transcript", "type": "main", "index": 0 } ]]
    },
    "Read Transcript": {
      "main": [[ { "node": "Send to Agent Host", "type": "main", "index": 0 } ]]
    },
    "Send to Agent Host": {
      "main": [[ { "node": "Check Response", "type": "main", "index": 0 } ]]
    }
  }
}
```

- [ ] **Step 2: Import workflow into n8n**

1. Open `http://localhost:5678` and log in
2. Click **+** → **Import from file**
3. Select `n8n-workflows/granola-meeting-ingest.json`
4. Click **Activate** toggle to enable the workflow

- [ ] **Step 3: End-to-end smoke test**

```bash
# Drop a sample transcript into the Granola sync folder
echo "# Standup 2024-01-15

Attendees: Jane Doe (VP Engineering, Acme Corp), Bob Smith (PM)

Jane mentioned the dashboard migration might slip by a week — they're blocked on the API team.
Bob will send the revised timeline by Friday.
There's an opportunity to extend our work to their mobile team.
" > $(grep GRANOLA_SYNC_PATH .env | cut -d= -f2)/2024-01-15-standup.md

# Wait ~30s for n8n to detect and process
sleep 30

# Verify vault was updated
ls vault/inbox/meetings/          # should contain the file
ls vault/people/                  # should contain jane-doe.md or bob-smith.md
cat vault/_system/log.md          # should show agent actions
git -C vault log --oneline        # should show an agent(meeting) commit
```

Expected: vault has new people files, log.md has entries, git log shows commit.

- [ ] **Step 4: Commit**

```bash
git add n8n-workflows/granola-meeting-ingest.json
git commit -m "feat(m4-agentic-workspace): add n8n Granola ingest workflow"
```

---

## Phase 4: Skills

### Task 12: Onboarding skill
`model: sonnet` | `effort: M`

**Files:**
- Create: `skills/onboarding.md`

- [ ] **Step 1: Write `skills/onboarding.md`**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add skills/onboarding.md
git commit -m "feat(m4-agentic-workspace): add non-technical onboarding skill"
```

---

### Task 13: Operational skill library
`model: haiku` | `effort: M`

**Files:**
- Create: `skills/vault-capture.md`
- Create: `skills/vault-search.md`
- Create: `skills/project-status.md`
- Create: `skills/weekly-review.md`
- Create: `skills/add-person.md`
- Create: `skills/vault-health.md`

- [ ] **Step 1: Write `skills/vault-capture.md`**

```markdown
---
name: vault-capture
description: Quick-capture a freeform note to vault inbox. Use when the user says "capture this", "note that", or "remember".
type: operation
---

# Vault Capture

Write the user's note to `projects/m4-agentic-workspace/vault/inbox/` with today's date prefix.

1. Ask: "What would you like to capture?" (if not already in the message)
2. Determine the best subfolder: `meetings/`, `voice/`, or generic `inbox/`
3. Write the file: `vault/inbox/YYYY-MM-DD-<slug>.md` with frontmatter:
   ```yaml
   ---
   type: note
   created: <ISO datetime>
   ---
   ```
4. Append a log entry to `vault/_system/log.md`:
   `<timestamp> | vault-capture | capture | <filename>`
5. Run: `git -C projects/m4-agentic-workspace/vault add -A && git -C projects/m4-agentic-workspace/vault commit -m "capture: <slug>"`
6. Confirm: "Captured to `inbox/<filename>`."
```

- [ ] **Step 2: Write `skills/vault-search.md`**

```markdown
---
name: vault-search
description: Semantic search across the vault. Use when user says "find", "search", or "what do I have on X".
type: operation
---

# Vault Search

Search vault markdown files for the user's query using ripgrep, then synthesize results.

1. Run: `rg -r -l --type md "<query>" projects/m4-agentic-workspace/vault/ --glob '!private/'`
   (exclude private/ from cross-session searches unless user explicitly asks)
2. For each matching file, read the relevant section
3. Synthesize a brief answer citing the source files as markdown links
4. If no results: suggest broadening the query or checking `vault/inbox/` for unprocessed items
```

- [ ] **Step 3: Write `skills/project-status.md`**

```markdown
---
name: project-status
description: Generate a status summary for a named project. Use when user asks "status of X" or "how is X going".
type: operation
---

# Project Status

1. Ask for the project name if not given
2. Find the project file: `vault/projects/<slug>.md`
   - If not found, list `vault/projects/` and ask which is closest
3. Read the project file
4. Search `vault/_system/log.md` for the project slug (last 20 entries)
5. Search `vault/journal/daily/` for the last 5 daily notes that mention the project
6. Synthesize a status summary:
   - Current state (from project file)
   - Recent risks (from log + project file)
   - Open tasks (from daily notes)
   - Last activity date (from log)
7. Ask: "Would you like me to update the project file with today's status?"
```

- [ ] **Step 4: Write `skills/weekly-review.md`**

```markdown
---
name: weekly-review
description: Synthesize the week's activity into a weekly journal note. Use on Fridays or when user says "weekly review".
type: operation
---

# Weekly Review

1. Determine the ISO week: `date +"%Y-W%V"`
2. Read all daily notes from this week: `vault/journal/daily/YYYY-MM-DD.md` for Mon–today
3. Read `vault/_system/log.md` — filter to this week's entries
4. Synthesize a weekly note covering:
   - Meetings held (from inbox/meetings/ filenames this week)
   - Tasks completed vs. open
   - Risks that emerged
   - Opportunities identified
   - People engaged
5. Write to `vault/journal/weekly/<YYYY-Www>.md` with frontmatter `type: weekly`
6. Commit: `git -C vault commit -m "journal(weekly): <YYYY-Www>"`
7. Ask: "Want me to highlight anything for the monthly review?"
```

- [ ] **Step 5: Write `skills/add-person.md`**

```markdown
---
name: add-person
description: Create or update a person note in the vault. Use when user says "add [name]" or "I met [name] today".
type: operation
---

# Add Person

1. Ask for the person's name if not given
2. Check if `vault/people/<slug>.md` already exists
   - If exists: show current content, ask what to update
3. Prompt for (one question at a time, all optional):
   - Job title / role
   - Company or organization
   - Relationship: client | colleague | stakeholder | vendor
   - How they met / context
   - Any rapport notes (interests, communication style, shared history)
4. Write or update `vault/people/<slug>.md` with frontmatter:
   ```yaml
   ---
   type: person
   created: <ISO datetime>
   updated: <ISO datetime>
   name: Full Name
   title: Job Title
   relationship: client
   ---
   ```
5. Append log entry and commit
6. Confirm: "[[<slug>]] saved to vault."
```

- [ ] **Step 6: Write `skills/vault-health.md`**

```markdown
---
name: vault-health
description: Audit the vault for structural issues. Use when user asks "check vault" or before a weekly review.
type: operation
---

# Vault Health Check

Run each check and report findings. Offer to fix issues where possible.

1. **Broken wikilinks**
   - `rg -r "\[\[([^\]]+)\]\]" vault/ --only-matching -h | sort -u` → collect all link targets
   - For each target, check if `vault/**/<target>.md` exists
   - Report broken links with the file they appear in

2. **Missing frontmatter**
   - `rg -rL "^---" vault/projects/ vault/people/ vault/resources/` → files without frontmatter
   - Report each file

3. **Unprocessed inbox**
   - List files in `vault/inbox/meetings/` older than 24 hours
   - Report count and filenames

4. **Empty stubs**
   - Find files < 100 bytes in `vault/projects/` and `vault/people/`
   - Report as candidates to fill out

5. **Summary**: "Vault health: X broken links, Y missing frontmatter, Z unprocessed inbox items, W empty stubs."
   - Offer to fix broken links or missing frontmatter inline
```

- [ ] **Step 7: Commit all skills**

```bash
git add skills/
git commit -m "feat(m4-agentic-workspace): add operational skill library (6 skills)"
```

---

### Task 14: CLAUDE.md + README
`model: haiku` | `effort: S`

**Files:**
- Create: `projects/m4-agentic-workspace/CLAUDE.md`
- Create: `projects/m4-agentic-workspace/README.md`

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
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
```

- [ ] **Step 2: Write `README.md`**

```markdown
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
```

- [ ] **Step 3: Final commit**

```bash
git add projects/m4-agentic-workspace/CLAUDE.md \
        projects/m4-agentic-workspace/README.md
git commit -m "docs(m4-agentic-workspace): add CLAUDE.md and README"
```

---

## Self-Review

### Spec Coverage Check

| Spec section | Covered by task |
|---|---|
| Hybrid inference (Ollama native + Docker) | Task 1 (docker-compose.yml with host.docker.internal) |
| Docker Compose: n8n, Qdrant, Open WebUI, obsidian-mcp, agent-host | Task 1 |
| Vault structure + privacy tiers | Task 2 (init-vault.sh + constitution) |
| git-crypt encryption for private/ | Task 2 (init-vault.sh) |
| Audit trail (git + log.md) | Task 6 (writer.py append_log + git_helper) |
| Four parallel PydanticAI agents | Task 8 (agents.py) |
| Ingest service coordinator | Task 9 (ingest_service.py) |
| FastAPI /health + /ingest/meeting | Tasks 7 + 10 |
| n8n Granola file watcher workflow | Task 11 |
| Onboarding skill | Task 12 |
| Operational skill library (6 skills) | Task 13 |
| Model pull script | Task 3 |
| VPS opt-in via OBSIDIAN_MCP_URL | Not implemented — out of scope for MVP, add as .env.example comment |

**Gap found:** `.env.example` should document the VPS opt-in override. Add a comment to Task 1's `.env.example`: `# OBSIDIAN_MCP_URL=https://mcp.yourserver.com  # override to use remote VPS vault instead of local`.

### Type Consistency

- `_slugify` defined in `writer.py`, `_make_slug` in `ingest_service.py` — both used correctly within their own modules only. No cross-module confusion.
- `MeetingSignals` used as response model in `api.py` and return type in `ingest_service.py` — consistent.
- `Entity`, `Risk`, `Opportunity`, `Task` defined once in `domain/models.py`, imported everywhere else.

### Placeholder Scan

No TBD, TODO, or incomplete steps found.
