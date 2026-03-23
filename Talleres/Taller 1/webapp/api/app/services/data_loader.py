from __future__ import annotations

import json
import os
import pickle
import re
import time
from collections import Counter
from pathlib import Path

import httpx
import pandas as pd


def _resolve_csv(data_dir: Path, *candidates: str) -> Path | None:
    for name in candidates:
        path = data_dir / name
        if path.exists():
            return path
    return None


class DataStore:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.tmdb_poster_size = os.getenv("TMDB_POSTER_SIZE", "w500")
        self.tmdb_api_key = os.getenv("TMDB_API_KEY")
        self.tmdb_read_access_token = os.getenv("TMDB_API_READ_ACCESS_TOKEN")
        self.tmdb_image_cache_path = self.data_dir / "tmdb_image_cache.json"
        self._tmdb_image_cache: dict[str, str | None] = self._load_tmdb_image_cache()

        movies_path = _resolve_csv(data_dir, "movies.csv", "movie.csv")
        ratings_path = _resolve_csv(data_dir, "ratings.csv", "rating.csv")
        tags_path = _resolve_csv(data_dir, "tags.csv", "tag.csv")
        links_path = _resolve_csv(data_dir, "links.csv", "link.csv")
        genome_scores_path = _resolve_csv(data_dir, "genome_scores.csv")
        genome_tags_path = _resolve_csv(data_dir, "genome_tags.csv")

        if movies_path is None or ratings_path is None:
            raise FileNotFoundError("No encontré movies.csv/movie.csv o ratings.csv/rating.csv en /data")

        self.movies_df = pd.read_csv(movies_path)
        self.ratings_df = pd.read_csv(ratings_path)
        self.tags_df = pd.read_csv(tags_path) if tags_path else pd.DataFrame(columns=["userId", "movieId", "tag", "timestamp"])
        self.links_df = pd.read_csv(links_path) if links_path else pd.DataFrame(columns=["movieId", "imdbId", "tmdbId"])
        self.genome_scores_df = pd.read_csv(genome_scores_path) if genome_scores_path else pd.DataFrame(columns=["movieId", "tagId", "relevance"])
        self.genome_tags_df = pd.read_csv(genome_tags_path) if genome_tags_path else pd.DataFrame(columns=["tagId", "tag"])

        self._prepare_movies()
        self._prepare_stats()
        self._prepare_custom_storage()

        self._top_tags_cache: dict[int, list[dict]] = {}

    def _prepare_movies(self):
        self.movies_df["year"] = pd.to_numeric(
            self.movies_df["title"].str.extract(r"\((\d{4})\)")[0],
            errors="coerce",
        ).astype("Int64")

        self.movies_df["genres_list"] = self.movies_df["genres"].fillna("").apply(
            lambda x: [] if x in ("", "(no genres listed)") else x.split("|")
        )

        self.movies_map = {}
        for row in self.movies_df.itertuples():
            self.movies_map[int(row.movieId)] = {
                "movieId": int(row.movieId),
                "title": row.title,
                "year": None if pd.isna(row.year) else int(row.year),
                "genres": list(row.genres_list),
            }

        tmdb_col = "tmdbId" if "tmdbId" in self.links_df.columns else "tmbdId" if "tmbdId" in self.links_df.columns else None
        self.links_map = {}
        if not self.links_df.empty:
            for row in self.links_df.itertuples():
                self.links_map[int(row.movieId)] = {
                    "imdbId": None if pd.isna(getattr(row, "imdbId", None)) else str(int(getattr(row, "imdbId"))),
                    "tmdbId": None if tmdb_col is None or pd.isna(getattr(row, tmdb_col, None)) else str(int(getattr(row, tmdb_col))),
                }

    def _load_tmdb_image_cache(self) -> dict[str, str | None]:
        if not self.tmdb_image_cache_path.exists():
            return {}

        try:
            raw = json.loads(self.tmdb_image_cache_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}

        if not isinstance(raw, dict):
            return {}

        return {
            str(key): value
            for key, value in raw.items()
            if value is None or isinstance(value, str)
        }

    def _persist_tmdb_image_cache(self):
        try:
            self.tmdb_image_cache_path.write_text(
                json.dumps(self._tmdb_image_cache, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except OSError:
            return

    def _prepare_stats(self):
        movie_stats = (
            self.ratings_df.groupby("movieId")
            .agg(ratingsCount=("rating", "count"), avgRating=("rating", "mean"))
            .reset_index()
        )

        self.base_movie_stats_map = {
            int(row.movieId): {
                "ratingsCount": int(row.ratingsCount),
                "avgRating": round(float(row.avgRating), 2),
            }
            for row in movie_stats.itertuples()
        }

        user_stats = (
            self.ratings_df.groupby("userId")
            .agg(ratingsCount=("rating", "count"), avgRating=("rating", "mean"))
            .reset_index()
        )

        self.base_user_stats_map = {
            int(row.userId): {
                "ratingsCount": int(row.ratingsCount),
                "avgRating": round(float(row.avgRating), 2),
            }
            for row in user_stats.itertuples()
        }

        self.base_user_ids = sorted(self.base_user_stats_map.keys())

    def _prepare_custom_storage(self):
        self.custom_users_path = self.data_dir / "custom_users.json"
        self.custom_ratings_path = self.data_dir / "custom_ratings.csv"
        self.evaluations_path = self.data_dir / "recommendation_feedback.csv"

        if not self.custom_users_path.exists():
            self.custom_users_path.write_text("[]", encoding="utf-8")

        if not self.custom_ratings_path.exists():
            pd.DataFrame(columns=["userKey", "movieId", "rating", "timestamp"]).to_csv(
                self.custom_ratings_path, index=False
            )

        if not self.evaluations_path.exists():
            pd.DataFrame(
                columns=[
                    "userKey",
                    "movieId",
                    "predictedRating",
                    "recommendationRank",
                    "feedback",
                    "actualRating",
                    "timestamp",
                ]
            ).to_csv(self.evaluations_path, index=False)

        self.custom_users = json.loads(self.custom_users_path.read_text(encoding="utf-8"))

        self.custom_ratings_df = pd.read_csv(self.custom_ratings_path)
        if self.custom_ratings_df.empty:
            self.custom_ratings_df = pd.DataFrame(columns=["userKey", "movieId", "rating", "timestamp"])

        self.evaluations_df = pd.read_csv(self.evaluations_path)
        if self.evaluations_df.empty:
            self.evaluations_df = pd.DataFrame(
                columns=[
                    "userKey",
                    "movieId",
                    "predictedRating",
                    "recommendationRank",
                    "feedback",
                    "actualRating",
                    "timestamp",
                ]
            )

    def _persist_custom_users(self):
        self.custom_users_path.write_text(
            json.dumps(self.custom_users, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _persist_custom_ratings(self):
        self.custom_ratings_df.to_csv(self.custom_ratings_path, index=False)

    def _persist_evaluations(self):
        self.evaluations_df.to_csv(self.evaluations_path, index=False)

    def _parse_user_key(self, user_key: str) -> tuple[str, int | None]:
        if user_key.startswith("ml_"):
            return "movielens", int(user_key.split("_", 1)[1])
        if user_key.startswith("cu_"):
            return "custom", int(user_key.split("_", 1)[1])
        return "unknown", None

    def search_users(self, query: str | None, source: str, limit: int) -> dict:
        query = (query or "").strip().lower()
        items = []

        if source in ("all", "movielens"):
            for user_id in self.base_user_ids:
                if query and query not in str(user_id):
                    continue
                items.append(self.get_user_summary(f"ml_{user_id}"))
                if len(items) >= limit:
                    break

        if source in ("all", "custom") and len(items) < limit:
            for user in self.custom_users:
                if query and query not in user["displayName"].lower() and query not in user["userKey"].lower():
                    continue
                items.append(self.get_user_summary(user["userKey"]))
                if len(items) >= limit:
                    break

        return {"items": items, "total": len(items)}

    def create_user(self, display_name: str) -> dict:
        next_id = 1
        if self.custom_users:
            next_id = max(int(u["userKey"].split("_", 1)[1]) for u in self.custom_users) + 1

        user = {
            "userKey": f"cu_{next_id}",
            "source": "custom",
            "datasetUserId": None,
            "displayName": display_name,
            "stats": {
                "ratingsCount": 0,
                "avgRating": None,
                "favoriteGenres": [],
            },
        }

        self.custom_users.append(user)
        self._persist_custom_users()
        return user

    def get_user_summary(self, user_key: str) -> dict | None:
        source, source_id = self._parse_user_key(user_key)

        if source == "movielens":
            if source_id not in self.base_user_stats_map:
                return None
            stats = self.base_user_stats_map[source_id]
            return {
                "userKey": user_key,
                "source": "movielens",
                "datasetUserId": source_id,
                "displayName": f"Usuario MovieLens {source_id}",
                "stats": {
                    "ratingsCount": stats["ratingsCount"],
                    "avgRating": stats["avgRating"],
                    "favoriteGenres": [],
                },
            }

        if source == "custom":
            user = next((u for u in self.custom_users if u["userKey"] == user_key), None)
            if user is None:
                return None
            stats = self._build_user_stats(user_key)
            return {
                "userKey": user_key,
                "source": "custom",
                "datasetUserId": None,
                "displayName": user["displayName"],
                "stats": stats,
            }

        return None

    def get_user_profile(self, user_key: str) -> dict | None:
        summary = self.get_user_summary(user_key)
        if summary is None:
            return None
        summary["stats"] = self._build_user_stats(user_key)
        return summary

    def _build_user_stats(self, user_key: str) -> dict:
        ratings = self.get_user_ratings_df(user_key)
        if ratings.empty:
            return {"ratingsCount": 0, "avgRating": None, "favoriteGenres": []}

        liked = ratings[ratings["rating"] >= 4.0]["movieId"].tolist()
        genre_counter = Counter()
        for movie_id in liked:
            movie = self.movies_map.get(int(movie_id))
            if movie:
                genre_counter.update(movie["genres"])

        favorite_genres = [genre for genre, _ in genre_counter.most_common(3)]

        return {
            "ratingsCount": int(len(ratings)),
            "avgRating": round(float(ratings["rating"].mean()), 2),
            "favoriteGenres": favorite_genres,
        }

    def get_user_ratings_df(self, user_key: str) -> pd.DataFrame:
        source, source_id = self._parse_user_key(user_key)

        if source == "movielens":
            return self.ratings_df[self.ratings_df["userId"] == source_id].copy()

        if source == "custom":
            return self.custom_ratings_df[self.custom_ratings_df["userKey"] == user_key].copy()

        return pd.DataFrame(columns=["movieId", "rating", "timestamp"])

    @staticmethod
    def _to_unix_timestamp(value) -> int | None:
        if value is None or pd.isna(value):
            return None

        numeric_value = pd.to_numeric(value, errors="coerce")
        if not pd.isna(numeric_value):
            return int(float(numeric_value))

        datetime_value = pd.to_datetime(value, errors="coerce")
        if pd.isna(datetime_value):
            return None

        return int(datetime_value.value // 1_000_000_000)

    def get_user_ratings(self, user_key: str, sort: str, limit: int) -> list[dict]:
        df = self.get_user_ratings_df(user_key)
        if df.empty:
            return []

        if sort == "rating_desc":
            df = df.sort_values(by=["rating", "timestamp"], ascending=[False, False])
        else:
            df = df.sort_values(by=["timestamp"], ascending=False)

        items = []
        for row in df.head(limit).itertuples():
            movie = self.get_movie_summary(int(row.movieId))
            if movie is None:
                continue
            items.append(
                {
                    "rating": float(row.rating),
                    "timestamp": self._to_unix_timestamp(getattr(row, "timestamp", None)),
                    "movie": movie,
                }
            )
        return items

    def get_user_rating_map(self, user_key: str) -> dict[int, float]:
        df = self.get_user_ratings_df(user_key)
        if df.empty:
            return {}
        return {int(row.movieId): float(row.rating) for row in df.itertuples()}

    def get_user_evaluated_movie_ids(self, user_key: str) -> set[int]:
        df = self.evaluations_df[self.evaluations_df["userKey"] == user_key]
        if df.empty:
            return set()

        movie_ids = set()
        for movie_id in df["movieId"].tolist():
            if pd.isna(movie_id):
                continue
            try:
                movie_ids.add(int(movie_id))
            except (TypeError, ValueError):
                continue

        return movie_ids

    def upsert_custom_user_ratings(self, user_key: str, ratings: list[dict]) -> int:
        source, _ = self._parse_user_key(user_key)
        if source != "custom":
            raise ValueError("Solo se pueden agregar ratings a usuarios custom")

        if self.get_user_summary(user_key) is None:
            raise ValueError("Usuario custom no encontrado")

        now = int(time.time())

        for item in ratings:
            movie_id = int(item["movieId"])
            rating = float(item["rating"])
            timestamp = int(item.get("timestamp") or now)

            self.custom_ratings_df = self.custom_ratings_df[
                ~(
                    (self.custom_ratings_df["userKey"] == user_key)
                    & (self.custom_ratings_df["movieId"] == movie_id)
                )
            ]

            self.custom_ratings_df = pd.concat(
                [
                    self.custom_ratings_df,
                    pd.DataFrame(
                        [
                            {
                                "userKey": user_key,
                                "movieId": movie_id,
                                "rating": rating,
                                "timestamp": timestamp,
                            }
                        ]
                    ),
                ],
                ignore_index=True,
            )

        self._persist_custom_ratings()
        return len(ratings)

    def save_recommendation_evaluation(self, payload: dict) -> None:
        now = int(time.time())

        row = {
            "userKey": payload["userKey"],
            "movieId": int(payload["movieId"]),
            "predictedRating": payload.get("predictedRating"),
            "recommendationRank": payload.get("recommendationRank"),
            "feedback": payload["feedback"],
            "actualRating": payload.get("actualRating"),
            "timestamp": now,
        }

        self.evaluations_df = pd.concat(
            [self.evaluations_df, pd.DataFrame([row])],
            ignore_index=True,
        )
        self._persist_evaluations()

    def get_user_evaluations(self, user_key: str, limit: int = 50) -> list[dict]:
        df = self.evaluations_df[self.evaluations_df["userKey"] == user_key].copy()
        if df.empty:
            return []

        df = df.sort_values(by="timestamp", ascending=False).head(limit)

        items = []
        for row in df.itertuples():
            movie = self.get_movie_summary(int(row.movieId))
            items.append(
                {
                    "movie": movie,
                    "predictedRating": None if pd.isna(row.predictedRating) else float(row.predictedRating),
                    "recommendationRank": None if pd.isna(row.recommendationRank) else int(row.recommendationRank),
                    "feedback": row.feedback,
                    "actualRating": None if pd.isna(row.actualRating) else float(row.actualRating),
                    "timestamp": self._to_unix_timestamp(getattr(row, "timestamp", None)),
                }
            )

        return items

    def search_movies(self, query: str | None, genre: str | None, year: int | None, limit: int) -> dict:
        df = self.movies_df.copy()

        if query:
            df = df[df["title"].str.contains(query, case=False, na=False)]

        if genre:
            df = df[df["genres_list"].apply(lambda genres: genre in genres)]

        if year is not None:
            df = df[df["year"] == year]

        items = [self.get_movie_summary(int(movie_id)) for movie_id in df["movieId"].head(limit).tolist()]
        return {"items": [item for item in items if item is not None], "total": min(len(df), limit)}

    def _fetch_tmdb_image_via_api(self, tmdb_id: str) -> str | None:
        if not self.tmdb_api_key and not self.tmdb_read_access_token:
            return None

        endpoint = f"https://api.themoviedb.org/3/movie/{tmdb_id}"
        params = {}
        if self.tmdb_api_key:
            params["api_key"] = self.tmdb_api_key

        headers = {"Accept": "application/json"}
        if self.tmdb_read_access_token:
            headers["Authorization"] = f"Bearer {self.tmdb_read_access_token}"

        try:
            response = httpx.get(
                endpoint,
                params=params,
                headers=headers,
                timeout=3.0,
                follow_redirects=True,
            )
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, json.JSONDecodeError, ValueError):
            return None

        poster_path = payload.get("poster_path")
        if not poster_path:
            return None

        return f"https://image.tmdb.org/t/p/{self.tmdb_poster_size}{poster_path}"

    @staticmethod
    def _fetch_tmdb_image_via_web(tmdb_id: str) -> str | None:
        headers = {
            "User-Agent": "movie-recommender-api/1.0",
            "Accept": "text/html",
        }

        try:
            response = httpx.get(
                f"https://www.themoviedb.org/movie/{tmdb_id}",
                headers=headers,
                timeout=3.0,
                follow_redirects=True,
            )
            response.raise_for_status()
            html = response.text
        except httpx.HTTPError:
            return None

        match = re.search(r'property="og:image"\s+content="([^"]+)"', html)
        if not match:
            return None

        return match.group(1)

    def _resolve_tmdb_image(self, tmdb_id: str | None) -> str | None:
        if not tmdb_id:
            return None

        if tmdb_id in self._tmdb_image_cache:
            return self._tmdb_image_cache[tmdb_id]

        image_url = self._fetch_tmdb_image_via_api(tmdb_id)
        if image_url is None:
            image_url = self._fetch_tmdb_image_via_web(tmdb_id)

        if image_url is not None:
            self._tmdb_image_cache[tmdb_id] = image_url
            self._persist_tmdb_image_cache()
        return image_url

    def get_movie_summary(self, movie_id: int) -> dict | None:
        movie = self.movies_map.get(int(movie_id))
        if movie is None:
            return None

        tmdb_id = self.links_map.get(int(movie_id), {}).get("tmdbId")
        return {
            **movie,
            "image": self._resolve_tmdb_image(tmdb_id),
        }

    def get_movie_stats(self, movie_id: int) -> dict:
        base = self.base_movie_stats_map.get(int(movie_id), {"ratingsCount": 0, "avgRating": None})

        custom = self.custom_ratings_df[self.custom_ratings_df["movieId"] == movie_id]
        if custom.empty:
            return base

        custom_count = int(len(custom))
        custom_sum = float(custom["rating"].sum())

        base_count = int(base["ratingsCount"])
        base_avg = float(base["avgRating"]) if base["avgRating"] is not None else 0.0
        total_count = base_count + custom_count

        if total_count == 0:
            return {"ratingsCount": 0, "avgRating": None}

        total_sum = (base_count * base_avg) + custom_sum
        return {
            "ratingsCount": total_count,
            "avgRating": round(total_sum / total_count, 2),
        }

    def get_movie_tags(self, movie_id: int, limit: int = 5) -> list[dict]:
        movie_id = int(movie_id)

        if movie_id in self._top_tags_cache:
            return self._top_tags_cache[movie_id][:limit]

        if self.genome_scores_df.empty or self.genome_tags_df.empty:
            return []

        subset = self.genome_scores_df[self.genome_scores_df["movieId"] == movie_id]
        if subset.empty:
            return []

        subset = subset.nlargest(limit, "relevance")
        subset = subset.merge(self.genome_tags_df, on="tagId", how="left")

        tags = [
            {"tag": row.tag, "weight": round(float(row.relevance), 3)}
            for row in subset.itertuples()
            if pd.notna(row.tag)
        ]

        self._top_tags_cache[movie_id] = tags
        return tags

    def get_movie_detail(self, movie_id: int) -> dict | None:
        summary = self.get_movie_summary(movie_id)
        if summary is None:
            return None

        return {
            **summary,
            "links": self.links_map.get(int(movie_id), {"imdbId": None, "tmdbId": None}),
            "stats": self.get_movie_stats(int(movie_id)),
            "topTags": self.get_movie_tags(int(movie_id), limit=5),
        }


def load_model(model_path: Path):
    with open(model_path, "rb") as f:
        return pickle.load(f)


def bootstrap_app_resources(data_dir: Path, model_path: Path):
    store = DataStore(data_dir)
    raw_model = load_model(model_path)

    from app.services.recommender import RecommenderService

    recommender = RecommenderService(model_artifact=raw_model, store=store)
    return store, recommender
