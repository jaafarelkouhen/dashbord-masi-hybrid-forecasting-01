"""
Couche d'accès aux artefacts du pipeline MASI.

Toutes les fonctions sont cachées via lru_cache + invalidation par mtime du fichier,
donc on rechargera automatiquement les CSV/JSON si le pipeline est relancé.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd

from app.core import paths


def _mtime(p: Path) -> float:
    return p.stat().st_mtime if p.exists() else 0.0


@lru_cache(maxsize=8)
def _load_csv_cached(path_str: str, mtime: float) -> pd.DataFrame:
    return pd.read_csv(path_str)


@lru_cache(maxsize=8)
def _load_json_cached(path_str: str, mtime: float) -> Any:
    with open(path_str, "r", encoding="utf-8") as fh:
        return json.load(fh)


def load_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            f"Artefact manquant : {path}. Lance le pipeline MASI "
            f"(`masi-pipeline export --strategy hmm_gate`)."
        )
    return _load_csv_cached(str(path), _mtime(path))


def load_json(path: Path) -> Any:
    if not path.exists():
        raise FileNotFoundError(
            f"Artefact manquant : {path}. Lance la commande de pipeline correspondante."
        )
    return _load_json_cached(str(path), _mtime(path))


# --- Accès haut niveau ---


def load_predictions() -> pd.DataFrame:
    return load_csv(paths.predictions_csv())


def load_risk_metrics() -> pd.DataFrame:
    return load_csv(paths.risk_metrics_csv())


def load_strategies_metrics() -> dict[str, Any]:
    return load_json(paths.strategies_metrics_json())


def load_backtest_metrics() -> dict[str, Any]:
    return load_json(paths.backtest_metrics_json())


def load_risk_validation() -> dict[str, Any]:
    return load_json(paths.risk_validation_json())


def load_equity_curves() -> pd.DataFrame:
    return load_csv(paths.equity_curves_csv())


def load_strategies_returns() -> pd.DataFrame:
    return load_csv(paths.strategies_returns_csv())
