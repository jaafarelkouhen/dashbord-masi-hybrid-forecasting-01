# Questions fréquentes — réponses canoniques

Ce document liste les questions usuelles avec la réponse attendue. Sert de
référence pour le chatbot et garantit la cohérence entre tours de conversation.

## Q : Quelle est la prévision du jour ?

R : Le rendement prédit J+1 pour la stratégie production (HMM-gate) est X%. La
VaR 5% est Y%, l'ES 5% est Z%, le régime HMM courant est R. Ces valeurs viennent
du snapshot live (route `/api/predictions/snapshot`).

## Q : C'est quoi la différence entre VaR et ES ?

R : La **VaR 5%** est un quantile : « il y a 5% de chance de perdre au moins ce
montant en J+1 ». C'est un seuil conditionnel. L'**ES 5%** (Expected Shortfall,
ou CVaR) est la moyenne des pertes lorsqu'on est dans cette queue 5%. Par
construction, `|ES 5%| ≥ |VaR 5%|`. La VaR dit *où* commence la queue, l'ES dit
*combien* on perd en moyenne dans cette queue.

## Q : Le modèle a-t-il du data-leakage ?

R : Non. 21 tests anti-leakage en CI vérifient que :

- Le split temporel n'est jamais shuffled.
- Tous les transforms (scaler, HMM, features stats) sont `fit` exclusivement sur
  Train.
- Les fenêtres glissantes utilisent strictement des données antérieures à t.
- Le HMM est ré-estimé en walk-forward expansive.

Voir `masi-hybrid-forecasting/docs/anti_leakage.md`.

## Q : Pourquoi le Sharpe varie-t-il avec le coût en bps ?

R : Le coût est appliqué proportionnellement au turnover `|Δposition|`. Une
stratégie qui flippe fréquemment (CNN-LSTM nu) est plus sensible au coût que
HMM-gate qui ne flippe que lors des transitions de régime. À 20 bps, certaines
stratégies deviennent unprofitable.

## Q : Le régime HMM est Bear, est-ce que le MASI va baisser ?

R : Pas nécessairement. Le régime HMM décrit la **volatilité**, pas la
direction. Un état Bear signifie « régime de volatilité élevée historiquement
associé à des rendements moyens négatifs ». La direction du jour J+1 vient du
rendement prédit par le CNN-LSTM, pas du régime.

## Q : Que veut dire « DSR ≈ 0.997 » ?

R : Le Deflated Sharpe Ratio est le Sharpe corrigé pour le data-snooping
(Bailey & López de Prado 2014). Il s'interprète comme une probabilité : 0.997
≈ 99.7% de chance que le vrai Sharpe soit > 0. Plus c'est proche de 1, plus la
performance est statistiquement significative après correction.

## Q : Quelle est la meilleure stratégie ?

R : Trié par Sharpe sur Test (coût 5 bps), c'est généralement HMM-gate qui
arrive en tête, suivie de risk-targeting et VaR-budget. Le classement exact
est dans `outputs/etape8/strategies_metrics.json`. Attention : « meilleure
historique » ≠ « meilleure future ».

## Q : Comment relancer le pipeline ?

R : Depuis le dossier `masi-hybrid-forecasting/` :

```powershell
python -m masi_hybrid_forecasting.pipeline predict
python -m masi_hybrid_forecasting.pipeline risk
python -m masi_hybrid_forecasting.pipeline backtest --strategy hmm_gate --cost-bps 5
python -m masi_hybrid_forecasting.pipeline export --strategy hmm_gate
```

Le dashboard détecte automatiquement les fichiers mis à jour (cache invalidé
par mtime).

## Q : Comment reconstruire l'index RAG ?

R : Depuis `dashbord-masi-hybrid-forecasting-01/` :

```powershell
python -m rag_project.scripts.build_index
```

Cela ré-indexe tous les markdown du projet MASI + les notebooks parsés + les
docs curated. L'index est écrit dans `.chroma_db/` (par défaut).

## Q : Le test Kupiec est OK mais Christoffersen est FAIL, qu'est-ce que ça veut dire ?

R : Le **taux** de breaches est bien calibré (Kupiec OK), mais les breaches
sont **clusterisés** dans le temps (Christoffersen FAIL). Le modèle rate
probablement la dynamique conditionnelle — typique d'un EGARCH avec une queue
mal capturée ou un effet de levier sous-estimé.

## Q : Quelle est la fenêtre Test ?

R : Affichée dans le bandeau « TEST : `start_date` → `end_date` · N jours ». Les
dates exactes viennent de `outputs/etape6/backtest_metrics.json` (`test_range`).

## Q : Dois-je acheter le MASI ?

R : **Je ne peux pas donner de conseil d'investissement personnalisé.** Le
dashboard est un outil de recherche. Je peux t'aider à interpréter les
prévisions, la VaR, l'Expected Shortfall, le régime HMM et les résultats de
backtest. Pour une décision d'investissement, consulte un conseiller agréé.

## Q : Comment ça marche le HMM-gate ?

R : C'est la stratégie production. La position du jour J+1 est :

- `+1` si `predicted_return > 0` ET régime ≠ Bear.
- `-1` si `predicted_return < 0` ET régime ≠ Bull (et short autorisé).
- `0` sinon (cash, on évite les transitions).

L'idée est de filtrer le signal CNN-LSTM nu : on prend seulement les directions
cohérentes avec le régime de volatilité courant.
