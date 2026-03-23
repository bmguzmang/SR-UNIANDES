import type { RecommendationFeedback, UserSource } from "@/types/api";

export interface UserSummary {
  userKey: string;
  displayName: string;
  source: UserSource;
  datasetUserId?: number | null;
  ratingCount: number;
  averageRating: number | null;
}

export interface UserProfile extends UserSummary {
  createdAt?: string;
  favoriteGenres: string[];
}

export interface Movie {
  movieId: number;
  title: string;
  year?: number | null;
  genres: string[];
  image?: string | null;
  averageRating?: number | null;
  ratingCount?: number | null;
  popularityRank?: number | null;
  topTags?: string[];
  synopsis?: string | null;
}

export interface UserRating {
  movieId: number;
  movieTitle: string;
  genres: string[];
  movieImage?: string | null;
  rating: number;
  timestamp?: number | string | null;
}

export interface MovieNeighbor {
  movieId: number;
  title: string;
  year?: number | null;
  genres: string[];
  image?: string | null;
  similarity: number;
  userRating?: number | null;
  contribution?: number | null;
}

export interface RecommendationItem {
  movieId: number;
  title: string;
  year?: number | null;
  genres: string[];
  image?: string | null;
  rank: number;
  predictedRating: number;
  confidence?: number | null;
  explanationPreview?: string | null;
}

export interface RecommendationBatch {
  userKey: string;
  generatedAt?: string;
  recommendations: RecommendationItem[];
}

export interface RecommendationExplanation {
  userKey: string;
  movie: Movie;
  predictedRating: number;
  rank?: number | null;
  topTags: string[];
  globalStats: {
    averageRating?: number | null;
    ratingCount?: number | null;
    popularityRank?: number | null;
  };
  neighbors: MovieNeighbor[];
  relevantUserRatings: UserRating[];
  narrative?: string;
}

export interface RecommendationEvaluation {
  movieId: number;
  movieTitle: string;
  feedback: RecommendationFeedback;
  predictedRating: number | null;
  recommendationRank: number | null;
  actualRating?: number | null;
  createdAt?: string | number | null;
}

export interface SystemInfo {
  modelName: string;
  algorithm: string;
  dataset: string;
  version?: string;
}
