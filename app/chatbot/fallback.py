"""
Réponses déterministes utilisées quand LLM_BACKEND=fallback (aucun appel réseau).

Pour chaque intention, on bâtit une réponse à partir des chunks sourcés et du
snapshot live. C'est moins fluide qu'un LLM mais 100% factuel.
"""

from __future__ import annotations

from app.rag.retriever import RetrievedChunk


def render(
    *,
    intent: str,
    message: str,
    chunks: list[RetrievedChunk],
    live_snapshot: dict | None,
) -> str:
    parts: list[str] = []

    if intent == "forecast" and live_snapshot:
        parts.append(
            f"**Prédiction (modèle {live_snapshot.get('strategy_name','hmm_gate')})** "
            f"pour le {live_snapshot.get('date')} :\n"
            f"- Rendement prédit : {live_snapshot.get('predicted_return'):+.4%}\n"
            f"- Position : {live_snapshot.get('position'):+.0f}\n"
            f"- Régime : {live_snapshot.get('regime')} (risque : {live_snapshot.get('risk_regime')})"
        )
    elif intent == "risk" and live_snapshot:
        parts.append(
            f"**Métriques de risque** au {live_snapshot.get('date')} :\n"
            f"- VaR 5% paramétrique : {live_snapshot.get('var_5'):+.4%}\n"
            f"- ES 5% : {live_snapshot.get('es_5'):+.4%}\n"
            f"- Volatilité GARCH : {live_snapshot.get('vol_garch'):.4%}\n"
            f"- Régime de risque : {live_snapshot.get('risk_regime')}"
        )
    elif intent == "regime" and live_snapshot:
        parts.append(
            f"**Régime actuel** : {live_snapshot.get('regime')} "
            f"(au {live_snapshot.get('date')}).\n"
            f"Régime de risque : {live_snapshot.get('risk_regime')}."
        )

    if chunks:
        parts.append("\n**Sources documentaires** :")
        for i, c in enumerate(chunks[:3], 1):
            snippet = c.text.strip().replace("\n\n", " ").replace("\n", " ")[:280]
            parts.append(f"{i}. _{c.title} — {c.section}_ : {snippet}…")

    if not parts:
        parts.append(
            "Je n'ai pas trouvé d'élément précis dans les documents indexés pour "
            "répondre à cette question. Essaie de la reformuler, ou demande par "
            "exemple : « quel est le VaR du jour ? », « explique la méthodologie "
            "anti-leakage », ou « quelles sont les stratégies disponibles ? »."
        )

    return "\n\n".join(parts).strip()
