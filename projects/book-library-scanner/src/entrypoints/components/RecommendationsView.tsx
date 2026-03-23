/**
 * RecommendationsView — personalised book recommendations page.
 *
 * Analyses the user's library to identify favourite genres and frequent authors,
 * then queries Open Library to surface similar books the user doesn't yet own.
 * Users can add recommendations directly to their library or wishlist.
 *
 * @module entrypoints/components/RecommendationsView
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRecommendations,
  suggestionToBook,
  type BookSuggestion,
} from "@/application/recommendationService";
import { addBookManually } from "@/application/libraryService";
import { CoverPlaceholder } from "./CoverPlaceholder";

// ---------------------------------------------------------------------------
// Suggestion card
// ---------------------------------------------------------------------------

interface SuggestionCardProps {
  suggestion: BookSuggestion;
  onAddToLibrary: (s: BookSuggestion) => Promise<void>;
  onAddToWishlist: (s: BookSuggestion) => Promise<void>;
}

type CardState = "idle" | "adding" | "added" | "error";

function SuggestionCard({ suggestion, onAddToLibrary, onAddToWishlist }: SuggestionCardProps) {
  const [state, setState] = useState<CardState>("idle");

  const handleAdd = useCallback(
    async (toWishlist: boolean) => {
      setState("adding");
      try {
        if (toWishlist) {
          await onAddToWishlist(suggestion);
        } else {
          await onAddToLibrary(suggestion);
        }
        setState("added");
      } catch {
        setState("error");
      }
    },
    [suggestion, onAddToLibrary, onAddToWishlist],
  );

  return (
    <div
      className="flex gap-3 p-3 rounded-xl"
      style={{ backgroundColor: "var(--color-bg-card)" }}
    >
      {/* Cover */}
      <div className="flex-shrink-0 w-14 h-20 rounded-lg overflow-hidden shadow">
        {suggestion.coverUrl ? (
          <img
            src={suggestion.coverUrl}
            alt={`Cover of ${suggestion.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <CoverPlaceholder title={suggestion.title} className="w-full h-full" textSize="text-xl" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div>
          <h3 className="font-semibold text-on-surface text-sm leading-snug line-clamp-2">
            {suggestion.title}
          </h3>
          <p className="text-secondary text-xs mt-0.5 truncate">
            {suggestion.authors.join(", ")}
          </p>
          {suggestion.publishedYear && (
            <p className="text-muted text-xs">{suggestion.publishedYear}</p>
          )}
          <p className="text-xs mt-1" style={{ color: "var(--color-accent)" }}>
            {suggestion.reason}
          </p>
        </div>

        {state === "added" ? (
          <span className="text-xs text-emerald-400 font-medium mt-1">✓ Added</span>
        ) : state === "error" ? (
          <span className="text-xs text-red-400 mt-1">Already in library</span>
        ) : (
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={() => void handleAdd(false)}
              disabled={state === "adding"}
              className="text-xs px-2 py-1 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "var(--color-accent-fg)",
              }}
            >
              {state === "adding" ? "…" : "+ Library"}
            </button>
            <button
              onClick={() => void handleAdd(true)}
              disabled={state === "adding"}
              className="text-xs px-2 py-1 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
              }}
            >
              {state === "adding" ? "…" : "Wishlist"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

/**
 * Full-page recommendation browser that surfaces books similar to what the
 * user already reads, powered by Open Library search.
 */
export function RecommendationsView() {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = useCallback(() => {
    setIsLoading(true);
    setError(null);
    getRecommendations(24)
      .then(setSuggestions)
      .catch(() => setError("Could not fetch recommendations. Check your connection."))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handleAddToLibrary = useCallback(async (s: BookSuggestion) => {
    const book = suggestionToBook(s);
    const result = await addBookManually(book, false);
    if (result.isErr()) throw new Error(result.error);
  }, []);

  const handleAddToWishlist = useCallback(async (s: BookSuggestion) => {
    const book = suggestionToBook(s);
    const result = await addBookManually(book, true);
    if (result.isErr()) throw new Error(result.error);
  }, []);

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-24">
      {/* Header */}
      <header
        className="sticky top-0 z-20 pt-safe px-4 pb-3 border-b border-border"
        style={{ backgroundColor: "var(--color-bg)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="text-secondary hover:text-on-surface transition text-sm"
            >
              ←
            </button>
            <h1 className="text-xl font-bold text-on-surface">For You</h1>
          </div>
          <button
            onClick={loadRecommendations}
            disabled={isLoading}
            className="text-sm text-secondary hover:text-on-surface transition disabled:opacity-40"
            title="Refresh recommendations"
          >
            ↺
          </button>
        </div>
        <p className="text-secondary text-xs mt-1">
          Based on your reading history · powered by Open Library
        </p>
      </header>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-accent)" }}
          />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="px-4 py-8 flex flex-col items-center gap-4 text-center">
          <span className="text-4xl">📡</span>
          <p className="text-on-surface font-medium">{error}</p>
          <button onClick={loadRecommendations} className="btn-primary px-6">
            Retry
          </button>
        </div>
      )}

      {/* Empty state — library too small */}
      {!isLoading && !error && suggestions.length === 0 && (
        <div className="px-4 py-16 flex flex-col items-center gap-4 text-center">
          <span className="text-5xl">🔍</span>
          <p className="text-on-surface font-semibold">Not enough data yet</p>
          <p className="text-secondary text-sm max-w-xs">
            Add some books with genres to your library and recommendations will appear here.
          </p>
          <button onClick={() => navigate("/")} className="btn-primary px-6 mt-2">
            Go to Library
          </button>
        </div>
      )}

      {/* Suggestions list */}
      {!isLoading && suggestions.length > 0 && (
        <main className="px-4 py-4 flex flex-col gap-2">
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.key}
              suggestion={s}
              onAddToLibrary={handleAddToLibrary}
              onAddToWishlist={handleAddToWishlist}
            />
          ))}
        </main>
      )}
    </div>
  );
}
