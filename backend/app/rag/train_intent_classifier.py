"""Trains the TensorFlow intent classifier on the synthetic templated dataset
(see app/data/synthetic_data.py). Run with:

    python -m app.rag.train_intent_classifier
"""

import numpy as np
import tensorflow as tf

from app.config import INTENT_MODEL_PATH
from app.data.synthetic_data import generate_intent_dataset
from app.rag.intent_classifier import LABELS, MAX_TOKENS, SEQUENCE_LENGTH, build_model

EPOCHS = 40


def train() -> None:
    examples = generate_intent_dataset()
    # Keep texts as a plain Python list and feed Keras via tf.data.Dataset —
    # Keras 3's data adapters don't reliably accept raw numpy '<U...' string
    # arrays or bare Python lists of samples for a single-input string model.
    texts = [t for t, _ in examples]
    labels = np.array([LABELS.index(label) for _, label in examples])

    print(f"Training intent classifier on {len(examples)} synthetic examples across {len(LABELS)} classes.")

    vectorizer = tf.keras.layers.TextVectorization(
        max_tokens=MAX_TOKENS,
        output_sequence_length=SEQUENCE_LENGTH,
    )
    vectorizer.adapt(tf.data.Dataset.from_tensor_slices(texts).batch(32))

    model = build_model(vectorizer)

    split = int(len(texts) * 0.85)
    idx = np.random.RandomState(42).permutation(len(texts))
    train_idx, val_idx = idx[:split], idx[split:]

    train_texts = [texts[i] for i in train_idx]
    val_texts = [texts[i] for i in val_idx]

    train_ds = tf.data.Dataset.from_tensor_slices((train_texts, labels[train_idx])).shuffle(256, seed=42).batch(16)
    val_ds = tf.data.Dataset.from_tensor_slices((val_texts, labels[val_idx])).batch(16)

    model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS, verbose=2)

    INTENT_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    model.save(INTENT_MODEL_PATH)
    print(f"Saved intent classifier to {INTENT_MODEL_PATH}")


if __name__ == "__main__":
    train()
