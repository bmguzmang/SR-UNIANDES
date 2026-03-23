import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatRating, ratingTone } from "@/lib/utils/format";

export function RatingPill({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  const tone = ratingTone(rating);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        tone === "positive" && "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        tone === "neutral" && "border-slate-500/40 bg-slate-700/40 text-slate-200",
        tone === "negative" && "border-rose-500/30 bg-rose-500/15 text-rose-300",
        className,
      )}
    >
      <Star className="h-3 w-3" />
      {formatRating(rating)}
    </span>
  );
}
