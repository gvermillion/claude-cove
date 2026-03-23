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
import { createLibraryEntry, type Book, type LibraryEntry, type ReadStatus } from "@/domain/book";
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
 * @returns A ScanOutcome describing what happened.
 */
export async function scanAndAddBook(
  isbn: string,
  config: LookupConfig = {},
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
  const entry = createLibraryEntry(result.value);
  const id = await libraryRepository.add(entry);
  return { status: "added", entry: { ...entry, id } };
}

// ---------------------------------------------------------------------------
// Manual add (for books not found via scan)
// ---------------------------------------------------------------------------

/**
 * Manually add a book with user-provided metadata.
 *
 * Used when barcode scanning fails or the book isn't in any API database.
 *
 * @param book - The book metadata to add.
 * @returns Ok(LibraryEntry) on success, Err(message) if a duplicate exists.
 */
export async function addBookManually(
  book: Book,
): Promise<Result<LibraryEntry, string>> {
  const existing = await libraryRepository.findByIsbn(book.isbn);
  if (existing) {
    return err(`A book with ISBN ${book.isbn} already exists in your library.`);
  }

  const entry = createLibraryEntry(book);
  const id = await libraryRepository.add(entry);
  return ok({ ...entry, id });
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Update a library entry's read status.
 *
 * @param id - The entry's database id.
 * @param status - The new read status.
 * @returns Ok(void) on success, Err(message) if the entry doesn't exist.
 */
export async function updateReadStatus(
  id: number,
  status: ReadStatus,
): Promise<Result<void, string>> {
  const changes: Partial<LibraryEntry> = { readStatus: status };

  // Automatically record finish date when marking as read or DNF
  if (status === "read" || status === "dnf") {
    changes.finishedAt = new Date();
  } else {
    changes.finishedAt = null;
  }

  const updated = await libraryRepository.update(id, changes);
  if (updated === 0) {
    return err(`No entry found with id ${id}`);
  }
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
      finishedAt: item["finishedAt"] ? new Date(item["finishedAt"] as string) : null,
    })) as Omit<LibraryEntry, "id">[];

    const added = await libraryRepository.importBulk(entries);
    return ok(added);
  } catch {
    return err("Failed to parse the file. Please ensure it is a valid JSON export.");
  }
}
