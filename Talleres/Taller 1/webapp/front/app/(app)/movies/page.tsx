"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MovieCard } from "@/components/movies/movie-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingGrid } from "@/components/shared/loading-grid";
import { SectionHeader } from "@/components/shared/section-header";
import { Input } from "@/components/ui/input";
import { useMoviesSearch } from "@/lib/hooks/use-movies";
import { useUserRatingsByMovieIds } from "@/lib/hooks/use-users";
import { useSessionStore } from "@/lib/store/session-store";

export default function MoviesPage() {
  const activeUser = useSessionStore((state) => state.activeUser);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const normalizedQuery = query.trim();
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(normalizedQuery);
    }, normalizedQuery ? 300 : 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const hasInput = query.trim().length > 0;
  const moviesQuery = useMoviesSearch({
    query: debouncedQuery,
    limit: 24,
  });
  const movieIds = useMemo(
    () => (moviesQuery.data ?? []).map((movie) => movie.movieId),
    [moviesQuery.data],
  );
  const userRatingsLookupQuery = useUserRatingsByMovieIds(activeUser?.userKey, movieIds);
  const userRatingsMap = useMemo(
    () =>
      new Map(
        Object.entries(userRatingsLookupQuery.data ?? {}).map(([movieId, rating]) => [
          Number(movieId),
          rating,
        ]),
      ),
    [userRatingsLookupQuery.data],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Explorador de peliculas"
        description="Busca titulos, calificalos y mejora las recomendaciones del panel."
      />
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar peliculas por titulo (ej. Toy Story, Matrix)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
        />
      </div>

      {!hasInput ? (
        <EmptyState
          title="Empieza a buscar"
          description="Escribe un titulo para ver resultados del catalogo y navegar al detalle."
        />
      ) : null}

      {moviesQuery.isLoading ? <LoadingGrid count={6} /> : null}
      {moviesQuery.isError ? (
        <ErrorState
          description="Fallo la busqueda de peliculas. Verifica el backend `/api/v1/movies`."
          onRetry={() => {
            void moviesQuery.refetch();
          }}
        />
      ) : null}
      {!moviesQuery.isLoading && debouncedQuery.length > 0 && !moviesQuery.data?.length ? (
        <EmptyState
          title="Sin coincidencias"
          description="Prueba otra palabra clave o un fragmento de titulo mas corto."
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {moviesQuery.data?.map((movie) => (
          <MovieCard
            key={movie.movieId}
            movie={movie}
            userRating={userRatingsMap.get(movie.movieId)}
          />
        ))}
      </div>
    </div>
  );
}
