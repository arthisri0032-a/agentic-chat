"""One-shot setup: ingest the sample documents, then train both local models.
Run once after `pip install -r requirements.txt`:

    python bootstrap.py
"""

from app.rag import train_intent_classifier, train_reranker
from app.rag.ingest import ingest_all


def main() -> None:
    num_docs, num_chunks = ingest_all()
    print(f"Ingested {num_docs} documents into {num_chunks} chunks.\n")

    print("Training PyTorch reranker...")
    train_reranker.train()
    print()

    print("Training TensorFlow intent classifier...")
    train_intent_classifier.train()
    print("\nSetup complete. Start the API with: uvicorn app.main:app --reload")


if __name__ == "__main__":
    main()
