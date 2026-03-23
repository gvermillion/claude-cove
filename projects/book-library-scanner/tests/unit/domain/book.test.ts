/**
 * Unit tests for domain/book — types, schemas, and factory functions.
 */

import { describe, it, expect } from "vitest";
import {
  BookSchema,
  LibraryEntrySchema,
  ReadStatus,
  createLibraryEntry,
  type Book,
} from "@/domain/book";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const VALID_BOOK: Book = {
  isbn: "9780743273565",
  title: "The Great Gatsby",
  authors: ["F. Scott Fitzgerald"],
  publishedYear: 1925,
  publisher: "Scribner",
  pageCount: 180,
  language: "en",
  description: "A novel about the American Dream.",
  genres: ["Fiction", "Classic"],
  coverUrl: "https://covers.openlibrary.org/b/id/8227640-L.jpg",
  metadataSource: "open_library",
};

// ---------------------------------------------------------------------------
// BookSchema
// ---------------------------------------------------------------------------

describe("BookSchema", () => {
  it("validates a well-formed book", () => {
    const result = BookSchema.safeParse(VALID_BOOK);
    expect(result.success).toBe(true);
  });

  it("rejects a book with an empty title", () => {
    const result = BookSchema.safeParse({ ...VALID_BOOK, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a book with no authors", () => {
    const result = BookSchema.safeParse({ ...VALID_BOOK, authors: [] });
    expect(result.success).toBe(false);
  });

  it("allows nullable optional fields", () => {
    const minimal: Book = {
      ...VALID_BOOK,
      publishedYear: null,
      publisher: null,
      pageCount: null,
      language: null,
      description: null,
      coverUrl: null,
      genres: [],
    };
    expect(BookSchema.safeParse(minimal).success).toBe(true);
  });

  it("rejects an invalid cover URL", () => {
    const result = BookSchema.safeParse({
      ...VALID_BOOK,
      coverUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createLibraryEntry
// ---------------------------------------------------------------------------

describe("createLibraryEntry", () => {
  it("sets readStatus to unread by default", () => {
    const entry = createLibraryEntry(VALID_BOOK);
    expect(entry.readStatus).toBe(ReadStatus.UNREAD);
  });

  it("sets rating to null by default", () => {
    const entry = createLibraryEntry(VALID_BOOK);
    expect(entry.rating).toBeNull();
  });

  it("sets notes to an empty string by default", () => {
    const entry = createLibraryEntry(VALID_BOOK);
    expect(entry.notes).toBe("");
  });

  it("sets finishedAt to null by default", () => {
    const entry = createLibraryEntry(VALID_BOOK);
    expect(entry.finishedAt).toBeNull();
  });

  it("copies all book fields onto the entry", () => {
    const entry = createLibraryEntry(VALID_BOOK);
    expect(entry.isbn).toBe(VALID_BOOK.isbn);
    expect(entry.title).toBe(VALID_BOOK.title);
    expect(entry.authors).toEqual(VALID_BOOK.authors);
  });

  it("sets addedAt to approximately now", () => {
    const before = new Date();
    const entry = createLibraryEntry(VALID_BOOK);
    const after = new Date();
    expect(entry.addedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(entry.addedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("produces an entry that passes LibraryEntrySchema validation", () => {
    const entry = createLibraryEntry(VALID_BOOK);
    expect(LibraryEntrySchema.safeParse(entry).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ReadStatus
// ---------------------------------------------------------------------------

describe("ReadStatus", () => {
  it("has the expected string values", () => {
    expect(ReadStatus.UNREAD).toBe("unread");
    expect(ReadStatus.READING).toBe("reading");
    expect(ReadStatus.READ).toBe("read");
    expect(ReadStatus.DNF).toBe("dnf");
  });
});
