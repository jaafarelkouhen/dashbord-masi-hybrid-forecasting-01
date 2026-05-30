# Dashboard playbook — comment lire les vues

## Vue « Live Forecast »

C'est la vue par défaut. Elle affiche la prédiction du jour, les KPIs cumulés
sur la fenêtre Test et la décomposition par régime.

### Bandeau de KPIs (6 tuiles)

1. **Rendement prédit** — `predicted_return` de la stratégie production (HMM-gate)
   à J+1. Couleur mint si positif, danger si négatif.
2. **VaR 5% (1D)** — Quantile 5% de la distribution prédite des log-rendements
   J+1. Toujours négatif. Cible historique ≈ -1.6%.
3. **ES 5% (1D)** — Moyenne conditionnelle au-delà de la VaR. Calcul 2-step
   ridge (régression robuste).
4. **Régime HMM** — État courant (Bear/Neutral/Bull) + streak (jours consécutifs)
   + pression de switch (low/medium/high).
5. **Risk score** — Score composite sur 100 (`risk_score`), agrège VaR/ES/switch.
6. **Equity finale** — Valeur du portefeuille simulé à la fin de la fenêtre Test
   (base 1.0). + `cumulative_return` et `directional_accuracy` cumulée.

### Graphes

- **Equity Curve × Regime Overlay** — Courbe d'équité de la stratégie HMM-gate
  vs Buy & Hold, avec rectangles colorés pour les régimes (Bull mint, Bear
  rouge, Neutral orange).
- **Regime Distribution** — Pie chart de la répartition des régimes sur Test.
- **HMM Regime · posterior** — Barres pour les posteriors actuels +
  jauges (Switch pressure, Model readiness) + durée moyenne par régime.

### Quoi regarder en priorité

- Si `predicted_return > 0` et régime ≠ Bear → signal long.
- Si `predicted_return < 0` → la VaR/ES devient le filtre principal.
- Si `P(switch) > 0.66` → le régime peut bientôt changer, prudence sur la
  position.

## Vue « Risk Layer »

Couche risque dédiée. Sources : `outputs/etape7/risk_metrics_test.csv` et
`risk_validation.json`.

### KPIs

- VaR 5% paramétrique (EGARCH) et historique (quantile empirique).
- ES 5% paramétrique et historique.
- Vol GARCH annualisée du jour.
- Nombre de breaches observés vs attendu (5% × N).

### Graphe VaR / ES / rendements réalisés

Superpose la bande VaR/ES et les rendements réalisés (points). Une violation
est un point sous la courbe VaR.

### Validation statistique

Tableau Kupiec + Christoffersen pour chaque variante (paramétrique, historique)
avec verdict OK / FAIL. Un verdict OK signifie que la p-value est au-dessus du
seuil (typiquement 5%), donc on **ne rejette pas** H₀ (modèle bien calibré).

⚠️ Attention au vocabulaire : « **niveau de violation attendu** » est le taux
théorique α (par exemple 5%), pas une p-value.

## Vue « Backtest »

Comparatif des 7 stratégies sur la fenêtre Test, triées par Sharpe.

### Tableau

Pour chaque stratégie : Sharpe, Sortino, Annualized return, Max DD, Final
equity, nombre de trades.

### Courbes d'équité

Toutes les stratégies superposées. La stratégie production (HMM-gate) est
généralement en haut, mais ce n'est pas garanti dans le futur.

### Notes sur le coût

Le tableau affiche le coût appliqué (par défaut 5 bps). Le bouton de modulation
recalcule à 0, 5, 10, 20 bps. À 20 bps, les stratégies à fort turnover
s'effondrent.

## Vue « AI Copilot »

C'est cette vue chat. L'assistant a accès à :

1. Le snapshot live (prévision, VaR, ES, régime, risk score) lorsque l'intent
   est forecast/risk/regime/strategy.
2. Le contexte RAG (chunks documentaires retrouvés) pour toutes les intents
   sauf `help_request` et `out_of_scope`.
3. Une mémoire de conversation compacte (4 derniers tours).

L'assistant **n'invente pas de chiffres**. S'il dit « cette information n'est
pas disponible dans le contexte actuel », c'est que la valeur n'est ni dans le
snapshot live ni dans les chunks retrouvés.

### Suggestions à essayer

- « Quel est le VaR du jour ? »
- « Explique la méthodologie anti-leakage »
- « Régime HMM actuel ? »
- « Meilleure stratégie par Sharpe ? »
- « Différence VaR et ES ? »
- « Comment marche le HMM-gate ? »
