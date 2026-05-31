# Assistant RAG

L'assistant **RAG (Retrieval-Augmented Generation)** est un chatbot spécialisé
qui répond aux questions sur le projet MASI : prévision J+1, risque (VaR/ES),
régimes HMM, stratégies de backtest, méthodologie. Il fonctionne **100% en
local** par défaut (via Ollama), avec un fallback déterministe si aucun LLM
n'est disponible.

![AI Copilot](screenshots/dashboard-ai-copilot.png)

---

## :material-cog-transfer: Pipeline complet

```text
question utilisateur
   │
   ▼
[1] validate                    ← longueur, langue, contenu
   │
   ▼
[2] intent classification       ← 8 intents (embeddings + lexical fallback)
   │
   ▼
[3] response_policy             ← contraintes selon l'intent (refus / format / sources requises)
   │
   ▼
[4] routed_context              ← live snapshot (forecast/risk/regime) + chunks RAG
   │
   ▼
[5] prompt_builder              ← assemblage system + context + question
   │
   ▼
[6] LLM (Ollama) ── ou ──► fallback déterministe (templates)
   │
   ▼
[7] answer_repair               ← corrige erreurs MASI connues (cf. ci-dessous)
   │
   ▼
[8] response_guardrails         ← bloque hallucinations + refus advice
   │
   ▼
réponse + sources + meta (intent, backend, used_rag, used_live)
```

Le code orchestrateur vit dans
[`rag_project/chatbot/service.py`](https://github.com/jaafarelkouhen/masi-hybrid-forecasting/blob/main/rag_project/chatbot/service.py).

---

## :material-target: Les 8 intents

L'intent router (`rag_project/chatbot/intent_router.py`) utilise
**sentence-transformers** pour calculer des embeddings de la question, puis
les compare à des centroïdes pré-calculés par intent. Si la similarité
cosine est sous `RAG_INTENT_THRESHOLD` (défaut 0.30), retombe sur un
matcher lexical.

| Intent | Exemples de questions | Contexte utilisé |
|---|---|---|
| `forecast_query` | « quelle est la prédiction du jour ? » | snapshot live + chunks forecast |
| `risk_query` | « quel est le VaR aujourd'hui ? » | snapshot live + chunks risk |
| `regime_query` | « dans quel régime HMM on est ? » | snapshot live + chunks HMM |
| `strategy_query` | « quelle stratégie a le meilleur Sharpe ? » | metrics backtest + chunks |
| `methodology` | « comment marche le CNN-LSTM ? » | chunks docs + notebooks |
| `glossary` | « c'est quoi la VaR ? » | doc curated `03_glossary.md` |
| `help_request` | « que peux-tu faire ? » | doc curated `05_dashboard_playbook.md` |
| `out_of_scope` | « météo à Casablanca ? » | refus poli + redirection |

---

## :material-database-search: Retrieval hybride : Chroma + BM25

Le retriever (`rag_project/rag/retriever.py`) combine deux signaux :

=== "Chroma (cosine)"

    - Embeddings via `sentence-transformers/all-MiniLM-L6-v2` (configurable)
    - Persistance locale dans `.chroma_db/`
    - Search top-K cosine (défaut K=6)

=== "BM25 (lexical)"

    - Index in-memory via `rank-bm25`
    - Capture les correspondances exactes de termes techniques
    - Compense les limites des embeddings pour acronymes (VaR, ES, HMM, …)

=== "Fusion"

    ```python
    score_final = (1 - α) * score_cosine + α * score_bm25
    # α = RAG_BM25_WEIGHT, défaut 0.4
    ```

    Les chunks sont re-rankés selon ce score combiné avant d'être passés au
    LLM.

---

## :material-file-document-multiple: Sources indexées

Le script `python -m rag_project.scripts.build_index` indexe :

1. **8 docs curated** (`rag_project/docs/*.md`) — toujours en priorité haute :
    - `01_overview.md` — vue système
    - `02_methodology.md` — approche statistique
    - `03_glossary.md` — VaR, ES, HMM, Sharpe…
    - `04_limitations.md` — biais connus, scope
    - `05_dashboard_playbook.md` — comment lire l'UI
    - `06_common_questions.md` — FAQ
    - `07_operating_contract.md` — ce que le bot peut / ne peut pas faire
    - `08_interpretation_rules.md` — règles de lecture des métriques

2. **Tous les `.md`** de `masi-hybrid-forecasting/docs/` et `reports/`

3. **Les `report.md`** de chaque `outputs/etape*/`

4. **Les 9 notebooks Jupyter** (`notebooks/*.ipynb`) — cellules markdown +
   code + outputs textes courts, parsés par
   `rag_project/rag/notebook_parser.py`

Chunk size par défaut : ~600 caractères avec chevauchement, optimisé pour
les fenêtres de contexte des modèles 4k tokens.

---

## :material-robot: Backends LLM supportés

| Backend | Réseau ? | Variables | Quand l'utiliser |
|---|---|---|---|
| **`fallback`** | aucun | (aucune) | tests / démos / Ollama down |
| **`ollama`** ⭐ | local | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | **défaut** — gratuit, privé, hors-ligne après le pull |
| **`openai`** | API OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL` | qualité maximale, coût à l'usage |
| **`anthropic`** | API Anthropic | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | alternative qualité, Claude |

Le backend est choisi via `LLM_BACKEND` dans `.env`. Si l'appel LLM échoue
(timeout, modèle absent, serveur down), le pipeline **bascule
automatiquement sur le fallback déterministe** sans renvoyer d'erreur à
l'utilisateur — un badge orange `fallback` apparaît juste dans l'UI.

### Modèles Ollama recommandés

| Modèle | Taille | RAM | Profil |
|---|---|---|---|
| `qwen2.5:1.5b` | ~1 Go | 4 Go | machine modeste, tests rapides |
| `qwen2.5:3b` | ~2 Go | 8 Go | **léger par défaut du rag_project** |
| `llama3.2:latest` (3B) | ~2 Go | 8 Go | bon compromis qualité/vitesse |
| `llama3:latest` (8B) | ~5 Go | 16 Go | défaut INSTALL.md, réponses plus précises |
| `qwen2.5:7b-instruct` | ~5 Go | 16 Go | qualité supérieure |
| `mistral:7b` | ~5 Go | 16 Go | alternative équilibrée |

```powershell
ollama pull qwen2.5:3b
# puis dans .env :
# LLM_BACKEND=ollama
# OLLAMA_MODEL=qwen2.5:3b
```

!!! tip "Auto-start Ollama"
    Le client Ollama du `rag_project` **démarre automatiquement** `ollama
    serve` si le serveur n'est pas joignable. Désactivable via
    `OLLAMA_AUTO_START=0` dans `.env`.

---

## :material-shield-alert: Guardrails

Les `response_guardrails` (`rag_project/chatbot/response_guardrails.py`)
analysent la réponse générée **après** le LLM mais **avant** de la renvoyer
à l'utilisateur. Ils bloquent ou corrigent automatiquement :

!!! danger "Refus systématique"
    - **Recommandation d'achat / vente** → refus standard avec badge `policy`
    - **Conseil d'investissement personnalisé** → refus poli
    - **Prédiction sur autre actif que MASI** → refus hors-scope

!!! warning "Corrections automatiques (`answer_repair`)"
    - **Pourcentage halluciné** absent du contexte → retiré
    - **Confusion VaR / ES** → reformulé selon les définitions du glossaire
    - **« régime HMM prédit la direction »** → corrigé (le HMM gère le régime, pas la direction)
    - **« Monte Carlo pour horizon 10/25j »** → corrigé (pas la méthodo réelle)
    - **« MASI = marché algérien »** → corrigé (MASI = Casablanca, Maroc)
    - **Dates relatives inventées** (« aujourd'hui ») → flag

L'objectif n'est pas la perfection mais d'éviter les **erreurs récurrentes
observées** lors du développement.

---

## :material-cog: Variables d'environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `MASI_PROJECT_ROOT` | `…/masi-hybrid-forecasting` | Racine du projet MASI à indexer |
| `LLM_BACKEND` | `ollama` | `ollama` \| `openai` \| `anthropic` \| `fallback` |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Modèle Ollama |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL serveur Ollama |
| `OLLAMA_AUTO_START` | `1` | Démarre `ollama serve` auto si down |
| `OLLAMA_TEMPERATURE` | `0.15` | Température (faible = déterministe) |
| `OLLAMA_NUM_CTX` | `4096` | Context window |
| `OLLAMA_NUM_PREDICT` | `700` | Max tokens générés |
| `RAG_CHROMA_DIR` | `./.chroma_db` | Persistance Chroma |
| `RAG_COLLECTION` | `masi_kb` | Nom de la collection |
| `RAG_TOP_K` | `6` | Nombre de chunks retournés |
| `RAG_BM25_WEIGHT` | `0.4` | Poids BM25 dans le score combiné |
| `RAG_EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Modèle SBERT |
| `RAG_EMBEDDING_DEVICE` | `cpu` | `cpu` \| `cuda` |
| `RAG_INTENT_THRESHOLD` | `0.30` | Seuil cosine intent → out_of_scope |

---

## :material-test-tube: Tester sans démarrer l'API

```powershell
# Single shot
python -m rag_project.scripts.test_chat "c'est quoi la VaR ?"

# Batch (9 questions samples)
python -m rag_project.scripts.test_chat
```

Cela exécute le pipeline complet sans avoir besoin de FastAPI ni du
frontend Next.js — utile pour debugger l'intent router, le retriever ou un
nouveau modèle Ollama.

---

## :material-message-text: Utilisation depuis l'UI

L'UI ChatView (`frontend/src/components/chat-view.tsx`) affiche :

- :material-format-text: **Markdown rendu** (gras, code, listes, headers, tableaux)
- :material-source-branch: **Sources expandables** avec icône par kind (notebook / curated / markdown)
- :material-tag-multiple: **Badges meta** : `intent`, `backend` (ollama / fallback / policy), `live`, `rag`
- :material-content-copy: **Copier** la réponse, :material-delete: **Effacer** la conversation, :material-stop: **Stop** pour interrompre la génération
- :material-lightbulb: **Suggestions catégorisées** : Prévision live, Risque, Stratégies, Méthodologie

---

## :material-bug: Dépannage

??? failure "« Ollama n'est pas joignable »"
    Vérifie que Ollama Desktop est lancé (icône systray Windows). Sinon en CLI :

    ```powershell
    ollama serve
    ```

??? failure "« Modèle Ollama 'qwen2.5:3b' absent »"
    ```powershell
    ollama pull qwen2.5:3b
    ```

??? failure "« Index Chroma absent »"
    ```powershell
    python -m rag_project.scripts.build_index
    ```

    Vérifie aussi que `MASI_PROJECT_ROOT` pointe vers le bon dossier.

??? failure "Réponses systématiquement en mode fallback"
    Test direct :
    ```powershell
    python -m rag_project.scripts.test_chat "bonjour"
    ```
    Si fallback persiste, Ollama refuse — vérifie `ollama list` et la
    cohérence de `OLLAMA_MODEL`.

??? failure "Le RAG ne trouve pas les notebooks"
    Vérifie `MASI_PROJECT_ROOT` et que
    `masi-hybrid-forecasting/notebooks/*.ipynb` existe. Le log
    d'indexation doit afficher `Notebook XX_xxx → N chunks`.

??? failure "Réponses Ollama très lentes"
    Le modèle 8B est lourd pour les petites machines. Passe à
    `qwen2.5:1.5b` ou `llama3.2:latest` :
    ```powershell
    ollama pull qwen2.5:1.5b
    # puis OLLAMA_MODEL=qwen2.5:1.5b dans .env, et redémarrer l'API
    ```

---

## :material-comment-question: Exemples de requêtes

```text
"quelle est la prédiction du jour ?"          → forecast_query  + live snapshot
"quel est le VaR aujourd'hui ?"               → risk_query      + live snapshot
"on est dans quel régime HMM ?"               → regime_query    + live snapshot
"quelle stratégie a le meilleur Sharpe ?"     → strategy_query  + metrics
"explique le CNN-LSTM en 2 phrases"           → methodology     + notebooks
"c'est quoi l'Expected Shortfall ?"           → glossary        + doc curated
"que peux-tu faire ?"                         → help_request    + playbook
"dois-je acheter MASI demain ?"               → REFUS (advice policy)
"météo à Casablanca ?"                        → REFUS (out_of_scope)
```
