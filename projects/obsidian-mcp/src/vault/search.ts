/**
 * Obsidian vault full-text search module.
 *
 * Uses ripgrep (`rg`) as the search backend via child_process for fast,
 * recursive full-text search across all markdown files in the vault.
 * Falls back gracefully when ripgrep is not available in the PATH.
 *
 * @module vault/search
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { resolve } from "path";

const execFileAsync = promisify(execFile);

/** A single match returned by a vault search. */
export interface SearchMatch {
  /** Vault-relative path of the file containing the match. */
  filePath: string;
  /** 1-based line number where the match was found. */
  lineNumber: number;
  /** The full text of the matching line. */
  snippet: string;
}

/** Options controlling how vault search behaves. */
export interface SearchOptions {
  /**
   * Limit results to files inside this vault-relative subdirectory.
   * Omit to search the entire vault.
   */
  folder?: string | undefined;
  /** Maximum number of matches to return. Defaults to 50. */
  maxResults?: number | undefined;
  /** Whether the search should be case-insensitive. Defaults to `true`. */
  caseInsensitive?: boolean | undefined;
}

/** Result returned from `searchVault`. */
export interface SearchResult {
  /** Ordered list of matches, up to `maxResults`. */
  matches: SearchMatch[];
  /** Whether ripgrep was available and used. */
  usedRipgrep: boolean;
  /** Total number of matches found (may exceed `maxResults`). */
  totalFound: number;
}

/**
 * Search all markdown files in the vault for a query string.
 *
 * Uses ripgrep for high performance. If `rg` is not found in the PATH
 * the function falls back to a slower Node.js-based implementation that
 * reads each file individually.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param query - Text or regex pattern to search for.
 * @param options - Optional search configuration.
 * @returns Search results including matches and metadata.
 *
 * @example
 * ```ts
 * const results = await searchVault("/vault", "project alpha", { maxResults: 20 });
 * for (const match of results.matches) {
 *   console.log(`${match.filePath}:${match.lineNumber}: ${match.snippet}`);
 * }
 * ```
 */
export async function searchVault(
  vaultPath: string,
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult> {
  const { folder, maxResults = 50, caseInsensitive = true } = options;

  const searchRoot = folder
    ? resolve(vaultPath, folder)
    : resolve(vaultPath);

  try {
    return await searchWithRipgrep(searchRoot, vaultPath, query, maxResults, caseInsensitive);
  } catch (err: unknown) {
    if (isRipgrepNotFoundError(err)) {
      return await searchWithNodeFallback(searchRoot, vaultPath, query, maxResults, caseInsensitive);
    }
    throw err;
  }
}

/**
 * Search using ripgrep subprocess for maximum performance.
 *
 * @param searchRoot - Absolute directory to search in.
 * @param vaultPath - Absolute vault root for computing relative paths.
 * @param query - Search query or pattern.
 * @param maxResults - Maximum matches to return.
 * @param caseInsensitive - Whether to ignore case.
 * @returns Parsed search results.
 */
async function searchWithRipgrep(
  searchRoot: string,
  vaultPath: string,
  query: string,
  maxResults: number,
  caseInsensitive: boolean,
): Promise<SearchResult> {
  const args = [
    "--line-number",
    "--with-filename",
    "--glob",
    "*.md",
    "--no-heading",
    "--color",
    "never",
    // Limit total matches for predictable output size
    "--max-count",
    String(maxResults * 2),
  ];

  if (caseInsensitive) {
    args.push("--ignore-case");
  }

  args.push(query, searchRoot);

  const { stdout } = await execFileAsync("rg", args, { maxBuffer: 4 * 1024 * 1024 });

  const matches = parseRipgrepOutput(stdout, vaultPath);
  const limited = matches.slice(0, maxResults);

  return {
    matches: limited,
    usedRipgrep: true,
    totalFound: matches.length,
  };
}

/**
 * Parse ripgrep line-number output into SearchMatch objects.
 *
 * Each output line has the format: `path/to/file.md:lineNum:content`
 *
 * @param output - Raw stdout string from ripgrep.
 * @param vaultPath - Absolute vault root for computing relative paths.
 * @returns Array of parsed matches.
 */
function parseRipgrepOutput(output: string, vaultPath: string): SearchMatch[] {
  const lines = output.split("\n").filter((line) => line.trim() !== "");
  const resolvedVault = resolve(vaultPath);
  const matches: SearchMatch[] = [];

  for (const line of lines) {
    // Format: /absolute/path/to/file.md:lineNum:snippet text
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const afterFirst = line.indexOf(":", colonIndex + 1);
    if (afterFirst === -1) continue;

    const rawPath = line.slice(0, colonIndex);
    const lineNumStr = line.slice(colonIndex + 1, afterFirst);
    const snippet = line.slice(afterFirst + 1);

    const lineNum = parseInt(lineNumStr, 10);
    if (isNaN(lineNum)) continue;

    // Convert absolute path to vault-relative
    const absoluteResolved = resolve(rawPath);
    const relativePath = absoluteResolved.startsWith(resolvedVault + "/")
      ? absoluteResolved.slice(resolvedVault.length + 1)
      : absoluteResolved;

    matches.push({
      filePath: relativePath,
      lineNumber: lineNum,
      snippet: snippet.trim(),
    });
  }

  return matches;
}

/**
 * Fallback search implementation using Node.js `fs` when ripgrep is unavailable.
 *
 * Reads all markdown files recursively and scans each for the query string.
 * Significantly slower than ripgrep for large vaults.
 *
 * @param searchRoot - Absolute directory to search in.
 * @param vaultPath - Absolute vault root for computing relative paths.
 * @param query - Plain text query (not treated as regex in fallback mode).
 * @param maxResults - Maximum matches to return.
 * @param caseInsensitive - Whether to ignore case.
 * @returns Search results marked as not using ripgrep.
 */
async function searchWithNodeFallback(
  searchRoot: string,
  vaultPath: string,
  query: string,
  maxResults: number,
  caseInsensitive: boolean,
): Promise<SearchResult> {
  const { readdir, readFile, stat } = await import("fs/promises");
  const { join, relative } = await import("path");

  const matches: SearchMatch[] = [];
  const normalizedQuery = caseInsensitive ? query.toLowerCase() : query;

  async function scanDirectory(dir: string): Promise<void> {
    if (matches.length >= maxResults * 2) return;

    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (matches.length >= maxResults * 2) break;
      if (entry.name.startsWith(".")) continue;

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const fileStat = await stat(fullPath);
        if (!fileStat.isFile()) continue;

        const content = await readFile(fullPath, "utf-8");
        const lines = content.split("\n");
        const relativePath = relative(resolve(vaultPath), resolve(fullPath));

        lines.forEach((line, index) => {
          if (matches.length >= maxResults * 2) return;
          const searchLine = caseInsensitive ? line.toLowerCase() : line;
          if (searchLine.includes(normalizedQuery)) {
            matches.push({
              filePath: relativePath,
              lineNumber: index + 1,
              snippet: line.trim(),
            });
          }
        });
      }
    }
  }

  await scanDirectory(searchRoot);

  return {
    matches: matches.slice(0, maxResults),
    usedRipgrep: false,
    totalFound: matches.length,
  };
}

/**
 * Determine whether a caught error indicates that ripgrep was not found.
 *
 * @param err - Unknown error value from execFile.
 * @returns `true` if the error is an ENOENT from attempting to spawn `rg`.
 */
function isRipgrepNotFoundError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const nodeErr = err as NodeJS.ErrnoException;
  // ENOENT when spawning indicates the executable was not found
  return nodeErr.code === "ENOENT";
}
