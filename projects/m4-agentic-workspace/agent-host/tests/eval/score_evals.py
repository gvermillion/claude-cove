"""M4 eval LLM-judge scorer.

Loads raw ingest responses saved by run_evals.py and scores them with the
LLM-as-judge without re-running the expensive ingest pipeline.

Expects {results_dir}/{case_id}.json files written by run_evals.py.
Ground-truth labels are sourced from golden_evals.ALL_CASES.

Rubric (per category, 0.0–1.0 each):
  completeness  Did the agent find all expected signals?
  faithfulness  Are descriptions accurate to the source content?
  precision     Are returned items grounded (not hallucinated)?
  schema        Correct enum values (severity / type / relationship)?

Usage:
    cd agent-host
    uv run python tests/eval/score_evals.py
    uv run python tests/eval/score_evals.py --case silver-meeting-001
    uv run python tests/eval/score_evals.py --judge-model qwen3:14b --verbose
    uv run python tests/eval/score_evals.py --results-dir /tmp/eval-results
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from eval_judge import JudgeCaseResult, init_tracer, judge_case
from golden_evals import ALL_CASES


def _load_result(results_dir: Path, case_id: str) -> dict | None:
    """Load a saved ingest response JSON, or return None if missing."""
    path = results_dir / f"{case_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _print_judge_detail(jr: JudgeCaseResult) -> None:
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
        print(
            f"  {label.upper():15s} "
            f"completeness={judg.completeness:.2f}  "
            f"faithfulness={judg.faithfulness:.2f}  "
            f"precision={judg.precision:.2f}  "
            f"schema={judg.schema_score:.2f}  "
            f"→ {judg.mean:.2f}"
        )
        if judg.reasoning:
            for line in judg.reasoning.splitlines():
                print(f"    {line}")


def _print_summary(judge_results: list[JudgeCaseResult]) -> None:
    print("\n" + "═" * 80)
    print("JUDGE SUMMARY")
    print("═" * 80)

    categories = ["entities", "risks", "opportunities", "tasks"]
    col_w = 14

    header_cols = ["macro", *categories]
    print(f"{'Case':<35}" + "".join(f"{c.upper():>{col_w}}" for c in header_cols))
    print("─" * (35 + col_w * len(header_cols)))

    all_scores: dict[str, list[float]] = {c: [] for c in categories}
    macro_scores: list[float] = []

    for jr in judge_results:
        if jr.error:
            status = "❌ ERR"
            row = f"{jr.case_id[:33]:<35}{'ERR':>{col_w}}"
            for c in categories:
                row += f"{'ERR':>{col_w}}"
            print(row + f"  {status}")
            continue

        cat_scores = {
            "entities": jr.entities.mean,
            "risks": jr.risks.mean,
            "opportunities": jr.opportunities.mean,
            "tasks": jr.tasks.mean,
        }
        macro = jr.macro_score
        macro_scores.append(macro)
        for c in categories:
            all_scores[c].append(cat_scores[c])

        row = f"{jr.case_id[:33]:<35}{macro:>{col_w}.2f}"
        for c in categories:
            row += f"{cat_scores[c]:>{col_w}.2f}"
        print(row)

    print("─" * (35 + col_w * len(header_cols)))
    avg_macro = sum(macro_scores) / len(macro_scores) if macro_scores else 0.0
    row = f"{'AVERAGE':<35}{avg_macro:>{col_w}.2f}"
    for c in categories:
        avg = sum(all_scores[c]) / len(all_scores[c]) if all_scores[c] else 0.0
        row += f"{avg:>{col_w}.2f}"
    print(row)
    print("═" * 80)
    print(f"\n  Overall judge macro: {avg_macro:.2f}")
    print()


async def _score_all(
    case_ids: list[str],
    results_dir: Path,
    judge_model: str,
    judge_url: str,
    verbose: bool,
) -> list[JudgeCaseResult]:
    """Score all cases sequentially (Ollama serialises anyway)."""
    case_map = {c.id: c for c in ALL_CASES}
    judge_results: list[JudgeCaseResult] = []

    for case_id in case_ids:
        case = case_map.get(case_id)
        if case is None:
            print(f"  ⚠ unknown case '{case_id}' — skipping")
            continue

        data = _load_result(results_dir, case_id)
        if data is None:
            print(f"  ✗ no saved result for '{case_id}' in {results_dir} — skipping")
            print(f"     Run: uv run python tests/eval/run_evals.py --case {case_id}")
            continue

        print(f"  🧠 judging {case_id} …", flush=True)
        try:
            jr = await judge_case(
                case_id=case_id,
                returned=data,
                expected_entities=case.entities,
                expected_risks=case.risks,
                expected_opportunities=case.opportunities,
                expected_tasks=case.tasks,
                model=judge_model,
                base_url=judge_url,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"  ✗ judge failed — {exc}", flush=True)
            jr = JudgeCaseResult(
                case_id=case_id,
                entities=None,  # type: ignore[arg-type]
                risks=None,  # type: ignore[arg-type]
                opportunities=None,  # type: ignore[arg-type]
                tasks=None,  # type: ignore[arg-type]
                error=str(exc),
            )

        print(f"  ✓ {case_id}  macro={jr.macro_score:.2f}", flush=True)
        if verbose:
            _print_judge_detail(jr)
        judge_results.append(jr)

    return judge_results


def main() -> None:
    """Entry point for the M4 eval judge scorer."""
    parser = argparse.ArgumentParser(description="Score saved M4 eval results with LLM judge")
    _default_results = str(Path(__file__).parent / "results")
    parser.add_argument("--case", help="Score a single case by ID")
    parser.add_argument(
        "--results-dir",
        default=_default_results,
        help=f"Directory containing saved ingest responses (default: {_default_results})",
    )
    parser.add_argument(
        "--judge-model",
        default="qwen3:8b",
        help="Ollama model for judge (default: qwen3:8b)",
    )
    parser.add_argument(
        "--judge-url",
        default="http://localhost:11434",
        help="Ollama base URL — no /v1 suffix (default: http://localhost:11434)",
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Print per-category reasoning")
    args = parser.parse_args()

    results_dir = Path(args.results_dir)
    if not results_dir.exists():
        print(f"Results directory not found: {results_dir.resolve()}")
        print("Run run_evals.py first to generate ingest results.")
        sys.exit(1)

    if args.case:
        case_ids = [args.case]
    else:
        case_ids = [p.stem for p in sorted(results_dir.glob("*.json"))]
        if not case_ids:
            print(f"No result files found in {results_dir.resolve()}")
            print("Run run_evals.py first.")
            sys.exit(1)

    print(f"\nScoring {len(case_ids)} case(s) from {results_dir.resolve()}")
    print(f"Judge model: {args.judge_model} @ {args.judge_url}")
    print()

    init_tracer()  # export judge spans to Phoenix at localhost:4318

    judge_results = asyncio.run(
        _score_all(case_ids, results_dir, args.judge_model, args.judge_url, args.verbose)
    )

    _print_summary(judge_results)

    # Flush OTel spans before exit
    from opentelemetry import trace as otel_trace  # noqa: PLC0415
    provider = otel_trace.get_tracer_provider()
    if hasattr(provider, "force_flush"):
        provider.force_flush(timeout_millis=5000)


if __name__ == "__main__":
    main()
