# Règles d'interprétation canoniques

Ce document fige les interprétations correctes vs incorrectes pour les
concepts récurrents. Sert de référence pour `answer_repair.py` qui corrige les
erreurs LLM connues.

## VaR

| ✅ Correct | ❌ Incorrect |
|---|---|
| « La VaR 5% est un quantile conditionnel de perte. » | « La VaR est la perte moyenne attendue. » |
| « Il y a 5% de chance de perdre au moins X% en J+1. » | « On va certainement perdre X%. » |
| « La VaR est un seuil. » | « La VaR est la perte maximale. » |
| « VaR = Value at Risk. » | « VaR = Volatility at Risk. » |
| « La VaR ne dit pas combien on perd au-delà du seuil. » | « La VaR couvre tous les scénarios. » |

## ES (Expected Shortfall)

| ✅ Correct | ❌ Incorrect |
|---|---|
| « L'ES 5% est la moyenne des pertes au-delà du seuil VaR. » | « L'ES est la perte maximale. » |
| « `|ES| ≥ |VaR|` par construction. » | « L'ES est plus petit que la VaR. » |
| « ES = Expected Shortfall, aka CVaR. » | « ES = Equity Spread. » |

## Régime HMM

| ✅ Correct | ❌ Incorrect |
|---|---|
| « Le régime HMM décrit la volatilité conditionnelle, pas la direction. » | « Le régime Bear confirme que le MASI va baisser. » |
| « Bear = état de volatilité élevée avec rendements moyens historiquement négatifs. » | « Bear = ordre de vente. » |
| « Le régime affiché est l'état estimé à partir des données récentes. » | « Le modèle est configuré pour fonctionner dans un régime Bear. » |
| « La direction vient du rendement prédit par le CNN-LSTM. » | « La direction vient du régime HMM. » |

## Horizons 10j / 25j

| ✅ Correct | ❌ Incorrect |
|---|---|
| « Les horizons 10j et 25j sont des extensions opérationnelles du modèle 1j. » | « Les horizons 10j et 25j sont calculés par Monte Carlo. » |
| « La volatilité est étendue par scaling √horizon. » | « La volatilité 10j est égale à 10× la volatilité 1j. » |
| « La moyenne conditionnelle est agrégée sur l'horizon. » | « Le CNN-LSTM est entraîné directement à 10j. » |

## Stratégie risk-managed

| ✅ Correct | ❌ Incorrect |
|---|---|
| « La simulation risk-managed dimensionne la position en fonction de la VaR prédite. » | « La stratégie de gestion de risque dépend de la prévision de rendement. » |
| « Le poids risk-managed dépend de la VaR prédite. » | « Le poids risk-managed dépend du rendement prédit. » |
| « Les positions affichées sont une simulation historique. » | « Les positions affichées sont des ordres réels. » |

## MASI

| ✅ Correct | ❌ Incorrect |
|---|---|
| « MASI = Moroccan All Shares Index, Bourse de Casablanca. » | « MASI = Marché Algérien des Valeurs Mobilières. » |
| « marché actions marocain. » | « marché algérien. » |

## Backtest et p-values

| ✅ Correct | ❌ Incorrect |
|---|---|
| « Le niveau de violation attendu est le taux α théorique (par exemple 5%). » | « Le niveau de violation attendu est une p-value. » |
| « La p-value de Kupiec teste H₀ : taux observé = α nominal. » | « La p-value de Kupiec est le taux de violations. » |
| « Une p-value > seuil → on ne rejette pas H₀. » | « Une p-value > seuil → le modèle est garanti bon. » |
| « Test OK = bien calibré sur cet historique. » | « Test OK = calibration future garantie. » |

## Conseil d'investissement

| ✅ Correct | ❌ Incorrect |
|---|---|
| « Je ne peux pas donner de conseil d'investissement personnalisé. » | « Tu devrais acheter le MASI. » |
| « Je peux t'aider à interpréter les prévisions et la VaR. » | « Je recommande de vendre. » |
| « Le dashboard est un outil de recherche. » | « Voici ma recommandation : acheter. » |

## Métadonnées et sources

- Toujours citer la source d'une métrique chiffrée : `[snapshot live]` pour les
  valeurs en temps réel, `[titre — section]` pour les chunks RAG.
- Si une métrique n'est ni dans le snapshot ni dans les chunks, dire
  explicitement « cette information n'est pas disponible dans le contexte
  actuel ».
- Ne jamais paraphraser un chiffre — utiliser la valeur exacte du contexte.
