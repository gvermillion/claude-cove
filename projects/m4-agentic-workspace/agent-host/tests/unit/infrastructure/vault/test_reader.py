from __future__ import annotations

from pathlib import Path

import pytest
import frontmatter

from m4_agent_host.infrastructure.vault.reader import PersonContext, VaultReader


@pytest.fixture()
def vault(tmp_path: Path) -> Path:
    for d in ["_system", "inbox/meetings", "journal/daily", "people", "projects", "resources"]:
        (tmp_path / d).mkdir(parents=True)
    (tmp_path / "_system" / "log.md").write_text("")
    return tmp_path


def _write_person(vault: Path, name: str, **kwargs) -> None:
    """Helper: write a person page with frontmatter."""
    import re
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).lstrip("-")
    meta = {"type": "person", "name": name, "created": "2026-04-01T00:00:00+00:00", "updated": "2026-04-15T00:00:00+00:00", **kwargs}
    post = frontmatter.Post("## Notes\n\n## Rapport\n- Friendly\n\n### Rapport (2026-04-15)\n- Working on project X", **meta)
    (vault / "people" / f"{slug}.md").write_text(frontmatter.dumps(post))


def test_list_known_people_returns_all(vault: Path) -> None:
    _write_person(vault, "Jane Doe", title="VP", relationship="client", org="Acme")
    _write_person(vault, "Bob Smith", title="Engineer", relationship="colleague", org="phData")
    reader = VaultReader(str(vault))
    people = reader.list_known_people()
    assert len(people) == 2
    assert "jane doe" in people
    assert "bob smith" in people
    assert people["jane doe"].title == "VP"
    assert people["jane doe"].org == "Acme"
    assert people["bob smith"].relationship == "colleague"


def test_list_known_people_empty_vault(vault: Path) -> None:
    reader = VaultReader(str(vault))
    people = reader.list_known_people()
    assert people == {}


def test_get_person_by_slug(vault: Path) -> None:
    _write_person(vault, "Jane Doe", title="VP", relationship="client")
    reader = VaultReader(str(vault))
    person = reader.get_person("Jane Doe")
    assert person is not None
    assert person.name == "Jane Doe"
    assert person.title == "VP"


def test_get_person_returns_none_for_unknown(vault: Path) -> None:
    reader = VaultReader(str(vault))
    assert reader.get_person("Nobody") is None


def test_encounter_count_from_frontmatter(vault: Path) -> None:
    encounters = [
        {"date": "2026-04-01", "meeting": "standup-1"},
        {"date": "2026-04-08", "meeting": "standup-2"},
        {"date": "2026-04-15", "meeting": "standup-3"},
    ]
    _write_person(vault, "Jane Doe", encounters=encounters)
    reader = VaultReader(str(vault))
    people = reader.list_known_people()
    assert people["jane doe"].encounter_count == 3


def test_rapport_summary_extracts_notes(vault: Path) -> None:
    _write_person(vault, "Jane Doe", relationship="client")
    reader = VaultReader(str(vault))
    people = reader.list_known_people()
    # The fixture has "Working on project X" in a rapport section
    assert "Working on project X" in people["jane doe"].rapport_summary


def test_build_people_index_generates_markdown(vault: Path) -> None:
    _write_person(vault, "Jane Doe", title="VP", relationship="client", org="Acme",
                  encounters=[{"date": "2026-04-15", "meeting": "sync"}])
    _write_person(vault, "Bob Smith", relationship="colleague", org="phData",
                  encounters=[{"date": "2026-04-10", "meeting": "standup"}])
    reader = VaultReader(str(vault))
    index = reader.build_people_index()
    assert "Jane Doe" in index
    assert "Bob Smith" in index
    assert "client" in index.lower() or "Client" in index


def test_malformed_person_file_skipped(vault: Path) -> None:
    """Malformed files should be skipped, not crash the reader."""
    (vault / "people" / "bad.md").write_text("not valid frontmatter {{{{")
    _write_person(vault, "Good Person", relationship="colleague")
    reader = VaultReader(str(vault))
    people = reader.list_known_people()
    # Should still have the good person, bad file skipped
    assert len(people) >= 1
    assert "good person" in people
