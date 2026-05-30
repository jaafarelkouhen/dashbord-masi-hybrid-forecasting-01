"""Response policy : contraintes par intent pour structurer la réponse LLM.

Ne génère pas de réponse — décrit ce que le LLM DOIT faire et NE DOIT PAS faire
pour la question courante. Le prompt_builder injecte ces contraintes.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ResponsePolicy:
    mode: str
    required_context: list[str] = field(default_factory=list)
    forbidden_claims: list[str] = field(default_factory=list)
    must_mention: list[str] = field(default_factory=list)
    allow_llm: bool = True
    direct_answer: str | None = None


def _normalize(text: str) -> str:
    t = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in t if not unicodedata.combining(ch))


def _is_investment_advice(q: str) -> bool:
    patterns = (
        "dois-je acheter", "dois je acheter",
        "dois-je vendre", "dois je vendre",
        "dois-je investir", "dois je investir",
        "tu me conseilles d'acheter", "tu me conseilles de vendre",
        "je dois acheter", "je dois vendre",
        "recommande d'acheter", "recommande de vendre",
        "il faut acheter", "il faut vendre",
        "quelle action acheter", "ou investir",
        " buy ", " sell ", "buy masi", "sell masi",
    )
    norm = f" {_normalize(q)} "
    return any(p in norm for p in patterns)


def _is_var_es_question(q: str) -> bool:
    norm = _normalize(q)
    return any(t in norm for t in (" var ", "value at risk", "expected shortfall", "shortfall", " es "))


def _is_horizon_question(q: str) -> bool:
    norm = _normalize(q)
    has_horizon = any(t in norm for t in ("10 jours", "25 jours", "10j", "25j", "horizon"))
    asks_method = any(t in norm for t in ("monte carlo", "calcule", "methode", "extension", "scaling"))
    return has_horizon and asks_method


def build(question: str, intent: str) -> ResponsePolicy:
    q = _normalize(question)

    if _is_investment_advice(question):
        return ResponsePolicy(
            mode="investment_advice_refusal",
            allow_llm=False,
            forbidden_claims=["buy", "sell", "investment recommendation"],
            direct_answer=(
                "Je ne peux pas donner de conseil d'investissement personnalisé "
                "ni te dire quoi acheter, vendre ou allouer. Je peux en revanche "
                "t'aider à interpréter les prévisions, la VaR, l'Expected "
                "Shortfall, le régime HMM et les résultats de backtest du dashboard."
            ),
        )

    if _is_horizon_question(question):
        return ResponsePolicy(
            mode="horizon_explanation",
            required_context=["methodology"],
            forbidden_claims=[
                "Monte Carlo pour 10/25 jours",
                "modele entraine directement a 10j ou 25j",
            ],
            must_mention=[
                "extension operationnelle du modele 1 jour",
                "scaling racine de l'horizon pour la volatilite",
            ],
        )

    if intent == "forecast_query":
        return ResponsePolicy(
            mode="forecast_numeric",
            required_context=["live_snapshot"],
            forbidden_claims=["conseil d'investissement", "rendement garanti"],
            must_mention=["horizon J+1", "rendement predit", "VaR ou ES"],
        )

    if intent == "risk_query":
        return ResponsePolicy(
            mode="risk_backtest",
            required_context=["risk_metrics"],
            forbidden_claims=[
                "VaR est la perte moyenne",
                "ES est la perte maximale",
                "niveau de violation attendu est une p-value",
            ],
            must_mention=[
                "taux de breaches observe vs attendu",
                "verdict Kupiec / Christoffersen si demande",
            ],
        )

    if intent == "regime_query":
        return ResponsePolicy(
            mode="regime",
            required_context=["live_snapshot", "regime_distribution"],
            forbidden_claims=[
                "HMM predit la direction du MASI",
                "regime Bear = ordre de vente",
            ],
            must_mention=[
                "HMM decrit la volatilite, pas la direction",
                "la direction vient du rendement predit",
            ],
        )

    if intent == "strategy_query":
        return ResponsePolicy(
            mode="strategy",
            required_context=["backtest_metrics"],
            forbidden_claims=[
                "il faut acheter ou vendre",
                "performance future garantie",
            ],
            must_mention=[
                "Sharpe / Sortino / drawdown si pertinent",
                "les positions affichees sont une simulation historique",
            ],
        )

    if _is_var_es_question(question) or intent == "definition_query":
        return ResponsePolicy(
            mode="definition",
            required_context=["rag_chunks"],
            forbidden_claims=[
                "VaR est la perte maximale",
                "ES est la perte maximale",
                "Volatility of Returns",
            ],
            must_mention=[
                "VaR = seuil conditionnel de perte (quantile)",
                "ES = moyenne conditionnelle au-dela de la VaR",
            ],
        )

    if intent == "methodology_query":
        return ResponsePolicy(
            mode="methodology",
            required_context=["rag_chunks"],
            forbidden_claims=["data leakage", "look-ahead bias"],
            must_mention=[
                "split temporel strict",
                "transforms fit sur Train uniquement",
            ],
        )

    if intent == "out_of_scope":
        return ResponsePolicy(
            mode="out_of_scope_refusal",
            allow_llm=False,
            direct_answer=(
                "Je suis spécialisé dans le dashboard MASI Hybrid Forecasting. "
                "Je peux t'aider sur la prévision J+1, la VaR/ES, le régime HMM, "
                "les stratégies backtestées et la méthodologie anti-leakage. "
                "Pose-moi une question dans ces sujets."
            ),
        )

    return ResponsePolicy(
        mode="general_controlled",
        forbidden_claims=[
            "conseil d'investissement",
            "performance garantie",
            "VaR est la perte maximale",
            "HMM predit la direction",
        ],
    )


def format_for_prompt(policy: ResponsePolicy) -> str:
    if policy is None:
        return "Aucune politique spécifique."
    lines = [f"Mode : {policy.mode}", f"LLM autorisé : {'oui' if policy.allow_llm else 'non'}"]
    if policy.required_context:
        lines.append("Contextes requis : " + ", ".join(policy.required_context))
    if policy.forbidden_claims:
        lines.append("Affirmations interdites : " + " ; ".join(policy.forbidden_claims))
    if policy.must_mention:
        lines.append("Points à couvrir : " + " ; ".join(policy.must_mention))
    lines.append(
        "Respecte ces contraintes implicitement. Ne les recopie pas dans la réponse."
    )
    return "\n".join(lines)
