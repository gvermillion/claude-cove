# obsidian-mcp

A TypeScript MCP (Model Context Protocol) server that gives remote LLM clients
(Claude, ChatGPT, Gemini) read/write access to an Obsidian vault over HTTPS.

Deployed at `https://mcp.vermillion.pro` — runs on a VPS with vault files synced
via Syncthing. No Obsidian app or REST API plugin required.

---

## What it does

- **Read notes** — fetch note content and YAML frontmatter by path
- **Write notes** — create, overwrite, or append to markdown files
- **Daily notes** — read or create today's daily note (Obsidian daily note format)
- **Search** — full-text search via ripgrep across all markdown files
- **Graph navigation** — find backlinks and filter notes by tag

All tools are exposed as MCP tools over an SSE transport endpoint, so any MCP-compatible
client can connect over HTTPS without local installation.

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- An Obsidian vault directory

### Local development

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set VAULT_PATH to your local vault directory and pick an MCP_API_KEY

# 3. Start development server
pnpm dev
# Server starts on http://localhost:3000

# 4. Verify health
curl http://localhost:3000/health

# 5. Run tests
pnpm test
```

### Docker

```bash
# Build and start
docker compose up --build -d

# Check logs
docker compose logs -f mcp

# Stop
docker compose down
```

---

## VPS Deployment

### 1. Provision the VPS

Any Ubuntu 22.04+ VPS works. The server needs:
- Docker + Docker Compose
- A domain pointing to its IP (`mcp.vermillion.pro`)
- Ports 80 and 443 open

### 2. Install Syncthing for vault sync

Syncthing keeps your local vault in sync with the VPS filesystem.

```bash
# On the VPS
sudo apt update && sudo apt install -y syncthing
sudo systemctl enable --now syncthing@ubuntu

# Tunnel to the Syncthing web UI (run locally)
ssh -L 8384:localhost:8384 ubuntu@mcp.vermillion.pro
# Then open http://localhost:8384 in your browser

# Add your local machine as a Syncthing device and share your vault folder
# The vault will sync to ~/vault (or wherever you configure it)
```

### 3. Obtain a TLS certificate

```bash
# Install Certbot
sudo apt install -y certbot

# Obtain certificate (stop any process on port 80 first)
sudo certbot certonly --standalone -d mcp.vermillion.pro

# Certificates are stored at /etc/letsencrypt/live/mcp.vermillion.pro/
```

### 4. Deploy the server

```bash
# Clone repo
git clone <repo-url> ~/obsidian-mcp
cd ~/obsidian-mcp/projects/obsidian-mcp

# Configure environment
cp .env.example .env
nano .env
# Set:
#   VAULT_PATH=/home/ubuntu/vault   (path where Syncthing syncs your vault)
#   MCP_API_KEY=$(openssl rand -hex 32)
#   PORT=3000
#   NODE_ENV=production

# Start services (MCP server + Nginx)
docker compose up -d

# Verify
curl https://mcp.vermillion.pro/health
```

### 5. Auto-renew TLS certificates

```bash
# Add a cron job to renew and reload nginx
echo "0 0 * * * certbot renew --quiet && docker compose -f ~/obsidian-mcp/projects/obsidian-mcp/docker-compose.yml exec nginx nginx -s reload" | sudo crontab -
```

---

## Client Connection Configs

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "obsidian": {
      "url": "https://mcp.vermillion.pro/sse",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

### ChatGPT (Custom GPT / Plugins)

In the GPT Action configuration, set:

- **Schema URL:** `https://mcp.vermillion.pro/openapi.json` *(not applicable for MCP — use the direct SSE URL)*
- **Authentication type:** API Key
- **Auth header:** `Authorization`
- **API Key:** `Bearer YOUR_MCP_API_KEY`

For direct MCP connection (if supported by your ChatGPT client):
- **SSE URL:** `https://mcp.vermillion.pro/sse`
- **Header:** `Authorization: Bearer YOUR_MCP_API_KEY`

### Gemini (Google AI Studio / Vertex AI)

In your Gemini agent or extension configuration:

```json
{
  "mcp_server": {
    "url": "https://mcp.vermillion.pro/sse",
    "transport": "sse",
    "headers": {
      "Authorization": "Bearer YOUR_MCP_API_KEY"
    }
  }
}
```

For programmatic use with the Gemini SDK:

```python
# Python example using google-generativeai with MCP
mcp_config = {
    "url": "https://mcp.vermillion.pro/sse",
    "headers": {"Authorization": f"Bearer {MCP_API_KEY}"},
}
```

---

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `read_note` | Read a note by vault-relative path |
| `list_folder` | List all notes in a folder |
| `get_daily_note` | Get or create today's daily note |
| `create_note` | Create a new note (fails if exists) |
| `update_note` | Replace a note's entire content |
| `append_to_note` | Append text to an existing note |
| `search_vault` | Full-text search across all notes |
| `get_backlinks` | Find notes that link to a given note |
| `get_tags` | List all tags across the vault |
| `get_notes_by_tag` | Find notes with a specific tag |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VAULT_PATH` | Yes | — | Absolute path to the vault directory |
| `MCP_API_KEY` | Yes | — | Bearer token for authentication (min 16 chars) |
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `production` | Runtime environment |

---

## Project Structure

```
src/
├── server.ts          # Express + SSE transport + tool dispatch
├── config.ts          # Zod-validated environment config
├── vault/
│   ├── reader.ts      # readNote, listFolder, getDailyNote
│   ├── writer.ts      # createNote, updateNote, appendToNote, ensureDailyNote
│   ├── search.ts      # searchVault (ripgrep + Node.js fallback)
│   └── graph.ts       # buildBacklinksIndex, getBacklinks, getAllTags, getNotesByTag
└── tools/
    ├── read-tools.ts  # MCP tool definitions + handlers for read operations
    ├── write-tools.ts # MCP tool definitions + handlers for write operations
    └── search-tools.ts # MCP tool definitions + handlers for search/graph operations
```
