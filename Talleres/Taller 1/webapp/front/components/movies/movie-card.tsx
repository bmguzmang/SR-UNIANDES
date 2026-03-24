"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Star, Users } from "lucide-react";
import { toast } from "sonner";
import type { Movie } from "@/types/domain";
import { MoviePoster } from "@/components/shared/movie-poster";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GenreBadges } from "@/components/shared/genre-badges";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddUserRating } from "@/lib/hooks/use-users";
import { useSessionStore } from "@/lib/store/session-store";
import { formatRating } from "@/lib/utils/format";

const RATING_OPTIONS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];

export function MovieCard({ movie }: { movie: Movie }) {
  const activeUser = useSessionStore((state) => state.activeUser);
  const addUserRatingMutation = useAddUserRating(activeUser?.userKey);
  const [ratingDraft, setRatingDraft] = useState("4");

  async function handleRateMovie() {
    if (!activeUser) {
      toast.error("No hay sesion activa");
      return;
    }

    const rating = Number(ratingDraft);
    try {
      await addUserRatingMutation.mutateAsync({
        movieId: movie.movieId,
        rating,
        timestamp: Math.floor(Date.now() / 1000),
      });
      toast.success(`Calificacion guardada para ${movie.title}`, {
        description: `${formatRating(rating)} estrellas`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar la calificacion";
      toast.error("Fallo la calificacion", { description: message });
    }
  }

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow">
      <CardContent className="p-0">
        <div className="grid h-full grid-cols-[112px_1fr] gap-0 sm:grid-cols-[140px_1fr]">
          <MoviePoster
            title={movie.title}
            image={movie.image}
            className="aspect-[2/3] h-full w-full rounded-none border-0 border-r border-border/60"
            showFallbackLabel={false}
          />
          <div className="min-w-0 flex h-full flex-col gap-3 p-4">
            <div>
              <h3 className="line-clamp-2 text-base font-semibold leading-snug">
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
                <span className="text-foreground">{movie.ratingCount ?? "N/D"}</span>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Select value={ratingDraft} onValueChange={setRatingDraft}>
                <SelectTrigger className="h-9">
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
              <Button
                className="h-9"
                onClick={() => {
                  void handleRateMovie();
                }}
                disabled={addUserRatingMutation.isPending}
              >
                {addUserRatingMutation.isPending ? "Guardando..." : "Calificar"}
              </Button>
            </div>
            <Button asChild variant="outline" className="mt-auto w-full">
              <Link href={`/movies/${movie.movieId}`}>
                Ver detalle
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
