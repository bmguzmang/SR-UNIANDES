import type {
  Movie,
  MovieNeighbor,
  RecommendationBatch,
  RecommendationEvaluation,
  RecommendationExplanation,
  RecommendationItem,
  SystemInfo,
  UserProfile,
  UserRating,
  UserSummary,
} from "@/types/domain";
import { cleanMovieTitle, extractYearFromTitle, normalizeGenres } from "@/lib/utils/format";

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null;
}

function pick(record: AnyRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
}

function toString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return [];
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  return toNumber(value, 0);
}

function toNullableString(value: unknown): string | null {
  const parsed = toString(value, "").trim();
  return parsed.length > 0 ? parsed : null;
}

function toStringArray(value: unknown): string[] {
  return toArray(value)
    .map((item) => toString(item).trim())
    .filter(Boolean);
}

function parseTagList(value: unknown): string[] {
  return toArray(value)
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!isRecord(item)) return "";
      return toString(pick(item, "tag", "name"), "").trim();
    })
    .filter(Boolean);
}

function parseStats(record: AnyRecord): AnyRecord {
  const nested = pick(record, "stats");
  return isRecord(nested) ? nested : {};
}

function parseSource(value: unknown, userKey: string): string {
  const parsed = toString(value).trim();
  if (parsed) return parsed;
  return userKey.startsWith("cu_") ? "custom" : "movielens";
}

function parseTimestamp(value: unknown): string | number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" || typeof value === "string") return value;
  return null;
}

export function coerceArrayPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const fromKeys = pick(
    payload,
    "items",
    "results",
    "data",
    "users",
    "movies",
    "ratings",
    "evaluations",
    "neighbors",
  );
  if (Array.isArray(fromKeys)) return fromKeys;
  return [];
}

export function parseUserSummary(input: unknown): UserSummary {
  const record = isRecord(input) ? input : {};
  const stats = parseStats(record);
  const userKey = toString(pick(record, "userKey", "user_key", "key"), "unknown");

  return {
    userKey,
    displayName: toString(
      pick(record, "displayName", "display_name", "name"),
      "Anonymous User",
    ),
    source: parseSource(pick(record, "source"), userKey),
    datasetUserId: toNullableNumber(pick(record, "datasetUserId", "dataset_user_id")),
    ratingCount: toNumber(
      pick(
        stats,
        "ratingsCount",
        "ratingCount",
        "ratings_count",
        "rating_count",
      ) ??
        pick(record, "ratingCount", "rating_count"),
      0,
    ),
    averageRating: toNullableNumber(
      pick(stats, "avgRating", "averageRating", "avg_rating", "average_rating") ??
        pick(record, "averageRating", "average_rating", "avgRating", "avg_rating"),
    ),
  };
}

export function parseUserProfile(input: unknown): UserProfile {
  const base = parseUserSummary(input);
  const record = isRecord(input) ? input : {};
  const stats = parseStats(record);
  const favoriteGenresRaw =
    pick(stats, "favoriteGenres", "favorite_genres") ??
    pick(record, "favoriteGenres", "favorite_genres");
  const favoriteGenres = normalizeGenres(
    Array.isArray(favoriteGenresRaw)
      ? toStringArray(favoriteGenresRaw)
      : toString(favoriteGenresRaw),
  );

  return {
    ...base,
    createdAt: toString(pick(record, "createdAt", "created_at")) || undefined,
    favoriteGenres,
  };
}

export function parseMovie(input: unknown): Movie {
  const record = isRecord(input) ? input : {};
  const stats = parseStats(record);
  const rawTitle = toString(pick(record, "title", "movieTitle", "movie_title"), "Unknown title");
  const yearValue = pick(record, "year");
  const yearFromField =
    yearValue === undefined || yearValue === null || yearValue === ""
      ? null
      : toNumber(yearValue, extractYearFromTitle(rawTitle) ?? 0);
  const parsedYear = yearFromField && yearFromField > 0 ? yearFromField : extractYearFromTitle(rawTitle);
  const genresRaw = pick(record, "genres", "genre");
  const topTagsRaw = pick(record, "topTags", "top_tags", "tags");

  return {
    movieId: toNumber(pick(record, "movieId", "movie_id", "id"), 0),
    title: cleanMovieTitle(rawTitle),
    year: parsedYear,
    genres: normalizeGenres(
      Array.isArray(genresRaw)
        ? toStringArray(genresRaw)
        : toString(genresRaw),
    ),
    image: toNullableString(
      pick(
        record,
        "image",
        "poster",
        "posterUrl",
        "poster_url",
        "posterPath",
        "poster_path",
      ),
    ),
    averageRating: toNullableNumber(
      pick(stats, "avgRating", "averageRating", "avg_rating", "average_rating") ??
        pick(record, "averageRating", "average_rating", "avgRating", "avg_rating"),
    ),
    ratingCount: toNullableNumber(
      pick(stats, "ratingsCount", "ratingCount", "ratings_count", "rating_count") ??
        pick(record, "ratingCount", "rating_count"),
    ),
    popularityRank: toNullableNumber(
      pick(record, "popularityRank", "popularity_rank"),
    ),
    topTags: parseTagList(topTagsRaw),
    synopsis: toString(pick(record, "synopsis", "overview"), "") || null,
  };
}

export function parseUserRating(input: unknown): UserRating {
  const record = isRecord(input) ? input : {};
  const movieRecord = pick(record, "movie", "targetMovie", "target_movie");
  const movie = parseMovie(movieRecord ?? record);
  const genresRaw = pick(record, "genres", "movieGenres", "movie_genres");
  const genres = movie.genres.length
    ? movie.genres
    : normalizeGenres(
        Array.isArray(genresRaw)
          ? toStringArray(genresRaw)
          : toString(genresRaw),
      );

  return {
    movieId: movie.movieId,
    movieTitle: movie.title,
    genres,
    movieImage: movie.image,
    rating: toNumber(pick(record, "rating"), 0),
    timestamp: parseTimestamp(
      pick(record, "timestamp", "createdAt", "created_at"),
    ),
  };
}

export function parseNeighbor(input: unknown): MovieNeighbor {
  const record = isRecord(input) ? input : {};
  const movie = parseMovie(
    pick(record, "movie", "targetMovie", "target_movie") ?? record,
  );

  return {
    movieId: movie.movieId,
    title: movie.title,
    year: movie.year,
    genres: movie.genres,
    image: movie.image,
    similarity: toNumber(pick(record, "similarity", "pearson", "score"), 0),
    userRating: toNullableNumber(
      pick(record, "userRating", "user_rating", "rating"),
    ),
    contribution: toNullableNumber(
      pick(record, "contribution", "weightedContribution", "weighted_contribution"),
    ),
  };
}

export function parseRecommendation(input: unknown, index = 0): RecommendationItem {
  const record = isRecord(input) ? input : {};
  const movie = parseMovie(
    pick(record, "movie", "targetMovie", "target_movie") ?? record,
  );
  const explanationPreview = toString(
    pick(
      record,
      "reasonShort",
      "explanationPreview",
      "explanation_preview",
      "reason",
    ),
    "",
  ).trim();

  return {
    movieId: movie.movieId,
    title: movie.title,
    year: movie.year,
    genres: movie.genres,
    image: movie.image,
    rank: toNumber(pick(record, "rank"), index + 1),
    predictedRating: toNumber(
      pick(
        record,
        "score",
        "predictedRating",
        "predicted_rating",
        "rankingScore",
        "ranking_score",
      ),
      0,
    ),
    confidence: toNullableNumber(pick(record, "confidence")),
    explanationPreview: explanationPreview || null,
  };
}

export function parseRecommendationBatch(input: unknown): RecommendationBatch {
  const record = isRecord(input) ? input : {};
  const user = parseUserSummary(pick(record, "user") ?? record);
  const recommendationsRaw = pick(record, "items", "recommendations", "results");
  const recommendations = toArray(recommendationsRaw).map((item, index) =>
    parseRecommendation(item, index),
  );

  return {
    userKey: user.userKey,
    generatedAt: toString(pick(record, "generatedAt", "generated_at")) || undefined,
    recommendations,
  };
}

export function parseRecommendationExplanation(input: unknown): RecommendationExplanation {
  const record = isRecord(input) ? input : {};
  const user = parseUserSummary(pick(record, "user") ?? record);
  const prediction = pick(record, "prediction");
  const predictionRecord = isRecord(prediction) ? prediction : {};
  const targetMovieContext = pick(record, "targetMovieContext", "target_movie_context");
  const targetMovieContextRecord = isRecord(targetMovieContext)
    ? targetMovieContext
    : {};
  const globalStats = pick(targetMovieContextRecord, "globalStats", "global_stats");
  const globalStatsRecord = isRecord(globalStats) ? globalStats : {};

  const movie = parseMovie(
    pick(record, "targetMovie", "movie", "recommendedMovie", "recommended_movie") ??
      record,
  );
  const neighbors = toArray(
    pick(record, "neighborEvidence", "neighbor_evidence", "neighbors"),
  ).map(parseNeighbor);

  const userHistoryContext = pick(record, "userHistoryContext", "user_history_context");
  const userHistoryRecord = isRecord(userHistoryContext) ? userHistoryContext : {};
  const contextualRatings = toArray(
    pick(userHistoryRecord, "recentRatings", "recent_ratings", "items", "ratings"),
  ).map(parseUserRating);
  const fallbackRatings = toArray(
    pick(record, "relevantUserRatings", "relevant_user_ratings", "userRatings", "user_ratings"),
  ).map(parseUserRating);

  return {
    userKey: user.userKey,
    movie,
    predictedRating: toNumber(
      pick(
        predictionRecord,
        "predictedRating",
        "predicted_rating",
        "score",
        "rankingScore",
        "ranking_score",
      ),
      0,
    ),
    rank: toNullableNumber(pick(record, "rank", "recommendationRank", "recommendation_rank")),
    topTags: parseTagList(
      pick(targetMovieContextRecord, "topTags", "top_tags", "tags") ??
        pick(record, "topTags", "top_tags", "tags"),
    ),
    globalStats: {
      averageRating: toNullableNumber(
        pick(
          globalStatsRecord,
          "avgRating",
          "averageRating",
          "avg_rating",
          "average_rating",
          "globalAverageRating",
          "global_average_rating",
        ),
      ),
      ratingCount: toNullableNumber(
        pick(
          globalStatsRecord,
          "ratingsCount",
          "ratingCount",
          "ratings_count",
          "rating_count",
          "globalRatingCount",
          "global_rating_count",
        ),
      ),
      popularityRank: toNullableNumber(
        pick(globalStatsRecord, "popularityRank", "popularity_rank"),
      ),
    },
    neighbors,
    relevantUserRatings: contextualRatings.length ? contextualRatings : fallbackRatings,
    narrative: toString(
      pick(record, "explanationText", "narrative", "explanation"),
      "",
    ) || undefined,
  };
}

export function parseEvaluation(input: unknown): RecommendationEvaluation {
  const record = isRecord(input) ? input : {};
  const movie = parseMovie(
    pick(record, "movie", "targetMovie", "target_movie") ?? record,
  );

  return {
    movieId: movie.movieId,
    movieTitle: movie.title,
    feedback: toString(pick(record, "feedback"), "liked") as RecommendationEvaluation["feedback"],
    predictedRating: toNullableNumber(
      pick(record, "predictedRating", "predicted_rating", "score"),
    ),
    recommendationRank: toNullableNumber(
      pick(record, "recommendationRank", "recommendation_rank", "rank"),
    ),
    actualRating: toNullableNumber(pick(record, "actualRating", "actual_rating")),
    createdAt: parseTimestamp(
      pick(record, "createdAt", "created_at", "timestamp"),
    ),
  };
}

export function parseSystemInfo(input: unknown): SystemInfo {
  const record = isRecord(input) ? input : {};
  const model = pick(record, "model");
  const modelRecord = isRecord(model) ? model : {};

  const similarity = toString(pick(modelRecord, "similarity"), "");
  const userBased = pick(modelRecord, "user_based");
  const family = toString(
    pick(record, "algorithm", "modelFamily", "model_family") ??
      pick(modelRecord, "family"),
    "",
  );

  const algorithm = (() => {
    if (!family) {
      return "Item-item collaborative filtering with Pearson similarity";
    }

    const details: string[] = [];
    if (similarity) details.push(`similarity: ${similarity}`);
    if (typeof userBased === "boolean") details.push(userBased ? "user-based" : "item-item");

    return details.length ? `${family} (${details.join(", ")})` : family;
  })();

  return {
    modelName: toString(
      pick(record, "modelName", "model_name", "name") ??
        pick(modelRecord, "name"),
      "KNNWithMeans item-item",
    ),
    algorithm,
    dataset: toString(pick(record, "dataset"), "MovieLens 20M"),
    version: toString(pick(record, "version")) || undefined,
  };
}
