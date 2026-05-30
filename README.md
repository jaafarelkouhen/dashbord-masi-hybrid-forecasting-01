# MASI Hybrid Forecasting — Dashboard

Dashboard web (FastAPI + frontend Next.js/React/Tailwind) + assistant RAG par-dessus le projet
`masi-hybrid-forecasting`. Aucune duplication du pipeline : le dashboard lit
directement les artefacts canoniques produits par la CLI
`python -m masi_hybrid_forecasting.pipeline`.

## Aperçu

- **Forecast** : prédiction J+1 (CNN-LSTM × HMM-gate), KPI live, courbe d'équité vs Buy & Hold, distribution & persistance des régimes, risk score 0-100.
- **Risk** : séries VaR / ES / vol GARCH, breaches observés vs attendus, tests Kupiec & Christoffersen.
- **Backtest** : 7 stratégies comparées (Sharpe / Sortino / Drawdown / equity), courbes d'équité multi-stratégies.
- **Assistant (RAG)** : chatbot indexant `docs/`, `reports/` et `outputs/etape*/report.md`, intent routing, guardrails anti-hallucination, fallback déterministe (zéro appel réseau si pas de LLM configuré).

## Pré-requis

- Python 3.10+
- Le projet `masi-hybrid-forecasting` cloné et son pipeline déjà exécuté au moins
  une fois pour produire les artefacts (`outputs/etape6/etape6_final_predictions.csv`,
  `outputs/etape7/risk_metrics_test.csv`, `outputs/etape8/strategies_metrics.json`, …).

## Installation

```powershell
# Depuis la racine de ce dossier
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -U pip
pip install -r requirements.txt

# Copie le template d'environnement et ajuste MASI_PROJECT_ROOT
cp .env.example .env
# Ouvre .env et ajuste les chemins si besoin
```

## Construction de l'index RAG (1ère fois)

```powershell
python -m app.rag.build_index
# ou
python scripts/build_rag_index.py
```

## Lancement

```powershell
# Terminal 1 : API FastAPI
.\scripts\run_dev.ps1
# ou directement :
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 : UI Next.js
cd frontend
npm install
npm run dev
```

Puis ouvre :

- Dashboard Next.js : http://127.0.0.1:3000/
- API docs (OpenAPI) : http://127.0.0.1:8000/docs

## Structure

```
dashbord-masi-hybrid-forecasting-01/
├── app/
│   ├── main.py                # FastAPI app
│   ├── core/                  # config, paths
│   ├── api/routes/            # /api/forecast, /api/risk, /api/backtest, /api/predictions, /api/chat, /api/health
│   ├── services/              # data_loader (lecture artefacts MASI), forecast/backtest/risk/prediction
│   ├── rag/                   # build_index, retriever (Chroma + BM25 rerank), intent_router, docs
│   ├── chatbot/               # service, fallback, guardrails, llm_client (OpenAI/Anthropic/Ollama)
│   └── schemas/               # Pydantic
├── frontend/
│   ├── app/                   # App Router Next.js
│   ├── src/                   # composants React, API client, formatters
│   ├── package.json           # scripts Next.js
│   └── index.html             # ancienne SPA statique conservée comme référence
├── scripts/                   # run_dev (ps1/sh), build_rag_index
├── requirements.txt
├── pyproject.toml
└── .env.example
```

## Configuration LLM

Trois backends supportés (variable `LLM_BACKEND`) :

| Backend     | Réseau ?       | Setup                              |
|-------------|----------------|------------------------------------|
| `fallback`  | aucun          | défaut — réponses déterministes    |
| `openai`    | API OpenAI     | `OPENAI_API_KEY` + `OPENAI_MODEL`  |
| `anthropic` | API Anthropic  | `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` |
| `ollama`    | local Ollama   | `ollama serve` + `OLLAMA_MODEL`    |

Si l'appel LLM échoue, le chatbot retombe automatiquement sur le mode `fallback`.

## Principes de design (frontend)

Le frontend Next.js applique les mêmes principes de polish, mais sous forme de
composants React/Tailwind :

- shell "MASI control desk" avec navigation React, KPI typés et panels métier ;
- charts Plotly chargés côté client pour éviter le SSR sur `window` ;
- proxy Next `/api/:path*` vers FastAPI via `API_PROXY_TARGET` ;
- animations courtes, `active:scale`, transitions explicites et layout mobile vérifié.

## Endpoints API

| Méthode | Route                            | Description                                   |
|---------|----------------------------------|-----------------------------------------------|
| GET     | `/api/health`                    | statut + presence artefacts                   |
| GET     | `/api/forecast/latest`           | prédiction J+1 + métriques live               |
| GET     | `/api/forecast/series?window=`   | série historique                              |
| GET     | `/api/forecast/kpis`             | KPI agrégés                                   |
| GET     | `/api/forecast/regimes`          | distribution HMM                              |
| GET     | `/api/risk/series?window=`       | VaR / ES / vol par jour                       |
| GET     | `/api/risk/validation`           | Kupiec / Christoffersen                       |
| GET     | `/api/risk/breaches`             | comptage breaches                             |
| GET     | `/api/strategies`                | toutes stratégies + métriques                 |
| GET     | `/api/strategies/{id}`           | détail d'une stratégie                        |
| GET     | `/api/backtest/equity`           | courbes d'équité multi-stratégies             |
| GET     | `/api/backtest/summary`          | résumé étape 6                                |
| GET     | `/api/predictions/snapshot`      | snapshot risk score + persistance régime      |
| GET     | `/api/predictions/risk-score`    | série du risk score 0-100                     |
| GET     | `/api/predictions/regime-persistence` | persistance moyenne par régime           |
| POST    | `/api/chat`                      | chatbot RAG                                   |

## Tests rapides

```powershell
# 1. Vérifier que les artefacts MASI sont là
curl http://127.0.0.1:8000/api/health

# 2. Récupérer la dernière prédiction
curl http://127.0.0.1:8000/api/forecast/latest

# 3. Tester le chat
curl -X POST http://127.0.0.1:8000/api/chat `
  -H "Content-Type: application/json" `
  -d '{"message":"quel est le VaR du jour ?"}'
```

## Licence

Ce dashboard est dérivé du travail de recherche `masi-hybrid-forecasting`. Voir le
projet parent pour les conditions d'utilisation.
