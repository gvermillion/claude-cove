/**
 * MCP search and graph tool definitions for the Obsidian vault.
 *
 * Exports tool handlers for full-text search, backlink discovery, and tag
 * operations. These tools allow LLM clients to navigate the vault's knowledge
 * graph without knowing file paths in advance.
 *
 * @module tools/search-tools
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { searchVault } from "../vault/search.js";
import { getBacklinks, getAllTags, getNotesByTag } from "../vault/graph.js";

/** Schema for `search_vault` tool arguments. */
const SearchVaultArgsSchema = z.object({
  query: z.string().min(1).describe("Text or regex pattern to search for across all notes."),
  folder: z.string().optional().describe("Restrict search to this vault-relative folder. Omit to search the entire vault."),
  max_results: z.number().int().min(1).max(200).default(50).describe("Maximum number of matches to return (1–200). Defaults to 50."),
  case_insensitive: z.boolean().default(true).describe("Whether the search should ignore case. Defaults to true."),
});

/** Schema for `get_backlinks` tool arguments. */
const GetBacklinksArgsSchema = z.object({
  path: z.string().min(1).describe("Vault-relative path of the note to find backlinks for (e.g. 'Projects/alpha.md')."),
});

/** Schema for `get_tags` tool arguments. */
const GetTagsArgsSchema = z.object({});

/** Schema for `get_notes_by_tag` tool arguments. */
const GetNotesByTagArgsSchema = z.object({
  tag: z.string().min(1).describe("Tag to search for (without the '#' prefix)."),
});

/** MCP tool definition for `search_vault`. */
export const searchVaultTool: Tool = {
  name: "search_vault",
  description:
    "Full-text search across all markdown notes in the vault. Uses ripgrep for fast results. Returns matching lines with file path, line number, and a text snippet. Use this when you don't know which note contains a piece of information.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Text or regex pattern to search for across all notes.",
      },
      folder: {
        type: "string",
        description: "Restrict search to this vault-relative folder. Omit to search the entire vault.",
      },
      max_results: {
        type: "number",
        description: "Maximum number of matches to return (1–200). Defaults to 50.",
        default: 50,
      },
      case_insensitive: {
        type: "boolean",
        description: "Whether the search should ignore case. Defaults to true.",
        default: true,
      },
    },
    required: ["query"],
  },
};

/** MCP tool definition for `get_backlinks`. */
export const getBacklinksTool: Tool = {
  name: "get_backlinks",
  description:
    "Find all notes in the vault that contain a [[wikilink]] pointing to a given note. Useful for understanding which notes reference a concept, person, project, or resource. Scans the entire vault on each call.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Vault-relative path of the note to find backlinks for (e.g. 'Projects/alpha.md').",
      },
    },
    required: ["path"],
  },
};

/** MCP tool definition for `get_tags`. */
export const getTagsTool: Tool = {
  name: "get_tags",
  description:
    "List all unique tags used across the vault, collected from YAML frontmatter `tags` fields. Returns tags in alphabetical order. Use this to discover the tagging taxonomy before filtering notes by tag.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

/** MCP tool definition for `get_notes_by_tag`. */
export const getNotesByTagTool: Tool = {
  name: "get_notes_by_tag",
  description:
    "Find all notes that have a specific tag in their YAML frontmatter. Tag matching is case-insensitive. Use get_tags first to discover available tags.",
  inputSchema: {
    type: "object",
    properties: {
      tag: {
        type: "string",
        description: "Tag to filter by (without the '#' prefix).",
      },
    },
    required: ["tag"],
  },
};

/** All search tool definitions exported as an array for server registration. */
export const searchToolDefinitions: Tool[] = [
  searchVaultTool,
  getBacklinksTool,
  getTagsTool,
  getNotesByTagTool,
];

/**
 * Execute the `search_vault` tool.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param args - Raw tool arguments from the MCP request.
 * @returns MCP-compatible content with search matches and metadata.
 * @throws {Error} If validation fails.
 */
export async function handleSearchVault(
  vaultPath: string,
  args: unknown,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { query, folder, max_results, case_insensitive } = SearchVaultArgsSchema.parse(args);

  const result = await searchVault(vaultPath, query, {
    folder,
    maxResults: max_results,
    caseInsensitive: case_insensitive,
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            query,
            totalFound: result.totalFound,
            returned: result.matches.length,
            usedRipgrep: result.usedRipgrep,
            matches: result.matches,
          },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Execute the `get_backlinks` tool.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param args - Raw tool arguments from the MCP request.
 * @returns MCP-compatible content with backlink list.
 * @throws {Error} If validation fails.
 */
export async function handleGetBacklinks(
  vaultPath: string,
  args: unknown,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { path } = GetBacklinksArgsSchema.parse(args);
  const backlinks = await getBacklinks(vaultPath, path);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            targetNote: path,
            backlinkCount: backlinks.length,
            backlinks: backlinks.map((b) => b.sourceFile),
          },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Execute the `get_tags` tool.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param args - Raw tool arguments from the MCP request (empty object).
 * @returns MCP-compatible content with the sorted list of all tags.
 */
export async function handleGetTags(
  vaultPath: string,
  args: unknown,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  GetTagsArgsSchema.parse(args);
  const tags = await getAllTags(vaultPath);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ count: tags.length, tags }, null, 2),
      },
    ],
  };
}

/**
 * Execute the `get_notes_by_tag` tool.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param args - Raw tool arguments from the MCP request.
 * @returns MCP-compatible content with matching note paths.
 * @throws {Error} If validation fails.
 */
export async function handleGetNotesByTag(
  vaultPath: string,
  args: unknown,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { tag } = GetNotesByTagArgsSchema.parse(args);
  const notes = await getNotesByTag(vaultPath, tag);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ tag, count: notes.length, notes }, null, 2),
      },
    ],
  };
}
