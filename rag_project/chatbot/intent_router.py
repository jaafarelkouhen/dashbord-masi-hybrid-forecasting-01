"""Routeur d'intentions — embeddings centroids + fallback lexical.

8 intents canoniques :
- help_request    : « par où commencer », « aide moi », salutations.
- definition_query: « c'est quoi la VaR », explications conceptuelles.
- forecast_query  : prévision live (rendement, VaR, ES, régime, vol).
- risk_query      : VaR/ES, breaches, validation Kupiec/Christoffersen.
- regime_query    : régime HMM, posteriors, transitions.
- strategy_query  : Sharpe, drawdown, HMM-gate, comparatif stratégies.
- methodology_query: anti-leakage, architecture, walk-forward, features.
- out_of_scope    : tout le reste (météo, sport, conseil d'invest, etc.).

Algorithme :
1. Cas court de salutation/aide → help_request direct.
2. Embeddings : on calcule un centroide par intent à partir d'exemples,
   puis cosine similarity avec la question.
3. Si max_score < seuil → out_of_scope.
4. Si l'embedder n'est pas chargeable → fallback lexical (TF cosine).
"""

from __future__ import annotations

import logging
import math
import re
import unicodedata
from collections import Counter
from functools import lru_cache

from rag_project.core.config import SETTINGS

log = logging.getLogger(__name__)


INTENT_DESCRIPTIONS: dict[str, str] = {
    "help_request": (
        "Demande d'aide, salutation, guidage, question sur comment utiliser le "
        "dashboard ou par ou commencer. Exemples : salut, bonjour, oui, ok, "
        "commence, aide moi, guide moi, que peux-tu faire."
    ),
    "definition_query": (
        "Question pedagogique : definition, explication, difference entre "
        "concepts comme MASI, VaR, Expected Shortfall, regime HMM, EGARCH, "
        "CNN-LSTM, DSR, Sharpe. Exemples : c est quoi, qu est ce que, "
        "que signifie, veut dire, definis, explique la difference."
    ),
    "forecast_query": (
        "Question sur la prevision live du dashboard : rendement prevu, "
        "prediction du jour, forecast J+1, valeur de la VaR actuelle, ES "
        "actuelle, volatilite du jour, regime courant, direction estimee MASI."
    ),
    "risk_query": (
        "Question sur la couche risque : VaR, Expected Shortfall, EGARCH, "
        "volatilite GARCH, breaches, violations VaR, validation statistique, "
        "Kupiec, Christoffersen, p-values, calibration du risque."
    ),
    "regime_query": (
        "Question sur le regime HMM : Bear Bull Neutral, transitions, "
        "posteriors, streak, switch pressure, mean duration, persistance "
        "des regimes."
    ),
    "strategy_query": (
        "Question sur les strategies de trading : HMM-gate, CNN-LSTM nu, "
        "VaR budget, risk-targeting, Buy and Hold, Sharpe ratio, Sortino, "
        "Calmar, drawdown, turnover, comparatif des strategies, meilleure "
        "stratégie, backtest comparatif."
    ),
    "methodology_query": (
        "Question sur la methodologie : anti-leakage, walk-forward, "
        "architecture du modele, feature engineering, sequence length, train "
        "validation test, hyperparametres, deflated Sharpe ratio, "
        "comment marche, comment fonctionne."
    ),
    "out_of_scope": (
        "Question hors perimetre du projet : meteo, sport, voyage, recette, "
        "traduction, politique, crypto externe, autres marches actions, "
        "conseil personnalise d'achat ou de vente, sujet sans lien avec MASI."
    ),
}


INTENT_EXAMPLES: dict[str, tuple[str, ...]] = {
    "help_request": (
        INTENT_DESCRIPTIONS["help_request"],
        "bonjour",
        "salut",
        "hello",
        "que peux tu faire",
        "aide moi a commencer",
        "guide moi dans le dashboard",
        "par ou commencer",
        "ok vas y",
    ),
    "definition_query": (
        INTENT_DESCRIPTIONS["definition_query"],
        "c'est quoi la VaR",
        "explique l'Expected Shortfall",
        "difference entre VaR et ES",
        "que signifie regime HMM",
        "definis EGARCH",
        "qu'est ce que le DSR",
        "explique le HMM-gate",
    ),
    "forecast_query": (
        INTENT_DESCRIPTIONS["forecast_query"],
        "quelle est la prevision du jour",
        "rendement predit aujourd'hui",
        "donne moi le snapshot live",
        "valeur de la VaR du jour",
        "quel est le regime courant",
        "prediction J+1 du MASI",
    ),
    "risk_query": (
        INTENT_DESCRIPTIONS["risk_query"],
        "combien de breaches sur le test",
        "p-value de Kupiec",
        "test de Christoffersen verdict",
        "validation statistique de la VaR",
        "expected shortfall paramétrique",
        "vol GARCH actuelle",
    ),
    "regime_query": (
        INTENT_DESCRIPTIONS["regime_query"],
        "regime HMM actuel",
        "transitions entre regimes",
        "posterior du regime courant",
        "streak de regime",
        "probabilite de switch",
        "duree moyenne du regime Bull",
    ),
    "strategy_query": (
        INTENT_DESCRIPTIONS["strategy_query"],
        "meilleure strategie par Sharpe",
        "comparaison des strategies",
        "performance du HMM-gate",
        "drawdown du CNN-LSTM nu",
        "Sortino du risk-targeting",
        "equity finale par strategie",
        "turnover de la production",
    ),
    "methodology_query": (
        INTENT_DESCRIPTIONS["methodology_query"],
        "comment marche le CNN-LSTM",
        "anti-leakage du modele",
        "explique le walk-forward",
        "architecture du HMM",
        "features utilisees",
        "split train val test",
        "comment fonctionne EGARCH",
    ),
    "out_of_scope": (
        INTENT_DESCRIPTIONS["out_of_scope"],
        "meteo a Paris",
        "donne une recette de cuisine",
        "traduis ce texte",
        "parle moi de football",
        "dois-je acheter le MASI",
        "dois-je vendre",
        "quelle action acheter",
    ),
}


_STOP = {
    "a", "au", "aux", "avec", "ce", "ces", "comme", "dans", "de", "des", "du",
    "elle", "en", "est", "et", "il", "je", "la", "le", "les", "ma", "me", "moi",
    "mon", "ne", "pas", "pour", "que", "qui", "se", "sur", "ta", "te", "tu",
    "un", "une",
}


def _normalize(text: str) -> str:
    t = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in t if not unicodedata.combining(ch)).replace("'", " ")


def _tokenize(text: str) -> list[str]:
    return [
        t for t in re.findall(r"[a-z0-9]+", _normalize(text))
        if len(t) > 1 and t not in _STOP
    ]


def _is_short_help(question: str) -> bool:
    normalized = " ".join(re.findall(r"[a-z0-9]+", _normalize(question)))
    if len(normalized.split()) > 8:
        return False
    domain = ("var", "es", "shortfall", "forecast", "prevision", "prediction",
              "backtest", "kupiec", "christoffersen", "hmm", "egarch", "regime",
              "masi", "sharpe", "drawdown")
    if any(d in normalized for d in domain):
        return False
    greetings = {"salut", "bonjour", "bonsoir", "hello", "hi", "hey", "yo"}
    helpers = ("aide moi", "guide moi", "par ou commencer", "que peux tu faire",
               "tu peux m aider", "commence")
    words = set(normalized.split())
    if words & greetings:
        return True
    if any(h in normalized for h in helpers):
        return True
    return False


# --- Override "live" : court-circuite l'embedder pour les questions qui
# demandent explicitement une valeur courante (« quel est le VaR actuel »,
# « régime HMM du jour »…). L'embedder confond souvent ces questions avec
# `definition_query`, ce qui prive le fallback du snapshot live.
_LIVE_HINT_PATTERN = re.compile(
    r"\b(actuel(?:le|s|les)?|aujourd\s*hui|du\s+jour|ce\s+jour|"
    r"courant(?:e|es|s)?|maintenant|en\s+ce\s+moment|live|j\s*1|j\s*\+\s*1)\b"
)
_RISK_TERM_PATTERN = re.compile(
    r"\b(var|es|shortfall|breach(?:es)?|kupiec|christoffersen|garch|"
    r"volatilit[eé]|vol)\b"
)
_REGIME_TERM_PATTERN = re.compile(
    r"\b(r[eé]gime|hmm|bull|bear|neutral|transition|posterior|streak|switch)\b"
)
_FORECAST_TERM_PATTERN = re.compile(
    r"\b(forecast|pr[eé]vision|pr[eé]diction|rendement|pr[eé]dit|snapshot)\b"
)
_STRATEGY_TERM_PATTERN = re.compile(
    r"\b(sharpe|drawdown|sortino|calmar|strat[eé]gie|backtest|equity|turnover)\b"
)


def _classify_live_override(question: str) -> str | None:
    """Retourne un intent live si la question combine marqueur temporel +
    terme métier. Sinon None (on laisse les embeddings décider)."""
    normalized = _normalize(question)
    if not _LIVE_HINT_PATTERN.search(normalized):
        return None
    # Priorité métier : risque > régime > stratégie > prévision (catch-all).
    if _RISK_TERM_PATTERN.search(normalized):
        return "risk_query"
    if _REGIME_TERM_PATTERN.search(normalized):
        return "regime_query"
    if _STRATEGY_TERM_PATTERN.search(normalized):
        return "strategy_query"
    if _FORECAST_TERM_PATTERN.search(normalized):
        return "forecast_query"
    # Marqueur temporel seul (« snapshot du jour ») → snapshot complet.
    return "forecast_query"


@lru_cache(maxsize=1)
def _intent_centroids():
    """Calcule un centroide par intent depuis les embeddings d'exemples."""
    import numpy as np

    from rag_project.rag.retriever import _get_collection  # type: ignore

    # On utilise SentenceTransformer directement (Chroma le wrappe mais on
    # veut pouvoir encoder hors-Chroma).
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        log.warning("sentence-transformers absent — intent router en mode lexical.")
        return None

    model = SentenceTransformer(SETTINGS.embedding_model, device=SETTINGS.embedding_device)
    centroids: dict[str, "np.ndarray"] = {}
    for intent, examples in INTENT_EXAMPLES.items():
        emb = model.encode(list(examples), convert_to_numpy=True, show_progress_bar=False)
        centroid = emb.mean(axis=0)
        norm = float((centroid * centroid).sum() ** 0.5)
        centroids[intent] = centroid / norm if norm else centroid
    return centroids


def _cosine(a, b) -> float:
    import numpy as np

    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def _classify_embeddings(question: str) -> str | None:
    centroids = _intent_centroids()
    if centroids is None:
        return None
    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np  # noqa: F401
    except ImportError:
        return None
    model = SentenceTransformer(SETTINGS.embedding_model, device=SETTINGS.embedding_device)
    q_emb = model.encode([question.strip()], convert_to_numpy=True, show_progress_bar=False)[0]
    scored = sorted(
        ((intent, _cosine(q_emb, centroid)) for intent, centroid in centroids.items()),
        key=lambda x: x[1],
        reverse=True,
    )
    best, score = scored[0]
    log.debug("Intent embeddings ranking : %s", scored[:3])
    if score < SETTINGS.intent_similarity_threshold:
        return "out_of_scope"
    return best


_DOC_VECTORS = {
    intent: Counter(_tokenize(desc)) for intent, desc in INTENT_DESCRIPTIONS.items()
}


def _cosine_counter(left: Counter, right: Counter) -> float:
    common = set(left) & set(right)
    num = sum(left[t] * right[t] for t in common)
    if num == 0:
        return 0.0
    lnorm = math.sqrt(sum(v * v for v in left.values()))
    rnorm = math.sqrt(sum(v * v for v in right.values()))
    if lnorm == 0 or rnorm == 0:
        return 0.0
    return num / (lnorm * rnorm)


def _classify_lexical(question: str) -> str:
    qv = Counter(_tokenize(question))
    if not qv:
        return "out_of_scope"
    scored = sorted(
        ((intent, _cosine_counter(qv, dv)) for intent, dv in _DOC_VECTORS.items()),
        key=lambda x: x[1],
        reverse=True,
    )
    best, score = scored[0]
    if score < 0.08:
        return "out_of_scope"
    return best


def classify(question: str) -> str:
    """Point d'entrée principal du routeur."""
    if not isinstance(question, str) or not question.strip():
        return "help_request"
    if _is_short_help(question):
        return "help_request"
    override = _classify_live_override(question)
    if override is not None:
        log.debug("Intent override live → %s", override)
        return override
    try:
        intent = _classify_embeddings(question)
        if intent is not None:
            return intent
    except Exception as exc:
        log.warning("Intent embedding échec — fallback lexical : %s", exc)
    return _classify_lexical(question)


def warm() -> None:
    """Pré-calcule les centroides d'intent au démarrage."""
    try:
        _intent_centroids()
    except Exception as exc:
        log.warning("Warm intent router échoué : %s", exc)
