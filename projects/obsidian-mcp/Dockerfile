# syntax=docker/dockerfile:1

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Install pnpm directly via npm — avoids corepack's own network download
RUN npm install -g pnpm@9.0.0

WORKDIR /app

COPY package.json pnpm-lock.yaml* .npmrc* ./

# Install all dependencies (devDeps needed for tsc)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript then strip devDeps — node_modules is prod-only after this
RUN pnpm build && pnpm prune --prod

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Install ripgrep for fast full-text search
RUN apk add --no-cache ripgrep

WORKDIR /app

# Copy pruned node_modules and compiled output — no pnpm install needed at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Run as non-root user for security
RUN addgroup -S mcp && adduser -S mcp -G mcp
USER mcp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
