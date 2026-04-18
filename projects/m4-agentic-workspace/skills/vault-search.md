---
name: vault-search
description: Semantic search across the vault. Use when user says "find", "search", or "what do I have on X".
type: operation
---

# Vault Search

Search vault markdown files for the user's query using ripgrep, then synthesize results.

1. Run: `rg -r -l --type md "<query>" projects/m4-agentic-workspace/vault/ --glob '!private/'`
   (exclude private/ from cross-session searches unless user explicitly asks)
2. For each matching file, read the relevant section
3. Synthesize a brief answer citing the source files as markdown links
4. If no results: suggest broadening the query or checking `vault/inbox/` for unprocessed items
