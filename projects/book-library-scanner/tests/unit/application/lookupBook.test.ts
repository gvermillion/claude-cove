/**
 * Unit tests for application/lookupBook — the ISBN metadata lookup use case.
 *
 * All HTTP calls are mocked so these tests run offline with no API keys.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { lookupBookByIsbn } from "@/application/lookupBook";
import type { Book } from "@/domain/book";

// ---------------------------------------------------------------------------
// Mock the infrastructure clients
// ---------------------------------------------------------------------------

vi.mock("@/infrastructure/openLibraryClient", () => ({
  fetchBookByIsbn: vi.fn(),
}));

vi.mock("@/infrastructure/googleBooksClient", () => ({
  fetchBookByIsbn: vi.fn(),
}));

import { fetchBookByIsbn as fetchFromOpenLibrary } from "@/infrastructure/openLibraryClient";
import { fetchBookByIsbn as fetchFromGoogleBooks } from "@/infrastructure/googleBooksClient";
import { ok, err } from "neverthrow";

const mockOpenLibrary = vi.mocked(fetchFromOpenLibrary);
const mockGoogleBooks = vi.mocked(fetchFromGoogleBooks);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_BOOK: Book = {
  isbn: "9780743273565",
  title: "The Great Gatsby",
  authors: ["F. Scott Fitzgerald"],
  publishedYear: 1925,
  publisher: "Scribner",
  pageCount: 180,
  language: "en",
  description: null,
  genres: ["Fiction"],
  coverUrl: null,
  metadataSource: "open_library",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("lookupBookByIsbn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Ok(Book) when Open Library succeeds", async () => {
    mockOpenLibrary.mockResolvedValue(ok(MOCK_BOOK));

    const result = await lookupBookByIsbn("9780743273565");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.title).toBe("The Great Gatsby");
    }
    expect(mockGoogleBooks).not.toHaveBeenCalled();
  });

  it("falls back to Google Books when Open Library fails", async () => {
    mockOpenLibrary.mockResolvedValue(err("Not found in Open Library"));
    const googleBook: Book = { ...MOCK_BOOK, metadataSource: "google_books" };
    mockGoogleBooks.mockResolvedValue(ok(googleBook));

    const result = await lookupBookByIsbn("9780743273565");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.metadataSource).toBe("google_books");
    }
  });

  it("returns Err when both sources fail", async () => {
    mockOpenLibrary.mockResolvedValue(err("Open Library: not found"));
    mockGoogleBooks.mockResolvedValue(err("Google Books: not found"));

    const result = await lookupBookByIsbn("9780743273565");

    expect(result.isErr()).toBe(true);
  });

  it("rejects an ISBN that is too short", async () => {
    const result = await lookupBookByIsbn("123");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toMatch(/invalid isbn/i);
    }
    expect(mockOpenLibrary).not.toHaveBeenCalled();
  });

  it("strips hyphens from ISBNs before lookup", async () => {
    mockOpenLibrary.mockResolvedValue(ok(MOCK_BOOK));

    await lookupBookByIsbn("978-0-7432-7356-5");

    expect(mockOpenLibrary).toHaveBeenCalledWith("9780743273565");
  });

  it("passes the Google Books API key when provided", async () => {
    mockOpenLibrary.mockResolvedValue(err("not found"));
    mockGoogleBooks.mockResolvedValue(ok(MOCK_BOOK));

    await lookupBookByIsbn("9780743273565", { googleBooksApiKey: "test-key" });

    expect(mockGoogleBooks).toHaveBeenCalledWith("9780743273565", "test-key");
  });
});
