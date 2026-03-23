"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { MovieCard } from "@/components/movies/movie-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingGrid } from "@/components/shared/loading-grid";
import { SectionHeader } from "@/components/shared/section-header";
import { Input } from "@/components/ui/input";
import { useMoviesSearch } from "@/lib/hooks/use-movies";

export default function MoviesPage() {
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

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Movie Explorer"
        description="Search titles and inspect item-item neighbor structure."
      />
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search movies by title (e.g. Toy Story, Matrix)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
        />
      </div>

      {!hasInput ? (
        <EmptyState
          title="Start searching"
          description="Type a movie title to browse catalog results and navigate to details."
        />
      ) : null}

      {moviesQuery.isLoading ? <LoadingGrid count={6} /> : null}
      {moviesQuery.isError ? (
        <ErrorState
          description="Movie search failed. Verify backend `/api/v1/movies`."
          onRetry={() => {
            void moviesQuery.refetch();
          }}
        />
      ) : null}
      {!moviesQuery.isLoading && debouncedQuery.length > 0 && !moviesQuery.data?.length ? (
        <EmptyState
          title="No matches"
          description="Try a different keyword or shorter title fragment."
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {moviesQuery.data?.map((movie) => (
          <MovieCard key={movie.movieId} movie={movie} />
        ))}
      </div>
    </div>
  );
}
