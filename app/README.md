# `app/` — FastAPI backend

The backend serves the dashboard's data and chat endpoints. It **reads the
canonical artifacts** produced by the `masi-hybrid-forecasting` engine
(`MASI_PROJECT_ROOT`, default `../masi-hybrid-forecasting`) and exposes them as a
REST API. It never re-runs the models.

```
app/
├── main.py          # FastAPI app factory, CORS, router wiring
├── core/            # config (env-driven) + canonical path resolution
├── api/routes/      # HTTP endpoints
├── services/        # business logic: load artifacts, shape responses
├── schemas/         # Pydantic request/response models
├── rag/             # lightweight RAG helpers (build_index, retriever, intent_router)
└── chatbot/         # chat orchestration (thin façade → rag_project)
```

## Endpoints (`api/routes/`)

| Route | Serves |
|---|---|
| `health.py` | liveness / readiness check |
| `forecast.py` | next-day forecast + KPIs |
| `predictions.py` | model TEST predictions series |
| `risk.py` | VaR / ES / GARCH vol / risk regime |
| `backtest.py` | strategy comparison + equity curves |
| `horizon.py` | multi-horizon view |
| `chat.py` | RAG assistant endpoint |

## Services (`services/`)

`data_loader.py` reads the engine's CSV/JSON; `forecast_service.py`,
`risk_service.py`, `backtest_service.py`, `prediction_service.py` and
`horizon_service.py` transform those artifacts into the API responses.

## A note on the two RAG implementations

There are two layers and they are intentionally related:

- **`app/rag` + `app/chatbot`** — the original, lightweight in-app chat path.
- **`rag_project/`** (repo root) — the full, self-contained RAG engine (intent
  routing, BM25 rerank, guardrails, fallback, Ollama client).

`app/chatbot/service.py` is a **thin façade** that forwards to
`rag_project.chatbot.service.answer()`. For assistant internals, read
[`../rag_project/README.md`](../rag_project/README.md).

## Run

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Requires `.env` (copy from `.env.example`) and that the engine's artifacts exist.
