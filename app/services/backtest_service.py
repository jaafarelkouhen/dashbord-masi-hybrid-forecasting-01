"""Logique métier pour /api/backtest et /api/strategies."""

from __future__ import annotations

from typing import Any

from app.services import data_loader


def list_strategies() -> list[dict[str, Any]]:
    """Renvoie la liste des stratégies avec leurs métriques étape 8."""
    data = data_loader.load_strategies_metrics()
    rows: list[dict[str, Any]] = []
    for key, strat in data.get("strategies", {}).items():
        rows.append(
            {
                "id": key,
                "label": strat.get("label", key),
                "ann_return": strat.get("ann_return"),
                "ann_vol": strat.get("ann_vol"),
                "sharpe": strat.get("sharpe"),
                "sortino": strat.get("sortino"),
                "max_drawdown": strat.get("max_drawdown"),
                "calmar": strat.get("calmar"),
                "final_equity": strat.get("final_equity"),
                "n_trades": strat.get("n_trades"),
                "turnover_mean": strat.get("turnover_mean"),
                "pct_days_active": strat.get("pct_days_active"),
            }
        )
    # Tri par Sharpe décroissant
    rows.sort(key=lambda r: (r["sharpe"] or 0.0), reverse=True)
    return rows


def strategy_detail(strategy_id: str) -> dict[str, Any]:
    data = data_loader.load_strategies_metrics()
    strat = data.get("strategies", {}).get(strategy_id)
    if not strat:
        raise KeyError(f"Stratégie inconnue : {strategy_id}")
    return strat


def equity_curves_series() -> dict[str, Any]:
    """Courbes d'équité de toutes les stratégies (étape 8)."""
    df = data_loader.load_equity_curves()
    dates = df["date"].astype(str).tolist() if "date" in df.columns else list(range(len(df)))
    series = {}
    for col in df.columns:
        if col == "date":
            continue
        series[col] = df[col].astype(float).tolist()
    return {"dates": dates, "series": series}


def backtest_summary() -> dict[str, Any]:
    """Synthèse du backtest principal (modèle vs benchmarks, étape 6)."""
    metrics = data_loader.load_backtest_metrics()
    models = metrics.get("models", {})
    return {
        "primary_cost_bps": metrics.get("primary_cost_bps"),
        "n_test_days": metrics.get("n_test_days"),
        "test_range": metrics.get("test_range"),
        "models": [
            {
                "id": name,
                "ann_return": m.get("ann_return"),
                "ann_vol": m.get("ann_vol"),
                "sharpe": m.get("sharpe"),
                "max_drawdown": m.get("max_drawdown"),
                "final_equity": m.get("final_equity"),
                "directional_accuracy": m.get("directional_accuracy"),
            }
            for name, m in models.items()
        ],
    }
