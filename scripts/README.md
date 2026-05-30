# `scripts/` — dev & ops helpers

Convenience scripts for running and maintaining the dashboard.

| Script | Purpose |
|---|---|
| `run_dev.ps1` | Start the FastAPI backend in dev mode (Windows / PowerShell). |
| `run_dev.sh` | Same, for macOS / Linux. |
| `build_rag_index.py` | Build the RAG vector index (wrapper). |

## Build the assistant index

```bash
python scripts/build_rag_index.py
# equivalent, using the full engine directly:
python -m rag_project.scripts.build_index
```

This indexes the engine's `docs/`, `reports/` and `outputs/etape*/report.md`
plus the curated docs in `rag_project/docs/`, writing the Chroma store to
`.chroma_db/` (gitignored — rebuild after cloning). See
[`../rag_project/README.md`](../rag_project/README.md) for details.
