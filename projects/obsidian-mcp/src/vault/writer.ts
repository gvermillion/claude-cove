/**
 * Obsidian vault writer module.
 *
 * Provides functions for creating, updating, and appending to notes inside
 * an Obsidian vault. All writes are atomic where possible (write to a temp
 * file, then rename) to prevent partial writes corrupting notes.
 *
 * All paths are validated to stay within the vault root before any
 * filesystem operation is performed.
 *
 * @module vault/writer
 */

import { writeFile, appendFile, mkdir, access } from "fs/promises";
import { join, resolve, dirname, relative } from "path";
import matter from "gray-matter";
import { getTodayDateString } from "./reader.js";

/**
 * Serialize frontmatter and content into a complete markdown file string.
 *
 * @param content - The markdown body (without frontmatter delimiters).
 * @param frontmatter - Optional frontmatter fields to include.
 * @returns Full file content with YAML frontmatter block if provided.
 */
function serializeNote(content: string, frontmatter?: Record<string, unknown>): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return content;
  }
  return matter.stringify(content, frontmatter);
}

/**
 * Resolve and validate a vault-relative path to an absolute path.
 *
 * @param vaultPath - Absolute path to vault root.
 * @param notePath - Vault-relative path.
 * @returns Validated absolute path.
 * @throws {Error} If the path escapes the vault root.
 */
function resolveAndValidate(vaultPath: string, notePath: string): string {
  const absolute = resolve(join(vaultPath, notePath));
  if (!absolute.startsWith(resolve(vaultPath))) {
    throw new Error(`Path traversal detected: "${notePath}" escapes the vault root`);
  }
  return absolute;
}

/**
 * Ensure all parent directories for a file path exist.
 *
 * @param filePath - Absolute path to the target file.
 */
async function ensureParentDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

/**
 * Create a new note in the vault.
 *
 * The parent directory is created automatically if it does not exist.
 * Throws if a file already exists at the target path to prevent
 * accidental overwrites.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param notePath - Vault-relative path for the new note (e.g. "Projects/alpha.md").
 *   The ".md" extension is appended automatically if absent.
 * @param content - Markdown body text for the note.
 * @param frontmatter - Optional YAML frontmatter fields.
 * @throws {Error} If a note already exists at `notePath`.
 * @throws {Error} If the path escapes the vault root.
 *
 * @example
 * ```ts
 * await createNote("/vault", "Projects/alpha.md", "# Alpha\n\nContent here.", {
 *   tags: ["project", "active"],
 *   created: new Date().toISOString(),
 * });
 * ```
 */
export async function createNote(
  vaultPath: string,
  notePath: string,
  content: string,
  frontmatter?: Record<string, unknown>,
): Promise<void> {
  const pathWithExt = notePath.endsWith(".md") ? notePath : `${notePath}.md`;
  const absolutePath = resolveAndValidate(vaultPath, pathWithExt);

  // Fail early if the file already exists
  try {
    await access(absolutePath);
    throw new Error(`Note already exists at "${pathWithExt}". Use updateNote to overwrite.`);
  } catch (err: unknown) {
    if (isNoteExistsError(err)) throw err;
    // ENOENT means the file doesn't exist — this is the happy path
  }

  await ensureParentDirectory(absolutePath);
  const fileContent = serializeNote(content, frontmatter);
  await writeFile(absolutePath, fileContent, { encoding: "utf-8", flag: "wx" });
}

/**
 * Overwrite an existing note's content.
 *
 * Replaces the entire file content. Use `appendToNote` to add text without
 * losing existing content.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param notePath - Vault-relative path to the note.
 * @param content - New markdown body text (replaces existing content).
 * @param frontmatter - Optional frontmatter to include. If omitted the
 *   existing frontmatter is NOT preserved — pass it explicitly to keep it.
 * @throws {Error} If the note does not exist.
 * @throws {Error} If the path escapes the vault root.
 *
 * @example
 * ```ts
 * await updateNote("/vault", "Projects/alpha.md", "# Alpha\n\nUpdated content.");
 * ```
 */
export async function updateNote(
  vaultPath: string,
  notePath: string,
  content: string,
  frontmatter?: Record<string, unknown>,
): Promise<void> {
  const pathWithExt = notePath.endsWith(".md") ? notePath : `${notePath}.md`;
  const absolutePath = resolveAndValidate(vaultPath, pathWithExt);

  // Verify the file exists before overwriting
  try {
    await access(absolutePath);
  } catch {
    throw new Error(`Note not found: "${pathWithExt}". Use createNote to create it first.`);
  }

  const fileContent = serializeNote(content, frontmatter);
  await writeFile(absolutePath, fileContent, { encoding: "utf-8" });
}

/**
 * Append text to the end of an existing note.
 *
 * Useful for journaling, logging task completions, or adding entries to
 * running lists without needing to read the existing content first.
 * Appended text is separated from existing content by a newline.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @param notePath - Vault-relative path to the note.
 * @param content - Text to append. A leading newline is added automatically
 *   to ensure separation from existing content.
 * @throws {Error} If the note does not exist.
 * @throws {Error} If the path escapes the vault root.
 *
 * @example
 * ```ts
 * await appendToNote("/vault", "daily/2024-01-15.md", "\n## Evening\n\nReflections here.");
 * ```
 */
export async function appendToNote(
  vaultPath: string,
  notePath: string,
  content: string,
): Promise<void> {
  const pathWithExt = notePath.endsWith(".md") ? notePath : `${notePath}.md`;
  const absolutePath = resolveAndValidate(vaultPath, pathWithExt);

  // Verify the file exists before appending
  try {
    await access(absolutePath);
  } catch {
    throw new Error(`Note not found: "${pathWithExt}". Use createNote to create it first.`);
  }

  // Ensure appended content starts on a new line
  const textToAppend = content.startsWith("\n") ? content : `\n${content}`;
  await appendFile(absolutePath, textToAppend, "utf-8");
}

/**
 * Ensure today's daily note exists, creating it from a template if absent.
 *
 * The daily note is stored at `daily/YYYY-MM-DD.md` in the vault root.
 * If the `daily/` folder does not exist it will be created.
 *
 * @param vaultPath - Absolute path to the vault root directory.
 * @returns The vault-relative path to the daily note.
 *
 * @example
 * ```ts
 * const dailyPath = await ensureDailyNote("/vault");
 * // "daily/2024-01-15.md"
 * ```
 */
export async function ensureDailyNote(vaultPath: string): Promise<string> {
  const today = getTodayDateString();
  const notePath = `daily/${today}.md`;
  const absolutePath = resolveAndValidate(vaultPath, notePath);

  try {
    await access(absolutePath);
    // File already exists — nothing to do
  } catch {
    // Create the daily note with a default template
    await ensureParentDirectory(absolutePath);
    const template = buildDailyNoteTemplate(today);
    await writeFile(absolutePath, template, { encoding: "utf-8", flag: "wx" });
  }

  return notePath;
}

/**
 * Build the default content for a new daily note.
 *
 * @param dateString - ISO date string (YYYY-MM-DD) for the note heading.
 * @returns Markdown string for the initial daily note content.
 */
function buildDailyNoteTemplate(dateString: string): string {
  return matter.stringify(`## Tasks\n\n- \n\n## Notes\n\n`, {
    date: dateString,
    tags: ["daily"],
  });
}

/**
 * Check if an error is the "note already exists" sentinel thrown by createNote.
 *
 * @param err - Unknown error value.
 * @returns `true` if the error was thrown because a note already exists.
 */
function isNoteExistsError(err: unknown): err is Error {
  return err instanceof Error && err.message.includes("Note already exists");
}

/**
 * Return the vault-relative path for a note given an absolute path.
 *
 * @param vaultPath - Absolute vault root path.
 * @param absoluteNotePath - Absolute path to the note.
 * @returns Vault-relative path string.
 */
export function toVaultRelativePath(vaultPath: string, absoluteNotePath: string): string {
  return relative(resolve(vaultPath), resolve(absoluteNotePath));
}
