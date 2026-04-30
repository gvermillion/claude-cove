# obsidian-mcp

A TypeScript MCP (Model Context Protocol) server that exposes an Obsidian vault over
HTTPS using SSE transport. Remote LLM clients (Claude Desktop, ChatGPT, Gemini) connect
to `https://mcp.vermillion.pro/sse` and can read, write, search, and navigate vault
notes through a set of typed MCP tools.

The server reads and writes markdown files directly on the VPS filesystem — no Obsidian
app or REST API plugin is required. Vault sync between devices is handled by Syncthing.

---

## Architecture

```
Remote LLM client
      │  HTTPS (SSE + POST)
      ▼
Nginx (mcp.vermillion.pro, TLS termination)
      │  HTTP proxy
      ▼
Express HTTP server (src/server.ts)
  ├── GET /health        → liveness check
  ├── GET /sse           → Bearer auth → SSEServerTransport → McpServer
  └── POST /messages     → Bearer auth → SSEServerTransport.handlePostMessage
          │
          ▼
      McpServer (@modelcontextprotocol/sdk)
      ├── read_note / list_folder / get_daily_note
      ├── create_note / update_note / append_to_note
      └── search_vault / get_backlinks / get_tags / get_notes_by_tag
          │
          ▼
      Vault functions (src/vault/)
      ├── reader.ts   — fs/promises reads + gray-matter frontmatter parsing
      ├── writer.ts   — atomic writes, directory creation, daily note template
      ├── search.ts   — ripgrep child_process with Node.js fallback
      └── graph.ts    — wikilink scanning, backlinks index, tag aggregation
```

**Design patterns in use:**
- **Strategy** — `searchVault` transparently switches between ripgrep and Node.js fallback.
- **Adapter** — `SSEServerTransport` adapts the MCP JSON-RPC protocol to Express/HTTP.
- **Repository** — vault functions abstract raw filesystem access from tool handlers.

**SSE transport rationale:** The MCP SDK's stdio transport works only for local processes.
Remote clients require SSE (or WebSocket) transport. SSE is simpler to deploy behind Nginx
and natively supported by all target client platforms.

---

## How to Run

```bash
# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.example .env
$EDITOR .env

# Development mode (watch + hot reload via tsx)
pnpm dev

# Production build
pnpm build
pnpm start

# Type check
pnpm typecheck

# Lint
pnpm lint

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

---

## Environment Variables

```
VAULT_PATH     Absolute path to the Obsidian vault directory on the filesystem.
               In Docker, the host vault is mounted at /vault — set this to /vault.

MCP_API_KEY    Bearer token that clients must send in the Authorization header.
               Minimum 16 characters. Generate with: openssl rand -hex 32

PORT           TCP port for the HTTP server. Defaults to 3000.

NODE_ENV       Runtime environment: development | production | test.
               Controls log verbosity. Defaults to production.
```

---

## VPS Deployment

**Prerequisites:** Docker, Docker Compose, Certbot (for Let's Encrypt TLS).

```bash
# 1. SSH into the VPS
ssh ubuntu@mcp.vermillion.pro

# 2. Clone the repo (or copy files)
git clone <repo-url> ~/obsidian-mcp
cd ~/obsidian-mcp/projects/obsidian-mcp

# 3. Set up environment
cp .env.example .env
nano .env   # Fill in VAULT_PATH, MCP_API_KEY

# 4. Obtain TLS certificate (first time only)
sudo certbot certonly --standalone -d mcp.vermillion.pro

# 5. Start services
docker compose up -d

# 6. Verify health
curl https://mcp.vermillion.pro/health
```

**Vault sync with Syncthing:**

Syncthing runs on both your local machine and the VPS, keeping the vault directory
(`VAULT_PATH`) in sync bidirectionally. The MCP server reads/writes files directly in
this synced directory — changes made through MCP tools appear on all synced devices
within seconds.

```bash
# Install Syncthing on VPS
sudo apt install syncthing

# Start and enable Syncthing
sudo systemctl enable --now syncthing@ubuntu

# Add the VPS as a device in your local Syncthing GUI and share the vault folder
# VPS Syncthing UI: http://<vps-ip>:8384 (tunnel via SSH first)
ssh -L 8384:localhost:8384 ubuntu@mcp.vermillion.pro
```

---

## Key Decisions & Constraints

- **Direct filesystem access over REST API:** Avoids dependency on the Obsidian Local REST
  API plugin, which requires the Obsidian app to be running. The VPS vault is a plain
  directory of markdown files that the server owns directly.

- **SSE transport (not stdio):** The MCP SDK's stdio transport cannot be used for remote
  connections. SSE is the correct transport for any MCP server accessed over a network.

- **One McpServer per SSE connection:** The MCP SDK's `McpServer` instance is not
  thread-safe and holds per-session state. A new instance is created for each SSE
  connection to ensure isolation.

- **ripgrep with Node.js fallback:** `rg` is installed in the Docker image for fast
  full-text search. The Node.js fallback ensures the server works in environments where
  `rg` is not available (e.g. local dev without Docker).

- **Path traversal prevention:** All vault functions resolve paths with `path.resolve`
  and verify the result starts with the vault root before any I/O. This prevents
  directory traversal attacks via crafted note paths.

- **Bearer token auth only:** No session management or OAuth — a single shared API key
  is sufficient for single-user personal vault access. Rotate the key via `.env` + restart.

---

## CI / CD

Standard workspace CI applies. The GitHub Actions workflow runs:
`lint → typecheck → unit-tests`

The Docker image is built and tested on CI but not pushed automatically.
Production deployments are manual via `docker compose up -d --build` on the VPS.

---

## Observability

- **Logs:** Structured JSON to stdout via `console.log`/`console.error`. In production,
  collect with `docker logs obsidian-mcp` or pipe to a log aggregator.
- **Health endpoint:** `GET https://mcp.vermillion.pro/health` returns 200 + JSON.
- **Metrics:** Not instrumented (single-user personal tool — full observability stack
  not warranted at this scale).

---

## Standards Overrides

No overrides — workspace standards apply in full.
