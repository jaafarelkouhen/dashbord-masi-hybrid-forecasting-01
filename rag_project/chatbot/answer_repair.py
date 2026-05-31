"""Answer repair — corrige les erreurs LLM connues sur le domaine MASI.

Règles uniquement basées sur str.replace / regex. Pas d'appel LLM. Pas de
lecture de CSV. Idempotent (peut être appliqué plusieurs fois sans effet).

Erreurs cibles :
1. Méta-commentaires (« D'accord, je vais répondre… »).
2. Bracket placeholders type [à compléter] → « indisponible » (préserve les
   marqueurs de citation [1], [2], [doc-3]).
3. Confusion régime HMM = direction.
4. MASI = marché algérien (hallucination courante des modèles non spécialisés).
5. Phrasing « modèle est configuré pour fonctionner dans un régime X » → faux.
6. Mentions Monte Carlo pour horizons 10/25 jours → faux.
7. Stratégie risk-managed dépend du rendement prédit → faux (dépend de la VaR).
8. VaR décrite comme « notre portefeuille » → MASI.
"""

from __future__ import annotations

import re


_PLACEHOLDER_KEYWORDS = re.compile(
    r"(compl[eé]ter|remplir|ins[eé]rer|[aà]\s*venir|[aà]\s*d[eé]finir|"
    r"[aà]\s*pr[eé]ciser|tbd|xxx+|chiffre\s+exact|valeur\s+exacte|"
    r"\.\.\.|placeholder|fill[\s\-]?in)",
    re.IGNORECASE,
)
_CITATION_LIKE = re.compile(r"^[\w\-:., ]{1,40}$")


def _replace_placeholder(match: re.Match) -> str:
    """Remplace seulement les vrais placeholders LLM, préserve [1] [doc-3]."""
    inner = match.group(1).strip()
    if not inner:
        return match.group(0)
    if _PLACEHOLDER_KEYWORDS.search(inner):
        return "indisponible"
    # Citations courtes (1, 12, doc-3, ref:42, a-b_c) : on garde.
    if _CITATION_LIKE.match(inner) and not any(c.isspace() for c in inner[1:-1].strip()):
        return match.group(0)
    # Long contenu sans mot-clé placeholder : on garde aussi (probablement du
    # texte légitime comme [voir section X] ou une formule LaTeX).
    return match.group(0)


def repair(answer: str) -> str:
    if not isinstance(answer, str) or not answer.strip():
        return answer or ""
    out = answer

    # 1. Méta-commentaires en intro
    meta_patterns = (
        r"^\s*D['' ]?accord,?\s+je vais r[eé]pondre directement[^.]*\.\s*",
        r"^\s*Voici une r[eé]ponse attendue\s*:?\s*",
        r"^\s*Bien s[uû]r,?\s+je vais[^.]*\.\s*",
    )
    for pat in meta_patterns:
        out = re.sub(pat, "", out, flags=re.IGNORECASE)

    # 2. Placeholders bracket → indisponible (préserve [1], [doc-3], etc.)
    out = re.sub(r"\[([^\]]+)\]", _replace_placeholder, out)
    out = out.replace("dans le contexte dynamique", "dans le dashboard")

    # 3. Régime HMM confond avec direction
    direction_patterns = (
        r"[^.]*r[eé]gime HMM[^.]*confirme[^.]*(?:baisse|hausse|direction)[^.]*\.",
        r"[^.]*HMM[^.]*pr[eé]dit[^.]*(?:direction|tendance|trend|baisse|hausse)[^.]*\.",
        r"[^.]*r[eé]gime Bear[^.]*ordre de vente[^.]*\.",
        r"[^.]*r[eé]gime Bull[^.]*ordre d['' ]achat[^.]*\.",
    )
    if any(re.search(p, out, flags=re.IGNORECASE) for p in direction_patterns):
        for p in direction_patterns:
            out = re.sub(
                p,
                " Le régime HMM décrit la volatilité conditionnelle, pas la direction du MASI.",
                out,
                flags=re.IGNORECASE,
            )

    # 4. MASI = marché algérien
    lower = out.lower()
    if "masi" in lower and ("algér" in lower or "alger" in lower):
        replacements = (
            ("Marché Algérien des Valeurs Mobilières", "marché actions marocain"),
            ("marché algérien des valeurs mobilières", "marché actions marocain"),
            ("marché algérien", "marché marocain"),
            ("Marché algérien", "marché marocain"),
            ("algerian market", "Moroccan All Shares Index"),
        )
        for old, new in replacements:
            out = out.replace(old, new)

    # 5. « modèle configuré pour fonctionner dans un régime »
    if "configur" in out.lower() and "regime" in out.lower():
        out = re.sub(
            r"Le mod[eè]le est configur[eé][^.]*r[eé]gime[^.]*\.",
            "Le régime affiché est l'état courant estimé par le HMM à partir des données récentes.",
            out,
            flags=re.IGNORECASE,
        )

    # 6. Monte Carlo pour 10/25j
    if "monte carlo" in out.lower():
        out = re.sub(
            r"Les pr[eé]visions[^.]*(?:10|25)\s*jours[^.]*Monte Carlo[^.]*\.",
            (
                "Les prévisions 10 jours et 25 jours ne sont pas calculées par "
                "Monte Carlo : ce sont des extensions opérationnelles du modèle "
                "1 jour (volatilité scalée en √horizon, moyenne agrégée)."
            ),
            out,
            flags=re.IGNORECASE,
        )

    # 7. Risk-managed = fonction du rendement prédit (faux)
    if "risk-managed" in out.lower() or "risk managed" in out.lower():
        out = re.sub(
            r"(poids|exposition)\s+risk[-\s]managed\s+d[eé]pend\s+(?:de\s+la\s+)?pr[eé]vision\s+de\s+rendement",
            r"\1 risk-managed dépend de la VaR prédite",
            out,
            flags=re.IGNORECASE,
        )

    # 8. « notre portefeuille » → MASI
    out = re.sub(r"\bnotre portefeuille\b", "le MASI", out, flags=re.IGNORECASE)
    out = re.sub(r"\bnotre prévision de VaR\b", "la prévision de VaR", out, flags=re.IGNORECASE)
    out = re.sub(
        r"gestionnaire de portefeuille [aà] risque non manag[eé]",
        "Buy and Hold",
        out,
        flags=re.IGNORECASE,
    )

    # Nettoyage final
    out = re.sub(r"\n{3,}", "\n\n", out).strip()
    return out
