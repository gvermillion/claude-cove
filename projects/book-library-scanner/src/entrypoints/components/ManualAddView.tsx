/**
 * ManualAddView — manual book entry form.
 *
 * Provides two paths:
 *   1. ISBN lookup — enter an ISBN to fetch metadata from Open Library / Google Books.
 *   2. Full manual — fill in all fields yourself when no API data is available.
 *
 * @module entrypoints/components/ManualAddView
 */

import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { scanAndAddBook } from "@/application/libraryService";
import { addBookManually } from "@/application/libraryService";
import type { Book } from "@/domain/book";

type Mode = "isbn" | "manual";
type IsbnFlowState =
  | { phase: "idle" }
  | { phase: "fetching" }
  | { phase: "error"; message: string };

// ---------------------------------------------------------------------------
// ISBN lookup tab
// ---------------------------------------------------------------------------

interface IsbnTabProps {
  asWishlist: boolean;
}

function IsbnTab({ asWishlist }: IsbnTabProps) {
  const navigate = useNavigate();
  const [isbn, setIsbn] = useState("");
  const [flow, setFlow] = useState<IsbnFlowState>({ phase: "idle" });

  const handleLookup = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = isbn.trim();
      if (!trimmed) return;

      setFlow({ phase: "fetching" });
      const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined;
      const outcome = await scanAndAddBook(
        trimmed,
        { googleBooksApiKey: apiKey || undefined },
        asWishlist,
      );

      if (outcome.status === "added") {
        navigate(`/book/${outcome.entry.id ?? ""}`);
      } else if (outcome.status === "duplicate") {
        navigate(`/book/${outcome.entry.id ?? ""}`);
      } else {
        setFlow({ phase: "error", message: outcome.error });
      }
    },
    [isbn, navigate, asWishlist],
  );

  return (
    <form onSubmit={(e) => void handleLookup(e)} className="flex flex-col gap-4">
      <p className="text-secondary text-sm">
        Enter an ISBN-10 or ISBN-13 to automatically fetch metadata from Open Library and
        Google Books.
      </p>

      <div>
        <label htmlFor="isbn-input" className="text-xs font-medium text-secondary uppercase tracking-wider">
          ISBN
        </label>
        <input
          id="isbn-input"
          type="text"
          inputMode="numeric"
          value={isbn}
          onChange={(e) => {
            setIsbn(e.target.value);
            setFlow({ phase: "idle" });
          }}
          placeholder="e.g. 9780385547994"
          className="input mt-1"
        />
      </div>

      {flow.phase === "error" && (
        <p className="text-red-400 text-sm bg-red-950/40 rounded-xl px-3 py-2">
          {flow.message}
        </p>
      )}

      <button
        type="submit"
        disabled={flow.phase === "fetching" || !isbn.trim()}
        className="btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {flow.phase === "fetching" ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Looking up…
          </>
        ) : (
          `Look Up & Add${asWishlist ? " to Wishlist" : ""}`
        )}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Full manual entry tab
// ---------------------------------------------------------------------------

interface ManualTabProps {
  asWishlist: boolean;
}

function ManualTab({ asWishlist }: ManualTabProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      const fd = new FormData(e.currentTarget);
      const isbn = (fd.get("isbn") as string).trim();
      const title = (fd.get("title") as string).trim();
      const authorsRaw = (fd.get("authors") as string).trim();
      const publishedYear = (fd.get("publishedYear") as string).trim();
      const publisher = (fd.get("publisher") as string).trim();
      const pageCount = (fd.get("pageCount") as string).trim();
      const genres = (fd.get("genres") as string).trim();

      if (!isbn || !title || !authorsRaw) {
        setError("ISBN, title, and at least one author are required.");
        setIsSubmitting(false);
        return;
      }

      const book: Book = {
        isbn,
        title,
        authors: authorsRaw.split(",").map((a) => a.trim()).filter(Boolean),
        publishedYear: publishedYear ? parseInt(publishedYear, 10) : null,
        publisher: publisher || null,
        pageCount: pageCount ? parseInt(pageCount, 10) : null,
        language: null,
        description: null,
        genres: genres ? genres.split(",").map((g) => g.trim()).filter(Boolean) : [],
        coverUrl: null,
        metadataSource: "manual",
      };

      const result = await addBookManually(book, asWishlist);
      setIsSubmitting(false);

      if (result.isOk()) {
        navigate(`/book/${result.value.id ?? ""}`);
      } else {
        setError(result.error);
      }
    },
    [navigate, asWishlist],
  );

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
      <p className="text-secondary text-sm">
        Fill in the details manually. ISBN, title, and author(s) are required.
      </p>

      {[
        { name: "isbn", label: "ISBN *", placeholder: "e.g. 9780385547994", inputMode: "numeric" as const },
        { name: "title", label: "Title *", placeholder: "e.g. Dune" },
        { name: "authors", label: "Author(s) *", placeholder: "Comma-separated: Frank Herbert, …" },
        { name: "publishedYear", label: "Published Year", placeholder: "e.g. 1965", inputMode: "numeric" as const },
        { name: "publisher", label: "Publisher", placeholder: "e.g. Chilton Books" },
        { name: "pageCount", label: "Page Count", placeholder: "e.g. 412", inputMode: "numeric" as const },
        { name: "genres", label: "Genres", placeholder: "Comma-separated: Science Fiction, …" },
      ].map(({ name, label, placeholder, inputMode }) => (
        <div key={name}>
          <label
            htmlFor={`manual-${name}`}
            className="text-xs font-medium text-secondary uppercase tracking-wider"
          >
            {label}
          </label>
          <input
            id={`manual-${name}`}
            name={name}
            type="text"
            inputMode={inputMode}
            placeholder={placeholder}
            className="input mt-1"
          />
        </div>
      ))}

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 rounded-xl px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Adding…
          </>
        ) : (
          `Add to ${asWishlist ? "Wishlist" : "Library"}`
        )}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

/**
 * Full-page manual book addition form with ISBN lookup and manual entry modes.
 */
export function ManualAddView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("isbn");

  // ?wishlist=1 causes the form to default to adding to the wishlist
  const asWishlist = searchParams.get("wishlist") === "1";

  const MODES: Array<{ value: Mode; label: string }> = [
    { value: "isbn", label: "ISBN Lookup" },
    { value: "manual", label: "Manual Entry" },
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-safe">
      {/* Header */}
      <header
        className="sticky top-0 z-20 pt-safe px-4 pb-3 border-b border-border"
        style={{ backgroundColor: "var(--color-bg)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-secondary hover:text-on-surface transition text-sm"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-on-surface">
            Add {asWishlist ? "to Wishlist" : "Book"}
          </h1>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mt-3 p-1 rounded-xl" style={{ backgroundColor: "var(--color-bg-card)" }}>
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: mode === m.value ? "var(--color-accent)" : "transparent",
                color: mode === m.value ? "var(--color-accent-fg)" : "var(--color-text-secondary)",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-6">
        {mode === "isbn" ? (
          <IsbnTab asWishlist={asWishlist} />
        ) : (
          <ManualTab asWishlist={asWishlist} />
        )}
      </main>
    </div>
  );
}
