export interface SourceChunk {
  doc_id: string;
  text: string;
  distance: number;
}

export interface ToolCallLog {
  name: string;
  input: Record<string, unknown>;
  output_preview: string;
}

export interface ChatResponse {
  reply: string;
  intent: string;
  sources: SourceChunk[];
  tool_calls: ToolCallLog[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  intent?: string;
  sources?: SourceChunk[];
  toolCalls?: ToolCallLog[];
}

export interface DocumentInfo {
  doc_id: string;
  num_chunks: number;
  preview: string;
}

export interface IngestResponse {
  status: "ok";
  documents_indexed: number;
  chunks_indexed: number;
}
