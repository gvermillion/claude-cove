# Telegram Triage Bot

Telegram bot providing mobile access to the AI correspondence agent during
the v0 proof-of-value period. The bot triages Gmail inboxes via MCP servers,
presents classified email drafts for review, and sends approved replies after
TOTP verification.

## Architecture

```
handlers.py          ← Telegram command/callback handlers (TOTP gate, session routing)
    ↓
triage_agent.py      ← Anthropic API + manual agentic loop (triage, draft, send)
    ↓
gmail_client.py      ← Gmail MCP subprocess context manager (one per operation)
    ↓
npx @gongrzhe/server-gmail-autoauth-mcp  ← per-account OAuth sessions
```

**Pattern:** Handler → Use-case (triage_agent) → Infrastructure (gmail_client/MCP).
No circular imports. Settings injected via functools.partial — no globals.

Key design decisions:
- **Manual agentic loop** in `run_triage` uses a custom `submit_triage_results` tool
  so Claude returns structured TriageItem data rather than free text.
- **Short-lived MCP sessions** — subprocess opened per operation, closed immediately.
  Install globally (`npm install -g @gongrzhe/server-gmail-autoauth-mcp`) to eliminate
  npx cold-start latency.
- **In-memory session store** — lost on restart. Owner must re-run `/triage`.
- **TOTP grace period** — 20-minute window after verification before requiring re-auth.

## How to Run

```bash
# Install dependencies
uv sync

# Copy and fill in env vars
cp .env.example .env

# Generate TOTP secret (run once, add to Proton Pass)
python -c "import pyotp; print(pyotp.random_base32())"

# Authenticate Gmail MCP servers (one-time per account)
npm install -g @gongrzhe/server-gmail-autoauth-mcp
mkdir -p ~/.gmail-mcp/{phdata,pgmc,multdems,personal}
cp /path/to/gcp-oauth.keys.json ~/.gmail-mcp/phdata/
cp /path/to/gcp-oauth.keys.json ~/.gmail-mcp/pgmc/
cp /path/to/gcp-oauth.keys.json ~/.gmail-mcp/multdems/
cp /path/to/gcp-oauth.keys.json ~/.gmail-mcp/personal/
cd ~/.gmail-mcp/phdata && GMAIL_CREDENTIALS_PATH=. npx @gongrzhe/server-gmail-autoauth-mcp auth
# ... repeat for each account

# Run the bot
uv run python -m telegram_triage_bot

# Run tests
uv run pytest tests/unit
```

## Environment Variables

```
TELEGRAM_BOT_TOKEN     # from @BotFather
OWNER_CHAT_ID          # your numeric Telegram user ID (get from @userinfobot)
ANTHROPIC_API_KEY      # sk-ant-...
ANTHROPIC_MODEL        # default: claude-opus-4-6
TOTP_SECRET            # base32 TOTP secret (generate with pyotp.random_base32())
TOTP_GRACE_MINUTES     # default: 20
GMAIL_MCP_CREDENTIALS_BASE  # default: ~/.gmail-mcp
LOG_LEVEL              # default: INFO
```

## Key Decisions & Constraints

- **Single-user only.** OWNER_CHAT_ID guards every handler. Non-owner messages
  are silently dropped.
- **No database.** Session state lives in a dict in memory. This is intentional
  for v0.5 — persistence adds complexity that isn't warranted until v1.
- **TOTP not PIN.** More secure than a static PIN for a production mobile workflow.
  The grace period prevents friction on high-volume triage sessions.
- **npx subprocess per operation** trades latency for simplicity. With global npm
  install the overhead is ~1 second per MCP open, which is acceptable.
- **claude-opus-4-6** is used for all operations. Triage quality matters more than
  cost at this validation stage; downgrade to sonnet in v1 if cost is an issue.

## CI / CD

No CI pipeline for this project yet — it's a v0.5 proof of concept.
Run `uv run pytest tests/unit` locally before committing.

## Observability

Logs to stdout via structlog. In development (TTY detected), uses ConsoleRenderer.
In production (no TTY, e.g. systemd), outputs JSON lines.

Key log events:
- `triage_starting` / `triage_complete` — per triage run
- `draft_complete` — per draft generated
- `send_succeeded` / `send_failed` — per send attempt
- `totp_verified` / `totp_invalid` — TOTP verification outcomes
- `unauthorized_interaction` — non-owner message attempts

## Standards Overrides

- No CI pipeline (v0.5 prototype — not warranted yet).
- No integration tests (require live Gmail OAuth credentials).
- pyright strict mode deferred — some `Any` types from MCP SDK internals.
