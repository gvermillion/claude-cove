# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including devDependencies needed for tsc)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript
RUN pnpm build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Install pnpm for production dependency installation
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install ripgrep for fast full-text search
RUN apk add --no-cache ripgrep

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Run as non-root user for security
RUN addgroup -S mcp && adduser -S mcp -G mcp
USER mcp

# Expose the MCP server port
EXPOSE 3000

# Health check — verify the server is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
