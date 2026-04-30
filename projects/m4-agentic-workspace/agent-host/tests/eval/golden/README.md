# Golden Test Set — summary-sourced fixtures

Authored from Granola meeting summaries (transcripts unavailable on free tier).
`expected.json` adheres to the post-`synthesize.merge` schema.

## Schema

```
entities:      [{name, role, org, relationship:[colleague|client|vendor|partner|prospect|unknown], aliases:[], evidence}]
risks:         [{summary, severity:[low|medium|high], project, evidence}]
opportunities: [{name, type:[new_logo|expansion|lateral|workflow], account, value_hint, stage_hint, evidence}]
tasks:         [{action, owner, due_hint, commitment:[hard|soft|implied], blocks, evidence}]
dropped:       [{text, reason:[fact_not_task|duplicate|stoplist_entity|ungrounded|wrong_category]}]
```

`evidence` = verbatim quote (≤160 chars) from `summary.md`.
`due_hint` stays as the original relative phrase ("next week", "end of day") — NOT ISO dates.

## Cases

| Slug | Kind | Notes |
|---|---|---|
| `omar-grant-skill-first-2026-04-10` | 1:1 internal | Rook platform, skills-first productization |
| `phdata-precisely-leadership-2026-04-10` | external wrap | ARR agent delivery, 5-week MCP/Copilot sprint |
| `ml-practice-all-hands-2026-04-03` | all-hands | Q1/Q2 numbers, Anthropic + AWS partnerships |
| `trimble-internal-prep-2026-04-07` | internal prep | Tests name-disambiguation (Sergio, Kelly) and stoplist |
| `therapy-personal-2026-04-20` | edge / private | Expected: all arrays empty; scope=private |
| `empty-note-2026-04-20` | edge / empty | Expected: all arrays empty; scope=empty |

## Note on transcripts

Granola transcript endpoint is paid-tier-only. When transcripts become available,
add `transcript.md` to each slug and re-ground `evidence` quotes against verbatim
speech rather than summary bullets. Summary-grounded evidence is a temporary
approximation; the pipeline should still produce strong scores because its input
is the Granola summary + transcript concatenation, and the summary alone is what
we have here.

## Migration status

All cases in `../golden_evals.py` have been migrated to the canonical schema
(`summary`, `name`, `action`, `commitment`, `due_hint`, `dropped`, `role`, `org`, `aliases`, etc.)
as of Phase 5.
