"""Client Ollama local : appel synchrone + streaming + auto-start serveur.

Le serveur Ollama tourne par défaut sur http://localhost:11434. S'il n'est pas
joignable, on tente `ollama serve` en sous-processus (option désactivable via
OLLAMA_AUTO_START=0).

Tous les paramètres viennent de rag_project.core.config.SETTINGS.
"""

from __future__ import annotations

import json
import logging
import subprocess
import time
from collections.abc import Iterator
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from rag_project.core.config import SETTINGS

log = logging.getLogger(__name__)


_PROCESS: subprocess.Popen | None = None


def _generate_url() -> str:
    return f"{SETTINGS.ollama_base_url.rstrip('/')}/api/generate"


def _tags_url() -> str:
    return f"{SETTINGS.ollama_base_url.rstrip('/')}/api/tags"


def is_available(timeout: float = 1.0) -> bool:
    try:
        with urlopen(_tags_url(), timeout=timeout):
            return True
    except (OSError, TimeoutError, URLError, HTTPError):
        return False


def list_models() -> list[str]:
    """Liste les modèles installés (vide si Ollama down)."""
    try:
        with urlopen(_tags_url(), timeout=2.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return [m.get("name", "") for m in data.get("models", []) if m.get("name")]
    except Exception:
        return []


def ensure_server() -> bool:
    """Démarre `ollama serve` en arrière-plan si pas déjà running."""
    global _PROCESS
    if is_available():
        return True
    if not SETTINGS.ollama_auto_start:
        return False

    command = ["ollama", "serve"]
    kwargs: dict = {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}
    if hasattr(subprocess, "CREATE_NO_WINDOW"):
        kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW

    try:
        _PROCESS = subprocess.Popen(command, **kwargs)
    except OSError as exc:
        log.warning("Impossible de lancer `ollama serve` : %s", exc)
        return False

    deadline = time.monotonic() + SETTINGS.ollama_startup_timeout
    while time.monotonic() < deadline:
        if is_available(timeout=0.5):
            log.info("Ollama démarré automatiquement.")
            return True
        if _PROCESS.poll() is not None:
            return False
        time.sleep(0.3)

    return is_available(timeout=0.5)


def _extract_error_body(raw: bytes) -> str:
    try:
        payload = json.loads(raw.decode("utf-8", errors="replace"))
        err = payload.get("error")
        return str(err).strip() if err else raw.decode("utf-8", errors="replace").strip()
    except json.JSONDecodeError:
        return raw.decode("utf-8", errors="replace").strip()


def _build_payload(prompt: str, stream: bool) -> dict:
    return {
        "model": SETTINGS.ollama_model,
        "prompt": prompt,
        "stream": stream,
        "options": {
            "temperature": SETTINGS.ollama_temperature,
            "top_p": SETTINGS.ollama_top_p,
            "num_ctx": SETTINGS.ollama_num_ctx,
            "num_predict": SETTINGS.ollama_num_predict,
            "num_gpu": SETTINGS.ollama_num_gpu,
        },
    }


def _build_request(payload: dict) -> Request:
    return Request(
        _generate_url(),
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )


class OllamaUnavailable(RuntimeError):
    """Ollama n'est ni joignable ni démarrable."""


class OllamaModelMissing(RuntimeError):
    """Le modèle demandé n'est pas installé localement."""


def generate(prompt: str) -> str:
    """Génère une réponse complète. Lève OllamaUnavailable / OllamaModelMissing."""
    cleaned = (prompt or "").strip()
    if not cleaned:
        raise ValueError("Prompt vide.")

    if not is_available(timeout=1.0):
        if not ensure_server():
            raise OllamaUnavailable(
                "Ollama n'est pas joignable sur "
                f"{SETTINGS.ollama_base_url}. Lance `ollama serve` ou ouvre "
                "l'application Ollama."
            )

    req = _build_request(_build_payload(cleaned, stream=False))
    try:
        with urlopen(req, timeout=SETTINGS.ollama_timeout_seconds) as resp:
            raw = resp.read()
    except HTTPError as exc:
        body = _extract_error_body(exc.read())
        if exc.code == 404 or "not found" in body.lower():
            raise OllamaModelMissing(
                f"Modèle Ollama '{SETTINGS.ollama_model}' absent. "
                f"Exécute : ollama pull {SETTINGS.ollama_model}"
            ) from exc
        raise RuntimeError(f"Ollama HTTP {exc.code} : {body or '—'}") from exc
    except TimeoutError as exc:
        raise RuntimeError(
            "Ollama n'a pas répondu avant timeout. Le modèle est peut-être en cours de chargement."
        ) from exc
    except URLError as exc:
        raise OllamaUnavailable("Ollama non joignable.") from exc

    try:
        data = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError("Réponse Ollama JSON invalide.") from exc

    answer = str(data.get("response", "")).strip()
    if not answer:
        raise RuntimeError("Ollama a renvoyé une réponse vide.")
    return answer


def generate_stream(prompt: str) -> Iterator[str]:
    """Génère une réponse en streaming chunk-by-chunk."""
    cleaned = (prompt or "").strip()
    if not cleaned:
        raise ValueError("Prompt vide.")

    if not is_available(timeout=1.0):
        if not ensure_server():
            raise OllamaUnavailable(
                f"Ollama n'est pas joignable sur {SETTINGS.ollama_base_url}."
            )

    req = _build_request(_build_payload(cleaned, stream=True))
    try:
        with urlopen(req, timeout=SETTINGS.ollama_timeout_seconds) as resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8", errors="replace").strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise RuntimeError("Flux Ollama JSON invalide.") from exc
                if data.get("error"):
                    raise RuntimeError(str(data["error"]))
                chunk = str(data.get("response", ""))
                if chunk:
                    yield chunk
                if data.get("done"):
                    break
    except HTTPError as exc:
        body = _extract_error_body(exc.read())
        if exc.code == 404 or "not found" in body.lower():
            raise OllamaModelMissing(
                f"Modèle Ollama '{SETTINGS.ollama_model}' absent. "
                f"Exécute : ollama pull {SETTINGS.ollama_model}"
            ) from exc
        raise RuntimeError(f"Ollama HTTP {exc.code} : {body or '—'}") from exc
    except URLError as exc:
        raise OllamaUnavailable("Ollama non joignable.") from exc
