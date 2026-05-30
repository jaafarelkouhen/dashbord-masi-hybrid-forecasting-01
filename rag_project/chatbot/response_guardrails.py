"""Guardrails post-génération — valide la réponse LLM avant envoi à l'UI.

Règles :
1. Conseil d'investissement explicite → refus standardisé.
2. Pourcentages dans la réponse absents du contexte → flag hallucination.
3. Langage de certitude → flag.
4. Confusion VaR/ES (« VaR est la perte moyenne ») → correction.
5. « Information indisponible » renvoyée pour une question d'aide → corriger.
6. Date relative inventée (aujourd'hui / demain) absente du contexte → flag.
7. Réponse répétitive → corriger en réponse standard.
8. Dump du contexte clé:valeur → reformuler.

`apply` retourne la réponse corrigée (ou la version originale si tout passe).
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field


_PERCENT_RE = re.compile(r"[-+]?\d+(?:[.,]\d+)?\s*%")


_FINANCIAL_ADVICE_PATTERNS = (
    "tu dois acheter", "tu dois vendre",
    "je recommande d'acheter", "je recommande de vendre",
    "achete le masi", "vends le masi",
    "je te conseille d'acheter", "je te conseille de vendre",
    "il faut acheter", "il faut vendre",
    "tu devrais acheter", "tu devrais vendre",
)

_VAR_ES_CONFUSION_PATTERNS = (
    "var est la perte moyenne",
    "var mesure la perte moyenne",
    "var est une perte moyenne",
    "value at risk est la perte moyenne",
    "var correspond a la perte moyenne",
    "var est la perte maximale",
    "value at risk est la perte maximale",
)

_CERTAINTY_PATTERNS = (
    "va certainement", "est certain", "garanti",
    "sans risque", "perte maximale garantie",
    "va surement", "100% de chance",
)

_RELATIVE_DATES = ("aujourd'hui", "aujourd hui", "demain", "semaine prochaine", "mois prochain")

_UNAVAILABLE_MARKERS = (
    "cette information n'est pas disponible dans le contexte actuel",
    "cette information n est pas disponible",
    "je n'ai pas cette information",
)


@dataclass
class GuardrailResult:
    is_valid: bool
    issues: list[str] = field(default_factory=list)
    corrected: str | None = None


def _normalize(text: str) -> str:
    t = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in t if not unicodedata.combining(ch))


def _percentages(text: str) -> set[str]:
    out: set[str] = set()
    for m in _PERCENT_RE.findall(text):
        num = m.rstrip("%").strip().replace(",", ".")
        try:
            out.add(f"{float(num):.4f}")
        except ValueError:
            out.add(num)
    return out


def _has_unsupported_percentages(response: str, context: str) -> bool:
    return bool(_percentages(response) - _percentages(context))


def _is_repetitive(response: str, max_repeats: int = 3) -> bool:
    parts = re.split(r"(?<=[.!?])\s+|\n+", response.strip())
    counts: dict[str, int] = {}
    for p in parts:
        n = _normalize(p)
        if len(n) < 28:
            continue
        counts[n] = counts.get(n, 0) + 1
        if counts[n] >= max_repeats:
            return True
    return False


def validate(response: str, context: str, intent: str, question: str = "") -> GuardrailResult:
    issues: list[str] = []
    r = _normalize(response)
    q = _normalize(question)
    ctx = _normalize(context)

    if any(p in r for p in _FINANCIAL_ADVICE_PATTERNS):
        issues.append("financial_advice")

    if _has_unsupported_percentages(response, context):
        issues.append("hallucinated_number")

    if any(p in r for p in _CERTAINTY_PATTERNS):
        issues.append("excessive_certainty")

    if any(p in r for p in _VAR_ES_CONFUSION_PATTERNS):
        issues.append("var_es_confusion")

    if intent == "help_request" and any(m in r for m in _UNAVAILABLE_MARKERS):
        issues.append("help_unavailable_mismatch")

    invented_dates = [d for d in _RELATIVE_DATES if d in r and d not in ctx and d not in q]
    if invented_dates:
        issues.append("invented_relative_date")

    if _is_repetitive(response):
        issues.append("repetitive_response")

    if not issues:
        return GuardrailResult(is_valid=True)
    return GuardrailResult(is_valid=False, issues=issues, corrected=_correct(response, intent, issues))


def _correct(original: str, intent: str, issues: list[str]) -> str:
    if "financial_advice" in issues:
        return (
            "Je ne peux pas donner de conseil d'investissement personnalisé. "
            "Je peux par contre t'aider à interpréter les prévisions, la VaR, "
            "l'Expected Shortfall, le régime HMM ou les résultats de backtest."
        )

    if "var_es_confusion" in issues:
        return (
            "Correction importante : la VaR n'est pas une perte moyenne. "
            "La VaR 5% est un quantile conditionnel de perte (un seuil), et "
            "l'Expected Shortfall (ES) mesure la perte moyenne attendue au-delà "
            "de ce seuil. Par construction, |ES| ≥ |VaR|."
        )

    if "help_unavailable_mismatch" in issues:
        return (
            "Bienvenue sur le dashboard MASI Hybrid Forecasting. On peut commencer par :\n\n"
            "- La **prévision J+1** (rendement prédit, VaR 5%, ES 5%, régime HMM courant).\n"
            "- Le **backtest** (Sharpe par stratégie, validation Kupiec/Christoffersen).\n"
            "- La **stratégie production** (HMM-gate) et son écart vs Buy & Hold.\n\n"
            "Dis-moi par où tu veux commencer."
        )

    if "repetitive_response" in issues:
        return (
            original.strip().split("\n\n")[0]
            if "\n\n" in original
            else original.strip()[:300]
        )

    return original.strip()


def apply(response: str, context: str, intent: str, question: str = "") -> str:
    result = validate(response, context, intent, question)
    if result.is_valid:
        return response
    # Si seuls de petits soucis (hallucinated_number, help_unavailable_mismatch),
    # on garde la réponse originale après strip — sinon on remplace.
    if result.issues and set(result.issues).issubset(
        {"hallucinated_number", "help_unavailable_mismatch", "invented_relative_date"}
    ):
        return response.strip()
    return result.corrected or response
