from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class SourceChunk(BaseModel):
    doc_id: str
    text: str
    distance: float


class ToolCallLog(BaseModel):
    name: str
    input: dict[str, Any]
    output_preview: str


class ChatResponse(BaseModel):
    reply: str
    intent: str
    sources: list[SourceChunk] = Field(default_factory=list)
    tool_calls: list[ToolCallLog] = Field(default_factory=list)


class IngestResponse(BaseModel):
    status: Literal["ok"]
    documents_indexed: int
    chunks_indexed: int


class DocumentInfo(BaseModel):
    doc_id: str
    num_chunks: int
    preview: str
