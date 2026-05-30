"""Façade vers rag_project.chatbot.intent_router — pour compatibilité.

L'intent router vit désormais dans rag_project.chatbot.intent_router avec
embeddings + fallback lexical. Cet alias garde les anciens imports valides.
"""

from __future__ import annotations

from rag_project.chatbot.intent_router import classify, warm

__all__ = ["classify", "warm"]
