from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.movie import MovieSummary


class UserStats(BaseModel):
    ratingsCount: int = 0
    avgRating: float | None = None
    favoriteGenres: list[str] = Field(default_factory=list)


class UserSummary(BaseModel):
    userKey: str
    source: Literal["movielens", "custom"]
    datasetUserId: int | None = None
    displayName: str
    stats: UserStats | None = None


class UserCreateRequest(BaseModel):
    displayName: str = Field(min_length=2, max_length=80)


class UserRatingCreate(BaseModel):
    movieId: int
    rating: float = Field(ge=0.5, le=5.0)
    timestamp: int | None = None


class UserRatingBulkCreate(BaseModel):
    ratings: list[UserRatingCreate] = Field(min_length=1)


class UserRatingItem(BaseModel):
    rating: float
    timestamp: int | None = None
    movie: MovieSummary


class UserRatingsResponse(BaseModel):
    user: UserSummary
    items: list[UserRatingItem]


class UserListResponse(BaseModel):
    items: list[UserSummary]
    total: int


class UpsertRatingsResponse(BaseModel):
    message: str
    inserted: int