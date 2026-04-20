from __future__ import annotations

import re
from datetime import UTC, date, datetime
from pathlib import Path

import frontmatter
from openinference.semconv.trace import OpenInferenceSpanKindValues, SpanAttributes
from opentelemetry.trace import Status, StatusCode

from m4_agent_host.config import settings
from m4_agent_host.domain.models import Entity, MeetingSynthesis, Opportunity, Risk, Task
from m4_agent_host.infrastructure.telemetry.tracer import tracer


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

    def upsert_person(self, entity: Entity) -> None:
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
                post = frontmatter.Post(
                    content=f"## Notes\n\n## Rapport\n{rapport}{source_ref}",
                    type="person",
                    created=now,
                    updated=now,
                    name=entity.name,
                    title=entity.title,
                    relationship=entity.relationship,
                )
            path.write_text(frontmatter.dumps(post), encoding="utf-8")
            span.set_attribute(SpanAttributes.OUTPUT_VALUE,
                f"{'updated' if is_update else 'created'} → people/{slug}.md"
                + (f" (+{len(entity.rapport_notes)} rapport notes)" if entity.rapport_notes else ""))
            span.set_status(Status(StatusCode.OK))

    def append_risks(self, risks: list[Risk], meeting_slug: str) -> None:
        """Append risks to relevant project files."""
        with tracer.start_as_current_span("vault.append_risks") as span:
            span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.TOOL.value)
            span.set_attribute("vault.risk_count", len(risks))
            span.set_attribute("vault.meeting_slug", meeting_slug)
            span.set_attribute(SpanAttributes.INPUT_VALUE,
                f"meeting={meeting_slug} risks={len(risks)} "
                + " | ".join(f"[{r.severity}] {r.description[:60]}" for r in risks[:3])
                + ("..." if len(risks) > 3 else ""))
            high = sum(1 for r in risks if r.severity == "high")
            medium = sum(1 for r in risks if r.severity == "medium")
            low = sum(1 for r in risks if r.severity == "low")
            span.set_attribute("vault.risk_high", high)
            span.set_attribute("vault.risk_medium", medium)
            span.set_attribute("vault.risk_low", low)
            written = 0
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
                        written += 1
            span.set_attribute("vault.risks_written", written)
            span.set_attribute(SpanAttributes.OUTPUT_VALUE,
                f"wrote {written}/{len(risks)} risks to project files (high={high} medium={medium} low={low})")
            span.set_status(Status(StatusCode.OK))

    def append_opportunities(self, opportunities: list[Opportunity]) -> None:
        """Append opportunities to resources/opportunities.md."""
        with tracer.start_as_current_span("vault.append_opportunities") as span:
            span.set_attribute(SpanAttributes.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKindValues.TOOL.value)
            span.set_attribute("vault.opportunity_count", len(opportunities))
            span.set_attribute(SpanAttributes.INPUT_VALUE,
                f"opportunities={len(opportunities)} "
                + " | ".join(f"[{o.type}] {o.description[:60]}" for o in opportunities[:3])
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
            additions = "\n".join(f"- [{opp.type}] {opp.description}" for opp in opportunities)
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
                    f"{t.description[:50]}" + (f" (@{t.owner})" if t.owner else "")
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
                f"- [ ] {t.description}"
                + (f" (@{t.owner})" if t.owner else "")
                + (f" — {t.eta}" if t.eta else "")
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
