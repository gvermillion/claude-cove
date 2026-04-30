from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import frontmatter
import structlog

from m4_agent_host.infrastructure.vault.writer import _slugify

log = structlog.get_logger(__name__)


@dataclass
class PersonContext:
    """Read model for a person page in the vault."""

    name: str
    title: str | None = None
    relationship: str | None = None
    org: str | None = None
    email: str | None = None
    last_seen: str | None = None
    first_seen: str | None = None
    encounter_count: int = 0
    rapport_summary: str = ""


class VaultReader:
    """Read-only accessor for vault state during ingest."""

    def __init__(self, vault_path: str) -> None:
        self.root = Path(vault_path)

    def list_known_people(self) -> dict[str, PersonContext]:
        """Scan people/*.md, parse frontmatter, return {lowercase_name: PersonContext}."""
        people_dir = self.root / "people"
        if not people_dir.is_dir():
            return {}

        result: dict[str, PersonContext] = {}
        for md_path in sorted(people_dir.glob("*.md")):
            try:
                ctx = self._parse_person_file(md_path)
                if ctx is not None:
                    result[ctx.name.lower()] = ctx
            except Exception:
                log.warning("person_file_parse_error", path=str(md_path), exc_info=True)
        return result

    def get_person(self, name: str) -> PersonContext | None:
        """Look up a single person by slugified name."""
        slug = _slugify(name)
        path = self.root / "people" / f"{slug}.md"
        if not path.exists():
            return None
        try:
            return self._parse_person_file(path)
        except Exception:
            log.warning("person_file_parse_error", path=str(path), exc_info=True)
            return None

    def build_people_index(self) -> str:
        """Generate a compact markdown summary of all known people for LLM context injection."""
        people = self.list_known_people()
        if not people:
            return ""

        grouped: dict[str, list[PersonContext]] = {}
        for ctx in people.values():
            key = ctx.relationship or "unknown"
            grouped.setdefault(key, []).append(ctx)

        lines: list[str] = []
        for relationship in sorted(grouped):
            lines.append(f"### {relationship}")
            for ctx in sorted(grouped[relationship], key=lambda c: c.name):
                parts = [ctx.name]
                qualifiers: list[str] = []
                if ctx.title:
                    qualifiers.append(ctx.title)
                if ctx.org:
                    qualifiers.append(ctx.org)
                if qualifiers:
                    parts[0] += f" ({', '.join(qualifiers)})"
                detail: list[str] = []
                if ctx.last_seen:
                    detail.append(f"last seen {ctx.last_seen[:10]}")
                if ctx.encounter_count:
                    detail.append(f"{ctx.encounter_count} encounters")
                suffix = f" — {', '.join(detail)}" if detail else ""
                lines.append(f"- {parts[0]}{suffix}")
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    _RAPPORT_HEADING_RE = re.compile(r"^###\s+Rapport\b", re.IGNORECASE)

    def _parse_person_file(self, path: Path) -> PersonContext | None:
        """Parse a single person markdown file into a PersonContext."""
        post = frontmatter.load(str(path))
        meta = post.metadata

        name = meta.get("name")
        if not name:
            log.debug("person_file_missing_name", path=str(path))
            return None

        encounters = meta.get("encounters", [])
        encounter_count = len(encounters) if isinstance(encounters, list) else 0

        rapport_summary = self._extract_rapport_summary(post.content)

        return PersonContext(
            name=name,
            title=meta.get("title"),
            relationship=meta.get("relationship"),
            org=meta.get("org"),
            email=meta.get("email"),
            last_seen=meta.get("updated"),
            first_seen=meta.get("created"),
            encounter_count=encounter_count,
            rapport_summary=rapport_summary,
        )

    def _extract_rapport_summary(self, content: str) -> str:
        """Extract the last 3 rapport sections' bullet points, concatenated with '; '."""
        sections: list[str] = []
        current_bullets: list[str] = []
        in_rapport = False

        for line in content.splitlines():
            if self._RAPPORT_HEADING_RE.match(line):
                if in_rapport and current_bullets:
                    sections.append(", ".join(current_bullets))
                current_bullets = []
                in_rapport = True
                continue

            if in_rapport:
                # Another heading ends the current rapport section
                if line.startswith("#"):
                    if current_bullets:
                        sections.append(", ".join(current_bullets))
                    current_bullets = []
                    in_rapport = False
                    continue
                stripped = line.strip()
                if stripped.startswith("- "):
                    current_bullets.append(stripped[2:])

        # Flush last section
        if in_rapport and current_bullets:
            sections.append(", ".join(current_bullets))

        # Take last 3 sections
        return "; ".join(sections[-3:])
