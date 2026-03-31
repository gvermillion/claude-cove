/**
 * Unit tests for the vault graph module.
 *
 * Mocks the filesystem to provide deterministic vault content for backlink
 * indexing and tag aggregation tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildBacklinksIndex, getBacklinks, getAllTags, getNotesByTag } from "../../../src/vault/graph.js";

// ── Filesystem mock ───────────────────────────────────────────────────────────

vi.mock("fs/promises", () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
  access: vi.fn(),
  writeFile: vi.fn(),
  appendFile: vi.fn(),
  mkdir: vi.fn(),
}));

import { readdir, readFile } from "fs/promises";
import type { Dirent } from "fs";

const mockReaddir = vi.mocked(readdir);
const mockReadFile = vi.mocked(readFile);

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

describe("buildBacklinksIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds an index from a vault with wikilinks", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([
      makeDirent("alpha.md", true),
      makeDirent("beta.md", true),
    ] as Dirent[]);

    mockReadFile
      .mockResolvedValueOnce("# Alpha\n\nReferences [[beta]] and [[gamma]]." as unknown as Buffer)
      .mockResolvedValueOnce("# Beta\n\nLinks back to [[Alpha]]." as unknown as Buffer);

    // Act
    const index = await buildBacklinksIndex(VAULT);

    // Assert
    expect(index.has("beta")).toBe(true);
    expect(index.get("beta")!.has("alpha.md")).toBe(true);

    expect(index.has("gamma")).toBe(true);
    expect(index.get("gamma")!.has("alpha.md")).toBe(true);

    expect(index.has("alpha")).toBe(true);
    expect(index.get("alpha")!.has("beta.md")).toBe(true);
  });

  it("ignores embedded image links ![[image.png]]", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([makeDirent("note.md", true)] as Dirent[]);
    mockReadFile.mockResolvedValue(
      "# Note\n\n![[diagram.png]]\n\nSee [[other-note]]." as unknown as Buffer,
    );

    // Act
    const index = await buildBacklinksIndex(VAULT);

    // Assert
    expect(index.has("diagram.png")).toBe(false);
    expect(index.has("other-note")).toBe(true);
  });

  it("handles wikilinks with aliases [[Link|Display Text]]", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([makeDirent("note.md", true)] as Dirent[]);
    mockReadFile.mockResolvedValue(
      "See [[Projects/alpha|Alpha Project]] for details." as unknown as Buffer,
    );

    // Act
    const index = await buildBacklinksIndex(VAULT);

    // Assert
    expect(index.has("projects/alpha")).toBe(true);
  });

  it("returns an empty index when no files exist", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([] as Dirent[]);

    // Act
    const index = await buildBacklinksIndex(VAULT);

    // Assert
    expect(index.size).toBe(0);
  });
});

describe("getBacklinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns source files that link to the target note", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([
      makeDirent("index.md", true),
      makeDirent("daily.md", true),
    ] as Dirent[]);

    mockReadFile
      .mockResolvedValueOnce("[[Projects/alpha]] is active." as unknown as Buffer)
      .mockResolvedValueOnce("Worked on [[alpha]] today." as unknown as Buffer);

    // Act
    const result = await getBacklinks(VAULT, "Projects/alpha.md");

    // Assert — both files link to alpha (one by full path, one by bare name)
    const sourceFiles = result.map((b) => b.sourceFile);
    expect(sourceFiles).toContain("index.md");
    expect(sourceFiles).toContain("daily.md");
  });

  it("returns empty array when no files link to the target", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([makeDirent("unrelated.md", true)] as Dirent[]);
    mockReadFile.mockResolvedValue("# Unrelated\n\nNo links here." as unknown as Buffer);

    // Act
    const result = await getBacklinks(VAULT, "Projects/orphan.md");

    // Assert
    expect(result).toHaveLength(0);
  });
});

describe("getAllTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("collects unique tags from all notes frontmatter", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([
      makeDirent("alpha.md", true),
      makeDirent("beta.md", true),
      makeDirent("gamma.md", true),
    ] as Dirent[]);

    mockReadFile
      .mockResolvedValueOnce(
        "---\ntags:\n  - project\n  - active\n---\n\nContent." as unknown as Buffer,
      )
      .mockResolvedValueOnce(
        "---\ntags:\n  - research\n  - project\n---\n\nContent." as unknown as Buffer,
      )
      .mockResolvedValueOnce("# No tags\n\nNo frontmatter." as unknown as Buffer);

    // Act
    const tags = await getAllTags(VAULT);

    // Assert
    expect(tags).toEqual(["active", "project", "research"]); // sorted, deduplicated
  });

  it("returns empty array when no notes have tags", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([makeDirent("plain.md", true)] as Dirent[]);
    mockReadFile.mockResolvedValue("# Plain\n\nNo tags." as unknown as Buffer);

    // Act
    const tags = await getAllTags(VAULT);

    // Assert
    expect(tags).toEqual([]);
  });
});

describe("getNotesByTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns vault-relative paths of notes matching the tag", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([
      makeDirent("alpha.md", true),
      makeDirent("beta.md", true),
      makeDirent("gamma.md", true),
    ] as Dirent[]);

    mockReadFile
      .mockResolvedValueOnce(
        "---\ntags:\n  - project\n---\n\nContent." as unknown as Buffer,
      )
      .mockResolvedValueOnce(
        "---\ntags:\n  - research\n---\n\nContent." as unknown as Buffer,
      )
      .mockResolvedValueOnce(
        "---\ntags:\n  - project\n---\n\nContent." as unknown as Buffer,
      );

    // Act
    const result = await getNotesByTag(VAULT, "project");

    // Assert
    expect(result).toHaveLength(2);
    expect(result).toContain("alpha.md");
    expect(result).toContain("gamma.md");
  });

  it("performs case-insensitive tag matching", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([makeDirent("note.md", true)] as Dirent[]);
    mockReadFile.mockResolvedValue(
      "---\ntags:\n  - Project\n---\n\nContent." as unknown as Buffer,
    );

    // Act
    const result = await getNotesByTag(VAULT, "project");

    // Assert
    expect(result).toContain("note.md");
  });

  it("returns empty array when no notes match the tag", async () => {
    // Arrange
    mockReaddir.mockResolvedValue([makeDirent("note.md", true)] as Dirent[]);
    mockReadFile.mockResolvedValue(
      "---\ntags:\n  - other\n---\n\nContent." as unknown as Buffer,
    );

    // Act
    const result = await getNotesByTag(VAULT, "nonexistent");

    // Assert
    expect(result).toEqual([]);
  });
});
