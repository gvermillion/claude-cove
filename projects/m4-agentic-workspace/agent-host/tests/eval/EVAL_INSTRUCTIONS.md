# M4 Agent Eval Instructions

Golden eval suite — 4 real Granola meeting transcripts with known signals.
Tests entity, risk, opportunity, and task extraction for each local model candidate.

---

## Baseline

| Model | macro-F1 | Entities | Risks | Opportunities | Tasks |
|---|---|---|---|---|---|
| `mistral:latest` | 0.10 | 0.00 | 0.08 | 0.00 | 0.33 |
| `mistral-nemo:latest` | 0.09 | 0.07 | 0.11 | 0.06 | 0.11 |
| `llama3.1:8b` | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

**Pass threshold:** macro-F1 ≥ 0.50

### Root cause (all models)
All three models fail with `UnexpectedModelBehavior: Exceeded maximum retries (1) for output validation`.
The models respond but produce JSON that doesn't match the strict Pydantic schemas.
`mistral:latest` partially works because it has better OpenAI-compatible tool-call adherence.
`llama3.1:8b` completely fails — it generates text but not valid tool-call JSON.

### Next steps to improve scores
1. **Increase agent retries** — PydanticAI `Agent(retries=3)` gives small models more attempts
2. **Add few-shot JSON examples to system prompts** — show exact schema format in the prompt
3. **Try `qwen2.5:7b`** — Qwen2.5 has strong function-calling compliance at 7B
4. **Try `phi4:14b` or `llama3.1:70b`** — larger models handle structured output better

---

## Prerequisites

Services up:
```bash
cd ~/personal/claude-cove/.claude/worktrees/implement-m4-mvp/projects/m4-agentic-workspace
docker compose ps        # all 5 services should show Up
docker compose up -d     # if any are down
```

Model installed:
```bash
ollama list              # verify exact NAME to use in .env
```

---

## Switching Models

Edit `.env` — both variables use the same model for MVP:

```
OLLAMA_TRIAGE_MODEL=<model-name>
OLLAMA_REASONING_MODEL=<model-name>
```

Rebuild and restart:
```bash
docker compose build agent-host --no-cache && docker compose restart agent-host
sleep 3
docker compose logs agent-host | grep agents_init   # confirm model name in logs
```

---

## Running the Full Eval Suite

```bash
cd ~/personal/claude-cove/.claude/worktrees/implement-m4-mvp/projects/m4-agentic-workspace/agent-host
uv run python tests/eval/run_evals.py --verbose
```

Takes ~3–5 minutes (4 ingest calls, each hitting the local model).

### Run a single case (faster iteration)

```bash
uv run python tests/eval/run_evals.py --case trimble-intro-2026-04-08 --verbose
uv run python tests/eval/run_evals.py --case polaris-sync-2026-04-17 --verbose
uv run python tests/eval/run_evals.py --case jordy-grant-1on1-2026-04-16 --verbose
uv run python tests/eval/run_evals.py --case ml-practice-strategy-2026-04-14 --verbose
```

---

## Reading the Output

```
CASE: Trimble x phData Introduction
──────────────────────────────────────
  ENTITIES        recall=83%  prec=100%  f1=0.91  [████████░░]  (5 returned / 6 expected)
    ✓ Sergio Valenzuela (stakeholder)
    ✗ Jordan Birdsell (colleague)
```

Summary table at the end:
```
AVERAGE    f1    entities    risks    opportunities    tasks
```

**What to watch:**
- `entities = 0.00` → model can't produce structured output (tool/schema failure)
- `tasks` is the easiest category — a model that can't beat 0.33 here isn't usable
- `opportunities = 0.00` consistently → likely schema mismatch, not a content problem

---

## Debugging Zero Scores

Check logs during a run:
```bash
docker compose logs agent-host --tail 30
```

| Log message | Meaning | Fix |
|---|---|---|
| `UnexpectedModelBehavior: Exceeded maximum retries` | Model output can't be parsed into schema | Try different model or add few-shot examples to prompts |
| `status_code: 400 … does not support tools` | Model doesn't support function calling | Try a different model |
| `status_code: 404` | Wrong model name | Run `ollama list`, check exact NAME |
| `status_code: 404 page not found` | Wrong base URL path | Confirm `OLLAMA_BASE_URL` ends in `/v1` |

---

## Eval Files

| File | Purpose |
|---|---|
| `tests/eval/golden_evals.py` | Ground-truth dataset (4 cases, 21 entities, 17 risks, 15 opps, 21 tasks) |
| `tests/eval/run_evals.py` | Runner — POSTs to ingest endpoint, scores, prints report |
| `tests/eval/EVAL_INSTRUCTIONS.md` | This file |

---

## Scoring Method

- **Entities:** case-insensitive name substring match
- **Risks / Opportunities / Tasks:** ≥2 of N keywords must appear in returned `description` (case-insensitive)
- **F1** = harmonic mean of precision and recall per category
- **macro-F1** = average F1 across all 4 categories
