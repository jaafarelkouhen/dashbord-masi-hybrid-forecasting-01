"""Service orchestrateur du chatbot RAG.

Pipeline d'un tour :
  question
    → validation
    → intent (embeddings + lexical fallback)
    → response_policy (contraintes)
    → routed_context (live snapshot + RAG chunks)
    → prompt_builder
    → LLM (Ollama) ou fallback déterministe
    → answer_repair
    → response_guardrails
    → réponse finale + sources + métadonnées

Point d'entrée principal : `answer(req, live_snapshot=...)`.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from rag_project.chatbot import (
    answer_repair,
    conversation_memory,
    fallback_responses,
    intent_router,
    prompt_builder,
    response_guardrails,
    response_policy,
    routed_context,
)
from rag_project.core.config import SETTINGS
from rag_project.llm import ollama_client

log = logging.getLogger(__name__)


@dataclass
class ChatRequest:
    message: str
    history: list[dict[str, str]] | None = None
    filters: dict | None = None


@dataclass
class ChatSource:
    title: str
    section: str
    snippet: str
    score: float
    source: str
    kind: str


@dataclass
class ChatAnswer:
    answer: str
    sources: list[ChatSource]
    backend: str
    intent: str
    used_rag: bool
    used_live: bool


def _validate(message: str) -> str:
    if not isinstance(message, str):
        raise TypeError("message must be a string")
    cleaned = message.strip()
    if not cleaned:
        raise ValueError("message empty")
    if len(cleaned) > SETTINGS.max_question_chars:
        raise ValueError(f"message too long (max {SETTINGS.max_question_chars} chars)")
    return cleaned


def _chunks_to_sources(chunks) -> list[ChatSource]:
    out: list[ChatSource] = []
    for c in chunks[:6]:
        text = c.text or ""
        snippet = (text[:240] + "…") if len(text) > 240 else text
        out.append(
            ChatSource(
                title=c.title,
                section=c.section,
                snippet=snippet,
                score=round(float(c.score), 3),
                source=c.source,
                kind=c.kind,
            )
        )
    return out


def answer(
    request: ChatRequest | dict[str, Any],
    live_snapshot: dict | None = None,
) -> ChatAnswer:
    """Exécute un tour complet et retourne la réponse + sources + métadonnées."""
    if isinstance(request, dict):
        request = ChatRequest(**request)

    message = _validate(request.message)
    history = conversation_memory.sanitize_history(
        request.history, max_messages=SETTINGS.max_history_messages
    )

    intent = intent_router.classify(message)
    policy = response_policy.build(message, intent)
    ctx = routed_context.build(message, intent, live_snapshot=live_snapshot)

    # Cas où la policy court-circuite le LLM (refus advice / out_of_scope)
    if not policy.allow_llm and policy.direct_answer:
        return ChatAnswer(
            answer=policy.direct_answer,
            sources=_chunks_to_sources(list(ctx.rag_chunks)),
            backend="policy",
            intent=intent,
            used_rag=ctx.used_rag,
            used_live=ctx.used_live,
        )

    summary = conversation_memory.summary_block(history)
    prompt = prompt_builder.build(
        question=message,
        intent=intent,
        live_text=ctx.live_text,
        rag_text=ctx.rag_text,
        conversation_summary=summary,
        policy=policy,
    )

    backend = SETTINGS.llm_backend.lower()
    raw_answer: str
    if backend == "ollama":
        try:
            raw_answer = ollama_client.generate(prompt)
            backend_used = "ollama"
        except ollama_client.OllamaUnavailable as exc:
            log.warning("Ollama indispo → fallback déterministe : %s", exc)
            raw_answer = fallback_responses.render(
                intent=intent,
                message=message,
                chunks=list(ctx.rag_chunks),
                live_snapshot=live_snapshot,
            )
            backend_used = "fallback"
        except ollama_client.OllamaModelMissing as exc:
            log.warning("Modèle Ollama absent → fallback : %s", exc)
            raw_answer = fallback_responses.render(
                intent=intent,
                message=message,
                chunks=list(ctx.rag_chunks),
                live_snapshot=live_snapshot,
            )
            backend_used = "fallback"
        except Exception as exc:
            log.exception("LLM échec inattendu → fallback : %s", exc)
            raw_answer = fallback_responses.render(
                intent=intent,
                message=message,
                chunks=list(ctx.rag_chunks),
                live_snapshot=live_snapshot,
            )
            backend_used = "fallback"
    else:
        raw_answer = fallback_responses.render(
            intent=intent,
            message=message,
            chunks=list(ctx.rag_chunks),
            live_snapshot=live_snapshot,
        )
        backend_used = "fallback"

    # Post-processing : repair → guardrails
    repaired = answer_repair.repair(raw_answer)
    final = response_guardrails.apply(
        repaired,
        ctx.validation_text,
        intent=intent,
        question=message,
    )

    return ChatAnswer(
        answer=final,
        sources=_chunks_to_sources(list(ctx.rag_chunks)),
        backend=backend_used,
        intent=intent,
        used_rag=ctx.used_rag,
        used_live=ctx.used_live,
    )


def warm() -> None:
    """À appeler au démarrage de l'API : pré-charge embeddings + collection."""
    from rag_project.rag.retriever import warm as warm_retriever
    warm_retriever()
    intent_router.warm()
    if SETTINGS.llm_backend.lower() == "ollama" and SETTINGS.ollama_auto_start:
        ollama_client.ensure_server()
