# Méthodologie

## Pipeline de bout en bout

La pipeline est organisée en **10 étapes numérotées** (`outputs/etape0`
à `etape10`). Chaque étape produit ses artefacts canoniques consommés par les
étapes suivantes — pas de circular dependency.

| Étape | Rôle | Notebook | Artefacts |
|---|---|---|---|
| 0 | Audit / qualité brutes | — | `outputs/etape0/audit.json` |
| 1 | Preprocessing | `01_preprocessing.ipynb` | `data/processed/masi_clean.parquet` |
| 2 | Baselines | `02_baselines.ipynb` | `outputs/etape2/baselines.json` |
| 3 | Feature engineering | `03_feature_engineering.ipynb` | `data/processed/features.parquet` |
| 4 | HMM régimes | `04_hmm_regimes.ipynb` | `outputs/etape4/hmm_states.csv` |
| 5 | CNN-LSTM | `05_cnn_lstm.ipynb` | `outputs/etape5/cnn_lstm_predictions.csv` |
| 6 | Backtest | `06_backtesting.ipynb` | `outputs/etape6/etape6_final_predictions.csv`, `backtest_metrics.json`, `equity_curves.csv` |
| 7 | Couche risque | `07_risk_layer.ipynb` | `outputs/etape7/risk_metrics_test.csv`, `risk_validation.json` |
| 8 | Stratégies | `08_strategies.ipynb` | `outputs/etape8/strategies_metrics.json`, `strategies_returns.csv` |
| 9 | Robustesse | `09_robustness.ipynb` | rapports de stabilité |
| 10 | Synthèse | — | `reports/final_results.md` |

## Anti-leakage : règles non négociables

1. **Train / Validation / Test** est un split temporel strict (pas de
   shuffle). Le Test est la fenêtre la plus récente et n'est jamais touchée
   pendant le model selection.
2. Toute transformation paramétrique (scaler, HMM, statistiques de features,
   PCA) est `fit` exclusivement sur Train, puis `transform` causalement sur
   Val/Test.
3. Les fenêtres glissantes (sequence_length) sont alignées de sorte que la
   target en date t soit prédite à partir d'observations strictement
   antérieures à t.
4. Le HMM est ré-estimé en walk-forward expansive : chaque label de régime à
   date t n'utilise que l'historique [0, t).
5. Le cost-aware backtest applique les frais sur `|Δposition|` au close de t-1
   (slippage modélisé en bps).

21 tests anti-leakage en CI vérifient ces règles, dans `tests/test_anti_leakage.py`.

## CNN-LSTM : architecture

- Entrée : fenêtre `sequence_length=20` jours × `n_features ≈ 18`.
- Conv1D (32 filters, kernel 3) → BatchNorm → Dropout.
- BiLSTM (units=64) → Attention global → Dense(1).
- Loss : Huber (robuste aux outliers de rendement).
- Optimizer : Adam, lr=1e-3, schedule cosine.
- Early stopping sur Val Sharpe (pas sur RMSE — c'est le rendement
  risque-ajusté qui compte, pas l'erreur de prédiction brute).

## HMM 3-états

- Features : log-rendement et volatilité réalisée à 5j.
- Type : Gaussian HMM, full covariance.
- Labels post-hoc : les 3 états sont renommés Bear/Neutral/Bull par tri sur la
  moyenne de rendement de chaque état (l'état avec la moyenne la plus négative
  devient Bear).
- Posteriors : `gamma_t(k) = P(state_t = k | observations)` est exposé par
  l'API et servait à pondérer les stratégies HMM-gate.

## EGARCH(1,1) — couche risque

Modèle de volatilité asymétrique :

```
log(σ²_t) = ω + α·(|z_{t-1}| - E|z|) + γ·z_{t-1} + β·log(σ²_{t-1})
```

avec `z_{t-1}` le résidu standardisé. Le terme `γ` capture l'effet de levier
(les baisses augmentent plus la volatilité que les hausses symétriques).

La VaR paramétrique 5% s'écrit :

```
VaR_5% = μ_t + σ_t · Φ⁻¹(0.05)
```

L'ES paramétrique 5% sous l'hypothèse Gaussienne :

```
ES_5% = μ_t - σ_t · φ(Φ⁻¹(0.05)) / 0.05
```

Une variante non-paramétrique utilise les quantiles empiriques de la
distribution prédite (régression quantile à 5 et 1%).

## Validation statistique du risque (étape 7)

Deux tests historiques sur la fenêtre Test :

- **Kupiec (Proportion of Failures)** : H₀ = taux de breach observé = α. Stat
  LR_uc suit un χ²(1) sous H₀.
- **Christoffersen (Independence)** : H₀ = les breaches sont indépendants dans
  le temps (pas de cluster). LR_ind suit aussi un χ²(1).

`risk_validation.json` contient `kupiec` et `christoffersen` chacun pour les
variantes `parametric` et `historic`, avec p-value et verdict.
