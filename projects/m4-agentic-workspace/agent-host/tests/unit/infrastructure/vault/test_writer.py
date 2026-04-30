from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

import frontmatter

from m4_agent_host.domain.models import Dropped, Entity, Opportunity, Risk, Task
from m4_agent_host.infrastructure.vault.writer import VaultWriter, _slugify


@pytest.fixture()
def vault(tmp_path: Path) -> Path:
    for d in [
        "_system",
        "inbox/meetings",
        "journal/daily",
        "people",
        "projects",
        "resources",
    ]:
        (tmp_path / d).mkdir(parents=True)
    (tmp_path / "_system" / "log.md").write_text("")
    return tmp_path


def test_write_raw_transcript_creates_file(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    path = writer.write_raw_transcript("2024-01-15-standup.md", "# Standup\nContent here")
    assert path.exists()
    assert path.read_text() == "# Standup\nContent here"


def test_write_raw_transcript_is_idempotent(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    writer.write_raw_transcript("test.md", "original")
    writer.write_raw_transcript("test.md", "original")  # should not raise
    assert (vault / "inbox" / "meetings" / "test.md").read_text() == "original"


def test_upsert_person_creates_stub(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    entity = Entity(name="Jane Doe", title="VP Engineering", relationship="client")
    writer.upsert_person(entity)
    path = vault / "people" / "jane-doe.md"
    assert path.exists()
    content = path.read_text()
    assert "Jane Doe" in content
    assert "VP Engineering" in content


def test_upsert_person_appends_rapport_notes(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    entity = Entity(name="Bob Smith", rapport_notes=["Likes hiking", "Dog owner"])
    writer.upsert_person(entity)
    content = (vault / "people" / "bob-smith.md").read_text()
    assert "Likes hiking" in content
    assert "Dog owner" in content


def test_append_tasks_to_daily_creates_file(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    tasks = [Task(description="Send proposal", owner="Alice", eta="2024-01-16")]
    writer.append_tasks_to_daily(tasks, for_date=date(2024, 1, 15))
    path = vault / "journal" / "daily" / "2024-01-15.md"
    assert path.exists()
    content = path.read_text()
    assert "Send proposal" in content
    assert "@Alice" in content


def test_append_log_writes_structured_line(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    writer.append_log("entity_agent", "upsert_person", "Jane Doe")
    log = (vault / "_system" / "log.md").read_text()
    assert "entity_agent" in log
    assert "upsert_person" in log
    assert "Jane Doe" in log


def test_slugify_lowercases_and_replaces_spaces() -> None:
    assert _slugify("Jane Doe") == "jane-doe"
    assert _slugify("Acme Corp.") == "acme-corp-"
    assert _slugify("  Test  ") == "test"


def test_upsert_person_updates_existing_title(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    entity1 = Entity(name="Jane Doe", title="Manager")
    writer.upsert_person(entity1)

    entity2 = Entity(name="Jane Doe", title="Senior Manager")
    writer.upsert_person(entity2)

    content = (vault / "people" / "jane-doe.md").read_text()
    assert "Senior Manager" in content
    assert content.count("Jane Doe") >= 1  # Title line + metadata


def test_append_risks_skips_without_project_slug(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    risks = [Risk(description="Budget issue", severity="high")]
    writer.append_risks(risks, "meeting-slug")
    # With no project, risk falls back to resources/risks.md
    fb = vault / "resources" / "risks.md"
    assert fb.exists()
    content = fb.read_text()
    assert "Budget issue" in content
    assert "project: unknown" in content


def test_append_opportunities_creates_file_with_header(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    opps = [
        Opportunity(description="Expand to EU market", type="expansion"),
        Opportunity(description="Automate QA", type="workflow"),
    ]
    writer.append_opportunities(opps)
    path = vault / "resources" / "opportunities.md"
    assert path.exists()
    content = path.read_text()
    assert "# Opportunities" in content
    assert "Expand to EU market" in content
    assert "[expansion]" in content
    assert "[workflow]" in content


# ── Phase 1-F: resolver + fallback + dropped sink ──


def test_append_risks_exact_match(vault: Path) -> None:
    (vault / "projects" / "foo.md").write_text("# Foo\n")
    writer = VaultWriter(vault_path=str(vault))
    risks = [Risk(summary="Deadline slip", severity="high", project="foo")]
    writer.append_risks(risks, "standup-0421")
    content = (vault / "projects" / "foo.md").read_text()
    assert "Deadline slip" in content
    assert "standup-0421" in content
    assert not (vault / "resources" / "risks.md").exists()


def test_append_risks_normalized_alias(vault: Path) -> None:
    (vault / "projects" / "precisely-arr.md").write_text("# Precisely ARR\n")
    writer = VaultWriter(vault_path=str(vault))
    risks = [Risk(summary="Revenue dip", severity="medium", project="Precisely_ARR")]
    writer.append_risks(risks, "weekly-sync")
    content = (vault / "projects" / "precisely-arr.md").read_text()
    assert "Revenue dip" in content


def test_append_risks_substring_alias(vault: Path) -> None:
    (vault / "projects" / "nikke-backfill.md").write_text("# Nikke Backfill\n")
    writer = VaultWriter(vault_path=str(vault))
    risks = [Risk(summary="Data gap", severity="low", project="nikke")]
    writer.append_risks(risks, "retro")
    content = (vault / "projects" / "nikke-backfill.md").read_text()
    assert "Data gap" in content


def test_append_risks_frontmatter_alias(vault: Path) -> None:
    post = frontmatter.Post("# Stride\n", aliases=["stride-inc"])
    (vault / "projects" / "stride.md").write_text(frontmatter.dumps(post))
    writer = VaultWriter(vault_path=str(vault))
    risks = [Risk(summary="Churn risk", severity="high", project="stride-inc")]
    writer.append_risks(risks, "qbr")
    content = (vault / "projects" / "stride.md").read_text()
    assert "Churn risk" in content


def test_append_risks_falls_back_when_unresolved(vault: Path) -> None:
    # no project files match
    (vault / "projects" / "other.md").write_text("# Other\n")
    writer = VaultWriter(vault_path=str(vault))
    risks = [Risk(summary="No match risk", severity="medium", project="zzz-nonexistent")]
    writer.append_risks(risks, "daily")
    fb = vault / "resources" / "risks.md"
    assert fb.exists()
    content = fb.read_text()
    assert "# Risks" in content
    assert "No match risk" in content
    assert "project: zzz-nonexistent" in content
    # original project file untouched
    assert "No match risk" not in (vault / "projects" / "other.md").read_text()


def test_append_risks_falls_back_when_project_none(vault: Path) -> None:
    (vault / "projects" / "alpha.md").write_text("# Alpha\n")
    writer = VaultWriter(vault_path=str(vault))
    risks = [Risk(summary="Orphan risk", severity="low", project=None)]
    writer.append_risks(risks, "sync")
    fb = vault / "resources" / "risks.md"
    assert fb.exists()
    content = fb.read_text()
    assert "Orphan risk" in content
    assert "project: unknown" in content


def test_append_dropped_creates_file_with_header(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    dropped = [
        Dropped(text="Random fact about weather", reason="fact_not_task"),
        Dropped(text="Already captured elsewhere", reason="duplicate"),
    ]
    writer.append_dropped(dropped)
    path = vault / "_system" / "dropped.md"
    assert path.exists()
    content = path.read_text()
    assert "# Dropped" in content
    assert "[fact_not_task] Random fact about weather" in content
    assert "[duplicate] Already captured elsewhere" in content


def test_append_dropped_is_noop_when_empty(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    writer.append_dropped([])
    assert not (vault / "_system" / "dropped.md").exists()


def test_upsert_person_writes_encounter_history(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    entity = Entity(name="Jane Doe", title="VP", relationship="client", org="Acme")
    writer.upsert_person(entity, meeting_slug="standup-0421", meeting_date="2026-04-21")
    path = vault / "people" / "jane-doe.md"
    post = frontmatter.load(str(path))
    encounters = post.metadata.get("encounters", [])
    assert len(encounters) == 1
    assert encounters[0]["meeting"] == "standup-0421"
    assert encounters[0]["date"] == "2026-04-21"


def test_upsert_person_appends_encounter_no_duplicate(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    entity = Entity(name="Jane Doe", title="VP", relationship="client")
    writer.upsert_person(entity, meeting_slug="standup-1", meeting_date="2026-04-01")
    writer.upsert_person(entity, meeting_slug="standup-2", meeting_date="2026-04-08")
    writer.upsert_person(entity, meeting_slug="standup-2", meeting_date="2026-04-08")  # duplicate
    post = frontmatter.load(str(vault / "people" / "jane-doe.md"))
    encounters = post.metadata.get("encounters", [])
    assert len(encounters) == 2  # no duplicate


def test_upsert_person_writes_org(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    entity = Entity(name="Jane Doe", org="Acme Corp")
    writer.upsert_person(entity)
    post = frontmatter.load(str(vault / "people" / "jane-doe.md"))
    assert post.metadata.get("org") == "Acme Corp"


def test_write_people_index_creates_file(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    entity1 = Entity(name="Jane Doe", title="VP", relationship="client", org="Acme")
    entity2 = Entity(name="Bob Smith", relationship="colleague", org="phData")
    writer.upsert_person(entity1, meeting_slug="sync", meeting_date="2026-04-15")
    writer.upsert_person(entity2, meeting_slug="standup", meeting_date="2026-04-10")
    writer.write_people_index()
    path = vault / "_system" / "people_index.md"
    assert path.exists()
    content = path.read_text()
    assert "People Index" in content
    assert "Jane Doe" in content
    assert "Bob Smith" in content


def test_write_people_index_noop_when_no_people(vault: Path) -> None:
    writer = VaultWriter(vault_path=str(vault))
    writer.write_people_index()
    assert not (vault / "_system" / "people_index.md").exists()
