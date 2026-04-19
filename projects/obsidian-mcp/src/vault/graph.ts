/**
 * Obsidian vault graph module.
 *
 * Builds and queries a backlinks index by scanning all markdown files for
 * Obsidian-style `[[wikilink]]` references. Also aggregates tags from YAML
 * frontmatter across the vault.
 *
 * This module operates on raw file content to avoid circular dependencies
 * with the reader module — it reads files directly for bulk scan operations.
 *
 * @module vault/graph
 */

import { readdir, readFile } from "fs/promises";
import { join, resolve, relative, basename, extname } from "path";
import matter from "gray-matter";

/** Index mapping a note name (without extension) to the set of files linking to it. */
export type BacklinksIndex = Map<string, Set<string>>;

/** A single backlink relationship. */
export interface Backlink {
  /** Vault-relative path of the note that contains the link. */
  sourceFile: string;
  /** The raw wikilink text as it appeared (e.g. "My Note" or "folder/note"). */
  linkText: string;
}

/**
 * Scan all markdown files in the vault and build a backlinks index.
 *
 * Parses every `[[wikilink]]` and `[[wikilink|alias]]` occurrence in each file.
 * The link target is normalised to lowercase for case-insensitive matching.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @returns A map from normalised note name to the set of vault-relative paths
 *   that link to it.
 *
 * @example
 * ```ts
 * const index = await buildBacklinksIndex("/vault");
 * const sources = index.get("projects/alpha") ?? new Set();
 * console.log([...sources]); // ["daily/2024-01-15.md", "index.md"]
 * ```
 */
export async function buildBacklinksIndex(vaultPath: string): Promise<BacklinksIndex> {
  const index: BacklinksIndex = new Map();
  const allFiles = await collectMarkdownFiles(vaultPath);
  const resolvedVault = resolve(vaultPath);

  for (const absolutePath of allFiles) {
    const content = await readFile(absolutePath, "utf-8");
    const relativeSource = relative(resolvedVault, absolutePath);
    const wikilinks = extractWikilinks(content);

    for (const linkText of wikilinks) {
      // Normalise: strip alias portion (after "|"), lowercase, strip .md extension
      const normalised = normaliseLinkTarget(linkText);

      if (!index.has(normalised)) {
        index.set(normalised, new Set());
      }

      index.get(normalised)!.add(relativeSource);
    }
  }

  return index;
}

/**
 * Return all vault-relative paths that contain a `[[link]]` pointing to `notePath`.
 *
 * Builds a fresh backlinks index on each call. For repeated lookups, call
 * `buildBacklinksIndex` once and query the returned map directly.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param notePath - Vault-relative path of the note to find backlinks for
 *   (e.g. "Projects/alpha.md").
 * @returns Array of `Backlink` objects representing each linking note.
 *
 * @example
 * ```ts
 * const links = await getBacklinks("/vault", "Projects/alpha.md");
 * console.log(links.map(l => l.sourceFile));
 * ```
 */
export async function getBacklinks(vaultPath: string, notePath: string): Promise<Backlink[]> {
  const index = await buildBacklinksIndex(vaultPath);

  // Normalise the target path the same way links are normalised
  const normalisedTarget = normaliseLinkTarget(notePath);
  const sources = index.get(normalisedTarget) ?? new Set();

  // Also check by bare name (without folder prefix) since Obsidian allows bare links
  const bareName = normaliseLinkTarget(basename(notePath, ".md"));
  const bareSources = index.get(bareName) ?? new Set();

  const allSources = new Set([...sources, ...bareSources]);

  return [...allSources].map((sourceFile) => ({
    sourceFile,
    linkText: bareName,
  }));
}

/**
 * Collect all unique tags from YAML frontmatter across all notes in the vault.
 *
 * Tags are collected from the `tags` frontmatter field, which may be either a
 * string or an array of strings. Tags are returned in sorted order.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @returns Sorted array of unique tag strings (without the `#` prefix).
 *
 * @example
 * ```ts
 * const tags = await getAllTags("/vault");
 * console.log(tags); // ["daily", "project", "research"]
 * ```
 */
export async function getAllTags(vaultPath: string): Promise<string[]> {
  const allFiles = await collectMarkdownFiles(vaultPath);
  const tagSet = new Set<string>();

  for (const absolutePath of allFiles) {
    const content = await readFile(absolutePath, "utf-8");
    const tags = extractTagsFromContent(content);
    tags.forEach((tag) => tagSet.add(tag));
  }

  return [...tagSet].sort();
}

/**
 * Find all notes that have a specific tag in their frontmatter.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param tag - Tag to search for (without the `#` prefix).
 * @returns Sorted array of vault-relative paths for notes with the given tag.
 *
 * @example
 * ```ts
 * const notes = await getNotesByTag("/vault", "project");
 * console.log(notes); // ["Projects/alpha.md", "Projects/beta.md"]
 * ```
 */
export async function getNotesByTag(vaultPath: string, tag: string): Promise<string[]> {
  const allFiles = await collectMarkdownFiles(vaultPath);
  const resolvedVault = resolve(vaultPath);
  const results: string[] = [];
  const normalisedTag = tag.toLowerCase().trim();

  for (const absolutePath of allFiles) {
    const content = await readFile(absolutePath, "utf-8");
    const tags = extractTagsFromContent(content);

    if (tags.some((t) => t.toLowerCase() === normalisedTag)) {
      results.push(relative(resolvedVault, absolutePath));
    }
  }

  return results.sort();
}

/**
 * Recursively collect all `.md` file paths under a directory.
 *
 * Hidden files and directories (prefixed with ".") are skipped.
 *
 * @param dir - Absolute directory path to scan.
 * @returns Array of absolute paths to all markdown files found.
 */
async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  async function scan(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && extname(entry.name) === ".md") {
        results.push(fullPath);
      }
    }
  }

  await scan(dir);
  return results;
}

/**
 * Extract all wikilink targets from a markdown string.
 *
 * Handles both plain `[[Note Name]]` and aliased `[[Note Name|Display Text]]` forms.
 * Embedded image links `![[image.png]]` are excluded.
 *
 * @param content - Raw markdown file content.
 * @returns Array of raw link target strings (before alias stripping).
 */
function extractWikilinks(content: string): string[] {
  // Match [[link]] and [[link|alias]] but not ![[embedded]]
  const wikilinkPattern = /(?<!!)\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = wikilinkPattern.exec(content)) !== null) {
    const linkTarget = match[1];
    if (linkTarget !== undefined) {
      links.push(linkTarget.trim());
    }
  }

  return links;
}

/**
 * Extract the tag list from a note's raw content.
 *
 * Supports frontmatter `tags` as a YAML array or a single string value.
 *
 * @param content - Raw markdown file content (with optional frontmatter).
 * @returns Array of tag strings.
 */
function extractTagsFromContent(content: string): string[] {
  try {
    const parsed = matter(content);
    const tags = parsed.data["tags"];

    if (Array.isArray(tags)) {
      return tags.filter((t): t is string => typeof t === "string");
    }

    if (typeof tags === "string" && tags.trim() !== "") {
      return [tags.trim()];
    }
  } catch {
    // Malformed frontmatter — skip this file's tags
  }

  return [];
}

/**
 * Normalise a wikilink target or note path for index lookup.
 *
 * - Strips alias portion after "|"
 * - Strips ".md" extension
 * - Lowercases the result
 * - Trims whitespace
 *
 * @param linkText - Raw wikilink target or note path.
 * @returns Normalised string suitable for index key comparison.
 */
function normaliseLinkTarget(linkText: string): string {
  const withoutAlias = linkText.split("|")[0] ?? linkText;
  const withoutExt = withoutAlias.endsWith(".md")
    ? withoutAlias.slice(0, -3)
    : withoutAlias;
  return withoutExt.trim().toLowerCase();
}
