"""Point d'entrée FastAPI : monte les routes + sert le frontend statique."""

from __future__ import annotations

import logging
import threading
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.api.routes import backtest, chat, forecast, health, horizon, predictions, risk
from app.core.config import settings


log = logging.getLogger(__name__)

FRONTEND_PATH = Path(__file__).resolve().parent.parent / "frontend"


def create_app() -> FastAPI:
    app = FastAPI(
        title="MASI Hybrid Forecasting Dashboard API",
        description=(
            "API et frontend pour le projet masi-hybrid-forecasting "
            "(HMM + CNN-LSTM, anti-leakage walk-forward)."
        ),
        version=__version__,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    # API routes
    app.include_router(health.router)
    app.include_router(forecast.router)
    app.include_router(risk.router)
    app.include_router(backtest.router)
    app.include_router(predictions.router)
    app.include_router(horizon.router)
    app.include_router(chat.router)

    # Frontend statique
    if FRONTEND_PATH.exists():
        app.mount(
            "/assets",
            StaticFiles(directory=FRONTEND_PATH / "assets"),
            name="assets",
        )

        @app.get("/", include_in_schema=False)
        def index() -> FileResponse:
            return FileResponse(FRONTEND_PATH / "index.html")

    @app.on_event("startup")
    def warm_rag() -> None:
        # Pré-chargement non-bloquant : embeddings RAG + intent centroids + Ollama
        def _warm():
            try:
                from rag_project.chatbot.service import warm
                warm()
                log.info("RAG copilot préchargé (retriever + intent + Ollama).")
            except Exception as exc:
                log.warning("Échec préchargement RAG : %s", exc)

        threading.Thread(target=_warm, daemon=True).start()

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.api_host, port=settings.api_port, reload=True)
