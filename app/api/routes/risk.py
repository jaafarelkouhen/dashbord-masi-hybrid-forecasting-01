"""Endpoints /api/risk."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.services import risk_service

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("/series")
def series(window: int | None = Query(default=None, ge=1, le=5000)):
    try:
        return risk_service.risk_series(window=window)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/validation")
def validation():
    try:
        return risk_service.risk_validation()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/breaches")
def breaches():
    try:
        return risk_service.risk_breaches()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
