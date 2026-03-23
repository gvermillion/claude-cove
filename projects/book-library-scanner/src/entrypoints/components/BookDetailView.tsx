/**
 * BookDetailView — full detail page for a single library entry.
 *
 * Displays all book metadata, allows editing read status, rating, and notes,
 * and provides a delete option.
 *
 * @module entrypoints/components/BookDetailView
 */

import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db";
import type { LibraryEntry, ReadStatus } from "@/domain/book";
import { updateReadStatus, updateRating, updateNotes, removeBook } from "@/application/libraryService";
import { StarRating } from "./StarRating";

const READ_STATUS_OPTIONS: Array<{ value: ReadStatus; label: string; emoji: string }> = [
  { value: "unread", label: "Unread", emoji: "📖" },
  { value: "reading", label: "Reading", emoji: "🔖" },
  { value: "read", label: "Read", emoji: "✅" },
  { value: "dnf", label: "Did Not Finish", emoji: "⏭" },
];

/**
 * Full-detail view for a single library entry. Supports inline editing of
 * status, rating, and personal notes.
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
    <div className="min-h-screen bg-surface text-white">
      {/* Back navigation */}
      <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur pt-safe px-4 py-3 flex items-center border-b border-slate-800">
        <button
          onClick={() => navigate("/")}
          className="text-slate-400 hover:text-white transition text-sm flex items-center gap-1"
        >
          ← Library
        </button>
      </div>

      {/* Hero: cover + primary info */}
      <div className="flex flex-col items-center px-6 py-8 gap-5 bg-gradient-to-b from-slate-800 to-surface">
        <div className="w-32 h-48 rounded-2xl overflow-hidden bg-slate-700 shadow-2xl">
          {entry.coverUrl ? (
            <img
              src={entry.coverUrl}
              alt={`Cover of ${entry.title}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">📚</div>
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
        <StarRating value={entry.rating} onChange={(r) => void handleRatingChange(r)} size="lg" />
      </div>

      {/* Content sections */}
      <div className="px-4 pb-10 flex flex-col gap-4 mt-2">
        {/* Read status selector */}
        <section className="bg-surface-card rounded-2xl p-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Reading Status
          </h2>
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
          {entry.finishedAt && (
            <p className="text-slate-500 text-xs mt-2 text-center">
              Finished {entry.finishedAt.toLocaleDateString()}
            </p>
          )}
        </section>

        {/* Personal notes */}
        <section className="bg-surface-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Notes
            </h2>
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
              {entry.notes || <span className="text-slate-600 italic">No notes yet. Tap Edit to add some.</span>}
            </p>
          )}
        </section>

        {/* Metadata */}
        <section className="bg-surface-card rounded-2xl p-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Details
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            {[
              { label: "ISBN", value: entry.isbn },
              { label: "Publisher", value: entry.publisher },
              { label: "Pages", value: entry.pageCount?.toLocaleString() },
              { label: "Language", value: entry.language?.toUpperCase() },
              { label: "Source", value: entry.metadataSource.replace("_", " ") },
              { label: "Added", value: entry.addedAt.toLocaleDateString() },
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
        </section>

        {/* Description */}
        {entry.description && (
          <section className="bg-surface-card rounded-2xl p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Synopsis
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed line-clamp-6">
              {entry.description}
            </p>
          </section>
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
