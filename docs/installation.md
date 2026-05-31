# Installation

Guide **pas-à-pas**. Aucune connaissance préalable requise.

À la fin :

- :material-check: **Ollama** tourne en local
- :material-check: l'**API FastAPI** écoute sur `http://127.0.0.1:8000`
- :material-check: le **dashboard Next.js** est ouvert sur `http://127.0.0.1:3000`
- :material-check: l'**assistant RAG** répond avec sources

---

## :material-package-variant: 0. Pré-requis

| Outil | Version min. | Lien |
|---|---|---|
| **Python** | 3.10+ | [python.org/downloads](https://www.python.org/downloads/) |
| **Node.js** | 20+ LTS | [nodejs.org](https://nodejs.org/en/download) |
| **Git** | n'importe | [git-scm.com](https://git-scm.com/downloads) |

```powershell
python --version    # >= 3.10
node --version      # >= 20
git --version
```

!!! warning "Artefacts MASI"
    Ce dashboard **ne ré-entraîne pas** les modèles, il **lit** les CSV/JSON
    produits par le projet sœur `masi-hybrid-forecasting`. Voir [Étape 2](#2-projet-engine).

---

## :material-robot: 1. Installer Ollama

Ollama exécute des LLM (Llama 3, Qwen, Mistral, …) **directement sur votre
machine**, sans clé API et sans Internet (une fois le modèle téléchargé).

=== "Windows"

    Télécharge [`OllamaSetup.exe`](https://ollama.com/download/windows) et exécute-le.

=== "macOS"

    Télécharge [`Ollama.dmg`](https://ollama.com/download/mac), glisse dans Applications.

=== "Linux"

    ```bash
    curl -fsSL https://ollama.com/install.sh | sh
    ```

### Vérifier

```powershell
ollama --version
curl http://localhost:11434
# Réponse attendue : "Ollama is running"
```

### Télécharger un modèle

```powershell
ollama pull llama3:latest
```

| Modèle | Taille | RAM | Quand l'utiliser |
|---|---|---|---|
| `qwen2.5:1.5b` | ~1 Go | 4 Go | machine modeste |
| `llama3.2:latest` (3B) | ~2 Go | 8 Go | bon compromis |
| **`llama3:latest`** (8B) | ~5 Go | 16 Go | **défaut, qualité** |
| `qwen2.5:3b` | ~2 Go | 8 Go | alternative légère |

```powershell
ollama run llama3:latest "dis bonjour"
```

---

## :material-folder-multiple: 2. Projet engine

Le dashboard a besoin des artefacts produits par le projet sœur.

```powershell
cd ..
git clone <url-du-projet> masi-hybrid-forecasting
cd masi-hybrid-forecasting
pip install -e ".[notebooks,dev]"

python -m masi_hybrid_forecasting.pipeline predict
python -m masi_hybrid_forecasting.pipeline risk
python -m masi_hybrid_forecasting.pipeline backtest --strategy hmm_gate
python -m masi_hybrid_forecasting.pipeline export  --strategy hmm_gate
```

Structure attendue :

```text
2-TimeSeriesProject/
├── masi-hybrid-forecasting/              ← engine (produit les CSV/JSON)
└── dashbord-masi-hybrid-forecasting-01/  ← ce repo (les lit)
```

---

## :material-language-python: 3. Backend Python

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1     # Windows
# source .venv/bin/activate      # macOS / Linux

pip install -U pip
pip install -r requirements.txt
```

---

## :material-react: 4. Frontend Next.js

```powershell
cd frontend
npm install
cd ..
```

`npm install` télécharge React, Next.js, Plotly, Tailwind, … (~300 Mo).

---

## :material-cog: 5. Configuration `.env`

### Backend (à la racine)

```powershell
Copy-Item .env.example .env
```

Édite `.env` :

```dotenv
# Chemin ABSOLU vers le projet engine (slashes / sous Windows !)
MASI_PROJECT_ROOT=C:/Users/<vous>/.../masi-hybrid-forecasting

LLM_BACKEND=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3:latest
```

!!! warning "Windows path"
    Utilise des **slashes** `/`, pas des `\`. Pydantic peut interpréter les
    backslashes comme des échappements.

### Frontend

```powershell
Copy-Item frontend\.env.local.example frontend\.env.local
```

Contenu :

```dotenv
API_PROXY_TARGET=http://127.0.0.1:8000
```

---

## :material-database-arrow-down: 6. Construire l'index RAG

```powershell
python scripts\build_rag_index.py
# ou
python -m rag_project.scripts.build_index
```

Tu devrais voir `indexed N chunks into collection masi_kb`.

[En savoir plus sur l'index RAG :material-arrow-right:](rag.md#sources-indexees){ .md-button }

---

## :material-play: 7. Lancer le dashboard

Trois processus en parallèle (idéalement trois terminaux).

=== "Terminal 1 — Ollama"

    Normalement déjà lancé en service système.
    ```powershell
    curl http://localhost:11434
    ```

=== "Terminal 2 — FastAPI"

    ```powershell
    .\.venv\Scripts\Activate.ps1
    .\scripts\run_dev.ps1
    # ou
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
    ```

=== "Terminal 3 — Next.js"

    ```powershell
    cd frontend
    npm run dev
    ```

---

## :material-web: 8. URLs

| URL | Page |
|---|---|
| <http://127.0.0.1:3000/> | Landing page |
| <http://127.0.0.1:3000/dashboard> | **Dashboard interactif** |
| <http://127.0.0.1:8000/docs> | OpenAPI |
| <http://127.0.0.1:8000/api/health> | Santé + détection artefacts |

---

## :material-check-all: 9. Vérifications

```powershell
curl http://localhost:11434
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8000/api/forecast/latest

curl -X POST http://127.0.0.1:8000/api/chat `
  -H "Content-Type: application/json" `
  -d '{"message":"explique la méthodologie en 2 phrases"}'
```

---

## :material-wrench: 10. Dépannage

| Symptôme | Cause | Correctif |
|---|---|---|
| Chat répond toujours « réponse déterministe… » | `LLM_BACKEND` n'est pas `ollama` dans `.env` | Éditer `.env`, relancer l'API |
| `Connection refused: localhost:11434` | Ollama pas démarré | Relancer Ollama |
| `model "llama3:latest" not found` | Modèle pas téléchargé | `ollama pull llama3:latest` |
| Dashboard : `Artefact manquant` | `MASI_PROJECT_ROOT` mal renseigné | Vérifier le chemin |
| Front : mauvais backend | `frontend/.env.local` absent | Vérifier `API_PROXY_TARGET` |
| `Port 8000 already in use` | Port occupé | `API_PORT=8001` + maj `.env.local` |
| Ollama très lent | Modèle 8B trop lourd | Passer à `qwen2.5:1.5b` |

---

## :material-delete-sweep: 11. Désinstallation propre

```powershell
Remove-Item -Recurse -Force .venv
Remove-Item -Recurse -Force frontend\node_modules
Remove-Item -Recurse -Force .chroma_db
```

Ollama se désinstalle depuis **Paramètres > Applications** (Windows) ou en
glissant l'app dans la corbeille (macOS).
