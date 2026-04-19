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

Usage:
    cd agent-host
    uv run python tests/eval/run_evals.py
    uv run python tests/eval/run_evals.py --url http://localhost:8003 --verbose
"""

from __future__ import annotations

import argparse
import json
import sys
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

# ---------------------------------------------------------------------------
# Matching helpers
# ---------------------------------------------------------------------------


def _entity_match(returned: dict, expected: ExpectedEntity) -> bool:
    name = returned.get("name", "").lower()
    return expected.name.lower() in name


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


def run_case(case: EvalCase, client: httpx.Client, verbose: bool) -> CaseResult:
    payload = {
        "transcript": case.transcript.strip(),
        "filename": f"{case.id}.md",
        "meeting_date": case.meeting_date,
    }
    try:
        resp = client.post("/ingest/meeting", json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
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


def _print_summary(results: list[CaseResult]) -> None:
    print("\n" + "═" * 70)
    print("EVAL SUMMARY")
    print("═" * 70)

    categories = ["entities", "risks", "opportunities", "tasks"]
    col_w = 16

    # Header
    print(f"{'Case':<35}" + "".join(f"{c.upper():>{col_w}}" for c in ["f1", *categories]))
    print("─" * (35 + col_w * 5))

    # Per-case rows
    all_scores: dict[str, list[float]] = {c: [] for c in categories}
    f1_scores: list[float] = []

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
        print(row + ("  " + status if status else ""))

    # Averages
    print("─" * (35 + col_w * 5))
    avg_f1 = sum(f1_scores) / len(f1_scores) if f1_scores else 0.0
    row = f"{'AVERAGE':<35}{avg_f1:>{col_w}.2f}"
    for c in categories:
        avg = sum(all_scores[c]) / len(all_scores[c]) if all_scores[c] else 0.0
        row += f"{avg:>{col_w}.2f}"
    print(row)
    print("═" * 70)

    # Pass/fail threshold
    threshold = 0.5
    passed = avg_f1 >= threshold
    verdict = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n  Overall macro-F1: {avg_f1:.2f}  (threshold: {threshold})  {verdict}")
    print()

    return avg_f1, passed


def main() -> None:
    parser = argparse.ArgumentParser(description="Run M4 golden evals")
    parser.add_argument("--url", default="http://localhost:8003", help="Agent host base URL")
    parser.add_argument("--case", help="Run a single case by ID")
    parser.add_argument("--verbose", "-v", action="store_true", help="Print per-case details")
    args = parser.parse_args()

    cases = [c for c in ALL_CASES if not args.case or c.id == args.case]
    if not cases:
        print(f"No cases matched: {args.case}")
        sys.exit(1)

    print(f"\nRunning {len(cases)} eval case(s) against {args.url} …\n")

    with httpx.Client(base_url=args.url) as client:
        results = [run_case(c, client, args.verbose) for c in cases]

    _, passed = _print_summary(results)
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
