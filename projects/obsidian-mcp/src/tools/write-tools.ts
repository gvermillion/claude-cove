/**
 * MCP write tool definitions for the Obsidian vault.
 *
 * Exports tool handlers for creating, updating, and appending to notes.
 * All write operations validate their arguments with Zod before touching
 * the filesystem.
 *
 * @module tools/write-tools
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { createNote, updateNote, appendToNote, ensureDailyNote } from "../vault/writer.js";
import { readNote } from "../vault/reader.js";

/** Schema for `create_note` tool arguments. */
const CreateNoteArgsSchema = z.object({
  path: z.string().min(1).describe("Vault-relative path for the new note (e.g. 'Projects/alpha.md'). Parent folders are created automatically."),
  content: z.string().describe("Markdown body text for the note (without frontmatter delimiters)."),
  frontmatter: z
    .record(z.unknown())
    .optional()
    .describe("Optional YAML frontmatter fields as a JSON object (e.g. { tags: ['project'], status: 'active' })."),
});

/** Schema for `update_note` tool arguments. */
const UpdateNoteArgsSchema = z.object({
  path: z.string().min(1).describe("Vault-relative path of the note to update."),
  content: z.string().describe("New markdown body text. Replaces the entire existing content."),
  frontmatter: z
    .record(z.unknown())
    .optional()
    .describe("Optional YAML frontmatter. If omitted, the existing frontmatter is NOT preserved — pass it explicitly to keep it."),
});

/** Schema for `append_to_note` tool arguments. */
const AppendToNoteArgsSchema = z.object({
  path: z.string().min(1).describe("Vault-relative path of the note to append to."),
  content: z.string().min(1).describe("Text to append to the end of the note. A newline separator is added automatically."),
});

/** MCP tool definition for `create_note`. */
export const createNoteTool: Tool = {
  name: "create_note",
  description:
    "Create a new Obsidian note at the given vault-relative path. Fails if a note already exists at that path (use update_note to overwrite). Parent directories are created automatically. Optionally include YAML frontmatter fields.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Vault-relative path for the new note (e.g. 'Projects/alpha.md'). Parent folders are created automatically.",
      },
      content: {
        type: "string",
        description: "Markdown body text for the note.",
      },
      frontmatter: {
        type: "object",
        description: "Optional YAML frontmatter fields (e.g. { tags: ['project'], status: 'active' }).",
        additionalProperties: true,
      },
    },
    required: ["path", "content"],
  },
};

/** MCP tool definition for `update_note`. */
export const updateNoteTool: Tool = {
  name: "update_note",
  description:
    "Replace the entire content of an existing Obsidian note. The note must already exist (use create_note otherwise). WARNING: This overwrites the full file. If you need to preserve existing frontmatter, read the note first and pass the frontmatter back explicitly.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Vault-relative path of the note to update.",
      },
      content: {
        type: "string",
        description: "New markdown body text. Replaces the entire existing content.",
      },
      frontmatter: {
        type: "object",
        description: "Optional frontmatter to include. If omitted the existing frontmatter is NOT preserved.",
        additionalProperties: true,
      },
    },
    required: ["path", "content"],
  },
};

/** MCP tool definition for `append_to_note`. */
export const appendToNoteTool: Tool = {
  name: "append_to_note",
  description:
    "Append text to the end of an existing Obsidian note without reading or replacing existing content. Ideal for journaling, logging task completions, adding meeting notes to a running log, or any write where you want to add rather than replace.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Vault-relative path of the note to append to.",
      },
      content: {
        type: "string",
        description: "Text to append. A newline separator is added automatically if not present.",
      },
    },
    required: ["path", "content"],
  },
};

/** All write tool definitions exported as an array for server registration. */
export const writeToolDefinitions: Tool[] = [createNoteTool, updateNoteTool, appendToNoteTool];

/**
 * Execute the `create_note` tool.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param args - Raw tool arguments from the MCP request.
 * @returns MCP-compatible content confirming the created note path.
 * @throws {Error} If the note already exists or validation fails.
 */
export async function handleCreateNote(
  vaultPath: string,
  args: unknown,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { path, content, frontmatter } = CreateNoteArgsSchema.parse(args);
  await createNote(vaultPath, path, content, frontmatter);

  const normalizedPath = path.endsWith(".md") ? path : `${path}.md`;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ success: true, path: normalizedPath, message: `Note created at "${normalizedPath}".` }),
      },
    ],
  };
}

/**
 * Execute the `update_note` tool.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param args - Raw tool arguments from the MCP request.
 * @returns MCP-compatible content confirming the updated note path.
 * @throws {Error} If the note does not exist or validation fails.
 */
export async function handleUpdateNote(
  vaultPath: string,
  args: unknown,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { path, content, frontmatter } = UpdateNoteArgsSchema.parse(args);
  await updateNote(vaultPath, path, content, frontmatter);

  const normalizedPath = path.endsWith(".md") ? path : `${path}.md`;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ success: true, path: normalizedPath, message: `Note updated at "${normalizedPath}".` }),
      },
    ],
  };
}

/**
 * Execute the `append_to_note` tool.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param args - Raw tool arguments from the MCP request.
 * @returns MCP-compatible content confirming the append operation.
 * @throws {Error} If the note does not exist or validation fails.
 */
export async function handleAppendToNote(
  vaultPath: string,
  args: unknown,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { path, content } = AppendToNoteArgsSchema.parse(args);
  await appendToNote(vaultPath, path, content);

  const normalizedPath = path.endsWith(".md") ? path : `${path}.md`;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ success: true, path: normalizedPath, message: `Content appended to "${normalizedPath}".` }),
      },
    ],
  };
}

/**
 * Execute a combined `get_or_create_daily_note` helper used by `get_daily_note`
 * with create_if_missing = true. Exposed here because it involves a write operation.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @returns The vault-relative path of the daily note.
 */
export async function handleEnsureDailyNote(
  vaultPath: string,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const notePath = await ensureDailyNote(vaultPath);
  const note = await readNote(vaultPath, notePath);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          path: note.path,
          frontmatter: note.frontmatter,
          content: note.content,
        }, null, 2),
      },
    ],
  };
}
