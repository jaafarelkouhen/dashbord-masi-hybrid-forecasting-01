"""Endpoints /api/horizon — projection MASI mai/juin 2026 (étape 10)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.services import horizon_service

router = APIRouter(prefix="/api/horizon", tags=["horizon"])


@router.get("/summary")
def summary(year: int = Query(default=2026, ge=2024, le=2035)):
    try:
        return horizon_service.summary(year=year)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/daily")
def daily(year: int = Query(default=2026, ge=2024, le=2035)):
    try:
        return horizon_service.daily_series(year=year)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/monthly")
def monthly(year: int = Query(default=2026, ge=2024, le=2035)):
    try:
        return horizon_service.monthly_summary(year=year)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/report")
def report():
    try:
        return {"markdown": horizon_service.report_markdown()}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
