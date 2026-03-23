def build_recommendation_explanation(store, recommender, user_key: str, movie_id: int) -> dict:
    return recommender.explain(user_key=user_key, movie_id=movie_id)