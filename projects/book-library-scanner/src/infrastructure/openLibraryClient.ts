/**
 * Open Library API client adapter.
 *
 * Wraps the Open Library REST API and normalizes responses into the canonical
 * Book domain type. No API key required.
 *
 * Implements the Adapter pattern to shield the rest of the app from Open Library
 * API churn.
 *
 * @see https://openlibrary.org/developers/api
 * @module infrastructure/openLibraryClient
 */

import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { Book } from "@/domain/book";

// ---------------------------------------------------------------------------
// Raw API response shapes (internal — not exported)
// ---------------------------------------------------------------------------

const OpenLibraryIsbnResponseSchema = z.object({
  title: z.string().optional(),
  authors: z
    .array(
      z.object({
        key: z.string(),
        name: z.string().optional(),
      }),
    )
    .optional(),
  publishers: z.array(z.string()).optional(),
  publish_date: z.string().optional(),
  number_of_pages: z.number().optional(),
  languages: z.array(z.object({ key: z.string() })).optional(),
  description: z.union([z.string(), z.object({ value: z.string() })]).optional(),
  subjects: z.array(z.string()).optional(),
  covers: z.array(z.number()).optional(),
});

type OpenLibraryIsbnResponse = z.infer<typeof OpenLibraryIsbnResponseSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the plain text description regardless of whether OL returns it as
 * a string or as an object with a `value` key.
 */
function extractDescription(
  raw: OpenLibraryIsbnResponse["description"],
): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  return raw.value;
}

/** Derive a 4-digit publish year from Open Library's free-form date strings. */
function extractYear(publishDate: string | undefined): number | null {
  if (!publishDate) return null;
  const match = /(\d{4})/.exec(publishDate);
  return match ? parseInt(match[1], 10) : null;
}

/** Map an Open Library language key like `/languages/eng` to `en`. */
function extractLanguage(
  languages: Array<{ key: string }> | undefined,
): string | null {
  if (!languages || languages.length === 0) return null;
  const key = languages[0].key; // e.g. /languages/eng
  const code = key.split("/").pop();
  // Map 3-letter ISO codes to 2-letter codes for the common cases
  const iso3to2: Record<string, string> = {
    eng: "en",
    fre: "fr",
    ger: "de",
    spa: "es",
    ita: "it",
    por: "pt",
    rus: "ru",
    jpn: "ja",
    chi: "zh",
    ara: "ar",
  };
  return (code && iso3to2[code]) ?? code ?? null;
}

/** Build a cover image URL from an Open Library cover ID. */
function buildCoverUrl(covers: number[] | undefined): string | null {
  if (!covers || covers.length === 0) return null;
  return `https://covers.openlibrary.org/b/id/${covers[0]}-L.jpg`;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/** Base URL for Open Library Books API. */
const BASE_URL = "https://openlibrary.org";

/**
 * Fetch book metadata from Open Library by ISBN.
 *
 * Uses the `/isbn/{isbn}.json` endpoint for primary data, with the Works API
 * for description and subjects if needed.
 *
 * @param isbn - The ISBN-10 or ISBN-13 to look up.
 * @returns Ok(Book) on success, or Err(message) on failure/not-found.
 */
export async function fetchBookByIsbn(isbn: string): Promise<Result<Book, string>> {
  try {
    const response = await fetch(`${BASE_URL}/isbn/${isbn}.json`);

    if (response.status === 404) {
      return err(`Book with ISBN ${isbn} not found in Open Library`);
    }
    if (!response.ok) {
      return err(`Open Library API error: ${response.status} ${response.statusText}`);
    }

    const raw: unknown = await response.json();
    const parsed = OpenLibraryIsbnResponseSchema.safeParse(raw);

    if (!parsed.success) {
      return err("Open Library returned an unexpected response format");
    }

    const data = parsed.data;

    // Fetch author names separately if needed (OL returns author keys, not names)
    const authors = await resolveAuthorNames(data.authors ?? []);

    const book: Book = {
      isbn,
      title: data.title ?? "Unknown Title",
      authors: authors.length > 0 ? authors : ["Unknown Author"],
      publishedYear: extractYear(data.publish_date),
      publisher: data.publishers?.[0] ?? null,
      pageCount: data.number_of_pages ?? null,
      language: extractLanguage(data.languages),
      description: extractDescription(data.description),
      genres: (data.subjects ?? []).slice(0, 5),
      coverUrl: buildCoverUrl(data.covers),
      metadataSource: "open_library",
    };

    return ok(book);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    return err(`Failed to fetch from Open Library: ${message}`);
  }
}

/**
 * Resolve Open Library author keys to display names by fetching each author record.
 * Returns empty strings for any author that fails to resolve (graceful degradation).
 *
 * @param authorRefs - Array of author key objects from the ISBN response.
 * @returns Array of resolved author name strings.
 */
async function resolveAuthorNames(
  authorRefs: Array<{ key: string; name?: string }>,
): Promise<string[]> {
  // If name is already included (some edition endpoints include it), use it directly
  const resolved = await Promise.allSettled(
    authorRefs.slice(0, 5).map(async (ref) => {
      if (ref.name) return ref.name;

      const res = await fetch(`${BASE_URL}${ref.key}.json`);
      if (!res.ok) return null;

      const data: unknown = await res.json();
      const authorSchema = z.object({ name: z.string().optional() });
      const parsed = authorSchema.safeParse(data);
      return parsed.success ? (parsed.data.name ?? null) : null;
    }),
  );

  return resolved
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((name): name is string => name !== null);
}
