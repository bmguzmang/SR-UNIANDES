from typing import Literal

from pydantic import BaseModel, Field


class RecommendationEvaluationRequest(BaseModel):
    userKey: str
    movieId: int
    predictedRating: float | None = Field(default=None, ge=0.5, le=5.0)
    recommendationRank: int | None = Field(default=None, ge=1)
    feedback: Literal["liked", "disliked", "not_interested", "already_seen"]
    actualRating: float | None = Field(default=None, ge=0.5, le=5.0)


class RecommendationEvaluationResponse(BaseModel):
    message: str
