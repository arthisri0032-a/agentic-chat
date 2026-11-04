# Agentic Chat — Agentic RAG over Aurora Robotics docs

A full-stack demo: a Next.js chat UI talking to a Python/FastAPI backend where
a local open-source LLM (served by [Ollama](https://ollama.com), no API key
needed) runs an agentic tool-use loop over a locally-built RAG pipeline. Since
there's no pre-existing dataset for this use case, the backend ships with a
small synthetic knowledge base (a fictional company, "Aurora Robotics") and
trains its own small PyTorch and TensorFlow models from data it generates
itself — see `backend/app/data/synthetic_data.py`.

## Architecture

```
frontend/ (Next.js, TypeScript, Tailwind)
  chat UI  ---HTTP--->  backend/ (FastAPI)
                            |
                            |-- app/agent/llm_agent.py       Ollama tool-use loop (local LLM, no key)
                            |-- app/agent/tools.py           search_knowledge_base + calculator tools
                            |-- app/rag/ingest.py            chunk docs -> embed -> store
                            |-- app/rag/embeddings_tfidf.py  TF-IDF + SVD embedder (local, no downloads)
                            |-- app/rag/vector_store.py      local numpy-backed vector store (persisted to disk)
                            |-- app/rag/reranker_model.py    PyTorch bi-encoder reranker
                            |-- app/rag/train_reranker.py    trains the reranker on mined triplets
                            |-- app/rag/intent_classifier.py TensorFlow intent router
                            |-- app/rag/train_intent_classifier.py
                            |-- app/data/sample_docs/*.txt   synthetic knowledge base
                            |-- app/data/synthetic_data.py   generates training data for both models
```

**Request flow for a chat message:**
1. The TensorFlow intent classifier tags the message (`rag_lookup`, `calculator`,
   `small_talk`, `general_chat`) — a fast, cheap routing signal shown in the UI
   and used to skip handing the LLM any tools at all for plain small talk.
2. The local LLM (via Ollama's native tool-use API) decides on its own whether
   to call `search_knowledge_base` or `calculator`, in a loop, until it has
   enough information to answer.
3. `search_knowledge_base` does two-stage retrieval: TF-IDF/SVD vector search
   against a local numpy-backed vector store pulls a broad candidate set, then
   the trained PyTorch reranker re-scores and reorders those candidates before
   they're handed back to the model.
4. The model's final answer, the detected intent, the retrieved source chunks,
   and a trace of any tool calls are all returned to the frontend.

## Why this design

- **RAG** is TF-IDF+SVD (retrieval) plus a **PyTorch** neural reranker trained
  with a self-supervised inverse-cloze-style objective mined directly from the
  sample documents — no pretrained embedding model download required, so it
  works fully offline once dependencies are installed.
- **Agentic AI** is the local model's native tool-use loop in `llm_agent.py`:
  the model decides when to retrieve or calculate, not a hand-written if/else
  router.
- **No API key**: the LLM runs locally via Ollama instead of a hosted API, so
  there's nothing to sign up for or pay for to try this end-to-end.
- **TensorFlow** trains a small intent classifier on a synthetic templated
  dataset, used as a lightweight pre-routing/analytics signal alongside the
  model's own tool-use decisions.
- **PyTorch** trains the reranker described above.
- Swap in your own documents at any time — see "Adding your own data" below.

## Prerequisites

- **Python 3.10, 3.11, or 3.12** — https://www.python.org/downloads/. TensorFlow
  wheels may not yet exist for newer Python versions, so avoid 3.13+ for now.
- **Node.js 18+** (includes npm) — https://nodejs.org/
- **Ollama** — https://ollama.com/download — runs the local LLM, no account or
  API key required. After installing, pull the model this project uses:
  ```powershell
  ollama pull llama3.2:1b
  ```
  Ollama runs as a background service after install/first launch and serves
  its API at `http://localhost:11434`.

## Backend setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env

python bootstrap.py        # ingests sample docs, trains the reranker + intent classifier
uvicorn app.main:app --reload --port 8000
```

`bootstrap.py` only needs to be re-run when you add/change documents (it
re-ingests and retrains both local models). The API then runs at
http://localhost:8000 (interactive docs at http://localhost:8000/docs).

## Frontend setup

```powershell
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Open http://localhost:3000. The chat UI lets you send messages, upload
additional `.txt` documents, and re-index the sample docs.

## Adding your own data

Drop `.txt` files into `backend/app/data/sample_docs/`, or upload them from
the UI (they land in `backend/app/data/uploaded_docs/`), then either click
"Re-index sample docs" in the UI or re-run `python bootstrap.py` to rebuild
the embedder, vector index, and retrain the reranker on the new corpus.

## Model choice and performance

The backend defaults to `llama3.2:1b` (set via `OLLAMA_MODEL` in
`backend/.env`), the fastest tool-calling-capable model in the Llama 3.2
family — chosen so responses stay quick on CPU-only machines. `llm_agent.py`
also sets `keep_alive="30m"` (so Ollama keeps the model resident in memory
instead of reloading it every request) and caps generation at 400 tokens
(`num_predict`) so a rambling answer can't drag out latency.

Changing `OLLAMA_MODEL` requires restarting uvicorn — environment variables
are only read at startup, `--reload` won't pick up a `.env` change.

For better answer quality (at the cost of slower CPU inference), pull and
switch to a larger tool-capable model, e.g.:
```powershell
ollama pull llama3.2:3b
```
then set `OLLAMA_MODEL=llama3.2:3b` in `backend/.env` and restart uvicorn.
`llama3.1:8b` is a further step up in quality/latency if you have the RAM
and patience for it. `OLLAMA_HOST` can point at any reachable Ollama instance
(e.g. a GPU machine on your network) instead of `localhost`, which is the
biggest speedup available if one is on hand.
