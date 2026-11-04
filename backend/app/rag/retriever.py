"""Two-stage retrieval: TF-IDF/SVD vector search against the local vector
store for a broad candidate set, then the PyTorch reranker (when trained
weights exist) refines the ordering before the top chunks are handed to Claude.
"""

from app.rag.embeddings_tfidf import TfidfEmbedder
from app.rag.reranker_model import Reranker
from app.rag.vector_store import query as vector_query

CANDIDATE_K = 8
FINAL_K = 4

_reranker: Reranker | None = None
_reranker_loaded = False


def _get_reranker() -> Reranker | None:
    global _reranker, _reranker_loaded
    if not _reranker_loaded:
        _reranker = Reranker.load_if_exists()
        _reranker_loaded = True
    return _reranker


def retrieve(query_text: str, top_k: int = FINAL_K) -> list[dict]:
    embedder = TfidfEmbedder.load_if_exists()
    if embedder is None:
        return []

    query_embedding = embedder.transform([query_text])[0].tolist()
    result = vector_query(query_embedding, n_results=CANDIDATE_K)

    documents = result["documents"][0]
    metadatas = result["metadatas"][0]
    distances = result["distances"][0]
    if not documents:
        return []

    reranker = _get_reranker()
    if reranker is not None and len(documents) > 1:
        order = reranker.rerank(query_text, documents, top_n=min(top_k, len(documents)))
    else:
        order = list(range(min(top_k, len(documents))))

    return [
        {
            "doc_id": metadatas[i]["doc_id"],
            "text": documents[i],
            "distance": float(distances[i]),
        }
        for i in order
    ]
