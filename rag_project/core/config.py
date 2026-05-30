"""Configuration centralisée du rag_project.

Tout est surchargable via variables d'environnement ou un .env à la racine du
dashboard. Voir README.md du rag_project pour la liste complète.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# Charge .env de la racine du dashboard avant d'évaluer les défauts.
try:
    from dotenv import load_dotenv

    _DASHBOARD_ENV = Path(__file__).resolve().parent.parent.parent / ".env"
    if _DASHBOARD_ENV.exists():
        load_dotenv(_DASHBOARD_ENV, override=False)
except ImportError:  # python-dotenv absent — on retombe sur os.environ seul
    pass


def _env_path(key: str, default: str) -> Path:
    return Path(os.environ.get(key, default)).expanduser()


def _env_int(key: str, default: int) -> int:
    raw = os.environ.get(key)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_float(key: str, default: float) -> float:
    raw = os.environ.get(key)
    if raw is None or raw == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


_THIS_DIR = Path(__file__).resolve().parent
_RAG_PROJECT_DIR = _THIS_DIR.parent
_DASHBOARD_DIR = _RAG_PROJECT_DIR.parent


@dataclass(frozen=True)
class RagSettings:
    # Project locations
    # Défaut portable : cherche masi-hybrid-forecasting à côté du dashboard
    # (../masi-hybrid-forecasting). Surchargeable via MASI_PROJECT_ROOT.
    masi_project_root: Path = _env_path(
        "MASI_PROJECT_ROOT",
        str(_DASHBOARD_DIR.parent / "masi-hybrid-forecasting"),
    )
    dashboard_root: Path = _DASHBOARD_DIR
    rag_project_root: Path = _RAG_PROJECT_DIR
    curated_docs_dir: Path = _RAG_PROJECT_DIR / "docs"

    # Vector store
    chroma_dir: Path = _env_path("RAG_CHROMA_DIR", str(_DASHBOARD_DIR / ".chroma_db"))
    collection_name: str = os.environ.get("RAG_COLLECTION", "masi_kb")
    embedding_model: str = os.environ.get(
        "RAG_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
    )
    embedding_device: str = os.environ.get("RAG_EMBEDDING_DEVICE", "cpu")

    # Retrieval
    top_k: int = _env_int("RAG_TOP_K", 6)
    bm25_weight: float = _env_float("RAG_BM25_WEIGHT", 0.4)
    chunk_max_chars: int = _env_int("RAG_CHUNK_MAX_CHARS", 1200)
    chunk_min_chars: int = _env_int("RAG_CHUNK_MIN_CHARS", 80)
    max_rag_context_chars: int = _env_int("RAG_MAX_CONTEXT_CHARS", 4500)

    # Intent router (embedding cosine threshold below = out_of_scope)
    intent_similarity_threshold: float = _env_float("RAG_INTENT_THRESHOLD", 0.30)

    # LLM
    llm_backend: str = os.environ.get("LLM_BACKEND", "ollama").lower()
    ollama_base_url: str = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b")
    ollama_temperature: float = _env_float("OLLAMA_TEMPERATURE", 0.15)
    ollama_top_p: float = _env_float("OLLAMA_TOP_P", 0.9)
    ollama_num_ctx: int = _env_int("OLLAMA_NUM_CTX", 4096)
    ollama_num_predict: int = _env_int("OLLAMA_NUM_PREDICT", 700)
    ollama_num_gpu: int = _env_int("OLLAMA_NUM_GPU", 0)
    ollama_timeout_seconds: int = _env_int("OLLAMA_TIMEOUT", 120)
    ollama_startup_timeout: int = _env_int("OLLAMA_STARTUP_TIMEOUT", 10)
    ollama_auto_start: bool = os.environ.get("OLLAMA_AUTO_START", "1") not in ("0", "false", "False")

    # Conversation
    max_history_messages: int = _env_int("CHAT_MAX_HISTORY", 8)
    max_question_chars: int = _env_int("CHAT_MAX_QUESTION_CHARS", 2000)


SETTINGS = RagSettings()
