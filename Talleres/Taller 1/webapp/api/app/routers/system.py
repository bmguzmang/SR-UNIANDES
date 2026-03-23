from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v1/system", tags=["system"])


@router.get("/info")
def system_info(request: Request):
    recommender = request.app.state.recommender

    return {
        "appName": "movie-recommender-api",
        "model": {
            "name": "KNNWithMeans",
            "family": "item-item collaborative filtering",
            "similarity": recommender.sim_options.get("name"),
            "user_based": recommender.sim_options.get("user_based"),
        },
        "dataset": "MovieLens 20M",
    }
