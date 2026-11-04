import type { ChatResponse, DocumentInfo, IngestResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function sendChatMessage(message: string, sessionId: string): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  return handle<ChatResponse>(res);
}

export async function fetchDocuments(): Promise<DocumentInfo[]> {
  const res = await fetch(`${API_URL}/api/documents`);
  return handle<DocumentInfo[]>(res);
}

export async function ingestSampleDocs(): Promise<IngestResponse> {
  const res = await fetch(`${API_URL}/api/ingest`, { method: "POST" });
  return handle<IngestResponse>(res);
}

export async function uploadDocuments(files: File[]): Promise<IngestResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const res = await fetch(`${API_URL}/api/upload`, { method: "POST", body: formData });
  return handle<IngestResponse>(res);
}

export async function resetSession(sessionId: string): Promise<void> {
  await fetch(`${API_URL}/api/reset?session_id=${encodeURIComponent(sessionId)}`, { method: "POST" });
}
