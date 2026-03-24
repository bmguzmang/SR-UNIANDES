import Link from "next/link";
import type { MovieNeighbor } from "@/types/domain";
import { MoviePoster } from "@/components/shared/movie-poster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenreBadges } from "@/components/shared/genre-badges";

export function NeighborsList({ neighbors }: { neighbors: MovieNeighbor[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Peliculas similares (vecinas)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {neighbors.map((neighbor) => (
          <div
            key={neighbor.movieId}
            className="rounded-lg border border-border/60 bg-slate-950/40 p-3"
          >
            <div className="flex items-start gap-3">
              <MoviePoster
                title={neighbor.title}
                image={neighbor.image}
                className="h-20 w-14 shrink-0 rounded-md"
                showFallbackLabel={false}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link
                      href={`/movies/${neighbor.movieId}`}
                      className="text-sm font-medium hover:text-sky-200"
                    >
                      {neighbor.title}
                      {neighbor.year ? ` (${neighbor.year})` : ""}
                    </Link>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Similitud de Pearson</p>
                    <p className="font-semibold text-sky-200">
                      {neighbor.similarity.toFixed(3)}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <GenreBadges genres={neighbor.genres} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
