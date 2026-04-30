import json
from pathlib import Path

import pytest

from m4_agent_host.domain.models import MeetingSignals

FIXTURE_DIR = Path(__file__).resolve().parents[2] / "eval" / "golden"


@pytest.mark.parametrize("slug", [
    "omar-grant-skill-first-2026-04-10",
    "phdata-precisely-leadership-2026-04-10",
    "ml-practice-all-hands-2026-04-03",
    "trimble-internal-prep-2026-04-07",
    "therapy-personal-2026-04-20",
    "empty-note-2026-04-20",
    "polaris-sync-2026-04-17",
])
def test_fixture_parses_into_meeting_signals(slug: str) -> None:
    path = FIXTURE_DIR / slug / "expected.json"
    data = json.loads(path.read_text())
    data.pop("meeting_date", None)
    data.pop("scope", None)
    signals = MeetingSignals(**data)
    assert isinstance(signals.entities, list)
    assert isinstance(signals.dropped, list)
