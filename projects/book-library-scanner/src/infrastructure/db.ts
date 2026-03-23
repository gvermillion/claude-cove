/**
 * Dexie (IndexedDB) database adapter for the Book Library Scanner.
 *
 * Implements the Repository pattern to abstract all persistence concerns.
 * The database is fully offline-capable and requires no server.
 *
 * Schema versions:
 *   v1 — initial schema (isbn, title, readStatus, addedAt, authors)
 *   v2 — adds isWishlist, tags, rating indexes; migrates new fields with defaults
 *
 * @module infrastructure/db
 */

import Dexie, { type EntityTable } from "dexie";
import type { LibraryEntry, ReadingLogEntry } from "@/domain/book";

// ---------------------------------------------------------------------------
// Database schema
// ---------------------------------------------------------------------------

/** Dexie database class with typed tables. */
class LibraryDatabase extends Dexie {
  /** The single table storing all library entries. */
  books!: EntityTable<LibraryEntry, "id">;

  constructor() {
    super("BookLibrary");

    this.version(1).stores({
      books: "++id, isbn, title, readStatus, addedAt, *authors",
    });

    this.version(2)
      .stores({
        // Added indexes: rating, isWishlist, *tags (multi-entry for array queries)
        books: "++id, isbn, title, readStatus, addedAt, rating, isWishlist, *tags, *authors",
      })
      .upgrade((tx) => {
        // Migrate existing records by filling in new fields with their defaults
        return tx
          .table("books")
          .toCollection()
          .modify((book: LibraryEntry) => {
            book.startedAt = book.startedAt ?? null;
            book.finishedAt = book.finishedAt ?? null;
            book.currentPage = book.currentPage ?? null;
            book.tags = book.tags ?? [];
            book.isWishlist = book.isWishlist ?? false;
            book.loanedTo = book.loanedTo ?? null;
            book.loanedAt = book.loanedAt ?? null;
            book.readingLog = book.readingLog ?? [];
          });
      });
  }
}

/** Singleton database instance. */
export const db = new LibraryDatabase();

// ---------------------------------------------------------------------------
// Enhanced stats type
// ---------------------------------------------------------------------------

/** Aggregate statistics about the user's library. */
export interface LibraryStats {
  total: number;
  unread: number;
  reading: number;
  read: number;
  dnf: number;
  wishlist: number;
  loanedOut: number;
  readThisYear: number;
  totalPagesRead: number;
  averageRating: number | null;
  topGenres: Array<{ genre: string; count: number }>;
  topAuthors: Array<{ author: string; count: number }>;
  /** Books read per month over the last 12 months (index 0 = 12 months ago). */
  readingPaceByMonth: Array<{ month: string; count: number }>;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

/**
 * Repository for managing LibraryEntry persistence via IndexedDB.
 *
 * Follows the Repository pattern — all Dexie/IndexedDB interactions are
 * isolated here so application logic has no direct DB dependency.
 */
export const libraryRepository = {
  /**
   * Retrieve all library books (not wishlist), ordered by most recently added.
   *
   * @returns Array of library entries sorted by addedAt descending.
   */
  async getAll(): Promise<LibraryEntry[]> {
    return db.books
      .where("isWishlist")
      .equals(0)
      .reverse()
      .sortBy("addedAt");
  },

  /**
   * Retrieve all wishlist entries, ordered by most recently added.
   *
   * @returns Array of wishlist entries sorted by addedAt descending.
   */
  async getWishlist(): Promise<LibraryEntry[]> {
    return db.books
      .where("isWishlist")
      .equals(1)
      .reverse()
      .sortBy("addedAt");
  },

  /**
   * Find a library entry by its ISBN.
   *
   * @param isbn - The ISBN to look up.
   * @returns The matching entry, or undefined if not found.
   */
  async findByIsbn(isbn: string): Promise<LibraryEntry | undefined> {
    return db.books.where("isbn").equals(isbn).first();
  },

  /**
   * Retrieve a single entry by its database ID.
   *
   * @param id - The numeric primary key.
   * @returns The matching entry, or undefined if not found.
   */
  async getById(id: number): Promise<LibraryEntry | undefined> {
    return db.books.get(id);
  },

  /**
   * Add a new book to the library.
   *
   * @param entry - The entry to persist (without an id).
   * @returns The auto-generated numeric id.
   */
  async add(entry: Omit<LibraryEntry, "id">): Promise<number> {
    const id = await db.books.add(entry as LibraryEntry);
    if (id === undefined) throw new Error("IndexedDB add() returned undefined");
    return id as number;
  },

  /**
   * Update an existing library entry.
   *
   * @param id - The id of the entry to update.
   * @param changes - Partial fields to apply.
   * @returns Number of records updated (0 or 1).
   */
  async update(id: number, changes: Partial<LibraryEntry>): Promise<number> {
    return db.books.update(id, changes);
  },

  /**
   * Remove a book from the library permanently.
   *
   * @param id - The id of the entry to delete.
   */
  async remove(id: number): Promise<void> {
    return db.books.delete(id);
  },

  /**
   * Search the library by title or author (case-insensitive substring match).
   *
   * Note: IndexedDB does not support full-text search natively. This performs
   * a client-side filter over all entries, which is acceptable for personal
   * libraries (typically <10k books).
   *
   * @param query - The search string to match against title, authors, and tags.
   * @param wishlistOnly - When true, search only wishlist entries.
   * @returns Matching entries sorted by relevance (title match first).
   */
  async search(query: string, wishlistOnly = false): Promise<LibraryEntry[]> {
    const lower = query.toLowerCase();
    const all = wishlistOnly
      ? await libraryRepository.getWishlist()
      : await libraryRepository.getAll();
    return all.filter(
      (entry) =>
        entry.title.toLowerCase().includes(lower) ||
        entry.authors.some((author) => author.toLowerCase().includes(lower)) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(lower)),
    );
  },

  /**
   * Return all books currently loaned out.
   *
   * @returns Entries where loanedTo is not null.
   */
  async getLoanedOut(): Promise<LibraryEntry[]> {
    const all = await db.books.toArray();
    return all.filter((b) => b.loanedTo !== null);
  },

  /**
   * Return all unique tags used across the library.
   *
   * @returns Sorted array of unique tag strings.
   */
  async getAllTags(): Promise<string[]> {
    const all = await db.books.toArray();
    const tagSet = new Set<string>();
    for (const entry of all) {
      for (const tag of entry.tags) tagSet.add(tag);
    }
    return [...tagSet].sort();
  },

  /**
   * Export the entire library as a JSON-serializable array.
   *
   * @returns All library entries.
   */
  async exportAll(): Promise<LibraryEntry[]> {
    return db.books.toArray();
  },

  /**
   * Import books into the library in bulk, skipping duplicates by ISBN.
   *
   * @param entries - Array of entries to import.
   * @returns Count of newly added entries (duplicates are skipped).
   */
  async importBulk(entries: Omit<LibraryEntry, "id">[]): Promise<number> {
    let added = 0;
    for (const entry of entries) {
      const existing = await libraryRepository.findByIsbn(entry.isbn);
      if (!existing) {
        await db.books.add(entry as LibraryEntry);
        added++;
      }
    }
    return added;
  },

  /**
   * Return comprehensive library statistics.
   *
   * @returns Detailed stats including reading pace, top genres, top authors.
   */
  async getStats(): Promise<LibraryStats> {
    const all = await db.books.toArray();
    const library = all.filter((b) => !b.isWishlist);
    const thisYear = new Date().getFullYear();

    // Basic counts
    const unread = library.filter((b) => b.readStatus === "unread").length;
    const reading = library.filter((b) => b.readStatus === "reading").length;
    const read = library.filter((b) => b.readStatus === "read").length;
    const dnf = library.filter((b) => b.readStatus === "dnf").length;
    const wishlist = all.filter((b) => b.isWishlist).length;
    const loanedOut = library.filter((b) => b.loanedTo !== null).length;

    // Books read this year (finished in current calendar year)
    const readThisYear = library.filter(
      (b) =>
        b.readStatus === "read" &&
        b.finishedAt !== null &&
        new Date(b.finishedAt).getFullYear() === thisYear,
    ).length;

    // Total pages read (sum of pageCount for finished books)
    const totalPagesRead = library
      .filter((b) => b.readStatus === "read" && b.pageCount !== null)
      .reduce((sum, b) => sum + (b.pageCount ?? 0), 0);

    // Average rating (only rated books)
    const ratedBooks = library.filter((b) => b.rating !== null);
    const averageRating =
      ratedBooks.length > 0
        ? ratedBooks.reduce((sum, b) => sum + (b.rating ?? 0), 0) / ratedBooks.length
        : null;

    // Top genres
    const genreCount = new Map<string, number>();
    for (const book of library) {
      for (const genre of book.genres) {
        genreCount.set(genre, (genreCount.get(genre) ?? 0) + 1);
      }
    }
    const topGenres = [...genreCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([genre, count]) => ({ genre, count }));

    // Top authors
    const authorCount = new Map<string, number>();
    for (const book of library) {
      for (const author of book.authors) {
        authorCount.set(author, (authorCount.get(author) ?? 0) + 1);
      }
    }
    const topAuthors = [...authorCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([author, count]) => ({ author, count }));

    // Reading pace — books finished per month over the last 12 months
    const readingPaceByMonth: Array<{ month: string; count: number }> = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const count = library.filter((b) => {
        if (!b.finishedAt || b.readStatus !== "read") return false;
        const fd = new Date(b.finishedAt);
        return fd.getFullYear() === d.getFullYear() && fd.getMonth() === d.getMonth();
      }).length;
      readingPaceByMonth.push({ month: label, count });
    }

    return {
      total: library.length,
      unread,
      reading,
      read,
      dnf,
      wishlist,
      loanedOut,
      readThisYear,
      totalPagesRead,
      averageRating,
      topGenres,
      topAuthors,
      readingPaceByMonth,
    };
  },

  /**
   * Append a reading log entry to a book.
   *
   * @param id - The book's database id.
   * @param entry - The log entry to append.
   * @returns Number of records updated.
   */
  async addReadingLogEntry(id: number, entry: ReadingLogEntry): Promise<number> {
    const book = await db.books.get(id);
    if (!book) return 0;
    const readingLog = [...(book.readingLog ?? []), entry];
    return db.books.update(id, { readingLog });
  },

  /**
   * Remove a reading log entry from a book.
   *
   * @param id - The book's database id.
   * @param entryId - The id of the log entry to remove.
   * @returns Number of records updated.
   */
  async removeReadingLogEntry(id: number, entryId: string): Promise<number> {
    const book = await db.books.get(id);
    if (!book) return 0;
    const readingLog = (book.readingLog ?? []).filter((e) => e.id !== entryId);
    return db.books.update(id, { readingLog });
  },
};
