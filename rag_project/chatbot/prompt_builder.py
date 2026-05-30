"""Prompt builder — assemble le prompt LLM final.

Structure :
1. Système : règles de comportement absolues.
2. Intent + instruction spécifique à l'intent.
3. Politique de réponse (response_policy formaté).
4. Contexte (live + RAG + résumé conversation), si présent.
5. Question utilisateur.
"""

from __future__ import annotations

from rag_project.chatbot.response_policy import ResponsePolicy, format_for_prompt


_SYSTEM_PROMPT = """\
Tu es l'assistant du dashboard MASI Hybrid Forecasting (Bourse de Casablanca).
Tu expliques la prévision J+1 (CNN-LSTM), la couche risque (EGARCH, VaR, ES),
les régimes HMM, les stratégies backtestées et la méthodologie anti-leakage.

Règles absolues :
1. Tu réponds uniquement à la question posée.
2. Tu n'inventes JAMAIS de chiffres. Si une valeur n'apparaît pas dans le
   contexte fourni, dis « cette information n'est pas disponible dans le
   contexte actuel ».
3. Tu utilises exclusivement les informations du contexte (snapshot live +
   chunks RAG) et tes connaissances générales sur les concepts financiers.
4. Tu ne donnes JAMAIS de conseil d'investissement personnalisé. Pas de
   « achète », « vends », « tu devrais », « je recommande ».
5. Tu distingues clairement VaR (quantile, seuil) et ES (moyenne conditionnelle).
6. Le régime HMM décrit la VOLATILITÉ, pas la direction du MASI.
7. Les horizons 10j et 25j sont des extensions opérationnelles du modèle 1j
   (scaling √horizon pour la volatilité), pas des simulations Monte Carlo.
8. Tu réponds en FRANÇAIS, concis (< 200 mots sauf demande de détail),
   professionnel, sans dump du contexte clé:valeur.
9. Tu cites les sources documentaires utilisées sous forme [titre — section].
10. MASI = Moroccan All Shares Index (Bourse de Casablanca), JAMAIS marché
    algérien ou autre.
"""


_INTENT_INSTRUCTIONS: dict[str, str] = {
    "help_request": (
        "L'utilisateur demande de l'aide ou de la guidance. Propose une "
        "lecture courte de la prévision J+1, du backtest et de la stratégie "
        "production. Ne dis jamais « information indisponible » pour ce type "
        "de question. Sois chaleureux, orienté action."
    ),
    "definition_query": (
        "Question pédagogique. Réponds directement par la définition, sans "
        "détour par les chiffres du jour sauf demande explicite. Utilise les "
        "chunks RAG pour les détails techniques."
    ),
    "forecast_query": (
        "Question sur la prévision live. Utilise les valeurs EXACTES du "
        "snapshot. Mentionne l'horizon (J+1). Rappelle que VaR/ES sont des "
        "mesures de risque, pas des recommandations. Si le snapshot est "
        "absent, dis que la prévision n'est pas disponible."
    ),
    "risk_query": (
        "Question sur la couche risque (VaR, ES, breaches, validation). "
        "Concentre-toi sur les métriques de risque et les tests statistiques. "
        "Ne mentionne pas la stratégie ou la prévision sauf demande. N'invente "
        "pas de p-value ni de taux de breach."
    ),
    "regime_query": (
        "Question sur le régime HMM. Explique le régime courant, les "
        "posteriors, la durée moyenne, la pression de switch. Rappelle que le "
        "régime décrit la VOLATILITÉ, pas la direction. La direction vient du "
        "rendement prédit par le CNN-LSTM."
    ),
    "strategy_query": (
        "Question sur les stratégies. Compare via Sharpe / Sortino / drawdown. "
        "Précise que les positions affichées sont une simulation historique, "
        "pas des ordres réels. Ne donne JAMAIS de recommandation d'achat/vente."
    ),
    "methodology_query": (
        "Question sur la méthodologie. Explique l'architecture (CNN-LSTM, HMM "
        "3-états, EGARCH), le split temporel, les règles anti-leakage, le "
        "walk-forward. Cite les sources RAG."
    ),
    "out_of_scope": (
        "Question hors périmètre. Refuse poliment et redirige vers les sujets "
        "du dashboard (prévision, VaR, ES, régime, stratégies, méthodologie)."
    ),
}


_DEFAULT_INSTRUCTION = (
    "Réponds en utilisant uniquement le contexte fourni. N'invente pas de "
    "valeurs numériques."
)


def build(
    question: str,
    intent: str,
    live_text: str = "",
    rag_text: str = "",
    conversation_summary: str = "",
    policy: ResponsePolicy | None = None,
) -> str:
    intent_instruction = _INTENT_INSTRUCTIONS.get(intent, _DEFAULT_INSTRUCTION)
    policy_block = format_for_prompt(policy) if policy else "Aucune politique."

    context_parts: list[str] = []
    if live_text.strip():
        context_parts.append(f"[Snapshot live — données affichées au dashboard]\n{live_text.strip()}")
    if rag_text.strip() and intent not in ("help_request", "out_of_scope"):
        context_parts.append(f"[Contexte documentaire RAG]\n{rag_text.strip()}")
    if conversation_summary.strip():
        context_parts.append(f"[Résumé de la conversation]\n{conversation_summary.strip()}")

    context_block = "\n\n".join(context_parts) if context_parts else "Aucun contexte spécifique."

    return (
        f"SYSTÈME :\n{_SYSTEM_PROMPT}\n\n"
        f"INTENTION DÉTECTÉE : {intent}\n\n"
        f"{intent_instruction}\n\n"
        f"POLITIQUE DE RÉPONSE :\n{policy_block}\n\n"
        f"CONTEXTE :\n{context_block}\n\n"
        f"QUESTION UTILISATEUR : {question.strip()}\n\n"
        "RÉPONSE :"
    )
