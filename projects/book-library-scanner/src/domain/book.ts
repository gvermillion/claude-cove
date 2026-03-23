/**
 * Core domain types for the Book Library Scanner.
 *
 * This module defines the canonical data shapes for books and library entries.
 * All external API data is normalized into these types before use.
 *
 * @module domain/book
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Value objects
// ---------------------------------------------------------------------------

/** A 10 or 13-digit ISBN string. */
export type Isbn = string;

/** Read status of a book in the user's library. */
export const ReadStatus = {
  UNREAD: "unread",
  READING: "reading",
  READ: "read",
  DNF: "dnf",
} as const;

export type ReadStatus = (typeof ReadStatus)[keyof typeof ReadStatus];

// ---------------------------------------------------------------------------
// Book — the canonical representation of a book's bibliographic metadata.
// ---------------------------------------------------------------------------

export const BookSchema = z.object({
  /** Primary ISBN (13-digit preferred, 10-digit fallback). */
  isbn: z.string().min(10).max(13),

  title: z.string().min(1),
  authors: z.array(z.string()).min(1),
  publishedYear: z.number().int().positive().nullable(),
  publisher: z.string().nullable(),
  pageCount: z.number().int().positive().nullable(),
  language: z.string().nullable(),
  description: z.string().nullable(),
  genres: z.array(z.string()),
  coverUrl: z.string().url().nullable(),

  /** Which API this metadata was sourced from. */
  metadataSource: z.enum(["open_library", "google_books", "manual"]),
});

export type Book = z.infer<typeof BookSchema>;

// ---------------------------------------------------------------------------
// LibraryEntry — a book as it appears in the user's personal library.
// Extends Book with user-specific data (status, notes, dates).
// ---------------------------------------------------------------------------

export const LibraryEntrySchema = BookSchema.extend({
  /** Auto-generated unique ID (from Dexie). */
  id: z.number().int().positive().optional(),

  /** When the user added this book to their library. */
  addedAt: z.date(),

  /** User's reading status. */
  readStatus: z.nativeEnum(ReadStatus),

  /** User's personal rating (1–5), or null if unrated. */
  rating: z.number().int().min(1).max(5).nullable(),

  /** Free-form personal notes. */
  notes: z.string(),

  /** When the user finished the book, if applicable. */
  finishedAt: z.date().nullable(),
});

export type LibraryEntry = z.infer<typeof LibraryEntrySchema>;

// ---------------------------------------------------------------------------
// ScanResult — the outcome of a barcode scan attempt.
// ---------------------------------------------------------------------------

export const ScanResultSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    isbn: z.string(),
    book: BookSchema,
  }),
  z.object({
    success: z.literal(false),
    isbn: z.string().nullable(),
    error: z.string(),
  }),
]);

export type ScanResult = z.infer<typeof ScanResultSchema>;

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/**
 * Create a new LibraryEntry from a Book with sensible defaults.
 *
 * @param book - The book metadata to base the entry on.
 * @returns A new LibraryEntry ready to be persisted.
 */
export function createLibraryEntry(book: Book): Omit<LibraryEntry, "id"> {
  return {
    ...book,
    addedAt: new Date(),
    readStatus: ReadStatus.UNREAD,
    rating: null,
    notes: "",
    finishedAt: null,
  };
}
