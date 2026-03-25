export type UserSource = "movielens" | "custom" | "all" | string;

export interface LoginRequest {
  userKey: string;
}

export interface CreateUserRequest {
  displayName: string;
}

export interface AddRatingRequest {
  movieId: number;
  rating: number;
  timestamp?: number;
}

export interface BulkRatingEntry {
  movieId: number;
  rating: number;
}

export interface AddRatingsBulkRequest {
  ratings: BulkRatingEntry[];
}

export interface UserRatingsLookupRequest {
  movieIds: number[];
}

export interface RecommendationsRequest {
  userKey: string;
  topN?: number;
  excludeRated?: boolean;
  excludeEvaluated?: boolean;
  includeExplanationPreview?: boolean;
  maxNeighborsPerRatedItem?: number;
}

export type RecommendationFeedback =
  | "liked"
  | "disliked"
  | "not_interested"
  | "already_seen";

export interface RecommendationEvaluationRequest {
  userKey: string;
  movieId: number;
  predictedRating?: number | null;
  recommendationRank?: number | null;
  feedback: RecommendationFeedback;
  actualRating?: number | null;
}

export interface HealthResponse {
  status?: string;
  service?: string;
  timestamp?: string;
  modelLoaded?: boolean;
  datasetLoaded?: boolean;
  [key: string]: unknown;
}

export interface SystemInfoResponse {
  modelName?: string;
  model_name?: string;
  algorithm?: string;
  appName?: string;
  model?: {
    name?: string;
    family?: string;
    similarity?: string;
    user_based?: boolean;
    [key: string]: unknown;
  };
  dataset?: string;
  version?: string;
  [key: string]: unknown;
}
