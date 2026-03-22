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

Every new project directory must include:

- `CLAUDE.md` — project-specific context, architecture decisions, run commands, and
  any overrides to workspace-wide standards. **Required. Not optional.** See the
  [Project CLAUDE.md](#project-claudemd) section for the template.
- `README.md` — what it does, how to run it, environment variables required
- `.env.example` — all required env vars listed with placeholder values (never commit `.env`)
- `.pre-commit-config.yaml` — project-level pre-commit hooks
- A top-level entrypoint (e.g., `main.py`, `index.ts`, `app.py`)
- Dependency manifest (`pyproject.toml` / `package.json`)

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

## Engineering Excellence

### SOLID Principles

Apply SOLID to all OOP and module design. These are non-negotiable baselines, not aspirational.

**Single Responsibility Principle (SRP)**
Every class and function has exactly one reason to change. If you find yourself writing
"and" in a docstring summary, the unit is doing too much.

```python
# Bad: one class doing two jobs
class UserManager:
    def create_user(self, data): ...
    def send_welcome_email(self, user): ...  # email delivery is a separate concern

# Good: separated responsibilities
class UserRepository:
    def create(self, data: UserCreateDTO) -> User: ...

class UserNotificationService:
    def send_welcome(self, user: User) -> None: ...
```

**Open/Closed Principle (OCP)**
Classes are open for extension, closed for modification. Extend via inheritance,
composition, or strategy injection — not by editing stable code.

```python
# Good: new retrieval strategies extend the base without touching existing code
class BaseRetriever(ABC):
    @abstractmethod
    def retrieve(self, query: str) -> list[Document]: ...

class DenseRetriever(BaseRetriever): ...
class HybridRetriever(BaseRetriever): ...
```

**Liskov Substitution Principle (LSP)**
Subtypes must be substitutable for their base type without altering correctness.
A subclass that throws `NotImplementedError` on a method it inherited is an LSP violation.

**Interface Segregation Principle (ISP)**
Prefer many small, focused interfaces over one broad one. Clients should not depend
on methods they do not use.

```python
# Bad: one fat protocol
class Storage(Protocol):
    def read(self): ...
    def write(self): ...
    def delete(self): ...
    def list(self): ...

# Good: composable protocols
class Readable(Protocol):
    def read(self, key: str) -> bytes: ...

class Writable(Protocol):
    def write(self, key: str, value: bytes) -> None: ...
```

**Dependency Inversion Principle (DIP)**
High-level modules must not depend on low-level modules. Both depend on abstractions.
Inject dependencies — never instantiate concrete dependencies inside business logic.

```python
# Bad: hard dependency on a concrete class
class AgentRunner:
    def __init__(self):
        self.llm = AnthropicClient()  # tightly coupled

# Good: injected abstraction
class AgentRunner:
    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm
```

---

### Design Patterns

Use established patterns by name. Prefer composition over inheritance.

| Pattern | When to use |
|---------|-------------|
| **Strategy** | Swappable algorithms (retrieval methods, chunking strategies, model providers) |
| **Factory / Factory Method** | Object creation with varying concrete types |
| **Builder** | Constructing complex objects step-by-step (prompt builders, pipeline configs) |
| **Observer / Event Bus** | Decoupled event-driven pipelines, agent callbacks |
| **Repository** | Abstract data access from business logic |
| **Adapter** | Wrap third-party SDKs to shield the rest of the codebase from external API churn |
| **Decorator** | Add cross-cutting concerns (logging, caching, retries) without modifying core logic |
| **Chain of Responsibility** | Sequential processing stages (middleware, agent tool chains) |

Document which pattern a class implements in its docstring.

---

### Documentation Standards

Code must be self-documenting at the naming level and formally documented at the API level.

**Naming**
- Names are prose. Read them aloud — they should form a sentence.
- Variables: noun phrases (`retrieved_documents`, `embedding_batch`)
- Functions: verb phrases (`retrieve_relevant_chunks`, `build_system_prompt`)
- Booleans: `is_`, `has_`, `can_`, `should_` prefixes (`is_authenticated`, `has_context`)
- Avoid abbreviations unless they are universally understood in the domain (`llm`, `rag`, `url`)

**Docstrings (Python — Google style)**

Every public module, class, and function has a docstring. No exceptions.

```python
def retrieve_documents(
    query: str,
    top_k: int = 5,
    score_threshold: float = 0.75,
) -> list[Document]:
    """Retrieve the most semantically relevant documents for a query.

    Performs dense vector search against the configured embedding index and
    filters results below the score threshold before returning.

    Args:
        query: Natural language query string to embed and search with.
        top_k: Maximum number of documents to return.
        score_threshold: Minimum cosine similarity score (0.0–1.0) a document
            must achieve to be included in results.

    Returns:
        A list of Document objects ordered by descending relevance score.
        Returns an empty list if no documents meet the threshold.

    Raises:
        EmbeddingError: If the embedding model fails to encode the query.
        IndexConnectionError: If the vector store is unreachable.

    Example:
        >>> docs = retrieve_documents("What is RAG?", top_k=3)
        >>> [d.title for d in docs]
        ['Retrieval-Augmented Generation Survey', ...]
    """
```

**Docstrings (TypeScript — TSDoc)**

```typescript
/**
 * Retrieve the most semantically relevant documents for a query.
 *
 * Performs dense vector search and filters results below the score threshold.
 *
 * @param query - Natural language query string to embed and search with.
 * @param topK - Maximum number of documents to return. Defaults to 5.
 * @param scoreThreshold - Minimum cosine similarity score (0.0–1.0). Defaults to 0.75.
 * @returns Array of Document objects ordered by descending relevance score.
 * @throws {EmbeddingError} If the embedding model fails to encode the query.
 *
 * @example
 * ```ts
 * const docs = await retrieveDocuments("What is RAG?", { topK: 3 });
 * ```
 */
```

**Inline Comments**

Use inline comments to explain *why*, never *what*. The code already shows what.

```python
# Good: explains a non-obvious decision
# Truncate to 8192 tokens rather than the model max to leave headroom for the
# system prompt and tool definitions which are prepended at inference time.
truncated_context = context[:8192]

# Bad: restates the code
context = context[:8192]  # truncate to 8192 tokens
```

**Module-level docstrings**

Every file begins with a module docstring describing its purpose, its main exports,
and any important architectural notes.

---

### Type Hints

Full, precise typing is required everywhere. Typing is documentation that the runtime
can verify.

**Python**
- All function signatures: parameters and return types.
- All class attributes annotated in `__init__` or via `dataclass`/`pydantic`.
- Use `from __future__ import annotations` for forward references.
- Prefer specific types over `Any`. Use `Any` only as a last resort with a comment explaining why.
- Use `TypeAlias` for complex repeated types.
- Use `typing.Protocol` for structural typing of dependency boundaries.
- Run `mypy` or `pyright` in strict mode. Zero type errors in `main`/`develop`.

```python
from __future__ import annotations
from typing import TypeAlias
from collections.abc import Sequence

EmbeddingVector: TypeAlias = list[float]

def embed_texts(texts: Sequence[str]) -> list[EmbeddingVector]:
    ...
```

**TypeScript**
- `strict: true` in `tsconfig.json` — always.
- No `any`. Use `unknown` when the type is genuinely unknown, then narrow it.
- Define `interface` or `type` for all data shapes. No anonymous object types in signatures.
- Use `Readonly<T>` for data that should not be mutated after construction.
- Prefer `type` for unions/intersections, `interface` for object shapes that may be extended.

---

### Testing Standards

Tests are first-class code. They live alongside implementation, follow the same quality
standards, and are written before or alongside features (TDD is encouraged).

**Test Structure — Arrange / Act / Assert (AAA)**

Every test follows three clearly separated phases:

```python
def test_retrieve_documents_filters_below_threshold():
    # Arrange
    mock_index = MockVectorIndex(
        results=[
            SearchResult(document=doc_a, score=0.9),
            SearchResult(document=doc_b, score=0.6),  # below threshold
        ]
    )
    retriever = DenseRetriever(index=mock_index, score_threshold=0.75)

    # Act
    results = retriever.retrieve("test query")

    # Assert
    assert len(results) == 1
    assert results[0] == doc_a
```

**Test Naming**

`test_<unit>_<scenario>_<expected_outcome>`

```
test_retrieve_documents_with_empty_query_raises_value_error
test_agent_runner_when_tool_fails_retries_up_to_max_attempts
test_user_repository_create_returns_persisted_user_with_id
```

**Coverage Targets**

| Layer | Target |
|-------|--------|
| Domain logic / business rules | 90%+ |
| Service / use-case layer | 80%+ |
| Infrastructure adapters | 70%+ (integration tests cover the rest) |
| Entrypoints (CLI, API routes) | Smoke tests minimum |

**Test Types**

- **Unit tests**: Pure logic, all dependencies mocked. Fast. No I/O.
- **Integration tests**: Real infrastructure (DB, vector store, external APIs). Use
  test containers or sandboxed environments. Marked with `@pytest.mark.integration`.
- **End-to-end tests**: Full system path. Used sparingly for critical user journeys.
- **Contract tests**: For LLM-dependent code — assert structural response shape, not
  exact text. Prompt regressions are tested via evals, not unit tests.

**Python Testing Stack**
- `pytest` with `pytest-asyncio` for async tests
- `pytest-cov` for coverage reporting
- `respx` or `httpx` mock for HTTP client mocking
- `factory_boy` for test data factories
- `freezegun` for time-dependent tests

**TypeScript Testing Stack**
- `vitest` (preferred) or `jest`
- `@testing-library/*` for UI component tests
- `msw` for HTTP mocking

**Rules**
- Tests must pass before any PR is merged. No exceptions.
- Flaky tests are treated as bugs and fixed immediately.
- Never mock what you own — mock only at system boundaries (external APIs, DB, file system).
- Do not test implementation details; test observable behavior.

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

- Use the latest stable Python release. Pin the exact version in `.python-version`
  (managed by `pyenv` or `uv`) so environments are reproducible across machines and CI.
- Use `uv` for dependency management; `pyproject.toml` as the project manifest.
- Formatting: `ruff format` + `ruff check` (replaces black + isort + flake8 + pylint).
- Type checking: `pyright` in strict mode. Zero errors required in `main`/`develop`.
- Full type hints everywhere — see [Type Hints](#type-hints) above.
- Docstrings: Google style — see [Documentation Standards](#documentation-standards) above.
- Testing: `pytest` — see [Testing Standards](#testing-standards) above.
- Use `pydantic` v2 for all data models, configuration, and validation.
- Use `python-dotenv` for env var loading in scripts; `pydantic-settings` in applications.
**Enterprise-grade package ecosystem (Python):**

| Category | Package | Notes |
|----------|---------|-------|
| Runtime & deps | `uv` | Dependency management and virtual envs |
| Data modeling | `pydantic` v2 | Models, validation, serialization |
| Configuration | `pydantic-settings` | Typed config from env vars / files |
| HTTP client | `httpx` | Async-first, type-safe, replaces `requests` |
| Async framework | `fastapi` | APIs; `starlette` for lightweight services |
| Database ORM | `sqlalchemy` 2.x | Async ORM; `asyncpg` driver for PostgreSQL |
| Migrations | `alembic` | Schema migration tied to SQLAlchemy models |
| Task queue | `celery` + `redis` or `arq` | Background jobs and scheduling |
| Logging | `structlog` | Structured, machine-readable JSON logs |
| Observability | `opentelemetry-sdk` + `prometheus-client` | Traces and metrics |
| LLM clients | `anthropic` SDK | Always use official SDKs |
| LLM observability | `langfuse` or `arize-phoenix` | Prompt tracing and evals |
| Testing | `pytest` + `pytest-asyncio` + `factory-boy` + `respx` | Full test stack |
| Linting/format | `ruff` | Replaces black, isort, flake8, pylint |
| Type checking | `pyright` (strict) | Runs in CI and as pre-commit hook |
| CLI | `typer` | Type-annotated CLIs backed by Pydantic |
| Retry logic | `tenacity` | Configurable retry/backoff decorator |
| Secrets | `python-dotenv` (dev), vault SDK / AWS SSM (prod) | Never hardcode |
| Serialization | `orjson` | Fastest JSON serializer; drop-in for `json` |
| Env pinning | `pyenv` / `uv` `.python-version` | Reproducible runtimes |

**Recommended project layout (Python):**
```
my-project/
├── src/
│   └── my_project/
│       ├── __init__.py
│       ├── domain/          # Pure business logic, no I/O
│       ├── application/     # Use cases, orchestration
│       ├── infrastructure/  # DB, API clients, external adapters
│       └── entrypoints/     # CLI, API routes, Lambda handlers
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── pyproject.toml
└── README.md
```

### TypeScript / JavaScript

- TypeScript always. Vanilla JavaScript only for config files.
- Use `pnpm` as the package manager.
- Formatting: `prettier` + `eslint` with `@typescript-eslint`.
- `strict: true` in `tsconfig.json`. No `any`. See [Type Hints](#type-hints) above.
- Docstrings: TSDoc style — see [Documentation Standards](#documentation-standards) above.
- Testing: `vitest` — see [Testing Standards](#testing-standards) above.
- Use `zod` for runtime validation at all system boundaries.
- Use `neverthrow` or explicit `Result<T, E>` types for error handling over thrown exceptions.

**Enterprise-grade package ecosystem (TypeScript):**

| Category | Package | Notes |
|----------|---------|-------|
| Runtime & deps | `pnpm` + `Node.js` LTS | Use `.nvmrc` to pin Node version |
| Validation | `zod` | Runtime schema validation at all boundaries |
| HTTP framework | `hono` or `fastify` | Lightweight, type-safe, high-performance |
| HTTP client | `ky` or `ofetch` | Fetch wrappers with retry and typed responses |
| ORM | `drizzle-orm` or `prisma` | Drizzle for type-first; Prisma for DX |
| Task queue | `bullmq` | Redis-backed job queues |
| Logging | `pino` | Structured JSON logs; `pino-pretty` for dev |
| Observability | `@opentelemetry/sdk-node` + `prom-client` | OTel traces + Prometheus metrics |
| LLM clients | `@anthropic-ai/sdk` | Official SDK; always use this |
| LLM observability | `langfuse` | Prompt tracing and evals |
| Testing | `vitest` + `@testing-library/*` + `msw` | Full test stack |
| Linting/format | `eslint` + `prettier` + `@typescript-eslint` | Strict ruleset |
| Error handling | `neverthrow` | Typed Result/Either pattern |
| CLI | `commander` or `@clack/prompts` | Type-safe CLIs |
| Env vars | `@t3-oss/env-*` | Zod-validated env schemas |
| Serialization | `superjson` | Handles Date/Map/Set; use where needed |

**Recommended project layout (TypeScript):**
```
my-project/
├── src/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── entrypoints/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
└── README.md
```

### General

- All projects runnable with a single command documented in `README.md`.
- Docker / `docker-compose` required for any project with infrastructure dependencies.
- All linters and type checkers run as pre-commit hooks (`pre-commit` framework).
- CI must run: lint → type-check → unit tests → integration tests in that order.

---

## Fail Early — Pre-commit & Local Quality Gates

Bugs caught locally cost nothing. Bugs caught in CI cost minutes. Bugs caught in
production cost trust. The goal is to push the detection boundary as far left as possible.

### Pre-commit Hooks

Every project must have a `.pre-commit-config.yaml`. Install with:

```bash
uv tool install pre-commit   # or: pip install pre-commit
pre-commit install           # installs hooks into .git/hooks
pre-commit install --hook-type commit-msg  # enforces conventional commits
```

**Workspace-standard hook set (Python projects):**

```yaml
# .pre-commit-config.yaml
repos:
  # --- Commit message format ---
  - repo: https://github.com/compilerla/conventional-pre-commit
    rev: v3.4.0
    hooks:
      - id: conventional-pre-commit
        stages: [commit-msg]

  # --- General hygiene ---
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-toml
      - id: check-json
      - id: check-merge-conflict
      - id: check-added-large-files
        args: ["--maxkb=500"]
      - id: detect-private-key
      - id: no-commit-to-branch
        args: ["--branch", "main", "--branch", "develop"]

  # --- Secrets scanning ---
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.4
    hooks:
      - id: gitleaks

  # --- Python: formatting & linting ---
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.10
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  # --- Python: type checking ---
  - repo: https://github.com/RobertCraigie/pyright-python
    rev: v1.1.371
    hooks:
      - id: pyright
```

**Workspace-standard hook set (TypeScript projects):**

```yaml
repos:
  - repo: https://github.com/compilerla/conventional-pre-commit
    rev: v3.4.0
    hooks:
      - id: conventional-pre-commit
        stages: [commit-msg]

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-json
      - id: check-merge-conflict
      - id: detect-private-key
      - id: no-commit-to-branch
        args: ["--branch", "main", "--branch", "develop"]

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.4
    hooks:
      - id: gitleaks

  - repo: local
    hooks:
      - id: typecheck
        name: TypeScript type check
        entry: pnpm tsc --noEmit
        language: system
        pass_filenames: false
      - id: lint
        name: ESLint
        entry: pnpm eslint . --max-warnings 0
        language: system
        pass_filenames: false
```

### Rules

- `pre-commit run --all-files` must pass cleanly before any PR is opened.
- CI re-runs all hooks as the first step — local compliance does not skip CI checks.
- Hooks that auto-fix (ruff, prettier) stage the fixes. Review them, then re-commit.
- `--no-verify` is forbidden except in documented emergencies. Document the reason
  in the commit message if used.
- `detect-private-key` and `gitleaks` run on every commit. A block here means stop
  everything and rotate the credential before continuing.

---

## Observability & Monitoring

Observability is a first-tier engineering objective, not an afterthought. Every project
that runs beyond a single script is instrumented from day one.

### The Three Pillars

**Logs** — structured, machine-readable, always written to stdout.

- Python: `structlog` with JSON renderer in production, ConsoleRenderer in development.
- TypeScript: `pino` with `pino-pretty` in development, raw JSON in production.
- Every log entry must include: `timestamp`, `level`, `service`, `trace_id` (if in a
  request context), and a human-readable `event` message.
- Log levels are used semantically:
  - `DEBUG` — detailed internal state, off in production by default
  - `INFO` — normal operational events (request received, task completed)
  - `WARNING` — unexpected but handled conditions
  - `ERROR` — failures that require attention
  - `CRITICAL` — system-level failures requiring immediate response

```python
import structlog

log = structlog.get_logger(__name__)

log.info(
    "document_retrieval_completed",
    query_length=len(query),
    results_returned=len(results),
    latency_ms=elapsed_ms,
    trace_id=ctx.trace_id,
)
```

**Metrics** — quantitative signals about system behavior over time.

- Expose a `/metrics` endpoint (Prometheus format) on all HTTP services.
- Instrument at minimum: request count, request latency (p50/p95/p99), error rate,
  and any domain-specific business metrics (tokens consumed, retrievals per second, etc.).
- Python: `prometheus-client` or `opentelemetry-sdk`.
- TypeScript: `prom-client` or OpenTelemetry SDK.

**Traces** — distributed context propagation across service/agent boundaries.

- Use OpenTelemetry for all tracing instrumentation. Never use vendor-specific tracing SDKs
  directly — instrument against the OTel API and configure the exporter separately.
- Propagate `trace_id` and `span_id` through all async call chains.
- For agentic pipelines: create a span per tool call, per LLM inference, and per retrieval.
- Python: `opentelemetry-sdk` + `opentelemetry-instrumentation-*`
- TypeScript: `@opentelemetry/sdk-node` + auto-instrumentations

### AI-Specific Observability

LLM calls are the most expensive and most variable operations. Instrument them thoroughly.

Every LLM call must record:
- `model` — exact model ID used
- `input_tokens` — from the response usage object
- `output_tokens` — from the response usage object
- `latency_ms` — wall-clock time for the full inference call
- `stop_reason` — why generation stopped
- `tool_calls` — names of any tools invoked (not arguments, which may contain PII)

For agents, also record per-run:
- `total_turns` — number of inference steps
- `total_tokens` — cumulative input + output
- `tools_used` — list of distinct tools invoked
- `outcome` — `success`, `max_turns_reached`, `error`, `user_interrupted`

Use [Langfuse](https://langfuse.com) or [Arize Phoenix](https://phoenix.arize.com) as the
LLM observability backend for tracing prompt/response pairs and eval scores.

### Health Checks

Every service exposes:
- `GET /health` — liveness: returns `200` if the process is alive.
- `GET /ready` — readiness: returns `200` only if all dependencies (DB, vector store,
  model endpoint) are reachable. Returns `503` with a JSON body listing failed checks.

### Alerting Baselines

Document alert thresholds in the project `CLAUDE.md`. At minimum define:

| Signal | Alert threshold |
|--------|----------------|
| Error rate | > 1% of requests over 5 min |
| p95 latency | > 2× baseline over 5 min |
| LLM token spend | > configured daily budget |
| Failed health check | Any single failure |

---

## CI / CD

CI/CD is the automated immune system of the codebase. Every check that can be
automated must be automated. Manual steps in a release process are defects.

### Pipeline Stages

All projects use GitHub Actions. The pipeline runs in this order:

```
pre-commit → lint → type-check → unit-tests → integration-tests → build → deploy
```

Each stage is a separate job. A failing job blocks all downstream jobs.

**Standard workflow file: `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: [develop, main]

jobs:
  pre-commit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "latest" }
      - uses: pre-commit/action@v3.0.1

  lint-and-typecheck:
    needs: pre-commit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --frozen
      - run: uv run ruff check .
      - run: uv run pyright

  unit-tests:
    needs: lint-and-typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --frozen
      - run: uv run pytest tests/unit --cov --cov-fail-under=80

  integration-tests:
    needs: unit-tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --frozen
      - run: uv run pytest tests/integration -m integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost/test

  build:
    needs: integration-tests
    if: github.ref == 'refs/heads/develop' || github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v6
        with:
          push: false
          tags: ${{ github.repository }}:${{ github.sha }}
```

### Branch Protection Rules

Configure these on GitHub for `main` and `develop`:

- Require all CI jobs to pass before merge.
- Require at least 1 approving review for `main`.
- Dismiss stale reviews on new pushes.
- Require branches to be up to date before merging.
- Do not allow force pushes or branch deletion.

### Dependency Management

- Pin all dependencies to exact versions in lock files (`uv.lock`, `pnpm-lock.yaml`).
- Run `uv sync --frozen` / `pnpm install --frozen-lockfile` in CI — never allow CI to
  silently upgrade dependencies.
- Use Dependabot or Renovate to automate dependency update PRs on a weekly schedule.

### Release Automation

On merge to `main`, the CD pipeline:

1. Extracts the version from the tag or `pyproject.toml`.
2. Builds and pushes the Docker image tagged with the semver version and `latest`.
3. Generates a GitHub Release with auto-generated changelog from conventional commits.
4. Deploys to the target environment (defined per project in the project `CLAUDE.md`).

Use `semantic-release` or `release-please` to automate version bumping from
conventional commit history.

---

## Security

- Never commit secrets, credentials, or PII. Use `.gitignore` aggressively.
- Run `git diff --staged` before every commit to verify nothing sensitive is included.
- Sanitize all user input before passing to LLMs (prompt injection is a real threat).
- For web-facing projects: OWASP Top 10 is the baseline security checklist.
- Rotate any accidentally committed credentials immediately.

---

## Project CLAUDE.md

Every project has its own `CLAUDE.md`. This is the primary context document Claude Code
reads when working inside a project. It must be kept current — stale CLAUDE.md files
are worse than none.

**Required sections in every project CLAUDE.md:**

```markdown
# <Project Name>

One-paragraph description of what this project does and why it exists.

## Architecture

Describe the high-level design: layers, key components, data flow.
Mention which design patterns are in use and where.

## How to Run

Commands to install dependencies, run the app, and run tests. No prose — just commands.

    uv sync
    uv run python -m my_project

## Environment Variables

List every required variable and what it controls.

    ANTHROPIC_API_KEY   # Anthropic API key
    DATABASE_URL        # PostgreSQL connection string

## Key Decisions & Constraints

Document non-obvious decisions so they aren't accidentally undone.
E.g. "We use X instead of Y because of Z."

## CI / CD

Note which pipeline file drives this project and what the deploy target is.

## Observability

Where logs go, what dashboards exist, what alerts are configured.

## Standards Overrides

List any workspace-standard deviations with justification.
If there are none, write: "No overrides — workspace standards apply in full."
```

---

## Working with Claude (Claude Code)

- Always read the project's `CLAUDE.md` before making any changes.
- Read existing code before modifying it. Never assume structure.
- Prefer editing existing files over creating new ones.
- Keep changes minimal and scoped to what was requested.
- All Claude-generated branches follow the `claude/<task-id>` naming convention.
- Claude must not push to `main` or `develop` directly.
- Update the project `CLAUDE.md` when architecture or key decisions change.

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
