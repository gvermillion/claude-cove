"""Tests for Phase 2 prompt constants in agents.py — no LLM calls."""
from __future__ import annotations

from m4_agent_host.infrastructure.ai.agents import (
    _ENTITY_RESOLVE_INSTRUCTION,
    _ENTITY_RESOLVE_STRUCTURE_SYSTEM,
    _OPP_EXTRACT_INSTRUCTION,
    _OPP_STRUCTURE_SYSTEM,
    _RISK_EXTRACT_INSTRUCTION,
    _RISK_STRUCTURE_SYSTEM,
    _TASK_EXTRACT_INSTRUCTION,
    _TASK_STRUCTURE_SYSTEM,
)


class TestTaskExtractInstruction:
    def test_contains_reject_section(self) -> None:
        assert "REJECT:" in _TASK_EXTRACT_INSTRUCTION

    def test_contains_due_hint_verbatim(self) -> None:
        assert "due_hint" in _TASK_EXTRACT_INSTRUCTION

    def test_contains_commitment_levels(self) -> None:
        assert "hard" in _TASK_EXTRACT_INSTRUCTION
        assert "soft" in _TASK_EXTRACT_INSTRUCTION
        assert "implied" in _TASK_EXTRACT_INSTRUCTION

    def test_contains_evidence_requirement(self) -> None:
        assert "evidence" in _TASK_EXTRACT_INSTRUCTION


class TestTaskStructureSystem:
    def test_contains_commitment_field(self) -> None:
        assert "commitment" in _TASK_STRUCTURE_SYSTEM

    def test_contains_evidence_field(self) -> None:
        assert "evidence" in _TASK_STRUCTURE_SYSTEM

    def test_contains_blocks_field(self) -> None:
        assert "blocks" in _TASK_STRUCTURE_SYSTEM

    def test_due_hint_not_iso(self) -> None:
        assert "Do NOT convert to ISO" in _TASK_STRUCTURE_SYSTEM


class TestRiskExtractInstruction:
    def test_contains_no_metrics_guardrail(self) -> None:
        assert "Do NOT emit metrics as risks" in _RISK_EXTRACT_INSTRUCTION

    def test_contains_evidence_requirement(self) -> None:
        assert "evidence" in _RISK_EXTRACT_INSTRUCTION


class TestRiskStructureSystem:
    def test_contains_evidence_field(self) -> None:
        assert "evidence" in _RISK_STRUCTURE_SYSTEM

    def test_severity_values(self) -> None:
        assert "low" in _RISK_STRUCTURE_SYSTEM
        assert "medium" in _RISK_STRUCTURE_SYSTEM
        assert "high" in _RISK_STRUCTURE_SYSTEM


class TestOppExtractInstruction:
    def test_contains_no_staffing_guardrail(self) -> None:
        assert "Do NOT emit staffing/ops actions" in _OPP_EXTRACT_INSTRUCTION

    def test_contains_evidence_requirement(self) -> None:
        assert "evidence" in _OPP_EXTRACT_INSTRUCTION


class TestOppStructureSystem:
    def test_contains_new_logo_type(self) -> None:
        assert "new_logo" in _OPP_STRUCTURE_SYSTEM

    def test_contains_evidence_field(self) -> None:
        assert "evidence" in _OPP_STRUCTURE_SYSTEM

    def test_contains_account_field(self) -> None:
        assert "account" in _OPP_STRUCTURE_SYSTEM

    def test_contains_value_hint_field(self) -> None:
        assert "value_hint" in _OPP_STRUCTURE_SYSTEM

    def test_contains_stage_hint_field(self) -> None:
        assert "stage_hint" in _OPP_STRUCTURE_SYSTEM


class TestEntityResolveInstruction:
    def test_contains_candidate_constraint(self) -> None:
        assert "Do NOT add names not in the candidate" in _ENTITY_RESOLVE_INSTRUCTION

    def test_contains_drop_flag(self) -> None:
        assert "drop=true" in _ENTITY_RESOLVE_INSTRUCTION

    def test_contains_evidence_requirement(self) -> None:
        assert "evidence" in _ENTITY_RESOLVE_INSTRUCTION


class TestEntityResolveStructureSystem:
    def test_contains_drop_field(self) -> None:
        assert '"drop": bool' in _ENTITY_RESOLVE_STRUCTURE_SYSTEM

    def test_contains_relationship_values(self) -> None:
        assert "colleague" in _ENTITY_RESOLVE_STRUCTURE_SYSTEM
        assert "partner" in _ENTITY_RESOLVE_STRUCTURE_SYSTEM
        assert "prospect" in _ENTITY_RESOLVE_STRUCTURE_SYSTEM
