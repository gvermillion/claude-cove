/**
 * Google Books API client adapter.
 *
 * Wraps the Google Books Volumes API and normalizes responses into the canonical
 * Book domain type. An optional API key improves quota limits.
 *
 * Implements the Adapter pattern — all Google Books API details are encapsulated here.
 *
 * @see https://developers.google.com/books/docs/v1/reference/volumes
 * @module infrastructure/googleBooksClient
 */

import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { Book } from "@/domain/book";

// ---------------------------------------------------------------------------
// Raw API response shapes (internal)
// ---------------------------------------------------------------------------

const VolumeInfoSchema = z.object({
  title: z.string().optional(),
  authors: z.array(z.string()).optional(),
  publisher: z.string().optional(),
  publishedDate: z.string().optional(),
  description: z.string().optional(),
  pageCount: z.number().optional(),
  categories: z.array(z.string()).optional(),
  language: z.string().optional(),
  imageLinks: z
    .object({
      thumbnail: z.string().optional(),
      smallThumbnail: z.string().optional(),
    })
    .optional(),
  industryIdentifiers: z
    .array(
      z.object({
        type: z.string(),
        identifier: z.string(),
      }),
    )
    .optional(),
});

const GoogleBooksResponseSchema = z.object({
  totalItems: z.number(),
  items: z
    .array(
      z.object({
        volumeInfo: VolumeInfoSchema,
      }),
    )
    .optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a 4-digit publish year from Google Books' date strings (YYYY, YYYY-MM, YYYY-MM-DD). */
function extractYear(publishedDate: string | undefined): number | null {
  if (!publishedDate) return null;
  const match = /^(\d{4})/.exec(publishedDate);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Upgrade a Google Books thumbnail URL to the largest available size.
 * Google Books returns small images by default; we request zoom=0 for full size.
 */
function upgradeCoverUrl(thumbnail: string | undefined): string | null {
  if (!thumbnail) return null;
  // Replace zoom=1 (thumbnail) with zoom=0 (larger image) and force HTTPS
  return thumbnail
    .replace(/^http:/, "https:")
    .replace(/zoom=\d/, "zoom=0")
    .replace(/&edge=curl/, "");
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";

/**
 * Fetch book metadata from Google Books by ISBN.
 *
 * Used as a fallback when Open Library does not have the book.
 *
 * @param isbn - The ISBN-10 or ISBN-13 to look up.
 * @param apiKey - Optional Google Books API key for higher quota.
 * @returns Ok(Book) on success, or Err(message) on failure/not-found.
 */
export async function fetchBookByIsbn(
  isbn: string,
  apiKey?: string,
): Promise<Result<Book, string>> {
  try {
    const params = new URLSearchParams({ q: `isbn:${isbn}` });
    if (apiKey) params.set("key", apiKey);

    const response = await fetch(`${GOOGLE_BOOKS_URL}?${params.toString()}`);

    if (!response.ok) {
      return err(`Google Books API error: ${response.status} ${response.statusText}`);
    }

    const raw: unknown = await response.json();
    const parsed = GoogleBooksResponseSchema.safeParse(raw);

    if (!parsed.success) {
      return err("Google Books returned an unexpected response format");
    }

    const { totalItems, items } = parsed.data;

    if (totalItems === 0 || !items || items.length === 0) {
      return err(`Book with ISBN ${isbn} not found in Google Books`);
    }

    const info = items[0].volumeInfo;

    const book: Book = {
      isbn,
      title: info.title ?? "Unknown Title",
      authors: info.authors && info.authors.length > 0 ? info.authors : ["Unknown Author"],
      publishedYear: extractYear(info.publishedDate),
      publisher: info.publisher ?? null,
      pageCount: info.pageCount ?? null,
      language: info.language ?? null,
      description: info.description ?? null,
      genres: (info.categories ?? []).slice(0, 5),
      coverUrl: upgradeCoverUrl(info.imageLinks?.thumbnail),
      metadataSource: "google_books",
    };

    return ok(book);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    return err(`Failed to fetch from Google Books: ${message}`);
  }
}
