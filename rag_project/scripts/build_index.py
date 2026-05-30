"""Script CLI : reconstruit l'index Chroma du RAG.

Usage :
    cd dashbord-masi-hybrid-forecasting-01
    python -m rag_project.scripts.build_index
"""

from __future__ import annotations

import logging
import sys

from rag_project.rag.build_index import build_index


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s : %(message)s")
    inserted = build_index(reset=True)
    if inserted == 0:
        print("Aucun chunk indexé. Vérifie MASI_PROJECT_ROOT et la présence des docs.")
        return 1
    print(f"OK — {inserted} chunks indexés.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
