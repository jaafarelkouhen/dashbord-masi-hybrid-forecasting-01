"""Schémas Pydantic pour /api/chat."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="user | assistant | system")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list)
    filters: dict | None = Field(default=None, description="Filtres metadata (ex: source)")


class ChatSource(BaseModel):
    title: str
    section: str = ""
    snippet: str
    score: float
    source: str
    kind: str = "markdown"  # markdown | notebook | curated


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource]
    backend: str
    intent: str
    used_rag: bool = False
    used_live: bool = False
