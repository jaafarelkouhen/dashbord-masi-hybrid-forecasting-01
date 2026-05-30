# Glossaire — termes du dashboard

## Indices et marché

- **MASI** : Moroccan All Shares Index. Indice de capitalisation flottante de la
  Bourse de Casablanca. ~75 valeurs cotées.
- **Buy & Hold** : baseline passive qui détient l'indice tout au long de la
  fenêtre Test. Sert de référence pour évaluer les stratégies actives.

## Métriques de prévision

- **Rendement prédit (`predicted_return`)** : log-rendement attendu à J+1
  par le CNN-LSTM. Signe négatif = baisse attendue.
- **Rendement réalisé (`actual_return`)** : log-rendement effectivement
  observé à J+1, connu *après* la prédiction. Comparaison sur Test.
- **Directional Accuracy (DA)** : % de fois où `sign(predicted) == sign(actual)`.
  Cible : > 55% pour battre l'aléatoire après coût.
- **Position** : exposition au marché. +1 = long, -1 = short, 0 = neutre.
  Calculée à partir du signal et du filtre HMM.

## Risque

- **VaR 5% (Value-at-Risk)** : quantile 5% de la distribution prédite des
  rendements. « Il y a 5% de chance de perdre au moins ce montant en J+1 ».
  C'est un seuil conditionnel, **pas** une moyenne, **pas** une perte garantie,
  **pas** une perte maximale.
- **ES 5% (Expected Shortfall, aka CVaR)** : moyenne conditionnelle des
  rendements lorsque la perte dépasse la VaR. `|ES| ≥ |VaR|` par construction.
- **EGARCH** : modèle de volatilité conditionnelle qui capture l'effet de
  levier (asymétrie hausses/baisses).
- **σ_t (vol_garch)** : volatilité conditionnelle annualisée à la date t.
- **Risk score** : score composite sur 100, fonction de la VaR, ES et de la
  pression de switch de régime.

## Régimes HMM

- **HMM (Hidden Markov Model)** : modèle probabiliste qui infère un état
  latent à partir d'observations. Ici 3 états : Bear, Neutral, Bull.
- **Régime** : étiquette discrète attribuée à la date t (l'état Viterbi le plus
  probable).
- **Posterior** : probabilité `P(state_t | observations)` — distribution sur
  les 3 états plutôt que choix dur.
- **Streak** : nombre de jours consécutifs dans le même régime.
- **P(switch)** : probabilité de changer de régime à J+1, dérivée de la matrice
  de transition × posterior actuel.

⚠️ **Le régime HMM décrit la volatilité, pas la direction du marché.** Un état
Bear signifie « régime de volatilité élevée et rendements moyens négatifs sur
l'historique de cet état », pas « le MASI va certainement baisser demain ».

## Stratégies

- **HMM-gate** : stratégie production. Position = signe(predicted_return),
  forcée à 0 si régime Bear, autorisée à +1 si régime Bull.
- **CNN-LSTM nu** : Position = signe(predicted_return), sans filtre régime.
- **VaR budget** : sizing proportionnel à `target_var / VaR_predicted`,
  capé à 1.
- **Risk-targeting** : maintient la volatilité ex-ante à un budget constant
  (ex : 12%/an). Position scalée par `target_vol / σ_t`.

## Métriques de performance

- **Sharpe ratio** : `mean(returns) / std(returns) × sqrt(252)`. Mesure le
  rendement par unité de risque.
- **Sortino ratio** : Sharpe mais le dénominateur est la downside deviation,
  pas la volatilité totale.
- **Calmar ratio** : `annual_return / |max_drawdown|`.
- **Max Drawdown** : pire perte peak-to-trough sur la période.
- **Turnover** : `Σ |Δposition|`. Approxime les frais.
- **DSR (Deflated Sharpe Ratio)** : Sharpe corrigé du nombre d'essais
  (Bailey & López de Prado 2014). Évite le data-snooping.
- **PSR (Probabilistic Sharpe Ratio)** : probabilité que le vrai Sharpe soit
  > seuil.

## Validation statistique

- **Kupiec test (PoF)** : H₀ = taux de violations VaR = α nominal. Statistique
  LR_uc χ²(1).
- **Christoffersen test (Independence)** : H₀ = les violations sont
  indépendantes dans le temps. χ²(1).
- **p-value** : probabilité d'observer des données au moins aussi extrêmes
  sous H₀. Petite p-value → rejeter H₀.
- **Breach** : jour où le rendement réalisé est plus négatif que la VaR
  prédite. À 5%, on attend ~5% de breaches.

## Anti-leakage

- **Walk-forward** : entraînement glissant qui n'utilise jamais d'info future.
- **Causal feature** : feature en t calculée uniquement à partir d'observations
  ≤ t.
- **Sequence length** : nombre de jours dans la fenêtre glissante d'entrée
  CNN-LSTM (ici 20).
