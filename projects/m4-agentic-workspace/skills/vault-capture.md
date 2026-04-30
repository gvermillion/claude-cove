---
name: vault-capture
description: Quick-capture a freeform note to vault inbox. Use when the user says "capture this", "note that", or "remember".
type: operation
---

# Vault Capture

Write the user's note to `projects/m4-agentic-workspace/vault/inbox/` with today's date prefix.

1. Ask: "What would you like to capture?" (if not already in the message)
2. Determine the best subfolder: `meetings/`, `voice/`, or generic `inbox/`
3. Write the file: `vault/inbox/YYYY-MM-DD-<slug>.md` with frontmatter:
   ```yaml
   ---
   type: note
   created: <ISO datetime>
   ---
   ```
4. Append a log entry to `vault/_system/log.md`:
   `<timestamp> | vault-capture | capture | <filename>`
5. Run: `git -C projects/m4-agentic-workspace/vault add -A && git -C projects/m4-agentic-workspace/vault commit -m "capture: <slug>"`
6. Confirm: "Captured to `inbox/<filename>`."
