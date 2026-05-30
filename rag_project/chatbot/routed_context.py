"""Routed context builder — assemble le contexte selon l'intent.

Chaque intent active un sous-ensemble de routes :
- live      : snapshot dashboard (prévision, VaR, ES, régime).
- rag       : chunks documentaires (Chroma + BM25).
- backtest  : métriques backtest (stratégies, Sharpe, drawdown).
- risk      : métriques risque (breaches, Kupiec, Christoffersen).

Le live snapshot est fourni par l'appelant (le backend dashboard l'injecte
via les services de prediction/forecast). Le RAG est local au rag_project.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from rag_project.core.config import SETTINGS
from rag_project.rag.retriever import RetrievedChunk, search

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class RoutedContext:
    live_text: str
    live_snapshot: dict | None
    rag_text: str
    rag_chunks: tuple[RetrievedChunk, ...]
    validation_text: str
    routes: tuple[str, ...]
    used_rag: bool
    used_live: bool


_INTENT_ROUTES: dict[str, tuple[str, ...]] = {
    "help_request":      ("live",),
    "definition_query":  ("rag",),
    "forecast_query":    ("live", "rag"),
    "risk_query":        ("live", "rag"),
    "regime_query":      ("live", "rag"),
    "strategy_query":    ("live", "rag"),
    "methodology_query": ("rag",),
    "out_of_scope":      (),
}


def _format_live(snapshot: dict | None) -> str:
    if not snapshot:
        return ""
    def pct(key: str, digits: int = 4) -> str:
        v = snapshot.get(key)
        if v is None:
            return "—"
        try:
            return f"{float(v) * 100:+.{digits}f}%"
        except (TypeError, ValueError):
            return str(v)
    return (
        f"### Snapshot live ({snapshot.get('date', '—')})\n"
        f"- Stratégie : {snapshot.get('strategy_name', '—')}\n"
        f"- Rendement prédit J+1 : {pct('predicted_return', 3)} "
        f"(actuel {pct('actual_return', 3)} · position "
        f"{snapshot.get('position', '—')})\n"
        f"- VaR 5% : {pct('var_5', 2)}\n"
        f"- ES 5% : {pct('es_5', 2)}\n"
        f"- Vol GARCH : {pct('vol_garch', 2)}\n"
        f"- Régime HMM : {snapshot.get('regime', '—')} "
        f"(streak {snapshot.get('streak_days', '—')}j, "
        f"P(switch) {snapshot.get('p_regime_switch_next', 0):.2f})\n"
        f"- Risk score : {snapshot.get('risk_score', '—')}/100\n"
    )


def _format_rag(chunks: list[RetrievedChunk]) -> str:
    if not chunks:
        return ""
    parts: list[str] = []
    for i, c in enumerate(chunks, 1):
        head = f"[{i}] ({c.title} — {c.section})"
        parts.append(f"{head}\n{c.text}")
    out = "\n\n".join(parts)
    if len(out) > SETTINGS.max_rag_context_chars:
        out = out[: SETTINGS.max_rag_context_chars].rstrip() + "\n\n[Contexte tronqué]"
    return out


def build(
    question: str,
    intent: str,
    live_snapshot: dict | None = None,
    rag_k: int | None = None,
) -> RoutedContext:
    routes = _INTENT_ROUTES.get(intent, ("rag",))

    live_text = ""
    if "live" in routes and live_snapshot:
        live_text = _format_live(live_snapshot)

    chunks: list[RetrievedChunk] = []
    rag_text = ""
    if "rag" in routes:
        chunks = search(question, k=rag_k or SETTINGS.top_k)
        rag_text = _format_rag(chunks)

    validation_text = "\n\n".join(p for p in (live_text, rag_text) if p.strip())

    return RoutedContext(
        live_text=live_text,
        live_snapshot=live_snapshot if "live" in routes else None,
        rag_text=rag_text,
        rag_chunks=tuple(chunks),
        validation_text=validation_text,
        routes=routes,
        used_rag=bool(rag_text.strip()),
        used_live=bool(live_text.strip()),
    )
