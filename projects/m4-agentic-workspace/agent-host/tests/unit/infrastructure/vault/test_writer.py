from __future__ import annotations
from datetime import date
from pathlib import Path
import pytest
from m4_agent_host.domain.models import Entity, Risk, Opportunity, Task
from m4_agent_host.infrastructure.vault.writer import VaultWriter, _slugify


@pytest.fixture()
def vault(tmp_path: Path) -> Path:
    for d in [
        "_system", "inbox/meetings", "journal/daily",
        "people", "projects", "resources",
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
