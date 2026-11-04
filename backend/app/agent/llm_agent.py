"""The agentic loop: a local open-source model (served by Ollama) decides
when to call search_knowledge_base or calculator via native tool-use; we
execute the tool and feed the result back until it produces a final answer.
No API key is needed — inference runs entirely on this machine.

The TensorFlow intent classifier runs first as a cheap pre-routing signal:
it's surfaced to the UI and used to skip handing over tools at all for plain
small talk, saving a round trip.
"""

import ollama

from app.agent.tools import TOOLS, run_tool
from app.config import settings
from app.rag.intent_classifier import predict_intent
from app.schemas import SourceChunk, ToolCallLog

MAX_TOOL_ITERATIONS = 5

# Keep the model resident in Ollama between requests (avoid reload latency)
# and cap generation length so a rambling response can't drag out latency.
KEEP_ALIVE = "30m"
GENERATION_OPTIONS = {"num_predict": 400}

SYSTEM_PROMPT = (
    "You are the Aurora Robotics support assistant. Aurora Robotics is a fictional "
    "company used for this demo. Answer questions about Aurora products, policies, "
    "and the SDK using the search_knowledge_base tool rather than guessing — the "
    "knowledge base is the only source of truth about Aurora. Use the calculator "
    "tool for arithmetic. When you use retrieved passages, mention which document "
    "the fact came from. Keep answers concise and friendly. For greetings or general "
    "chit-chat unrelated to Aurora, just respond directly without using tools."
)

_sessions: dict[str, list[dict]] = {}
_client = ollama.Client(host=settings.ollama_host)


def reset_session(session_id: str) -> None:
    _sessions.pop(session_id, None)


def _tool_arguments(raw) -> dict:
    return dict(raw) if raw else {}


def run_agent(message: str, session_id: str = "default"):
    intent = predict_intent(message)
    allow_tools = intent != "small_talk"

    messages = list(_sessions.get(session_id, []))
    if not messages:
        messages.append({"role": "system", "content": SYSTEM_PROMPT})
    messages.append({"role": "user", "content": message})

    tool_logs: list[ToolCallLog] = []
    sources: list[SourceChunk] = []

    for _ in range(MAX_TOOL_ITERATIONS):
        try:
            response = _client.chat(
                model=settings.ollama_model,
                messages=messages,
                tools=TOOLS if allow_tools else None,
                keep_alive=KEEP_ALIVE,
                options=GENERATION_OPTIONS,
            )
        except Exception as exc:
            raise RuntimeError(
                f"Could not reach Ollama at {settings.ollama_host} with model "
                f"'{settings.ollama_model}'. Is `ollama serve` running and has the "
                f"model been pulled (`ollama pull {settings.ollama_model}`)? ({exc})"
            ) from exc

        messages.append(response.message)
        tool_calls = response.message.tool_calls or []

        if not tool_calls:
            final_text = response.message.content or ""
            _sessions[session_id] = messages
            return final_text, intent, sources, tool_logs

        for call in tool_calls:
            name = call.function.name
            arguments = _tool_arguments(call.function.arguments)
            result_text, chunks = run_tool(name, arguments)
            tool_logs.append(
                ToolCallLog(name=name, input=arguments, output_preview=result_text[:200])
            )
            for c in chunks:
                sources.append(SourceChunk(doc_id=c["doc_id"], text=c["text"], distance=c["distance"]))
            messages.append({"role": "tool", "content": result_text, "name": name})

    fallback = "I wasn't able to finish that within the tool-call budget — could you rephrase or narrow the question?"
    messages.append({"role": "assistant", "content": fallback})
    _sessions[session_id] = messages
    return fallback, intent, sources, tool_logs
