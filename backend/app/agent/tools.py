"""Tool definitions exposed to the LLM's tool-use API, plus their execution.

The model decides when to call these itself (native agentic tool use); we
just supply the schema and run the tool when it asks for one. Schemas follow
the OpenAI-style function-calling format Ollama expects.
"""

import ast
import operator
from typing import Any

from app.rag.retriever import retrieve

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": (
                "Search the Aurora Robotics knowledge base (product manual, HR policy, FAQ, "
                "API docs) for passages relevant to a query. Use this whenever the user asks "
                "about Aurora products, policies, or the SDK."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query."},
                    "top_k": {
                        "type": "integer",
                        "description": "Number of passages to return (default 4).",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Evaluate a basic arithmetic expression, e.g. '23 * (4 + 1) / 2'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {"type": "string", "description": "The arithmetic expression to evaluate."}
                },
                "required": ["expression"],
            },
        },
    },
]

_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def _safe_eval(node: ast.AST) -> float:
    if isinstance(node, ast.Expression):
        return _safe_eval(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_safe_eval(node.left), _safe_eval(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_safe_eval(node.operand))
    raise ValueError(f"Unsupported expression: {ast.dump(node)}")


def calculator(expression: str) -> str:
    try:
        tree = ast.parse(expression, mode="eval")
        result = _safe_eval(tree)
        return str(result)
    except Exception as exc:
        return f"Could not evaluate expression: {exc}"


def search_knowledge_base(query: str, top_k: int = 4) -> tuple[str, list[dict]]:
    chunks = retrieve(query, top_k=top_k)
    if not chunks:
        return "No relevant passages found. The knowledge base may be empty — try ingesting documents first.", []

    formatted = "\n\n".join(f"[{c['doc_id']}]\n{c['text']}" for c in chunks)
    return formatted, chunks


def run_tool(name: str, tool_input: dict[str, Any]) -> tuple[str, list[dict]]:
    """Returns (text_result_for_model, source_chunks_for_ui)."""
    if name == "calculator":
        return calculator(tool_input["expression"]), []
    if name == "search_knowledge_base":
        return search_knowledge_base(tool_input["query"], tool_input.get("top_k", 4))
    return f"Unknown tool: {name}", []
