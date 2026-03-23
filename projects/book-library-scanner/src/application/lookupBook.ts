/**
 * Book lookup use case — resolves an ISBN to full book metadata.
 *
 * Implements a fallback chain:
 *   1. Open Library (free, no key required)
 *   2. Google Books (optional API key for higher quota)
 *
 * Returns the first successful result. Both APIs must fail for the use case
 * to return an error.
 *
 * @module application/lookupBook
 */

import { err, type Result } from "neverthrow";
import type { Book } from "@/domain/book";
import { fetchBookByIsbn as fetchFromOpenLibrary } from "@/infrastructure/openLibraryClient";
import { fetchBookByIsbn as fetchFromGoogleBooks } from "@/infrastructure/googleBooksClient";

/** Configuration for the book lookup use case. */
export interface LookupConfig {
  /** Optional Google Books API key. When absent, only Open Library is used. */
  googleBooksApiKey?: string;
}

/**
 * Look up a book by ISBN using the configured metadata source chain.
 *
 * Tries Open Library first. Falls back to Google Books if Open Library
 * does not find the book or returns an error.
 *
 * @param isbn - The ISBN-10 or ISBN-13 to resolve.
 * @param config - Optional configuration (e.g., Google API key).
 * @returns Ok(Book) if found in any source, Err(string) if all sources fail.
 */
export async function lookupBookByIsbn(
  isbn: string,
  config: LookupConfig = {},
): Promise<Result<Book, string>> {
  // Normalize ISBN: strip hyphens and whitespace
  const normalizedIsbn = isbn.replace(/[-\s]/g, "");

  if (normalizedIsbn.length !== 10 && normalizedIsbn.length !== 13) {
    return err(`Invalid ISBN: "${isbn}". Must be 10 or 13 digits.`);
  }

  // --- Attempt 1: Open Library ---
  const openLibraryResult = await fetchFromOpenLibrary(normalizedIsbn);
  if (openLibraryResult.isOk()) {
    return openLibraryResult;
  }

  // --- Attempt 2: Google Books ---
  const googleResult = await fetchFromGoogleBooks(
    normalizedIsbn,
    config.googleBooksApiKey,
  );
  if (googleResult.isOk()) {
    return googleResult;
  }

  // Both failed — return a combined error message
  return err(
    `Book not found in any source.\n` +
      `Open Library: ${openLibraryResult.error}\n` +
      `Google Books: ${googleResult.error}`,
  );
}
