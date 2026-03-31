/**
 * MCP read tool definitions for the Obsidian vault.
 *
 * Exports tool handlers for reading notes, listing folders, and retrieving the
 * daily note. Each handler validates its input with Zod, calls the appropriate
 * vault reader function, and returns a structured MCP content response.
 *
 * @module tools/read-tools
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { readNote, listFolder, getDailyNote } from "../vault/reader.js";
import { ensureDailyNote } from "../vault/writer.js";

/** Schema for `read_note` tool arguments. */
const ReadNoteArgsSchema = z.object({
  path: z.string().min(1).describe("Vault-relative path to the note (e.g. 'Projects/alpha.md'). The .md extension is optional."),
});

/** Schema for `list_folder` tool arguments. */
const ListFolderArgsSchema = z.object({
  folder: z.string().describe("Vault-relative folder path to list. Use '' or '.' for the vault root.").default(""),
});

/** Schema for `get_daily_note` tool arguments. */
const GetDailyNoteArgsSchema = z.object({
  create_if_missing: z.boolean()
    .default(false)
    .describe("If true, create today's daily note from a template when it does not exist yet."),
});

/** MCP tool definition for `read_note`. */
export const readNoteTool: Tool = {
  name: "read_note",
  description:
    "Read a single Obsidian note by its vault-relative path. Returns the full markdown content and parsed YAML frontmatter. Use this to inspect a specific note when you know its path.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Vault-relative path to the note (e.g. 'Projects/alpha.md'). The .md extension is optional.",
      },
    },
    required: ["path"],
  },
};

/** MCP tool definition for `list_folder`. */
export const listFolderTool: Tool = {
  name: "list_folder",
  description:
    "List all markdown notes (.md files) in a vault folder. Returns vault-relative paths. Pass an empty string or '.' to list the vault root. Not recursive — only lists immediate children.",
  inputSchema: {
    type: "object",
    properties: {
      folder: {
        type: "string",
        description: "Vault-relative folder path to list. Use '' or '.' for the vault root.",
        default: "",
      },
    },
    required: [],
  },
};

/** MCP tool definition for `get_daily_note`. */
export const getDailyNoteTool: Tool = {
  name: "get_daily_note",
  description:
    "Get today's daily note from the vault (stored at daily/YYYY-MM-DD.md). Optionally creates it from a default template if it does not exist yet. Use this for journaling, task tracking, or capturing the day's context.",
  inputSchema: {
    type: "object",
    properties: {
      create_if_missing: {
        type: "boolean",
        description: "If true, create today's daily note from a template when it does not exist yet.",
        default: false,
      },
    },
    required: [],
  },
};

/** All read tool definitions exported as an array for server registration. */
export const readToolDefinitions: Tool[] = [readNoteTool, listFolderTool, getDailyNoteTool];

/**
 * Execute the `read_note` tool.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param args - Raw tool arguments from the MCP request.
 * @returns MCP-compatible content array with the note data.
 * @throws {Error} If validation fails or the note cannot be read.
 */
export async function handleReadNote(
  vaultPath: string,
  args: unknown,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { path } = ReadNoteArgsSchema.parse(args);
  const note = await readNote(vaultPath, path);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            path: note.path,
            frontmatter: note.frontmatter,
            content: note.content,
          },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Execute the `list_folder` tool.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param args - Raw tool arguments from the MCP request.
 * @returns MCP-compatible content array with the sorted list of note paths.
 * @throws {Error} If validation fails or the folder cannot be read.
 */
export async function handleListFolder(
  vaultPath: string,
  args: unknown,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { folder } = ListFolderArgsSchema.parse(args);
  const notes = await listFolder(vaultPath, folder);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ folder: folder || ".", notes, count: notes.length }, null, 2),
      },
    ],
  };
}

/**
 * Execute the `get_daily_note` tool.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param args - Raw tool arguments from the MCP request.
 * @returns MCP-compatible content array with the daily note data or a not-found message.
 * @throws {Error} If validation fails or a create operation fails.
 */
export async function handleGetDailyNote(
  vaultPath: string,
  args: unknown,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { create_if_missing } = GetDailyNoteArgsSchema.parse(args);

  let note = await getDailyNote(vaultPath);

  if (!note && create_if_missing) {
    const createdPath = await ensureDailyNote(vaultPath);
    note = await readNote(vaultPath, createdPath);
  }

  if (!note) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ exists: false, message: "Today's daily note does not exist. Set create_if_missing to true to create it." }),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            exists: true,
            path: note.path,
            frontmatter: note.frontmatter,
            content: note.content,
          },
          null,
          2,
        ),
      },
    ],
  };
}
