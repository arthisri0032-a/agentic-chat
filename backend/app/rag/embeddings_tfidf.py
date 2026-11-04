"""A small, fully local embedding function: TF-IDF followed by truncated SVD
to get fixed-size dense vectors. No pretrained weights to download, so ingestion
and retrieval work offline. Implements Chroma's EmbeddingFunction protocol
(a callable that maps a list of strings to a list of float vectors).
"""

from pathlib import Path

import joblib
import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline

from app.config import EMBEDDER_PATH


class TfidfEmbedder:
    def __init__(self, n_components: int = 256):
        self.n_components = n_components
        self.pipeline: Pipeline | None = None

    def fit(self, texts: list[str]) -> None:
        n_components = min(self.n_components, max(2, len(texts) - 1))
        self.pipeline = Pipeline(
            [
                ("tfidf", TfidfVectorizer(stop_words="english", max_features=20000, sublinear_tf=True)),
                ("svd", TruncatedSVD(n_components=n_components, random_state=42)),
            ]
        )
        self.pipeline.fit(texts)

    def transform(self, texts: list[str]) -> np.ndarray:
        if self.pipeline is None:
            raise RuntimeError("TfidfEmbedder used before fit()/load(). Ingest documents first.")
        vectors = self.pipeline.transform(texts)
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return vectors / norms

    def save(self, path: Path = EMBEDDER_PATH) -> None:
        joblib.dump(self.pipeline, path)

    @classmethod
    def load(cls, path: Path = EMBEDDER_PATH) -> "TfidfEmbedder":
        instance = cls()
        instance.pipeline = joblib.load(path)
        return instance

    @classmethod
    def load_if_exists(cls, path: Path = EMBEDDER_PATH) -> "TfidfEmbedder | None":
        if path.exists():
            return cls.load(path)
        return None

    # Chroma EmbeddingFunction protocol
    def __call__(self, input: list[str]) -> list[list[float]]:
        return self.transform(list(input)).tolist()

    def name(self) -> str:
        return "tfidf-svd-local"
