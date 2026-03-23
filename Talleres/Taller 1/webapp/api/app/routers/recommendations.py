from fastapi import APIRouter, HTTPException, Request

from app.schemas.evaluation import (
    RecommendationEvaluationRequest,
    RecommendationEvaluationResponse,
)
from app.schemas.recommendation import (
    RecommendationExplanationResponse,
    RecommendationRequest,
    RecommendationsResponse,
)
from app.services.explanations import build_recommendation_explanation

router = APIRouter(prefix="/api/v1/recommendations", tags=["recommendations"])


@router.post("", response_model=RecommendationsResponse)
def recommend(payload: RecommendationRequest, request: Request):
    store = request.app.state.store
    recommender = request.app.state.recommender

    user = store.get_user_profile(payload.userKey)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    items = recommender.recommend(
        user_key=payload.userKey,
        top_n=payload.topN,
        exclude_rated=payload.excludeRated,
        exclude_evaluated=payload.excludeEvaluated,
        include_explanation_preview=payload.includeExplanationPreview,
    )

    return {
        "user": user,
        "model": {
            "name": "item-item collaborative filtering",
            "similarity": "pearson",
        },
        "items": items,
    }


@router.post("/evaluations", response_model=RecommendationEvaluationResponse)
def save_recommendation_evaluation(
    payload: RecommendationEvaluationRequest,
    request: Request,
):
    store = request.app.state.store

    user = store.get_user_profile(payload.userKey)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    movie = store.get_movie_summary(payload.movieId)
    if movie is None:
        raise HTTPException(status_code=404, detail="Película no encontrada")

    store.save_recommendation_evaluation(payload.model_dump())

    return {"message": "evaluation_saved"}


@router.get("/{user_key}/evaluations")
def get_user_evaluations(user_key: str, request: Request, limit: int = 50):
    store = request.app.state.store

    user = store.get_user_profile(user_key)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {
        "user": user,
        "items": store.get_user_evaluations(user_key=user_key, limit=limit),
    }


@router.get(
    "/{user_key}/explanations/{movie_id}",
    response_model=RecommendationExplanationResponse,
)
def explain_recommendation(user_key: str, movie_id: int, request: Request):
    store = request.app.state.store
    recommender = request.app.state.recommender

    user = store.get_user_profile(user_key)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    movie = store.get_movie_summary(movie_id)
    if movie is None:
        raise HTTPException(status_code=404, detail="Película no encontrada")

    return build_recommendation_explanation(
        store=store,
        recommender=recommender,
        user_key=user_key,
        movie_id=movie_id,
    )
