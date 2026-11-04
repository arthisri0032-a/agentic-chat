"""Splits raw documents into overlapping chunks for retrieval."""

import re


def split_into_chunks(text: str, chunk_size: int = 700, overlap: int = 120) -> list[str]:
    """Chunk on paragraph boundaries, packing paragraphs up to ~chunk_size chars
    with a sliding overlap so a fact near a chunk edge still appears in a neighbor.
    """
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not paragraphs:
        return []

    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        candidate = f"{current}\n\n{para}" if current else para
        if len(candidate) <= chunk_size or not current:
            current = candidate
        else:
            chunks.append(current)
            tail = current[-overlap:] if overlap < len(current) else current
            current = f"{tail}\n\n{para}"
    if current:
        chunks.append(current)
    return chunks
