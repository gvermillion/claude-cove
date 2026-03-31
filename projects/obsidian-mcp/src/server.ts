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
import { config } from "./config.js";
import { handleReadNote, handleListFolder, handleGetDailyNote } from "./tools/read-tools.js";
import { handleCreateNote, handleUpdateNote, handleAppendToNote } from "./tools/write-tools.js";
import {
  handleSearchVault,
  handleGetBacklinks,
  handleGetTags,
  handleGetNotesByTag,
} from "./tools/search-tools.js";
import {
  readToolDefinitions,
} from "./tools/read-tools.js";
import {
  writeToolDefinitions,
} from "./tools/write-tools.js";
import {
  searchToolDefinitions,
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
 * Construct an McpServer with all vault tools registered.
 *
 * Called once per SSE connection to create isolated session state.
 *
 * @returns Configured McpServer ready to connect to a transport.
 */
function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: "obsidian-mcp",
    version: "0.1.0",
  });

  const allToolDefinitions = [
    ...readToolDefinitions,
    ...writeToolDefinitions,
    ...searchToolDefinitions,
  ];

  // Register all tools with their schemas and handlers
  for (const tool of allToolDefinitions) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema.properties ?? {},
      async (args: Record<string, unknown>) => {
        return await dispatchToolCall(tool.name, args);
      },
    );
  }

  return server;
}

/**
 * Dispatch an MCP tool call to the appropriate handler function.
 *
 * @param toolName - The registered tool name.
 * @param args - Validated arguments from the MCP SDK.
 * @returns The tool result content array.
 * @throws {Error} If the tool name is not recognised.
 */
async function dispatchToolCall(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const vaultPath = config.VAULT_PATH;

  switch (toolName) {
    case "read_note":
      return handleReadNote(vaultPath, args);
    case "list_folder":
      return handleListFolder(vaultPath, args);
    case "get_daily_note":
      return handleGetDailyNote(vaultPath, args);
    case "create_note":
      return handleCreateNote(vaultPath, args);
    case "update_note":
      return handleUpdateNote(vaultPath, args);
    case "append_to_note":
      return handleAppendToNote(vaultPath, args);
    case "search_vault":
      return handleSearchVault(vaultPath, args);
    case "get_backlinks":
      return handleGetBacklinks(vaultPath, args);
    case "get_tags":
      return handleGetTags(vaultPath, args);
    case "get_notes_by_tag":
      return handleGetNotesByTag(vaultPath, args);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
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
