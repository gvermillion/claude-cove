/**
 * CoverPlaceholder — generated cover art for books without a cover image.
 *
 * Renders a coloured background with the book's title initials, using a
 * deterministic colour derived from the title string. This replaces the
 * generic 📚 emoji used as a fallback in v0.1.
 *
 * @module entrypoints/components/CoverPlaceholder
 */

// Palette of visually distinct background colours
const PALETTE = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#f97316", // orange
  "#a855f7", // purple
];

/**
 * Derive a deterministic colour from a string using a simple hash.
 *
 * @param str - The input string (typically the book title).
 * @returns A hex colour string from the palette.
 */
function pickColour(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]!;
}

/**
 * Extract up to two initials from a title string.
 *
 * Examples:
 *   "Dune" → "D"
 *   "The Great Gatsby" → "TG"
 *   "1984" → "19"
 *
 * @param title - The book title.
 * @returns 1–2 character initials string.
 */
function extractInitials(title: string): string {
  const words = title.trim().split(/\s+/);
  if (words.length === 1) {
    return (words[0] ?? "").slice(0, 2).toUpperCase();
  }
  const first = words[0] ?? "";
  const second = words[1] ?? "";
  return (first[0] ?? "") + (second[0] ?? "").toUpperCase();
}

interface CoverPlaceholderProps {
  /** Book title — used to derive the initials and background colour. */
  title: string;
  /** Optional extra CSS class names for sizing/rounding. */
  className?: string;
  /** Font size class for the initials text. Defaults to "text-2xl". */
  textSize?: string;
}

/**
 * Renders a deterministic colour-coded placeholder for books without cover art.
 */
export function CoverPlaceholder({ title, className = "", textSize = "text-2xl" }: CoverPlaceholderProps) {
  const bg = pickColour(title);
  const initials = extractInitials(title);

  return (
    <div
      className={`flex items-center justify-center font-bold text-white select-none ${textSize} ${className}`}
      style={{ backgroundColor: bg }}
      aria-label={`Cover placeholder for ${title}`}
    >
      {initials}
    </div>
  );
}
