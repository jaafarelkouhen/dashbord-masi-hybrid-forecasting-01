"""Logique métier pour /api/forecast."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from app.services import data_loader


def latest_forecast() -> dict[str, Any]:
    """Renvoie la dernière prédiction TEST (jour J+1 du backtest)."""
    df = data_loader.load_risk_metrics()
    last = df.iloc[-1]
    return {
        "date": str(last["date"]),
        "predicted_return": float(last["predicted_return"]),
        "actual_return": float(last["actual_return"]),
        "signal": int(last["signal_raw"]),
        "position": float(last["position"]),
        "regime": str(last["regime_name"]),
        "risk_regime": str(last["risk_regime"]),
        "var_5": float(last["var_param_5"]),
        "es_5": float(last["es_param_5"]),
        "vol_garch": float(last["vol_garch"]),
        "equity": float(last["equity"]),
        "strategy_name": str(last["strategy_name"]),
    }


def forecast_series(window: int | None = None) -> dict[str, Any]:
    """Série complète (ou les `window` derniers points) pour les charts."""
    df = data_loader.load_risk_metrics()
    if window is not None and window > 0:
        df = df.tail(window)
    return {
        "dates": df["date"].astype(str).tolist(),
        "predicted_return": df["predicted_return"].astype(float).tolist(),
        "actual_return": df["actual_return"].astype(float).tolist(),
        "equity": df["equity"].astype(float).tolist(),
        "position": df["position"].astype(float).tolist(),
        "regime": df["regime_name"].astype(str).tolist(),
        "risk_regime": df["risk_regime"].astype(str).tolist(),
    }


def kpis() -> dict[str, Any]:
    """KPI haut-niveau affichés sur la home page."""
    df = data_loader.load_predictions()
    metrics = data_loader.load_backtest_metrics()

    n = len(df)
    final_equity = float(df["equity"].iloc[-1])
    cum_return = final_equity - 1.0

    # Directional accuracy quand position != 0
    active = df[df["position"] != 0]
    if len(active) > 0:
        correct = (np.sign(active["predicted_return"]) == np.sign(active["actual_return"])).sum()
        directional = float(correct / len(active))
    else:
        directional = 0.0

    return {
        "n_test_days": int(n),
        "test_range": [str(df["date"].iloc[0]), str(df["date"].iloc[-1])],
        "final_equity": final_equity,
        "cumulative_return": cum_return,
        "directional_accuracy": directional,
        "primary_cost_bps": metrics.get("primary_cost_bps", 5),
        "strategy_name": str(df["strategy_name"].iloc[-1]),
    }


def regime_distribution() -> dict[str, Any]:
    """Distribution des régimes HMM sur la période TEST."""
    df = data_loader.load_predictions()
    counts = df["regime_name"].value_counts().to_dict()
    total = int(sum(counts.values()))
    return {
        "regimes": [
            {"name": str(name), "count": int(count), "share": float(count / total)}
            for name, count in counts.items()
        ],
        "total": total,
    }
