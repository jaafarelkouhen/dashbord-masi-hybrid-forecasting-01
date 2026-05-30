"use client";

import {
  CalendarRange,
  Cpu,
  Download,
  Gauge,
  LineChart,
  MessageSquare,
  Play,
  RefreshCw,
  Shield,
  Table2,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  api,
  EquityCurves,
  ForecastKpis,
  ForecastLatest,
  ForecastSeries,
  HealthResponse,
  HorizonDaily,
  HorizonSummary,
  Persistence,
  RegimeDistribution,
  RiskBreaches,
  RiskSeries,
  RiskValidation,
  Snapshot,
  Strategy,
} from "@/lib/api";
import { date, num, pct, signedPct, toneFromValue } from "@/lib/format";
import { baseLayout, chartTheme, PlotlyChart } from "@/components/plotly-chart";
import { ChatView } from "@/components/chat-view";

type ViewId = "forecast" | "horizon" | "risk" | "backtest" | "chat";

const views: Array<{
  id: ViewId;
  label: string;
  sub: string;
  icon: typeof LineChart;
  group: "ANALYTICS" | "MODELS";
}> = [
  { id: "forecast", label: "Live Forecast", sub: "Signal J+1", icon: LineChart, group: "ANALYTICS" },
  { id: "horizon", label: "Horizon", sub: "Mai – Juin 2026", icon: CalendarRange, group: "ANALYTICS" },
  { id: "risk", label: "Risk Layer", sub: "VaR / ES", icon: Shield, group: "ANALYTICS" },
  { id: "backtest", label: "Backtest", sub: "7 stratégies", icon: Table2, group: "ANALYTICS" },
  { id: "chat", label: "AI Copilot", sub: "RAG métier", icon: MessageSquare, group: "MODELS" },
];

export function DashboardApp() {
  const [active, setActive] = useState<ViewId>("forecast");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthErr, setHealthErr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equityWindow, setEquityWindow] = useState(126);

  const [latest, setLatest] = useState<ForecastLatest | null>(null);
  const [kpis, setKpis] = useState<ForecastKpis | null>(null);
  const [series, setSeries] = useState<ForecastSeries | null>(null);
  const [regimes, setRegimes] = useState<RegimeDistribution | null>(null);
  const [persistence, setPersistence] = useState<Persistence | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const [riskSeries, setRiskSeries] = useState<RiskSeries | null>(null);
  const [riskBreaches, setRiskBreaches] = useState<RiskBreaches | null>(null);
  const [riskValidation, setRiskValidation] = useState<RiskValidation | null>(null);

  const [strategies, setStrategies] = useState<Strategy[] | null>(null);
  const [equityCurves, setEquityCurves] = useState<EquityCurves | null>(null);

  const [horizonSummary, setHorizonSummary] = useState<HorizonSummary | null>(null);
  const [horizonDaily, setHorizonDaily] = useState<HorizonDaily | null>(null);
  const [horizonMonthFilter, setHorizonMonthFilter] = useState<"all" | "2026-05" | "2026-06">("all");

  const loadForecast = useCallback(async () => {
    const [nextLatest, nextKpis, nextSeries, nextRegimes, nextPersistence, nextSnapshot] = await Promise.all([
      api.forecastLatest(),
      api.forecastKpis(),
      api.forecastSeries(equityWindow),
      api.forecastRegimes(),
      api.persistence(),
      api.snapshot(),
    ]);
    setLatest(nextLatest);
    setKpis(nextKpis);
    setSeries(nextSeries);
    setRegimes(nextRegimes);
    setPersistence(nextPersistence);
    setSnapshot(nextSnapshot);
  }, [equityWindow]);

  const loadRisk = useCallback(async () => {
    const [nextSeries, nextBreaches, nextValidation] = await Promise.all([
      api.riskSeries(500),
      api.riskBreaches(),
      api.riskValidation(),
    ]);
    setRiskSeries(nextSeries);
    setRiskBreaches(nextBreaches);
    setRiskValidation(nextValidation);
  }, []);

  const loadBacktest = useCallback(async () => {
    const [nextStrategies, nextCurves] = await Promise.all([api.strategies(), api.equityCurves()]);
    setStrategies(nextStrategies.strategies);
    setEquityCurves(nextCurves);
  }, []);

  const loadHorizon = useCallback(async () => {
    const [nextSummary, nextDaily] = await Promise.all([api.horizonSummary(), api.horizonDaily()]);
    setHorizonSummary(nextSummary);
    setHorizonDaily(nextDaily);
  }, []);

  const loadActive = useCallback(async () => {
    if (active === "forecast") await loadForecast();
    if (active === "horizon") await loadHorizon();
    if (active === "risk") await loadRisk();
    if (active === "backtest") await loadBacktest();
  }, [active, loadBacktest, loadForecast, loadHorizon, loadRisk]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      api
        .health()
        .then((h) => {
          if (!cancelled) {
            setHealth(h);
            setHealthErr(false);
          }
        })
        .catch(() => {
          if (!cancelled) setHealthErr(true);
        });
    };
    tick();
    const interval = window.setInterval(tick, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await loadActive();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [loadActive]);

  async function refresh() {
    setRefreshing(true);
    try {
      await loadActive();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="relative grid min-h-screen grid-cols-[300px_minmax(0,1fr)] max-lg:grid-cols-1">
      {/* Subtle background aurora behind everything */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <span className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-masi/10 blur-3xl" />
        <span className="absolute -right-32 top-1/2 h-96 w-96 rounded-full bg-plasma/8 blur-3xl" />
      </div>
      <aside className="sticky top-0 flex h-screen flex-col gap-7 border-r border-white/10 bg-black/55 p-6 backdrop-blur-xl max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:z-30 max-lg:h-auto max-lg:flex-row max-lg:items-center max-lg:overflow-x-hidden max-lg:border-b max-lg:border-r-0 max-lg:p-3 max-[420px]:gap-3">
        {/* Gradient accent stripe on left edge */}
        <span className="pointer-events-none absolute left-0 top-0 h-full w-px bg-gradient-to-b from-masi/0 via-masi/60 to-plasma/0 max-lg:hidden" />
        <div className="border-b border-line pb-8 max-lg:border-0 max-lg:pb-0">
          <div className="flex items-center gap-2 whitespace-nowrap font-mono text-2xl font-black uppercase tracking-normal max-[420px]:text-xl">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-gradient-ember shadow-glow">
              <Cpu size={16} className="text-black" strokeWidth={3} />
            </span>
            <span>MASI</span>
            <span className="text-masi">·</span>
            <span className="max-[420px]:hidden">HYBRID</span>
          </div>
          <div className="mt-9 grid gap-1 font-mono text-sm font-black uppercase text-muted max-lg:hidden">
            <span>Forecasting Engine</span>
            <span className="text-violet">v1.0</span>
          </div>
        </div>

        <nav className="grid gap-7 max-lg:flex max-lg:min-w-0 max-lg:flex-1 max-lg:justify-end max-lg:gap-2 max-[420px]:gap-1.5">
          {(["ANALYTICS", "MODELS"] as const).map((group) => (
            <div key={group} className="grid gap-3 max-lg:contents">
              <p className="px-3 font-mono text-xs font-black uppercase text-muted max-lg:hidden">{group}</p>
              {views
                .filter((view) => view.group === group)
                .map((view) => {
                  const Icon = view.icon;
                  const selected = active === view.id;
                  return (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => setActive(view.id)}
                      className={`group relative flex min-h-12 items-center gap-3 overflow-hidden rounded-lg border px-4 text-left transition-all duration-200 ease-out active:scale-[0.985] max-lg:min-h-10 max-lg:px-3 max-[420px]:px-2.5 ${
                        selected
                          ? "border-masi/40 bg-gradient-to-r from-masi/15 via-masi/8 to-transparent text-ink shadow-terminal"
                          : "border-transparent text-muted hover:border-white/10 hover:bg-white/[0.035] hover:text-ink"
                      }`}
                    >
                      {selected ? (
                        <>
                          <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-masi via-ember to-plasma" />
                          <span className="pointer-events-none absolute -right-12 -top-8 h-24 w-24 rounded-full bg-masi/20 blur-2xl" />
                        </>
                      ) : null}
                      <Icon size={17} className={selected ? "text-masi" : "text-muted transition-colors group-hover:text-violet"} />
                      <span className="grid max-lg:hidden">
                        <strong className="font-mono text-sm font-black uppercase">{view.label}</strong>
                        <small className="text-xs text-muted">{view.sub}</small>
                      </span>
                      {view.id === "forecast" ? (
                        <span className="ml-auto rounded-md bg-gradient-ember px-2 py-1 font-mono text-[10px] font-black uppercase text-black shadow-glow max-lg:hidden">
                          Live
                        </span>
                      ) : null}
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>

        <div className="mt-auto grid gap-3 font-mono max-lg:hidden">
          <div className="glass-panel rounded-xl p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted">Model Stack</p>
            <div className="mt-3 grid gap-2.5">
              <span className="flex items-center gap-2 text-sm font-black uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-masi" />
                CNN-LSTM
              </span>
              <span className="flex items-center gap-2 text-sm font-black uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-violet" />
                HMM <span className="text-violet">3-state</span>
              </span>
              <span className="flex items-center gap-2 text-sm font-black uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
                EGARCH σ
              </span>
            </div>
          </div>
          <ServicesStatus health={health} healthErr={healthErr} />
        </div>
      </aside>

      <main className="min-w-0 overflow-x-hidden px-10 py-9 max-lg:px-4 max-lg:pb-8 max-lg:pt-24">
        <div className="mx-auto grid max-w-[1480px] gap-6">
          <MarketStrip latest={latest} regimes={regimes} refresh={refresh} refreshing={refreshing} />
          {error ? <ErrorBanner message={error} /> : null}

          {active === "forecast" ? (
            <ForecastView
              latest={latest}
              kpis={kpis}
              series={series}
              regimes={regimes}
              persistence={persistence}
              snapshot={snapshot}
              equityWindow={equityWindow}
              setEquityWindow={setEquityWindow}
              refreshing={refreshing}
              refresh={refresh}
            />
          ) : null}

          {active === "horizon" ? (
            <HorizonView
              summary={horizonSummary}
              daily={horizonDaily}
              monthFilter={horizonMonthFilter}
              setMonthFilter={setHorizonMonthFilter}
            />
          ) : null}

          {active === "risk" ? (
            <RiskView series={riskSeries} breaches={riskBreaches} validation={riskValidation} />
          ) : null}

          {active === "backtest" ? <BacktestView strategies={strategies} curves={equityCurves} /> : null}

          {active === "chat" ? <ChatView /> : null}
        </div>
      </main>
    </div>
  );
}

function MarketStrip({
  latest,
  regimes,
  refresh,
  refreshing,
}: {
  latest: ForecastLatest | null;
  regimes: RegimeDistribution | null;
  refresh: () => void;
  refreshing: boolean;
}) {
  const regimePosterior = latest
    ? regimes?.regimes.find((regime) => regime.name.toLowerCase() === latest.regime.toLowerCase())?.share
    : null;

  return (
    <div className="relative flex items-start justify-between gap-5 border-b border-line pb-8 max-xl:flex-col">
      <span className="pointer-events-none absolute -left-12 -top-8 h-32 w-64 bg-gradient-to-r from-masi/15 to-transparent blur-3xl" />
      <div className="relative min-w-0">
        <p className="flex items-center gap-2 font-mono text-xs font-black uppercase tracking-wider text-muted">
          <span className="h-px w-6 bg-gradient-to-r from-masi to-transparent" />
          Dashboard / Forecast
        </p>
        <h1 className="mt-3 max-w-3xl font-mono text-2xl font-black uppercase leading-tight text-ink sm:text-3xl md:text-4xl">
          Live Forecast <span className="gradient-text-mint">MASI Index</span>
          <br />
          <span className="text-muted text-xl sm:text-2xl md:text-3xl">Casablanca Stock Exchange</span>
        </h1>
      </div>
      <div className="relative flex flex-wrap items-center justify-end gap-3 max-xl:justify-start">
        <div className="glass-panel min-w-60 rounded-xl border-mint/40 px-5 py-3 font-mono text-mint shadow-[0_0_48px_-34px_rgba(0,245,159,.85)]">
          <p className="flex items-center gap-2 text-sm font-black uppercase">
            <span className="pulse-dot h-2 w-2 rounded-full bg-mint" />
            Regime: {latest?.regime ?? "Loading"}
          </p>
          <p className="mt-1 text-sm font-black">
            · {regimePosterior == null ? "--" : `${(regimePosterior * 100).toFixed(0)}%`} posterior
          </p>
        </div>
        <button type="button" className="desk-button">
          <Download size={15} />
          Export
        </button>
        <button type="button" className="desk-button btn-primary border-0 shadow-premium" onClick={refresh} disabled={refreshing}>
          {refreshing ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} fill="currentColor" />}
          Run Pipeline
        </button>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-masi/30 bg-masi/10 px-4 py-3 text-sm text-ink">
      <TriangleAlert size={18} className="text-masi" />
      <span>{message}</span>
    </div>
  );
}

function ViewHeader({
  eyebrow,
  title,
  meta,
  action,
}: {
  eyebrow: string;
  title: string;
  meta: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex w-full min-w-0 items-start justify-between gap-5 max-md:flex-col">
      <div className="w-full min-w-0">
        <p className="mb-2 font-mono text-xs font-black uppercase text-violet">{eyebrow}</p>
        <h2 className="font-mono text-2xl font-black uppercase leading-tight text-ink max-md:text-xl">{title}</h2>
        <p className="mt-3 max-w-full break-words font-mono text-sm text-muted">{meta}</p>
      </div>
      {action}
    </header>
  );
}

function ForecastView(props: {
  latest: ForecastLatest | null;
  kpis: ForecastKpis | null;
  series: ForecastSeries | null;
  regimes: RegimeDistribution | null;
  persistence: Persistence | null;
  snapshot: Snapshot | null;
  equityWindow: number;
  setEquityWindow: (value: number) => void;
  refreshing: boolean;
  refresh: () => void;
}) {
  const { latest, kpis, series, regimes, persistence, snapshot, equityWindow, setEquityWindow, refreshing, refresh } =
    props;

  return (
    <section className="grid gap-6">
      <ViewHeader
        eyebrow="Stratégie production · HMM-gate · DSR ≈ 0.997"
        title="Forecast control"
        meta={
          kpis && latest
            ? `TEST : ${date(kpis.test_range[0])} → ${date(kpis.test_range[1])} · ${kpis.n_test_days} jours · coût ${kpis.primary_cost_bps} bps · stratégie ${latest.strategy_name}`
            : "Chargement des métriques de production..."
        }
      />

      <div className="grid grid-cols-6 gap-3 max-xl:grid-cols-3 max-md:grid-cols-2 max-[560px]:grid-cols-1">
        <MetricCard
          tone="mint"
          label="Rendement prédit"
          value={latest ? signedPct(latest.predicted_return, 3) : "—"}
          sub={latest ? `actuel ${signedPct(latest.actual_return, 3)} · pos ${latest.position >= 0 ? "+" : ""}${latest.position.toFixed(0)}` : "J+1, modèle CNN-LSTM"}
          valueClass={latest ? toneFromValue(latest.predicted_return) : undefined}
        />
        <MetricCard tone="red" label="VaR 5% · 1D" value={latest ? signedPct(latest.var_5, 2) : "—"} sub="↓ tgt -1.61%" valueClass="text-danger" />
        <MetricCard tone="red" label="ES 5% · 1D" value={latest ? signedPct(latest.es_5, 2) : "—"} sub="2-step ridge" valueClass="text-danger" />
        <MetricCard
          tone="amber"
          label="Régime HMM"
          value={latest?.regime ?? "—"}
          sub={snapshot ? `streak ${snapshot.streak_days}j · switch ${switchPressure(snapshot.p_regime_switch_next)}` : "Streak —"}
          subClass={snapshot && snapshot.p_regime_switch_next >= 0.66 ? "text-warning" : undefined}
        />
        <MetricCard tone="violet" label="Risk score" value={snapshot ? num(snapshot.risk_score, 1) : "—"} sub="/100, J du jour" />
        <MetricCard
          tone="mint"
          label="Equity finale"
          value={latest ? num(latest.equity, 3) : "—"}
          sub={kpis ? `${kpis.cumulative_return >= 0 ? "+" : ""}${(kpis.cumulative_return * 100).toFixed(1)}% cum · DA ${(kpis.directional_accuracy * 100).toFixed(0)}%` : "Cumul TEST"}
        />
      </div>

      <Panel
        title="Equity Curve × Regime Overlay"
        right={<Segmented value={equityWindow} onChange={setEquityWindow} />}
        primary
      >
        {series ? <EquityChart series={series} /> : <SkeletonChart />}
      </Panel>

      <div className="grid grid-cols-[1.1fr_1fr] gap-4 max-xl:grid-cols-1">
        <Panel title="Regime Distribution">{regimes ? <RegimeChart data={regimes} /> : <SkeletonChart small />}</Panel>
        <Panel title="HMM Regime · posterior">
          {persistence && regimes ? (
            <RegimeInsightPanel persistence={persistence} regimes={regimes} latest={latest} snapshot={snapshot} />
          ) : (
            <SkeletonRows />
          )}
        </Panel>
      </div>
    </section>
  );
}

function RiskView({
  series,
  breaches,
  validation,
}: {
  series: RiskSeries | null;
  breaches: RiskBreaches | null;
  validation: RiskValidation | null;
}) {
  const latestVol = series?.vol_garch.at(-1);

  return (
    <section className="grid gap-6">
      <ViewHeader
        eyebrow="Couche risque · étape 7"
        title="Risque"
        meta={
          breaches
            ? `${breaches.n_days} jours · attendu 5% (${breaches.expected_5pct}) · observé paramétrique ${breaches.observed_param} (${(breaches.rate_param * 100).toFixed(2)}%)`
            : "Chargement de la couche VaR / ES..."
        }
      />

      <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-[560px]:grid-cols-1">
        <MetricCard tone="red" label="VaR 5% (paramétrique)" value={series ? signedPct(series.var_param_5.at(-1), 2) : "—"} sub="Quantile EGARCH" valueClass="text-danger" />
        <MetricCard tone="red" label="ES 5% (paramétrique)" value={series ? signedPct(series.es_param_5.at(-1), 2) : "—"} sub="Espérance conditionnelle" valueClass="text-danger" />
        <MetricCard tone="violet" label="Vol GARCH (J)" value={latestVol == null ? "—" : `${(latestVol * 100).toFixed(2)}%`} sub="Annualisée ≈" />
        <MetricCard tone="amber" label="Breaches observés" value={breaches ? String(breaches.observed_param) : "—"} sub={breaches ? `historique ${breaches.observed_hist} · attendu ${breaches.expected_5pct}` : "vs 5% attendu"} />
      </div>

      <Panel title="VaR · ES · rendements réalisés" primary>
        {series ? <RiskChart series={series} /> : <SkeletonChart />}
      </Panel>

      <Panel
        title="Validation statistique · Kupiec & Christoffersen"
        right={
          validation ? (
            <span className="text-xs text-muted">
              α = {validation.alpha} · fenêtre roulante {validation.rolling_window} · coût {validation.cost_bps} bps
            </span>
          ) : null
        }
      >
        {validation ? <ValidationGrid data={validation} /> : <SkeletonRows />}
      </Panel>
    </section>
  );
}

function HorizonView({
  summary,
  daily,
  monthFilter,
  setMonthFilter,
}: {
  summary: HorizonSummary | null;
  daily: HorizonDaily | null;
  monthFilter: "all" | "2026-05" | "2026-06";
  setMonthFilter: (value: "all" | "2026-05" | "2026-06") => void;
}) {
  const fmtClose = (value: number | null | undefined) =>
    value == null ? "—" : value.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  const fmtPct = (value: number | null | undefined, digits = 2) =>
    value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;

  const cum = summary?.horizon_cum_return_pct ?? null;
  const cumTone = cum == null ? "text-ink" : cum > 0 ? "text-mint" : cum < 0 ? "text-danger" : "text-ink";

  const metaParts: string[] = [];
  if (summary?.last_obs_date)
    metaParts.push(`Dernier observed ${summary.last_obs_date} (${fmtClose(summary.last_obs_close)})`);
  if (summary?.arima_order) metaParts.push(`ARIMA ${summary.arima_order}`);
  if (summary?.arima_aic != null)
    metaParts.push(`AIC ${summary.arima_aic.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`);
  if (summary?.regime_drift != null)
    metaParts.push(`drift HMM ${summary.regime_drift >= 0 ? "+" : ""}${summary.regime_drift.toFixed(5)}/j`);

  return (
    <section className="grid gap-6">
      <ViewHeader
        eyebrow="Projection hors-échantillon · étape 10"
        title="Horizon Mai – Juin 2026"
        meta={metaParts.length ? metaParts.join(" · ") : "Chargement de la projection ARIMA + Monte-Carlo..."}
        action={<HorizonMonthChips value={monthFilter} onChange={setMonthFilter} />}
      />

      <div className="grid grid-cols-6 gap-3 max-xl:grid-cols-3 max-md:grid-cols-2 max-[560px]:grid-cols-1">
        <MetricCard
          tone="mint"
          label="Close fin horizon"
          value={fmtClose(summary?.horizon_end_close)}
          sub={
            summary?.horizon_start_close != null
              ? `début ${fmtClose(summary.horizon_start_close)}`
              : "cumul vs dernier observed"
          }
        />
        <MetricCard
          tone="mint"
          label="Rendement cumulé"
          value={fmtPct(cum)}
          sub={summary ? `${summary.n_forecast_days} jours ouvrés` : "mai + juin"}
          valueClass={cumTone}
        />
        <MetricCard
          tone="violet"
          label="Modèle"
          value={summary?.arima_order ?? "—"}
          sub={
            summary?.regime_drift != null
              ? `drift ${summary.regime_drift >= 0 ? "+" : ""}${summary.regime_drift.toFixed(5)}/j`
              : "ARIMA · drift HMM"
          }
        />
        <MetricCard
          tone="amber"
          label="Monte-Carlo"
          value={summary?.n_mc != null ? summary.n_mc.toLocaleString("fr-FR") : "—"}
          sub="trajectoires p10/p50/p90"
        />
        <MetricCard
          tone="red"
          label="Borne p10 fin"
          value={fmtClose(summary?.band_p10_end)}
          sub="scénario baissier (10 %)"
          valueClass="text-danger"
        />
        <MetricCard
          tone="mint"
          label="Borne p90 fin"
          value={fmtClose(summary?.band_p90_end)}
          sub="scénario haussier (90 %)"
          valueClass="text-mint"
        />
      </div>

      <Panel
        title="Fan chart · projection ARIMA + bandes Monte-Carlo"
        right={
          summary ? (
            <span className="font-mono text-xs text-muted">
              {monthFilter === "all" ? "Mai + Juin 2026" : `Filtre ${monthFilter}`}
            </span>
          ) : null
        }
        primary
      >
        {daily ? <HorizonFanChart daily={daily} summary={summary} monthFilter={monthFilter} /> : <SkeletonChart />}
      </Panel>

      <div className="grid grid-cols-[1.1fr_1fr] gap-4 max-xl:grid-cols-1">
        <Panel title="Résumé mensuel">
          {summary ? <HorizonMonthlySummary months={summary.months} /> : <SkeletonRows />}
        </Panel>
        <Panel title="Distribution des signaux">
          {summary && daily ? (
            <HorizonSignalsChart daily={daily} summary={summary} monthFilter={monthFilter} />
          ) : (
            <SkeletonChart small />
          )}
        </Panel>
      </div>
    </section>
  );
}

function HorizonMonthChips({
  value,
  onChange,
}: {
  value: "all" | "2026-05" | "2026-06";
  onChange: (value: "all" | "2026-05" | "2026-06") => void;
}) {
  const items: Array<{ label: string; value: "all" | "2026-05" | "2026-06" }> = [
    { label: "Tout", value: "all" },
    { label: "Mai 26", value: "2026-05" },
    { label: "Juin 26", value: "2026-06" },
  ];
  return (
    <div className="inline-flex rounded-sm border border-line bg-black/30 p-1">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`h-9 rounded-sm border px-4 font-mono text-xs font-black uppercase transition duration-150 ease-out active:scale-[0.96] ${
            value === item.value
              ? "border-masi bg-masi/12 text-masi shadow-terminal"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function HorizonFanChart({
  daily,
  summary,
  monthFilter,
}: {
  daily: HorizonDaily;
  summary: HorizonSummary | null;
  monthFilter: "all" | "2026-05" | "2026-06";
}) {
  const data = useMemo(() => {
    const theme = chartTheme();
    const keep = daily.date.map((_, i) => monthFilter === "all" || daily.month[i] === monthFilter);
    const sub = <T,>(arr: T[]) => arr.filter((_, i) => keep[i]);

    const obsIdx = daily.source
      .map((s, i) => (s === "observed" && keep[i] ? i : -1))
      .filter((i) => i >= 0);

    const traces: unknown[] = [
      {
        x: sub(daily.date),
        y: sub(daily.mc_p10),
        type: "scatter",
        mode: "lines",
        line: { color: "rgba(0,0,0,0)", width: 0 },
        showlegend: false,
        hoverinfo: "skip",
      },
      {
        x: sub(daily.date),
        y: sub(daily.mc_p90),
        type: "scatter",
        mode: "lines",
        name: "Bande p10 – p90 (Monte-Carlo)",
        line: { color: "rgba(0,0,0,0)", width: 0 },
        fill: "tonexty",
        fillcolor: "rgba(141, 183, 255, 0.18)",
        hovertemplate: "%{x|%Y-%m-%d}<br>p90 <b>%{y:,.0f}</b><extra></extra>",
      },
      {
        x: sub(daily.date),
        y: sub(daily.mc_p50),
        type: "scatter",
        mode: "lines",
        name: "Médiane p50",
        line: { color: theme.violet, width: 1.6, dash: "dot" },
        hovertemplate: "%{x|%Y-%m-%d}<br>p50 <b>%{y:,.0f}</b><extra></extra>",
      },
      {
        x: sub(daily.date),
        y: sub(daily.predicted_close),
        type: "scatter",
        mode: "lines",
        name: "Projection ARIMA",
        line: { color: theme.masi, width: 2.4 },
        hovertemplate: "%{x|%Y-%m-%d}<br>close <b>%{y:,.0f}</b><extra></extra>",
      },
    ];

    if (obsIdx.length) {
      traces.push({
        x: obsIdx.map((i) => daily.date[i]),
        y: obsIdx.map((i) => daily.predicted_close[i]),
        type: "scatter",
        mode: "markers",
        name: "Observed",
        marker: { color: theme.mint, size: 6 },
        hovertemplate: "%{x|%Y-%m-%d}<br>observed <b>%{y:,.0f}</b><extra></extra>",
      });
    }

    if (summary?.last_obs_close) {
      const xs = sub(daily.date);
      if (xs.length) {
        traces.push({
          x: [xs[0], xs[xs.length - 1]],
          y: [summary.last_obs_close, summary.last_obs_close],
          type: "scatter",
          mode: "lines",
          name: `Dernier observed (${summary.last_obs_date ?? ""})`,
          line: { color: theme.muted, width: 1, dash: "dash" },
          hovertemplate: "Dernier observed<br><b>%{y:,.0f}</b><extra></extra>",
        });
      }
    }

    return traces;
  }, [daily, summary, monthFilter]);

  return (
    <PlotlyChart
      data={data}
      layout={{
        yaxis: {
          ...baseLayout().yaxis,
          tickformat: ",.0f",
          title: { text: "MASI close", font: { color: chartTheme().muted, size: 11 } },
        },
      }}
      className="h-[360px]"
    />
  );
}

function HorizonSignalsChart({
  daily,
  summary,
  monthFilter,
}: {
  daily: HorizonDaily;
  summary: HorizonSummary;
  monthFilter: "all" | "2026-05" | "2026-06";
}) {
  const data = useMemo(() => {
    const theme = chartTheme();
    const order: Array<{ name: string; color: string }> = [
      { name: "hausse", color: theme.gain },
      { name: "neutre", color: theme.warning },
      { name: "baisse", color: theme.masi },
    ];

    let counts: Record<string, number> = {};
    if (monthFilter === "all") {
      counts = { ...summary.signal_counts };
    } else {
      daily.signal.forEach((s, i) => {
        if (daily.month[i] === monthFilter) counts[s] = (counts[s] || 0) + 1;
      });
    }

    const items = order.filter((row) => (counts[row.name] || 0) > 0);
    if (!items.length) return [];

    return [
      {
        labels: items.map((row) => row.name),
        values: items.map((row) => counts[row.name]),
        type: "pie",
        hole: 0.62,
        sort: false,
        marker: {
          colors: items.map((row) => row.color),
          line: { color: theme.panel, width: 2 },
        },
        textinfo: "label+percent",
        textfont: { color: theme.ink, size: 12 },
      },
    ];
  }, [daily, summary, monthFilter]);

  return (
    <PlotlyChart
      data={data}
      layout={{ margin: { l: 20, r: 20, t: 20, b: 20 }, showlegend: false }}
      className="h-[260px] min-h-[260px]"
    />
  );
}

function HorizonMonthlySummary({ months }: { months: HorizonSummary["months"] }) {
  if (!months.length) {
    return <p className="font-mono text-sm text-muted">Aucun résumé mensuel disponible.</p>;
  }
  const maxAbs = Math.max(...months.map((row) => Math.abs(row.monthly_simple_return_pct)), 0.001);

  return (
    <div className="grid gap-3 font-mono">
      {months.map((row) => {
        const pct = row.monthly_simple_return_pct;
        const tone = pct > 0 ? "text-mint" : pct < 0 ? "text-danger" : "text-ink";
        const barTone = pct > 0 ? "bg-mint" : pct < 0 ? "bg-danger" : "bg-masi";
        const width = Math.min(100, (Math.abs(pct) / maxAbs) * 100);
        return (
          <div
            key={row.month}
            className="grid grid-cols-[118px_1fr_148px] items-center gap-4 rounded-sm border border-line bg-black/20 p-3 max-sm:grid-cols-1"
          >
            <div>
              <p className="text-sm font-black uppercase text-ink">{row.month}</p>
              <p className="text-[11px] text-muted">
                {row.n_days}j · {row.positive_days}+/{row.negative_days}−
              </p>
            </div>
            <div className="h-1.5 overflow-hidden bg-line">
              <div className={`h-full ${barTone}`} style={{ width: `${width}%` }} />
            </div>
            <div className="text-right">
              <p className={`text-sm font-black ${tone}`}>
                {pct >= 0 ? "+" : ""}
                {pct.toFixed(2)}%
              </p>
              <p className="text-[11px] text-muted">
                → {row.end_predicted_close.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BacktestView({ strategies, curves }: { strategies: Strategy[] | null; curves: EquityCurves | null }) {
  return (
    <section className="grid gap-6">
      <ViewHeader
        eyebrow="7 stratégies · coût 5 bps"
        title="Stratégies"
        meta="Trié par Sharpe ratio décroissant"
      />

      <Panel title="Tableau comparatif">
        {strategies ? <StrategyTable strategies={strategies} /> : <SkeletonRows />}
      </Panel>

      <Panel title="Courbes d'équité comparées" primary>
        {curves ? <EquityAllChart curves={curves} /> : <SkeletonChart />}
      </Panel>
    </section>
  );
}

function switchPressure(value: number) {
  if (value >= 0.66) return "high";
  if (value >= 0.33) return "medium";
  return "low";
}

function MetricCard({
  label,
  value,
  sub,
  tone,
  valueClass,
  subClass,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "mint" | "red" | "amber" | "violet";
  valueClass?: string;
  subClass?: string;
}) {
  const tones: Record<"mint" | "red" | "amber" | "violet", { bar: string; glow: string; dot: string }> = {
    mint: { bar: "bg-gradient-to-r from-mint via-cyan to-transparent", glow: "from-mint/25 to-transparent", dot: "bg-mint" },
    red: { bar: "bg-gradient-to-r from-danger via-masi to-transparent", glow: "from-danger/25 to-transparent", dot: "bg-danger" },
    amber: { bar: "bg-gradient-to-r from-warning via-masi to-transparent", glow: "from-warning/25 to-transparent", dot: "bg-warning" },
    violet: { bar: "bg-gradient-to-r from-violet via-plasma to-transparent", glow: "from-violet/25 to-transparent", dot: "bg-violet" },
  };
  const t = tones[tone];

  return (
    <article className="tilt-card group relative min-h-36 overflow-hidden rounded-xl border border-white/8 bg-panel/70 p-5 backdrop-blur-sm max-sm:p-4">
      <span className={`absolute inset-x-0 top-0 h-[2px] ${t.bar}`} />
      <span className={`pointer-events-none absolute -right-12 -top-12 h-32 w-44 rounded-full bg-gradient-to-br ${t.glow} blur-2xl transition-opacity duration-300 group-hover:opacity-150`} />
      <div className="absolute inset-x-0 top-2 h-10 opacity-[0.12] [background-image:linear-gradient(90deg,transparent_0_19px,rgba(125,154,190,.22)_20px),linear-gradient(180deg,transparent_0_19px,rgba(125,154,190,.22)_20px)] [background-size:20px_20px]" />
      <div className="relative z-10 grid h-full gap-2">
        <p className="flex items-center gap-2 font-mono text-[11px] font-black uppercase tracking-wider text-violet">
          <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
          {label}
        </p>
        <strong className={`mt-auto font-mono text-4xl font-black leading-none tracking-tight max-sm:text-3xl ${valueClass ?? "text-ink"}`}>
          {value}
        </strong>
        <span className={`font-mono text-xs font-black ${subClass ?? "text-mint"}`}>{sub}</span>
      </div>
    </article>
  );
}

function Panel({
  title,
  right,
  primary = false,
  children,
}: {
  title: string;
  right?: ReactNode;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="relative min-w-0 overflow-hidden rounded-xl border border-white/8 bg-panel/70 p-6 shadow-lift backdrop-blur-sm">
      {primary ? (
        <span className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-masi/12 blur-3xl" />
      ) : null}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-masi/70 via-plasma/50 to-transparent" />
      <header className="relative mb-5 flex min-h-9 items-center justify-between gap-3 border-b border-line pb-4 max-md:flex-col max-md:items-start">
        <h2 className="flex items-center gap-2 font-mono text-lg font-black uppercase text-masi">
          <span className="h-1.5 w-1.5 rounded-full bg-masi" />
          {title}
        </h2>
        {right}
      </header>
      <div className="relative">{children}</div>
    </section>
  );
}

function Segmented({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const items = [
    { label: "1M", value: 21 },
    { label: "6M", value: 126 },
    { label: "ALL", value: 0 },
  ];

  return (
    <div className="inline-flex rounded-sm border border-line bg-black/30 p-1">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`h-9 rounded-sm border px-4 font-mono text-xs font-black uppercase transition duration-150 ease-out active:scale-[0.96] ${
            value === item.value ? "border-masi bg-masi/12 text-masi shadow-terminal" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function EquityChart({ series }: { series: ForecastSeries }) {
  const { data, shapes } = useMemo(() => {
    const theme = chartTheme();
    const rawEq = series.equity ?? [];
    const base = rawEq.length && Number.isFinite(rawEq[0]) && rawEq[0] !== 0 ? rawEq[0] : 1;
    const model = rawEq.map((value) => value / base);
    const buyHoldSeries = series.actual_return.reduce<number[]>((acc, value) => {
      const previous = acc.at(-1) ?? 1;
      return [...acc, previous * (1 + value)];
    }, []);
    const values = [...model, ...buyHoldSeries].filter(Number.isFinite);
    const floor = values.length ? Math.min(...values) * 0.985 : 0;

    const regimeColor = (regime: string) => {
      const lower = regime.toLowerCase();
      if (lower.includes("bull")) return "rgba(0,245,159,.1)";
      if (lower.includes("bear")) return "rgba(255,63,87,.1)";
      return "rgba(255,107,0,.1)";
    };
    const regimeShapes = series.dates
      .map((dateValue, index) => ({
        type: "rect",
        xref: "x",
        yref: "paper",
        x0: dateValue,
        x1: series.dates[index + 1] ?? dateValue,
        y0: 0,
        y1: 1,
        fillcolor: regimeColor(series.regime?.[index] ?? ""),
        line: { width: 0 },
        layer: "below",
      }))
      .filter((_, index) => index % 5 === 0);

    return {
      shapes: regimeShapes,
      data: [
      {
        x: series.dates,
        y: series.dates.map(() => floor),
        type: "scatter",
        mode: "lines",
        showlegend: false,
        hoverinfo: "skip",
        line: { color: "rgba(0,0,0,0)", width: 0 },
      },
      {
        x: series.dates,
        y: model,
        type: "scatter",
        mode: "lines",
        name: "Modèle (HMM-gate)",
        fill: "tonexty",
        fillcolor: "rgba(255, 106, 94, 0.13)",
        line: { color: theme.masi, width: 2.4 },
      },
      {
        x: series.dates,
        y: buyHoldSeries,
        type: "scatter",
        mode: "lines",
        name: "Buy & Hold",
        line: { color: "rgba(245, 241, 232, 0.72)", width: 1.5, dash: "dot" },
      },
      ],
    };
  }, [series]);

  return (
    <PlotlyChart
      data={data}
      layout={{
        shapes,
        yaxis: {
          ...baseLayout().yaxis,
          tickformat: ".2f",
          title: { text: "Equity (1.0 = start)", font: { color: chartTheme().muted, size: 11 } },
        },
      }}
      className="h-[360px]"
    />
  );
}

function RegimeChart({ data }: { data: RegimeDistribution }) {
  const chartData = useMemo(() => {
    const theme = chartTheme();
    const order = ["Bear", "Neutral", "Bull"];
    const colors: Record<string, string> = { Bear: theme.masi, Neutral: theme.warning, Bull: theme.gain };
    const regimes = [
      ...order.map((name) => data.regimes.find((regime) => regime.name === name)).filter(Boolean),
      ...data.regimes.filter((regime) => !order.includes(regime.name)),
    ] as RegimeDistribution["regimes"];

    return [
      {
        labels: regimes.map((regime) => regime.name),
        values: regimes.map((regime) => regime.count),
        type: "pie",
        hole: 0.62,
        sort: false,
        marker: {
          colors: regimes.map((regime) => colors[regime.name] ?? theme.mint),
          line: { color: theme.panel, width: 2 },
        },
        textinfo: "label+percent",
        textfont: { color: theme.ink, size: 12 },
      },
    ];
  }, [data]);

  return <PlotlyChart data={chartData} layout={{ margin: { l: 20, r: 20, t: 20, b: 20 }, showlegend: false }} className="h-[260px] min-h-[260px]" />;
}

function RiskChart({ series }: { series: RiskSeries }) {
  const data = useMemo(() => {
    const theme = chartTheme();
    return [
      {
        x: series.dates,
        y: series.es_param_5,
        name: "ES 5% (paramétrique)",
        type: "scatter",
        mode: "lines",
        line: { color: theme.masi, width: 1.4, dash: "dot" },
      },
      {
        x: series.dates,
        y: series.var_param_5,
        name: "VaR 5% (paramétrique)",
        type: "scatter",
        mode: "lines",
        fill: "tonexty",
        fillcolor: "rgba(255, 106, 94, 0.13)",
        line: { color: theme.masi, width: 1.8 },
      },
      {
        x: series.dates,
        y: series.actual_return,
        name: "Rendement réalisé",
        type: "scatter",
        mode: "markers",
        marker: { color: theme.ink, size: 4, opacity: 0.5, line: { color: theme.panel, width: 0.5 } },
      },
    ];
  }, [series]);

  return (
    <PlotlyChart
      data={data}
      layout={{
        yaxis: {
          ...baseLayout().yaxis,
          tickformat: ".1%",
          title: { text: "Rendement log", font: { color: chartTheme().muted, size: 11 } },
        },
      }}
      className="h-[360px]"
    />
  );
}

function EquityAllChart({ curves }: { curves: EquityCurves }) {
  const data = useMemo(() => {
    const theme = chartTheme();
    const palette = [theme.masi, theme.mint, theme.gain, theme.warning, theme.violet, "#5ea1ff", "#f97362"];
    return Object.entries(curves.series).map(([name, values], index) => ({
      x: curves.dates,
      y: values,
      name,
      type: "scatter",
      mode: "lines",
      line: { color: palette[index % palette.length], width: 1.7 },
    }));
  }, [curves]);

  return <PlotlyChart data={data} layout={{ yaxis: { ...baseLayout().yaxis, tickformat: ".2f" } }} className="h-[360px]" />;
}

function RegimeInsightPanel({
  persistence,
  regimes,
  latest,
  snapshot,
}: {
  persistence: Persistence;
  regimes: RegimeDistribution;
  latest: ForecastLatest | null;
  snapshot: Snapshot | null;
}) {
  const maxDuration = Math.max(...persistence.regimes.map((regime) => regime.mean_duration), 1);
  const total = Math.max(...regimes.regimes.map((regime) => regime.count), 1);
  const ordered = ["Bull", "Neutral", "Bear"]
    .map((name) => regimes.regimes.find((regime) => regime.name === name))
    .filter(Boolean) as RegimeDistribution["regimes"];
  const color = (name: string) => {
    if (name === "Bull") return "text-mint bg-mint";
    if (name === "Bear") return "text-danger bg-danger";
    return "text-masi bg-masi";
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 font-mono">
        <p className="text-sm uppercase text-muted">3-state · t = 17 avr. 2026</p>
        {ordered.map((regime) => {
          const classes = color(regime.name).split(" ");
          const share = regime.share * 100;
          return (
            <div key={regime.name} className="grid grid-cols-[118px_1fr_70px] items-center gap-4">
              <span className={`text-lg font-black uppercase ${classes[0]}`}>
                {regime.name === "Bull" ? "▲" : regime.name === "Bear" ? "▼" : "◆"} {regime.name}
              </span>
              <div className="h-1.5 bg-line">
                <div className={`h-full ${classes[1]}`} style={{ width: `${share}%` }} />
              </div>
              <span className="text-right text-lg font-black">{share.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-line pt-5">
        <GaugeTile label="Switch pressure" value={snapshot ? snapshot.p_regime_switch_next * 100 : 0} color="orange" />
        <GaugeTile label="Model readiness" value={latest ? Math.min(96, Math.max(62, latest.equity * 42)) : 0} color="mint" />
      </div>

      <div className="grid gap-3 border-t border-line pt-5">
        {persistence.regimes.map((regime) => (
          <div key={regime.name} className="grid grid-cols-[90px_1fr_104px] items-center gap-3 rounded-sm border border-line bg-black/20 p-3 font-mono max-sm:grid-cols-1">
            <span className="text-xs font-black uppercase">
              {regime.name}
              {regime.name === persistence.current ? <span className="text-mint"> · live</span> : null}
            </span>
            <div className="h-1.5 overflow-hidden bg-line">
              <div className="h-full bg-mint" style={{ width: `${(regime.mean_duration / maxDuration) * 100}%` }} />
            </div>
            <span className="text-right text-xs font-black text-zinc-300 max-sm:text-left">
              {regime.mean_duration.toFixed(1)}j · {regime.n_runs}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GaugeTile({ label, value, color }: { label: string; value: number; color: "mint" | "orange" }) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = color === "mint" ? "#00f59f" : "#ff6b00";
  return (
    <div className="relative grid place-items-center rounded-sm border border-line bg-black/20 p-4 font-mono">
      <svg viewBox="0 0 120 70" className="h-24 w-full overflow-visible">
        <path d="M15 60 A45 45 0 0 1 105 60" fill="none" stroke="rgba(125,154,190,.18)" strokeWidth="14" />
        <path
          d="M15 60 A45 45 0 0 1 105 60"
          fill="none"
          stroke={stroke}
          strokeLinecap="square"
          strokeDasharray={`${clamped * 1.42} 142`}
          strokeWidth="14"
        />
      </svg>
      <div className="absolute bottom-5 text-center">
        <p className="text-lg font-black">{clamped.toFixed(0)}%</p>
        <p className="text-[10px] font-black uppercase text-muted">{label}</p>
      </div>
    </div>
  );
}

function ValidationGrid({ data }: { data: RiskValidation }) {
  const cards = [
    ...Object.entries(data.kupiec ?? {}).map(([key, value]) => ({ family: "Kupiec", key, value })),
    ...Object.entries(data.christoffersen ?? {}).map(([key, value]) => ({ family: "Christoffersen", key, value })),
  ];

  return (
    <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
      {cards.map((card) => {
        const verdict = String(card.value.verdict ?? "—");
        const ok = verdict.toLowerCase().startsWith("ok");
        return (
          <article key={`${card.family}-${card.key}`} className="rounded-lg border border-white/10 bg-black/20 p-4">
            <header className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase text-muted">
                {card.family} · {card.key === "parametric" ? "paramétrique" : "historique"}
              </p>
              <span className={`rounded-full px-2 py-1 text-[11px] font-black ${ok ? "bg-gain/15 text-gain" : "bg-masi/15 text-masi"}`}>
                {verdict}
              </span>
            </header>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(card.value)
                .filter(([key]) => key !== "verdict")
                .slice(0, 4)
                .map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs text-muted">{key}</dt>
                    <dd className="font-mono text-ink">{typeof value === "number" ? value.toFixed(Math.abs(value) < 1 ? 4 : 3) : String(value)}</dd>
                  </div>
                ))}
            </dl>
          </article>
        );
      })}
    </div>
  );
}

function StrategyTable({ strategies }: { strategies: Strategy[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-white/10">
      <table className="min-w-[760px] w-full border-separate border-spacing-0 text-sm">
        <thead className="bg-panelSoft text-left text-[11px] uppercase text-muted">
          <tr>
            {["Stratégie", "Sharpe", "Sortino", "Ann. return", "Max DD", "Final equity", "Trades"].map((head) => (
              <th key={head} className="border-b border-white/10 px-4 py-3 font-black">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {strategies.map((strategy) => (
            <tr key={strategy.id} className="transition hover:bg-white/[0.035]">
              <td className="border-b border-white/10 px-4 py-3">
                <span className="rounded-md border border-masi/20 bg-masi/10 px-2 py-1 text-xs font-black text-masi">
                  {strategy.label ?? strategy.id}
                </span>
              </td>
              <td className="border-b border-white/10 px-4 py-3 font-mono">{strategy.sharpe == null ? "—" : strategy.sharpe.toFixed(3)}</td>
              <td className="border-b border-white/10 px-4 py-3 font-mono">{strategy.sortino == null ? "—" : strategy.sortino.toFixed(3)}</td>
              <td className={`border-b border-white/10 px-4 py-3 font-mono ${toneFromValue(strategy.ann_return)}`}>{signedPct(strategy.ann_return, 2)}</td>
              <td className="border-b border-white/10 px-4 py-3 font-mono text-masi">{signedPct(strategy.max_drawdown, 2)}</td>
              <td className="border-b border-white/10 px-4 py-3 font-mono">{strategy.final_equity == null ? "—" : strategy.final_equity.toFixed(3)}</td>
              <td className="border-b border-white/10 px-4 py-3 font-mono">{strategy.n_trades ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonChart({ small = false }: { small?: boolean }) {
  return <div className={`animate-pulse rounded-md border border-white/10 bg-white/[0.035] ${small ? "h-[260px]" : "h-[360px]"}`} />;
}

function SkeletonRows() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-md border border-white/10 bg-white/[0.035]" />
      ))}
    </div>
  );
}

function ServicesStatus({
  health,
  healthErr,
}: {
  health: HealthResponse | null;
  healthErr: boolean;
}) {
  const fastapiUp = !healthErr && health !== null;
  const ollamaConfigured = health?.ollama?.configured ?? false;
  const ollamaUp = (health?.ollama?.reachable ?? false) && !!health;
  const ollamaModelInstalled = health?.ollama?.model_installed ?? false;
  const modelName = health?.ollama?.model ?? "—";

  type Tone = "ok" | "warn" | "down";
  const tone = (state: Tone) =>
    state === "ok"
      ? { dot: "bg-gain", text: "text-gain", border: "border-mint/25" }
      : state === "warn"
        ? { dot: "bg-warning", text: "text-warning", border: "border-warning/35" }
        : { dot: "bg-danger", text: "text-danger", border: "border-danger/35" };

  const fastTone = tone(fastapiUp ? "ok" : "down");
  const ollamaTone = tone(
    !ollamaConfigured
      ? "warn"
      : !ollamaUp
        ? "down"
        : ollamaModelInstalled
          ? "ok"
          : "warn"
  );

  return (
    <div className={`glass-panel grid gap-2.5 rounded-xl px-3 py-3 font-mono text-[12px] ${fastTone.border}`}>
      <p className="text-[10px] font-black uppercase tracking-wider text-muted">Services</p>

      <div className="flex items-center justify-between gap-2">
        <span className={`flex items-center gap-2 font-black uppercase ${fastTone.text}`}>
          <span className={`pulse-dot h-2 w-2 rounded-full ${fastTone.dot}`} />
          FastAPI
        </span>
        <span className="text-[10px] text-muted">
          {fastapiUp
            ? `:${health?.fastapi?.port ?? 8001}`
            : "offline"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className={`flex items-center gap-2 font-black uppercase ${ollamaTone.text}`}>
          <span className={`pulse-dot h-2 w-2 rounded-full ${ollamaTone.dot}`} />
          Ollama
        </span>
        <span className="truncate text-[10px] text-muted" title={modelName}>
          {!ollamaConfigured
            ? "fallback"
            : !ollamaUp
              ? "offline"
              : ollamaModelInstalled
                ? modelName
                : `${modelName}?`}
        </span>
      </div>

      {ollamaConfigured && ollamaUp && !ollamaModelInstalled ? (
        <p className="mt-1 text-[10px] leading-snug text-warning/90">
          Pull du modèle requis : <span className="font-mono">ollama pull {modelName}</span>
        </p>
      ) : null}
    </div>
  );
}
