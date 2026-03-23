"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { EvaluationDialog } from "@/components/recommendations/evaluation-dialog";
import { EvidenceChart } from "@/components/recommendations/evidence-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { GenreBadges } from "@/components/shared/genre-badges";
import { MoviePoster } from "@/components/shared/movie-poster";
import { RatingPill } from "@/components/shared/rating-pill";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMovie, useMovieNeighbors } from "@/lib/hooks/use-movies";
import { useRecommendationExplanation } from "@/lib/hooks/use-recommendations";
import { useUserRatings } from "@/lib/hooks/use-users";
import { useSessionStore } from "@/lib/store/session-store";
import { buildNarrative } from "@/lib/utils/narrative";
import { formatDate, formatRating } from "@/lib/utils/format";
import type { RecommendationItem } from "@/types/domain";

const MOVIE_NEIGHBORS_LIMIT = 18;
const MOVIE_NEIGHBORS_PER_PAGE = 9;

export default function RecommendationExplanationPage() {
  const params = useParams<{ movieId?: string | string[] }>();
  const activeUser = useSessionStore((state) => state.activeUser);
  const movieIdParam = Array.isArray(params.movieId) ? params.movieId[0] : params.movieId;
  const movieId = Number(movieIdParam);
  const paginationMovieId = Number.isNaN(movieId) ? null : movieId;
  const [evaluationOpen, setEvaluationOpen] = useState(false);
  const [movieNeighborsPagination, setMovieNeighborsPagination] = useState<{
    movieId: number | null;
    page: number;
  }>({
    movieId: paginationMovieId,
    page: 1,
  });

  const explanationQuery = useRecommendationExplanation(
    activeUser?.userKey,
    Number.isNaN(movieId) ? undefined : movieId,
  );
  const movieQuery = useMovie(Number.isNaN(movieId) ? undefined : movieId);
  const movieNeighborsQuery = useMovieNeighbors(
    Number.isNaN(movieId) ? undefined : movieId,
    MOVIE_NEIGHBORS_LIMIT,
  );
  const userRatingsQuery = useUserRatings({
    userKey: activeUser?.userKey,
    sort: "recent",
    limit: 50,
  });

  const explanation = explanationQuery.data;
  const movie = explanation?.movie ?? movieQuery.data;
  const narrative = explanation ? buildNarrative(explanation) : "";
  const isHeaderLoading = !movie && (explanationQuery.isLoading || movieQuery.isLoading);
  const isExplanationLoading = !explanation && explanationQuery.isLoading;
  const isMovieNeighborsLoading = movieNeighborsQuery.isLoading;
  const movieNeighbors = movieNeighborsQuery.data;
  const movieNeighborsTotalPages = Math.ceil(
    (movieNeighbors?.length ?? 0) / MOVIE_NEIGHBORS_PER_PAGE,
  );
  const requestedMovieNeighborsPage =
    movieNeighborsPagination.movieId === paginationMovieId
      ? movieNeighborsPagination.page
      : 1;
  const currentMovieNeighborsPage = Math.min(
    requestedMovieNeighborsPage,
    Math.max(movieNeighborsTotalPages, 1),
  );
  const hasNoContextualRatings = explanation?.relevantUserRatings.length === 0;
  const isRelevantRatingsLoading =
    isExplanationLoading || (hasNoContextualRatings && userRatingsQuery.isLoading);

  const recommendationForEvaluation: RecommendationItem | null = explanation
    ? {
        movieId: explanation.movie.movieId,
        title: explanation.movie.title,
        year: explanation.movie.year,
        genres: explanation.movie.genres,
        image: explanation.movie.image,
        rank: explanation.rank ?? 0,
        predictedRating: explanation.predictedRating,
        explanationPreview: explanation.narrative,
      }
    : null;

  const fallbackRelevantRatings = useMemo(() => {
    if (!explanation || explanation.relevantUserRatings.length > 0) {
      return explanation?.relevantUserRatings ?? [];
    }

    const sameGenreSet = new Set(explanation.movie.genres);
    return (userRatingsQuery.data ?? [])
      .filter((rating) => rating.genres.some((genre) => sameGenreSet.has(genre)))
      .slice(0, 6);
  }, [explanation, userRatingsQuery.data]);

  const paginatedMovieNeighbors = useMemo(() => {
    if (!movieNeighbors?.length) {
      return [];
    }
    const start = (currentMovieNeighborsPage - 1) * MOVIE_NEIGHBORS_PER_PAGE;
    return movieNeighbors.slice(start, start + MOVIE_NEIGHBORS_PER_PAGE);
  }, [currentMovieNeighborsPage, movieNeighbors]);

  const topNeighborEvidence = explanation?.neighbors.slice(0, 6) ?? [];
  const insightTags = (explanation?.topTags ?? movie?.topTags ?? []).slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <SectionHeader
        title="Recommendation Explanation"
        description="Transparent evidence for why this movie was recommended."
        action={(
          <div className="hidden items-center gap-1 rounded-full border border-sky-300/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-200 md:inline-flex">
            <Sparkles className="h-3 w-3" />
            Explainability view
          </div>
        )}
      />

      {isHeaderLoading ? (
        <Card className="overflow-hidden border-white/10 bg-cinematic-gradient">
          <CardContent className="grid gap-4 p-4 text-slate-100 md:grid-cols-[180px_1fr]">
            <Skeleton className="mx-auto aspect-[2/3] w-full max-w-44 rounded-xl md:max-w-none" />
            <div className="space-y-3">
              <div className="space-y-2">
                <Skeleton className="h-7 w-4/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-2 rounded-lg border border-sky-200/20 bg-slate-950/45 p-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {explanationQuery.isError && movieQuery.isError ? (
        <ErrorState description="Could not load explanation or movie details." />
      ) : null}

      {movie ? (
        <Card className="overflow-hidden border-white/10 bg-cinematic-gradient">
          <CardContent className="grid gap-4 p-4 text-slate-100 md:grid-cols-[180px_1fr]">
            <MoviePoster
              title={movie.title}
              image={movie.image}
              className="mx-auto aspect-[2/3] w-full max-w-44 border-white/15 md:max-w-none"
            />
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-xl font-semibold leading-tight md:text-2xl">
                    {movie.title}
                    {movie.year ? ` (${movie.year})` : ""}
                  </h2>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-slate-300/85">
                    movieId: {movie.movieId}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200/25 bg-slate-950/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-200">
                    Prediction
                  </span>
                  {isExplanationLoading ? (
                    <Skeleton className="h-7 w-20 rounded-full" />
                  ) : (
                    <RatingPill rating={explanation?.predictedRating ?? 0} />
                  )}
                  {isExplanationLoading ? (
                    <Skeleton className="h-6 w-20 rounded-full" />
                  ) : explanation?.rank ? (
                    <span className="rounded-full border border-slate-300/30 bg-slate-950/45 px-2 py-0.5 text-xs">
                      Rank #{explanation.rank}
                    </span>
                  ) : null}
                </div>
              </div>

              <GenreBadges genres={movie.genres} />

              <div className="rounded-lg border border-sky-200/20 bg-slate-950/45 px-3 py-2 text-sm leading-relaxed text-slate-100">
                <p className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-sky-200">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  Why this recommendation
                </p>
                {isExplanationLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-11/12" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                ) : (
                  narrative
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-300/15 bg-slate-900/55 p-2.5">
                  <p className="text-[11px] text-slate-300">Global avg rating</p>
                  <div className="text-base font-semibold">
                    {isExplanationLoading ? (
                      <Skeleton className="h-5 w-12" />
                    ) : (
                      formatRating(explanation?.globalStats.averageRating ?? movie.averageRating)
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-300/15 bg-slate-900/55 p-2.5">
                  <p className="text-[11px] text-slate-300">Rating count</p>
                  <p className="text-base font-semibold">
                    {explanation?.globalStats.ratingCount ?? movie.ratingCount ?? "N/A"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-300/15 bg-slate-900/55 p-2.5">
                  <p className="text-[11px] text-slate-300">Popularity rank</p>
                  <p className="text-base font-semibold">
                    {explanation?.globalStats.popularityRank ?? movie.popularityRank ?? "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {insightTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-400/30 bg-slate-950/55 px-2 py-0.5 text-[11px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="bg-white text-slate-950 hover:bg-white/90"
                  onClick={() => setEvaluationOpen(true)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Evaluate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 2xl:grid-cols-[1.35fr_1fr]">
        <Card className="border-white/10">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Strongest Neighbor Evidence</CardTitle>
            <p className="text-xs text-muted-foreground">
              Similar movies this user rated highly and their contribution to the prediction.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            {isExplanationLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-36 w-full rounded-lg" />
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-border/60 bg-slate-950/40 p-2"
                    >
                      <div className="flex items-start gap-2">
                        <Skeleton className="h-16 w-12 shrink-0 rounded-md" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3.5 w-3/4" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : explanation?.neighbors?.length ? (
              <>
                <EvidenceChart neighbors={explanation.neighbors} />
                <div className="grid gap-2 sm:grid-cols-2">
                  {topNeighborEvidence.map((neighbor) => (
                    <div
                      key={neighbor.movieId}
                      className="rounded-lg border border-border/60 bg-slate-950/45 p-2 transition-colors hover:border-sky-300/35"
                    >
                      <div className="flex items-start gap-2">
                        <MoviePoster
                          title={neighbor.title}
                          image={neighbor.image}
                          className="h-16 w-12 shrink-0 rounded-md border-white/10"
                          showFallbackLabel={false}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-xs font-semibold leading-tight text-slate-100">
                            {neighbor.title}
                            {neighbor.year ? ` (${neighbor.year})` : ""}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-300/85">
                            Similarity {neighbor.similarity.toFixed(3)}
                          </p>
                          <div className="mt-1.5">
                            {neighbor.userRating ? (
                              <RatingPill rating={neighbor.userRating} />
                            ) : (
                              <span className="text-[11px] text-muted-foreground">No user rating</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                title="No neighbor evidence"
                description="The API did not return neighbor evidence for this explanation."
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Relevant User History</CardTitle>
            <p className="text-xs text-muted-foreground">
              Past interactions that align with this recommendation.
            </p>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {isRelevantRatingsLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border/60 bg-slate-950/40 p-2"
                >
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-14 w-10 shrink-0 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-7 w-14 rounded-full" />
                  </div>
                </div>
              ))
            ) : fallbackRelevantRatings.length ? (
              fallbackRelevantRatings.map((rating) => (
                <div
                  key={`${rating.movieId}-${rating.timestamp ?? "na"}`}
                  className="rounded-lg border border-border/60 bg-slate-950/40 p-2"
                >
                  <div className="flex items-center gap-2">
                    <MoviePoster
                      title={rating.movieTitle}
                      image={rating.movieImage}
                      className="h-14 w-10 shrink-0 rounded-md border-white/10"
                      showFallbackLabel={false}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{rating.movieTitle}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(rating.timestamp)}
                      </p>
                      <p className="line-clamp-1 text-[11px] text-slate-300/85">
                        {rating.genres.length
                          ? rating.genres.slice(0, 3).join(" • ")
                          : "Unspecified genre"}
                      </p>
                    </div>
                    <RatingPill rating={rating.rating} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No relevant ratings"
                description="Rate a few movies first to expose historical evidence."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">More Like This</CardTitle>
          <p className="text-xs text-muted-foreground">
            Item-item neighborhood displayed as a compact poster grid.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {isMovieNeighborsLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[2/3] w-full rounded-lg" />
              ))}
            </div>
          ) : movieNeighbors?.length ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {paginatedMovieNeighbors.map((neighbor) => (
                  <Link
                    key={neighbor.movieId}
                    href={`/movies/${neighbor.movieId}`}
                    className="group relative overflow-hidden rounded-lg border border-white/10 bg-slate-950/75 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/45 hover:shadow-[0_16px_36px_-18px_rgba(56,189,248,0.65)]"
                  >
                    <MoviePoster
                      title={neighbor.title}
                      image={neighbor.image}
                      className="aspect-[2/3] rounded-none border-0"
                      imageClassName="transition-transform duration-500 group-hover:scale-[1.04]"
                      showFallbackLabel={false}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/5" />
                    <div className="absolute inset-x-0 bottom-0 space-y-1 p-2">
                      <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
                        {neighbor.title}
                        {neighbor.year ? ` (${neighbor.year})` : ""}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-200">
                        <span>sim {neighbor.similarity.toFixed(3)}</span>
                        {neighbor.userRating ? (
                          <span className="rounded-full border border-slate-300/30 bg-black/45 px-1.5 py-0.5">
                            {formatRating(neighbor.userRating)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {movieNeighborsTotalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Page {currentMovieNeighborsPage} of {movieNeighborsTotalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-white/20 bg-slate-900/60 px-2"
                      onClick={() =>
                        setMovieNeighborsPagination({
                          movieId: paginationMovieId,
                          page: Math.max(currentMovieNeighborsPage - 1, 1),
                        })
                      }
                      disabled={currentMovieNeighborsPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-white/20 bg-slate-900/60 px-2"
                      onClick={() =>
                        setMovieNeighborsPagination({
                          movieId: paginationMovieId,
                          page: Math.min(currentMovieNeighborsPage + 1, movieNeighborsTotalPages),
                        })
                      }
                      disabled={currentMovieNeighborsPage === movieNeighborsTotalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="No neighbors available"
              description="No item-item neighbors were returned for this movie."
            />
          )}
        </CardContent>
      </Card>

      <EvaluationDialog
        open={evaluationOpen}
        onOpenChange={setEvaluationOpen}
        recommendation={recommendationForEvaluation}
      />
    </div>
  );
}
