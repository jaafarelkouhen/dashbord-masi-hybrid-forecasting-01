# FAQ

## Comment relancer le pipeline MASI ?

Depuis le dossier `masi-hybrid-forecasting/` :

```powershell
python -m masi_hybrid_forecasting.pipeline predict
python -m masi_hybrid_forecasting.pipeline risk
python -m masi_hybrid_forecasting.pipeline backtest --strategy hmm_gate --cost-bps 5
python -m masi_hybrid_forecasting.pipeline export --strategy hmm_gate
```

Le dashboard détecte automatiquement les fichiers mis à jour (cache invalidé par mtime).

## Quelles sources sont indexées par le RAG ?

Le retriever indexe en local :

1. `masi-hybrid-forecasting/docs/*.md` (méthodologie, anti-leakage, references).
2. `masi-hybrid-forecasting/reports/*.md` (final_results, executive summary).
3. `masi-hybrid-forecasting/outputs/etape*/report.md` (un rapport par étape 0→10).
4. `dashbord-masi-hybrid-forecasting-01/app/rag/docs/*.md` (ce dossier).

Pour reconstruire l'index :

```powershell
python -m app.rag.build_index
```

## Différence VaR vs ES ?

- **VaR 5%** : « il y a 5% de chance de perdre au moins ce montant en une journée ».
  C'est un quantile, pas une moyenne.
- **ES 5%** (Expected Shortfall, aka CVaR) : « *quand* on dépasse le VaR, la
  perte moyenne attendue ». C'est une moyenne conditionnelle.

Par construction, |ES 5%| ≥ |VaR 5%|.

## Le modèle a-t-il du data-leakage ?

Non. Toute transformation (scaler, HMM, statistiques features) est fittée
exclusivement sur la fenêtre TRAIN et appliquée causalement. Voir
`docs/anti_leakage.md` côté projet MASI. Le test suite inclut 21 tests
anti-leakage qui passent en CI.

## Pourquoi le Sharpe varie-t-il selon le coût en bps ?

Le coût est appliqué proportionnellement au turnover `|Δposition|`. Une stratégie
qui flippe fréquemment (CNN-LSTM nu) est plus sensible au coût que HMM-gate qui
ne flippe que lors des transitions de régime. À 20 bps, certaines stratégies
deviennent unprofitable.
