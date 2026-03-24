"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { NeighborsList } from "@/components/movies/neighbors-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { GenreBadges } from "@/components/shared/genre-badges";
import { LoadingGrid } from "@/components/shared/loading-grid";
import { MoviePoster } from "@/components/shared/movie-poster";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RATING_OPTIONS } from "@/lib/constants/ratings";
import { useMovie, useMovieNeighbors } from "@/lib/hooks/use-movies";
import { useAddUserRating } from "@/lib/hooks/use-users";
import { useSessionStore } from "@/lib/store/session-store";
import { formatRating } from "@/lib/utils/format";

export default function MovieDetailsPage() {
  const params = useParams<{ movieId?: string | string[] }>();
  const activeUser = useSessionStore((state) => state.activeUser);
  const addUserRatingMutation = useAddUserRating(activeUser?.userKey);
  const [ratingDraft, setRatingDraft] = useState("4");
  const movieIdParam = Array.isArray(params.movieId) ? params.movieId[0] : params.movieId;
  const movieId = Number(movieIdParam);
  const movieQuery = useMovie(Number.isNaN(movieId) ? undefined : movieId);
  const neighborsQuery = useMovieNeighbors(Number.isNaN(movieId) ? undefined : movieId, 12);

  async function handleRateMovie() {
    if (!activeUser || !movieQuery.data) {
      toast.error("No hay sesion activa");
      return;
    }

    const rating = Number(ratingDraft);
    try {
      await addUserRatingMutation.mutateAsync({
        movieId: movieQuery.data.movieId,
        rating,
        timestamp: Math.floor(Date.now() / 1000),
      });
      toast.success(`Calificacion guardada para ${movieQuery.data.title}`, {
        description: `${formatRating(rating)} estrellas`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar la calificacion";
      toast.error("Fallo la calificacion", { description: message });
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="w-fit">
        <Link href="/movies">
          <ArrowLeft className="h-4 w-4" />
          Volver a peliculas
        </Link>
      </Button>
      <SectionHeader
        title="Detalle de pelicula"
        description="Inspecciona metadata de la pelicula y sus vecinos mas cercanos."
      />

      {movieQuery.isLoading ? <LoadingGrid count={1} /> : null}
      {movieQuery.isError ? (
        <ErrorState
          description="No se pudo cargar el detalle de la pelicula."
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
              </div>
              <GenreBadges genres={movieQuery.data.genres} />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-300/15 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-300">Calificacion promedio</p>
                  <p className="text-lg font-semibold">
                    {formatRating(movieQuery.data.averageRating)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-300/15 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-300">Cantidad de calificaciones</p>
                  <p className="text-lg font-semibold">
                    {movieQuery.data.ratingCount ?? "N/D"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-300/15 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-300">Puesto de popularidad</p>
                  <p className="text-lg font-semibold">
                    {movieQuery.data.popularityRank ?? "N/D"}
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[160px_auto] sm:items-end">
                <div className="space-y-1">
                  <p className="text-xs text-slate-300">Tu calificacion</p>
                  <Select value={ratingDraft} onValueChange={setRatingDraft}>
                    <SelectTrigger className="h-9 bg-slate-900/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RATING_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {formatRating(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="h-9"
                  onClick={() => {
                    void handleRateMovie();
                  }}
                  disabled={addUserRatingMutation.isPending}
                >
                  {addUserRatingMutation.isPending ? "Guardando..." : "Calificar pelicula"}
                </Button>
              </div>
              {movieQuery.data.topTags?.length ? (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-300">
                    Tags principales
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
          title="No se encontraron vecinos"
          description="Esta pelicula no tiene evidencia de similitud devuelta por la API."
        />
      ) : null}
    </div>
  );
}
