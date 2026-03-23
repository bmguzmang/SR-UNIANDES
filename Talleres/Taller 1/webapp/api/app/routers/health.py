from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health")
def health(request: Request):
    model_loaded = hasattr(request.app.state, "recommender")
    data_loaded = hasattr(request.app.state, "store")

    return {
        "status": "ok",
        "modelLoaded": model_loaded,
        "datasetLoaded": data_loaded,
    }