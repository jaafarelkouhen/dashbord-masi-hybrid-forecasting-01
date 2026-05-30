"""Configuration centralisée via variables d'environnement (.env)."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # MASI source repository
    masi_project_root: Path = Path(
        "C:/Users/jelko/OneDrive/Desktop/2-TimeSeriesProject/masi-hybrid-forecasting"
    )

    # API server
    api_host: str = "127.0.0.1"
    api_port: int = 8000

    # LLM backend
    llm_backend: str = "fallback"  # fallback | openai | anthropic | ollama
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5-20251001"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:3b"

    # RAG
    rag_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    rag_embedding_device: str = "cpu"
    rag_chroma_dir: Path = Path("./.chroma_db")
    rag_collection: str = "masi_kb"
    rag_top_k: int = 6


settings = Settings()
