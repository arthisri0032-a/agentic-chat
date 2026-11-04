"use client";

import { useRef, useState } from "react";
import { uploadDocuments } from "@/lib/api";

export default function UploadButton({ onIngested }: { onIngested: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await uploadDocuments(Array.from(fileList));
      onIngested();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="text-sm font-medium text-brand-600 hover:text-brand-700 border border-brand-200 hover:border-brand-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Upload .txt documents"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
