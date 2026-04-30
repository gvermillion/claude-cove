---
name: weekly-review
description: Synthesize the week's activity into a weekly journal note. Use on Fridays or when user says "weekly review".
type: operation
---

# Weekly Review

1. Determine the ISO week: `date +"%Y-W%V"`
2. Read all daily notes from this week: `vault/journal/daily/YYYY-MM-DD.md` for Mon–today
3. Read `vault/_system/log.md` — filter to this week's entries
4. Synthesize a weekly note covering:
   - Meetings held (from inbox/meetings/ filenames this week)
   - Tasks completed vs. open
   - Risks that emerged
   - Opportunities identified
   - People engaged
5. Write to `vault/journal/weekly/<YYYY-Www>.md` with frontmatter `type: weekly`
6. Commit: `git -C vault commit -m "journal(weekly): <YYYY-Www>"`
7. Ask: "Want me to highlight anything for the monthly review?"
