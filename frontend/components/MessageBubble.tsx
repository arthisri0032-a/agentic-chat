"use client";

import type { ChatMessage } from "@/lib/types";

const INTENT_STYLES: Record<string, string> = {
  rag_lookup: "bg-brand-100 text-brand-700",
  calculator: "bg-amber-100 text-amber-700",
  small_talk: "bg-emerald-100 text-emerald-700",
  general_chat: "bg-slate-200 text-slate-700",
};

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser ? "bg-brand-500 text-white rounded-br-sm" : "bg-white border border-slate-200 rounded-bl-sm"
          }`}
        >
          {message.text}
        </div>

        {!isUser && message.intent && (
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full w-fit ${
              INTENT_STYLES[message.intent] ?? "bg-slate-200 text-slate-700"
            }`}
          >
            intent: {message.intent}
          </span>
        )}

        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="text-[11px] text-slate-500 flex flex-col gap-0.5">
            {message.toolCalls.map((call, i) => (
              <span key={i}>
                🔧 called <code className="font-mono">{call.name}</code>
              </span>
            ))}
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 && (
          <details className="text-[11px] text-slate-500 max-w-full">
            <summary className="cursor-pointer select-none">
              {message.sources.length} source{message.sources.length > 1 ? "s" : ""}
            </summary>
            <div className="mt-1 flex flex-col gap-1.5">
              {message.sources.map((source, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-md p-2">
                  <div className="font-semibold text-slate-600 mb-0.5">{source.doc_id}</div>
                  <div className="line-clamp-3">{source.text}</div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
