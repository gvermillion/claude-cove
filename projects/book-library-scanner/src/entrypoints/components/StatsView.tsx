/**
 * StatsView — reading statistics dashboard.
 *
 * Displays aggregate metrics derived from the user's library: read counts,
 * pages read, ratings, top genres, top authors, and a 12-month reading pace chart.
 *
 * @module entrypoints/components/StatsView
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { libraryRepository, type LibraryStats } from "@/infrastructure/db";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

/** A single metric card in the stats grid. */
function StatCard({ label, value, sub, accent = false }: StatCardProps) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: accent ? "var(--color-accent)" : "var(--color-bg-card)" }}
    >
      <span
        className="text-2xl font-bold"
        style={{ color: accent ? "var(--color-accent-fg)" : "var(--color-text-primary)" }}
      >
        {value}
      </span>
      <span
        className="text-xs font-medium"
        style={{ color: accent ? "var(--color-accent-fg)" : "var(--color-text-secondary)", opacity: accent ? 0.85 : 1 }}
      >
        {label}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

interface BarChartProps {
  items: Array<{ label: string; count: number }>;
  maxCount: number;
}

/** A horizontal bar chart built from divs. */
function BarChart({ items, maxCount }: BarChartProps) {
  return (
    <div className="flex flex-col gap-2">
      {items.map(({ label, count }) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className="text-xs w-28 truncate flex-shrink-0"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {label}
          </span>
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: maxCount > 0 ? `${(count / maxCount) * 100}%` : "0%",
                backgroundColor: "var(--color-accent)",
              }}
            />
          </div>
          <span className="text-xs w-4 text-right flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

interface PaceChartProps {
  data: Array<{ month: string; count: number }>;
}

/** A mini column chart for monthly reading pace. */
function PaceChart({ data }: PaceChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map(({ month, count }) => (
        <div key={month} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm transition-all duration-500"
            style={{
              height: `${(count / maxCount) * 64}px`,
              minHeight: count > 0 ? 4 : 0,
              backgroundColor: count > 0 ? "var(--color-accent)" : "var(--color-border)",
            }}
            title={`${month}: ${count} book${count !== 1 ? "s" : ""}`}
          />
          <span
            className="text-[9px] leading-none"
            style={{ color: "var(--color-text-muted)" }}
          >
            {month.split(" ")[0]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

/**
 * Full-page statistics dashboard showing reading metrics derived from the library.
 */
export function StatsView() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void libraryRepository
      .getStats()
      .then(setStats)
      .finally(() => setIsLoading(false));
  }, []);

  const averageRatingDisplay =
    stats?.averageRating != null ? stats.averageRating.toFixed(1) : "—";

  const genreMax = stats?.topGenres[0]?.count ?? 1;
  const authorMax = stats?.topAuthors[0]?.count ?? 1;

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-24">
      {/* Header */}
      <header
        className="sticky top-0 z-20 pt-safe px-4 pb-3 border-b border-border"
        style={{ backgroundColor: "var(--color-bg)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-secondary hover:text-on-surface transition text-sm"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-on-surface">Reading Stats</h1>
        </div>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-accent)" }}
          />
        </div>
      )}

      {stats && !isLoading && (
        <main className="px-4 py-4 flex flex-col gap-6">
          {/* Overview grid */}
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Library Overview
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Books" value={stats.total} accent />
              <StatCard label="Read This Year" value={stats.readThisYear} />
              <StatCard label="Currently Reading" value={stats.reading} />
              <StatCard label="On Wishlist" value={stats.wishlist} />
            </div>
          </section>

          {/* Reading breakdown */}
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Breakdown
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Read" value={stats.read} />
              <StatCard label="Unread" value={stats.unread} />
              <StatCard
                label="Pages Read"
                value={stats.totalPagesRead > 0 ? stats.totalPagesRead.toLocaleString() : "—"}
              />
              <StatCard label="Avg Rating" value={averageRatingDisplay} sub="out of 5" />
            </div>
            {stats.loanedOut > 0 && (
              <div className="mt-3">
                <StatCard label="Currently Loaned Out" value={stats.loanedOut} />
              </div>
            )}
          </section>

          {/* Reading pace chart */}
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Books Finished — Last 12 Months
            </h2>
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: "var(--color-bg-card)" }}
            >
              {stats.readingPaceByMonth.some((d) => d.count > 0) ? (
                <PaceChart data={stats.readingPaceByMonth} />
              ) : (
                <p className="text-secondary text-sm text-center py-4">
                  No finished books recorded yet.
                </p>
              )}
            </div>
          </section>

          {/* Top genres */}
          {stats.topGenres.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Top Genres
              </h2>
              <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--color-bg-card)" }}>
                <BarChart
                  items={stats.topGenres.map((g) => ({ label: g.genre, count: g.count }))}
                  maxCount={genreMax}
                />
              </div>
            </section>
          )}

          {/* Top authors */}
          {stats.topAuthors.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Most-Read Authors
              </h2>
              <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--color-bg-card)" }}>
                <BarChart
                  items={stats.topAuthors.map((a) => ({ label: a.author, count: a.count }))}
                  maxCount={authorMax}
                />
              </div>
            </section>
          )}

          {stats.total === 0 && (
            <div className="text-center py-16">
              <span className="text-5xl">📊</span>
              <p className="text-on-surface font-semibold mt-4">No data yet</p>
              <p className="text-secondary text-sm mt-1">
                Add some books to your library to see your reading stats.
              </p>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
