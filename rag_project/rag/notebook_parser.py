"""Parseur de notebooks Jupyter → chunks markdown indexables.

Stratégie :
- Lit le .ipynb (JSON nbformat 4).
- Itère sur les cellules.
- Markdown cells : extrait le texte tel quel, garde les titres comme sections.
- Code cells : convertit en bloc fenced ```python avec préfixe `# In[N]:`,
  inclut les outputs texte courts (pas les images, ni les DataFrames volumineux).
- Regroupe les cellules consécutives par section markdown (titre `#` `##` `###`).
- Émet des chunks `NotebookChunk` compatibles avec le retriever.

L'objectif n'est PAS de rejouer le notebook, mais de donner au RAG le contexte
pédagogique (markdown explicatif + code lisible) pour répondre aux questions
de méthodologie.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger(__name__)


MAX_OUTPUT_CHARS = 600
MAX_CODE_CHARS = 2000


@dataclass
class NotebookChunk:
    """Un bloc de contenu extrait d'un notebook, prêt à indexer."""

    text: str
    source: str           # chemin absolu du .ipynb
    title: str            # nom du notebook (ex: "05_cnn_lstm")
    section: str          # titre de section markdown courant


def _flatten(source: str | list[str]) -> str:
    if isinstance(source, list):
        return "".join(source)
    return source or ""


def _extract_text_outputs(cell: dict) -> str:
    """Concatène les outputs texte d'une cellule code (skip images, DataFrames)."""
    parts: list[str] = []
    for out in cell.get("outputs", []) or []:
        kind = out.get("output_type")
        if kind == "stream":
            parts.append(_flatten(out.get("text", "")))
        elif kind in ("execute_result", "display_data"):
            data = out.get("data", {}) or {}
            text = data.get("text/plain")
            if text:
                parts.append(_flatten(text))
        elif kind == "error":
            ename = out.get("ename", "Error")
            evalue = out.get("evalue", "")
            parts.append(f"{ename}: {evalue}")

    raw = "\n".join(p.strip() for p in parts if p and p.strip())
    if len(raw) > MAX_OUTPUT_CHARS:
        raw = raw[:MAX_OUTPUT_CHARS].rstrip() + "\n[…output tronqué…]"
    return raw


def _format_code_cell(code: str, output: str, idx: int | None) -> str:
    code = code.strip()
    if len(code) > MAX_CODE_CHARS:
        code = code[:MAX_CODE_CHARS].rstrip() + "\n# […cellule tronquée…]"
    label = f"In[{idx}]:" if idx is not None else "Cellule code :"
    block = f"```python\n# {label}\n{code}\n```"
    if output:
        block += f"\n\nOutput :\n```\n{output}\n```"
    return block


_HEADER_RE = re.compile(r"^(#{1,3})\s+(.+?)\s*$", flags=re.MULTILINE)


def _first_header(markdown: str) -> str | None:
    match = _HEADER_RE.search(markdown)
    if match:
        return match.group(2).strip()
    return None


def parse_notebook(path: Path) -> list[NotebookChunk]:
    """Parse un .ipynb et retourne la liste des chunks à indexer."""
    try:
        raw = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        raw = path.read_text(encoding="latin-1")
    try:
        nb = json.loads(raw)
    except json.JSONDecodeError as exc:
        log.warning("Notebook illisible (%s) : %s", path, exc)
        return []

    cells = nb.get("cells", []) or []
    if not cells:
        return []

    notebook_name = path.stem
    chunks: list[NotebookChunk] = []
    current_section = notebook_name
    buffer: list[str] = []

    def flush():
        if not buffer:
            return
        text = "\n\n".join(part for part in buffer if part.strip())
        if text.strip():
            chunks.append(
                NotebookChunk(
                    text=text.strip(),
                    source=str(path),
                    title=notebook_name,
                    section=current_section,
                )
            )
        buffer.clear()

    for cell in cells:
        cell_type = cell.get("cell_type")
        source = _flatten(cell.get("source", ""))
        if cell_type == "markdown":
            header = _first_header(source)
            if header:
                # Nouvelle section : on flush l'ancien buffer et on repart
                flush()
                current_section = header
            if source.strip():
                buffer.append(source.strip())
        elif cell_type == "code":
            if not source.strip():
                continue
            output = _extract_text_outputs(cell)
            block = _format_code_cell(
                source, output, cell.get("execution_count")
            )
            buffer.append(block)
        # Skip raw cells

    flush()

    log.info("Notebook %s → %d chunks", notebook_name, len(chunks))
    return chunks


def parse_notebooks_dir(directory: Path) -> list[NotebookChunk]:
    """Parse tous les .ipynb d'un dossier (récursif)."""
    if not directory.exists():
        log.warning("Dossier notebooks introuvable : %s", directory)
        return []
    all_chunks: list[NotebookChunk] = []
    for nb_path in sorted(directory.rglob("*.ipynb")):
        # Skip checkpoints
        if ".ipynb_checkpoints" in nb_path.parts:
            continue
        all_chunks.extend(parse_notebook(nb_path))
    log.info("Total chunks notebooks : %d", len(all_chunks))
    return all_chunks
