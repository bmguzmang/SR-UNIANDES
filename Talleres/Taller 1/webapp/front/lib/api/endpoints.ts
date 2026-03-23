import type {
  AddRatingRequest,
  AddRatingsBulkRequest,
  CreateUserRequest,
  HealthResponse,
  LoginRequest,
  RecommendationEvaluationRequest,
  RecommendationsRequest,
  SystemInfoResponse,
  UserSource,
} from "@/types/api";
import type {
  Movie,
  MovieNeighbor,
  RecommendationBatch,
  RecommendationEvaluation,
  RecommendationExplanation,
  SystemInfo,
  UserProfile,
  UserRating,
  UserSummary,
} from "@/types/domain";
import { apiRequest, withQuery } from "@/lib/api/client";
import {
  coerceArrayPayload,
  parseEvaluation,
  parseMovie,
  parseNeighbor,
  parseRecommendationBatch,
  parseRecommendationExplanation,
  parseSystemInfo,
  parseUserProfile,
  parseUserRating,
  parseUserSummary,
} from "@/lib/utils/guards";

const API_PREFIX = "/api/v1";

export async function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>(`${API_PREFIX}/health`);
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const response = await apiRequest<SystemInfoResponse>(`${API_PREFIX}/system/info`);
  return parseSystemInfo(response);
}

export async function login(payload: LoginRequest): Promise<UserSummary> {
  const response = await apiRequest<unknown>(`${API_PREFIX}/auth/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (typeof response === "object" && response) {
    const asRecord = response as Record<string, unknown>;
    return parseUserSummary(asRecord.user ?? asRecord);
  }

  return {
    userKey: payload.userKey,
    displayName: payload.userKey,
    source: payload.userKey.startsWith("cu_") ? "custom" : "movielens",
    ratingCount: 0,
    averageRating: null,
  };
}

export async function logout(): Promise<void> {
  await apiRequest(`${API_PREFIX}/auth/logout`, { method: "POST" });
}

export async function searchUsers(params: {
  query?: string;
  source?: UserSource;
  limit?: number;
}): Promise<UserSummary[]> {
  const path = withQuery(`${API_PREFIX}/users`, {
    query: params.query ?? "",
    source: params.source ?? "all",
    limit: params.limit ?? 20,
  });

  const response = await apiRequest<unknown>(path);
  return coerceArrayPayload(response).map(parseUserSummary);
}

export async function createUser(payload: CreateUserRequest): Promise<UserSummary> {
  const response = await apiRequest<unknown>(`${API_PREFIX}/users`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseUserSummary(response);
}

export async function getUser(userKey: string): Promise<UserProfile> {
  const response = await apiRequest<unknown>(`${API_PREFIX}/users/${encodeURIComponent(userKey)}`);
  return parseUserProfile(response);
}

export async function getUserRatings(params: {
  userKey: string;
  sort?: "recent" | "rating_desc" | string;
  limit?: number;
}): Promise<UserRating[]> {
  const path = withQuery(
    `${API_PREFIX}/users/${encodeURIComponent(params.userKey)}/ratings`,
    {
      sort: params.sort ?? "recent",
      limit: params.limit ?? 50,
    },
  );
  const response = await apiRequest<unknown>(path);
  return coerceArrayPayload(response).map(parseUserRating);
}

export async function addUserRating(
  userKey: string,
  payload: AddRatingRequest,
): Promise<void> {
  await apiRequest(`${API_PREFIX}/users/${encodeURIComponent(userKey)}/ratings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addUserRatingsBulk(
  userKey: string,
  payload: AddRatingsBulkRequest,
): Promise<void> {
  await apiRequest(`${API_PREFIX}/users/${encodeURIComponent(userKey)}/ratings/bulk`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function searchMovies(params: {
  query?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<Movie[]> {
  const path = withQuery(`${API_PREFIX}/movies`, {
    query: params.query ?? "",
    limit: params.limit ?? 10,
  });
  const response = await apiRequest<unknown>(path, { signal: params.signal });
  return coerceArrayPayload(response).map(parseMovie);
}

export async function getMovie(movieId: number): Promise<Movie> {
  const response = await apiRequest<unknown>(`${API_PREFIX}/movies/${movieId}`);
  return parseMovie(response);
}

export async function getMovieNeighbors(
  movieId: number,
  limit = 10,
): Promise<MovieNeighbor[]> {
  const path = withQuery(`${API_PREFIX}/movies/${movieId}/neighbors`, { limit });
  const response = await apiRequest<unknown>(path);
  return coerceArrayPayload(response).map(parseNeighbor);
}

export async function getRecommendations(
  payload: RecommendationsRequest,
): Promise<RecommendationBatch> {
  const response = await apiRequest<unknown>(`${API_PREFIX}/recommendations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseRecommendationBatch(response);
}

export async function getRecommendationExplanation(
  userKey: string,
  movieId: number,
): Promise<RecommendationExplanation> {
  const response = await apiRequest<unknown>(
    `${API_PREFIX}/recommendations/${encodeURIComponent(userKey)}/explanations/${movieId}`,
  );
  return parseRecommendationExplanation(response);
}

export async function submitRecommendationEvaluation(
  payload: RecommendationEvaluationRequest,
): Promise<void> {
  await apiRequest(`${API_PREFIX}/recommendations/evaluations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getRecommendationEvaluations(
  userKey: string,
  limit = 50,
): Promise<RecommendationEvaluation[]> {
  const path = withQuery(
    `${API_PREFIX}/recommendations/${encodeURIComponent(userKey)}/evaluations`,
    { limit },
  );
  const response = await apiRequest<unknown>(path);
  return coerceArrayPayload(response).map(parseEvaluation);
}
