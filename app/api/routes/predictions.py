"""Endpoints /api/predictions — risk score, régime persistance."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.services import prediction_service

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/risk-score")
def risk_score(window: int = Query(default=252, ge=20, le=5000)):
    try:
        return prediction_service.risk_score_series(window=window)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/regime-persistence")
def regime_persistence():
    try:
        return prediction_service.regime_persistence()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/snapshot")
def snapshot():
    try:
        return prediction_service.next_day_risk_snapshot()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
