/**
 * LibraryView — the main library browser page.
 *
 * Displays books in the user's library with:
 *  - Full-text search (title, author, tag)
 *  - Filter tabs by read status + a dedicated Wishlist tab
 *  - Sort options (date added, title, author, rating)
 *  - Export / import
 *  - Bottom navigation bar (Library, Scan, Add, Stats, For You)
 *
 * @module entrypoints/components/LibraryView
 */

import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db";
import type { LibraryEntry, ReadStatus, SortOrder } from "@/domain/book";
import { exportLibraryAsJson, importLibraryFromJson, moveWishlistToLibrary } from "@/application/libraryService";
import { BookCard } from "./BookCard";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type FilterStatus = ReadStatus | "all" | "wishlist";

const FILTER_TABS: Array<{ value: FilterStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
  { value: "dnf", label: "DNF" },
  { value: "wishlist", label: "Wishlist" },
];

const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: "added_desc", label: "Newest first" },
  { value: "added_asc", label: "Oldest first" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "author_asc", label: "Author A–Z" },
  { value: "rating_desc", label: "Highest rated" },
];

/**
 * Sort a list of LibraryEntry objects according to the given SortOrder.
 *
 * @param books - The books to sort (not mutated).
 * @param order - The desired sort order.
 * @returns A new sorted array.
 */
function sortBooks(books: LibraryEntry[], order: SortOrder): LibraryEntry[] {
  const copy = [...books];
  switch (order) {
    case "added_asc":
      return copy.sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
    case "added_desc":
      return copy.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    case "title_asc":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "author_asc":
      return copy.sort((a, b) => (a.authors[0] ?? "").localeCompare(b.authors[0] ?? ""));
    case "rating_desc":
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }
}

// ---------------------------------------------------------------------------
// Bottom navigation bar
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Library", icon: "📚", path: "/" },
  { label: "Scan", icon: "📷", path: "/scan" },
  { label: "Add", icon: "✏️", path: "/add" },
  { label: "Stats", icon: "📊", path: "/stats" },
  { label: "For You", icon: "✨", path: "/recommendations" },
];

function BottomNav({ currentPath }: { currentPath: string }) {
  const navigate = useNavigate();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 pb-safe border-t border-border z-30"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all"
              style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-muted)" }}
              aria-label={item.label}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

/**
 * Main library view with search, status filtering, sort, and bottom navigation.
 */
export function LibraryView() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("added_desc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const isWishlistMode = activeFilter === "wishlist";

  // Live query — reads all books; splitting by isWishlist is done in JS
  const allBooks = useLiveQuery<LibraryEntry[]>(
    () => db.books.toArray(),
    [],
  );

  const filteredBooks = useMemo(() => {
    if (!allBooks) return [];
    const lower = query.toLowerCase();

    let pool = allBooks.filter((book) => {
      if (isWishlistMode) return book.isWishlist;
      if (book.isWishlist) return false; // exclude wishlist from main tabs
      const matchesFilter = activeFilter === "all" || book.readStatus === activeFilter;
      return matchesFilter;
    });

    if (lower) {
      pool = pool.filter(
        (book) =>
          book.title.toLowerCase().includes(lower) ||
          book.authors.some((a) => a.toLowerCase().includes(lower)) ||
          book.tags.some((t) => t.toLowerCase().includes(lower)) ||
          book.genres.some((g) => g.toLowerCase().includes(lower)),
      );
    }

    return sortBooks(pool, sortOrder);
  }, [allBooks, query, activeFilter, isWishlistMode, sortOrder]);

  const libraryBooks = useMemo(() => allBooks?.filter((b) => !b.isWishlist) ?? [], [allBooks]);
  const wishlistBooks = useMemo(() => allBooks?.filter((b) => b.isWishlist) ?? [], [allBooks]);

  const isLoading = allBooks === undefined;
  const isEmpty = !isLoading && libraryBooks.length === 0 && wishlistBooks.length === 0;

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImportError(null);
      setImportSuccess(null);
      const result = await importLibraryFromJson(file);
      if (result.isOk()) {
        setImportSuccess(`Imported ${result.value} book${result.value !== 1 ? "s" : ""}.`);
      } else {
        setImportError(result.error);
      }
      // Reset so the same file can be re-imported if needed
      e.target.value = "";
    },
    [],
  );

  const handleMoveToLibrary = useCallback(
    async (id: number) => {
      await moveWishlistToLibrary(id);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-20">
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
                ? `${libraryBooks.length} book${libraryBooks.length !== 1 ? "s" : ""}${wishlistBooks.length > 0 ? ` · ${wishlistBooks.length} on wishlist` : ""}`
                : "…"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu((v) => !v)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-secondary hover:text-on-surface transition"
                title="Sort"
              >
                ↕ {SORT_OPTIONS.find((o) => o.value === sortOrder)?.label.split(" ")[0]}
              </button>
              {showSortMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSortMenu(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 z-20 rounded-xl shadow-xl overflow-hidden min-w-[160px]"
                    style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSortOrder(opt.value);
                          setShowSortMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm transition hover:opacity-80"
                        style={{
                          color: sortOrder === opt.value ? "var(--color-accent)" : "var(--color-text-primary)",
                          backgroundColor: sortOrder === opt.value ? "var(--color-bg)" : "transparent",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Export / Import */}
            <button
              onClick={() => void exportLibraryAsJson()}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-secondary hover:text-on-surface transition"
              title="Export library"
            >
              ↑
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-secondary hover:text-on-surface transition"
              title="Import library"
            >
              ↓
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => void handleImport(e)}
            />
          </div>
        </div>

        {/* Import feedback */}
        {importSuccess && (
          <div className="mb-2 text-xs text-emerald-400 bg-emerald-950/40 rounded-lg px-3 py-1.5">
            {importSuccess}
          </div>
        )}
        {importError && (
          <div className="mb-2 text-xs text-red-400 bg-red-950/40 rounded-lg px-3 py-1.5">
            {importError}
          </div>
        )}

        {/* Search bar */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, author, or tag…"
            className="input pl-9"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_TABS.map((tab) => {
            let count: number;
            if (tab.value === "wishlist") {
              count = wishlistBooks.length;
            } else if (tab.value === "all") {
              count = libraryBooks.length;
            } else {
              count = libraryBooks.filter((b) => b.readStatus === tab.value).length;
            }

            const isActive = activeFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: isActive ? "var(--color-accent)" : "var(--color-bg-card)",
                  color: isActive ? "var(--color-accent-fg)" : "var(--color-text-secondary)",
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
              scanning its barcode, or tap <strong className="text-on-surface">Add</strong> to
              enter details manually.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/scan")}
                className="btn-primary mt-2 px-6 py-3"
              >
                Scan a book
              </button>
              <button
                onClick={() => navigate("/add")}
                className="mt-2 px-6 py-3 rounded-2xl border border-border text-on-surface text-sm font-medium"
              >
                Add manually
              </button>
            </div>
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
              <BookCard
                key={entry.id}
                entry={entry}
                action={
                  entry.isWishlist ? (
                    <button
                      onClick={() => void handleMoveToLibrary(entry.id!)}
                      className="text-[10px] px-2 py-1 rounded-lg font-medium"
                      style={{
                        backgroundColor: "var(--color-accent)",
                        color: "var(--color-accent-fg)",
                      }}
                    >
                      + Library
                    </button>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav currentPath="/" />
    </div>
  );
}
