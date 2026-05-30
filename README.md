# MASI Hybrid Forecasting — Dashboard

> Dashboard web (FastAPI + Next.js/React/Tailwind) + assistant RAG par-dessus le
> moteur de recherche `masi-hybrid-forecasting`. **Aucune duplication du
> pipeline** : le dashboard lit directement les artefacts canoniques produits par
> la CLI `python -m masi_hybrid_forecasting.pipeline`.

![Landing page](docs/screenshots/landing-hero.png)

---

## Table des matières

- [Aperçu](#aperçu)
- [Captures d'écran](#captures-décran)
- [Architecture](#architecture)
- [Pré-requis](#pré-requis)
- [Installation](#installation)
- [Lancement](#lancement)
- [Structure du projet](#structure-du-projet)
- [Endpoints API](#endpoints-api)
- [Configuration LLM](#configuration-llm)
- [Principes de design](#principes-de-design-frontend)
- [Tests rapides](#tests-rapides)
- [Licence](#licence)

---

## Aperçu

| Module | Description |
|---|---|
| **Forecast** | Prédiction J+1 (CNN-LSTM × HMM-gate), KPI live, courbe d'équité vs Buy & Hold, distribution & persistance des régimes, risk score 0-100. |
| **Risk** | Séries VaR / ES / vol GARCH, breaches observés vs attendus, tests Kupiec & Christoffersen. |
| **Backtest** | 7 stratégies comparées (Sharpe / Sortino / Drawdown / equity), courbes d'équité multi-stratégies. |
| **Assistant (RAG)** | Chatbot indexant `docs/`, `reports/` et `outputs/etape*/report.md`, intent routing, guardrails anti-hallucination, fallback déterministe (zéro appel réseau si pas de LLM configuré). |

---

## Captures d'écran

### Dashboard — Vue d'ensemble

Top du dashboard : KPI live, prédiction J+1 et statut des régimes HMM.

![Dashboard — top](docs/screenshots/dashboard-top.png)

### Dashboard — Vue complète

Vue intégrale (forecast, risk, backtest, persistance des régimes) sur une même page.

![Dashboard — full](docs/screenshots/dashboard-full.png)

### Forecast — Horizon J+1

Détail de la prédiction CNN-LSTM × HMM-gate et de la courbe d'équité comparée à
Buy & Hold.

![Dashboard — horizon](docs/screenshots/dashboard-horizon.png)

### AI Copilot — Assistant RAG

Chatbot avec intent routing, citations de sources et fallback déterministe.

![Dashboard — AI copilot](docs/screenshots/dashboard-ai-copilot.png)

---

## Architecture

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

Voir [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) pour la vision globale du
système (moteur + dashboard).

---

## Pré-requis

- **Python 3.10+**
- **Node.js 18+** (pour le frontend Next.js)
- Le projet `masi-hybrid-forecasting` cloné et son pipeline déjà exécuté au moins
  une fois pour produire les artefacts :
  - `outputs/etape6/etape6_final_predictions.csv`
  - `outputs/etape7/risk_metrics_test.csv`
  - `outputs/etape8/strategies_metrics.json`

---

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

### Construction de l'index RAG (1ère fois)

```powershell
python -m app.rag.build_index
# ou
python scripts/build_rag_index.py
```

---

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

- **Dashboard Next.js** : <http://127.0.0.1:3000/>
- **API docs (OpenAPI)** : <http://127.0.0.1:8000/docs>

---

## Structure du projet

```text
dashbord-masi-hybrid-forecasting-01/
├── app/                         # Backend FastAPI
│   ├── main.py                  # entrée FastAPI
│   ├── core/                    # config, paths
│   ├── api/routes/              # /api/forecast, /api/risk, /api/backtest,
│   │                            #   /api/predictions, /api/chat, /api/health
│   ├── services/                # data_loader (lecture artefacts MASI),
│   │                            #   forecast / backtest / risk / prediction
│   ├── rag/                     # build_index, retriever (Chroma + BM25 rerank),
│   │                            #   intent_router, docs
│   ├── chatbot/                 # service, fallback, guardrails, llm_client
│   │                            #   (OpenAI / Anthropic / Ollama)
│   └── schemas/                 # Pydantic
├── frontend/                    # Frontend Next.js
│   ├── app/                     # App Router Next.js
│   ├── src/                     # composants React, API client, formatters
│   ├── package.json             # scripts Next.js
│   └── index.html               # ancienne SPA statique conservée comme référence
├── rag_project/                 # Pipeline RAG autonome (engine complet)
├── scripts/                     # run_dev (ps1/sh), build_rag_index
├── docs/
│   └── screenshots/             # captures d'écran utilisées dans ce README
├── requirements.txt
├── pyproject.toml
├── INSTALL.md                   # guide d'installation détaillé
├── PROJECT_OVERVIEW.md          # vue système (moteur + dashboard)
└── .env.example
```

---

## Endpoints API

| Méthode | Route                                   | Description                              |
|---------|-----------------------------------------|------------------------------------------|
| GET     | `/api/health`                           | statut + presence artefacts              |
| GET     | `/api/forecast/latest`                  | prédiction J+1 + métriques live          |
| GET     | `/api/forecast/series?window=`          | série historique                         |
| GET     | `/api/forecast/kpis`                    | KPI agrégés                              |
| GET     | `/api/forecast/regimes`                 | distribution HMM                         |
| GET     | `/api/risk/series?window=`              | VaR / ES / vol par jour                  |
| GET     | `/api/risk/validation`                  | Kupiec / Christoffersen                  |
| GET     | `/api/risk/breaches`                    | comptage breaches                        |
| GET     | `/api/strategies`                       | toutes stratégies + métriques            |
| GET     | `/api/strategies/{id}`                  | détail d'une stratégie                   |
| GET     | `/api/backtest/equity`                  | courbes d'équité multi-stratégies        |
| GET     | `/api/backtest/summary`                 | résumé étape 6                           |
| GET     | `/api/predictions/snapshot`             | snapshot risk score + persistance régime |
| GET     | `/api/predictions/risk-score`           | série du risk score 0-100                |
| GET     | `/api/predictions/regime-persistence`   | persistance moyenne par régime           |
| POST    | `/api/chat`                             | chatbot RAG                              |

---

## Configuration LLM

Quatre backends supportés (variable `LLM_BACKEND`) :

| Backend     | Réseau ?       | Setup                                   |
|-------------|----------------|-----------------------------------------|
| `fallback`  | aucun          | défaut — réponses déterministes         |
| `openai`    | API OpenAI     | `OPENAI_API_KEY` + `OPENAI_MODEL`       |
| `anthropic` | API Anthropic  | `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` |
| `ollama`    | local Ollama   | `ollama serve` + `OLLAMA_MODEL`         |

Si l'appel LLM échoue, le chatbot retombe automatiquement sur le mode `fallback`.

---

## Principes de design (frontend)

Le frontend Next.js applique des principes de polish via des composants
React/Tailwind :

- shell "MASI control desk" avec navigation React, KPI typés et panels métier ;
- charts Plotly chargés côté client pour éviter le SSR sur `window` ;
- proxy Next `/api/:path*` vers FastAPI via `API_PROXY_TARGET` ;
- animations courtes, `active:scale`, transitions explicites et layout mobile
  vérifié.

---

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

---

## Licence

Ce dashboard est dérivé du travail de recherche `masi-hybrid-forecasting`. Voir
le projet parent pour les conditions d'utilisation.

> ⚠️ Projet de recherche sur un marché frontière. Rien ici n'est un conseil
> d'investissement. L'assistant est explicitement conçu pour **refuser les
> recommandations d'achat / vente**.
