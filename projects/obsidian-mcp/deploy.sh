#!/usr/bin/env bash
# deploy.sh — deploy obsidian-mcp to vermillion.world/mcp
#
# Run from your LOCAL machine:
#   chmod +x deploy.sh
#   MCP_API_KEY=<your-secret> ./deploy.sh
#
# Requires:
#   - ~/.ssh/vermillion_pro_id_rsa present (or override with KEY_PATH=...)
#   - MCP_API_KEY env var set
#   - Docker already installed on the VPS
#   - nginx already running on the VPS

set -euo pipefail

KEY_PATH="${KEY_PATH:-$HOME/.ssh/vermillion_pro_id_rsa}"
REMOTE_USER="grant"
REMOTE_HOST="vermillion.pro"
REMOTE_DIR="/home/grant/obsidian-mcp"
VAULT_PATH="${VAULT_PATH:-/home/grant/vault}"
BASE_PATH="${BASE_PATH:-/mcp}"
MCP_API_KEY="${MCP_API_KEY:?MCP_API_KEY is required. Run: MCP_API_KEY=<secret> ./deploy.sh}"

SSH="ssh -i $KEY_PATH -o StrictHostKeyChecking=no"

echo "==> Testing connection to $REMOTE_HOST"
$SSH "$REMOTE_USER@$REMOTE_HOST" "echo '  OK: connected as $(whoami)'"

echo "==> Syncing project files to $REMOTE_DIR"
rsync -az --delete \
  -e "ssh -i $KEY_PATH -o StrictHostKeyChecking=no" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.env' \
  "$(dirname "$0")/" \
  "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

echo "==> Writing .env"
$SSH "$REMOTE_USER@$REMOTE_HOST" "cat > $REMOTE_DIR/.env" <<EOF
VAULT_PATH=$VAULT_PATH
MCP_API_KEY=$MCP_API_KEY
PORT=3000
NODE_ENV=production
BASE_PATH=$BASE_PATH
EOF

echo "==> Creating vault directory if it doesn't exist"
$SSH "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $VAULT_PATH"

echo "==> Building and starting Docker container"
$SSH "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && docker compose up -d --build"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Docker container is running. Two manual steps remain"
echo "on the server (require sudo):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Copy the nginx snippet:"
echo "   sudo mkdir -p /etc/nginx/snippets"
echo "   sudo cp $REMOTE_DIR/nginx/mcp-location.conf /etc/nginx/snippets/obsidian-mcp.conf"
echo ""
echo "2. Add this line inside the HTTPS server {} block"
echo "   in /etc/nginx/sites-available/vermillion.world:"
echo ""
echo "       include /etc/nginx/snippets/obsidian-mcp.conf;"
echo ""
echo "3. Validate and reload:"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "4. Verify:"
echo "   curl https://vermillion.world/mcp/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
