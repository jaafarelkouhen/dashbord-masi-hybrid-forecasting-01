"""Script CLI : teste le pipeline chat sans serveur API.

Usage :
    python -m rag_project.scripts.test_chat "c'est quoi la VaR ?"
    python -m rag_project.scripts.test_chat   # mode batch sur questions sample
"""

from __future__ import annotations

import logging
import sys

# Windows console encoding fix : certaines réponses contiennent ≥, ≤, ↑, …
try:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
except Exception:
    pass

from rag_project.chatbot.service import ChatRequest, answer  # noqa: E402


SAMPLE_QUESTIONS = [
    "bonjour",
    "c'est quoi la VaR ?",
    "explique la différence entre VaR et ES",
    "quelle est la prévision du jour ?",
    "régime HMM actuel ?",
    "meilleure stratégie par Sharpe ?",
    "comment fonctionne l'anti-leakage ?",
    "dois-je acheter le MASI ?",
    "quelle est la météo à Casablanca ?",
]


def run_one(question: str) -> None:
    print("#" * 80)
    print(f"Q : {question}")
    req = ChatRequest(message=question, history=[])
    result = answer(req, live_snapshot=None)
    print(f"  intent  : {result.intent}")
    print(f"  backend : {result.backend}")
    print(f"  rag={result.used_rag}  live={result.used_live}")
    print(f"  sources : {len(result.sources)}")
    print("  ---")
    print(result.answer)
    print()


def main() -> int:
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s : %(message)s")
    args = sys.argv[1:]
    if args:
        for q in args:
            run_one(q)
    else:
        for q in SAMPLE_QUESTIONS:
            run_one(q)
    return 0


if __name__ == "__main__":
    sys.exit(main())
