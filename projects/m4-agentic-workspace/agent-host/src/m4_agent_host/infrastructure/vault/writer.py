from __future__ import annotations

import re
from datetime import UTC, date, datetime
from pathlib import Path

import frontmatter

from m4_agent_host.config import settings
from m4_agent_host.domain.models import Entity, Opportunity, Risk, Task


class VaultWriter:
    """Append-only filesystem writer for the markdown vault.

    Implements the merge rules defined in _system/CLAUDE.md:
    all writes are additive; existing content is never overwritten.
    """

    def __init__(self, vault_path: str = settings.vault_path) -> None:
        self.root = Path(vault_path)

    def write_raw_transcript(self, filename: str, content: str) -> Path:
        """Write transcript to inbox/meetings/. No-op if file exists (immutable)."""
        dest = self.root / "inbox" / "meetings" / filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            dest.write_text(content, encoding="utf-8")
        return dest

    def upsert_person(self, entity: Entity) -> None:
        """Create or update a person note. Appends new data, never overwrites."""
        slug = _slugify(entity.name)
        path = self.root / "people" / f"{slug}.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        now = datetime.now(UTC).isoformat()

        if path.exists():
            post = frontmatter.load(str(path))
            post.metadata["updated"] = now
            if entity.title:
                post.metadata["title"] = entity.title
            if entity.rapport_notes:
                additions = "\n".join(f"- {n}" for n in entity.rapport_notes)
                post.content = post.content + f"\n\n### Rapport ({now[:10]})\n{additions}"
        else:
            rapport = "\n".join(f"- {n}" for n in entity.rapport_notes)
            post = frontmatter.Post(
                content=f"## Notes\n\n## Rapport\n{rapport}",
                type="person",
                created=now,
                updated=now,
                name=entity.name,
                title=entity.title,
                relationship=entity.relationship,
            )
        path.write_text(frontmatter.dumps(post), encoding="utf-8")

    def append_risks(self, risks: list[Risk], meeting_slug: str) -> None:
        """Append risks to relevant project files."""
        for risk in risks:
            if risk.project_slug:
                project_path = self.root / "projects" / f"{risk.project_slug}.md"
                if project_path.exists():
                    existing = project_path.read_text(encoding="utf-8")
                    project_path.write_text(
                        existing + f"\n### Risk — {meeting_slug}\n"
                        f"- **[{risk.severity}]** {risk.description}\n",
                        encoding="utf-8",
                    )

    def append_opportunities(self, opportunities: list[Opportunity]) -> None:
        """Append opportunities to resources/opportunities.md."""
        if not opportunities:
            return
        path = self.root / "resources" / "opportunities.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        header = "# Opportunities\n\n" if not path.exists() else ""
        existing = path.read_text(encoding="utf-8") if path.exists() else ""
        additions = "\n".join(f"- [{opp.type}] {opp.description}" for opp in opportunities)
        path.write_text(header + existing + additions + "\n", encoding="utf-8")

    def append_tasks_to_daily(self, tasks: list[Task], for_date: date | None = None) -> None:
        """Append tasks to the daily journal note for for_date."""
        if not tasks:
            return
        target = for_date or datetime.now(UTC).date()
        path = self.root / "journal" / "daily" / f"{target.isoformat()}.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        header = f"# {target.isoformat()}\n\n" if not path.exists() else ""
        existing = path.read_text(encoding="utf-8") if path.exists() else ""
        lines = "\n".join(
            f"- [ ] {t.description}"
            + (f" (@{t.owner})" if t.owner else "")
            + (f" — {t.eta}" if t.eta else "")
            for t in tasks
        )
        path.write_text(header + existing + f"\n## Tasks\n{lines}\n", encoding="utf-8")

    def append_log(self, agent: str, action: str, target: str) -> None:
        """Append one structured line to _system/log.md."""
        path = self.root / "_system" / "log.md"
        ts = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
        with path.open("a", encoding="utf-8") as f:
            f.write(f"{ts} | {agent} | {action} | {target}\n")


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.strip().lower()).lstrip("-")
