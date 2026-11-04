"""Deterministic feature hashing so the PyTorch reranker needs no external
tokenizer or pretrained vocabulary — every run hashes tokens to the same bucket ids.
"""

import hashlib
import re

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def hash_token(token: str, vocab_size: int) -> int:
    digest = hashlib.md5(token.encode("utf-8")).hexdigest()
    return int(digest, 16) % vocab_size


def hash_ids(text: str, vocab_size: int, max_len: int = 96) -> list[int]:
    tokens = tokenize(text)[:max_len]
    if not tokens:
        return [0]
    return [hash_token(t, vocab_size) for t in tokens]
