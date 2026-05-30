# Guide d'installation — MASI Hybrid Forecasting Dashboard

Ce guide explique, **pas-à-pas**, comment installer Ollama (le moteur LLM
local) puis le dashboard MASI sur votre machine. Aucune connaissance préalable
n'est requise — il suffit de suivre les étapes dans l'ordre.

À la fin de ce guide, vous aurez :

- **Ollama** qui tourne en local (LLM gratuit, pas de clé API, pas d'envoi
  de données sur Internet),
- l'**API FastAPI** du dashboard sur `http://127.0.0.1:8000`,
- le **dashboard Next.js** ouvert sur `http://127.0.0.1:3000`,
- un **assistant RAG** capable de répondre à des questions sur le projet.

---

## 0. Pré-requis

Vérifiez que vous avez ces logiciels installés. Si l'un manque, installez-le
depuis le lien officiel.

| Outil | Version min. | Lien |
|---|---|---|
| **Python** | 3.10+ | https://www.python.org/downloads/ |
| **Node.js** | 20+ (LTS) | https://nodejs.org/en/download |
| **Git** | n'importe | https://git-scm.com/downloads |

Ouvrez un terminal (PowerShell sous Windows, Terminal sous macOS/Linux) et
vérifiez :

```powershell
python --version    # >= 3.10
node --version      # >= 20
git --version
```

**Important — les artefacts MASI** : ce dashboard ne ré-entraîne pas les
modèles, il **lit** les CSV/JSON produits par le projet sœur
`masi-hybrid-forecasting`. Vous devez donc l'avoir cloné et avoir lancé son
pipeline au moins une fois. Si ce n'est pas fait, voir la section
[« Étape 2 — Projet engine »](#étape-2--projet-engine-masi-hybrid-forecasting) plus bas.

---

## 1. Installer Ollama

Ollama exécute des LLM (Llama 3, Qwen, Mistral, …) **directement sur votre
machine**, sans clé API et sans Internet (une fois le modèle téléchargé).

### 1.1 Télécharger Ollama

| Système | Méthode |
|---|---|
| **Windows** | Télécharger l'installeur `OllamaSetup.exe` sur https://ollama.com/download/windows et l'exécuter. |
| **macOS** | Télécharger `Ollama.dmg` sur https://ollama.com/download/mac, le glisser dans Applications. |
| **Linux** | Une seule commande : `curl -fsSL https://ollama.com/install.sh \| sh` |

### 1.2 Vérifier qu'Ollama tourne

Après installation, Ollama démarre automatiquement un service local sur le
port **11434**. Vérifiez :

```powershell
ollama --version
curl http://localhost:11434
# Réponse attendue : "Ollama is running"
```

Si la commande `ollama` n'est pas reconnue sous Windows, fermez puis rouvrez
PowerShell (le PATH n'est rechargé qu'à l'ouverture d'un nouveau terminal).

### 1.3 Télécharger un modèle

Le dashboard utilise par défaut **`llama3:latest`** (8 milliards de
paramètres, ~5 Go). Téléchargez-le :

```powershell
ollama pull llama3:latest
```

Le premier `pull` prend quelques minutes (selon votre connexion). Modèles
alternatifs selon la RAM disponible :

| Modèle | Taille | RAM conseillée | Quand l'utiliser |
|---|---|---|---|
| `qwen2.5:1.5b` | ~1 Go | 4 Go | machine modeste / tests rapides |
| `llama3.2:latest` (3B) | ~2 Go | 8 Go | bon compromis |
| **`llama3:latest`** (8B) | ~5 Go | 16 Go | **défaut, réponses plus précises** |
| `qwen2.5:3b` | ~2 Go | 8 Go | alternative à llama3.2 |

Téléchargez n'importe lequel via `ollama pull <nom>`. Vous pourrez changer
de modèle plus tard via la variable `OLLAMA_MODEL` du `.env`.

### 1.4 Tester le modèle

```powershell
ollama run llama3:latest "dis bonjour"
```

Si vous voyez une réponse, **Ollama est prêt**. Tapez `/bye` pour quitter
le chat.

> 💡 **Ollama tourne en arrière-plan en permanence** (Windows : icône lama
> dans la barre des tâches). Pas besoin de le relancer à chaque fois.

---

## 2. Installer le dashboard MASI

### Étape 2 — Projet engine `masi-hybrid-forecasting`

Le dashboard a besoin des **artefacts** (CSV/JSON) produits par le projet
sœur. Si vous ne l'avez pas encore :

```powershell
# À côté du dossier du dashboard, pas dedans
cd ..
git clone <url-du-projet> masi-hybrid-forecasting
cd masi-hybrid-forecasting
pip install -e ".[notebooks,dev]"

# Lance le pipeline complet (peut prendre du temps la première fois)
python -m masi_hybrid_forecasting.pipeline predict
python -m masi_hybrid_forecasting.pipeline risk
python -m masi_hybrid_forecasting.pipeline backtest --strategy hmm_gate
python -m masi_hybrid_forecasting.pipeline export  --strategy hmm_gate
```

La structure finale doit ressembler à :

```
2-TimeSeriesProject/
├── masi-hybrid-forecasting/              ← engine (produit les CSV/JSON)
└── dashbord-masi-hybrid-forecasting-01/  ← ce repo (les lit)
```

### Étape 3 — Backend Python (FastAPI)

Depuis la racine du dossier `dashbord-masi-hybrid-forecasting-01` :

```powershell
# 1) Créer un environnement virtuel Python
python -m venv .venv

# 2) L'activer
.\.venv\Scripts\Activate.ps1     # Windows PowerShell
# source .venv/bin/activate      # macOS / Linux

# 3) Installer les dépendances
pip install -U pip
pip install -r requirements.txt
```

### Étape 4 — Frontend Next.js

```powershell
cd frontend
npm install
cd ..
```

`npm install` télécharge React, Next.js, Plotly, Tailwind, etc. (~300 Mo
dans `frontend/node_modules`). Cela peut prendre 2-3 minutes.

### Étape 5 — Configuration `.env`

Le dashboard lit deux fichiers de configuration. **Aucun des deux n'est
versionné**, il faut les créer.

#### 5.1 — Backend `.env` (à la racine)

```powershell
# Depuis la racine du dashboard
Copy-Item .env.example .env
```

Puis ouvrez `.env` et modifiez :

```dotenv
# Chemin ABSOLU vers le projet engine (adapter à votre machine)
MASI_PROJECT_ROOT=C:/Users/<vous>/.../masi-hybrid-forecasting

# Pour utiliser Ollama (au lieu du mode "fallback" déterministe)
LLM_BACKEND=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3:latest          # ou qwen2.5:1.5b, llama3.2:latest, …
```

> ⚠️ Sous Windows, utilisez des **slashes** `/` dans le chemin, pas des
> backslashes. Sinon Pydantic peut interpréter les `\` comme des échappements.

#### 5.2 — Frontend `.env.local`

```powershell
Copy-Item frontend\.env.local.example frontend\.env.local
```

Le contenu par défaut suffit :

```dotenv
API_PROXY_TARGET=http://127.0.0.1:8000
```

> ⚠️ Si vous changez `API_PORT` dans `.env`, mettez à jour ce fichier en
> conséquence (ex. `8001` si le port 8000 est déjà pris par autre chose).

### Étape 6 — Construire l'index RAG

L'assistant RAG indexe la documentation du projet pour pouvoir répondre
avec sources. Cette étape se fait **une seule fois** (et à chaque mise
à jour de la doc) :

```powershell
python scripts\build_rag_index.py
```

Vous devriez voir quelque chose comme `indexed N chunks into collection
masi_kb`.

---

## 3. Lancer le dashboard

Il faut **trois processus** en parallèle (idéalement trois terminaux).

### Terminal 1 — Ollama

Normalement déjà lancé (service système). Pour vérifier :

```powershell
curl http://localhost:11434
```

Si rien ne répond, relancez Ollama depuis le menu Démarrer (Windows) ou
les Applications (macOS), ou lancez `ollama serve` (Linux).

### Terminal 2 — Backend FastAPI

```powershell
.\.venv\Scripts\Activate.ps1
.\scripts\run_dev.ps1
# ou directement :
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Sortie attendue : `Application startup complete.` et le serveur écoute
sur `http://127.0.0.1:8000`.

### Terminal 3 — Frontend Next.js

```powershell
cd frontend
npm run dev
```

Sortie attendue : `▲ Next.js … - Local: http://localhost:3000`.

---

## 4. Ouvrir le dashboard

| URL | Page |
|---|---|
| http://127.0.0.1:3000/ | Landing page (présentation) |
| http://127.0.0.1:3000/dashboard | **Dashboard interactif** (Forecast / Risk / Backtest / Chat) |
| http://127.0.0.1:8000/docs | Documentation OpenAPI de l'API |
| http://127.0.0.1:8000/api/health | Santé de l'API + détection artefacts |

Allez sur `/dashboard`, et dans le panneau **Assistant**, posez par
exemple : *« quel est le VaR du jour ? »* — la réponse est désormais
générée par votre LLM local Ollama.

---

## 5. Vérifications rapides

```powershell
# Ollama répond ?
curl http://localhost:11434

# L'API voit-elle les artefacts ?
curl http://127.0.0.1:8000/api/health

# Dernière prédiction ?
curl http://127.0.0.1:8000/api/forecast/latest

# Test du chat (RAG + Ollama)
curl -X POST http://127.0.0.1:8000/api/chat `
  -H "Content-Type: application/json" `
  -d '{"message":"explique la méthodologie en 2 phrases"}'
```

---

## 6. Dépannage

| Symptôme | Cause probable | Correctif |
|---|---|---|
| Le chat répond toujours « réponse déterministe… » | `LLM_BACKEND` n'est pas `ollama` dans `.env` | Éditer `.env`, relancer l'API |
| `Connection refused: localhost:11434` | Ollama n'est pas démarré | Relancer Ollama (icône système ou `ollama serve`) |
| `model "llama3:latest" not found` | Modèle pas téléchargé | `ollama pull llama3:latest` |
| Dashboard affiche `Artefact manquant` | `MASI_PROJECT_ROOT` mal renseigné ou pipeline non exécuté | Vérifier le chemin, relancer le pipeline de l'engine |
| Frontend tape sur le mauvais backend | `frontend/.env.local` absent ou pointe sur un autre port | Vérifier `API_PROXY_TARGET=http://127.0.0.1:8000` |
| `Port 8000 already in use` | Un autre service occupe le port | Mettre `API_PORT=8001` dans `.env` **et** `API_PROXY_TARGET=http://127.0.0.1:8001` dans `frontend/.env.local` |
| Réponses Ollama très lentes | Modèle 8B trop lourd | Passer à `qwen2.5:1.5b` ou `llama3.2:latest` |

---

## 7. Désinstallation propre

```powershell
# Supprimer l'environnement Python
Remove-Item -Recurse -Force .venv

# Supprimer les dépendances Node
Remove-Item -Recurse -Force frontend\node_modules

# Supprimer l'index RAG
Remove-Item -Recurse -Force .chroma_db
```

Ollama se désinstalle depuis **Paramètres > Applications** (Windows) ou en
glissant l'app dans la corbeille (macOS). Les modèles téléchargés sont
dans `~/.ollama/models` — vous pouvez les supprimer manuellement pour
libérer de l'espace disque.

---

## Et après ?

- README développeur (architecture, endpoints, scripts) → [`README.md`](README.md)
- Vue d'ensemble du système (engine + dashboard) → [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md)

> ⚠️ Ce projet est un travail de recherche sur un marché frontière (MASI).
> Rien dans ce dashboard ne constitue un conseil d'investissement.
> L'assistant est explicitement configuré pour refuser toute recommandation
> d'achat/vente.
