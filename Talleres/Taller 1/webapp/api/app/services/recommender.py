from __future__ import annotations

from collections import defaultdict

import numpy as np


class RecommenderService:
    def __init__(self, model_artifact, store):
        self.store = store
        self.model = model_artifact

        if not hasattr(model_artifact, "trainset") or not hasattr(model_artifact, "sim"):
            raise ValueError("El artefacto cargado no parece ser un modelo Surprise entrenado.")

        self.trainset = model_artifact.trainset
        self.sim = model_artifact.sim
        self.means = getattr(model_artifact, "means", None)
        self.sim_options = getattr(model_artifact, "sim_options", {}) or {}

        self.user_based = bool(self.sim_options.get("user_based", True))
        if self.user_based:
            raise ValueError(
                "El modelo cargado en model.pkl es user-based. "
                "Tu API actual espera un modelo item-item (user_based=False)."
            )

    # ---------------------------------------------------
    # Helpers raw movieId <-> inner iid de Surprise
    # ---------------------------------------------------
    def _to_inner_iid(self, movie_id: int) -> int | None:
        candidates = [movie_id]

        try:
            candidates.append(str(movie_id))
        except Exception:
            pass

        try:
            candidates.append(int(movie_id))
        except Exception:
            pass

        seen = set()
        for candidate in candidates:
            if candidate in seen:
                continue
            seen.add(candidate)
            try:
                return self.trainset.to_inner_iid(candidate)
            except ValueError:
                continue

        return None

    def _to_raw_movie_id(self, inner_iid: int) -> int | str:
        raw_iid = self.trainset.to_raw_iid(inner_iid)
        try:
            return int(raw_iid)
        except Exception:
            return raw_iid

    def _item_mean(self, inner_iid: int) -> float:
        if self.means is None:
            return 0.0
        return float(self.means[inner_iid])

    def _clip_rating(self, value: float) -> float:
        return max(0.5, min(5.0, value))

    # ---------------------------------------------------
    # Vecinos de una película usando la matriz sim
    # ---------------------------------------------------
    def _top_neighbors_from_inner(self, inner_iid: int, limit: int = 10) -> list[tuple[int, float]]:
        row = np.asarray(self.sim[inner_iid], dtype=float)

        if row.size <= 1:
            return []

        candidate_count = min(limit + 20, row.size - 1)

        idxs = np.argpartition(row, -candidate_count)[-candidate_count:]
        idxs = idxs[np.argsort(row[idxs])[::-1]]

        results = []
        for other_inner in idxs:
            if int(other_inner) == int(inner_iid):
                continue

            similarity = float(row[other_inner])
            if np.isnan(similarity) or similarity <= 0:
                continue

            results.append((int(other_inner), similarity))
            if len(results) >= limit:
                break

        return results

    def get_neighbors(self, movie_id: int, limit: int = 10) -> list[dict]:
        inner_iid = self._to_inner_iid(movie_id)
        if inner_iid is None:
            return []

        neighbors = []
        for other_inner, similarity in self._top_neighbors_from_inner(inner_iid, limit=limit):
            raw_movie_id = self._to_raw_movie_id(other_inner)
            try:
                raw_movie_id = int(raw_movie_id)
            except Exception:
                continue

            neighbors.append(
                {
                    "movieId": raw_movie_id,
                    "similarity": round(similarity, 4),
                }
            )

        return neighbors

    # ---------------------------------------------------
    # Recomendación item-item estilo KNNWithMeans
    # pred = mean(target) + sum(sim * (r_uj - mean(j))) / sum(|sim|)
    # ---------------------------------------------------
    def recommend(
        self,
        user_key: str,
        top_n: int = 10,
        exclude_rated: bool = True,
        exclude_evaluated: bool = True,
        include_explanation_preview: bool = True,
        max_neighbors_per_rated_item: int = 40,
    ) -> list[dict]:
        user_ratings = self.store.get_user_rating_map(user_key)
        if not user_ratings:
            return []

        excluded_movie_ids = set()
        if exclude_rated:
            excluded_movie_ids.update(int(movie_id) for movie_id in user_ratings.keys())
        if exclude_evaluated:
            excluded_movie_ids.update(self.store.get_user_evaluated_movie_ids(user_key))

        accum = defaultdict(
            lambda: {
                "deviation_sum": 0.0,
                "similarity_sum": 0.0,
                "evidence": [],
            }
        )

        for rated_movie_id, user_rating in user_ratings.items():
            rated_inner = self._to_inner_iid(rated_movie_id)
            if rated_inner is None:
                continue

            rated_item_mean = self._item_mean(rated_inner)

            for candidate_inner, similarity in self._top_neighbors_from_inner(
                rated_inner,
                limit=max_neighbors_per_rated_item,
            ):
                candidate_movie_id = self._to_raw_movie_id(candidate_inner)
                try:
                    candidate_movie_id = int(candidate_movie_id)
                except Exception:
                    continue

                if candidate_movie_id in excluded_movie_ids:
                    continue

                deviation = float(user_rating) - rated_item_mean
                contribution = similarity * deviation

                accum[candidate_movie_id]["deviation_sum"] += contribution
                accum[candidate_movie_id]["similarity_sum"] += abs(similarity)
                accum[candidate_movie_id]["evidence"].append(
                    {
                        "movieId": int(rated_movie_id),
                        "similarity": float(similarity),
                        "userRating": float(user_rating),
                        "neighborItemMean": round(float(rated_item_mean), 4),
                        "contribution": float(contribution),
                    }
                )

        scored = []
        for candidate_movie_id, values in accum.items():
            candidate_inner = self._to_inner_iid(candidate_movie_id)
            if candidate_inner is None:
                continue

            if values["similarity_sum"] == 0:
                continue

            baseline = self._item_mean(candidate_inner)
            score = baseline + (values["deviation_sum"] / values["similarity_sum"])
            score = self._clip_rating(score)

            evidence = sorted(
                values["evidence"],
                key=lambda x: abs(x["contribution"]),
                reverse=True,
            )[:3]

            scored.append(
                {
                    "movieId": int(candidate_movie_id),
                    "score": round(score, 4),
                    "evidence": evidence,
                }
            )

        scored.sort(key=lambda x: x["score"], reverse=True)

        output = []
        rank = 1

        for item in scored[:top_n]:
            movie = self.store.get_movie_summary(item["movieId"])
            if movie is None:
                continue

            reason = "Recomendada por similitud con películas que el usuario valoró positivamente."
            if include_explanation_preview and item["evidence"]:
                titles = []
                for ev in item["evidence"][:2]:
                    neighbor_movie = self.store.get_movie_summary(ev["movieId"])
                    if neighbor_movie:
                        titles.append(neighbor_movie["title"])

                if titles:
                    reason = f"Se recomienda porque calificaste bien películas similares como {', '.join(titles)}."

            output.append(
                {
                    "rank": rank,
                    "score": round(item["score"], 2),
                    "reasonShort": reason,
                    "movie": movie,
                }
            )
            rank += 1

        return output

    # ---------------------------------------------------
    # Explicación de una recomendación puntual
    # ---------------------------------------------------
    def explain(self, user_key: str, movie_id: int) -> dict:
        user = self.store.get_user_profile(user_key)
        target_movie = self.store.get_movie_summary(movie_id)
        user_ratings = self.store.get_user_rating_map(user_key)

        target_inner = self._to_inner_iid(movie_id)
        if target_inner is None:
            return {
                "user": user,
                "targetMovie": target_movie,
                "prediction": {
                    "predictedRating": 0.0,
                    "rankingScore": 0.0,
                    "method": "surprise_knnwithmeans_item_item_pearson",
                    "neighborsUsed": 0,
                },
                "userHistoryContext": {
                    "recentRatings": self.store.get_user_ratings(user_key=user_key, sort="recent", limit=5),
                    "favoriteGenres": user["stats"]["favoriteGenres"] if user and user.get("stats") else [],
                },
                "neighborEvidence": [],
                "targetMovieContext": {
                    "globalStats": self.store.get_movie_stats(movie_id),
                    "topTags": self.store.get_movie_tags(movie_id, limit=5),
                    "similarItems": [],
                },
                "explanationText": "La película objetivo no existe en el trainset del modelo.",
            }

        target_mean = self._item_mean(target_inner)

        evidence = []
        numerator = 0.0
        denominator = 0.0

        for rated_movie_id, user_rating in user_ratings.items():
            rated_inner = self._to_inner_iid(rated_movie_id)
            if rated_inner is None or rated_inner == target_inner:
                continue

            similarity = float(self.sim[target_inner][rated_inner])
            if np.isnan(similarity) or similarity <= 0:
                continue

            neighbor_mean = self._item_mean(rated_inner)
            deviation = float(user_rating) - neighbor_mean
            contribution = similarity * deviation

            numerator += contribution
            denominator += abs(similarity)

            evidence.append(
                {
                    "similarity": round(similarity, 4),
                    "userRating": round(float(user_rating), 2),
                    "contribution": round(contribution, 4),
                    "movieId": int(rated_movie_id),
                    "explanation": (
                        f"El usuario calificó esta película con {round(float(user_rating), 2)}, "
                        f"y su desvío frente a la media del ítem ({round(neighbor_mean, 2)}) "
                        f"aporta evidencia a favor de la recomendación."
                    ),
                }
            )

        evidence.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        top_evidence = []
        for ev in evidence[:5]:
            movie = self.store.get_movie_summary(ev["movieId"])
            if movie is None:
                continue
            top_evidence.append(
                {
                    "similarity": ev["similarity"],
                    "userRating": ev["userRating"],
                    "contribution": ev["contribution"],
                    "movie": movie,
                    "explanation": ev["explanation"],
                }
            )

        predicted_rating = target_mean
        if denominator > 0:
            predicted_rating = target_mean + (numerator / denominator)
        predicted_rating = self._clip_rating(predicted_rating)

        similar_items = []
        for neighbor in self.get_neighbors(movie_id=movie_id, limit=5):
            movie = self.store.get_movie_summary(neighbor["movieId"])
            if movie:
                similar_items.append(
                    {
                        "similarity": round(float(neighbor["similarity"]), 4),
                        "movie": movie,
                    }
                )

        if top_evidence:
            top_titles = [ev["movie"]["title"] for ev in top_evidence[:2]]
            explanation_text = (
                f"La recomendación de {target_movie['title']} se explica principalmente por la similitud "
                f"con películas que el usuario ya calificó, como {', '.join(top_titles)}."
            )
        else:
            explanation_text = (
                "No se encontraron suficientes vecinos con similitud positiva dentro del historial del usuario "
                "para explicar claramente esta recomendación."
            )

        return {
            "user": user,
            "targetMovie": target_movie,
            "prediction": {
                "predictedRating": round(predicted_rating, 2),
                "rankingScore": round(predicted_rating, 2),
                "method": "surprise_knnwithmeans_item_item_pearson",
                "neighborsUsed": len(top_evidence),
            },
            "userHistoryContext": {
                "recentRatings": self.store.get_user_ratings(user_key=user_key, sort="recent", limit=5),
                "favoriteGenres": user["stats"]["favoriteGenres"] if user and user.get("stats") else [],
            },
            "neighborEvidence": top_evidence,
            "targetMovieContext": {
                "globalStats": self.store.get_movie_stats(movie_id),
                "topTags": self.store.get_movie_tags(movie_id, limit=5),
                "similarItems": similar_items,
            },
            "explanationText": explanation_text,
        }
