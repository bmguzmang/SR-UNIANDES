"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NeighborsList } from "@/components/movies/neighbors-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { GenreBadges } from "@/components/shared/genre-badges";
import { LoadingGrid } from "@/components/shared/loading-grid";
import { MoviePoster } from "@/components/shared/movie-poster";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMovie, useMovieNeighbors } from "@/lib/hooks/use-movies";
import { formatRating } from "@/lib/utils/format";

export default function MovieDetailsPage() {
  const params = useParams<{ movieId?: string | string[] }>();
  const movieIdParam = Array.isArray(params.movieId) ? params.movieId[0] : params.movieId;
  const movieId = Number(movieIdParam);
  const movieQuery = useMovie(Number.isNaN(movieId) ? undefined : movieId);
  const neighborsQuery = useMovieNeighbors(Number.isNaN(movieId) ? undefined : movieId, 12);

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="w-fit">
        <Link href="/movies">
          <ArrowLeft className="h-4 w-4" />
          Back to Movies
        </Link>
      </Button>
      <SectionHeader
        title="Movie Detail"
        description="Inspect movie metadata and its nearest neighbors."
      />

      {movieQuery.isLoading ? <LoadingGrid count={1} /> : null}
      {movieQuery.isError ? (
        <ErrorState
          description="Could not load movie details."
          onRetry={() => {
            void movieQuery.refetch();
          }}
        />
      ) : null}

      {movieQuery.data ? (
        <Card className="overflow-hidden bg-cinematic-gradient">
          <CardContent className="grid gap-6 p-5 md:grid-cols-[220px_1fr]">
            <MoviePoster
              title={movieQuery.data.title}
              image={movieQuery.data.image}
              className="mx-auto aspect-[2/3] w-full max-w-56 md:max-w-none"
            />
            <div className="space-y-4 text-slate-100">
              <div>
                <h2 className="text-2xl font-semibold leading-tight">
                  {movieQuery.data.title}
                  {movieQuery.data.year ? ` (${movieQuery.data.year})` : ""}
                </h2>
                <p className="mt-1 text-xs text-slate-300/85">movieId: {movieQuery.data.movieId}</p>
              </div>
              <GenreBadges genres={movieQuery.data.genres} />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-300/15 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-300">Average rating</p>
                  <p className="text-lg font-semibold">
                    {formatRating(movieQuery.data.averageRating)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-300/15 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-300">Rating count</p>
                  <p className="text-lg font-semibold">
                    {movieQuery.data.ratingCount ?? "N/A"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-300/15 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-300">Popularity rank</p>
                  <p className="text-lg font-semibold">
                    {movieQuery.data.popularityRank ?? "N/A"}
                  </p>
                </div>
              </div>
              {movieQuery.data.topTags?.length ? (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-300">
                    Top tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {movieQuery.data.topTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-300/20 bg-slate-900/65 px-2 py-0.5 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {neighborsQuery.data?.length ? (
        <NeighborsList neighbors={neighborsQuery.data} />
      ) : null}
      {!neighborsQuery.isLoading && !neighborsQuery.data?.length ? (
        <EmptyState
          title="No neighbors found"
          description="This movie currently has no similarity evidence returned by the API."
        />
      ) : null}
    </div>
  );
}
