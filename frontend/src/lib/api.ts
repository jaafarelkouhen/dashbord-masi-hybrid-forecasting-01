export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatSource = {
  title: string;
  section?: string;
  snippet: string;
  score: number;
  source: string;
  kind?: "markdown" | "notebook" | "curated";
};

export type ChatBackendResponse = {
  answer: string;
  sources: ChatSource[];
  backend: string;
  intent: string;
  used_rag?: boolean;
  used_live?: boolean;
};

export type ForecastLatest = {
  date: string;
  predicted_return: number;
  actual_return: number;
  position: number;
  regime: string;
  var_5: number;
  es_5: number;
  equity: number;
  strategy_name: string;
};

export type ForecastKpis = {
  n_test_days: number;
  test_range: [string, string];
  cumulative_return: number;
  directional_accuracy: number;
  primary_cost_bps: number;
};

export type ForecastSeries = {
  dates: string[];
  actual_return: number[];
  equity: number[];
  regime: string[];
};

export type RegimeDistribution = {
  regimes: Array<{ name: string; count: number; share: number }>;
};

export type Persistence = {
  current: string;
  regimes: Array<{ name: string; mean_duration: number; n_runs: number }>;
};

export type Snapshot = {
  risk_score: number;
  streak_days: number;
  p_regime_switch_next: number;
};

export type RiskSeries = {
  dates: string[];
  actual_return: number[];
  var_param_5: number[];
  es_param_5: number[];
  vol_garch: number[];
};

export type RiskBreaches = {
  n_days: number;
  expected_5pct: number;
  observed_param: number;
  observed_hist: number;
  rate_param: number;
};

export type RiskValidation = {
  alpha: number;
  rolling_window: number;
  cost_bps: number;
  kupiec?: Record<string, Record<string, number | string>>;
  christoffersen?: Record<string, Record<string, number | string>>;
};

export type Strategy = {
  id: string;
  label?: string;
  sharpe?: number | null;
  sortino?: number | null;
  ann_return?: number | null;
  max_drawdown?: number | null;
  final_equity?: number | null;
  n_trades?: number | null;
};

export type EquityCurves = {
  dates: string[];
  series: Record<string, number[]>;
};

export type HorizonMonth = {
  month: string;
  source: string;
  n_days: number;
  start_reference_close: number;
  end_predicted_close: number;
  monthly_log_return: number;
  monthly_simple_return_pct: number;
  mean_daily_predicted_return: number;
  positive_days: number;
  negative_days: number;
};

export type HorizonSummary = {
  year: number;
  last_obs_date: string | null;
  last_obs_close: number | null;
  arima_order: string | null;
  arima_aic: number | null;
  regime_drift: number | null;
  n_mc: number | null;
  n_forecast_days: number;
  horizon_start_close: number | null;
  horizon_end_close: number | null;
  horizon_cum_return_pct: number | null;
  band_p10_end: number | null;
  band_p90_end: number | null;
  signal_counts: Record<string, number>;
  months: HorizonMonth[];
};

export type HorizonDaily = {
  year: number;
  date: string[];
  source: string[];
  predicted_log_return: (number | null)[];
  predicted_close: (number | null)[];
  mc_p10: (number | null)[];
  mc_p50: (number | null)[];
  mc_p90: (number | null)[];
  ci95_low: (number | null)[];
  ci95_high: (number | null)[];
  month: string[];
  signal: string[];
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${response.statusText}${body ? ` · ${body}` : ""}`);
  }

  return response.json() as Promise<T>;
}

export type HealthResponse = {
  status: string;
  version: string;
  llm_backend: string;
  fastapi: { reachable: boolean; host: string; port: number };
  ollama: {
    configured: boolean;
    reachable: boolean;
    model: string;
    model_installed?: boolean;
    available_models: string[];
  };
  masi_root: string;
  artefacts: Record<string, boolean>;
};

export const api = {
  health: () => fetchJson<HealthResponse>("/api/health"),
  forecastLatest: () => fetchJson<ForecastLatest>("/api/forecast/latest"),
  forecastKpis: () => fetchJson<ForecastKpis>("/api/forecast/kpis"),
  forecastSeries: (window = 252) =>
    fetchJson<ForecastSeries>(`/api/forecast/series${window > 0 ? `?window=${window}` : ""}`),
  forecastRegimes: () => fetchJson<RegimeDistribution>("/api/forecast/regimes"),
  persistence: () => fetchJson<Persistence>("/api/predictions/regime-persistence"),
  snapshot: () => fetchJson<Snapshot>("/api/predictions/snapshot"),
  riskSeries: (window = 500) => fetchJson<RiskSeries>(`/api/risk/series?window=${window}`),
  riskValidation: () => fetchJson<RiskValidation>("/api/risk/validation"),
  riskBreaches: () => fetchJson<RiskBreaches>("/api/risk/breaches"),
  strategies: () => fetchJson<{ strategies: Strategy[] }>("/api/strategies"),
  equityCurves: () => fetchJson<EquityCurves>("/api/backtest/equity"),
  horizonSummary: (year = 2026) => fetchJson<HorizonSummary>(`/api/horizon/summary?year=${year}`),
  horizonDaily: (year = 2026) => fetchJson<HorizonDaily>(`/api/horizon/daily?year=${year}`),
  chat: (payload: { message: string; history: ChatMessage[] }) =>
    fetchJson<ChatBackendResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
