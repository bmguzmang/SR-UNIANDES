from fastapi import APIRouter, HTTPException, Query, Request, status

from app.schemas.user import (
    UpsertRatingsResponse,
    UserCreateRequest,
    UserListResponse,
    UserRatingCreate,
    UserRatingBulkCreate,
    UserRatingsResponse,
    UserSummary,
)

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("", response_model=UserListResponse)
def list_users(
    request: Request,
    query: str | None = Query(default=None),
    source: str = Query(default="all", pattern="^(all|movielens|custom)$"),
    limit: int = Query(default=20, ge=1, le=100),
):
    store = request.app.state.store
    return store.search_users(query=query, source=source, limit=limit)


@router.post("", response_model=UserSummary, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreateRequest, request: Request):
    store = request.app.state.store
    return store.create_user(display_name=payload.displayName)


@router.get("/{user_key}", response_model=UserSummary)
def get_user(user_key: str, request: Request):
    store = request.app.state.store
    user = store.get_user_profile(user_key)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.get("/{user_key}/ratings", response_model=UserRatingsResponse)
def get_user_ratings(
    user_key: str,
    request: Request,
    sort: str = Query(default="recent", pattern="^(recent|rating_desc)$"),
    limit: int = Query(default=50, ge=1, le=200),
):
    store = request.app.state.store

    user = store.get_user_profile(user_key)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {
        "user": user,
        "items": store.get_user_ratings(user_key=user_key, sort=sort, limit=limit),
    }


@router.post("/{user_key}/ratings")
def upsert_user_rating(
    user_key: str,
    payload: UserRatingCreate,
    request: Request,
):
    store = request.app.state.store

    try:
        inserted = store.upsert_custom_user_ratings(
            user_key=user_key,
            ratings=[payload.model_dump()],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "message": "rating_upserted",
        "inserted": inserted,
        "movieId": payload.movieId,
        "rating": payload.rating,
    }


@router.post("/{user_key}/ratings/bulk", response_model=UpsertRatingsResponse)
def upsert_user_ratings(
    user_key: str,
    payload: UserRatingBulkCreate,
    request: Request,
):
    store = request.app.state.store

    try:
        inserted = store.upsert_custom_user_ratings(
            user_key=user_key,
            ratings=[r.model_dump() for r in payload.ratings],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "message": "ratings_upserted",
        "inserted": inserted,
    }
