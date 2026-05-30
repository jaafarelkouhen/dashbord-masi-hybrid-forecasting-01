#!/usr/bin/env bash
# Démarre le dashboard MASI en mode dev (macOS / Linux)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f ".venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source ".venv/bin/activate"
fi

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-8000}"

echo "→ Dashboard : http://${API_HOST}:${API_PORT}/"
echo "→ API docs : http://${API_HOST}:${API_PORT}/docs"

python -m uvicorn app.main:app --host "${API_HOST}" --port "${API_PORT}" --reload
