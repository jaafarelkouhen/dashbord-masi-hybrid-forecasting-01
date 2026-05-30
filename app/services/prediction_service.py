"""
Module de "prédiction avancée" — risk score par jour et anticipation des régimes.

Inspiré de la consigne "Bug Risk Score" / "time-to-close" du brief :
on transpose ces idées au contexte MASI :
  - **Risk Score** par jour : combine VaR (paramétrique), volatilité GARCH normalisée,
    et probabilité d'être en régime Bear → score 0..100 (plus haut = plus risqué).
  - **Time-in-regime** : nb de jours consécutifs dans le régime courant.
  - **Anticipated transition** : heuristique simple basée sur la persistance
    historique de chaque régime.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from app.services import data_loader


def _normalize(series: pd.Series, lower: float = 0.05, upper: float = 0.95) -> pd.Series:
    q_lo = series.quantile(lower)
    q_hi = series.quantile(upper)
    if q_hi - q_lo < 1e-12:
        return pd.Series(np.zeros(len(series)), index=series.index)
    clipped = series.clip(q_lo, q_hi)
    return (clipped - q_lo) / (q_hi - q_lo)


def risk_score_series(window: int = 252) -> dict[str, Any]:
    """Risk score 0..100 par jour, fenêtre récente (252 jours = ~1 an)."""
    df = data_loader.load_risk_metrics().copy()

    # VaR magnitude (plus négatif = plus risqué → on prend la valeur absolue)
    var_mag = (-df["var_param_5"]).clip(lower=0)
    var_n = _normalize(var_mag)

    # Volatilité GARCH
    vol_n = _normalize(df["vol_garch"].abs())

    # Indicateur Bear régime
    bear_flag = (df["regime_name"].astype(str).str.lower() == "bear").astype(float)

    # Pondération : 40% VaR, 40% vol, 20% bear flag
    score = (0.4 * var_n + 0.4 * vol_n + 0.2 * bear_flag) * 100.0
    df["risk_score"] = score.round(1)

    out = df.tail(window) if window > 0 else df
    return {
        "dates": out["date"].astype(str).tolist(),
        "risk_score": out["risk_score"].astype(float).tolist(),
        "regime": out["regime_name"].astype(str).tolist(),
    }


def regime_persistence() -> dict[str, Any]:
    """
    Persistance moyenne (durée moyenne d'un séjour) par régime, calculée
    sur la période TEST. Utile pour estimer une "anticipated transition".
    """
    df = data_loader.load_predictions()
    regimes = df["regime_name"].astype(str).tolist()

    runs: dict[str, list[int]] = {}
    if not regimes:
        return {"regimes": [], "current": None, "current_streak": 0}

    current_reg = regimes[0]
    current_len = 1
    for r in regimes[1:]:
        if r == current_reg:
            current_len += 1
        else:
            runs.setdefault(current_reg, []).append(current_len)
            current_reg = r
            current_len = 1
    runs.setdefault(current_reg, []).append(current_len)

    summary = [
        {
            "name": name,
            "n_runs": len(lengths),
            "mean_duration": float(np.mean(lengths)) if lengths else 0.0,
            "median_duration": float(np.median(lengths)) if lengths else 0.0,
            "max_duration": int(max(lengths)) if lengths else 0,
        }
        for name, lengths in runs.items()
    ]
    summary.sort(key=lambda x: x["mean_duration"], reverse=True)

    return {
        "regimes": summary,
        "current": current_reg,
        "current_streak": current_len,
    }


def next_day_risk_snapshot() -> dict[str, Any]:
    """
    Snapshot synthétique pour le widget "Predicted next-day risk" :
    - dernier risk_score
    - VaR 5% / ES 5% du dernier jour
    - probabilité (heuristique) que le régime suivant soit Bear, basée sur la
      persistance moyenne.
    """
    rs = risk_score_series(window=0)
    rp = regime_persistence()

    last_score = float(rs["risk_score"][-1]) if rs["risk_score"] else 0.0
    last_date = rs["dates"][-1] if rs["dates"] else ""
    last_regime = rp["current"]
    streak = rp["current_streak"]

    # Heuristique simple : P(switch) augmente avec la durée du régime courant
    persistence = next(
        (r["mean_duration"] for r in rp["regimes"] if r["name"] == last_regime),
        20.0,
    )
    p_switch = float(min(1.0, max(0.0, streak / (2 * persistence)))) if persistence > 0 else 0.0

    # Risk metrics du dernier jour
    rm = data_loader.load_risk_metrics().iloc[-1]

    return {
        "date": last_date,
        "risk_score": last_score,
        "current_regime": last_regime,
        "streak_days": streak,
        "p_regime_switch_next": round(p_switch, 3),
        "var_5_param": float(rm["var_param_5"]),
        "es_5_param": float(rm["es_param_5"]),
        "vol_garch": float(rm["vol_garch"]),
        "risk_regime": str(rm["risk_regime"]),
    }
