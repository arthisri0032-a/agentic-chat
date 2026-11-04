"""Generates synthetic training data for the two local models, since this
project has no pre-existing labeled dataset:

- `generate_reranker_triplets`: self-supervised (query, positive, negative)
  triplets for the PyTorch reranker, built directly from the sample docs
  using an inverse-cloze-style split (hold out a sentence as the pseudo-query,
  the rest of the chunk is the positive, a chunk from a different doc is the
  negative).
- `generate_intent_dataset`: templated labeled sentences for the TensorFlow
  intent classifier's four routing classes.
"""

import random
import re

random.seed(42)

_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")


def _split_sentences(text: str) -> list[str]:
    flat = " ".join(text.split())
    sentences = [s.strip() for s in _SENTENCE_RE.split(flat) if len(s.strip()) > 15]
    return sentences


def generate_reranker_triplets(chunks: list[dict]) -> list[tuple[str, str, str]]:
    """`chunks` is a list of {"doc_id": str, "text": str}."""
    triplets: list[tuple[str, str, str]] = []
    by_index = list(enumerate(chunks))

    for i, chunk in by_index:
        sentences = _split_sentences(chunk["text"])
        if len(sentences) < 2:
            continue
        query_sentence = random.choice(sentences)
        positive = chunk["text"]

        other_indices = [j for j, c in by_index if c["doc_id"] != chunk["doc_id"]]
        if not other_indices:
            other_indices = [j for j, _ in by_index if j != i]
        if not other_indices:
            continue
        negative = chunks[random.choice(other_indices)]["text"]

        triplets.append((query_sentence, positive, negative))

    return triplets


_RAG_TOPICS = [
    "the RoboArm X1's payload limit",
    "how to home the arm",
    "the warranty period",
    "error code E-27",
    "the PTO accrual rate",
    "remote work policy",
    "parental leave duration",
    "the expense reimbursement threshold",
    "the return policy",
    "the education discount",
    "how the gripper force works",
    "the SDK's Python installation command",
    "how telemetry streaming works",
    "what happens after an e-stop",
    "the bulk order process",
    "performance review schedule",
]
_RAG_TEMPLATES = [
    "What is {topic}?",
    "Can you tell me about {topic}?",
    "How does {topic} work?",
    "I need details on {topic}.",
    "Explain {topic} to me.",
    "Do we have documentation on {topic}?",
]

_CALC_TEMPLATES = [
    "What's {a} + {b}?",
    "Calculate {a} * {b}",
    "How much is {a} divided by {b}?",
    "{a} minus {b} equals what?",
    "Compute {a} times {b} for me.",
    "What is the sum of {a} and {b}?",
]

_SMALL_TALK = [
    "Hi",
    "Hello there",
    "Hey, how are you?",
    "Good morning",
    "Good evening!",
    "Thanks so much",
    "Thank you, that helps",
    "See you later",
    "Nice to meet you",
    "How's it going?",
    "What's up?",
    "Bye for now",
]

_GENERAL_CHAT = [
    "Tell me a joke",
    "Write a haiku about robots",
    "What do you think about AI safety?",
    "Can you help me brainstorm names for a robotics startup?",
    "Give me a fun fact about space",
    "What's your opinion on remote work in general?",
    "Summarize the plot of a sci-fi movie about robots",
    "Suggest a name for a new robot product line",
    "What's a good icebreaker question for a team meeting?",
    "Write a short poem about automation",
]


def generate_intent_dataset() -> list[tuple[str, str]]:
    examples: list[tuple[str, str]] = []

    for topic in _RAG_TOPICS:
        for template in _RAG_TEMPLATES:
            examples.append((template.format(topic=topic), "rag_lookup"))

    for _ in range(60):
        a, b = random.randint(1, 999), random.randint(1, 99)
        template = random.choice(_CALC_TEMPLATES)
        examples.append((template.format(a=a, b=b), "calculator"))

    for phrase in _SMALL_TALK:
        examples.append((phrase, "small_talk"))
        examples.append((phrase + "!", "small_talk"))

    for phrase in _GENERAL_CHAT:
        examples.append((phrase, "general_chat"))
        examples.append((phrase + " please", "general_chat"))

    random.shuffle(examples)
    return examples
