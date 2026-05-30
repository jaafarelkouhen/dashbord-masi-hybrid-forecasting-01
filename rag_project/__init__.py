"""rag_project — RAG copilot dédié au dashboard MASI Hybrid Forecasting.

Sous-modules :
- core      : config + chemins canoniques vers les artefacts MASI.
- rag       : retriever Chroma + BM25, build_index, notebook_parser.
- llm       : client Ollama (local).
- chatbot   : pipeline complet (intent → policy → context → prompt → LLM → repair → guardrails).
- docs      : 8 docs curated (overview, methodology, glossary, limitations,
              dashboard_playbook, common_questions, operating_contract,
              interpretation_rules).
"""

from rag_project.chatbot.service import answer as chat_answer  # noqa: F401
