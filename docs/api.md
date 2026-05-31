# Endpoints API

L'API FastAPI expose tous les endpoints lus par le frontend Next.js. La
documentation OpenAPI auto-générée est disponible en local sur
[`http://127.0.0.1:8000/docs`](http://127.0.0.1:8000/docs) une fois le
serveur démarré.

---

## :material-heart-pulse: Santé

| Méthode | Route | Description |
|---------|---|---|
| GET | `/api/health` | statut + présence des artefacts MASI |

---

## :material-chart-line: Forecast

| Méthode | Route | Description |
|---------|---|---|
| GET | `/api/forecast/latest` | prédiction J+1 + métriques live |
| GET | `/api/forecast/series?window=` | série historique (N derniers points) |
| GET | `/api/forecast/kpis` | KPI agrégés (Sharpe, équité, …) |
| GET | `/api/forecast/regimes` | distribution HMM |

---

## :material-shield-alert: Risk

| Méthode | Route | Description |
|---------|---|---|
| GET | `/api/risk/series?window=` | VaR / ES / vol par jour |
| GET | `/api/risk/validation` | tests Kupiec & Christoffersen |
| GET | `/api/risk/breaches` | comptage breaches observés vs attendus |

---

## :material-test-tube: Backtest & stratégies

| Méthode | Route | Description |
|---------|---|---|
| GET | `/api/strategies` | toutes les stratégies + métriques |
| GET | `/api/strategies/{id}` | détail d'une stratégie |
| GET | `/api/backtest/equity` | courbes d'équité multi-stratégies |
| GET | `/api/backtest/summary` | résumé étape 6 |

---

## :material-chart-bell-curve: Predictions (vue agrégée)

| Méthode | Route | Description |
|---------|---|---|
| GET | `/api/predictions/snapshot` | snapshot risk score + persistance régime |
| GET | `/api/predictions/risk-score` | série du risk score 0-100 |
| GET | `/api/predictions/regime-persistence` | persistance moyenne par régime |

---

## :material-chat-processing: Assistant RAG

| Méthode | Route | Description |
|---------|---|---|
| POST | `/api/chat` | chatbot RAG (intent + retrieval + LLM + guardrails) |

### Schema de requête

```json
{
  "message": "quel est le VaR du jour ?",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "filters": {}
}
```

### Schema de réponse

```json
{
  "answer": "Le VaR 95% sur la session courante est de …",
  "sources": [
    {
      "title": "07_risk_metrics_VaR_ES.ipynb",
      "section": "Calcul du VaR paramétrique",
      "snippet": "Le VaR paramétrique 95% est calculé via …",
      "score": 0.78,
      "source": ".../notebooks/07_risk_metrics_VaR_ES.ipynb",
      "kind": "notebook"
    }
  ],
  "backend": "ollama",
  "intent": "risk_query",
  "used_rag": true,
  "used_live": true
}
```

[En savoir plus sur le pipeline RAG :material-arrow-right:](rag.md){ .md-button }

---

## :material-code-tags: Exemple curl

```powershell
# Santé
curl http://127.0.0.1:8000/api/health

# Dernière prédiction
curl http://127.0.0.1:8000/api/forecast/latest

# Chat
curl -X POST http://127.0.0.1:8000/api/chat `
  -H "Content-Type: application/json" `
  -d '{"message":"explique la méthodologie en 2 phrases"}'
```
