"use client";

import { useQuery } from "@tanstack/react-query";
import { getMovie, getMovieNeighbors, searchMovies } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useMoviesSearch(params: { query?: string; limit?: number }) {
  const query = params.query ?? "";
  const limit = params.limit ?? 10;
  return useQuery({
    queryKey: queryKeys.movies(query, limit),
    queryFn: ({ signal }) => searchMovies({ query, limit, signal }),
    enabled: query.trim().length > 0,
  });
}

export function useMovie(movieId?: number) {
  return useQuery({
    queryKey: queryKeys.movie(movieId ?? 0),
    queryFn: () => getMovie(movieId as number),
    enabled: Boolean(movieId),
  });
}

export function useMovieNeighbors(movieId?: number, limit = 10) {
  return useQuery({
    queryKey: queryKeys.movieNeighbors(movieId ?? 0, limit),
    queryFn: () => getMovieNeighbors(movieId as number, limit),
    enabled: Boolean(movieId),
  });
}
