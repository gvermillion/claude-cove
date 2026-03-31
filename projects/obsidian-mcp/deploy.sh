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

# Prompt for sudo password upfront so the rest of the script runs unattended.
# sudo -S reads the password from stdin, avoiding the need for an interactive TTY.
read -r -s -p "sudo password for $REMOTE_USER@$REMOTE_HOST: " SUDO_PASS
echo ""

# Helper: run a remote sudo command non-interactively via stdin password.
remote_sudo() {
  $SSH "$REMOTE_USER@$REMOTE_HOST" "echo '$SUDO_PASS' | sudo -S $*"
}

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

echo "==> Installing nginx location snippet"
remote_sudo mkdir -p /etc/nginx/snippets
remote_sudo cp "$REMOTE_DIR/nginx/mcp-location.conf" /etc/nginx/snippets/obsidian-mcp.conf
echo "  Snippet written to /etc/nginx/snippets/obsidian-mcp.conf"

# Add the include line to the vermillion.world config if not already present.
NGINX_CONF="/etc/nginx/sites-available/vermillion.world"
INCLUDE_LINE="    include /etc/nginx/snippets/obsidian-mcp.conf;"

if $SSH "$REMOTE_USER@$REMOTE_HOST" "grep -q 'obsidian-mcp' $NGINX_CONF"; then
  echo "  nginx include already present — skipping"
else
  echo "==> Adding include to $NGINX_CONF"
  # Insert before the closing } of the HTTPS server block (last } in the file).
  $SSH "$REMOTE_USER@$REMOTE_HOST" "echo '$SUDO_PASS' | sudo -S sed -i 's|^}$|$INCLUDE_LINE\n}|' $NGINX_CONF"
  echo "  Added: $INCLUDE_LINE"
fi

echo "==> Validating and reloading nginx"
remote_sudo nginx -t
remote_sudo systemctl reload nginx

echo ""
echo "==> Checking health endpoint"
sleep 2
curl -sf https://vermillion.world/mcp/health && echo "" && echo "SUCCESS — https://vermillion.world/mcp/sse is live"
