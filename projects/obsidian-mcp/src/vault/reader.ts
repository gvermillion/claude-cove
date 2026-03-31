/**
 * Obsidian vault reader module.
 *
 * Provides functions for reading notes and listing vault contents directly
 * from the filesystem. All paths are resolved relative to the vault root to
 * prevent directory traversal attacks.
 *
 * @module vault/reader
 */

import { readFile, readdir, stat } from "fs/promises";
import { join, resolve, relative, extname } from "path";
import matter from "gray-matter";

/** Parsed Obsidian note with content and frontmatter metadata. */
export interface Note {
  /** Vault-relative path of the note (e.g. "daily/2024-01-15.md"). */
  path: string;
  /** Raw markdown content with frontmatter stripped. */
  content: string;
  /** Parsed YAML frontmatter as a plain object. */
  frontmatter: Record<string, unknown>;
  /** Full raw file text including frontmatter delimiters. */
  raw: string;
}

/**
 * Resolve a vault-relative note path to an absolute filesystem path.
 *
 * Ensures the resolved path stays within the vault root to prevent
 * directory traversal attacks.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param notePath - Vault-relative path to the note.
 * @returns Absolute filesystem path.
 * @throws {Error} If the resolved path escapes the vault root.
 */
function resolveNotePath(vaultPath: string, notePath: string): string {
  const absolute = resolve(join(vaultPath, notePath));
  const rel = relative(vaultPath, absolute);

  // Reject paths that start with ".." — they escape the vault root
  if (rel.startsWith("..") || resolve(vaultPath) !== resolve(join(absolute, "..", ".."))) {
    // Use a simpler containment check
    if (!absolute.startsWith(resolve(vaultPath))) {
      throw new Error(`Path traversal detected: "${notePath}" escapes the vault root`);
    }
  }

  return absolute;
}

/**
 * Read a note from the vault and parse its YAML frontmatter.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param notePath - Vault-relative path to the note (e.g. "folder/note.md").
 *   The ".md" extension is optional — it will be appended if absent.
 * @returns Parsed note with frontmatter and body content.
 * @throws {Error} If the file does not exist or cannot be read.
 * @throws {Error} If the resolved path escapes the vault root.
 *
 * @example
 * ```ts
 * const note = await readNote("/vault", "Projects/my-project.md");
 * console.log(note.frontmatter.tags);
 * ```
 */
export async function readNote(vaultPath: string, notePath: string): Promise<Note> {
  const pathWithExt = notePath.endsWith(".md") ? notePath : `${notePath}.md`;
  const absolutePath = resolveNotePath(vaultPath, pathWithExt);

  const raw = await readFile(absolutePath, "utf-8");
  const parsed = matter(raw);

  return {
    path: pathWithExt,
    content: parsed.content,
    frontmatter: parsed.data as Record<string, unknown>,
    raw,
  };
}

/**
 * List all markdown files in a vault folder.
 *
 * Non-markdown files and hidden files (prefixed with ".") are excluded.
 * The listing is not recursive — only the immediate children of the folder
 * are returned.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param folder - Vault-relative folder path. Pass "" or "." for the root.
 * @returns Array of vault-relative paths to .md files in the folder.
 * @throws {Error} If the folder does not exist or the path escapes the vault.
 *
 * @example
 * ```ts
 * const notes = await listFolder("/vault", "Projects");
 * // ["Projects/alpha.md", "Projects/beta.md"]
 * ```
 */
export async function listFolder(vaultPath: string, folder: string): Promise<string[]> {
  const folderPath = folder === "" || folder === "." ? vaultPath : resolveNotePath(vaultPath, folder);

  const entries = await readdir(folderPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && extname(entry.name) === ".md" && !entry.name.startsWith("."))
    .map((entry) => {
      const rel = relative(vaultPath, join(folderPath, entry.name));
      return rel;
    })
    .sort();
}

/**
 * Read today's daily note from the vault.
 *
 * Looks for a file named `YYYY-MM-DD.md` inside the `daily/` folder at the
 * vault root. The date is determined from the system clock in local time.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @returns The daily note, or `null` if it does not exist yet.
 *
 * @example
 * ```ts
 * const today = await getDailyNote("/vault");
 * if (!today) console.log("No daily note yet — create one with ensureDailyNote");
 * ```
 */
export async function getDailyNote(vaultPath: string): Promise<Note | null> {
  const today = getTodayDateString();
  const notePath = `daily/${today}.md`;

  try {
    return await readNote(vaultPath, notePath);
  } catch (err: unknown) {
    // File not found is an expected condition — return null
    if (isNodeError(err) && (err.code === "ENOENT" || err.code === "ENOTDIR")) {
      return null;
    }
    throw err;
  }
}

/**
 * Check whether a note exists in the vault.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param notePath - Vault-relative path to the note.
 * @returns `true` if the file exists and is a regular file.
 */
export async function noteExists(vaultPath: string, notePath: string): Promise<boolean> {
  const pathWithExt = notePath.endsWith(".md") ? notePath : `${notePath}.md`;
  try {
    const absolutePath = resolveNotePath(vaultPath, pathWithExt);
    const s = await stat(absolutePath);
    return s.isFile();
  } catch {
    return false;
  }
}

/**
 * Return today's date as a zero-padded ISO string: `YYYY-MM-DD`.
 *
 * @returns ISO date string for today in local time.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Type guard for Node.js filesystem errors.
 *
 * @param err - Unknown caught value.
 * @returns `true` if `err` has a `code` string property (NodeJS.ErrnoException).
 */
function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return typeof err === "object" && err !== null && "code" in err;
}
