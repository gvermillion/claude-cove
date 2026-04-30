from datetime import date

import pytest

from m4_agent_host.application.date_resolver import resolve_due_hint


class TestResolveDueHint:
    def test_next_week_returns_iso_in_range(self) -> None:
        anchor = date(2026, 4, 14)
        result = resolve_due_hint("next week", anchor)
        assert result is not None
        d = date.fromisoformat(result)
        assert date(2026, 4, 15) <= d <= date(2026, 4, 28)

    def test_iso_passthrough(self) -> None:
        assert resolve_due_hint("2026-05-01", date(2026, 4, 14)) == "2026-05-01"

    def test_none_phrase_returns_none(self) -> None:
        assert resolve_due_hint(None, date(2026, 4, 14)) is None

    def test_none_anchor_returns_none(self) -> None:
        assert resolve_due_hint("next week", None) is None

    def test_by_friday_returns_friday(self) -> None:
        anchor = date(2026, 4, 14)  # Tuesday
        result = resolve_due_hint("by Friday", anchor)
        assert result is not None
        d = date.fromisoformat(result)
        assert d.weekday() == 4  # Friday
        assert d >= date(2026, 4, 17)

    def test_empty_string_returns_none(self) -> None:
        assert resolve_due_hint("", date(2026, 4, 14)) is None

    def test_whitespace_only_returns_none(self) -> None:
        assert resolve_due_hint("   ", date(2026, 4, 14)) is None
