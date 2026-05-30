"""Façade vers rag_project.rag.retriever — gardée pour compatibilité.

Toute la logique vit désormais dans rag_project/. Ce module ré-exporte les
symboles publics pour ne pas casser les vieux imports.
"""

from __future__ import annotations

from rag_project.rag.retriever import (
    RetrievedChunk,
    reset_cache,
    search,
    warm,
)

__all__ = ["RetrievedChunk", "reset_cache", "search", "warm"]
