"""Construction de l'index vectoriel ChromaDB pour le RAG.

Sources indexées :
- {curated_docs_dir}/*.md            — 8 docs curated (overview, methodology, …)
- {masi_root}/docs/*.md              — docs méthodologie projet MASI
- {masi_root}/reports/**/*.md        — final_results, executive_summary
- {masi_root}/outputs/etape*/report.md — un rapport par étape
- {masi_root}/notebooks/*.ipynb      — 9 notebooks (markdown + code + outputs)

Usage :
    python -m rag_project.scripts.build_index
"""

from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass
from pathlib import Path

from rag_project.core.config import SETTINGS
from rag_project.core import paths as P
from rag_project.rag.notebook_parser import NotebookChunk, parse_notebooks_dir

log = logging.getLogger(__name__)


@dataclass
class Chunk:
    id: str
    text: str
    source: str
    title: str
    section: str
    kind: str  # "markdown" | "notebook" | "curated"


def _sha1(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


def _emit_buffer(buf: str, source: str, section: str, title: str, kind: str) -> list[Chunk]:
    text = buf.strip()
    if not text or len(text) < SETTINGS.chunk_min_chars:
        return []
    return [
        Chunk(
            id=_sha1(f"{source}::{section}::{text[:200]}"),
            text=text,
            source=source,
            title=title,
            section=section,
            kind=kind,
        )
    ]


def _split_markdown(
    text: str, source: str, title: str, kind: str = "markdown"
) -> list[Chunk]:
    """Split par sections markdown (## titres), sub-chunk si trop long."""
    chunks: list[Chunk] = []
    sections = re.split(r"(?m)^(#{1,3} .+)$", text)

    current_section = title
    buf = ""
    for piece in sections:
        if piece is None:
            continue
        if re.match(r"^#{1,3} ", piece):
            if buf.strip():
                chunks.extend(_emit_buffer(buf, source, current_section, title, kind))
            current_section = piece.lstrip("# ").strip()
            buf = ""
        else:
            buf += piece

    if buf.strip():
        chunks.extend(_emit_buffer(buf, source, current_section, title, kind))

    # Sub-chunking
    max_chars = SETTINGS.chunk_max_chars
    final: list[Chunk] = []
    for c in chunks:
        if len(c.text) <= max_chars:
            final.append(c)
            continue
        paragraphs = re.split(r"\n\s*\n", c.text)
        buf2 = ""
        for para in paragraphs:
            if len(buf2) + len(para) + 2 > max_chars and buf2:
                final.append(
                    Chunk(
                        id=_sha1(buf2),
                        text=buf2.strip(),
                        source=c.source,
                        title=c.title,
                        section=c.section,
                        kind=kind,
                    )
                )
                buf2 = para
            else:
                buf2 = (buf2 + "\n\n" + para) if buf2 else para
        if buf2.strip():
            final.append(
                Chunk(
                    id=_sha1(buf2),
                    text=buf2.strip(),
                    source=c.source,
                    title=c.title,
                    section=c.section,
                    kind=kind,
                )
            )
    return final


def _notebook_chunk_to_chunk(nb: NotebookChunk) -> Chunk:
    return Chunk(
        id=_sha1(f"{nb.source}::{nb.section}::{nb.text[:200]}"),
        text=nb.text,
        source=nb.source,
        title=nb.title,
        section=nb.section,
        kind="notebook",
    )


def _collect_markdown_sources() -> list[tuple[Path, str]]:
    """Liste les fichiers markdown à indexer, avec leur kind."""
    sources: list[tuple[Path, str]] = []

    # 1. Curated docs (priorité)
    curated = P.curated_docs_dir()
    if curated.exists():
        sources.extend((p, "curated") for p in sorted(curated.rglob("*.md")))

    # 2. MASI docs / reports / outputs
    if P.masi_docs_dir().exists():
        sources.extend((p, "markdown") for p in sorted(P.masi_docs_dir().rglob("*.md")))
    if P.masi_reports_dir().exists():
        sources.extend((p, "markdown") for p in sorted(P.masi_reports_dir().rglob("*.md")))
    outputs = P.masi_outputs_dir()
    if outputs.exists():
        for sub in sorted(outputs.iterdir()):
            if sub.is_dir():
                report = sub / "report.md"
                if report.exists():
                    sources.append((report, "markdown"))

    return sources


def _collect_all_chunks() -> list[Chunk]:
    all_chunks: list[Chunk] = []

    # Markdown sources
    md_sources = _collect_markdown_sources()
    log.info("Sources markdown trouvées : %d fichiers", len(md_sources))
    for path, kind in md_sources:
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = path.read_text(encoding="latin-1")
        all_chunks.extend(_split_markdown(text, str(path), path.stem, kind=kind))

    # Notebooks
    nb_chunks = parse_notebooks_dir(P.masi_notebooks_dir())
    log.info("Chunks notebooks : %d", len(nb_chunks))
    all_chunks.extend(_notebook_chunk_to_chunk(nb) for nb in nb_chunks)

    return all_chunks


def build_index(reset: bool = True) -> int:
    """Construit l'index Chroma. Retourne le nombre de chunks insérés."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s %(name)s : %(message)s",
    )

    import chromadb
    from chromadb.config import Settings as ChromaSettings
    from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

    all_chunks = _collect_all_chunks()
    log.info("Chunks générés au total : %d", len(all_chunks))
    if not all_chunks:
        log.warning("Aucun chunk à indexer. Vérifie MASI_PROJECT_ROOT et curated_docs_dir.")
        return 0

    chroma_dir = SETTINGS.chroma_dir.resolve()
    chroma_dir.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(
        path=str(chroma_dir),
        settings=ChromaSettings(anonymized_telemetry=False, allow_reset=True),
    )

    if reset:
        try:
            client.delete_collection(SETTINGS.collection_name)
            log.info("Collection précédente supprimée.")
        except Exception:
            pass

    emb = SentenceTransformerEmbeddingFunction(
        model_name=SETTINGS.embedding_model,
        device=SETTINGS.embedding_device,
    )
    col = client.get_or_create_collection(
        name=SETTINGS.collection_name,
        embedding_function=emb,
        metadata={"hnsw:space": "cosine"},
    )

    # Insertion en batchs, dédupe par id
    batch = 64
    seen: set[str] = set()
    docs: list[str] = []
    metas: list[dict] = []
    ids: list[str] = []
    inserted = 0

    for c in all_chunks:
        if c.id in seen:
            continue
        seen.add(c.id)
        docs.append(c.text)
        metas.append(
            {
                "source": c.source,
                "title": c.title,
                "section": c.section,
                "kind": c.kind,
            }
        )
        ids.append(c.id)
        if len(docs) >= batch:
            col.add(documents=docs, metadatas=metas, ids=ids)
            inserted += len(docs)
            docs, metas, ids = [], [], []
    if docs:
        col.add(documents=docs, metadatas=metas, ids=ids)
        inserted += len(docs)

    log.info(
        "Index Chroma écrit dans %s — collection %s, %d chunks (sur %d uniques).",
        chroma_dir,
        SETTINGS.collection_name,
        inserted,
        len(seen),
    )
    return inserted


if __name__ == "__main__":
    build_index(reset=True)
