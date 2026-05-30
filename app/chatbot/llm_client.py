"""
Abstraction LLM : OpenAI / Anthropic / Ollama / fallback.

Toutes les implémentations renvoient une chaîne (la réponse). Les imports sont
paresseux pour éviter de charger des dépendances réseau inutilisées.
"""

from __future__ import annotations

import logging

from app.core.config import settings

log = logging.getLogger(__name__)


def is_real_llm() -> bool:
    return settings.llm_backend.lower() in {"openai", "anthropic", "ollama"}


def generate(system_prompt: str, user_prompt: str) -> str:
    backend = settings.llm_backend.lower()
    if backend == "openai":
        return _openai(system_prompt, user_prompt)
    if backend == "anthropic":
        return _anthropic(system_prompt, user_prompt)
    if backend == "ollama":
        return _ollama(system_prompt, user_prompt)
    raise RuntimeError(
        f"LLM_BACKEND={backend} : aucun backend réel actif "
        f"(utilise fallback côté chatbot)."
    )


def _openai(system: str, user: str) -> str:
    from openai import OpenAI

    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY manquant dans .env")
    client = OpenAI(api_key=settings.openai_api_key)
    resp = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
        max_tokens=600,
    )
    return resp.choices[0].message.content or ""


def _anthropic(system: str, user: str) -> str:
    import anthropic

    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY manquant dans .env")
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    resp = client.messages.create(
        model=settings.anthropic_model,
        system=system,
        max_tokens=600,
        temperature=0.2,
        messages=[{"role": "user", "content": user}],
    )
    # Premier bloc texte
    for block in resp.content:
        if getattr(block, "type", None) == "text":
            return block.text
    return ""


def _ollama(system: str, user: str) -> str:
    import httpx

    payload = {
        "model": settings.ollama_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
        "options": {"temperature": 0.2},
    }
    with httpx.Client(timeout=60.0) as client:
        r = client.post(f"{settings.ollama_base_url}/api/chat", json=payload)
        r.raise_for_status()
        data = r.json()
    return (data.get("message") or {}).get("content", "")
