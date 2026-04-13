# email-triage

A two-process encrypted email triage system deployed on a private VPS. The relay
process polls Gmail and Proton Mail via IMAP, GPG-encrypts each raw email entirely
in memory, and writes opaque `.gpg` files to a tmpfs queue directory. The triage
agent watches the queue, decrypts each file in memory, calls Claude (`claude-opus-4-6`)
with forced tool use for structured classification, and routes results via structured
logs and an optional HTTPS webhook.

Zero plaintext email data ever reaches disk.

---

## Architecture

**Layers:** domain → application → infrastructure → entrypoints (standard clean architecture)

**Processes:**

| Process | Command | Responsibility |
|---------|---------|----------------|
| `email-triage-relay` | `email-triage-relay --config relay.env` | Poll → Encrypt → Enqueue |
| `email-triage-agent` | `email-triage-agent --config agent.env` | Watch → Decrypt → Analyse → Route |

**Data flow:**

```
[Gmail IMAP]      ─┐
[Proton Bridge]   ─┤→ RawEmail (memory) → GPGEncryptor → .gpg (tmpfs queue)
                   │
                   └─── relay process (public key only)

tmpfs queue (/run/email-triage/queue)

.gpg file → GPGDecryptor → bytes (memory) → ClaudeTriageClient → TriageResult → route
                                                │
                                           agent process (private key)
```

**Design patterns:**
- **Strategy** — `EmailFetcher` protocol; `GmailFetcher` and `ProtonBridgeFetcher` are strategies
- **Adapter** — `GPGEncryptor`, `GPGDecryptor`, `ClaudeTriageClient` wrap external libraries
- **Repository-like** — `FileQueue` / `FileQueueReader` abstract queue file I/O

**Key architectural decisions:**
- Relay and agent run as separate system users (`email-relay`, `email-agent`) with separate GPG homes. The relay user has no read permission on the private key.
- `.gpg.processing` rename is atomic on POSIX (same filesystem). Crash recovery: agent startup sweeps and recovers any `.processing` files.
- Claude forced tool use (`tool_choice={"type": "tool"}`) guarantees structured output — no JSON parsing.
- inotify-based watchdog gives sub-second queue reaction latency.
- IMAP UID tracking in JSON state files prevents re-fetching on relay restart.

---

## How to Run

```bash
# Install dependencies
uv sync

# Run unit tests
uv run pytest tests/unit

# Run integration tests (requires GPG installed)
uv run pytest tests/integration -m integration

# Start the relay (development)
uv run email-triage-relay --config .env

# Start the agent (development)
uv run email-triage-agent --config .env
```

---

## Environment Variables

See `.env.example` for the full annotated list. Key variables:

```
RELAY__GMAIL_USERNAME                 # Gmail address
RELAY__GMAIL_APP_PASSWORD             # Gmail app password (not account password)
RELAY__PROTON_ENABLED                 # Set true to enable Proton Bridge source
RELAY__QUEUE_DIR                      # Path to tmpfs queue (must match AGENT__QUEUE_DIR)
RELAY__GPG_RECIPIENT_FINGERPRINT      # 40-char fingerprint to encrypt to

ANTHROPIC_API_KEY                     # Anthropic API key
AGENT__GPG_PRIVATE_KEY_PASSPHRASE_FILE # Path to passphrase file (0400 perms)
AGENT__WEBHOOK_URL                    # Optional: URL for CRITICAL/HIGH alerts
```

---

## VPS Setup

**tmpfs queue mount** (add to `/etc/fstab`):
```
tmpfs /run/email-triage/queue tmpfs uid=email-relay,gid=email-agent,mode=1770,size=256m 0 0
```
Mode `1770` = sticky + rwx owner/group, no world access.

**System users:**
```bash
useradd --system --no-create-home email-relay
useradd --system --no-create-home email-agent
```

**GPG key setup (relay side — public key only):**
```bash
gpg --homedir /var/lib/email-triage/relay/.gnupg --import agent_public_key.gpg
```

**GPG key setup (agent side — private key):**
```bash
gpg --homedir /var/lib/email-triage/agent/.gnupg --import agent_private_key.gpg
echo "YOUR_PASSPHRASE" > /etc/email-triage/agent-key.passphrase
chmod 0400 /etc/email-triage/agent-key.passphrase
```

**Systemd services:**
```bash
cp systemd/*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now email-triage-relay email-triage-agent
```

---

## Key Decisions & Constraints

- **Plaintext NEVER on disk.** tmpfs queue holds only `.gpg` ciphertext. Decryption result stays in process heap.
- **Relay has no private key.** A relay compromise cannot decrypt the queue backlog.
- **Claude forced tool use.** `tool_choice={"type": "tool", "name": "record_triage_result"}` makes the Pydantic schema the output contract.
- **Separate system users.** `email-relay` cannot read `email-agent`'s GPG home.
- **inotify not sleep polling.** `watchdog` library fires on `IN_CLOSE_WRITE`; no wasted CPU.
- **IMAP UIDs, not SEEN flags.** UIDs are tracked in JSON state files so the relay doesn't depend on server-side SEEN state (which could be modified externally).

---

## CI / CD

No dedicated CI file yet. When added, pipeline order:
`pre-commit → ruff → pyright → pytest tests/unit → pytest tests/integration`

Deploy target: private VPS via systemd services.

---

## Observability

- All logs are structured JSON via `structlog` to stdout (captured by journald).
- Key log events: `relay_poll_completed`, `triage_analysis_complete`, `triage_file_failed`, `triage_webhook_fired`.
- View live logs: `journalctl -u email-triage-relay -f` / `journalctl -u email-triage-agent -f`

---

## Standards Overrides

No overrides — workspace standards apply in full.
