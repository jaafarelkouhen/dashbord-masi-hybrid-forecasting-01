"""Fallback responses — réponses déterministes quand le LLM est indispo.

Activées dans deux cas :
1. Ollama down et `LLM_BACKEND=fallback`.
2. La policy refuse l'appel LLM (out_of_scope, conseil d'invest).

Les templates utilisent le contexte (snapshot live, chunks RAG) pour formuler
une réponse minimale mais correcte.
"""

from __future__ import annotations

from typing import Any


def greeting() -> str:
    return (
        "Bienvenue sur le dashboard MASI Hybrid Forecasting. On peut commencer par :\n\n"
        "- La **prévision J+1** (rendement prédit, VaR 5%, ES 5%, régime HMM courant).\n"
        "- Le **backtest** (Sharpe par stratégie, validation Kupiec/Christoffersen).\n"
        "- La **stratégie production** (HMM-gate) et son écart vs Buy & Hold.\n\n"
        "Pose ta question, ou tape « guide moi » pour une lecture commentée."
    )


def investment_advice_refusal() -> str:
    return (
        "Je ne peux pas donner de conseil d'investissement personnalisé. "
        "Je peux par contre t'aider à interpréter les prévisions, la VaR, "
        "l'Expected Shortfall, le régime HMM ou les résultats de backtest. "
        "Pour une décision d'achat/vente, consulte un conseiller agréé."
    )


def out_of_scope_refusal() -> str:
    return (
        "Je suis spécialisé dans le dashboard MASI Hybrid Forecasting. "
        "Je peux t'aider sur la prévision J+1, la VaR/ES, le régime HMM, "
        "les stratégies backtestées et la méthodologie anti-leakage. "
        "Pose-moi une question dans ces sujets."
    )


def _pct(value: Any, digits: int = 2) -> str:
    try:
        return f"{float(value) * 100:+.{digits}f}%"
    except (TypeError, ValueError):
        return "—"


def forecast_summary(snapshot: dict | None) -> str:
    if not snapshot:
        return (
            "Cette information n'est pas disponible dans le contexte actuel. "
            "Vérifie que `outputs/etape6/etape6_final_predictions.csv` et "
            "`outputs/etape7/risk_metrics_test.csv` ont bien été générés."
        )
    parts = [
        f"Snapshot du {snapshot.get('date', '—')} :",
        f"- Rendement prédit J+1 : {_pct(snapshot.get('predicted_return'), 3)} "
        f"(position {snapshot.get('position', '—')}).",
        f"- VaR 5% : {_pct(snapshot.get('var_5'), 2)}.",
        f"- ES 5% : {_pct(snapshot.get('es_5'), 2)}.",
        f"- Régime HMM : {snapshot.get('regime', '—')} "
        f"(streak {snapshot.get('streak_days', '—')}j, "
        f"P(switch) {snapshot.get('p_regime_switch_next', 0):.2f}).",
        f"- Vol GARCH : {_pct(snapshot.get('vol_garch'), 2)}.",
        f"- Risk score : {snapshot.get('risk_score', '—')}/100.",
    ]
    return "\n".join(parts)


def rag_summary(chunks: list, intro: str = "") -> str:
    if not chunks:
        return (
            "Je n'ai pas trouvé d'extrait pertinent dans la base documentaire. "
            "Reformule ou précise la question."
        )
    parts = [intro] if intro else []
    parts.append("Voici ce que les sources disent :")
    for i, c in enumerate(chunks[:3], 1):
        title = getattr(c, "title", "doc")
        section = getattr(c, "section", "")
        text = getattr(c, "text", "")[:280]
        parts.append(f"[{i}] **{title} — {section}**\n{text}")
    return "\n\n".join(parts)


def render(
    intent: str,
    message: str,
    chunks: list,
    live_snapshot: dict | None,
) -> str:
    """Choisit le template fallback adapté à l'intent."""
    if intent == "help_request":
        return greeting()
    if intent == "out_of_scope":
        return out_of_scope_refusal()
    if intent == "forecast_query":
        live = forecast_summary(live_snapshot)
        rag = rag_summary(chunks) if chunks else ""
        return live + (f"\n\n{rag}" if rag else "")
    if intent in {"risk_query", "regime_query", "strategy_query"}:
        if live_snapshot:
            return forecast_summary(live_snapshot) + "\n\n" + rag_summary(chunks)
        return rag_summary(chunks)
    if intent in {"definition_query", "methodology_query"}:
        return rag_summary(chunks)
    return rag_summary(chunks) or out_of_scope_refusal()
