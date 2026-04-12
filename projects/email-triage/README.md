# email-triage

Pull-based encrypted email triage system. Polls Gmail and Proton Mail, GPG-encrypts every email in memory, and uses Claude AI for structured inbox classification — zero plaintext ever hits disk.

## How it works

```
Gmail IMAP ──┐
             ├─→ [relay] fetch → encrypt → .gpg → tmpfs queue
Proton Bridge┘                                         │
                                                       ▼
                              [agent] decrypt → Claude analysis → route
```

Two systemd services, zero shared state beyond the queue directory.

## Prerequisites

- Python 3.12+
- `uv` package manager
- GPG installed (`gnupg`)
- Gmail App Password (Settings → Security → 2FA → App passwords)
- Proton Mail Bridge (optional) — `protonmail-bridge-cli`
- Anthropic API key

## Quick start

```bash
uv sync
cp .env.example .env
# Fill in your credentials in .env

# Terminal 1 — relay
uv run email-triage-relay --config .env

# Terminal 2 — agent
uv run email-triage-agent --config .env
```

## GPG setup

```bash
# Generate a key pair (or import existing)
gpg --gen-key

# Export public key for the relay
gpg --export --armor YOUR_FINGERPRINT > relay_public.gpg

# Relay: import public key only
gpg --homedir /path/to/relay/.gnupg --import relay_public.gpg

# Agent: import private key
gpg --homedir /path/to/agent/.gnupg --import your_private_key.gpg
echo "passphrase" > /etc/email-triage/agent-key.passphrase
chmod 0400 /etc/email-triage/agent-key.passphrase
```

## Running tests

```bash
# Unit tests (fast, no external deps)
uv run pytest tests/unit

# Integration tests (requires GPG)
uv run pytest tests/integration -m integration

# With coverage
uv run pytest tests/unit --cov --cov-fail-under=80
```

## Environment variables

See [`.env.example`](.env.example) for the full annotated list.

| Variable | Required | Description |
|----------|----------|-------------|
| `RELAY__GMAIL_USERNAME` | Yes (if Gmail enabled) | Gmail address |
| `RELAY__GMAIL_APP_PASSWORD` | Yes (if Gmail enabled) | App password from Google |
| `RELAY__GPG_RECIPIENT_FINGERPRINT` | Yes | 40-char GPG fingerprint |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `AGENT__GPG_PRIVATE_KEY_PASSPHRASE_FILE` | Yes | Path to passphrase file (0400) |
| `AGENT__WEBHOOK_URL` | No | HTTPS webhook for CRITICAL/HIGH alerts |

## Production deployment

See [`CLAUDE.md`](CLAUDE.md) for VPS setup instructions, systemd service files in [`systemd/`](systemd/), and security hardening details.
