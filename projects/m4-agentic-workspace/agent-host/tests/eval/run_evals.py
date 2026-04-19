"""M4 agent eval runner.

POSTs each golden eval case to the ingest endpoint and scores the response
against the expected signals using fuzzy keyword matching.

Metrics per signal category:
  recall    = found_expected / total_expected
  precision = correct_returned / total_returned
  f1        = harmonic mean of precision and recall

An entity is "found" if a returned entity name contains the expected name
substring (case-insensitive).

A risk/opportunity/task is "found" if at least 2 of its keyword list appear
in the returned item's description (case-insensitive).

Optionally runs an LLM-as-judge pass after keyword scoring using qwen3:8b
via local Ollama (--judge flag). The judge applies a four-dimension rubric
(completeness / faithfulness / precision / schema) and surfaces its full
reasoning chain for calibration.

Usage:
    cd agent-host
    uv run python tests/eval/run_evals.py
    uv run python tests/eval/run_evals.py --url http://localhost:8003 --verbose
    uv run python tests/eval/run_evals.py --judge
    uv run python tests/eval/run_evals.py --judge --judge-model qwen3:14b --verbose
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import time
from dataclasses import dataclass

import httpx

from golden_evals import (
    ALL_CASES,
    EvalCase,
    ExpectedEntity,
    ExpectedOpportunity,
    ExpectedRisk,
    ExpectedTask,
)

# Lazy import of judge types — only required when --judge flag is used.
# Imported at module level for type hints only; avoids hard dependency on httpx
# being installed when just running keyword evals.
try:
    from eval_judge import JudgeCaseResult
except ImportError:  # pragma: no cover
    JudgeCaseResult = None  # type: ignore[assignment,misc]

# ---------------------------------------------------------------------------
# Matching helpers
# ---------------------------------------------------------------------------


def _entity_match(returned: dict, expected: ExpectedEntity) -> bool:
    returned_name = returned.get("name", "").lower()
    expected_name = expected.name.lower()
    # Match if either is a substring of the other (handles "Abby" matching "Abby Liu")
    return expected_name in returned_name or returned_name in expected_name


def _keyword_match(description: str, keywords: list[str], threshold: int = 2) -> bool:
    desc = description.lower()
    hits = sum(1 for kw in keywords if kw.lower() in desc)
    return hits >= threshold


def _score_category(
    returned_items: list[dict],
    expected_items: list,
    match_fn,
) -> tuple[float, float, float]:
    """Return (precision, recall, f1) for one signal category."""
    if not expected_items and not returned_items:
        return 1.0, 1.0, 1.0  # vacuously perfect

    true_positives = 0
    matched_expected = set()

    for ret in returned_items:
        for i, exp in enumerate(expected_items):
            if i not in matched_expected and match_fn(ret, exp):
                true_positives += 1
                matched_expected.add(i)
                break  # each returned item matches at most one expected

    precision = true_positives / len(returned_items) if returned_items else 0.0
    recall = true_positives / len(expected_items) if expected_items else 1.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    return precision, recall, f1


# ---------------------------------------------------------------------------
# Per-case scoring
# ---------------------------------------------------------------------------


@dataclass
class CategoryScore:
    precision: float
    recall: float
    f1: float
    expected_count: int
    returned_count: int
    found: list[str]
    missed: list[str]


@dataclass
class CaseResult:
    case_id: str
    entities: CategoryScore
    risks: CategoryScore
    opportunities: CategoryScore
    tasks: CategoryScore
    error: str | None = None
    judge: JudgeCaseResult | None = None  # populated when --judge is set

    @property
    def macro_f1(self) -> float:
        return (
            self.entities.f1 + self.risks.f1 + self.opportunities.f1 + self.tasks.f1
        ) / 4


def _describe_entity(e: ExpectedEntity) -> str:
    return f"{e.name} ({e.relationship})"


def _describe_risk(r: ExpectedRisk) -> str:
    return f"[{r.severity}] {', '.join(r.keywords[:3])}"


def _describe_opp(o: ExpectedOpportunity) -> str:
    return f"[{o.type}] {', '.join(o.keywords[:3])}"


def _describe_task(t: ExpectedTask) -> str:
    owner = f" → {t.owner}" if t.owner else ""
    return f"{', '.join(t.keywords[:3])}{owner}"


def _score_entities(returned: list[dict], expected: list[ExpectedEntity]) -> CategoryScore:
    found, missed = [], []
    tp = 0
    matched_exp: set[int] = set()
    for ret in returned:
        for i, exp in enumerate(expected):
            if i not in matched_exp and _entity_match(ret, exp):
                tp += 1
                matched_exp.add(i)
                found.append(_describe_entity(exp))
                break
    for i, exp in enumerate(expected):
        if i not in matched_exp:
            missed.append(_describe_entity(exp))

    precision = tp / len(returned) if returned else 0.0
    recall = tp / len(expected) if expected else 1.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    return CategoryScore(precision, recall, f1, len(expected), len(returned), found, missed)


def _score_signals(
    returned: list[dict],
    expected: list,
    keywords_fn,
    describe_fn,
) -> CategoryScore:
    found, missed = [], []
    tp = 0
    matched_exp: set[int] = set()
    for ret in returned:
        desc = ret.get("description", "")
        for i, exp in enumerate(expected):
            if i not in matched_exp and _keyword_match(desc, keywords_fn(exp)):
                tp += 1
                matched_exp.add(i)
                found.append(describe_fn(exp))
                break
    for i, exp in enumerate(expected):
        if i not in matched_exp:
            missed.append(describe_fn(exp))

    precision = tp / len(returned) if returned else 0.0
    recall = tp / len(expected) if expected else 1.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    return CategoryScore(precision, recall, f1, len(expected), len(returned), found, missed)


def evaluate_case(case: EvalCase, response: dict) -> CaseResult:
    entities_score = _score_entities(
        response.get("entities", []), case.entities
    )
    risks_score = _score_signals(
        response.get("risks", []),
        case.risks,
        lambda r: r.keywords,
        _describe_risk,
    )
    opps_score = _score_signals(
        response.get("opportunities", []),
        case.opportunities,
        lambda o: o.keywords,
        _describe_opp,
    )
    tasks_score = _score_signals(
        response.get("tasks", []),
        case.tasks,
        lambda t: t.keywords,
        _describe_task,
    )
    return CaseResult(
        case_id=case.id,
        entities=entities_score,
        risks=risks_score,
        opportunities=opps_score,
        tasks=tasks_score,
    )


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


def run_case(
    case: EvalCase,
    client: httpx.Client,
    verbose: bool,
    judge_args: tuple[str, str] | None = None,
) -> CaseResult:
    """Run one eval case: POST to ingest, score with keywords, optionally judge.

    Args:
        case: The eval case to run.
        client: Shared httpx client pointed at the agent host.
        verbose: Print per-case keyword detail when True.
        judge_args: Optional (model, base_url) tuple. When provided, an LLM
            judge is invoked after keyword scoring and results are attached to
            CaseResult.judge.

    Returns:
        CaseResult with keyword scores and optional judge scores.
    """
    payload = {
        "transcript": case.transcript.strip(),
        "filename": f"{case.id}.md",
        "meeting_date": case.meeting_date,
    }
    if case.participants:
        payload["participants"] = case.participants
    if case.granola_summary:
        payload["granola_summary"] = case.granola_summary
    transcript_len = len(case.transcript)
    print(f"  ⏳ {case.title}  ({transcript_len:,} chars)", flush=True)
    t0 = time.monotonic()
    try:
        # Fire the ingest request in a background thread so we can print
        # periodic heartbeats while waiting for the (slow) LLM pipeline.
        import concurrent.futures  # noqa: PLC0415

        def _do_post() -> httpx.Response:
            return client.post("/ingest/meeting", json=payload, timeout=600)

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(_do_post)
            tick = 0
            while not future.done():
                try:
                    future.result(timeout=10)
                except concurrent.futures.TimeoutError:
                    tick += 10
                    elapsed = time.monotonic() - t0
                    print(f"     … {elapsed:>5.0f}s elapsed", flush=True)
            resp = future.result()
        resp.raise_for_status()
        data = resp.json()
        elapsed = time.monotonic() - t0
        print(f"  ✓ done ({elapsed:.0f}s)", flush=True)
    except Exception as exc:
        elapsed = time.monotonic() - t0
        print(f"  ✗ ERROR ({elapsed:.0f}s) — {type(exc).__name__}: {exc}", flush=True)
        result = CaseResult(
            case_id=case.id,
            entities=CategoryScore(0, 0, 0, len(case.entities), 0, [], []),
            risks=CategoryScore(0, 0, 0, len(case.risks), 0, [], []),
            opportunities=CategoryScore(0, 0, 0, len(case.opportunities), 0, [], []),
            tasks=CategoryScore(0, 0, 0, len(case.tasks), 0, [], []),
            error=str(exc),
        )
        return result

    result = evaluate_case(case, data)

    if verbose:
        _print_case_detail(case, result)

    if judge_args is not None:
        from eval_judge import judge_case  # noqa: PLC0415

        judge_model, judge_url = judge_args
        print(f"    🧠 Running judge ({judge_model})…", flush=True)
        t_judge = time.monotonic()
        try:
            import concurrent.futures  # noqa: PLC0415

            def _do_judge() -> "JudgeCaseResult":
                return asyncio.run(
                    judge_case(
                        case_id=case.id,
                        returned=data,
                        expected_entities=case.entities,
                        expected_risks=case.risks,
                        expected_opportunities=case.opportunities,
                        expected_tasks=case.tasks,
                        model=judge_model,
                        base_url=judge_url,
                    )
                )

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(_do_judge)
                while not future.done():
                    try:
                        future.result(timeout=10)
                    except concurrent.futures.TimeoutError:
                        elapsed_judge = time.monotonic() - t_judge
                        print(f"       … {elapsed_judge:>5.0f}s elapsed", flush=True)
                judge_result = future.result()
        except Exception as exc:  # noqa: BLE001
            elapsed_judge = time.monotonic() - t_judge
            print(f"    ✗ judge failed ({elapsed_judge:.0f}s) — {exc}", flush=True)
            judge_result = None
        else:
            elapsed_judge = time.monotonic() - t_judge
            print(f"    ✓ judge done ({elapsed_judge:.0f}s)", flush=True)

        result.judge = judge_result

        if verbose and judge_result is not None:
            _print_judge_detail(result)

    return result


def _print_case_detail(case: EvalCase, result: CaseResult) -> None:
    print(f"\n  {'─' * 60}")
    print(f"  CASE: {case.title}")
    print(f"  {'─' * 60}")
    if result.error:
        print(f"  ❌ ERROR: {result.error}")
        return

    for label, score in [
        ("entities", result.entities),
        ("risks", result.risks),
        ("opportunities", result.opportunities),
        ("tasks", result.tasks),
    ]:
        bar = "█" * int(score.recall * 10) + "░" * (10 - int(score.recall * 10))
        print(f"\n  {label.upper():15s} recall={score.recall:.0%}  prec={score.precision:.0%}  "
              f"f1={score.f1:.2f}  [{bar}]  "
              f"({score.returned_count} returned / {score.expected_count} expected)")
        if score.found:
            for item in score.found:
                print(f"    ✓ {item}")
        if score.missed:
            for item in score.missed:
                print(f"    ✗ {item}")


def _print_judge_detail(result: CaseResult) -> None:
    """Print per-category LLM judge scores and reasoning when --verbose is set.

    Args:
        result: CaseResult with a populated judge field.
    """
    if result.judge is None:
        return
    jr = result.judge
    if jr.error:
        print(f"\n  JUDGE ERROR: {jr.error}")
        return

    print(f"\n  {'─' * 60}")
    print(f"  JUDGE SCORES  (macro={jr.macro_score:.2f})")
    print(f"  {'─' * 60}")

    for label, judg in [
        ("entities", jr.entities),
        ("risks", jr.risks),
        ("opportunities", jr.opportunities),
        ("tasks", jr.tasks),
    ]:
        mean = judg.mean
        print(
            f"  {label.upper():15s} "
            f"completeness={judg.completeness:.2f}  "
            f"faithfulness={judg.faithfulness:.2f}  "
            f"precision={judg.precision:.2f}  "
            f"schema={judg.schema_score:.2f}  "
            f"→ {mean:.2f}"
        )
        if judg.reasoning:
            # Indent multi-line reasoning
            for line in judg.reasoning.splitlines():
                print(f"    {line}")


def _print_summary(results: list[CaseResult]) -> tuple[float, bool]:
    """Print the keyword-score summary table and optional judge column.

    Args:
        results: All completed CaseResult objects.

    Returns:
        Tuple of (avg_macro_f1, passed).
    """
    has_judge = any(r.judge is not None and r.judge.error is None for r in results)

    print("\n" + "═" * 70)
    print("EVAL SUMMARY")
    print("═" * 70)

    categories = ["entities", "risks", "opportunities", "tasks"]
    col_w = 16

    # Header — add judge column when present
    header_cols = ["f1", *categories]
    if has_judge:
        header_cols.append("judge")
    print(f"{'Case':<35}" + "".join(f"{c.upper():>{col_w}}" for c in header_cols))
    print("─" * (35 + col_w * len(header_cols)))

    # Per-case rows
    all_scores: dict[str, list[float]] = {c: [] for c in categories}
    f1_scores: list[float] = []
    judge_scores: list[float] = []

    for r in results:
        cat_scores = {
            "entities": r.entities.f1,
            "risks": r.risks.f1,
            "opportunities": r.opportunities.f1,
            "tasks": r.tasks.f1,
        }
        row_f1 = r.macro_f1
        f1_scores.append(row_f1)
        for c in categories:
            all_scores[c].append(cat_scores[c])

        status = "❌" if r.error else ""
        row = f"{r.case_id[:33]:<35}{row_f1:>{col_w}.2f}"
        for c in categories:
            row += f"{cat_scores[c]:>{col_w}.2f}"

        if has_judge:
            if r.judge is not None and r.judge.error is None:
                js = r.judge.macro_score
                judge_scores.append(js)
                row += f"{js:>{col_w}.2f}"
            else:
                row += f"{'ERR':>{col_w}}"

        print(row + ("  " + status if status else ""))

    # Averages
    print("─" * (35 + col_w * len(header_cols)))
    avg_f1 = sum(f1_scores) / len(f1_scores) if f1_scores else 0.0
    row = f"{'AVERAGE':<35}{avg_f1:>{col_w}.2f}"
    for c in categories:
        avg = sum(all_scores[c]) / len(all_scores[c]) if all_scores[c] else 0.0
        row += f"{avg:>{col_w}.2f}"
    if has_judge:
        avg_judge = sum(judge_scores) / len(judge_scores) if judge_scores else 0.0
        row += f"{avg_judge:>{col_w}.2f}"
    print(row)
    print("═" * 70)

    # Pass/fail threshold
    threshold = 0.5
    passed = avg_f1 >= threshold
    verdict = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n  Overall macro-F1: {avg_f1:.2f}  (threshold: {threshold})  {verdict}")
    if has_judge and judge_scores:
        avg_judge = sum(judge_scores) / len(judge_scores)
        print(f"  Overall judge score: {avg_judge:.2f}")
    print()

    return avg_f1, passed


def main() -> None:
    """Entry point for the M4 eval runner."""
    parser = argparse.ArgumentParser(description="Run M4 golden evals")
    parser.add_argument("--url", default="http://localhost:8003", help="Agent host base URL")
    parser.add_argument("--case", help="Run a single case by ID")
    parser.add_argument("--verbose", "-v", action="store_true", help="Print per-case details")
    parser.add_argument(
        "--judge",
        action="store_true",
        help="Run LLM-as-judge scoring after keyword scoring",
    )
    parser.add_argument(
        "--judge-model",
        default="qwen3:8b",
        help="Ollama model for judge (default: qwen3:8b)",
    )
    parser.add_argument(
        "--judge-url",
        default="http://localhost:11434",
        help="Ollama base URL for judge — no /v1 suffix (default: http://localhost:11434)",
    )
    args = parser.parse_args()

    cases = [c for c in ALL_CASES if not args.case or c.id == args.case]
    if not cases:
        print(f"No cases matched: {args.case}")
        sys.exit(1)

    judge_args: tuple[str, str] | None = None
    if args.judge:
        judge_args = (args.judge_model, args.judge_url)
        from eval_judge import init_tracer  # noqa: PLC0415
        init_tracer()  # export judge spans to Phoenix at localhost:4318

    print(f"\nRunning {len(cases)} eval case(s) against {args.url}")
    print(f"Each case: entities → risks → opportunities → tasks (sequential, ~2-5 min each)")
    if judge_args:
        print(f"LLM judge: {args.judge_model} @ {args.judge_url}")
    print()

    with httpx.Client(base_url=args.url) as client:
        results = [run_case(c, client, args.verbose, judge_args) for c in cases]

    _, passed = _print_summary(results)

    # Flush OTel spans before exit so judge traces reach Phoenix
    if judge_args:
        from opentelemetry import trace as otel_trace  # noqa: PLC0415
        provider = otel_trace.get_tracer_provider()
        if hasattr(provider, "force_flush"):
            provider.force_flush(timeout_millis=5000)

    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
