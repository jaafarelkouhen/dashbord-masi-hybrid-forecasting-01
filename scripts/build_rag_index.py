"""Wrapper de commodité : python scripts/build_rag_index.py"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# Permet d'exécuter le script depuis le dossier scripts/
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.rag.build_index import build_index  # noqa: E402


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s : %(message)s")
    n = build_index(reset=True)
    print(f"✓ {n} chunks indexés dans l'index Chroma.")
