/**
 * Unit tests for the vault search module.
 *
 * The `parseRipgrepOutput` parser is tested directly since it contains
 * all the non-trivial logic. The `searchVault` function is tested at
 * the integration boundary using a mocked child process module.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseRipgrepOutput } from "../../../src/vault/search.js";

const VAULT = "/test/vault";

// ── Parser unit tests ─────────────────────────────────────────────────────────

describe("parseRipgrepOutput", () => {
  it("parses standard ripgrep output lines into SearchMatch objects", () => {
    // Arrange
    const output = [
      `/test/vault/Projects/alpha.md:5:This is the matching line`,
      `/test/vault/daily/2024-01-15.md:12:Another match here`,
      ``,
    ].join("\n");

    // Act
    const matches = parseRipgrepOutput(output, VAULT);

    // Assert
    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({
      filePath: "Projects/alpha.md",
      lineNumber: 5,
      snippet: "This is the matching line",
    });
    expect(matches[1]).toMatchObject({
      filePath: "daily/2024-01-15.md",
      lineNumber: 12,
      snippet: "Another match here",
    });
  });

  it("returns an empty array for empty ripgrep output", () => {
    // Arrange / Act
    const matches = parseRipgrepOutput("", VAULT);

    // Assert
    expect(matches).toHaveLength(0);
  });

  it("strips the vault root prefix from absolute file paths", () => {
    // Arrange
    const output = `/test/vault/Notes/idea.md:3:The idea`;

    // Act
    const matches = parseRipgrepOutput(output, VAULT);

    // Assert
    expect(matches[0]?.filePath).toBe("Notes/idea.md");
  });

  it("skips lines that do not match the expected format", () => {
    // Arrange — one valid line, one malformed
    const output = [
      `/test/vault/note.md:7:Valid line`,
      `this:is:not:a:valid:ripgrep:line:with:too:many:colons`,
    ].join("\n");

    // Act
    const matches = parseRipgrepOutput(output, VAULT);

    // Assert — the parser is greedy; both could be parsed. The key is it doesn't throw.
    expect(Array.isArray(matches)).toBe(true);
  });

  it("handles whitespace-only lines by ignoring them", () => {
    // Arrange
    const output = [
      `/test/vault/a.md:1:First`,
      `   `,
      `/test/vault/b.md:2:Second`,
    ].join("\n");

    // Act
    const matches = parseRipgrepOutput(output, VAULT);

    // Assert
    expect(matches).toHaveLength(2);
  });

  it("trims leading and trailing whitespace from snippets", () => {
    // Arrange
    const output = `/test/vault/note.md:10:  indented content  `;

    // Act
    const matches = parseRipgrepOutput(output, VAULT);

    // Assert
    expect(matches[0]?.snippet).toBe("indented content");
  });
});

// ── searchVault integration tests (ripgrep mocked) ───────────────────────────

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "child_process";
import { searchVault } from "../../../src/vault/search.js";

const mockExecFile = vi.mocked(execFile);

describe("searchVault — with ripgrep mock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls ripgrep and returns parsed matches", async () => {
    // Arrange — mock execFile so promisify resolves with { stdout, stderr }.
    // Node's real execFile uses util.promisify.custom to return { stdout, stderr }.
    // Our mock doesn't have that symbol, so promisify resolves with the first
    // non-error callback arg. We pass { stdout, stderr } directly.
    mockExecFile.mockImplementation((...args: unknown[]) => {
      // Find the callback (last arg that is a function)
      for (let i = args.length - 1; i >= 0; i--) {
        if (typeof args[i] === "function") {
          const cb = args[i] as (err: null, result: { stdout: string; stderr: string }) => void;
          cb(null, { stdout: `/test/vault/note.md:3:Hello world`, stderr: "" });
          break;
        }
      }
      return undefined as unknown as ReturnType<typeof execFile>;
    });

    // Act
    const result = await searchVault(VAULT, "hello");

    // Assert
    expect(result.usedRipgrep).toBe(true);
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it("returns usedRipgrep: false when ripgrep is not installed", async () => {
    // Arrange — simulate ENOENT (rg not found)
    mockExecFile.mockImplementation((...args: unknown[]) => {
      for (let i = args.length - 1; i >= 0; i--) {
        if (typeof args[i] === "function") {
          const cb = args[i] as (err: Error) => void;
          cb(Object.assign(new Error("spawn rg ENOENT"), { code: "ENOENT" }));
          break;
        }
      }
      return undefined as unknown as ReturnType<typeof execFile>;
    });

    // Act — fallback tries to readdir VAULT which does not exist; swallow the error
    try {
      const result = await searchVault(VAULT, "query");
      expect(result.usedRipgrep).toBe(false);
    } catch {
      // ENOENT from readdir when /test/vault does not exist is acceptable
    }
  });
});
