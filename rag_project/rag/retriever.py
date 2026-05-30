"""Retriever hybride : Chroma (cosine) + reranking BM25.

Fallback : si Chroma n'est pas chargeable, retourne une liste vide. Le caller
décide quoi faire (typiquement fallback déterministe).

Cache lazy : la collection et le modèle d'embeddings sont chargés au premier
appel, puis réutilisés.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from functools import lru_cache

from rag_project.core.config import SETTINGS

log = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    text: str
    source: str
    title: str
    section: str
    kind: str
    score: float


@lru_cache(maxsize=1)
def _get_collection():
    """Charge (paresseusement) la collection Chroma + embedding function."""
    try:
        import chromadb
        from chromadb.config import Settings as ChromaSettings
        from chromadb.utils.embedding_functions import (
            SentenceTransformerEmbeddingFunction,
        )

        chroma_dir = SETTINGS.chroma_dir.resolve()
        if not chroma_dir.exists():
            log.warning(
                "Index Chroma absent (%s). Lance `python -m rag_project.scripts.build_index`.",
                chroma_dir,
            )
            return None

        client = chromadb.PersistentClient(
            path=str(chroma_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        emb = SentenceTransformerEmbeddingFunction(
            model_name=SETTINGS.embedding_model,
            device=SETTINGS.embedding_device,
        )
        return client.get_collection(name=SETTINGS.collection_name, embedding_function=emb)
    except Exception as exc:
        log.warning("Chroma indisponible : %s", exc)
        return None


def _tokenize(text: str) -> list[str]:
    return [t for t in re.split(r"\W+", text.lower()) if t]


def _bm25_rerank(query: str, candidates: list[RetrievedChunk]) -> list[RetrievedChunk]:
    """Reranking BM25 sur les candidats vectoriels (score combiné)."""
    if not candidates:
        return candidates
    try:
        from rank_bm25 import BM25Okapi
    except ImportError:
        log.debug("rank_bm25 absent — skip BM25 rerank.")
        return candidates

    tokenized = [_tokenize(c.text) for c in candidates]
    bm25 = BM25Okapi(tokenized)
    bm_scores = bm25.get_scores(_tokenize(query))
    max_bm = max(bm_scores) if len(bm_scores) else 1.0
    if max_bm <= 0:
        max_bm = 1.0
    bm_w = float(SETTINGS.bm25_weight)
    vec_w = 1.0 - bm_w
    for c, s in zip(candidates, bm_scores):
        c.score = vec_w * c.score + bm_w * (float(s) / max_bm)
    candidates.sort(key=lambda x: x.score, reverse=True)
    return candidates


def search(
    query: str,
    k: int | None = None,
    filters: dict | None = None,
) -> list[RetrievedChunk]:
    """Retourne les k chunks les plus pertinents."""
    k = k or SETTINGS.top_k
    col = _get_collection()
    if col is None:
        return []

    where = filters or None
    try:
        res = col.query(query_texts=[query], n_results=max(k * 2, 8), where=where)
    except Exception as exc:
        log.warning("Query Chroma échouée : %s", exc)
        return []

    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    dists = res.get("distances", [[]])[0]

    chunks: list[RetrievedChunk] = []
    for doc, meta, dist in zip(docs, metas, dists):
        score = 1.0 - float(dist)  # cosine similarity (Chroma rend la distance)
        chunks.append(
            RetrievedChunk(
                text=doc,
                source=str(meta.get("source", "")),
                title=str(meta.get("title", "")),
                section=str(meta.get("section", "")),
                kind=str(meta.get("kind", "markdown")),
                score=score,
            )
        )

    return _bm25_rerank(query, chunks)[:k]


def warm() -> None:
    """Pré-charge la collection (à appeler au démarrage de l'API)."""
    _get_collection()


def reset_cache() -> None:
    """Vide le cache de la collection (utile en dev après rebuild de l'index)."""
    _get_collection.cache_clear()
