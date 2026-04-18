---
name: vault-health
description: Audit the vault for structural issues. Use when user asks "check vault" or before a weekly review.
type: operation
---

# Vault Health Check

Run each check and report findings. Offer to fix issues where possible.

1. **Broken wikilinks**
   - `rg -r "\[\[([^\]]+)\]\]" vault/ --only-matching -h | sort -u` → collect all link targets
   - For each target, check if `vault/**/<target>.md` exists
   - Report broken links with the file they appear in

2. **Missing frontmatter**
   - `rg -rL "^---" vault/projects/ vault/people/ vault/resources/` → files without frontmatter
   - Report each file

3. **Unprocessed inbox**
   - List files in `vault/inbox/meetings/` older than 24 hours
   - Report count and filenames

4. **Empty stubs**
   - Find files < 100 bytes in `vault/projects/` and `vault/people/`
   - Report as candidates to fill out

5. **Summary**: "Vault health: X broken links, Y missing frontmatter, Z unprocessed inbox items, W empty stubs."
   - Offer to fix broken links or missing frontmatter inline
