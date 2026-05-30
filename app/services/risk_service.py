"""Logique métier pour /api/risk."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from app.services import data_loader


def risk_series(window: int | None = None) -> dict[str, Any]:
    df = data_loader.load_risk_metrics()
    if window is not None and window > 0:
        df = df.tail(window)
    return {
        "dates": df["date"].astype(str).tolist(),
        "var_param_5": df["var_param_5"].astype(float).tolist(),
        "es_param_5": df["es_param_5"].astype(float).tolist(),
        "var_hist_5": df["var_hist_5"].astype(float).tolist(),
        "es_hist_5": df["es_hist_5"].astype(float).tolist(),
        "vol_garch": df["vol_garch"].astype(float).tolist(),
        "vol_realized_21": df["vol_realized_21"].astype(float).tolist(),
        "actual_return": df["actual_return"].astype(float).tolist(),
        "risk_regime": df["risk_regime"].astype(str).tolist(),
    }


def risk_validation() -> dict[str, Any]:
    """Tests Kupiec / Christoffersen (étape 7)."""
    return data_loader.load_risk_validation()


def risk_breaches() -> dict[str, Any]:
    """Compte des dépassements VaR 5% (paramétrique et historique)."""
    df = data_loader.load_risk_metrics()
    breaches_param = (df["actual_return"] < df["var_param_5"]).sum()
    breaches_hist = (df["actual_return"] < df["var_hist_5"]).sum()
    n = len(df)
    return {
        "n_days": int(n),
        "expected_5pct": int(round(n * 0.05)),
        "observed_param": int(breaches_param),
        "observed_hist": int(breaches_hist),
        "rate_param": float(breaches_param / n),
        "rate_hist": float(breaches_hist / n),
    }
