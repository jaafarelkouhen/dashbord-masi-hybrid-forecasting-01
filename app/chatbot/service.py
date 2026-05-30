"""Façade dashboard → rag_project.chatbot.service.

Construit le snapshot live (forecast + prédiction) puis délègue tout le
pipeline (intent, RAG, policy, prompt, LLM, repair, guardrails) au
`rag_project`. Convertit les types vers les schemas Pydantic exposés par
/api/chat.
"""

from __future__ import annotations

import logging
from typing import Any

from app.schemas.chat import ChatRequest, ChatResponse, ChatSource
from app.services import forecast_service, prediction_service
from rag_project.chatbot import service as rag_service

log = logging.getLogger(__name__)


_LIVE_INTENTS = {"forecast", "risk", "regime", "strategy", "forecast_query",
                 "risk_query", "regime_query", "strategy_query", "help_request"}


def _build_live_snapshot() -> dict[str, Any] | None:
    """Construit le snapshot live — tolérant aux services dashboard cassés."""
    latest: dict[str, Any] = {}
    snap: dict[str, Any] = {}
    try:
        latest = forecast_service.latest_forecast()
    except (FileNotFoundError, KeyError, ValueError) as exc:
        log.warning("latest_forecast() indispo : %r", exc)
    except Exception as exc:
        log.warning("latest_forecast() erreur inattendue : %r", exc)

    try:
        snap = prediction_service.next_day_risk_snapshot()
    except (FileNotFoundError, KeyError, ValueError) as exc:
        log.warning("next_day_risk_snapshot() indispo : %r", exc)
    except Exception as exc:
        log.warning("next_day_risk_snapshot() erreur inattendue : %r", exc)

    if not latest and not snap:
        return None

    merged: dict[str, Any] = {**latest, **snap}
    merged.setdefault("risk_score", snap.get("risk_score"))
    merged.setdefault("streak_days", snap.get("streak_days"))
    merged.setdefault("p_regime_switch_next", snap.get("p_regime_switch_next", 0))
    return merged


def chat(req: ChatRequest) -> ChatResponse:
    """Endpoint principal : délègue au rag_project et convertit les types."""
    live_snapshot = _build_live_snapshot()

    rag_req = rag_service.ChatRequest(
        message=req.message,
        history=[m.model_dump() for m in req.history],
        filters=req.filters,
    )

    result = rag_service.answer(rag_req, live_snapshot=live_snapshot)

    sources = [
        ChatSource(
            title=s.title,
            section=s.section,
            snippet=s.snippet,
            score=s.score,
            source=s.source,
            kind=s.kind,
        )
        for s in result.sources
    ]

    return ChatResponse(
        answer=result.answer,
        sources=sources,
        backend=result.backend,
        intent=result.intent,
        used_rag=result.used_rag,
        used_live=result.used_live,
    )


def warm() -> None:
    """À appeler au démarrage de l'API."""
    rag_service.warm()
