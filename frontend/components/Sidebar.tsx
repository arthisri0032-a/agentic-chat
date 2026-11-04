"use client";

import { useEffect, useState } from "react";
import { fetchDocuments, ingestSampleDocs } from "@/lib/api";
import type { DocumentInfo } from "@/lib/types";
import UploadButton from "./UploadButton";

export default function Sidebar() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setDocuments(await fetchDocuments());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleReindex() {
    setReindexing(true);
    try {
      await ingestSampleDocs();
      await refresh();
    } finally {
      setReindexing(false);
    }
  }

  return (
    <aside className="w-72 shrink-0 h-full border-r border-slate-200 bg-white flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h1 className="font-semibold text-slate-900">Aurora Agentic RAG</h1>
        <p className="text-xs text-slate-500 mt-1">
          Claude agent + local RAG (TF-IDF/SVD retrieval, PyTorch reranker, TensorFlow intent router)
        </p>
      </div>

      <div className="p-4 flex flex-col gap-3 border-b border-slate-200">
        <UploadButton onIngested={refresh} />
        <button
          onClick={handleReindex}
          disabled={reindexing}
          className="text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          {reindexing ? "Re-indexing…" : "Re-index sample docs"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Indexed documents
        </h2>
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && documents.length === 0 && (
          <p className="text-sm text-slate-400">
            Nothing indexed yet. Run the backend bootstrap script or click "Re-index sample docs".
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li key={doc.doc_id} className="border border-slate-200 rounded-lg p-2.5">
              <div className="text-sm font-medium text-slate-800">{doc.doc_id}</div>
              <div className="text-xs text-slate-400">{doc.num_chunks} chunks</div>
              <div className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.preview}</div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
