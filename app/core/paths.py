"""Chemins canoniques vers les artefacts du projet masi-hybrid-forecasting."""

from __future__ import annotations

from pathlib import Path

from app.core.config import settings


def masi_root() -> Path:
    return settings.masi_project_root


def outputs_dir() -> Path:
    return masi_root() / "outputs"


def reports_dir() -> Path:
    return masi_root() / "reports"


def docs_dir() -> Path:
    return masi_root() / "docs"


# Artefacts canoniques (étapes 6/7/8)
def predictions_csv() -> Path:
    return outputs_dir() / "etape6" / "etape6_final_predictions.csv"


def backtest_metrics_json() -> Path:
    return outputs_dir() / "etape6" / "backtest_metrics.json"


def equity_curves_csv() -> Path:
    return outputs_dir() / "etape6" / "equity_curves.csv"


def risk_metrics_csv() -> Path:
    return outputs_dir() / "etape7" / "risk_metrics_test.csv"


def risk_validation_json() -> Path:
    return outputs_dir() / "etape7" / "risk_validation.json"


def strategies_metrics_json() -> Path:
    return outputs_dir() / "etape8" / "strategies_metrics.json"


def strategies_returns_csv() -> Path:
    return outputs_dir() / "etape8" / "strategies_returns.csv"


def final_results_md() -> Path:
    return reports_dir() / "final_results.md"


# Étape 10 — projection out-of-sample mai/juin (ARIMA + Monte-Carlo + drift HMM)
def horizon_dir() -> Path:
    return outputs_dir() / "etape10"


def horizon_daily_csv(year: int = 2026) -> Path:
    return horizon_dir() / f"forecast_may_june_{year}_daily.csv"


def horizon_monthly_csv(year: int = 2026) -> Path:
    return horizon_dir() / f"forecast_may_june_{year}_monthly.csv"


def horizon_report_md() -> Path:
    return horizon_dir() / "report.md"


def horizon_fan_png(year: int = 2026) -> Path:
    return horizon_dir() / f"forecast_{year}_fan.png"


def horizon_monthly_distribution_png(year: int = 2026) -> Path:
    return horizon_dir() / f"forecast_{year}_monthly_distribution.png"
