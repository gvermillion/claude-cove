# Claude Cove

Principal AI Solutions Architecture workspace for prototyping frontier AI projects.

---

## Repository Purpose

This is a mono-repo workspace for exploring, prototyping, and delivering AI solutions across
the full stack — agents, multimodal applications, RAG pipelines, API integrations, tooling,
and beyond. Each top-level directory is a self-contained project.

---

## Repository Structure

```
claude-cove/
├── CLAUDE.md              # This file — workspace-wide standards
├── projects/              # All projects live here
│   └── <project-name>/    # Self-contained project directory
│       ├── CLAUDE.md      # Project-specific overrides (optional)
│       ├── README.md
│       └── ...
└── shared/                # Shared utilities, types, or prompts (optional)
```

Each project is independently runnable. Avoid cross-project imports unless explicitly
moved to `shared/`.

---

## GitOps Strategy (Git Flow)

### Branch Hierarchy

| Branch | Purpose |
|--------|---------|
| `main` | Stable, releasable code. Protected. |
| `develop` | Integration branch. All features merge here first. |
| `feature/<name>` | New work. Branched from `develop`. |
| `fix/<name>` | Bug fixes. Branched from `develop`. |
| `hotfix/<name>` | Critical fixes. Branched from `main`, merged to both `main` and `develop`. |
| `release/<version>` | Pre-release stabilization. Branched from `develop`. |
| `claude/<task-id>` | Claude-generated branches. Follow the same rules as `feature/`. |

### Branch Rules

- **Never commit directly to `main` or `develop`.**
- All work happens on short-lived branches. Merge via PR.
- PRs into `develop` require at least a self-review pass before merging.
- PRs into `main` require a passing CI check and explicit approval.
- Delete branches after merge.

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`
**Scope:** project or component name (e.g., `feat(rag-pipeline): add hybrid retrieval`)

### Tagging & Releases

- Tag releases on `main` using semantic versioning: `v<major>.<minor>.<patch>`
- Each project can maintain its own version independently.
- Use annotated tags: `git tag -a v1.0.0 -m "Release notes here"`

### Project Lifecycle

```
1. Create project folder under projects/
2. git checkout develop && git pull origin develop
3. git checkout -b feature/<project-name>-init
4. Build, commit with conventional commits
5. PR → develop for review
6. When stable: PR develop → main with release tag
```

---

## Project Standards

### Starting a New Project

Every new project directory should include:

- `README.md` — what it does, how to run it, environment variables required
- `.env.example` — all required env vars listed with placeholder values (never commit `.env`)
- A top-level entrypoint (e.g., `main.py`, `index.ts`, `app.py`)
- Dependency manifest (`requirements.txt` / `pyproject.toml` / `package.json`)

### Environment Variables

- Store secrets in `.env` files (gitignored).
- Document every variable in `.env.example`.
- Never hardcode API keys, tokens, or credentials.
- For Claude/Anthropic: always use `ANTHROPIC_API_KEY` as the variable name.

### Code Quality

- Prefer clarity over cleverness. Code is read more than it is written.
- Keep functions small and single-purpose.
- No dead code, commented-out blocks, or `TODO` comments in `main`/`develop`.
- Validate at system boundaries (user input, API responses). Trust internal code.
- Add error handling only where failures are realistic and recoverable.

---

## AI / Claude Development Standards

### Model Selection

Use the latest available Claude models unless there is a specific reason not to:

| Use Case | Recommended Model |
|----------|------------------|
| Complex reasoning, architecture, agents | `claude-opus-4-6` |
| General tasks, coding, fast iteration | `claude-sonnet-4-6` |
| High-throughput, cost-sensitive tasks | `claude-haiku-4-5-20251001` |

Always parameterize the model ID — do not hardcode it deep in logic.

### Prompt Engineering Standards

- System prompts live in dedicated files or constants, never inline strings buried in code.
- Use structured output (JSON mode / tool use) over parsing free-form text.
- Document expected input/output contract for every prompt.
- Version prompts explicitly when they affect production behavior.

### Agent & Tool Use Patterns

- Define tools with precise, unambiguous descriptions — the model relies on them.
- Prefer narrow, composable tools over broad, multi-purpose ones.
- Implement input validation before executing any tool with side effects.
- Log all tool calls and results for observability.
- Design for graceful degradation when tool calls fail.

### Context & Memory

- Be explicit about what context is being passed — no implicit state.
- For long-running agents: summarize/compress context before hitting limits.
- RAG retrieval: always cite sources; include relevance score thresholds.

### Safety & Responsible AI

- Apply the principle of least privilege for agent capabilities.
- Never give agents unreviewed access to destructive operations (file deletion, DB writes, network calls to external services) without human-in-the-loop confirmation.
- Log all agentic actions for auditability.
- Include a kill switch / abort mechanism in any long-running agent loop.

---

## Language-Specific Guidelines

### Python

- Python 3.11+ preferred.
- Use `uv` for dependency management where possible; otherwise `pip` with `requirements.txt`.
- Formatting: `ruff` (replaces black + isort + flake8).
- Type hints on all public functions.
- Use `python-dotenv` for env var loading.

### TypeScript / JavaScript

- TypeScript preferred over JavaScript for any non-trivial project.
- Use `pnpm` as the package manager.
- Formatting: `prettier` + `eslint`.
- Strict mode enabled in `tsconfig.json`.
- Prefer `zod` for runtime validation of external data.

### General

- All projects should be runnable with a single command documented in the README.
- Docker / `docker-compose` encouraged for projects with infrastructure dependencies.

---

## Security

- Never commit secrets, credentials, or PII. Use `.gitignore` aggressively.
- Run `git diff --staged` before every commit to verify nothing sensitive is included.
- Sanitize all user input before passing to LLMs (prompt injection is a real threat).
- For web-facing projects: OWASP Top 10 is the baseline security checklist.
- Rotate any accidentally committed credentials immediately.

---

## Working with Claude (Claude Code)

- Claude should read existing code before modifying it.
- Prefer editing existing files over creating new ones.
- Keep changes minimal and scoped to what was requested.
- All Claude-generated branches follow the `claude/<task-id>` naming convention.
- Claude should not push to `main` or `develop` directly.
- Use `CLAUDE.md` files inside project subdirectories to override workspace defaults.

---

## Quick Reference

```bash
# Start new project work
git checkout develop && git pull origin develop
git checkout -b feature/<project-name>

# Commit
git add <specific files>
git commit -m "feat(<scope>): <summary>"

# Merge to develop (via PR) then release
git checkout develop && git merge --no-ff feature/<project-name>
git push origin develop

# Hotfix
git checkout main
git checkout -b hotfix/<description>
# fix, commit, then merge to both main and develop
```
