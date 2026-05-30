"""Conversation memory — compacte l'historique en un résumé court.

Le LLM ne voit jamais la liste brute de tous les messages. À la place, on
fournit un bloc « Résumé de la conversation » avec :
- Compteur de tours.
- Sujet le plus récent (inféré par mots-clés).
- Intent du tour précédent.
- Dernière question utilisateur (extrait).
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ConversationMemory:
    last_intent: str = ""
    last_topic: str = ""
    last_forecast_date: str = ""
    recent_questions: list[str] = field(default_factory=list)
    recent_responses: list[str] = field(default_factory=list)
    turn_count: int = 0

    def summary(self) -> str:
        if self.turn_count == 0:
            return ""
        parts: list[str] = [f"Tour de conversation : {self.turn_count}."]
        if self.last_topic:
            parts.append(f"Dernier sujet discuté : {self.last_topic}.")
        if self.last_intent:
            parts.append(f"Dernière intention : {self.last_intent}.")
        if self.last_forecast_date:
            parts.append(f"Dernière prévision consultée : {self.last_forecast_date}.")
        if self.recent_questions:
            last = self.recent_questions[-1][:100]
            parts.append(f"Dernière question : « {last} »")
        return " ".join(parts)


_TOPIC_MAP = [
    (["var", "value at risk"], "la VaR"),
    (["expected shortfall", "shortfall", " es "], "l'Expected Shortfall"),
    (["backtest", "kupiec", "christoffersen", "violation"], "le backtesting"),
    (["regime", "hmm"], "les régimes HMM"),
    (["drawdown"], "le drawdown"),
    (["sharpe"], "le Sharpe"),
    (["equity", "richesse"], "l'equity"),
    (["forecast", "prevision", "prévision", "prediction"], "les prévisions"),
    (["strategie", "stratégie", "hmm-gate", "risk-targeting", "risk targeting"], "les stratégies"),
    (["egarch", "garch", "lstm", "cnn"], "les modèles"),
    (["masi"], "le MASI"),
    (["dashboard"], "le dashboard"),
]


def _infer_topic(text: str) -> str:
    t = f" {text.lower()} "
    for keywords, label in _TOPIC_MAP:
        if any(kw in t for kw in keywords):
            return label
    return ""


def sanitize_history(
    history: list[dict] | None, max_messages: int = 8
) -> list[dict[str, str]]:
    """Nettoie l'historique : roles valides, contenu non vide, longueur capée."""
    if not history:
        return []
    cleaned: list[dict[str, str]] = []
    for item in history[-max_messages:]:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()
        if role in {"user", "assistant"} and content:
            cleaned.append({"role": role, "content": content[:4000]})
    return cleaned


def build(history: list[dict] | None, max_turns: int = 4) -> ConversationMemory:
    memory = ConversationMemory()
    if not history:
        return memory

    valid = [
        m for m in history
        if isinstance(m, dict)
        and m.get("role") in ("user", "assistant")
        and m.get("content")
    ]
    if not valid:
        return memory

    recent = valid[-(max_turns * 2):]
    memory.turn_count = sum(1 for m in valid if m["role"] == "user")

    user_msgs = [m["content"] for m in recent if m["role"] == "user"]
    asst_msgs = [m["content"] for m in recent if m["role"] == "assistant"]

    memory.recent_questions = [q[:150] for q in user_msgs[-2:]]
    memory.recent_responses = [r[:150] for r in asst_msgs[-1:]]

    combined = " ".join(m["content"] for m in recent)
    memory.last_topic = _infer_topic(combined)
    return memory


def summary_block(history: list[dict] | None) -> str:
    return build(history).summary()
