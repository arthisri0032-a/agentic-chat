from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

APP_DIR = Path(__file__).resolve().parent
DATA_DIR = APP_DIR / "data"
SAMPLE_DOCS_DIR = DATA_DIR / "sample_docs"
UPLOADED_DOCS_DIR = DATA_DIR / "uploaded_docs"
STORAGE_DIR = APP_DIR / "storage"
EMBEDDER_PATH = STORAGE_DIR / "tfidf_embedder.joblib"
RERANKER_PATH = STORAGE_DIR / "reranker.pt"
INTENT_MODEL_PATH = STORAGE_DIR / "intent_model.keras"


class Settings(BaseSettings):
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:1b"
    cors_origin: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()

for d in (DATA_DIR, SAMPLE_DOCS_DIR, UPLOADED_DOCS_DIR, STORAGE_DIR):
    d.mkdir(parents=True, exist_ok=True)
