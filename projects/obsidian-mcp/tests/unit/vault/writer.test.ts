/**
 * Unit tests for the vault writer module.
 *
 * All filesystem I/O is mocked — no real files are written during tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNote, updateNote, appendToNote, ensureDailyNote } from "../../../src/vault/writer.js";

// ── Filesystem mock ───────────────────────────────────────────────────────────

vi.mock("fs/promises", () => ({
  writeFile: vi.fn(),
  appendFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}));

import { writeFile, appendFile, mkdir, access } from "fs/promises";

const mockWriteFile = vi.mocked(writeFile);
const mockAppendFile = vi.mocked(appendFile);
const mockMkdir = vi.mocked(mkdir);
const mockAccess = vi.mocked(access);

const VAULT = "/test/vault";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("createNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: file does not exist (access throws ENOENT)
    mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  it("creates a note when the file does not exist", async () => {
    // Arrange — access throws (file does not exist), which is the happy path

    // Act
    await createNote(VAULT, "Projects/new.md", "# New Note\n\nContent.");

    // Assert
    expect(mockMkdir).toHaveBeenCalledOnce();
    expect(mockWriteFile).toHaveBeenCalledOnce();
    const [path, content] = mockWriteFile.mock.calls[0]!;
    expect(String(path)).toContain("Projects/new.md");
    expect(String(content)).toContain("# New Note");
  });

  it("includes frontmatter when provided", async () => {
    // Act
    await createNote(VAULT, "Projects/new.md", "Content.", { tags: ["project"], status: "active" });

    // Assert
    const [, content] = mockWriteFile.mock.calls[0]!;
    expect(String(content)).toContain("tags:");
    expect(String(content)).toContain("project");
  });

  it("appends .md extension when omitted", async () => {
    // Act
    await createNote(VAULT, "Projects/no-ext", "Content.");

    // Assert
    const [path] = mockWriteFile.mock.calls[0]!;
    expect(String(path)).toContain("no-ext.md");
  });

  it("throws when the note already exists", async () => {
    // Arrange — access resolves, meaning file exists
    mockAccess.mockResolvedValue(undefined);

    // Act & Assert
    await expect(createNote(VAULT, "Projects/existing.md", "Content.")).rejects.toThrow(
      "Note already exists",
    );
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("throws when path escapes vault root", async () => {
    // Act & Assert
    await expect(createNote(VAULT, "../../evil.md", "Content.")).rejects.toThrow(
      "Path traversal detected",
    );
  });
});

describe("updateNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
  });

  it("overwrites note content when file exists", async () => {
    // Arrange
    mockAccess.mockResolvedValue(undefined);

    // Act
    await updateNote(VAULT, "Projects/existing.md", "# Updated\n\nNew content.");

    // Assert
    expect(mockWriteFile).toHaveBeenCalledOnce();
    const [, content] = mockWriteFile.mock.calls[0]!;
    expect(String(content)).toContain("New content.");
  });

  it("throws when the note does not exist", async () => {
    // Arrange
    mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

    // Act & Assert
    await expect(updateNote(VAULT, "Projects/missing.md", "Content.")).rejects.toThrow(
      "Note not found",
    );
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("includes frontmatter in the written file when provided", async () => {
    // Arrange
    mockAccess.mockResolvedValue(undefined);

    // Act
    await updateNote(VAULT, "notes.md", "Body.", { title: "My Note" });

    // Assert
    const [, content] = mockWriteFile.mock.calls[0]!;
    expect(String(content)).toContain("title:");
  });
});

describe("appendToNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendFile.mockResolvedValue(undefined);
  });

  it("appends content to an existing note", async () => {
    // Arrange
    mockAccess.mockResolvedValue(undefined);

    // Act
    await appendToNote(VAULT, "daily/today.md", "\n## Evening\n\nReflections.");

    // Assert
    expect(mockAppendFile).toHaveBeenCalledOnce();
    const [, content] = mockAppendFile.mock.calls[0]!;
    expect(String(content)).toContain("Reflections.");
  });

  it("prepends a newline when content does not start with one", async () => {
    // Arrange
    mockAccess.mockResolvedValue(undefined);

    // Act
    await appendToNote(VAULT, "daily/today.md", "No leading newline.");

    // Assert
    const [, content] = mockAppendFile.mock.calls[0]!;
    expect(String(content)).toMatch(/^\n/);
  });

  it("does not double the newline when content starts with one", async () => {
    // Arrange
    mockAccess.mockResolvedValue(undefined);

    // Act
    await appendToNote(VAULT, "daily/today.md", "\nAlready has newline.");

    // Assert
    const [, content] = mockAppendFile.mock.calls[0]!;
    expect(String(content)).not.toMatch(/^\n\n/);
    expect(String(content)).toMatch(/^\nAlready has newline\./);
  });

  it("throws when the note does not exist", async () => {
    // Arrange
    mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

    // Act & Assert
    await expect(appendToNote(VAULT, "missing.md", "Content.")).rejects.toThrow(
      "Note not found",
    );
    expect(mockAppendFile).not.toHaveBeenCalled();
  });
});

describe("ensureDailyNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  it("returns the daily note path without creating when it already exists", async () => {
    // Arrange
    mockAccess.mockResolvedValue(undefined);

    // Act
    const result = await ensureDailyNote(VAULT);

    // Assert
    expect(result).toMatch(/^daily\/\d{4}-\d{2}-\d{2}\.md$/);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("creates the daily note when it does not exist", async () => {
    // Arrange
    mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

    // Act
    const result = await ensureDailyNote(VAULT);

    // Assert
    expect(result).toMatch(/^daily\/\d{4}-\d{2}-\d{2}\.md$/);
    expect(mockWriteFile).toHaveBeenCalledOnce();
    const [, content] = mockWriteFile.mock.calls[0]!;
    expect(String(content)).toContain("tags:");
    expect(String(content)).toContain("daily");
  });
});
