import type {
  AddRatingRequest,
  AddRatingsBulkRequest,
  CreateUserRequest,
  HealthResponse,
  LoginRequest,
  RecommendationEvaluationRequest,
  RecommendationsRequest,
  SystemInfoResponse,
  UserRatingsLookupRequest,
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
import { ApiError, apiRequest, withQuery } from "@/lib/api/client";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRatingsLookupItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  const directItems = payload.items;
  if (Array.isArray(directItems)) return directItems;
  const nestedData = payload.data;
  if (isRecord(nestedData) && Array.isArray(nestedData.items)) return nestedData.items;
  return [];
}

function parseRatingsLookup(payload: unknown): Record<number, number> {
  const items = readRatingsLookupItems(payload);
  const lookup: Record<number, number> = {};

  items.forEach((item) => {
    if (!isRecord(item)) return;
    const movieRef = isRecord(item.movie) ? item.movie : {};
    const movieIdRaw = item.movieId ?? item.movie_id ?? movieRef.movieId ?? movieRef.movie_id;
    const ratingRaw = item.rating ?? item.userRating ?? item.user_rating;
    const movieId =
      typeof movieIdRaw === "number"
        ? movieIdRaw
        : typeof movieIdRaw === "string"
          ? Number(movieIdRaw)
          : Number.NaN;
    const rating =
      typeof ratingRaw === "number"
        ? ratingRaw
        : typeof ratingRaw === "string"
          ? Number(ratingRaw)
          : Number.NaN;

    if (!Number.isNaN(movieId) && !Number.isNaN(rating)) {
      lookup[movieId] = rating;
    }
  });

  return lookup;
}

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

export async function getUserRatingsByMovieIds(
  userKey: string,
  payload: UserRatingsLookupRequest,
): Promise<Record<number, number>> {
  try {
    const response = await apiRequest<unknown>(
      `${API_PREFIX}/users/${encodeURIComponent(userKey)}/ratings/by-movies`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return parseRatingsLookup(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const fallbackItems = await getUserRatings({
        userKey,
        sort: "recent",
        limit: 200,
      });
      const requestedMovieIds = new Set(payload.movieIds);
      const fallbackLookup: Record<number, number> = {};
      fallbackItems.forEach((item) => {
        if (requestedMovieIds.has(item.movieId)) {
          fallbackLookup[item.movieId] = item.rating;
        }
      });
      return fallbackLookup;
    }
    throw error;
  }
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
