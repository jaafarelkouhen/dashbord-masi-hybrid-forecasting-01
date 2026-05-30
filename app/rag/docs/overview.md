# Dashboard MASI Hybrid Forecasting — vue d'ensemble

Ce dashboard est une couche API + UI au-dessus du projet `masi-hybrid-forecasting`.
Il ne ré-entraîne aucun modèle et ne recalcule aucune métrique : il consomme les
artefacts canoniques produits par la pipeline CLI (`masi-pipeline …`).

## Vocabulaire

- **MASI** : Moroccan All Shares Index, indice phare de la Bourse de Casablanca.
- **CNN-LSTM** : réseau hybride (convolution 1D + LSTM) qui prédit le log-rendement J+1.
- **HMM (Hidden Markov Model)** : segmente la série en régimes latents (Bear, Neutral, Bull).
- **HMM-gate** : stratégie production. Le signal CNN-LSTM est filtré par le régime HMM.
- **DSR (Deflated Sharpe Ratio)** : Sharpe ratio corrigé pour le data-snooping.
- **VaR (Value-at-Risk) 5%** : quantile 5% de la distribution prédite des rendements.
- **ES (Expected Shortfall) 5%** : moyenne conditionnelle des rendements au-delà du VaR.
- **EGARCH** : modèle de volatilité asymétrique utilisé pour la composante risque.

## Comment se lire la prédiction

- `predicted_return > 0` → position longue (+1) si le régime n'est pas Bear.
- `predicted_return ≤ 0` → position courte (-1) sauf si le régime est Bull (HMM-gate).
- `var_param_5` est toujours négatif : c'est une perte attendue, pas un gain.
- `es_param_5 ≤ var_param_5` par construction.

## Stratégies disponibles (étape 8)

| ID | Description |
|---|---|
| `1_buy_hold` | Buy & Hold, baseline |
| `2_cnn_lstm_nu` | Position = signe(predicted_return), pas de filtre régime |
| `3_hmm_gate` | **Production** : CNN-LSTM × filtre HMM |
| `4_var_budget` | Sizing par budget de VaR roulant |
| Autres | voir `outputs/etape8/strategies_metrics.json` |

## Mises en garde

Ce dashboard est un outil de **recherche et d'éducation**. Les chiffres affichés
ne constituent pas une recommandation d'investissement.
