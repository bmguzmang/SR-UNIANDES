from pydantic import BaseModel, Field


class MovieLinks(BaseModel):
    imdbId: str | None = None
    tmdbId: str | None = None


class TagWeight(BaseModel):
    tag: str
    weight: float


class MovieStats(BaseModel):
    ratingsCount: int = 0
    avgRating: float | None = None


class MovieSummary(BaseModel):
    movieId: int
    title: str
    year: int | None = None
    genres: list[str] = Field(default_factory=list)
    image: str | None = None


class MovieDetail(MovieSummary):
    links: MovieLinks | None = None
    stats: MovieStats | None = None
    topTags: list[TagWeight] = Field(default_factory=list)


class MovieNeighbor(BaseModel):
    similarity: float
    movie: MovieSummary


class MovieSearchResponse(BaseModel):
    items: list[MovieSummary]
    total: int


class MovieNeighborsResponse(BaseModel):
    movie: MovieSummary
    neighbors: list[MovieNeighbor]
