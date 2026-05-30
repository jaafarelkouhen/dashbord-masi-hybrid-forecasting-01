# Limitations et pièges connus

## Ce que le modèle ne fait PAS

1. **Pas de prédiction multi-horizon native.** Le CNN-LSTM est entraîné à J+1.
   Les horizons 10j ou 25j visibles dans certains rapports sont des **extensions
   opérationnelles** : la moyenne conditionnelle est agrégée, la volatilité est
   scalée par √horizon. Ce n'est pas une simulation Monte Carlo.
2. **Pas de recommandation d'investissement.** Le dashboard ne dit jamais
   « acheter » ou « vendre ». Les positions affichées sont des simulations
   historiques, pas des ordres réels.
3. **Pas de prise en compte de l'illiquidité.** Le coût en bps modélise les
   frais de transaction, mais pas le slippage non-linéaire sur grosses tailles
   ni l'impact de marché.
4. **Pas de short-restriction réaliste.** Le backtest autorise des positions
   short sans modéliser le coût de borrow ni les restrictions réglementaires.
5. **Pas de calibration intra-day.** Tout est en log-rendements close-to-close.
6. **Pas de news / sentiment.** Aucune feature textuelle n'alimente le modèle.

## Limites du HMM

- Les 3 états sont une simplification. La frontière entre Neutral et
  Bull/Bear est floue, surtout en transition.
- Le HMM est non-causal lors de la décomposition Viterbi *full-sample*. La
  version production utilise filtering causal (forward only), donc les régimes
  affichés peuvent différer rétrospectivement.
- Les transitions sont supposées markoviennes d'ordre 1, ce qui rate
  l'autocorrélation longue.
- **Le régime n'est pas une prédiction de direction.** Bear ≠ « le marché va
  baisser », c'est « volatilité élevée dans un état historiquement baissier ».

## Limites de la VaR/ES

- L'hypothèse Gaussienne sous-estime systématiquement les queues. C'est
  pourquoi on compare paramétrique vs historique dans `risk_validation.json`.
- La VaR n'est pas sous-additive (≠ ES). Aggréger des VaR par instrument peut
  donner un VaR portefeuille plus grand que la VaR portefeuille calculée
  directement.
- À fenêtres courtes, le test Kupiec a peu de puissance (peu d'observations
  dans la queue).
- Une VaR non-violée ne signifie pas que le modèle est bien calibré ; il peut
  être trop conservateur.

## Limites du backtesting

- **Survivorship bias** : si certaines valeurs sortantes du MASI sont absentes
  des données historiques, les rendements de l'indice sont surévalués.
- **Coût constant en bps** : la réalité a un spread variable et un impact qui
  dépend du carnet.
- **DSR borné** : la correction DSR suppose une distribution log-normale du
  Sharpe ratio empirique. À petits N (< 200 jours Test), la correction est
  peu fiable.
- **Une seule fenêtre Test** : le DSR ≈ 0.997 affiché vient d'un Test unique.
  L'étape 9 (robustesse) regénère le backtest sur plusieurs splits temporels
  pour estimer la variance des métriques.

## Ce que le RAG ne peut PAS faire

1. **Il ne calcule rien en temps réel.** Le chatbot lit les valeurs déjà
   présentes dans les artefacts (CSV/JSON). Si une métrique demandée n'est pas
   dans le contexte, il répond « cette information n'est pas disponible ».
2. **Il ne ré-entraîne pas le modèle.**
3. **Il ne se connecte pas à une source de marché live.** Les chiffres sont
   ceux du dernier `python -m masi_hybrid_forecasting.pipeline export …`.
4. **Il refuse les questions hors périmètre** (météo, sport, autres marchés,
   conseil d'achat/vente personnalisé).
