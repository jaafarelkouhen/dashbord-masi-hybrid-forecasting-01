"""Endpoints /api/backtest et /api/strategies."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services import backtest_service

router = APIRouter(prefix="/api", tags=["backtest"])


@router.get("/strategies")
def strategies():
    try:
        return {"strategies": backtest_service.list_strategies()}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/strategies/{strategy_id}")
def strategy(strategy_id: str):
    try:
        return backtest_service.strategy_detail(strategy_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/backtest/equity")
def equity():
    try:
        return backtest_service.equity_curves_series()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/backtest/summary")
def summary():
    try:
        return backtest_service.backtest_summary()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
