---
name: add-person
description: Create or update a person note in the vault. Use when user says "add [name]" or "I met [name] today".
type: operation
---

# Add Person

1. Ask for the person's name if not given
2. Check if `vault/people/<slug>.md` already exists
   - If exists: show current content, ask what to update
3. Prompt for (one question at a time, all optional):
   - Job title / role
   - Company or organization
   - Relationship: client | colleague | stakeholder | vendor
   - How they met / context
   - Any rapport notes (interests, communication style, shared history)
4. Write or update `vault/people/<slug>.md` with frontmatter:
   ```yaml
   ---
   type: person
   created: <ISO datetime>
   updated: <ISO datetime>
   name: Full Name
   title: Job Title
   relationship: client
   ---
   ```
5. Append log entry and commit
6. Confirm: "[[<slug>]] saved to vault."
