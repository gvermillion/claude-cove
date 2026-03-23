/**
 * BookCard — compact card representation of a library entry.
 *
 * Displays cover thumbnail, title, authors, and read status badge.
 * Navigates to the book detail view on click. Adapts to system dark/light mode.
 *
 * @module entrypoints/components/BookCard
 */

import { useNavigate } from "react-router-dom";
import type { LibraryEntry } from "@/domain/book";
import { StarRating } from "./StarRating";

interface BookCardProps {
  entry: LibraryEntry;
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
 * Compact card for displaying a library entry in a grid or list view.
 * Uses CSS custom properties for theme-aware background/text colours.
 */
export function BookCard({ entry }: BookCardProps) {
  const navigate = useNavigate();
  const badge = STATUS_BADGE[entry.readStatus];

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
          <div className="w-full h-full flex items-center justify-center text-2xl text-muted">
            📚
          </div>
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
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.lightClass} ${badge.darkClass}`}
          >
            {badge.label}
          </span>
          {entry.rating && <StarRating value={entry.rating} readOnly size="sm" />}
        </div>
      </div>
    </article>
  );
}
