"""Offline LLM-as-judge scorer for M4 eval results.

Loads raw ingest responses saved by ``run_evals.py`` and scores them with
the **production** two-pass judge (``judge.py`` → ``judge_core.py``) rather
than maintaining a separate eval-only judge implementation.

This is a thin runner — no judge logic, no rubric definitions.  It:

1. Loads saved result JSON files from ``--results-dir`` (written by ``run_evals.py``)
2. Loads ground truth from ``golden_evals.ALL_CASES``
3. Calls ``judge_category()`` from production ``judge.py`` for each category,
   passing: extracted_items, p1_thinking, ground_truth
4. Prints judge scores per case + summary
5. Exports spans to Phoenix (OpenTelemetry)

Because ground_truth is passed to ``judge_category()``, the conditional
``completeness`` dimension is included alongside the 5 production dimensions,
giving the eval judge 6 dimensions total.

Usage::

    cd agent-host
    uv run python tests/eval/judge_evals.py
    uv run python tests/eval/judge_evals.py --case polaris-sync-2026-04-17
    uv run python tests/eval/judge_evals.py --judge-model qwen3:14b --verbose
    uv run python tests/eval/judge_evals.py --results-dir /tmp/eval-results
"""

from __future__ import annotations

import argparse
import asyncio
import dataclasses
import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path

# Ensure the project source is importable when running from tests/eval/.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_PROJECT_ROOT / "src"))

# Point Phoenix/OTEL exporter to localhost BEFORE importing production modules.
# tracer.py runs module-level OTEL init on import and reads this via pydantic Settings.
# Without this, it defaults to "http://phoenix:6006/v1/traces" (Docker-internal hostname)
# which causes DNS resolution failures when running outside Docker.
os.environ.setdefault("PHOENIX_COLLECTOR_ENDPOINT", "http://localhost:6006/v1/traces")

from m4_agent_host.infrastructure.ai.agents import ExtractionTrace  # noqa: E402
from m4_agent_host.infrastructure.ai.judge import CategoryScore, judge_category  # noqa: E402
from m4_agent_host.infrastructure.telemetry.tracer import tracer  # noqa: E402
from openinference.semconv.trace import OpenInferenceSpanKindValues, SpanAttributes  # noqa: E402
from opentelemetry.trace import Status, StatusCode  # noqa: E402

from golden_evals import ALL_CASES, EvalCase  # noqa: E402


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class JudgeCaseResult:
    """Judge results for one eval case (all 4 categories)."""

    case_id: str
    entities: CategoryScore | None = None
    risks: CategoryScore | None = None
    opportunities: CategoryScore | None = None
    tasks: CategoryScore | None = None
    error: str | None = None

    @property
    def macro_score(self) -> float:
        """Mean of per-category mean scores.  0.0 on error."""
        if self.error:
            return 0.0
        scores = [
            s.mean
            for s in (self.entities, self.risks, self.opportunities, self.tasks)
            if s is not None
        ]
        return sum(scores) / len(scores) if scores else 0.0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_CATEGORIES = ["entities", "risks", "opportunities", "tasks"]


def _expected_to_dicts(expected_items: list) -> list[dict]:
    """Convert golden_evals expected items (dataclasses) to JSON-serialisable dicts."""
    return [dataclasses.asdict(item) for item in expected_items]


def _build_trace(category: str, data: dict) -> ExtractionTrace:
    """Build a minimal ExtractionTrace from a saved ingest response JSON."""
    return ExtractionTrace(
        category=category,
        slug=f"eval-{category}",
        model="saved-result",
        p1_system="",
        p1_response="",
        p1_thinking=data.get("p1_thinking", {}).get(category, ""),
        p2_input="",
        p2_result=data.get(category, []),
    )


def _get_ground_truth(case: EvalCase, category: str) -> list[dict]:
    """Return the ground-truth expected items for a category as dicts."""
    expected = getattr(case, category, [])
    return _expected_to_dicts(expected)


# ---------------------------------------------------------------------------
# Core judge loop
# ---------------------------------------------------------------------------


async def judge_case(
    case_id: str,
    case: EvalCase,
    data: dict,
    *,
    model: str = "qwen3:8b",
    base_url: str = "http://localhost:11434",
) -> JudgeCaseResult:
    """Score all 4 categories for one eval case using the production judge.

    Temporarily patches ``settings`` so that ``judge_category`` uses the
    caller's model and URL instead of the app's configured values.
    """
    from m4_agent_host.config import settings  # noqa: PLC0415

    # Patch settings for this run.
    orig_model = settings.ollama_judge_model
    orig_url = settings.ollama_base_url
    settings.ollama_judge_model = model
    settings.ollama_base_url = base_url

    try:
        transcript = data.get("_transcript", case.transcript.strip())
        results: dict[str, CategoryScore] = {}

        with tracer.start_as_current_span("judge_meeting") as span:
            span.set_attribute(
                SpanAttributes.OPENINFERENCE_SPAN_KIND,
                OpenInferenceSpanKindValues.CHAIN.value,
            )
            span.set_attribute(SpanAttributes.INPUT_VALUE,
                f"case={case_id} model={model} transcript_chars={len(transcript)}")

            for i, cat in enumerate(_CATEGORIES, 1):
                print(f"    [{i}/{len(_CATEGORIES)}] {cat} ...", end="", flush=True)
                t0 = time.monotonic()

                trace = _build_trace(cat, data)
                ground_truth = _get_ground_truth(case, cat)

                score = await judge_category(
                    category=cat,
                    trace=trace,
                    transcript=transcript,
                    ground_truth=ground_truth,
                )
                results[cat] = score

                elapsed = time.monotonic() - t0
                print(f" {score.mean:.2f}  ({elapsed:.1f}s)", flush=True)

            jr = JudgeCaseResult(
                case_id=case_id,
                entities=results.get("entities"),
                risks=results.get("risks"),
                opportunities=results.get("opportunities"),
                tasks=results.get("tasks"),
            )

            # Build output: macro_score + per-category score dicts.
            output: dict = {"macro_score": round(jr.macro_score, 3)}
            for cat in _CATEGORIES:
                s = results.get(cat)
                if s is not None:
                    output[cat] = {
                        "mean": round(s.mean, 3),
                        "faithfulness": s.faithfulness,
                        "precision": s.precision,
                        "reasoning_quality": s.reasoning_quality,
                        "schema": s.schema_score,
                        "citation_quality": s.citation_quality,
                    }
            span.set_attribute(SpanAttributes.OUTPUT_VALUE, json.dumps(output))
            span.set_status(Status(StatusCode.OK))

        return jr
    except Exception as exc:  # noqa: BLE001
        return JudgeCaseResult(case_id=case_id, error=str(exc))
    finally:
        settings.ollama_judge_model = orig_model
        settings.ollama_base_url = orig_url


# ---------------------------------------------------------------------------
# Display helpers
# ---------------------------------------------------------------------------


def _print_judge_detail(jr: JudgeCaseResult) -> None:
    if jr.error:
        print(f"\n  JUDGE ERROR: {jr.error}")
        return
    print(f"\n  {'─' * 70}")
    print(f"  JUDGE SCORES  (macro={jr.macro_score:.2f})")
    print(f"  {'─' * 70}")
    for label in _CATEGORIES:
        score: CategoryScore | None = getattr(jr, label)
        if score is None:
            print(f"  {label.upper():15s} (not scored)")
            continue
        print(
            f"  {label.upper():15s} "
            f"faith={score.faithfulness:.2f}  "
            f"prec={score.precision:.2f}  "
            f"reason={score.reasoning_quality:.2f}  "
            f"schema={score.schema_score:.2f}  "
            f"cite={score.citation_quality:.2f}  "
            f"-> {score.mean:.2f}"
        )
        if score.judge_reasoning:
            for line in score.judge_reasoning.splitlines()[:5]:
                print(f"    {line}")


def _print_summary(judge_results: list[JudgeCaseResult]) -> None:
    print("\n" + "=" * 80)
    print("JUDGE SUMMARY")
    print("=" * 80)

    col_w = 14
    header_cols = ["macro", *_CATEGORIES]
    print(f"{'Case':<35}" + "".join(f"{c.upper():>{col_w}}" for c in header_cols))
    print("-" * (35 + col_w * len(header_cols)))

    all_scores: dict[str, list[float]] = {c: [] for c in _CATEGORIES}
    macro_scores: list[float] = []

    for jr in judge_results:
        if jr.error:
            row = f"{jr.case_id[:33]:<35}{'ERR':>{col_w}}"
            for _ in _CATEGORIES:
                row += f"{'ERR':>{col_w}}"
            print(row)
            continue

        cat_scores: dict[str, float] = {}
        for c in _CATEGORIES:
            s: CategoryScore | None = getattr(jr, c)
            cat_scores[c] = s.mean if s else 0.0
        macro = jr.macro_score
        macro_scores.append(macro)
        for c in _CATEGORIES:
            all_scores[c].append(cat_scores[c])

        row = f"{jr.case_id[:33]:<35}{macro:>{col_w}.2f}"
        for c in _CATEGORIES:
            row += f"{cat_scores[c]:>{col_w}.2f}"
        print(row)

    print("-" * (35 + col_w * len(header_cols)))
    avg_macro = sum(macro_scores) / len(macro_scores) if macro_scores else 0.0
    row = f"{'AVERAGE':<35}{avg_macro:>{col_w}.2f}"
    for c in _CATEGORIES:
        avg = sum(all_scores[c]) / len(all_scores[c]) if all_scores[c] else 0.0
        row += f"{avg:>{col_w}.2f}"
    print(row)
    print("=" * 80)
    print(f"\n  Overall judge macro: {avg_macro:.2f}")
    print()


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


def _load_result(results_dir: Path, case_id: str) -> dict | None:
    path = results_dir / f"{case_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


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
            print(f"  Warning: unknown case '{case_id}' -- skipping")
            continue

        data = _load_result(results_dir, case_id)
        if data is None:
            print(f"  No saved result for '{case_id}' in {results_dir} -- skipping")
            print(f"     Run: uv run python tests/eval/run_evals.py --case {case_id}")
            continue

        print(f"  Judging {case_id} ...", flush=True)
        jr = await judge_case(
            case_id=case_id,
            case=case,
            data=data,
            model=judge_model,
            base_url=judge_url,
        )

        print(f"  Done: {case_id}  macro={jr.macro_score:.2f}", flush=True)
        if verbose:
            _print_judge_detail(jr)
        judge_results.append(jr)

    return judge_results


def main() -> None:
    """Entry point for the M4 eval judge scorer."""
    parser = argparse.ArgumentParser(description="Score saved M4 eval results with production two-pass judge")
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
        help="Ollama base URL -- no /v1 suffix (default: http://localhost:11434)",
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

    judge_results = asyncio.run(
        _score_all(case_ids, results_dir, args.judge_model, args.judge_url, args.verbose)
    )

    _print_summary(judge_results)

    # Flush OTel spans before exit.
    from opentelemetry import trace as otel_trace  # noqa: PLC0415
    provider = otel_trace.get_tracer_provider()
    if hasattr(provider, "force_flush"):
        provider.force_flush(timeout_millis=5000)


if __name__ == "__main__":
    main()
