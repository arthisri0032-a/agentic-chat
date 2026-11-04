"""Ingestion pipeline: read docs -> chunk -> fit/refresh the TF-IDF embedder
-> embed -> store in the local vector store. Runs on the small sample/uploaded
corpus, so a full re-fit + re-index on every ingest call is cheap and keeps
things simple (no incremental-embedding-space bookkeeping).
"""

from pathlib import Path

from app.config import SAMPLE_DOCS_DIR, UPLOADED_DOCS_DIR
from app.rag.chunking import split_into_chunks
from app.rag.embeddings_tfidf import TfidfEmbedder
from app.rag.vector_store import add_chunks, reset_collection


def _read_docs(directories: list[Path]) -> dict[str, str]:
    docs: dict[str, str] = {}
    for directory in directories:
        if not directory.exists():
            continue
        for path in sorted(directory.glob("*.txt")):
            docs[path.stem] = path.read_text(encoding="utf-8")
    return docs


def load_all_chunks() -> list[dict]:
    """Returns [{"doc_id": str, "chunk_index": int, "text": str}, ...]"""
    docs = _read_docs([SAMPLE_DOCS_DIR, UPLOADED_DOCS_DIR])
    chunks: list[dict] = []
    for doc_id, text in docs.items():
        for idx, chunk_text in enumerate(split_into_chunks(text)):
            chunks.append({"doc_id": doc_id, "chunk_index": idx, "text": chunk_text})
    return chunks


def ingest_all() -> tuple[int, int]:
    """Re-reads every document (sample + uploaded), rebuilds the embedder,
    and repopulates the Chroma collection. Returns (num_docs, num_chunks).
    """
    docs = _read_docs([SAMPLE_DOCS_DIR, UPLOADED_DOCS_DIR])
    chunks = load_all_chunks()
    if not chunks:
        reset_collection()
        return (0, 0)

    texts = [c["text"] for c in chunks]
    embedder = TfidfEmbedder()
    embedder.fit(texts)
    embedder.save()

    embeddings = embedder.transform(texts)

    reset_collection()  # wipe and repopulate the local vector store
    ids = [f"{c['doc_id']}::{c['chunk_index']}" for c in chunks]
    metadatas = [{"doc_id": c["doc_id"], "chunk_index": c["chunk_index"]} for c in chunks]
    add_chunks(ids=ids, texts=texts, embeddings=embeddings.tolist(), metadatas=metadatas)

    return (len(docs), len(chunks))
