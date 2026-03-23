/**
 * LibraryView — the main library browser page.
 *
 * Displays all books in the user's library with filtering by read status
 * and full-text search. Adapts to system light/dark mode via CSS variables.
 *
 * @module entrypoints/components/LibraryView
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db";
import type { LibraryEntry, ReadStatus } from "@/domain/book";
import { BookCard } from "./BookCard";

type FilterStatus = ReadStatus | "all";

const FILTER_TABS: Array<{ value: FilterStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
  { value: "dnf", label: "DNF" },
];

/**
 * Main library view with search and status filtering.
 * Respects system dark/light mode via CSS custom properties.
 */
export function LibraryView() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");

  // Live query — automatically re-renders when the database changes
  const allBooks = useLiveQuery<LibraryEntry[]>(
    () => db.books.orderBy("addedAt").reverse().toArray(),
    [],
  );

  const filteredBooks = useMemo(() => {
    if (!allBooks) return [];
    const lower = query.toLowerCase();

    return allBooks.filter((book) => {
      const matchesFilter = activeFilter === "all" || book.readStatus === activeFilter;
      const matchesSearch =
        !lower ||
        book.title.toLowerCase().includes(lower) ||
        book.authors.some((a) => a.toLowerCase().includes(lower)) ||
        book.genres.some((g) => g.toLowerCase().includes(lower));
      return matchesFilter && matchesSearch;
    });
  }, [allBooks, query, activeFilter]);

  const isLoading = allBooks === undefined;
  const isEmpty = !isLoading && allBooks.length === 0;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-20 pt-safe px-4 pb-3 border-b border-border"
        style={{ backgroundColor: "var(--color-bg)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-on-surface">My Library</h1>
            <p className="text-secondary text-xs">
              {allBooks
                ? `${allBooks.length} book${allBooks.length !== 1 ? "s" : ""}`
                : "…"}
            </p>
          </div>
          <button
            onClick={() => navigate("/scan")}
            className="btn-primary flex items-center gap-2 text-sm shadow"
            aria-label="Scan a new book"
          >
            <span>📷</span> Scan
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or author…"
            className="input pl-9"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? (allBooks?.length ?? 0)
                : (allBooks?.filter((b) => b.readStatus === tab.value).length ?? 0);

            const isActive = activeFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: isActive
                    ? "var(--color-accent)"
                    : "var(--color-bg-card)",
                  color: isActive
                    ? "var(--color-accent-fg)"
                    : "var(--color-text-secondary)",
                }}
              >
                {tab.label} {count > 0 && <span className="opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--color-border)",
                borderTopColor: "var(--color-accent)",
              }}
            />
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <span className="text-6xl">📚</span>
            <p className="text-on-surface font-semibold text-lg">Your library is empty</p>
            <p className="text-secondary text-sm max-w-xs">
              Tap <strong className="text-on-surface">Scan</strong> to add your first book by
              scanning its barcode.
            </p>
            <button
              onClick={() => navigate("/scan")}
              className="btn-primary mt-2 px-6 py-3"
            >
              Scan my first book
            </button>
          </div>
        )}

        {!isLoading && !isEmpty && filteredBooks.length === 0 && (
          <div className="text-center py-16 text-secondary">
            <p className="text-lg">No books match your search.</p>
            <button
              onClick={() => {
                setQuery("");
                setActiveFilter("all");
              }}
              className="mt-3 text-sm text-on-surface underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {filteredBooks.length > 0 && (
          <div className="flex flex-col gap-2">
            {filteredBooks.map((entry) => (
              <BookCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
