"""Chemins canoniques vers les artefacts du projet MASI."""

from __future__ import annotations

from pathlib import Path

from rag_project.core.config import SETTINGS


def masi_root() -> Path:
    return SETTINGS.masi_project_root


def masi_docs_dir() -> Path:
    return masi_root() / "docs"


def masi_reports_dir() -> Path:
    return masi_root() / "reports"


def masi_outputs_dir() -> Path:
    return masi_root() / "outputs"


def masi_notebooks_dir() -> Path:
    return masi_root() / "notebooks"


def curated_docs_dir() -> Path:
    return SETTINGS.curated_docs_dir


def dashboard_root() -> Path:
    return SETTINGS.dashboard_root
