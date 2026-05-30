"""Façade vers rag_project.rag.build_index — gardée pour compatibilité.

Lance `python -m rag_project.scripts.build_index` ou ce module pour rebuild.
"""

from __future__ import annotations

from rag_project.rag.build_index import build_index

__all__ = ["build_index"]


if __name__ == "__main__":
    build_index(reset=True)
