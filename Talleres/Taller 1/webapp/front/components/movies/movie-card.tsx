import Link from "next/link";
import { ArrowRight, Star, Users } from "lucide-react";
import type { Movie } from "@/types/domain";
import { MoviePoster } from "@/components/shared/movie-poster";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GenreBadges } from "@/components/shared/genre-badges";
import { formatRating } from "@/lib/utils/format";

export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow">
      <CardContent className="p-0">
        <div className="grid h-full gap-0 sm:grid-cols-[140px_1fr]">
          <MoviePoster
            title={movie.title}
            image={movie.image}
            className="aspect-[2/3] h-full rounded-none border-0 sm:border-r sm:border-border/60"
            showFallbackLabel={false}
          />
          <div className="flex h-full flex-col gap-3 p-4">
            <div>
              <h3 className="text-base font-semibold leading-snug">
                {movie.title}
                {movie.year ? ` (${movie.year})` : ""}
              </h3>
              <p className="text-xs text-muted-foreground">movieId: {movie.movieId}</p>
            </div>
            <GenreBadges genres={movie.genres} />
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-2.5 py-2 text-muted-foreground">
                <Star className="h-3.5 w-3.5 text-amber-300" />
                <span className="text-foreground">{formatRating(movie.averageRating)}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-2.5 py-2 text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-sky-200" />
                <span className="text-foreground">{movie.ratingCount ?? "N/A"}</span>
              </div>
            </div>
            <Button asChild variant="outline" className="mt-auto w-full">
              <Link href={`/movies/${movie.movieId}`}>
                Open Details
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
