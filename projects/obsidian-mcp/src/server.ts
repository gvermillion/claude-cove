/**
 * MCP server entry point.
 *
 * Starts an Express HTTP server that exposes an SSE (Server-Sent Events)
 * endpoint for remote MCP clients. Authentication is enforced via a Bearer
 * token on every connection. All vault tools are registered at startup.
 *
 * Architecture:
 * - Express handles HTTP routing and Bearer token auth middleware.
 * - The MCP SDK's SSEServerTransport bridges each SSE connection to a
 *   McpServer instance that handles JSON-RPC protocol framing.
 * - One McpServer instance is created per SSE connection so each client
 *   has isolated session state.
 *
 * @module server
 */

import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { config } from "./config.js";
import { handleReadNote, handleListFolder, handleGetDailyNote } from "./tools/read-tools.js";
import { handleCreateNote, handleUpdateNote, handleAppendToNote } from "./tools/write-tools.js";
import {
  handleSearchVault,
  handleGetBacklinks,
  handleGetTags,
  handleGetNotesByTag,
} from "./tools/search-tools.js";

/** Map from session ID to active SSE transport, for message routing. */
const activeTransports = new Map<string, SSEServerTransport>();

/**
 * Build and configure the Express application.
 *
 * Separated from `main()` so it can be used in integration tests without
 * starting the server.
 *
 * @returns Configured Express application.
 */
export function createApp(): express.Application {
  const app = express();

  // Parse JSON bodies for the MCP POST message endpoint
  app.use(express.json());

  // ── Health check ──────────────────────────────────────────────────────────

  /**
   * Liveness endpoint — returns 200 if the process is alive.
   * Does not check vault availability or downstream dependencies.
   */
  app.get("/health", (_req: Request, res: Response): void => {
    res.status(200).json({ status: "ok", service: "obsidian-mcp", vault: config.VAULT_PATH });
  });

  // ── Auth middleware ───────────────────────────────────────────────────────

  /**
   * Enforce Bearer token authentication on the SSE endpoint.
   * Passes through immediately for any other path.
   */
  function requireBearerAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Authorization header. Expected: Bearer <token>" });
      return;
    }

    const token = authHeader.slice("Bearer ".length).trim();

    if (token !== config.MCP_API_KEY) {
      res.status(403).json({ error: "Invalid API key." });
      return;
    }

    next();
  }

  // ── SSE endpoint ─────────────────────────────────────────────────────────

  /**
   * SSE connection endpoint for MCP clients.
   *
   * Each GET /sse request opens a persistent connection and creates an
   * isolated McpServer instance with all vault tools registered.
   */
  app.get("/sse", requireBearerAuth, async (req: Request, res: Response): Promise<void> => {
    const server = buildMcpServer();
    const transport = new SSEServerTransport("/messages", res);

    activeTransports.set(transport.sessionId, transport);

    res.on("close", () => {
      activeTransports.delete(transport.sessionId);
    });

    await server.connect(transport);
  });

  /**
   * POST endpoint for MCP client-to-server messages.
   *
   * Clients send JSON-RPC requests here after establishing the SSE stream.
   * The sessionId query param routes the message to the correct transport.
   */
  app.post("/messages", requireBearerAuth, async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.query["sessionId"];

    if (typeof sessionId !== "string") {
      res.status(400).json({ error: "Missing sessionId query parameter." });
      return;
    }

    const transport = activeTransports.get(sessionId);

    if (!transport) {
      res.status(404).json({ error: `No active session found for sessionId: ${sessionId}` });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  return app;
}

/**
 * Construct an McpServer with all vault tools registered using Zod schemas.
 *
 * Called once per SSE connection to create isolated session state.
 * Uses `registerTool` with explicit Zod input schemas so the SDK can
 * validate and type tool arguments before invoking handlers.
 *
 * @returns Configured McpServer ready to connect to a transport.
 */
function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: "obsidian-mcp",
    version: "0.1.0",
  });

  const vaultPath = config.VAULT_PATH;

  // ── Read tools ──────────────────────────────────────────────────────────

  server.registerTool(
    "read_note",
    {
      description: "Read a single Obsidian note by its vault-relative path. Returns the full markdown content and parsed YAML frontmatter.",
      inputSchema: { path: z.string().min(1).describe("Vault-relative path to the note (e.g. 'Projects/alpha.md'). The .md extension is optional.") },
    },
    async (args) => handleReadNote(vaultPath, args),
  );

  server.registerTool(
    "list_folder",
    {
      description: "List all markdown notes in a vault folder. Returns vault-relative paths. Pass an empty string or '.' to list the vault root. Not recursive.",
      inputSchema: { folder: z.string().default("").describe("Vault-relative folder path to list. Use '' or '.' for the vault root.") },
    },
    async (args) => handleListFolder(vaultPath, args),
  );

  server.registerTool(
    "get_daily_note",
    {
      description: "Get today's daily note from the vault (daily/YYYY-MM-DD.md). Optionally creates it from a default template if it does not exist.",
      inputSchema: {
        create_if_missing: z.boolean().default(false).describe("If true, create today's daily note when it does not exist."),
      },
    },
    async (args) => handleGetDailyNote(vaultPath, args),
  );

  // ── Write tools ─────────────────────────────────────────────────────────

  server.registerTool(
    "create_note",
    {
      description: "Create a new Obsidian note. Fails if a note already exists at that path. Parent directories are created automatically.",
      inputSchema: {
        path: z.string().min(1).describe("Vault-relative path for the new note (e.g. 'Projects/alpha.md')."),
        content: z.string().describe("Markdown body text for the note."),
        frontmatter: z.record(z.unknown()).optional().describe("Optional YAML frontmatter fields as a JSON object."),
      },
    },
    async (args) => handleCreateNote(vaultPath, args),
  );

  server.registerTool(
    "update_note",
    {
      description: "Replace the entire content of an existing Obsidian note. The note must already exist. WARNING: Overwrites the full file.",
      inputSchema: {
        path: z.string().min(1).describe("Vault-relative path of the note to update."),
        content: z.string().describe("New markdown body text. Replaces the entire existing content."),
        frontmatter: z.record(z.unknown()).optional().describe("Optional frontmatter. If omitted the existing frontmatter is NOT preserved."),
      },
    },
    async (args) => handleUpdateNote(vaultPath, args),
  );

  server.registerTool(
    "append_to_note",
    {
      description: "Append text to the end of an existing note without replacing existing content. Ideal for journaling and logging.",
      inputSchema: {
        path: z.string().min(1).describe("Vault-relative path of the note to append to."),
        content: z.string().min(1).describe("Text to append. A newline separator is added automatically."),
      },
    },
    async (args) => handleAppendToNote(vaultPath, args),
  );

  // ── Search tools ─────────────────────────────────────────────────────────

  server.registerTool(
    "search_vault",
    {
      description: "Full-text search across all markdown notes. Uses ripgrep for fast results. Returns matching lines with file path, line number, and text snippet.",
      inputSchema: {
        query: z.string().min(1).describe("Text or regex pattern to search for."),
        folder: z.string().optional().describe("Restrict search to this vault-relative folder. Omit to search entire vault."),
        max_results: z.number().int().min(1).max(200).default(50).describe("Maximum number of matches to return (1–200). Defaults to 50."),
        case_insensitive: z.boolean().default(true).describe("Whether the search should ignore case. Defaults to true."),
      },
    },
    async (args) => handleSearchVault(vaultPath, args),
  );

  server.registerTool(
    "get_backlinks",
    {
      description: "Find all notes that contain a [[wikilink]] pointing to a given note. Useful for understanding which notes reference a concept or project.",
      inputSchema: {
        path: z.string().min(1).describe("Vault-relative path of the note to find backlinks for (e.g. 'Projects/alpha.md')."),
      },
    },
    async (args) => handleGetBacklinks(vaultPath, args),
  );

  server.registerTool(
    "get_tags",
    {
      description: "List all unique tags used across the vault, collected from YAML frontmatter. Returns tags in alphabetical order.",
      inputSchema: {},
    },
    async (args) => handleGetTags(vaultPath, args),
  );

  server.registerTool(
    "get_notes_by_tag",
    {
      description: "Find all notes that have a specific tag in their YAML frontmatter. Tag matching is case-insensitive.",
      inputSchema: {
        tag: z.string().min(1).describe("Tag to filter by (without the '#' prefix)."),
      },
    },
    async (args) => handleGetNotesByTag(vaultPath, args),
  );

  return server;
}

/**
 * Start the HTTP server and listen on the configured port.
 */
async function main(): Promise<void> {
  const app = createApp();

  app.listen(config.PORT, () => {
    console.log(
      JSON.stringify({
        level: "info",
        event: "server_started",
        port: config.PORT,
        vault: config.VAULT_PATH,
        env: config.NODE_ENV,
        timestamp: new Date().toISOString(),
      }),
    );
  });
}

main().catch((err: unknown) => {
  console.error(
    JSON.stringify({
      level: "critical",
      event: "startup_failed",
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    }),
  );
  process.exit(1);
});
