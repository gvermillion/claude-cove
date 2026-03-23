/**
 * Star rating widget — renders 1–5 interactive stars.
 *
 * @module entrypoints/components/StarRating
 */

interface StarRatingProps {
  /** Current rating value (1–5) or null for unrated. */
  value: number | null;
  /** Called when the user selects a new rating. */
  onChange?: (rating: number) => void;
  /** When true, stars are display-only and not interactive. */
  readOnly?: boolean;
  /** Visual size class for the star icons. */
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-xl",
  lg: "text-2xl",
};

/**
 * Renders an interactive or read-only 5-star rating widget.
 */
export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: StarRatingProps) {
  return (
    <div className="flex gap-0.5" role={readOnly ? "img" : "group"} aria-label={`Rating: ${value ?? 0} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          className={[
            SIZE_CLASSES[size],
            "transition-colors duration-100",
            readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform",
            (value ?? 0) >= star ? "text-amber-400" : "text-slate-600",
          ].join(" ")}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
