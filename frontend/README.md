# `frontend/` — Next.js dashboard UI

The user-facing dashboard: Next.js + React + Tailwind, talking to the FastAPI
backend at `http://127.0.0.1:8000`.

```
frontend/
├── app/                 # Next.js app router entry
├── public/ , assets/    # static assets
└── src/
    ├── components/
    │   ├── landing-page.tsx     # landing / intro
    │   ├── dashboard-app.tsx    # main shell (Forecast / Risk / Backtest tabs)
    │   ├── plotly-chart.tsx     # chart wrapper (Plotly)
    │   └── chat-view.tsx        # RAG assistant UI (markdown, sources, meta badges)
    ├── lib/
    │   ├── api.ts               # typed calls to the backend
    │   └── format.ts            # number / date formatting
    └── types/                   # TypeScript declarations
```

## What it shows

- **Forecast** — next-day prediction (CNN-LSTM × HMM-gate), live KPIs, equity vs
  Buy & Hold, regime distribution & persistence, 0–100 risk score.
- **Risk** — VaR / ES / GARCH vol series, observed vs expected breaches, Kupiec
  & Christoffersen tests.
- **Backtest** — 7 strategies compared (Sharpe / Sortino / drawdown / equity).
- **Assistant** — the RAG chat view: rendered markdown, expandable sources, and
  meta badges (intent, backend `ollama`/`fallback`/`policy`, `live`, `rag`).

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

The backend (`../app`) must be running for data to load. The API base URL is set
in `src/lib/api.ts` (and/or `.env.local` — see `.env.local.example`).
