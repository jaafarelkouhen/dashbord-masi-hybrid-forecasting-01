"""Endpoints /api/forecast."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.services import forecast_service

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.get("/latest")
def latest():
    try:
        return forecast_service.latest_forecast()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/series")
def series(window: int | None = Query(default=None, ge=1, le=5000)):
    try:
        return forecast_service.forecast_series(window=window)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/kpis")
def kpis():
    try:
        return forecast_service.kpis()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/regimes")
def regimes():
    try:
        return forecast_service.regime_distribution()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
