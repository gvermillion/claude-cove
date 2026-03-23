/**
 * Library management use cases.
 *
 * Orchestrates interactions between the domain, the book lookup use case,
 * and the library repository. This is the primary application service that
 * UI components interact with.
 *
 * @module application/libraryService
 */

import { err, ok, type Result } from "neverthrow";
import {
  createLibraryEntry,
  type Book,
  type LibraryEntry,
  type ReadStatus,
  type ReadingLogEntry,
} from "@/domain/book";
import { libraryRepository } from "@/infrastructure/db";
import { lookupBookByIsbn, type LookupConfig } from "./lookupBook";

// ---------------------------------------------------------------------------
// Scan and add
// ---------------------------------------------------------------------------

/**
 * The outcome of a scan-and-add operation.
 *
 * - `added`: Book was found and newly added to the library.
 * - `duplicate`: Book was found but already exists in the library.
 * - `not_found`: No book found for the ISBN across all sources.
 * - `error`: An unexpected error occurred.
 */
export type ScanOutcome =
  | { status: "added"; entry: LibraryEntry }
  | { status: "duplicate"; entry: LibraryEntry }
  | { status: "not_found"; isbn: string; error: string }
  | { status: "error"; error: string };

/**
 * Scan an ISBN, fetch its metadata, and add it to the library (if not already present).
 *
 * This is the primary use case triggered by the barcode scanner UI.
 *
 * @param isbn - Raw ISBN string from the barcode scanner.
 * @param config - Optional lookup configuration (e.g., Google API key).
 * @param asWishlist - When true, adds to wishlist instead of the main library.
 * @returns A ScanOutcome describing what happened.
 */
export async function scanAndAddBook(
  isbn: string,
  config: LookupConfig = {},
  asWishlist = false,
): Promise<ScanOutcome> {
  // Check for duplicate before hitting the network
  const normalized = isbn.replace(/[-\s]/g, "");
  const existing = await libraryRepository.findByIsbn(normalized);
  if (existing) {
    return { status: "duplicate", entry: existing };
  }

  // Fetch metadata
  const result = await lookupBookByIsbn(isbn, config);
  if (result.isErr()) {
    return { status: "not_found", isbn: normalized, error: result.error };
  }

  // Persist
  const entry = createLibraryEntry(result.value, { isWishlist: asWishlist });
  const id = await libraryRepository.add(entry);
  return { status: "added", entry: { ...entry, id } };
}

// ---------------------------------------------------------------------------
// Manual add
// ---------------------------------------------------------------------------

/**
 * Manually add a book with user-provided metadata.
 *
 * Used when barcode scanning fails or the book isn't in any API database.
 *
 * @param book - The book metadata to add.
 * @param asWishlist - When true, adds to wishlist instead of the main library.
 * @returns Ok(LibraryEntry) on success, Err(message) if a duplicate exists.
 */
export async function addBookManually(
  book: Book,
  asWishlist = false,
): Promise<Result<LibraryEntry, string>> {
  const existing = await libraryRepository.findByIsbn(book.isbn);
  if (existing) {
    return err(`A book with ISBN ${book.isbn} already exists in your library.`);
  }

  const entry = createLibraryEntry(book, { isWishlist: asWishlist });
  const id = await libraryRepository.add(entry);
  return ok({ ...entry, id });
}

// ---------------------------------------------------------------------------
// Update status
// ---------------------------------------------------------------------------

/**
 * Update a library entry's read status.
 *
 * Automatically records startedAt when status changes to "reading",
 * and finishedAt when status changes to "read" or "dnf".
 *
 * @param id - The entry's database id.
 * @param status - The new read status.
 * @returns Ok(void) on success, Err(message) if the entry doesn't exist.
 */
export async function updateReadStatus(
  id: number,
  status: ReadStatus,
): Promise<Result<void, string>> {
  const existing = await libraryRepository.getById(id);
  if (!existing) return err(`No entry found with id ${id}`);

  const changes: Partial<LibraryEntry> = { readStatus: status };

  if (status === "reading" && existing.startedAt === null) {
    changes.startedAt = new Date();
  }
  if (status === "read" || status === "dnf") {
    changes.finishedAt = new Date();
  } else {
    changes.finishedAt = null;
  }
  if (status === "unread") {
    changes.startedAt = null;
    changes.currentPage = null;
  }

  const updated = await libraryRepository.update(id, changes);
  if (updated === 0) return err(`No entry found with id ${id}`);
  return ok(undefined);
}

/**
 * Update a library entry's rating.
 *
 * @param id - The entry's database id.
 * @param rating - Rating from 1 to 5, or null to clear.
 * @returns Ok(void) on success, Err(message) if the entry doesn't exist.
 */
export async function updateRating(
  id: number,
  rating: number | null,
): Promise<Result<void, string>> {
  if (rating !== null && (rating < 1 || rating > 5)) {
    return err("Rating must be between 1 and 5");
  }
  const updated = await libraryRepository.update(id, { rating });
  if (updated === 0) return err(`No entry found with id ${id}`);
  return ok(undefined);
}

/**
 * Update the personal notes for a library entry.
 *
 * @param id - The entry's database id.
 * @param notes - The updated notes text.
 * @returns Ok(void) on success, Err(message) if the entry doesn't exist.
 */
export async function updateNotes(
  id: number,
  notes: string,
): Promise<Result<void, string>> {
  const updated = await libraryRepository.update(id, { notes });
  if (updated === 0) return err(`No entry found with id ${id}`);
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Reading progress
// ---------------------------------------------------------------------------

/**
 * Update the current reading page for a book.
 *
 * @param id - The entry's database id.
 * @param currentPage - The page the user is on (0 or greater), or null to clear.
 * @returns Ok(void) on success, Err(message) on validation failure.
 */
export async function updateReadingProgress(
  id: number,
  currentPage: number | null,
): Promise<Result<void, string>> {
  if (currentPage !== null && currentPage < 0) {
    return err("Page number must be 0 or greater");
  }
  const updated = await libraryRepository.update(id, { currentPage });
  if (updated === 0) return err(`No entry found with id ${id}`);
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

/**
 * Add a tag to a library entry (no-op if already present).
 *
 * @param id - The entry's database id.
 * @param tag - The tag string to add (will be trimmed and lowercased).
 * @returns Ok(void) on success, Err(message) on failure.
 */
export async function addTag(id: number, tag: string): Promise<Result<void, string>> {
  const normalised = tag.trim().toLowerCase();
  if (!normalised) return err("Tag cannot be empty");

  const entry = await libraryRepository.getById(id);
  if (!entry) return err(`No entry found with id ${id}`);
  if (entry.tags.includes(normalised)) return ok(undefined);

  const updated = await libraryRepository.update(id, { tags: [...entry.tags, normalised] });
  if (updated === 0) return err(`No entry found with id ${id}`);
  return ok(undefined);
}

/**
 * Remove a tag from a library entry.
 *
 * @param id - The entry's database id.
 * @param tag - The tag string to remove.
 * @returns Ok(void) on success, Err(message) on failure.
 */
export async function removeTag(id: number, tag: string): Promise<Result<void, string>> {
  const entry = await libraryRepository.getById(id);
  if (!entry) return err(`No entry found with id ${id}`);

  const tags = entry.tags.filter((t) => t !== tag);
  const updated = await libraryRepository.update(id, { tags });
  if (updated === 0) return err(`No entry found with id ${id}`);
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Loans
// ---------------------------------------------------------------------------

/**
 * Record that a book has been lent to someone.
 *
 * @param id - The entry's database id.
 * @param borrowerName - The name of the person borrowing the book.
 * @returns Ok(void) on success, Err(message) on failure.
 */
export async function recordLoan(
  id: number,
  borrowerName: string,
): Promise<Result<void, string>> {
  const name = borrowerName.trim();
  if (!name) return err("Borrower name cannot be empty");

  const updated = await libraryRepository.update(id, {
    loanedTo: name,
    loanedAt: new Date(),
  });
  if (updated === 0) return err(`No entry found with id ${id}`);
  return ok(undefined);
}

/**
 * Mark a loaned book as returned.
 *
 * @param id - The entry's database id.
 * @returns Ok(void) on success, Err(message) on failure.
 */
export async function returnLoan(id: number): Promise<Result<void, string>> {
  const updated = await libraryRepository.update(id, {
    loanedTo: null,
    loanedAt: null,
  });
  if (updated === 0) return err(`No entry found with id ${id}`);
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Reading log
// ---------------------------------------------------------------------------

/**
 * Add a date-stamped journal entry to a book's reading log.
 *
 * @param id - The entry's database id.
 * @param content - The journal entry text.
 * @returns Ok(void) on success, Err(message) on failure.
 */
export async function addReadingLogEntry(
  id: number,
  content: string,
): Promise<Result<void, string>> {
  const text = content.trim();
  if (!text) return err("Journal entry cannot be empty");

  const logEntry: ReadingLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    content: text,
    createdAt: new Date(),
  };

  const updated = await libraryRepository.addReadingLogEntry(id, logEntry);
  if (updated === 0) return err(`No entry found with id ${id}`);
  return ok(undefined);
}

/**
 * Remove a journal entry from a book's reading log.
 *
 * @param id - The book's database id.
 * @param entryId - The id of the log entry to remove.
 * @returns Ok(void) on success, Err(message) on failure.
 */
export async function removeReadingLogEntry(
  id: number,
  entryId: string,
): Promise<Result<void, string>> {
  const updated = await libraryRepository.removeReadingLogEntry(id, entryId);
  if (updated === 0) return err(`No entry found with id ${id}`);
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------

/**
 * Move a wishlist entry into the main library.
 *
 * @param id - The wishlist entry's database id.
 * @returns Ok(void) on success, Err(message) on failure.
 */
export async function moveWishlistToLibrary(id: number): Promise<Result<void, string>> {
  const updated = await libraryRepository.update(id, { isWishlist: false });
  if (updated === 0) return err(`No entry found with id ${id}`);
  return ok(undefined);
}

/**
 * Move a library entry to the wishlist.
 *
 * @param id - The library entry's database id.
 * @returns Ok(void) on success, Err(message) on failure.
 */
export async function moveToWishlist(id: number): Promise<Result<void, string>> {
  const updated = await libraryRepository.update(id, { isWishlist: true });
  if (updated === 0) return err(`No entry found with id ${id}`);
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Remove a book from the library.
 *
 * @param id - The entry's database id.
 */
export async function removeBook(id: number): Promise<void> {
  return libraryRepository.remove(id);
}

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

/**
 * Export the entire library as a downloadable JSON file.
 *
 * Triggers a browser download with the current date in the filename.
 */
export async function exportLibraryAsJson(): Promise<void> {
  const entries = await libraryRepository.exportAll();
  const json = JSON.stringify(entries, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().split("T")[0];

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `book-library-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Import books from a previously exported JSON file, skipping duplicates.
 *
 * @param file - The JSON file selected by the user.
 * @returns Ok(addedCount) on success, Err(message) on parse failure.
 */
export async function importLibraryFromJson(
  file: File,
): Promise<Result<number, string>> {
  try {
    const text = await file.text();
    const raw: unknown = JSON.parse(text);

    if (!Array.isArray(raw)) {
      return err("Invalid file format: expected a JSON array of library entries.");
    }

    // Re-hydrate date strings back to Date objects
    const entries = (raw as Record<string, unknown>[]).map((item) => ({
      ...item,
      addedAt: new Date(item["addedAt"] as string),
      startedAt: item["startedAt"] ? new Date(item["startedAt"] as string) : null,
      finishedAt: item["finishedAt"] ? new Date(item["finishedAt"] as string) : null,
      loanedAt: item["loanedAt"] ? new Date(item["loanedAt"] as string) : null,
      tags: (item["tags"] as string[] | undefined) ?? [],
      isWishlist: (item["isWishlist"] as boolean | undefined) ?? false,
      loanedTo: (item["loanedTo"] as string | null | undefined) ?? null,
      currentPage: (item["currentPage"] as number | null | undefined) ?? null,
      readingLog: ((item["readingLog"] as Array<Record<string, unknown>> | undefined) ?? []).map(
        (e) => ({ ...e, createdAt: new Date(e["createdAt"] as string) }),
      ),
    })) as Omit<LibraryEntry, "id">[];

    const added = await libraryRepository.importBulk(entries);
    return ok(added);
  } catch {
    return err("Failed to parse the file. Please ensure it is a valid JSON export.");
  }
}
