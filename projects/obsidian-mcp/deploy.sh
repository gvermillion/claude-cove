#!/usr/bin/env bash
# deploy.sh — run this from your LOCAL machine to deploy obsidian-mcp to vermillion.pro
#
# Usage:
#   chmod +x deploy.sh
#   MCP_API_KEY=<your-secret> ./deploy.sh
#
# Requires:
#   - ~/.ssh/vermillion_pro_id_rsa present (or update KEY_PATH below)
#   - mcp.vermillion.pro DNS A record pointing at the VPS
#   - MCP_API_KEY env var set before running

set -euo pipefail

KEY_PATH="${KEY_PATH:-$HOME/.ssh/vermillion_pro_id_rsa}"
REMOTE_USER="grant"
REMOTE_HOST="vermillion.pro"
REMOTE_DIR="/home/grant/obsidian-mcp"
VAULT_PATH="${VAULT_PATH:-/home/grant/vault}"
MCP_API_KEY="${MCP_API_KEY:?MCP_API_KEY is required. Run: MCP_API_KEY=<secret> ./deploy.sh}"

SSH="ssh -i $KEY_PATH -o StrictHostKeyChecking=no"
SCP="scp -i $KEY_PATH -o StrictHostKeyChecking=no"

echo "==> Connecting to $REMOTE_HOST as $REMOTE_USER"
$SSH "$REMOTE_USER@$REMOTE_HOST" "echo Connected OK"

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
$SSH "$REMOTE_USER@$REMOTE_HOST" "cat > $REMOTE_DIR/.env" << EOF
VAULT_PATH=$VAULT_PATH
MCP_API_KEY=$MCP_API_KEY
PORT=3000
NODE_ENV=production
EOF

echo "==> Creating vault directory if needed"
$SSH "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $VAULT_PATH"

echo "==> Building and starting Docker container"
$SSH "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && docker compose up -d --build"

echo "==> Installing nginx site config"
$SSH "$REMOTE_USER@$REMOTE_HOST" "
  sudo cp $REMOTE_DIR/nginx/obsidian-mcp.conf /etc/nginx/sites-available/obsidian-mcp.conf
  sudo ln -sf /etc/nginx/sites-available/obsidian-mcp.conf /etc/nginx/sites-enabled/obsidian-mcp.conf
  sudo nginx -t
"

echo "==> Issuing TLS certificate (skip if already exists)"
$SSH "$REMOTE_USER@$REMOTE_HOST" "
  if [ ! -d /etc/letsencrypt/live/mcp.vermillion.pro ]; then
    sudo certbot certonly --nginx -d mcp.vermillion.pro --non-interactive --agree-tos -m admin@vermillion.pro
  else
    echo 'Certificate already exists, skipping.'
  fi
"

echo "==> Reloading nginx"
$SSH "$REMOTE_USER@$REMOTE_HOST" "sudo systemctl reload nginx"

echo "==> Checking health endpoint"
sleep 3
curl -sf https://mcp.vermillion.pro/health && echo "" && echo "SUCCESS — MCP server is live at https://mcp.vermillion.pro/sse"
