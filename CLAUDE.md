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

- Python 3.11+ preferred.
- Use `uv` for dependency management; `pyproject.toml` as the project manifest.
- Formatting: `ruff format` + `ruff check` (replaces black + isort + flake8 + pylint).
- Type checking: `pyright` in strict mode. Zero errors required in `main`/`develop`.
- Full type hints everywhere — see [Type Hints](#type-hints) above.
- Docstrings: Google style — see [Documentation Standards](#documentation-standards) above.
- Testing: `pytest` — see [Testing Standards](#testing-standards) above.
- Use `pydantic` v2 for all data models, configuration, and validation.
- Use `python-dotenv` for env var loading in scripts; `pydantic-settings` in applications.
- Use `structlog` for structured, machine-readable logging.
- Async-first for I/O-bound work: `asyncio` + `httpx` + `asyncpg` / `motor`.

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
- Logging: `pino` for structured JSON logs.

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
