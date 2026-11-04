from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.agent.llm_agent import reset_session, run_agent
from app.config import UPLOADED_DOCS_DIR, settings
from app.rag.ingest import ingest_all
from app.rag.vector_store import list_all
from app.schemas import ChatRequest, ChatResponse, DocumentInfo, IngestResponse

app = FastAPI(title="Agentic RAG Chat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/ingest", response_model=IngestResponse)
def ingest():
    num_docs, num_chunks = ingest_all()
    return IngestResponse(status="ok", documents_indexed=num_docs, chunks_indexed=num_chunks)


@app.post("/api/upload", response_model=IngestResponse)
async def upload(files: list[UploadFile]):
    for file in files:
        if not file.filename or not file.filename.lower().endswith(".txt"):
            raise HTTPException(400, f"Only .txt files are supported (got {file.filename}).")
        dest = UPLOADED_DOCS_DIR / Path(file.filename).name
        dest.write_bytes(await file.read())

    num_docs, num_chunks = ingest_all()
    return IngestResponse(status="ok", documents_indexed=num_docs, chunks_indexed=num_chunks)


@app.get("/api/documents", response_model=list[DocumentInfo])
def documents():
    data = list_all()
    by_doc: dict[str, list[str]] = {}
    for doc_meta, text in zip(data["metadatas"], data["documents"]):
        by_doc.setdefault(doc_meta["doc_id"], []).append(text)

    return [
        DocumentInfo(doc_id=doc_id, num_chunks=len(texts), preview=texts[0][:180])
        for doc_id, texts in by_doc.items()
    ]


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        reply, intent, sources, tool_calls = run_agent(request.message, request.session_id)
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    return ChatResponse(reply=reply, intent=intent, sources=sources, tool_calls=tool_calls)


@app.post("/api/reset")
def reset(session_id: str = "default"):
    reset_session(session_id)
    return {"status": "ok"}
