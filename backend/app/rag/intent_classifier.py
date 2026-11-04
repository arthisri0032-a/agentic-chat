"""A small TensorFlow/Keras text classifier that routes an incoming message
into one of four intents before the agentic loop runs:

- rag_lookup   -> the agent should lean on knowledge-base retrieval
- calculator   -> a pure arithmetic question, cheap to answer via the tool
- small_talk   -> greetings/pleasantries, answered directly with no tools
- general_chat -> open-ended chat that isn't about the knowledge base

Claude still decides tool calls on its own via the Anthropic tool-use API;
this classifier is a fast, cheap pre-routing signal surfaced to the frontend
and used to skip unnecessary tool-permission overhead for small talk.
"""

from pathlib import Path

import numpy as np
import tensorflow as tf

from app.config import INTENT_MODEL_PATH

LABELS = ["rag_lookup", "calculator", "small_talk", "general_chat"]
MAX_TOKENS = 2000
SEQUENCE_LENGTH = 24
EMBED_DIM = 32

_model: tf.keras.Model | None = None
_model_checked = False


def build_model(vectorizer: tf.keras.layers.TextVectorization) -> tf.keras.Model:
    # Scalar per-sample shape, matching the flat string Datasets used for
    # both training (tf.data.Dataset.from_tensor_slices) and inference.
    inputs = tf.keras.Input(shape=(), dtype=tf.string)
    x = vectorizer(inputs)
    x = tf.keras.layers.Embedding(MAX_TOKENS, EMBED_DIM)(x)
    x = tf.keras.layers.GlobalAveragePooling1D()(x)
    x = tf.keras.layers.Dense(32, activation="relu")(x)
    x = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(len(LABELS), activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs)
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return model


def load_if_exists(path: Path = INTENT_MODEL_PATH) -> tf.keras.Model | None:
    global _model, _model_checked
    if _model_checked:
        return _model
    _model_checked = True
    if path.exists():
        _model = tf.keras.models.load_model(path)
    return _model


def predict_intent(text: str) -> str:
    model = load_if_exists()
    if model is None:
        return "general_chat"
    probs = model.predict(tf.constant([text]), verbose=0)[0]
    return LABELS[int(np.argmax(probs))]
