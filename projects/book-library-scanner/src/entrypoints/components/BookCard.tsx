/**
 * BookCard — compact card representation of a library entry.
 *
 * Displays cover thumbnail (or a generated placeholder), title, authors,
 * read status badge, tags, and loan/wishlist indicators.
 * Navigates to the book detail view on click. Adapts to system dark/light mode.
 *
 * @module entrypoints/components/BookCard
 */

import { useNavigate } from "react-router-dom";
import type { LibraryEntry } from "@/domain/book";
import { StarRating } from "./StarRating";
import { CoverPlaceholder } from "./CoverPlaceholder";

interface BookCardProps {
  entry: LibraryEntry;
  /** Optional action rendered in the bottom-right corner (e.g. "Move to Library" button). */
  action?: React.ReactNode;
}

const STATUS_BADGE: Record<
  LibraryEntry["readStatus"],
  { label: string; lightClass: string; darkClass: string }
> = {
  unread: {
    label: "Unread",
    lightClass: "bg-slate-100 text-slate-600",
    darkClass: "dark:bg-slate-700 dark:text-slate-300",
  },
  reading: {
    label: "Reading",
    lightClass: "bg-blue-50 text-blue-700",
    darkClass: "dark:bg-blue-900 dark:text-blue-300",
  },
  read: {
    label: "Read",
    lightClass: "bg-emerald-50 text-emerald-700",
    darkClass: "dark:bg-emerald-900 dark:text-emerald-300",
  },
  dnf: {
    label: "DNF",
    lightClass: "bg-red-50 text-red-600",
    darkClass: "dark:bg-red-900 dark:text-red-300",
  },
};

/**
 * Compact card for displaying a library entry in a list view.
 * Uses CSS custom properties for theme-aware background/text colours.
 */
export function BookCard({ entry, action }: BookCardProps) {
  const navigate = useNavigate();
  const badge = STATUS_BADGE[entry.readStatus];

  // Reading progress percentage (only if we have both currentPage and pageCount)
  const progressPct =
    entry.currentPage !== null && entry.pageCount
      ? Math.min(100, Math.round((entry.currentPage / entry.pageCount) * 100))
      : null;

  return (
    <article
      className="flex gap-3 p-3 rounded-xl transition-all cursor-pointer select-none active:scale-[0.98]"
      style={{ backgroundColor: "var(--color-bg-card)" }}
      onClick={() => navigate(`/book/${entry.id ?? ""}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/book/${entry.id ?? ""}`)}
      aria-label={`${entry.title} by ${entry.authors.join(", ")}`}
    >
      {/* Cover thumbnail */}
      <div
        className="flex-shrink-0 w-14 h-20 rounded-lg overflow-hidden shadow"
        style={{ backgroundColor: "var(--color-border)" }}
      >
        {entry.coverUrl ? (
          <img
            src={entry.coverUrl}
            alt={`Cover of ${entry.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <CoverPlaceholder title={entry.title} className="w-full h-full" textSize="text-xl" />
        )}
      </div>

      {/* Metadata */}
      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div>
          <h3 className="font-semibold text-on-surface text-sm leading-snug line-clamp-2">
            {entry.title}
          </h3>
          <p className="text-secondary text-xs mt-0.5 truncate">
            {entry.authors.join(", ")}
          </p>
          {entry.publishedYear && (
            <p className="text-muted text-xs">{entry.publishedYear}</p>
          )}

          {/* Tags (up to 2 shown) */}
          {entry.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {entry.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    color: "var(--color-text-muted)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {tag}
                </span>
              ))}
              {entry.tags.length > 2 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  +{entry.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {!entry.isWishlist && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.lightClass} ${badge.darkClass}`}
            >
              {badge.label}
            </span>
          )}

          {entry.loanedTo && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
              Lent to {entry.loanedTo}
            </span>
          )}

          {entry.rating && !entry.isWishlist && (
            <StarRating value={entry.rating} readOnly size="sm" />
          )}

          {/* Reading progress pill */}
          {progressPct !== null && entry.readStatus === "reading" && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {progressPct}%
            </span>
          )}

          {action && (
            <div
              className="ml-auto"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {action}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
