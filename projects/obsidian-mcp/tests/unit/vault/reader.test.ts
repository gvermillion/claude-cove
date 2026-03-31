/**
 * Unit tests for the vault reader module.
 *
 * All filesystem I/O is mocked via vitest's `vi.mock` — no real files are
 * read during these tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readNote, listFolder, getDailyNote, getTodayDateString, noteExists } from "../../../src/vault/reader.js";

// ── Filesystem mock ───────────────────────────────────────────────────────────

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}));

import { readFile, readdir, stat } from "fs/promises";
import type { Dirent, Stats } from "fs";

const mockReadFile = vi.mocked(readFile);
const mockReaddir = vi.mocked(readdir);
const mockStat = vi.mocked(stat);

// ── Helpers ───────────────────────────────────────────────────────────────────

const VAULT = "/test/vault";

function makeDirent(name: string, isFile: boolean): Dirent {
  return {
    name,
    isFile: () => isFile,
    isDirectory: () => !isFile,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    path: "",
    parentPath: "",
  } as unknown as Dirent;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("readNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads a note and parses frontmatter correctly", async () => {
    // Arrange
    const raw = `---\ntitle: Test Note\ntags:\n  - project\n---\n\n# Test\n\nBody text here.`;
    mockReadFile.mockResolvedValue(raw as unknown as Buffer);

    // Act
    const note = await readNote(VAULT, "Projects/test.md");

    // Assert
    expect(note.path).toBe("Projects/test.md");
    expect(note.frontmatter).toEqual({ title: "Test Note", tags: ["project"] });
    expect(note.content).toContain("Body text here.");
    expect(note.raw).toBe(raw);
  });

  it("appends .md extension when omitted", async () => {
    // Arrange
    mockReadFile.mockResolvedValue("# No frontmatter\n\nContent." as unknown as Buffer);

    // Act
    const note = await readNote(VAULT, "Projects/test");

    // Assert
    expect(note.path).toBe("Projects/test.md");
  });

  it("returns empty frontmatter for notes without YAML block", async () => {
    // Arrange
    mockReadFile.mockResolvedValue("# Plain Note\n\nJust text." as unknown as Buffer);

    // Act
    const note = await readNote(VAULT, "plain.md");

    // Assert
    expect(note.frontmatter).toEqual({});
    expect(note.content).toContain("Just text.");
  });

  it("throws when note path escapes vault root", async () => {
    // Arrange — no filesystem mock needed, error thrown before I/O

    // Act & Assert
    await expect(readNote(VAULT, "../../etc/passwd")).rejects.toThrow(
      "Path traversal detected",
    );
  });

  it("propagates readFile errors", async () => {
    // Arrange
    mockReadFile.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

    // Act & Assert
    await expect(readNote(VAULT, "missing.md")).rejects.toThrow("ENOENT");
  });
});

describe("listFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sorted vault-relative paths for .md files", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([
      makeDirent("beta.md", true),
      makeDirent("alpha.md", true),
      makeDirent("readme.txt", true),
      makeDirent("subfolder", false),
    ] as Dirent[]);

    // Act
    const result = await listFolder(VAULT, "Projects");

    // Assert
    expect(result).toEqual(["Projects/alpha.md", "Projects/beta.md"]);
  });

  it("excludes hidden files starting with a dot", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([
      makeDirent(".obsidian", false),
      makeDirent(".DS_Store", true),
      makeDirent("visible.md", true),
    ] as Dirent[]);

    // Act
    const result = await listFolder(VAULT, "");

    // Assert
    expect(result).toEqual(["visible.md"]);
  });

  it("returns empty array when folder contains no markdown files", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([
      makeDirent("image.png", true),
      makeDirent("data.csv", true),
    ] as Dirent[]);

    // Act
    const result = await listFolder(VAULT, "Assets");

    // Assert
    expect(result).toEqual([]);
  });
});

describe("getDailyNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when today's daily note does not exist", async () => {
    // Arrange
    const enoent = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    mockReadFile.mockRejectedValue(enoent);

    // Act
    const result = await getDailyNote(VAULT);

    // Assert
    expect(result).toBeNull();
  });

  it("returns the daily note when it exists", async () => {
    // Arrange
    const today = getTodayDateString();
    const raw = `---\ndate: ${today}\ntags:\n  - daily\n---\n\n## Tasks\n\n- Write tests\n`;
    mockReadFile.mockResolvedValue(raw as unknown as Buffer);

    // Act
    const result = await getDailyNote(VAULT);

    // Assert
    expect(result).not.toBeNull();
    expect(result!.path).toBe(`daily/${today}.md`);
    expect(result!.frontmatter["tags"]).toEqual(["daily"]);
  });
});

describe("getTodayDateString", () => {
  it("returns a string matching YYYY-MM-DD format", () => {
    // Act
    const result = getTodayDateString();

    // Assert
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns a parseable date", () => {
    // Act
    const result = getTodayDateString();
    const parsed = new Date(result);

    // Assert
    expect(isNaN(parsed.getTime())).toBe(false);
  });
});

describe("noteExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when the file exists", async () => {
    // Arrange
    mockStat.mockResolvedValue({ isFile: () => true } as Stats);

    // Act
    const result = await noteExists(VAULT, "Projects/alpha.md");

    // Assert
    expect(result).toBe(true);
  });

  it("returns false when the file does not exist", async () => {
    // Arrange
    mockStat.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

    // Act
    const result = await noteExists(VAULT, "Projects/missing.md");

    // Assert
    expect(result).toBe(false);
  });

  it("returns false for paths that escape the vault root", async () => {
    // Act
    const result = await noteExists(VAULT, "../../etc/passwd");

    // Assert
    expect(result).toBe(false);
  });
});
