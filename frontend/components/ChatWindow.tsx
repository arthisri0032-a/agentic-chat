"use client";

import { useRef, useState } from "react";
import { sendChatMessage } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import MessageBubble from "./MessageBubble";

const SESSION_ID = "web-session";

const SUGGESTIONS = [
  "What's the payload limit of the RoboArm X1?",
  "How many days of PTO do I accrue per month?",
  "What's 128 * 37?",
  "Hi there!",
];

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setInput("");
    setError(null);
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);
    scrollToBottom();

    try {
      const response = await sendChatMessage(trimmed, SESSION_ID);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: response.reply,
          intent: response.intent,
          sources: response.sources,
          toolCalls: response.tool_calls,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="m-auto text-center max-w-md">
            <h2 className="text-lg font-semibold text-slate-700 mb-2">Ask about Aurora Robotics</h2>
            <p className="text-sm text-slate-500 mb-4">
              This agent retrieves from a local knowledge base, reranks with a PyTorch model, routes
              intent with a TensorFlow classifier, and reasons with Claude.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs bg-white border border-slate-200 hover:border-brand-300 rounded-full px-3 py-1.5 text-slate-600"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-slate-400">
              Thinking…
            </div>
          </div>
        )}
      </div>

      {error && <div className="px-6 pb-2 text-sm text-red-600">{error}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="border-t border-slate-200 bg-white p-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-5 py-2.5 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
