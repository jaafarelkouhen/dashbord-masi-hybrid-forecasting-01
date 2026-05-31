# Architecture

## Vue d'ensemble : engine + dashboard

Le dashboard est **strictement en lecture seule** par rapport au moteur de
recherche `masi-hybrid-forecasting`. Tous les modèles (HMM, CNN-LSTM, GARCH)
sont entraînés en amont par la CLI du moteur, qui exporte des artefacts
canoniques (CSV/JSON) consommés directement par l'API FastAPI.

```text
┌───────────────────────────────┐         ┌─────────────────────────────┐
│  masi-hybrid-forecasting      │         │  dashbord-masi-hybrid-...   │
│  (moteur de recherche)        │         │  (ce dépôt)                 │
│                               │         │                             │
│  Pipeline CLI                 │ ─CSV/   │  FastAPI  ─►  Next.js UI    │
│  (HMM + CNN-LSTM + backtest)  │   JSON─►│     │                       │
│                               │         │     └──►  RAG assistant     │
│  → outputs/etape*/            │         │           (Chroma + BM25)   │
│  → reports/                   │         │                             │
└───────────────────────────────┘         └─────────────────────────────┘
        artefacts canoniques                  lecture seule des artefacts
```

---

## :material-cube-outline: Composants backend (FastAPI)

| Couche | Module | Rôle |
|---|---|---|
| **Entrée** | [`app/main.py`](https://github.com/jaafarelkouhen/masi-hybrid-forecasting/blob/main/app/main.py) | FastAPI app, montage des routes, CORS, warmup RAG |
| **Config** | `app/core/` | settings Pydantic + résolution des chemins canoniques |
| **API** | `app/api/routes/` | `/api/forecast`, `/api/risk`, `/api/backtest`, `/api/predictions`, `/api/chat`, `/api/health` |
| **Services** | `app/services/` | `data_loader` (lit les artefacts MASI), `forecast`, `backtest`, `risk`, `prediction` |
| **RAG** | `app/rag/` | façades vers `rag_project/` : `build_index`, `retriever` (Chroma + BM25), `intent_router` |
| **Chatbot** | `app/chatbot/` | service, fallback, guardrails, `llm_client` (OpenAI / Anthropic / Ollama) |
| **Schemas** | `app/schemas/` | modèles Pydantic exposés sur l'API |

---

## :material-react: Composants frontend (Next.js)

| Élément | Détail |
|---|---|
| **Framework** | Next.js 14 (App Router) + React 18 + Tailwind |
| **Charts** | Plotly chargé côté client (évite le SSR sur `window`) |
| **Proxy API** | `frontend/next.config.js` rewrite `/api/:path*` → `API_PROXY_TARGET` |
| **Composants clés** | `components/chat-view.tsx` (assistant RAG), `components/forecast/*`, `components/risk/*`, `components/backtest/*` |
| **Design** | shell « MASI control desk », KPI typés, animations courtes, layout mobile testé |

---

## :material-file-tree: Structure du dépôt

```text
dashbord-masi-hybrid-forecasting-01/
├── app/                         # Backend FastAPI
│   ├── main.py
│   ├── core/                    # config, paths
│   ├── api/routes/              # endpoints
│   ├── services/                # data_loader, forecast, risk, backtest
│   ├── rag/                     # façades vers rag_project
│   ├── chatbot/                 # service, fallback, guardrails
│   └── schemas/                 # Pydantic
├── frontend/                    # Next.js
│   ├── app/                     # App Router
│   ├── src/                     # composants React, API client
│   └── package.json
├── rag_project/                 # Pipeline RAG autonome (moteur complet)
│   ├── core/
│   ├── rag/                     # retriever, build_index, notebook_parser
│   ├── llm/                     # ollama_client
│   ├── chatbot/                 # intent_router, policy, guardrails
│   └── docs/                    # 8 docs curated indexés en priorité
├── scripts/                     # run_dev (ps1/sh), build_rag_index
├── docs/                        # cette documentation
├── requirements.txt
├── pyproject.toml
├── INSTALL.md
├── PROJECT_OVERVIEW.md
└── .env.example
```

---

## :material-database-arrow-right: Flux des artefacts

Le moteur produit, le dashboard consomme :

| Artefact | Producteur (CLI) | Consommateur (API) |
|---|---|---|
| `outputs/etape6/etape6_final_predictions.csv` | `pipeline predict` | `/api/forecast/*`, `/api/predictions/*` |
| `outputs/etape7/risk_metrics_test.csv` | `pipeline risk` | `/api/risk/*` |
| `outputs/etape8/strategies_metrics.json` | `pipeline backtest` | `/api/backtest/*`, `/api/strategies` |
| `outputs/etape*/report.md` | tout le pipeline | RAG (indexation) |
| `reports/*.md`, `docs/*.md` | recherche manuelle | RAG (indexation) |
| `notebooks/*.ipynb` (9 notebooks) | recherche manuelle | RAG (indexation) |

!!! tip "Mise à jour"
    Quand l'engine produit de nouveaux artefacts (nouveau jour, nouveau
    backtest), il suffit de redémarrer l'API — pas besoin de rebuild quoi que
    ce soit. Pour la doc en revanche, il faut relancer
    `python -m rag_project.scripts.build_index`.

---

## :material-source-branch: Séparation des responsabilités

| Couche | Responsabilité | Anti-pattern à éviter |
|---|---|---|
| **Engine** | entraîne, valide, exporte | jamais d'API HTTP, jamais d'UI |
| **Dashboard backend** | lit les CSV/JSON, expose REST | jamais de ré-entraînement, jamais de calcul stat lourd |
| **Frontend** | présente, anime, route | jamais de calcul métier (tout vient de l'API) |
| **RAG** | indexe la doc + notebooks | jamais d'invention de chiffres — voir [guardrails](rag.md#guardrails) |
