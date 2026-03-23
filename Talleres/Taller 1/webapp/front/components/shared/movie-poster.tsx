import { Film } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface MoviePosterProps {
  title: string;
  image?: string | null;
  className?: string;
  imageClassName?: string;
  showFallbackLabel?: boolean;
}

function normalizePosterUrl(image?: string | null): string | null {
  if (!image) return null;
  const trimmed = image.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

export function MoviePoster({
  title,
  image,
  className,
  imageClassName,
  showFallbackLabel = true,
}: MoviePosterProps) {
  const imageSrc = normalizePosterUrl(image);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-slate-900/70",
        className,
      )}
    >
      {imageSrc ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={`${title} poster`}
            loading="lazy"
            className={cn("h-full w-full object-cover", imageClassName)}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/5 to-transparent" />
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.22),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] px-2 text-center text-slate-300">
          <Film className="h-6 w-6" />
          {showFallbackLabel ? (
            <span className="text-[11px] uppercase tracking-wide text-slate-300/90">
              Poster unavailable
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
