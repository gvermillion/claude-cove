"""Cascade triage client — multi-stage analyzer chain.

Implements the TriageAnalyzer protocol by chaining analyzers in cost/latency
order. Each stage either returns a final result or raises
EscalateToNextAnalyzer to hand off to the next stage.

Default cascade:
    RuleBasedTriageClient  (instant, zero cost)
        → OllamaTriageClient  (local, fast, no external API cost)
            → ClaudeTriageClient  (remote, accurate, paid)

This design means:
  ~50% of emails never touch Ollama (newsletters, notifications)
  ~40% of emails are handled by Ollama (normal/low business email)
  ~10% of emails reach Claude (critical, high, ambiguous)

The percentages are illustrative and depend on inbox composition.

Exports:
    CascadeTriageClient: Implements TriageAnalyzer via a configurable chain.
"""

from __future__ import annotations

import structlog

from email_triage.domain.exceptions import TriageAnalysisError
from email_triage.domain.interfaces import TriageAnalyzer
from email_triage.domain.models import TriageResult
from email_triage.infrastructure.ai.rule_based_client import EscalateToNextAnalyzer

log: structlog.BoundLogger = structlog.get_logger(__name__)


class CascadeTriageClient:
    """Multi-stage email triage analyzer using a configurable chain of analyzers.

    Implements the TriageAnalyzer protocol. Each stage in the chain is tried
    in order. The first stage that does NOT raise EscalateToNextAnalyzer
    provides the final result.

    If all stages escalate or fail, TriageAnalysisError is raised.

    This is the composition point — the chain can be any combination of
    RuleBasedTriageClient, OllamaTriageClient, ClaudeTriageClient, or
    custom implementations.

    Example:
        >>> cascade = CascadeTriageClient(chain=[
        ...     RuleBasedTriageClient(),
        ...     OllamaTriageClient(model="llama3.2:3b"),
        ...     ClaudeTriageClient(api_key=key, model="claude-opus-4-6"),
        ... ])

    Attributes:
        _chain: Ordered list of TriageAnalyzer implementations.
    """

    def __init__(self, chain: list[TriageAnalyzer]) -> None:
        """Initialise the cascade with an ordered list of analyzers.

        Args:
            chain: Analyzers to try in order. Must contain at least one
                analyzer. The last analyzer should not raise
                EscalateToNextAnalyzer (i.e. Claude should be the terminal
                stage — it always returns a result).

        Raises:
            ValueError: If chain is empty.
        """
        if not chain:
            raise ValueError("CascadeTriageClient requires at least one analyzer in the chain.")
        self._chain = chain

        stage_names = [type(a).__name__ for a in chain]
        log.info("cascade_client_ready", stages=stage_names)

    async def analyze(self, raw_email_bytes: bytes, queue_filename: str) -> TriageResult:
        """Run the cascade chain and return the first definitive result.

        Iterates through each analyzer in the chain. If a stage raises
        EscalateToNextAnalyzer, the next stage is tried. Any other exception
        from a stage propagates immediately without trying the next stage.

        Args:
            raw_email_bytes: Complete RFC 2822 email bytes.
            queue_filename: Basename of the originating .gpg file.

        Returns:
            The first TriageResult from a stage that did not escalate.

        Raises:
            TriageAnalysisError: If all stages escalate or the chain is
                exhausted without a result.
        """
        for index, analyzer in enumerate(self._chain):
            stage_name = type(analyzer).__name__
            try:
                result = await analyzer.analyze(raw_email_bytes, queue_filename)
                log.debug(
                    "cascade_stage_resolved",
                    queue_file=queue_filename,
                    stage=stage_name,
                    stage_index=index,
                    priority=result.priority.value,
                )
                return result

            except EscalateToNextAnalyzer:
                is_last = index == len(self._chain) - 1
                if is_last:
                    raise TriageAnalysisError(
                        f"All {len(self._chain)} cascade stages escalated for "
                        f"{queue_filename}. The final stage ({stage_name}) must "
                        "not raise EscalateToNextAnalyzer."
                    )
                next_stage = type(self._chain[index + 1]).__name__
                log.debug(
                    "cascade_stage_escalating",
                    queue_file=queue_filename,
                    from_stage=stage_name,
                    to_stage=next_stage,
                )
                continue

        # Unreachable: the loop always returns or raises before exhausting.
        raise TriageAnalysisError(f"Cascade chain exhausted for {queue_filename}")
