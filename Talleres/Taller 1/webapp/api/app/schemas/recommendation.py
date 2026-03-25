from pydantic import BaseModel, Field

from app.schemas.movie import MovieNeighbor, MovieStats, MovieSummary, TagWeight
from app.schemas.user import UserSummary


class RecommendationRequest(BaseModel):
    userKey: str
    topN: int = Field(default=10, ge=1, le=50)
    excludeRated: bool = True
    excludeEvaluated: bool = True
    includeExplanationPreview: bool = True
    maxNeighborsPerRatedItem: int = Field(default=40, ge=1)


class RecommendationItem(BaseModel):
    rank: int
    score: float
    reasonShort: str
    movie: MovieSummary


class RecommendationsResponse(BaseModel):
    user: UserSummary
    model: dict
    items: list[RecommendationItem]


class PredictionInfo(BaseModel):
    predictedRating: float
    rankingScore: float
    method: str
    neighborsUsed: int


class NeighborEvidence(BaseModel):
    similarity: float
    userRating: float
    contribution: float
    movie: MovieSummary
    explanation: str


class TargetMovieContext(BaseModel):
    globalStats: MovieStats | None = None
    topTags: list[TagWeight] = Field(default_factory=list)
    similarItems: list[MovieNeighbor] = Field(default_factory=list)


class RecommendationExplanationResponse(BaseModel):
    user: UserSummary
    targetMovie: MovieSummary
    prediction: PredictionInfo
    userHistoryContext: dict
    neighborEvidence: list[NeighborEvidence]
    targetMovieContext: TargetMovieContext
    explanationText: str
