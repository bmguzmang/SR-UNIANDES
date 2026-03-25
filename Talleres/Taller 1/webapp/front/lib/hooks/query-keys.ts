export const queryKeys = {
  health: ["health"] as const,
  systemInfo: ["system-info"] as const,
  users: (query: string, source: string, limit: number) =>
    ["users", query, source, limit] as const,
  user: (userKey: string) => ["user", userKey] as const,
  userRatings: (userKey: string, sort: string, limit: number) =>
    ["user-ratings", userKey, sort, limit] as const,
  movies: (query: string, limit: number) => ["movies", query, limit] as const,
  movie: (movieId: number) => ["movie", movieId] as const,
  movieNeighbors: (movieId: number, limit: number) =>
    ["movie-neighbors", movieId, limit] as const,
  recommendations: (
    userKey: string,
    topN: number,
    excludeRated: boolean,
    excludeEvaluated: boolean,
    includeExplanationPreview: boolean,
    maxNeighborsPerRatedItem: number,
  ) =>
    [
      "recommendations",
      userKey,
      topN,
      excludeRated,
      excludeEvaluated,
      includeExplanationPreview,
      maxNeighborsPerRatedItem,
    ] as const,
  explanation: (userKey: string, movieId: number) =>
    ["recommendation-explanation", userKey, movieId] as const,
  evaluations: (userKey: string, limit: number) =>
    ["recommendation-evaluations", userKey, limit] as const,
};
