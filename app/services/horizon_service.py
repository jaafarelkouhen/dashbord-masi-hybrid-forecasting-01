"""
Logique métier pour /api/horizon — projection MASI mai/juin 2026.

Lit les artefacts générés par `masi-pipeline forecast` (sibling project,
étape 10) :
  - outputs/etape10/forecast_may_june_2026_daily.csv     -> panel journalier
  - outputs/etape10/forecast_may_june_2026_monthly.csv   -> résumé mensuel
  - outputs/etape10/report.md                            -> en-tête narratif

Les CSV embarquent les bandes Monte-Carlo p10/p50/p90, le drift HMM appliqué,
et les rendements log/simple par jour. Le service les normalise pour le front.
"""

from __future__ import annotations

import re
from typing import Any

import numpy as np
import pandas as pd

from app.core import paths
from app.services import data_loader


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _parse_report_meta(text: str) -> dict[str, Any]:
    """Extrait ARIMA order/AIC, drift, n_mc, last obs du report.md."""
    meta: dict[str, Any] = {
        "last_obs_date": None,
        "last_obs_close": None,
        "arima_order": None,
        "arima_aic": None,
        "regime_drift": None,
        "n_mc": None,
    }
    # last obs : Dernière observation : **2026-04-17** (close 19,238.40)
    m = re.search(r"Derni[èe]re observation\s*:\s*\*\*([\d-]+)\*\*\s*\(close\s+([\d,]+\.?\d*)\)", text)
    if m:
        meta["last_obs_date"] = m.group(1)
        meta["last_obs_close"] = float(m.group(2).replace(",", ""))
    # arima : ARIMA retenu : `(1, 0, 0)` (AIC -33,021.47)
    m = re.search(r"ARIMA retenu\s*:\s*`([^`]+)`\s*\(AIC\s+([\-\d,\.]+)\)", text)
    if m:
        meta["arima_order"] = m.group(1)
        meta["arima_aic"] = float(m.group(2).replace(",", ""))
    # drift régime : Drift régime HMM appliqué : +0.00000 log-return/jour
    m = re.search(r"Drift r[ée]gime HMM appliqu[ée]\s*:\s*([+\-]?[\d\.]+)", text)
    if m:
        meta["regime_drift"] = float(m.group(1))
    # n_mc : Simulations Monte-Carlo : 5,000
    m = re.search(r"Simulations Monte-Carlo\s*:\s*([\d,]+)", text)
    if m:
        meta["n_mc"] = int(m.group(1).replace(",", ""))
    return meta


def _load_daily(year: int = 2026) -> pd.DataFrame:
    df = data_loader.load_csv(paths.horizon_daily_csv(year))
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    return df


def _load_monthly(year: int = 2026) -> pd.DataFrame:
    df = data_loader.load_csv(paths.horizon_monthly_csv(year))
    return df.copy()


def _load_report() -> str:
    p = paths.horizon_report_md()
    if not p.exists():
        return ""
    return p.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# API publique
# ---------------------------------------------------------------------------
def daily_series(year: int = 2026) -> dict[str, Any]:
    """Renvoie le panel journalier complet (forecast + observed + pipeline)."""
    df = _load_daily(year)
    cols = [
        "date", "source", "predicted_log_return", "predicted_close",
        "mc_p10", "mc_p50", "mc_p90", "ci95_low", "ci95_high",
        "month", "signal",
    ]
    out: dict[str, Any] = {"year": year}
    for c in cols:
        if c not in df.columns:
            continue
        values = df[c]
        if values.dtype.kind in "fi":
            arr = values.astype(float)
            arr = arr.where(np.isfinite(arr), None)
            out[c] = arr.where(arr.notna(), None).tolist()
        else:
            out[c] = values.astype(str).tolist()
    return out


def monthly_summary(year: int = 2026) -> dict[str, Any]:
    """Résumé mensuel : close début/fin, rendement, jours +/-."""
    df = _load_monthly(year)
    rows = []
    for r in df.to_dict("records"):
        rows.append({
            "month": str(r["month"]),
            "source": str(r["source"]),
            "n_days": int(r["n_days"]),
            "start_reference_close": float(r["start_reference_close"]),
            "end_predicted_close": float(r["end_predicted_close"]),
            "monthly_log_return": float(r["monthly_log_return"]),
            "monthly_simple_return_pct": float(r["monthly_simple_return_pct"]),
            "mean_daily_predicted_return": float(r["mean_daily_predicted_return"]),
            "positive_days": int(r["positive_days"]),
            "negative_days": int(r["negative_days"]),
        })
    return {"year": year, "months": rows}


def summary(year: int = 2026) -> dict[str, Any]:
    """Snapshot agrégé : KPIs + métadonnées modèle pour la vue Horizon."""
    daily_df = _load_daily(year)
    monthly_df = _load_monthly(year)
    meta = _parse_report_meta(_load_report())

    fc = daily_df[daily_df["source"] == "forecast"].copy()
    if fc.empty:
        first_close = last_close = None
        n_forecast = 0
    else:
        first_close = float(fc["predicted_close"].iloc[0])
        last_close = float(fc["predicted_close"].iloc[-1])
        n_forecast = int(len(fc))

    # Cumul fin de fenêtre vs dernière observation
    start_ref = meta.get("last_obs_close")
    cum_return_pct = None
    if start_ref and last_close:
        cum_return_pct = 100.0 * (last_close / start_ref - 1.0)

    months = monthly_summary(year)["months"]

    # Bandes p10/p90 fin de fenêtre — utile pour KPI "incertitude"
    band_low = band_high = None
    if not fc.empty and "mc_p10" in fc.columns and "mc_p90" in fc.columns:
        band_low = float(fc["mc_p10"].iloc[-1])
        band_high = float(fc["mc_p90"].iloc[-1])

    signal_counts = (
        daily_df["signal"].value_counts().to_dict() if "signal" in daily_df.columns else {}
    )

    return {
        "year": year,
        "last_obs_date": meta.get("last_obs_date"),
        "last_obs_close": meta.get("last_obs_close"),
        "arima_order": meta.get("arima_order"),
        "arima_aic": meta.get("arima_aic"),
        "regime_drift": meta.get("regime_drift"),
        "n_mc": meta.get("n_mc"),
        "n_forecast_days": n_forecast,
        "horizon_start_close": first_close,
        "horizon_end_close": last_close,
        "horizon_cum_return_pct": cum_return_pct,
        "band_p10_end": band_low,
        "band_p90_end": band_high,
        "signal_counts": {str(k): int(v) for k, v in signal_counts.items()},
        "months": months,
    }


def report_markdown() -> str:
    """Renvoie le rapport markdown complet (pour copie / debug)."""
    return _load_report()
