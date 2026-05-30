"""
Garde-fous post-LLM : empêche les hallucinations de chiffres financiers et
les confusions VaR ↔ ES.

Principe : si le LLM mentionne un nombre qui n'apparaît dans aucun document
sourcé NI dans le snapshot live, on signale (sans censurer dur).
"""

from __future__ import annotations

import re


_FINANCIAL_NUMBER = re.compile(r"-?\d+(?:[.,]\d+)?\s*%?")


def detect_unsourced_numbers(answer: str, sourced_text: str, live_text: str) -> list[str]:
    """Renvoie la liste des nombres présents dans la réponse mais absents
    du contexte sourcé OU du snapshot live."""
    answer_nums = set(_extract(answer))
    ctx_nums = set(_extract(sourced_text)) | set(_extract(live_text))
    return sorted(answer_nums - ctx_nums)


def _extract(text: str) -> list[str]:
    return [m.group(0).replace(" ", "") for m in _FINANCIAL_NUMBER.finditer(text or "")]


def warn_var_es_confusion(answer: str) -> str | None:
    """Vérifie qu'on ne confond pas VaR et ES dans la réponse."""
    a = answer.lower()
    if "var" in a and "es " in a:
        # Si les deux sont mentionnés sans distinction claire (heuristique faible)
        if "expected shortfall" not in a and "es estime" not in a and "var estime" not in a:
            return "La réponse mentionne VaR et ES sans les distinguer explicitement."
    return None


def append_disclaimer(answer: str) -> str:
    """Ajoute un disclaimer si la réponse semble donner un conseil financier."""
    advice_markers = ("achetez", "vendez", "achète", "vends", "investis dans",
                       "il faut acheter", "il faut vendre")
    if any(m in answer.lower() for m in advice_markers):
        return (
            answer.rstrip()
            + "\n\n_Ce dashboard est un outil de recherche, pas un conseil financier._"
        )
    return answer
