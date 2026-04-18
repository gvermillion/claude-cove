---
name: project-status
description: Generate a status summary for a named project. Use when user asks "status of X" or "how is X going".
type: operation
---

# Project Status

1. Ask for the project name if not given
2. Find the project file: `vault/projects/<slug>.md`
   - If not found, list `vault/projects/` and ask which is closest
3. Read the project file
4. Search `vault/_system/log.md` for the project slug (last 20 entries)
5. Search `vault/journal/daily/` for the last 5 daily notes that mention the project
6. Synthesize a status summary:
   - Current state (from project file)
   - Recent risks (from log + project file)
   - Open tasks (from daily notes)
   - Last activity date (from log)
7. Ask: "Would you like me to update the project file with today's status?"
