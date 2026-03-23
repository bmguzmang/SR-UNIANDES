from fastapi import APIRouter, HTTPException, Query, Request

from app.schemas.movie import MovieDetail, MovieNeighborsResponse, MovieSearchResponse

router = APIRouter(prefix="/api/v1/movies", tags=["movies"])


@router.get("", response_model=MovieSearchResponse)
def search_movies(
    request: Request,
    query: str | None = Query(default=None),
    genre: str | None = Query(default=None),
    year: int | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
):
    store = request.app.state.store
    return store.search_movies(query=query, genre=genre, year=year, limit=limit)


@router.get("/{movie_id}", response_model=MovieDetail)
def get_movie(movie_id: int, request: Request):
    store = request.app.state.store
    movie = store.get_movie_detail(movie_id)
    if movie is None:
        raise HTTPException(status_code=404, detail="Película no encontrada")
    return movie


@router.get("/{movie_id}/neighbors", response_model=MovieNeighborsResponse)
def get_movie_neighbors(
    movie_id: int,
    request: Request,
    limit: int = Query(default=10, ge=1, le=50),
):
    store = request.app.state.store
    recommender = request.app.state.recommender

    movie = store.get_movie_summary(movie_id)
    if movie is None:
        raise HTTPException(status_code=404, detail="Película no encontrada")

    neighbors = recommender.get_neighbors(movie_id=movie_id, limit=limit)

    return {
        "movie": movie,
        "neighbors": [
            {
                "similarity": n["similarity"],
                "movie": store.get_movie_summary(n["movieId"]),
            }
            for n in neighbors
            if store.get_movie_summary(n["movieId"]) is not None
        ],
    }