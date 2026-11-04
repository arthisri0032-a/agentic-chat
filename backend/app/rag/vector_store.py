"""A small local vector store: a persisted numpy matrix of embeddings plus a
JSON sidecar of (id, document, metadata) records.

Chroma was the original choice here, but its ANN index (chroma-hnswlib) has
no prebuilt wheel for this Python/OS combination and needs a C++ compiler to
build from source. At this project's scale (dozens to low-hundreds of
chunks), exact cosine search over a numpy matrix is just as fast as an ANN
index and needs no compiled dependency at all.

TfidfEmbedder L2-normalizes its output, so a plain dot product against the
stored matrix is already cosine similarity.
"""

import json

import numpy as np

from app.config import STORAGE_DIR

STORE_DIR = STORAGE_DIR / "vector_index"
EMBEDDINGS_PATH = STORE_DIR / "embeddings.npy"
RECORDS_PATH = STORE_DIR / "records.json"


def _load() -> tuple[np.ndarray, list[dict]]:
    if EMBEDDINGS_PATH.exists() and RECORDS_PATH.exists():
        embeddings = np.load(EMBEDDINGS_PATH)
        records = json.loads(RECORDS_PATH.read_text(encoding="utf-8"))
        return embeddings, records
    return np.zeros((0, 0), dtype=np.float32), []


def _save(embeddings: np.ndarray, records: list[dict]) -> None:
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    np.save(EMBEDDINGS_PATH, embeddings.astype(np.float32))
    RECORDS_PATH.write_text(json.dumps(records), encoding="utf-8")


def reset_collection() -> None:
    _save(np.zeros((0, 0), dtype=np.float32), [])


def add_chunks(ids: list[str], texts: list[str], embeddings: list[list[float]], metadatas: list[dict]) -> None:
    embeddings_arr = np.array(embeddings, dtype=np.float32)
    records = [
        {"id": chunk_id, "document": text, "metadata": metadata}
        for chunk_id, text, metadata in zip(ids, texts, metadatas)
    ]
    _save(embeddings_arr, records)


def count_chunks() -> int:
    _, records = _load()
    return len(records)


def query(embedding: list[float], n_results: int = 8) -> dict:
    embeddings, records = _load()
    if not records:
        return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

    query_vec = np.array(embedding, dtype=np.float32)
    similarities = embeddings @ query_vec
    n = min(n_results, len(records))
    top_indices = np.argsort(-similarities)[:n]

    return {
        "ids": [[records[i]["id"] for i in top_indices]],
        "documents": [[records[i]["document"] for i in top_indices]],
        "metadatas": [[records[i]["metadata"] for i in top_indices]],
        "distances": [[float(1.0 - similarities[i]) for i in top_indices]],
    }


def list_all() -> dict:
    _, records = _load()
    return {
        "ids": [r["id"] for r in records],
        "documents": [r["document"] for r in records],
        "metadatas": [r["metadata"] for r in records],
    }
