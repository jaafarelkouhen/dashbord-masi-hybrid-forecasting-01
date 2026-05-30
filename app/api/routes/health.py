"""Endpoint /health pour les checks de readiness du frontend."""

from __future__ import annotations

import logging

from fastapi import APIRouter

from app.core import paths
from app.core.config import settings

log = logging.getLogger(__name__)
router = APIRouter(tags=["meta"])


def _ollama_status() -> dict:
    """Probe rapide d'Ollama (≤ 1s) — non-bloquante."""
    if settings.llm_backend.lower() != "ollama":
        return {
            "configured": False,
            "reachable": False,
            "model": settings.ollama_model,
            "available_models": [],
        }
    try:
        from rag_project.llm.ollama_client import is_available, list_models
        reachable = is_available(timeout=1.0)
        models = list_models() if reachable else []
        model_ok = settings.ollama_model in models if reachable else False
        return {
            "configured": True,
            "reachable": reachable,
            "model": settings.ollama_model,
            "model_installed": model_ok,
            "available_models": models,
        }
    except Exception as exc:
        log.warning("Ollama probe failed: %r", exc)
        return {
            "configured": True,
            "reachable": False,
            "model": settings.ollama_model,
            "model_installed": False,
            "available_models": [],
        }


@router.get("/api/health")
def health() -> dict:
    artefacts = {
        "predictions_csv": paths.predictions_csv().exists(),
        "risk_metrics_csv": paths.risk_metrics_csv().exists(),
        "strategies_metrics_json": paths.strategies_metrics_json().exists(),
        "backtest_metrics_json": paths.backtest_metrics_json().exists(),
        "equity_curves_csv": paths.equity_curves_csv().exists(),
    }
    ollama = _ollama_status()
    return {
        "status": "ok" if all(artefacts.values()) else "partial",
        "version": "0.1.0",
        "fastapi": {
            "reachable": True,  # si on répond, c'est qu'on est up
            "host": settings.api_host,
            "port": settings.api_port,
        },
        "llm_backend": settings.llm_backend,
        "ollama": ollama,
        "masi_root": str(paths.masi_root()),
        "artefacts": artefacts,
    }
