import { ArrowRight, MessageCircleMore } from "lucide-react";
import type { RecommendationItem } from "@/types/domain";
import { MoviePoster } from "@/components/shared/movie-poster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface RecommendationCardProps {
  recommendation: RecommendationItem;
  onViewExplanation: (item: RecommendationItem) => void;
  onEvaluate: (item: RecommendationItem) => void;
}

export function RecommendationCard({
  recommendation,
  onViewExplanation,
  onEvaluate,
}: RecommendationCardProps) {
  const titleWithYear = recommendation.year
    ? `${recommendation.title} (${recommendation.year})`
    : recommendation.title;
  const genreLabel = recommendation.genres.length
    ? recommendation.genres.slice(0, 2).join(" | ")
    : "Genero no especificado";

  return (
    <Card
      className="group relative h-full cursor-pointer overflow-hidden border-white/10 bg-slate-950/80 transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_18px_44px_-18px_rgba(2,6,23,0.95)]"
      onClick={() => onViewExplanation(recommendation)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onViewExplanation(recommendation);
        }
      }}
    >
      <MoviePoster
        title={recommendation.title}
        image={recommendation.image}
        className="aspect-[2/3] rounded-none border-0"
        imageClassName="transition-transform duration-500 group-hover:scale-[1.05]"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <span className="rounded-full border border-red-500/50 bg-red-600/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
          Puesto #{recommendation.rank}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 space-y-3 p-3">
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-white md:text-base">
            {titleWithYear}
          </h3>
          <p className="line-clamp-1 text-xs text-slate-300/90">
            {genreLabel}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 transition-all duration-300 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
          <Button
            size="sm"
            className="h-9 bg-white text-slate-950 hover:bg-white/90"
            onClick={(event) => {
              event.stopPropagation();
              onViewExplanation(recommendation);
            }}
          >
            <ArrowRight className="h-4 w-4" />
            ¿Para mí?
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-9 border border-white/20 bg-slate-900/70 text-slate-100 hover:bg-slate-800/90"
            onClick={(event) => {
              event.stopPropagation();
              onEvaluate(recommendation);
            }}
          >
            <MessageCircleMore className="h-4 w-4" />
            Evaluar
          </Button>
        </div>
      </div>
    </Card>
  );
}
