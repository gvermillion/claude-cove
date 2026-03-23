/**
 * Book recommendation service.
 *
 * Generates book recommendations by analysing the user's library (favourite
 * genres and frequently-read authors) and querying the Open Library Search API.
 * No API key is required. Results are filtered to exclude books the user already owns.
 *
 * @module application/recommendationService
 */

import type { Book } from "@/domain/book";
import { libraryRepository } from "@/infrastructure/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A lightweight book suggestion returned by the recommendation engine. */
export interface BookSuggestion {
  /** Open Library work key (e.g. "/works/OL123W"). */
  key: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  publishedYear: number | null;
  /** The genre or author that triggered this suggestion. */
  reason: string;
}

// ---------------------------------------------------------------------------
// Open Library search API
// ---------------------------------------------------------------------------

interface OLSearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
}

interface OLSearchResponse {
  docs: OLSearchDoc[];
}

/**
 * Search Open Library for books matching a subject (genre).
 *
 * @param subject - The subject/genre to search for.
 * @param limit - Maximum number of results to return.
 * @returns Array of raw Open Library search docs.
 */
async function searchBySubject(subject: string, limit = 8): Promise<OLSearchDoc[]> {
  const encoded = encodeURIComponent(subject);
  const url = `https://openlibrary.org/search.json?subject=${encoded}&limit=${limit}&fields=key,title,author_name,first_publish_year,cover_i,isbn`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as OLSearchResponse;
  return data.docs ?? [];
}

/**
 * Search Open Library for books by a specific author.
 *
 * @param author - The author name to search for.
 * @param limit - Maximum number of results to return.
 * @returns Array of raw Open Library search docs.
 */
async function searchByAuthor(author: string, limit = 6): Promise<OLSearchDoc[]> {
  const encoded = encodeURIComponent(author);
  const url = `https://openlibrary.org/search.json?author=${encoded}&limit=${limit}&fields=key,title,author_name,first_publish_year,cover_i,isbn`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as OLSearchResponse;
  return data.docs ?? [];
}

/**
 * Convert an Open Library cover ID to a thumbnail URL.
 *
 * @param coverId - The numeric Open Library cover ID.
 * @returns Cover image URL (medium size), or null if no cover.
 */
function coverUrl(coverId: number | undefined): string | null {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}

/**
 * Map a raw OL search doc to a BookSuggestion.
 *
 * @param doc - The Open Library search document.
 * @param reason - The recommendation reason label.
 * @returns A BookSuggestion.
 */
function docToSuggestion(doc: OLSearchDoc, reason: string): BookSuggestion {
  return {
    key: doc.key,
    title: doc.title,
    authors: doc.author_name ?? ["Unknown Author"],
    coverUrl: coverUrl(doc.cover_i),
    publishedYear: doc.first_publish_year ?? null,
    reason,
  };
}

// ---------------------------------------------------------------------------
// Main recommendation function
// ---------------------------------------------------------------------------

/**
 * Generate book recommendations based on the user's library.
 *
 * Algorithm:
 * 1. Analyse the user's library to find the top 3 genres and top 2 authors.
 * 2. Query Open Library for each genre and author.
 * 3. Deduplicate results and filter out books already in the library.
 * 4. Return up to `maxResults` suggestions.
 *
 * @param maxResults - Maximum number of recommendations to return. Defaults to 20.
 * @returns Array of book suggestions, or an empty array if no library data.
 */
export async function getRecommendations(maxResults = 20): Promise<BookSuggestion[]> {
  const library = await libraryRepository.getAll();
  if (library.length === 0) return [];

  // Build sets of owned ISBNs and work keys for deduplication
  const ownedIsbns = new Set(library.map((b) => b.isbn));
  const ownedTitlesNorm = new Set(library.map((b) => b.title.toLowerCase().trim()));

  // Find top genres
  const genreCount = new Map<string, number>();
  for (const book of library) {
    for (const genre of book.genres) {
      genreCount.set(genre, (genreCount.get(genre) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => genre);

  // Find top authors (authors with >1 book in library, or just top 2)
  const authorCount = new Map<string, number>();
  for (const book of library) {
    for (const author of book.authors) {
      authorCount.set(author, (authorCount.get(author) ?? 0) + 1);
    }
  }
  const topAuthors = [...authorCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([author]) => author);

  // Fire all searches in parallel
  const [genreResults, authorResults] = await Promise.all([
    Promise.all(topGenres.map((genre) => searchBySubject(genre).then((docs) => ({ docs, reason: `Popular in ${genre}` })))),
    Promise.all(topAuthors.map((author) => searchByAuthor(author).then((docs) => ({ docs, reason: `More by ${author}` })))),
  ]);

  // Merge and deduplicate
  const seen = new Set<string>();
  const suggestions: BookSuggestion[] = [];

  const allBatches = [...genreResults, ...authorResults];
  for (const { docs, reason } of allBatches) {
    for (const doc of docs) {
      // Skip if title already in library
      if (ownedTitlesNorm.has(doc.title.toLowerCase().trim())) continue;
      // Skip if any ISBN overlaps
      const docIsbns = doc.isbn ?? [];
      if (docIsbns.some((isbn) => ownedIsbns.has(isbn))) continue;
      // Skip duplicates within results
      if (seen.has(doc.key)) continue;
      seen.add(doc.key);

      suggestions.push(docToSuggestion(doc, reason));
      if (suggestions.length >= maxResults) break;
    }
    if (suggestions.length >= maxResults) break;
  }

  return suggestions;
}

/**
 * Convert a BookSuggestion to a minimal Book for adding to the library.
 *
 * Generates a synthetic ISBN from the Open Library key since OL search results
 * don't always include ISBNs. The user can correct it via the manual edit flow.
 *
 * @param suggestion - The suggestion to convert.
 * @returns A Book suitable for passing to addBookManually.
 */
export function suggestionToBook(suggestion: BookSuggestion): Book {
  // Derive a stable synthetic ISBN-like identifier from the OL key
  const keyDigits = suggestion.key.replace(/\D/g, "").slice(0, 10).padEnd(10, "0");

  return {
    isbn: keyDigits,
    title: suggestion.title,
    authors: suggestion.authors,
    publishedYear: suggestion.publishedYear,
    publisher: null,
    pageCount: null,
    language: null,
    description: null,
    genres: [],
    coverUrl: suggestion.coverUrl,
    metadataSource: "manual",
  };
}
