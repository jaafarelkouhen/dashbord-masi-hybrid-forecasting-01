# MASI Hybrid Forecasting — Vue d'ensemble

## Qu'est-ce que c'est

Ce projet produit des prévisions probabilistes du **MASI** (Moroccan All Shares
Index, indice phare de la Bourse de Casablanca) à un horizon J+1, accompagnées
d'une couche de risque (VaR, ES) et de plusieurs stratégies de trading
backtestées. Le dashboard est une couche API + UI au-dessus du projet
`masi-hybrid-forecasting` ; il ne ré-entraîne aucun modèle et ne recalcule
aucune métrique, il consomme les artefacts canoniques produits par la pipeline
CLI (`masi-pipeline …`).

## Stack hybride

Trois modèles coopèrent :

1. **CNN-LSTM** — réseau hybride (convolution 1D + LSTM bidirectionnel) qui
   prédit le log-rendement J+1 à partir d'une fenêtre glissante de features.
2. **HMM (Hidden Markov Model) 3-états** — segmente la série en régimes latents
   (Bear / Neutral / Bull) à partir de la volatilité et du momentum.
3. **EGARCH(1,1)** — modèle de volatilité asymétrique pour la couche risque,
   alimente le calcul VaR/ES paramétrique.

Le signal de production combine les trois : la prédiction CNN-LSTM est filtrée
par le régime HMM (« HMM-gate »), et la couche EGARCH calibre la VaR/ES.

## Fichiers indexés par le RAG

Le retriever indexe en local :

1. `masi-hybrid-forecasting/docs/*.md` (méthodologie, anti-leakage, references).
2. `masi-hybrid-forecasting/reports/*.md` (final_results, executive summary).
3. `masi-hybrid-forecasting/outputs/etape*/report.md` (un rapport par étape 0→10).
4. `masi-hybrid-forecasting/notebooks/*.ipynb` (9 notebooks de recherche,
   parsés en cellules markdown + code).
5. `rag_project/docs/*.md` (ce dossier, docs curated pour le chatbot).

## Endpoints API

Le backend FastAPI expose les routes suivantes sous `/api/` :

- `/api/forecast/latest`, `/api/forecast/kpis`, `/api/forecast/series`,
  `/api/forecast/regimes` — prévision et KPIs production.
- `/api/risk/series`, `/api/risk/breaches`, `/api/risk/validation` — couche
  VaR/ES + tests Kupiec/Christoffersen.
- `/api/backtest/strategies`, `/api/backtest/equity_curves` — comparatif des
  stratégies.
- `/api/predictions/next_day`, `/api/predictions/snapshot` — snapshot du jour.
- `/api/chat` — assistant RAG (ce module).
- `/api/health` — état du backend et du LLM.

## Mises en garde

Ce dashboard est un outil de **recherche et d'éducation**. Les chiffres
affichés ne constituent pas une recommandation d'investissement. L'assistant ne
peut pas donner de conseil d'achat/vente.
