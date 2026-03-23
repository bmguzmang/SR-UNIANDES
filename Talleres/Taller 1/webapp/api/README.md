# Movie Recommender API

FastAPI backend for movie recommendations using collaborative filtering (`Surprise` + `KNNWithMeans`, item-item, Pearson).

## 1) What comes in the code zip vs what you must provide

If you zip only source code, the API will still need runtime artifacts that are usually excluded:

- Required in zip/code:
  - `app/`
  - `requirements.txt`
- Required to run (often not included in source zip):
  - `data/` folder
  - `model.pkl`

Without `data/` and `model.pkl`, the app will not start.

## 2) Required folder/file structure

From the `api/` directory, you should have:

```text
api/
  app/
  requirements.txt
  model.pkl
  data/
    movie.csv or movies.csv
    rating.csv or ratings.csv
    link.csv or links.csv                (optional)
    tag.csv or tags.csv                  (optional)
    genome_scores.csv                    (optional)
    genome_tags.csv                      (optional)
```

Notes:
- Minimum required dataset files are movies + ratings.
- If missing, the API creates these automatically inside `data/`:
  - `custom_users.json`
  - `custom_ratings.csv`
  - `recommendation_feedback.csv`

## 3) Environment setup and run commands

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API docs:
- `http://127.0.0.1:8000/docs`

Health check:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

## 4) How to create `model.pkl` (when it is not in the zip)

The model must be a trained `Surprise` `KNNWithMeans` configured as:
- similarity: `pearson`
- `user_based=False` (item-item)

Run this from `api/`:

```bash
python - <<'PY'
from pathlib import Path
import pickle
import pandas as pd
from surprise import Dataset, Reader, KNNWithMeans

base = Path(".")
data_dir = base / "data"
ratings_path = data_dir / "ratings.csv"
if not ratings_path.exists():
    ratings_path = data_dir / "rating.csv"
if not ratings_path.exists():
    raise FileNotFoundError("Missing data/ratings.csv or data/rating.csv")

ratings = pd.read_csv(ratings_path, usecols=["userId", "movieId", "rating"])

reader = Reader(rating_scale=(0.5, 5.0))
dataset = Dataset.load_from_df(ratings[["userId", "movieId", "rating"]], reader)
trainset = dataset.build_full_trainset()

algo = KNNWithMeans(
    k=40,
    min_k=1,
    sim_options={"name": "pearson", "user_based": False},
    verbose=True,
)
algo.fit(trainset)

with open(base / "model.pkl", "wb") as f:
    pickle.dump(algo, f, protocol=pickle.HIGHEST_PROTOCOL)

print("Saved model.pkl")
PY
```

Important:
- Training on MovieLens 20M can take significant RAM/time because item-item similarity matrices are large.
- The API will reject user-based models.

## 5) Optional environment variables

Used only for poster images from TMDB:

- `TMDB_API_KEY`
- `TMDB_API_READ_ACCESS_TOKEN`
- `TMDB_POSTER_SIZE` (default: `w500`)

If these are not set, recommendations still work; only image enrichment may be limited.
