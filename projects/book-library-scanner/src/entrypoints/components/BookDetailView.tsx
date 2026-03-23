/**
 * BookDetailView — full detail page for a single library entry.
 *
 * Displays all book metadata and allows editing:
 *  - Read status (with automatic start/finish date tracking)
 *  - Star rating
 *  - Reading progress (current page)
 *  - Personal notes
 *  - Tags / shelves
 *  - Loan tracking (record + return)
 *  - Reading journal (date-stamped entries)
 *  - Wishlist ↔ Library movement
 *  - Delete
 *
 * @module entrypoints/components/BookDetailView
 */

import { useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db";
import type { LibraryEntry, ReadStatus } from "@/domain/book";
import {
  updateReadStatus,
  updateRating,
  updateNotes,
  removeBook,
  updateReadingProgress,
  addTag,
  removeTag,
  recordLoan,
  returnLoan,
  addReadingLogEntry,
  removeReadingLogEntry,
  moveWishlistToLibrary,
  moveToWishlist,
} from "@/application/libraryService";
import { StarRating } from "./StarRating";
import { CoverPlaceholder } from "./CoverPlaceholder";

const READ_STATUS_OPTIONS: Array<{ value: ReadStatus; label: string; emoji: string }> = [
  { value: "unread", label: "Unread", emoji: "📖" },
  { value: "reading", label: "Reading", emoji: "🔖" },
  { value: "read", label: "Read", emoji: "✅" },
  { value: "dnf", label: "Did Not Finish", emoji: "⏭" },
];

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-card rounded-2xl p-4">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Reading progress section
// ---------------------------------------------------------------------------

interface ProgressSectionProps {
  entry: LibraryEntry;
}

function ProgressSection({ entry }: ProgressSectionProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(entry.currentPage ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  const pct =
    entry.currentPage !== null && entry.pageCount
      ? Math.min(100, Math.round((entry.currentPage / entry.pageCount) * 100))
      : null;

  const handleSave = useCallback(async () => {
    const page = value === "" ? null : parseInt(value, 10);
    if (page !== null && isNaN(page)) return;
    await updateReadingProgress(entry.id!, page);
    setEditing(false);
  }, [entry.id, value]);

  return (
    <Section title="Reading Progress">
      {pct !== null && (
        <div className="mb-3">
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full bg-blue-400 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-slate-400 text-xs mt-1 text-right">{pct}% complete</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              ref={inputRef}
              type="number"
              min="0"
              max={entry.pageCount ?? undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Current page"
              autoFocus
              className="flex-1 bg-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            {entry.pageCount && (
              <span className="text-slate-400 text-sm">/ {entry.pageCount}</span>
            )}
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              Save
            </button>
          </>
        ) : (
          <>
            <span className="text-slate-300 text-sm flex-1">
              {entry.currentPage !== null ? (
                <>
                  Page <span className="text-white font-medium">{entry.currentPage}</span>
                  {entry.pageCount ? ` of ${entry.pageCount}` : ""}
                </>
              ) : (
                <span className="text-slate-600 italic">No progress recorded</span>
              )}
            </span>
            <button
              onClick={() => {
                setValue(String(entry.currentPage ?? ""));
                setEditing(true);
              }}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Update
            </button>
          </>
        )}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Tags section
// ---------------------------------------------------------------------------

interface TagsSectionProps {
  entry: LibraryEntry;
}

function TagsSection({ entry }: TagsSectionProps) {
  const [input, setInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTag = useCallback(async () => {
    const tag = input.trim().toLowerCase();
    if (!tag || entry.tags.includes(tag)) {
      setInput("");
      setIsAdding(false);
      return;
    }
    await addTag(entry.id!, tag);
    setInput("");
    setIsAdding(false);
  }, [entry.id, entry.tags, input]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") void handleAddTag();
      if (e.key === "Escape") setIsAdding(false);
    },
    [handleAddTag],
  );

  return (
    <Section title="Tags">
      <div className="flex flex-wrap gap-1.5">
        {entry.tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-700 text-slate-300"
          >
            {tag}
            <button
              onClick={() => void removeTag(entry.id!, tag)}
              className="text-slate-500 hover:text-red-400 transition"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}

        {isAdding ? (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => void handleAddTag()}
            placeholder="Tag name…"
            autoFocus
            className="text-xs px-2.5 py-1 rounded-full bg-slate-700 text-white focus:outline-none w-28"
          />
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white transition border border-slate-600 border-dashed"
          >
            + Add tag
          </button>
        )}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Loan tracking section
// ---------------------------------------------------------------------------

interface LoanSectionProps {
  entry: LibraryEntry;
}

function LoanSection({ entry }: LoanSectionProps) {
  const [showLendForm, setShowLendForm] = useState(false);
  const [borrowerName, setBorrowerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRecord = useCallback(async () => {
    const name = borrowerName.trim();
    if (!name) return;
    setIsSubmitting(true);
    await recordLoan(entry.id!, name);
    setBorrowerName("");
    setShowLendForm(false);
    setIsSubmitting(false);
  }, [entry.id, borrowerName]);

  const handleReturn = useCallback(async () => {
    setIsSubmitting(true);
    await returnLoan(entry.id!);
    setIsSubmitting(false);
  }, [entry.id]);

  if (entry.loanedTo) {
    return (
      <Section title="Loan Tracking">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">
              Lent to <span className="font-semibold">{entry.loanedTo}</span>
            </p>
            {entry.loanedAt && (
              <p className="text-xs text-slate-400 mt-0.5">
                Since {new Date(entry.loanedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            onClick={() => void handleReturn()}
            disabled={isSubmitting}
            className="text-xs px-3 py-1.5 rounded-xl bg-emerald-800/50 text-emerald-300 hover:bg-emerald-800 transition font-medium"
          >
            Mark Returned
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Loan Tracking">
      {showLendForm ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={borrowerName}
            onChange={(e) => setBorrowerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleRecord()}
            placeholder="Borrower's name…"
            autoFocus
            className="flex-1 bg-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-slate-500"
          />
          <button
            onClick={() => setShowLendForm(false)}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleRecord()}
            disabled={isSubmitting || !borrowerName.trim()}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition disabled:opacity-40"
          >
            Save
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowLendForm(true)}
          className="text-sm text-slate-400 hover:text-white transition"
        >
          📤 Lend this book…
        </button>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Reading journal section
// ---------------------------------------------------------------------------

interface ReadingLogSectionProps {
  entry: LibraryEntry;
}

function ReadingLogSection({ entry }: ReadingLogSectionProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = useCallback(async () => {
    const text = content.trim();
    if (!text) return;
    setIsSubmitting(true);
    await addReadingLogEntry(entry.id!, text);
    setContent("");
    setIsSubmitting(false);
  }, [entry.id, content]);

  const sortedLog = [...(entry.readingLog ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Section title="Reading Journal">
      {/* New entry input */}
      <div className="flex flex-col gap-2 mb-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a note about where you are, what you think…"
          rows={3}
          className="w-full bg-slate-700 text-white text-sm rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-slate-500"
        />
        <button
          onClick={() => void handleAdd()}
          disabled={isSubmitting || !content.trim()}
          className="self-end text-xs px-3 py-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition font-medium disabled:opacity-40"
        >
          {isSubmitting ? "Saving…" : "Add Entry"}
        </button>
      </div>

      {/* Log entries */}
      {sortedLog.length === 0 ? (
        <p className="text-slate-600 italic text-sm">No journal entries yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedLog.map((logEntry) => (
            <div key={logEntry.id} className="border-l-2 border-slate-600 pl-3">
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{logEntry.content}</p>
              <div className="flex items-center justify-between mt-1">
                <time className="text-slate-500 text-xs">
                  {new Date(logEntry.createdAt).toLocaleString()}
                </time>
                <button
                  onClick={() => void removeReadingLogEntry(entry.id!, logEntry.id)}
                  className="text-slate-600 hover:text-red-400 transition text-xs"
                  aria-label="Delete journal entry"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

/**
 * Full-detail view for a single library entry. Supports inline editing of
 * status, rating, progress, notes, tags, loans, and reading journal.
 */
export function BookDetailView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const numericId = id ? parseInt(id, 10) : undefined;

  const entry = useLiveQuery<LibraryEntry | undefined>(
    () => (numericId !== undefined ? db.books.get(numericId) : Promise.resolve(undefined)),
    [numericId],
  );

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleStatusChange = useCallback(
    async (status: ReadStatus) => {
      if (numericId === undefined) return;
      await updateReadStatus(numericId, status);
    },
    [numericId],
  );

  const handleRatingChange = useCallback(
    async (rating: number) => {
      if (numericId === undefined) return;
      await updateRating(numericId, rating);
    },
    [numericId],
  );

  const handleSaveNotes = useCallback(async () => {
    if (numericId === undefined) return;
    await updateNotes(numericId, notesValue);
    setIsEditingNotes(false);
  }, [numericId, notesValue]);

  const handleDelete = useCallback(async () => {
    if (numericId === undefined) return;
    await removeBook(numericId);
    navigate("/");
  }, [numericId, navigate]);

  const handleToggleWishlist = useCallback(async () => {
    if (numericId === undefined || entry === undefined) return;
    if (entry.isWishlist) {
      await moveWishlistToLibrary(numericId);
    } else {
      await moveToWishlist(numericId);
    }
  }, [numericId, entry]);

  // Loading state
  if (entry === undefined) {
    return (
      <div className="min-h-screen bg-surface dark:bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Not found
  if (entry === null) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <p className="text-white">Book not found.</p>
        <button onClick={() => navigate("/")} className="text-slate-400 underline text-sm">
          Back to library
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-white pb-10">
      {/* Back navigation */}
      <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur pt-safe px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <button
          onClick={() => navigate("/")}
          className="text-slate-400 hover:text-white transition text-sm flex items-center gap-1"
        >
          ← Library
        </button>
        <button
          onClick={() => void handleToggleWishlist()}
          className="text-xs px-3 py-1 rounded-lg transition"
          style={{ color: entry.isWishlist ? "#f59e0b" : "var(--color-text-muted)" }}
          title={entry.isWishlist ? "Move to Library" : "Move to Wishlist"}
        >
          {entry.isWishlist ? "★ On Wishlist" : "☆ Add to Wishlist"}
        </button>
      </div>

      {/* Hero: cover + primary info */}
      <div className="flex flex-col items-center px-6 py-8 gap-5 bg-gradient-to-b from-slate-800 to-surface">
        <div className="w-32 h-48 rounded-2xl overflow-hidden shadow-2xl">
          {entry.coverUrl ? (
            <img
              src={entry.coverUrl}
              alt={`Cover of ${entry.title}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <CoverPlaceholder
              title={entry.title}
              className="w-full h-full rounded-2xl"
              textSize="text-4xl"
            />
          )}
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold leading-snug">{entry.title}</h1>
          <p className="text-slate-300 mt-1">{entry.authors.join(", ")}</p>
          {entry.publishedYear && (
            <p className="text-slate-500 text-sm mt-0.5">{entry.publishedYear}</p>
          )}
        </div>

        {/* Rating */}
        {!entry.isWishlist && (
          <StarRating value={entry.rating} onChange={(r) => void handleRatingChange(r)} size="lg" />
        )}
      </div>

      {/* Content sections */}
      <div className="px-4 pb-10 flex flex-col gap-4 mt-2">

        {/* Wishlist callout */}
        {entry.isWishlist && (
          <div className="bg-amber-900/30 rounded-2xl p-4 border border-amber-800/50 text-center">
            <p className="text-amber-300 text-sm font-medium">This book is on your wishlist</p>
            <button
              onClick={() => void handleToggleWishlist()}
              className="mt-2 text-xs px-4 py-1.5 rounded-xl bg-amber-700/50 text-amber-200 hover:bg-amber-700 transition"
            >
              Move to Library
            </button>
          </div>
        )}

        {/* Read status selector */}
        {!entry.isWishlist && (
          <Section title="Reading Status">
            <div className="grid grid-cols-2 gap-2">
              {READ_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => void handleStatusChange(opt.value)}
                  className={[
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    entry.readStatus === opt.value
                      ? "bg-white text-slate-900"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600",
                  ].join(" ")}
                >
                  <span>{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
            {entry.startedAt && (
              <p className="text-slate-500 text-xs mt-2 text-center">
                Started {new Date(entry.startedAt).toLocaleDateString()}
              </p>
            )}
            {entry.finishedAt && (
              <p className="text-slate-500 text-xs mt-0.5 text-center">
                Finished {new Date(entry.finishedAt).toLocaleDateString()}
              </p>
            )}
          </Section>
        )}

        {/* Reading progress (only for in-progress books) */}
        {entry.readStatus === "reading" && !entry.isWishlist && (
          <ProgressSection entry={entry} />
        )}

        {/* Tags */}
        <TagsSection entry={entry} />

        {/* Loan tracking */}
        {!entry.isWishlist && <LoanSection entry={entry} />}

        {/* Personal notes */}
        <Section title="Notes">
          <div className="flex items-center justify-between mb-3">
            <span />
            {!isEditingNotes ? (
              <button
                onClick={() => {
                  setNotesValue(entry.notes);
                  setIsEditingNotes(true);
                }}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditingNotes(false)}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSaveNotes()}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {isEditingNotes ? (
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Write your thoughts about this book…"
              rows={5}
              autoFocus
              className="w-full bg-slate-700 text-white text-sm rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-slate-500"
            />
          ) : (
            <p className="text-slate-300 text-sm whitespace-pre-wrap min-h-[3rem]">
              {entry.notes || (
                <span className="text-slate-600 italic">No notes yet. Tap Edit to add some.</span>
              )}
            </p>
          )}
        </Section>

        {/* Reading journal */}
        <ReadingLogSection entry={entry} />

        {/* Metadata */}
        <Section title="Details">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            {[
              { label: "ISBN", value: entry.isbn },
              { label: "Publisher", value: entry.publisher },
              { label: "Pages", value: entry.pageCount?.toLocaleString() },
              { label: "Language", value: entry.language?.toUpperCase() },
              { label: "Source", value: entry.metadataSource.replace("_", " ") },
              { label: "Added", value: new Date(entry.addedAt).toLocaleDateString() },
            ]
              .filter((item) => item.value)
              .map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-slate-500 text-xs">{label}</dt>
                  <dd className="text-white">{value}</dd>
                </div>
              ))}
          </dl>
          {entry.genres.length > 0 && (
            <div className="mt-3">
              <dt className="text-slate-500 text-xs mb-1.5">Genres</dt>
              <div className="flex flex-wrap gap-1.5">
                {entry.genres.map((g) => (
                  <span
                    key={g}
                    className="text-xs bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Description */}
        {entry.description && (
          <Section title="Synopsis">
            <p className="text-slate-300 text-sm leading-relaxed line-clamp-6">
              {entry.description}
            </p>
          </Section>
        )}

        {/* Delete */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 rounded-2xl border border-red-900/50 text-red-400 font-medium text-sm hover:bg-red-900/20 transition"
          >
            Remove from Library
          </button>
        ) : (
          <div className="bg-red-950/50 rounded-2xl p-4 flex flex-col gap-3 border border-red-900/50">
            <p className="text-red-300 text-sm text-center font-medium">
              Remove &ldquo;{entry.title}&rdquo; from your library?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                className="flex-1 py-2.5 rounded-xl bg-red-700 text-white text-sm font-medium hover:bg-red-600 transition"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
