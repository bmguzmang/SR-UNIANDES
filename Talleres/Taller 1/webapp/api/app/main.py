from contextlib import asynccontextmanager
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, health, movies, recommendations, system, users
from app.services.data_loader import bootstrap_app_resources

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MODEL_PATH = BASE_DIR / "model.pkl"


@asynccontextmanager
async def lifespan(app: FastAPI):
    store, recommender = bootstrap_app_resources(DATA_DIR, MODEL_PATH)
    app.state.store = store
    app.state.recommender = recommender
    yield


app = FastAPI(
    title="Movie Recommender API",
    version="1.0.0",
    description="API para recomendaciones de películas con item-item CF Pearson",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(health.router)
app.include_router(users.router)
app.include_router(movies.router)
app.include_router(recommendations.router)
app.include_router(system.router)
