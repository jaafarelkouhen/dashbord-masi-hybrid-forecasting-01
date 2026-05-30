// Fetch wrappers — relative paths so dev/prod just work.

const BASE = "";

async function _fetch(path, init) {
  const res = await fetch(BASE + path, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} ${res.statusText} — ${text || path}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  health: () => _fetch("/api/health"),

  forecastLatest: () => _fetch("/api/forecast/latest"),
  forecastSeries: (window) => _fetch(`/api/forecast/series${window ? `?window=${window}` : ""}`),
  forecastKpis: () => _fetch("/api/forecast/kpis"),
  forecastRegimes: () => _fetch("/api/forecast/regimes"),

  riskSeries: (window) => _fetch(`/api/risk/series${window ? `?window=${window}` : ""}`),
  riskValidation: () => _fetch("/api/risk/validation"),
  riskBreaches: () => _fetch("/api/risk/breaches"),

  strategies: () => _fetch("/api/strategies"),
  equityCurves: () => _fetch("/api/backtest/equity"),
  backtestSummary: () => _fetch("/api/backtest/summary"),

  predictionsRiskScore: (window = 252) => _fetch(`/api/predictions/risk-score?window=${window}`),
  predictionsPersistence: () => _fetch("/api/predictions/regime-persistence"),
  predictionsSnapshot: () => _fetch("/api/predictions/snapshot"),

  horizonSummary: (year = 2026) => _fetch(`/api/horizon/summary?year=${year}`),
  horizonDaily: (year = 2026) => _fetch(`/api/horizon/daily?year=${year}`),
  horizonMonthly: (year = 2026) => _fetch(`/api/horizon/monthly?year=${year}`),

  chat: (payload) =>
    _fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
