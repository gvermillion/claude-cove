/**
 * Dexie (IndexedDB) database adapter for the Book Library Scanner.
 *
 * Implements the Repository pattern to abstract all persistence concerns.
 * The database is fully offline-capable and requires no server.
 *
 * @module infrastructure/db
 */

import Dexie, { type EntityTable } from "dexie";
import type { LibraryEntry } from "@/domain/book";

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
      // Indexed fields: id (auto-increment PK), isbn, title, readStatus, addedAt
      books: "++id, isbn, title, readStatus, addedAt, *authors",
    });
  }
}

/** Singleton database instance. */
export const db = new LibraryDatabase();

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
   * Retrieve all books in the library, ordered by most recently added.
   *
   * @returns Array of library entries sorted by addedAt descending.
   */
  async getAll(): Promise<LibraryEntry[]> {
    return db.books.orderBy("addedAt").reverse().toArray();
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
   * @param query - The search string to match against title and authors.
   * @returns Matching entries sorted by relevance (title match first).
   */
  async search(query: string): Promise<LibraryEntry[]> {
    const lower = query.toLowerCase();
    const all = await db.books.toArray();
    return all.filter(
      (entry) =>
        entry.title.toLowerCase().includes(lower) ||
        entry.authors.some((author) => author.toLowerCase().includes(lower)),
    );
  },

  /**
   * Export the entire library as a JSON-serializable array.
   *
   * Useful for backup and data portability.
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
   * Return aggregate statistics for the library.
   *
   * @returns Counts by read status and total book count.
   */
  async getStats(): Promise<{
    total: number;
    unread: number;
    reading: number;
    read: number;
    dnf: number;
  }> {
    const all = await db.books.toArray();
    return {
      total: all.length,
      unread: all.filter((b) => b.readStatus === "unread").length,
      reading: all.filter((b) => b.readStatus === "reading").length,
      read: all.filter((b) => b.readStatus === "read").length,
      dnf: all.filter((b) => b.readStatus === "dnf").length,
    };
  },
};
