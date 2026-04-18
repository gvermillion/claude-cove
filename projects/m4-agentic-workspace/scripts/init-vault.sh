#!/usr/bin/env bash
set -euo pipefail

VAULT_DIR="$(cd "$(dirname "$0")/.." && pwd)/vault"

echo "Initializing vault at $VAULT_DIR..."

# Create all directories
dirs=(
  "_system"
  "journal/daily" "journal/weekly" "journal/monthly"
  "projects" "areas" "people" "resources"
  "inbox/meetings" "inbox/voice" "inbox/email"
  "library/web" "library/pdf" "library/video" "library/audio" "library/misc"
  "private/journal" "private/projects" "private/people" "private/notes"
)
for d in "${dirs[@]}"; do
  mkdir -p "$VAULT_DIR/$d"
done

# Initialize git if not already
if [ ! -d "$VAULT_DIR/.git" ]; then
  git -C "$VAULT_DIR" init
  git -C "$VAULT_DIR" config user.name "agentic-workspace"
  git -C "$VAULT_DIR" config user.email "agents@local"
fi

# Configure git-crypt for private/
if command -v git-crypt &>/dev/null; then
  if [ ! -f "$VAULT_DIR/.git-crypt/keys/default" ]; then
    git -C "$VAULT_DIR" crypt init
    echo "private/** filter=git-crypt diff=git-crypt" >> "$VAULT_DIR/.gitattributes"
    echo "*.gpg filter=git-crypt diff=git-crypt" >> "$VAULT_DIR/.gitattributes"
    echo "git-crypt initialized. Run 'git-crypt add-gpg-user <KEY_ID>' to add your GPG key."
  fi
else
  echo "WARNING: git-crypt not found. Install it to encrypt private/. Skipping."
fi

# Write seed files if they don't exist
[ -f "$VAULT_DIR/_system/log.md" ] || echo "# Agent Action Log

| Timestamp | Agent | Action | Target |
|---|---|---|---|
" > "$VAULT_DIR/_system/log.md"

[ -f "$VAULT_DIR/_system/index.md" ] || echo "# Dashboard

_Updated by agents. Edit manually to set priorities._

## Active Projects

## This Week's Focus

## Recent Risks

## Open Tasks
" > "$VAULT_DIR/_system/index.md"

# Initial commit
git -C "$VAULT_DIR" add -A
git -C "$VAULT_DIR" commit -m "chore(vault): initialize structure" --allow-empty

echo "Vault initialized at $VAULT_DIR"
