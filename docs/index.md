# MASI Hybrid Forecasting — Dashboard

!!! info "En une phrase"
    Dashboard web **FastAPI + Next.js** + assistant **RAG local** par-dessus le
    moteur de recherche `masi-hybrid-forecasting`. **Aucune duplication du
    pipeline** : le dashboard lit directement les artefacts canoniques produits
    par la CLI `python -m masi_hybrid_forecasting.pipeline`.

![Landing page](screenshots/landing-hero.png){ .center }

---

## :material-rocket-launch: Démarrage rapide

<div class="grid cards" markdown>

-   :material-download:{ .lg .middle } **Installation**

    ---

    Guide pas-à-pas : Python, Node, Ollama, artefacts MASI, index RAG.

    [:octicons-arrow-right-24: Suivre le guide](installation.md)

-   :material-robot:{ .lg .middle } **Assistant RAG**

    ---

    Pipeline complet : 8 intents, Chroma + BM25, guardrails anti-hallucination.

    [:octicons-arrow-right-24: Plonger dedans](rag.md)

-   :material-sitemap:{ .lg .middle } **Architecture**

    ---

    Engine vs dashboard, flux des artefacts, composants frontend / backend.

    [:octicons-arrow-right-24: Comprendre](architecture.md)

-   :material-api:{ .lg .middle } **Endpoints API**

    ---

    Tous les endpoints FastAPI documentés (`/api/forecast`, `/api/chat`, …).

    [:octicons-arrow-right-24: Voir la liste](api.md)

</div>

---

## :material-view-dashboard: Les quatre modules

| Module | Description |
|---|---|
| **Forecast** | Prédiction J+1 (CNN-LSTM × HMM-gate), KPI live, courbe d'équité vs Buy & Hold, distribution & persistance des régimes, risk score 0-100. |
| **Risk** | Séries VaR / ES / vol GARCH, breaches observés vs attendus, tests Kupiec & Christoffersen. |
| **Backtest** | 7 stratégies comparées (Sharpe / Sortino / Drawdown / equity), courbes d'équité multi-stratégies. |
| **Assistant (RAG)** | Chatbot indexant `docs/`, `reports/` et `outputs/etape*/report.md`, intent routing, guardrails anti-hallucination, fallback déterministe (zéro appel réseau si pas de LLM configuré). |

---

## :material-image-multiple: Aperçu visuel

=== "Dashboard"

    ![Dashboard — top](screenshots/dashboard-top.png)

=== "Vue complète"

    ![Dashboard — full](screenshots/dashboard-full.png)

=== "Forecast J+1"

    ![Dashboard — horizon](screenshots/dashboard-horizon.png)

=== "AI Copilot"

    ![Dashboard — AI copilot](screenshots/dashboard-ai-copilot.png)

[:material-image-multiple: Voir toutes les captures](screenshots.md){ .md-button }

---

## :material-shield-check: Principes

!!! warning "Projet de recherche"
    Travail de recherche sur un **marché frontière (MASI)**. Rien dans ce
    dashboard n'est un conseil d'investissement. L'assistant RAG est
    explicitement configuré pour **refuser les recommandations
    d'achat/vente** — cf. [guardrails](rag.md#guardrails).

- **Pas de duplication** : un seul pipeline source de vérité, le dashboard est en lecture seule.
- **LLM local par défaut** : Ollama tourne sur votre machine, zéro appel réseau si pas configuré autrement.
- **Sources citées** : chaque réponse de l'assistant cite les chunks utilisés (notebook, doc curated, ou markdown).
- **Fallback déterministe** : si Ollama est éteint, le chatbot répond via des templates plutôt que de halluciner.
