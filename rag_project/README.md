# rag_project — RAG copilot du dashboard MASI Hybrid Forecasting

Pipeline RAG complet et autonome qui répond aux questions du dashboard sur la
prévision, le risque, les régimes HMM, les stratégies et la méthodologie. Branché
sur les **9 notebooks Jupyter** du projet MASI + tous les docs markdown + le
snapshot live du dashboard.

## Architecture en un coup d'œil

```
question
  → validate
  → intent (embeddings centroids + lexical fallback)
  → response_policy   (contraintes par intent)
  → routed_context    (live snapshot + RAG chunks)
  → prompt_builder
  → LLM (Ollama local) ou fallback déterministe
  → answer_repair     (corrige erreurs MASI connues)
  → response_guardrails (refuse advice, détecte hallucinations)
  → réponse + sources + métadonnées
```

## Structure

```
rag_project/
├── core/
│   ├── config.py            ← settings (env-driven)
│   └── paths.py             ← chemins canoniques MASI
├── rag/
│   ├── retriever.py         ← Chroma cosine + BM25 rerank
│   ├── build_index.py       ← chunking markdown + notebook
│   └── notebook_parser.py   ← parse .ipynb (markdown + code + outputs)
├── llm/
│   └── ollama_client.py     ← appel sync + stream + auto-start serveur
├── chatbot/
│   ├── intent_router.py     ← embeddings centroids (8 intents)
│   ├── response_policy.py   ← politique par intent
│   ├── routed_context.py    ← contexte adapté par intent
│   ├── prompt_builder.py    ← assemblage du prompt LLM
│   ├── answer_repair.py     ← correction post-génération
│   ├── response_guardrails.py ← validation hallucinations + advice
│   ├── conversation_memory.py ← résumé court de l'historique
│   ├── fallback_responses.py  ← réponses déterministes (no LLM)
│   └── service.py           ← orchestrateur principal
├── docs/                    ← 8 docs curated indexés en priorité
│   ├── 01_overview.md
│   ├── 02_methodology.md
│   ├── 03_glossary.md
│   ├── 04_limitations.md
│   ├── 05_dashboard_playbook.md
│   ├── 06_common_questions.md
│   ├── 07_operating_contract.md
│   └── 08_interpretation_rules.md
└── scripts/
    ├── build_index.py       ← `python -m rag_project.scripts.build_index`
    └── test_chat.py         ← `python -m rag_project.scripts.test_chat`
```

## Installation

### 1. Dépendances Python

Depuis la racine du dashboard :

```powershell
pip install chromadb sentence-transformers rank_bm25
```

(les autres deps — fastapi, pydantic, etc. — sont déjà dans le `pyproject.toml`
du dashboard.)

### 2. Installer Ollama (LLM local)

**Windows :**
1. Télécharge [Ollama Desktop](https://ollama.com/download/windows).
2. Lance l'installateur, puis ouvre l'application (icône dans la barre des
   tâches) — le serveur tourne sur `http://localhost:11434`.

**Pull un modèle :**

```powershell
ollama pull qwen2.5:3b
```

Recommandations :
- `qwen2.5:3b` — léger (~2 GB RAM), réponse rapide. ✅ par défaut.
- `qwen2.5:7b-instruct` — qualité supérieure (~5 GB RAM).
- `llama3.1:8b` — alternative équivalente à qwen2.5:7b.
- `mistral:7b` — bonne option compromis.

Le client Ollama du rag_project **démarre automatiquement** `ollama serve` si le
serveur n'est pas joignable (désactivable via `OLLAMA_AUTO_START=0`).

### 3. Configuration

Crée (ou édite) un fichier `.env` à la racine du dashboard :

```ini
# Source des artefacts MASI (ré-utilisé par le dashboard backend)
MASI_PROJECT_ROOT=C:/Users/jelko/OneDrive/Desktop/2-TimeSeriesProject/masi-hybrid-forecasting

# Backend LLM : ollama | fallback
LLM_BACKEND=ollama
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_AUTO_START=0    # désactive le démarrage auto

# RAG
RAG_CHROMA_DIR=.chroma_db
RAG_TOP_K=6
RAG_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
RAG_EMBEDDING_DEVICE=cpu       # ou "cuda" si GPU dispo
```

### 4. Construire l'index RAG

```powershell
python -m rag_project.scripts.build_index
```

Indexe :
- 8 docs curated (`rag_project/docs/*.md`).
- Tous les `.md` de `masi-hybrid-forecasting/docs/` et `reports/`.
- Les `report.md` de chaque `outputs/etape*/`.
- Les 9 notebooks Jupyter (`masi-hybrid-forecasting/notebooks/*.ipynb`) — cellules
  markdown + code + outputs textes courts.

Sortie attendue :
```
INFO rag_project.rag.build_index : Sources markdown trouvées : 18 fichiers
INFO rag_project.rag.notebook_parser : Notebook 05_cnn_lstm → 28 chunks
…
INFO rag_project.rag.build_index : Chunks générés au total : 312
INFO rag_project.rag.build_index : Index Chroma écrit dans …/.chroma_db
```

### 5. Tester le pipeline (sans démarrer l'API)

```powershell
python -m rag_project.scripts.test_chat "c'est quoi la VaR ?"
python -m rag_project.scripts.test_chat            # batch de 9 questions samples
```

## Utilisation depuis le dashboard

Le backend FastAPI du dashboard (`app/chatbot/service.py`) est une **façade
mince** vers `rag_project.chatbot.service.answer()`. Aucune action requise — le
endpoint `/api/chat` route automatiquement vers le nouveau pipeline dès que
l'API est redémarrée.

L'UI ChatView (`frontend/src/components/chat-view.tsx`) affiche :
- Le **markdown rendu** (gras, code, listes, headers).
- Les **sources expandables** avec icône par kind (notebook/curated/markdown).
- Des **badges meta** : intent, backend (ollama/fallback/policy), `live`, `rag`.
- Un bouton **Copier**, un bouton **Effacer la conversation**, un bouton **Stop**
  pour interrompre une génération en cours.
- Des suggestions catégorisées (Prévision live, Risque, Stratégies, Méthodologie).

## Comportement attendu

- **Si Ollama tourne** : réponses LLM, badge `ollama` vert.
- **Si Ollama down** : fallback déterministe (templates), badge `fallback` orange.
- **Si demande d'achat/vente** : refus standard, badge `policy`.
- **Si question hors scope** : refus poli avec redirection.

Les guardrails post-génération bloquent automatiquement :
- Hallucination de pourcentage absent du contexte.
- Confusion VaR/ES.
- Phrasing « régime HMM prédit la direction » → corrigé.
- Mentions Monte Carlo pour horizons 10/25j → corrigées.
- Hallucination « MASI = marché algérien » → corrigée.
- Dates relatives inventées (« aujourd'hui ») → flag.

## Variables d'environnement

| Var | Défaut | Rôle |
|---|---|---|
| `MASI_PROJECT_ROOT` | `…/masi-hybrid-forecasting` | Racine du projet MASI à indexer |
| `LLM_BACKEND` | `ollama` | `ollama` ou `fallback` |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Modèle Ollama |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL Ollama |
| `OLLAMA_AUTO_START` | `1` | Démarre Ollama auto si down (`0` désactive) |
| `RAG_CHROMA_DIR` | `./.chroma_db` | Persistance Chroma |
| `RAG_COLLECTION` | `masi_kb` | Nom de la collection |
| `RAG_TOP_K` | `6` | Nb de chunks retournés |
| `RAG_BM25_WEIGHT` | `0.4` | Poids BM25 dans le score combiné |
| `RAG_EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Modèle SBERT |
| `RAG_EMBEDDING_DEVICE` | `cpu` | `cpu` ou `cuda` |
| `RAG_INTENT_THRESHOLD` | `0.30` | Seuil cosine intent → out_of_scope |
| `OLLAMA_TEMPERATURE` | `0.15` | Température LLM |
| `OLLAMA_NUM_CTX` | `4096` | Context window |
| `OLLAMA_NUM_PREDICT` | `700` | Max tokens générés |

## Dépannage

**« Ollama n'est pas joignable »**
→ Vérifie que Ollama Desktop est lancé (icône systray Windows). Sinon : `ollama serve` en CLI.

**« Modèle Ollama 'qwen2.5:3b' absent »**
→ `ollama pull qwen2.5:3b`.

**« Index Chroma absent »**
→ `python -m rag_project.scripts.build_index`.

**Réponses bizarres / fallback en permanence**
→ Test direct : `python -m rag_project.scripts.test_chat "bonjour"`. Si fallback,
   c'est qu'Ollama refuse — vérifie `ollama list` et `OLLAMA_MODEL`.

**Le RAG ne trouve pas mes notebooks**
→ Vérifie `MASI_PROJECT_ROOT` et que `masi-hybrid-forecasting/notebooks/*.ipynb` existe.
   Le log d'indexation doit afficher « Notebook XX_xxx → N chunks ».
