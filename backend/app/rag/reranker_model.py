"""A small PyTorch bi-encoder that re-scores (query, chunk) pairs.

TF-IDF/SVD (embeddings_tfidf.py) does the initial candidate retrieval from
Chroma; this network refines the ranking of those candidates. It's a real,
trainable neural model (see train_reranker.py) rather than a hand-tuned
heuristic — it hashes tokens into fixed buckets (see hashing.py) so it needs
no pretrained vocabulary or downloaded weights.
"""

from pathlib import Path

import torch
import torch.nn as nn

from app.config import RERANKER_PATH
from app.rag.hashing import hash_ids

VOCAB_SIZE = 8192
EMBED_DIM = 64
MAX_TOKENS = 96


class RerankerNet(nn.Module):
    def __init__(self, vocab_size: int = VOCAB_SIZE, embed_dim: int = EMBED_DIM):
        super().__init__()
        self.embedding = nn.EmbeddingBag(vocab_size, embed_dim, mode="mean")
        self.scorer = nn.Sequential(
            nn.Linear(embed_dim * 3, 128),
            nn.ReLU(),
            nn.Linear(128, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def encode(self, ids: torch.Tensor, offsets: torch.Tensor) -> torch.Tensor:
        return self.embedding(ids, offsets)

    def forward(self, q_ids, q_offsets, d_ids, d_offsets) -> torch.Tensor:
        q = self.encode(q_ids, q_offsets)
        d = self.encode(d_ids, d_offsets)
        features = torch.cat([q, d, q * d], dim=-1)
        return self.scorer(features).squeeze(-1)


def texts_to_batch(texts: list[str], vocab_size: int = VOCAB_SIZE, max_len: int = MAX_TOKENS):
    """Flatten a batch of texts into EmbeddingBag's (ids, offsets) layout."""
    all_ids: list[int] = []
    offsets: list[int] = [0]
    for text in texts:
        ids = hash_ids(text, vocab_size, max_len)
        all_ids.extend(ids)
        offsets.append(len(all_ids))
    offsets = offsets[:-1]
    return torch.tensor(all_ids, dtype=torch.long), torch.tensor(offsets, dtype=torch.long)


class Reranker:
    def __init__(self, model: RerankerNet):
        self.model = model
        self.model.eval()

    @classmethod
    def load_if_exists(cls, path: Path = RERANKER_PATH) -> "Reranker | None":
        if not path.exists():
            return None
        model = RerankerNet()
        model.load_state_dict(torch.load(path, map_location="cpu", weights_only=True))
        return cls(model)

    @torch.no_grad()
    def score(self, query: str, candidates: list[str]) -> list[float]:
        if not candidates:
            return []
        q_ids, q_offsets = texts_to_batch([query] * len(candidates))
        d_ids, d_offsets = texts_to_batch(candidates)
        scores = self.model(q_ids, q_offsets, d_ids, d_offsets)
        return scores.tolist()

    def rerank(self, query: str, candidates: list[str], top_n: int) -> list[int]:
        """Returns indices into `candidates`, best first."""
        scores = self.score(query, candidates)
        order = sorted(range(len(candidates)), key=lambda i: scores[i], reverse=True)
        return order[:top_n]
