from __future__ import annotations

import re
from datetime import UTC, date, datetime
from pathlib import Path

import frontmatter
import structlog
from openinference.semconv.trace import OpenInferenceSpanKindValues, SpanAttributes
from opentelemetry.trace import Status, StatusCode

from m4_agent_host.config import settings
from m4_agent_host.domain.models import Dropped, Entity, MeetingSynthesis, Opportunity, Risk, Task
from m4_agent_host.infrastructure.telemetry.tracer import tracer

log = structlog.get_logger(__name__)


class VaultWriter:
    """Append-only filesystem writer for the markdown vault.

    Implements the merge rules defined in _system/CLAUDE.md:
    all writes are additive; existing content is never overwritten.
    """

    def __init__(self, vault_path: str = settings.vault_path) -> None:
        self.root = Path(vault_path)

    def write_raw_transcript(self, filename: str, content: str) -> Path:
        """Write transcript to inbox/meetings/. No-op if file exists (immutable)."""
        with tracer.start_as_current_span("vault.write_raw_transcript") as span:
            span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.TOOL.value)
            span.set_attribute("vault.filename", filename)
            span.set_attribute("vault.content_chars", len(content))
            span.set_attribute(SpanAttributes.INPUT_VALUE, f"filename={filename} chars={len(content)}")
            dest = self.root / "inbox" / "meetings" / filename
            dest.parent.mkdir(parents=True, exist_ok=True)
            already_exists = dest.exists()
            if not already_exists:
                dest.write_text(content, encoding="utf-8")
            span.set_attribute("vault.skipped_existing", already_exists)
            span.set_attribute("vault.path", str(dest))
            span.set_attribute(SpanAttributes.OUTPUT_VALUE,
                f"{'skipped (exists)' if already_exists else 'written'} → inbox/meetings/{filename}")
            span.set_status(Status(StatusCode.OK))
            return dest

    def upsert_person(self, entity: Entity, meeting_slug: str | None = None, meeting_date: str | None = None) -> None:
        """Create or update a person note. Appends new data, never overwrites."""
        with tracer.start_as_current_span("vault.upsert_person") as span:
            span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.TOOL.value)
            span.set_attribute("vault.entity_name", entity.name)
            span.set_attribute("vault.entity_relationship", entity.relationship or "")
            span.set_attribute(SpanAttributes.INPUT_VALUE,
                f"name={entity.name} relationship={entity.relationship or 'unknown'}"
                + (f" title={entity.title}" if entity.title else ""))
            slug = _slugify(entity.name)
            path = self.root / "people" / f"{slug}.md"
            span.set_attribute("vault.path", str(path))
            path.parent.mkdir(parents=True, exist_ok=True)
            now = datetime.now(UTC).isoformat()
            is_update = path.exists()
            span.set_attribute("vault.is_update", is_update)
            span.set_attribute("vault.rapport_notes_count", len(entity.rapport_notes))
            span.set_attribute("vault.has_evidence_quote", bool(entity.evidence_quote))

            if is_update:
                post = frontmatter.load(str(path))
                post.metadata["updated"] = now
                if entity.title:
                    post.metadata["title"] = entity.title
                if entity.org:
                    post.metadata["org"] = entity.org
                # Append encounter
                encounters = post.metadata.get("encounters", [])
                if meeting_slug and not any(e.get("meeting") == meeting_slug for e in encounters):
                    encounters.append({"date": meeting_date or now[:10], "meeting": meeting_slug})
                    post.metadata["encounters"] = encounters
                if entity.rapport_notes:
                    additions = "\n".join(f"- {n}" for n in entity.rapport_notes)
                    post.content = post.content + f"\n\n### Rapport ({now[:10]})\n{additions}"
                if entity.evidence_quote:
                    source_ref = f'> Source: "{entity.evidence_quote}"'
                    if entity.source_line:
                        source_ref += f" (line {entity.source_line})"
                    post.content = post.content + f"\n{source_ref}"
            else:
                rapport = "\n".join(f"- {n}" for n in entity.rapport_notes)
                source_ref = ""
                if entity.evidence_quote:
                    source_ref = f'\n> Source: "{entity.evidence_quote}"'
                    if entity.source_line:
                        source_ref += f" (line {entity.source_line})"
                encounters_list = []
                if meeting_slug:
                    encounters_list.append({"date": meeting_date or now[:10], "meeting": meeting_slug})
                post = frontmatter.Post(
                    content=f"## Notes\n\n## Rapport\n{rapport}{source_ref}",
                    type="person",
                    created=now,
                    updated=now,
                    name=entity.name,
                    title=entity.title,
                    relationship=entity.relationship,
                    org=entity.org,
                    encounters=encounters_list,
                )
            path.write_text(frontmatter.dumps(post), encoding="utf-8")
            span.set_attribute(SpanAttributes.OUTPUT_VALUE,
                f"{'updated' if is_update else 'created'} → people/{slug}.md"
                + (f" (+{len(entity.rapport_notes)} rapport notes)" if entity.rapport_notes else ""))
            span.set_status(Status(StatusCode.OK))

    def _resolve_project_slug(self, candidate: str | None) -> tuple[Path | None, str]:
        """Resolve a project slug candidate to an existing project file.

        Modes: exact | alias_normalized | alias_substring | alias_frontmatter | unresolved.
        """
        if candidate is None:
            return None, "unresolved"

        project_dir = self.root / "projects"
        project_files = sorted(project_dir.glob("*.md"))
        if not project_files:
            return None, "unresolved"

        _norm = re.compile(r"[^a-z0-9]")

        # exact
        exact_path = project_dir / f"{candidate}.md"
        if exact_path.exists():
            return exact_path, "exact"

        # build normalised stem map
        norm_candidate = _norm.sub("", candidate.lower())
        stem_map: dict[str, Path] = {}
        for p in project_files:
            stem_map[_norm.sub("", p.stem.lower())] = p

        # alias_normalized
        if norm_candidate in stem_map:
            return stem_map[norm_candidate], "alias_normalized"

        # alias_substring (both sides must be ≥ 4 chars)
        if len(norm_candidate) >= 4:
            matches: list[tuple[str, Path]] = []
            for ns, p in stem_map.items():
                if len(ns) >= 4 and (norm_candidate in ns or ns in norm_candidate):
                    matches.append((ns, p))
            if matches:
                # pick shortest stem (most specific)
                matches.sort(key=lambda t: len(t[0]))
                return matches[0][1], "alias_substring"

        # alias_frontmatter
        for p in project_files:
            try:
                post = frontmatter.load(str(p))
                aliases = post.metadata.get("aliases", [])
                if isinstance(aliases, list):
                    for alias in aliases:
                        if _norm.sub("", str(alias).lower()) == norm_candidate:
                            return p, "alias_frontmatter"
            except Exception:
                log.debug("frontmatter_parse_error", path=str(p))

        return None, "unresolved"

    def append_risks(self, risks: list[Risk], meeting_slug: str) -> None:
        """Append risks to relevant project files, with fallback for unresolved."""
        with tracer.start_as_current_span("vault.append_risks") as span:
            span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.TOOL.value)
            span.set_attribute("vault.risk_count", len(risks))
            span.set_attribute("vault.meeting_slug", meeting_slug)
            span.set_attribute(SpanAttributes.INPUT_VALUE,
                f"meeting={meeting_slug} risks={len(risks)} "
                + " | ".join(f"[{r.severity}] {r.summary[:60]}" for r in risks[:3])
                + ("..." if len(risks) > 3 else ""))
            high = sum(1 for r in risks if r.severity == "high")
            medium = sum(1 for r in risks if r.severity == "medium")
            low = sum(1 for r in risks if r.severity == "low")
            span.set_attribute("vault.risk_high", high)
            span.set_attribute("vault.risk_medium", medium)
            span.set_attribute("vault.risk_low", low)
            written = 0
            fallback_lines: list[str] = []
            for risk in risks:
                resolved_path, mode = self._resolve_project_slug(risk.project)
                log.info(
                    "risk_routed",
                    project=risk.project,
                    resolved_to=resolved_path.stem if resolved_path else None,
                    mode=mode,
                    meeting_slug=meeting_slug,
                )
                if mode != "unresolved":
                    assert resolved_path is not None  # guaranteed by resolver
                    existing = resolved_path.read_text(encoding="utf-8")
                    resolved_path.write_text(
                        existing + f"\n### Risk — {meeting_slug}\n"
                        f"- **[{risk.severity}]** {risk.summary}\n",
                        encoding="utf-8",
                    )
                    written += 1
                else:
                    proj_label = risk.project or "unknown"
                    fallback_lines.append(
                        f"- [{risk.severity}] {risk.summary} "
                        f"(project: {proj_label}, meeting: {meeting_slug})"
                    )
            if fallback_lines:
                fb_path = self.root / "resources" / "risks.md"
                fb_path.parent.mkdir(parents=True, exist_ok=True)
                header = "# Risks\n\n" if not fb_path.exists() else ""
                existing = fb_path.read_text(encoding="utf-8") if fb_path.exists() else ""
                fb_path.write_text(
                    header + existing + "\n".join(fallback_lines) + "\n",
                    encoding="utf-8",
                )
            span.set_attribute("vault.risks_written", written)
            span.set_attribute("vault.risks_fallback", len(fallback_lines))
            span.set_attribute(SpanAttributes.OUTPUT_VALUE,
                f"wrote {written}/{len(risks)} risks to project files, "
                f"{len(fallback_lines)} to fallback (high={high} medium={medium} low={low})")
            span.set_status(Status(StatusCode.OK))

    def append_opportunities(self, opportunities: list[Opportunity]) -> None:
        """Append opportunities to resources/opportunities.md."""
        with tracer.start_as_current_span("vault.append_opportunities") as span:
            span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.TOOL.value)
            span.set_attribute("vault.opportunity_count", len(opportunities))
            span.set_attribute(SpanAttributes.INPUT_VALUE,
                f"opportunities={len(opportunities)} "
                + " | ".join(f"[{o.type}] {o.name[:60]}" for o in opportunities[:3])
                + ("..." if len(opportunities) > 3 else ""))
            if not opportunities:
                span.set_attribute(SpanAttributes.OUTPUT_VALUE, "no-op (empty list)")
                span.set_status(Status(StatusCode.OK))
                return
            path = self.root / "resources" / "opportunities.md"
            path.parent.mkdir(parents=True, exist_ok=True)
            span.set_attribute("vault.path", str(path))
            header = "# Opportunities\n\n" if not path.exists() else ""
            existing = path.read_text(encoding="utf-8") if path.exists() else ""
            additions = "\n".join(f"- [{opp.type}] {opp.name}" for opp in opportunities)
            path.write_text(header + existing + additions + "\n", encoding="utf-8")
            span.set_attribute(SpanAttributes.OUTPUT_VALUE,
                f"appended {len(opportunities)} opportunities → resources/opportunities.md")
            span.set_status(Status(StatusCode.OK))

    def append_tasks_to_daily(self, tasks: list[Task], for_date: date | None = None) -> None:
        """Append tasks to the daily journal note for for_date."""
        with tracer.start_as_current_span("vault.append_tasks_to_daily") as span:
            span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.TOOL.value)
            span.set_attribute("vault.task_count", len(tasks))
            span.set_attribute(SpanAttributes.INPUT_VALUE,
                f"tasks={len(tasks)} date={for_date or 'today'} "
                + " | ".join(
                    f"{t.action[:50]}" + (f" (@{t.owner})" if t.owner else "")
                    for t in tasks[:3]
                )
                + ("..." if len(tasks) > 3 else ""))
            if not tasks:
                span.set_attribute(SpanAttributes.OUTPUT_VALUE, "no-op (empty list)")
                span.set_status(Status(StatusCode.OK))
                return
            target = for_date or datetime.now(UTC).date()
            path = self.root / "journal" / "daily" / f"{target.isoformat()}.md"
            span.set_attribute("vault.path", str(path))
            span.set_attribute("vault.date", target.isoformat())
            span.set_attribute("vault.tasks_with_owner", sum(1 for t in tasks if t.owner))
            path.parent.mkdir(parents=True, exist_ok=True)
            header = f"# {target.isoformat()}\n\n" if not path.exists() else ""
            existing = path.read_text(encoding="utf-8") if path.exists() else ""
            lines = "\n".join(
                f"- [ ] {t.action}"
                + (f" (@{t.owner})" if t.owner else "")
                + (f" — {t.due_hint}" if t.due_hint else "")
                for t in tasks
            )
            path.write_text(header + existing + f"\n## Tasks\n{lines}\n", encoding="utf-8")
            span.set_attribute(SpanAttributes.OUTPUT_VALUE,
                f"appended {len(tasks)} tasks → journal/daily/{target.isoformat()}.md")
            span.set_status(Status(StatusCode.OK))

    def append_log(self, agent: str, action: str, target: str) -> None:
        """Append one structured line to _system/log.md."""
        path = self.root / "_system" / "log.md"
        ts = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
        with path.open("a", encoding="utf-8") as f:
            f.write(f"{ts} | {agent} | {action} | {target}\n")

    def append_dropped(self, dropped: list[Dropped]) -> None:
        """Append dropped items to _system/dropped.md for weekly review."""
        if not dropped:
            return
        path = self.root / "_system" / "dropped.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        header = "# Dropped\n\n" if not path.exists() else ""
        existing = path.read_text(encoding="utf-8") if path.exists() else ""
        lines = "\n".join(f"- [{d.reason}] {d.text}" for d in dropped)
        path.write_text(header + existing + lines + "\n", encoding="utf-8")

    def write_people_index(self) -> None:
        """Generate _system/people_index.md from all person pages."""
        people_dir = self.root / "people"
        if not people_dir.exists():
            return

        entries: list[dict] = []
        for p in sorted(people_dir.glob("*.md")):
            try:
                post = frontmatter.load(str(p))
                meta = post.metadata
                encounters = meta.get("encounters", [])
                entries.append({
                    "name": meta.get("name", p.stem),
                    "title": meta.get("title"),
                    "relationship": meta.get("relationship", "unknown"),
                    "org": meta.get("org"),
                    "encounter_count": len(encounters),
                    "last_seen": encounters[-1]["date"] if encounters else str(meta.get("updated", ""))[:10],
                })
            except Exception:
                log.debug("people_index_skip", path=str(p))

        if not entries:
            return

        # Group by relationship
        by_rel: dict[str, list[dict]] = {}
        for e in entries:
            by_rel.setdefault(e["relationship"], []).append(e)

        lines = [
            "# People Index",
            f"*Auto-generated. {len(entries)} people.*",
            "",
        ]
        for rel in sorted(by_rel.keys()):
            lines.append(f"## {rel.title()}")
            for e in sorted(by_rel[rel], key=lambda x: x["name"]):
                title_part = f" — {e['title']}" if e["title"] else ""
                org_part = f" ({e['org']})" if e["org"] else ""
                lines.append(
                    f"- {e['name']}{org_part}{title_part}, "
                    f"{e['encounter_count']} encounters, last {e['last_seen']}"
                )
            lines.append("")

        path = self.root / "_system" / "people_index.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("\n".join(lines), encoding="utf-8")

    def write_meeting_synthesis(
        self,
        slug: str,
        synthesis: MeetingSynthesis,
        for_date: date | None = None,
    ) -> None:
        """Write meeting synthesis with citations to vault.

        Creates vault/inbox/meetings/<slug>-synthesis.md.

        Args:
            slug: Meeting slug used as the filename stem.
            synthesis: MeetingSynthesis containing summary and citations.
            for_date: Optional meeting date for the front matter.
        """
        with tracer.start_as_current_span("vault.write_meeting_synthesis") as span:
            span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.TOOL.value)
            span.set_attribute("vault.slug", slug)
            span.set_attribute("vault.citation_count", len(synthesis.citations))
            span.set_attribute("vault.has_summary", bool(synthesis.meeting_summary))
            span.set_attribute("vault.summary_chars", len(synthesis.meeting_summary or ""))
            span.set_attribute(SpanAttributes.INPUT_VALUE,
                f"slug={slug} date={for_date} summary_chars={len(synthesis.meeting_summary or '')} "
                f"citations={len(synthesis.citations)}")
            date_str = for_date.isoformat() if for_date else "unknown-date"
            lines = [
                f"# Meeting Synthesis: {slug}",
                f"*Date: {date_str}*",
                "",
                "## Summary",
                "",
                synthesis.meeting_summary,
                "",
                "## Signal Evidence",
                "",
            ]
            for c in synthesis.citations:
                lines.append(f"**[{c.category}]** {c.signal}")
                if c.source_line:
                    lines.append(f"> [L{c.source_line}] {c.evidence}")
                else:
                    lines.append(f"> {c.evidence}")
                lines.append("")

            path = self.root / "inbox" / "meetings" / f"{slug}-synthesis.md"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("\n".join(lines))
            span.set_attribute("vault.path", str(path))
            span.set_attribute(SpanAttributes.OUTPUT_VALUE,
                f"written → inbox/meetings/{slug}-synthesis.md ({len(synthesis.citations)} citations)")
            span.set_status(Status(StatusCode.OK))


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.strip().lower()).lstrip("-")
