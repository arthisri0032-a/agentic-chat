"""Trains the PyTorch reranker on self-supervised triplets mined from the
sample documents (see app/data/synthetic_data.py). Run with:

    python -m app.rag.train_reranker

Uses margin ranking loss so score(query, positive) ends up higher than
score(query, negative) for each mined triplet.
"""

import torch
import torch.nn as nn
import torch.optim as optim

from app.config import RERANKER_PATH
from app.data.synthetic_data import generate_reranker_triplets
from app.rag.ingest import load_all_chunks
from app.rag.reranker_model import RerankerNet, texts_to_batch

EPOCHS = 30
LR = 1e-3
MARGIN = 0.2


def train() -> None:
    chunks = load_all_chunks()
    triplets = generate_reranker_triplets(chunks)
    if not triplets:
        raise SystemExit("No training triplets could be built — ingest some documents first.")

    print(f"Training reranker on {len(triplets)} triplets mined from {len(chunks)} chunks.")

    model = RerankerNet()
    optimizer = optim.Adam(model.parameters(), lr=LR)
    loss_fn = nn.MarginRankingLoss(margin=MARGIN)

    queries = [t[0] for t in triplets]
    positives = [t[1] for t in triplets]
    negatives = [t[2] for t in triplets]
    target = torch.ones(len(triplets))

    model.train()
    for epoch in range(1, EPOCHS + 1):
        optimizer.zero_grad()

        q_ids, q_offsets = texts_to_batch(queries)
        p_ids, p_offsets = texts_to_batch(positives)
        n_ids, n_offsets = texts_to_batch(negatives)

        pos_scores = model(q_ids, q_offsets, p_ids, p_offsets)
        neg_scores = model(q_ids, q_offsets, n_ids, n_offsets)

        loss = loss_fn(pos_scores, neg_scores, target)
        loss.backward()
        optimizer.step()

        if epoch == 1 or epoch % 5 == 0:
            with torch.no_grad():
                accuracy = (pos_scores > neg_scores).float().mean().item()
            print(f"epoch {epoch:3d}  loss={loss.item():.4f}  pos>neg accuracy={accuracy:.3f}")

    RERANKER_PATH.parent.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), RERANKER_PATH)
    print(f"Saved reranker weights to {RERANKER_PATH}")


if __name__ == "__main__":
    train()
