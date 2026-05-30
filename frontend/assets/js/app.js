// Application entry point : router, init des pages, refresh.

import { api } from "./api.js";
import { charts } from "./charts.js";
import { fmt } from "./format.js";
import { setText, toast, setApiStatus, initTheme } from "./ui.js";
import { initChat } from "./chat.js";

// Wait for Plotly to be loaded (defer script)
function waitForPlotly() {
  return new Promise((resolve) => {
    if (window.Plotly) return resolve();
    const t = setInterval(() => {
      if (window.Plotly) { clearInterval(t); resolve(); }
    }, 30);
  });
}

const state = {
  equityWindow: 252,
  loadedViews: new Set(),
  horizon: { month: "all", daily: null, summary: null },
};

// ============================== Router ==============================
function currentRoute() {
  const hash = (location.hash || "#/forecast").replace(/^#\//, "");
  return hash || "forecast";
}

function setActiveNav(route) {
  document.querySelectorAll(".nav-item").forEach((a) => {
    a.classList.toggle("is-active", a.dataset.route === route);
  });
}

function setActiveView(route) {
  document.querySelectorAll(".view").forEach((v) => {
    if (v.dataset.view === route) v.setAttribute("data-active", "");
    else v.removeAttribute("data-active");
  });
}

async function handleRoute() {
  const route = currentRoute();
  setActiveNav(route);
  setActiveView(route);
  if (!state.loadedViews.has(route)) {
    await loadView(route);
    state.loadedViews.add(route);
  }
}

window.addEventListener("hashchange", handleRoute);

// ============================== Views ==============================
async function loadView(route) {
  switch (route) {
    case "forecast":
      return loadForecast();
    case "horizon":
      return loadHorizon();
    case "risk":
      return loadRisk();
    case "backtest":
      return loadBacktest();
    case "chat":
      return;
    default:
      return;
  }
}

async function loadForecast() {
  try {
    const [latest, kpis, snap, regimes, persistence, series] = await Promise.all([
      api.forecastLatest(),
      api.forecastKpis(),
      api.predictionsSnapshot(),
      api.forecastRegimes(),
      api.predictionsPersistence(),
      api.forecastSeries(state.equityWindow || undefined),
    ]);

    document.getElementById("forecastMeta").textContent =
      `TEST : ${fmt.date(kpis.test_range[0])} → ${fmt.date(kpis.test_range[1])} · ${kpis.n_test_days} jours · coût ${kpis.primary_cost_bps} bps · stratégie ${latest.strategy_name}`;

    // KPIs
    setText("kpiReturn", fmt.signed(latest.predicted_return, 3), fmt.signClass(latest.predicted_return));
    setText("kpiReturnSub", `actuel ${fmt.signed(latest.actual_return, 3)} · pos ${latest.position >= 0 ? "+" : ""}${latest.position.toFixed(0)}`);
    setText("kpiVar", fmt.signed(latest.var_5, 2), "is-negative");
    setText("kpiEs", fmt.signed(latest.es_5, 2), "is-negative");
    setText("kpiRegime", latest.regime);
    setText("kpiRegimeSub", `streak ${snap.streak_days}j · P(switch) ${(snap.p_regime_switch_next * 100).toFixed(0)}%`);
    setText("kpiScore", snap.risk_score.toFixed(1));
    setText("kpiEquity", latest.equity.toFixed(3));
    setText("kpiEquitySub", `${kpis.cumulative_return >= 0 ? "+" : ""}${(kpis.cumulative_return * 100).toFixed(1)}% cum · DA ${(kpis.directional_accuracy * 100).toFixed(0)}%`);

    // Charts
    await waitForPlotly();
    charts.equity(document.getElementById("chartEquity"), series);
    charts.regimes(document.getElementById("chartRegimes"), regimes);

    // Persistance table
    const table = document.getElementById("persistenceTable");
    const maxDur = Math.max(...persistence.regimes.map((r) => r.mean_duration), 1);
    table.innerHTML = persistence.regimes
      .map(
        (r) => `
        <div class="persistence-row">
          <div class="name">${r.name}${r.name === persistence.current ? " · actuel" : ""}</div>
          <div class="persistence-bar"><span style="width:${(r.mean_duration / maxDur * 100).toFixed(0)}%"></span></div>
          <div class="value">${r.mean_duration.toFixed(1)}j · ${r.n_runs} runs</div>
        </div>`
      )
      .join("");

    // Chip-row equity window
    document.querySelectorAll('[data-window]').forEach((chip) => {
      chip.addEventListener("click", async () => {
        document.querySelectorAll('[data-window]').forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        state.equityWindow = Number(chip.dataset.window);
        const s = await api.forecastSeries(state.equityWindow || undefined);
        charts.equity(document.getElementById("chartEquity"), s);
      });
    });
  } catch (err) {
    toast(`Forecast indisponible : ${err.message}`, { error: true });
  }
}

async function loadHorizon() {
  try {
    const [summary, daily] = await Promise.all([
      api.horizonSummary(),
      api.horizonDaily(),
    ]);
    state.horizon.daily = daily;
    state.horizon.summary = summary;

    const metaParts = [];
    if (summary.last_obs_date) metaParts.push(`Dernier observed ${fmt.date(summary.last_obs_date)} (${summary.last_obs_close?.toLocaleString("fr-FR", { maximumFractionDigits: 0 })})`);
    if (summary.arima_order) metaParts.push(`ARIMA ${summary.arima_order}`);
    if (summary.arima_aic != null) metaParts.push(`AIC ${summary.arima_aic.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`);
    if (summary.regime_drift != null) metaParts.push(`drift HMM ${summary.regime_drift >= 0 ? "+" : ""}${summary.regime_drift.toFixed(5)}/j`);
    document.getElementById("horizonMeta").textContent =
      metaParts.length ? metaParts.join(" · ") : "Projection ARIMA + Monte-Carlo hors-échantillon.";

    // KPIs
    setText("hkpiClose", summary.horizon_end_close != null
      ? summary.horizon_end_close.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
      : "—");
    setText("hkpiCloseSub",
      summary.horizon_start_close != null
        ? `début horizon ≈ ${summary.horizon_start_close.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`
        : "—");
    const cum = summary.horizon_cum_return_pct;
    setText("hkpiReturn",
      cum != null ? `${cum >= 0 ? "+" : ""}${cum.toFixed(2)}%` : "—",
      cum == null ? "" : cum > 0 ? "is-positive" : cum < 0 ? "is-negative" : "");
    setText("hkpiReturnSub", `${summary.n_forecast_days || 0} jours ouvrés`);
    setText("hkpiModel", summary.arima_order || "—");
    setText("hkpiModelSub",
      summary.regime_drift != null
        ? `drift ${summary.regime_drift >= 0 ? "+" : ""}${summary.regime_drift.toFixed(5)}/j`
        : "drift HMM —");
    setText("hkpiMC",
      summary.n_mc != null ? summary.n_mc.toLocaleString("fr-FR") : "—");
    setText("hkpiMCSub", "trajectoires p10/p50/p90");
    setText("hkpiP10",
      summary.band_p10_end != null
        ? summary.band_p10_end.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
        : "—",
      "is-negative");
    setText("hkpiP90",
      summary.band_p90_end != null
        ? summary.band_p90_end.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
        : "—",
      "is-positive");

    await waitForPlotly();
    redrawHorizon();
    renderHorizonMonthly(summary.months || []);

    // Chips mois
    document.querySelectorAll('[data-horizon-month]').forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll('[data-horizon-month]').forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        state.horizon.month = chip.dataset.horizonMonth;
        redrawHorizon();
      });
    });
  } catch (err) {
    toast(`Horizon indisponible : ${err.message}`, { error: true });
  }
}

function redrawHorizon() {
  const { daily, summary, month } = state.horizon;
  if (!daily) return;
  const chartEl = document.getElementById("chartHorizon");
  charts.horizonFan(chartEl, daily, summary, { month });

  const metaEl = document.getElementById("horizonChartMeta");
  if (metaEl) {
    metaEl.textContent = month === "all" ? "Mai + Juin 2026" : `Filtre ${month}`;
  }

  // Signaux
  const signalEl = document.getElementById("chartHorizonSignals");
  if (signalEl && summary) {
    let counts;
    if (month === "all") {
      counts = summary.signal_counts || {};
    } else {
      counts = {};
      (daily.signal || []).forEach((s, i) => {
        if ((daily.month || [])[i] === month) counts[s] = (counts[s] || 0) + 1;
      });
    }
    charts.horizonSignals(signalEl, counts);
    const total = Object.values(counts).reduce((a, b) => a + Number(b || 0), 0);
    const sigMeta = document.getElementById("horizonSignalMeta");
    if (sigMeta) sigMeta.textContent = `${total} jours`;
  }
}

function renderHorizonMonthly(months) {
  const host = document.getElementById("horizonMonthly");
  if (!host) return;
  if (!months.length) {
    host.innerHTML = '<p class="muted">Aucun résumé mensuel disponible.</p>';
    return;
  }
  const maxAbs = Math.max(...months.map((m) => Math.abs(m.monthly_simple_return_pct)), 0.001);
  host.innerHTML = months
    .map((m) => {
      const pct = m.monthly_simple_return_pct;
      const cls = pct > 0 ? "is-positive" : pct < 0 ? "is-negative" : "";
      const width = Math.min(100, (Math.abs(pct) / maxAbs) * 100);
      return `
        <div class="persistence-row">
          <div class="name">${m.month}<br><small class="muted">${m.n_days}j · ${m.positive_days}+/${m.negative_days}−</small></div>
          <div class="persistence-bar"><span style="width:${width.toFixed(0)}%"></span></div>
          <div class="value ${cls}">${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%<br><small class="muted">→ ${m.end_predicted_close.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</small></div>
        </div>`;
    })
    .join("");
}

async function loadRisk() {
  try {
    const [series, validation, breaches] = await Promise.all([
      api.riskSeries(500),
      api.riskValidation(),
      api.riskBreaches(),
    ]);

    document.getElementById("riskMeta").textContent =
      `${breaches.n_days} jours · attendu 5% (${breaches.expected_5pct}) · observé paramétrique ${breaches.observed_param} (${(breaches.rate_param * 100).toFixed(2)}%)`;

    setText("riskVarParam", fmt.signed(series.var_param_5.at(-1), 2), "is-negative");
    setText("riskEsParam", fmt.signed(series.es_param_5.at(-1), 2), "is-negative");
    setText("riskVol", (series.vol_garch.at(-1) * 100).toFixed(2) + "%");
    setText("riskBreaches", String(breaches.observed_param));
    setText("riskBreachesSub", `historique ${breaches.observed_hist} · attendu ${breaches.expected_5pct}`);

    await waitForPlotly();
    charts.risk(document.getElementById("chartRisk"), series);

    renderRiskValidation(validation);
  } catch (err) {
    toast(`Risk indisponible : ${err.message}`, { error: true });
  }
}

function renderRiskValidation(v) {
  const meta = document.getElementById("riskValidationMeta");
  if (meta) {
    meta.textContent = `α = ${v.alpha} · fenêtre roulante ${v.rolling_window} · coût ${v.cost_bps} bps`;
  }
  const grid = document.getElementById("riskValidation");
  if (!grid) return;

  const cards = [];
  const verdictClass = (verdict) => {
    const v = (verdict || "").toLowerCase();
    if (v.startsWith("ok")) return "ok";
    if (v.startsWith("rejet")) return "ko";
    return "warn";
  };
  const pvalueClass = (p) => (p >= 0.05 ? "ok" : "ko");

  if (v.kupiec) {
    for (const [key, data] of Object.entries(v.kupiec)) {
      cards.push(`
        <article class="metric-card">
          <header class="metric-card-head">
            <p class="eyebrow">Kupiec · ${key === "parametric" ? "paramétrique" : "historique"}</p>
            <span class="badge badge-${verdictClass(data.verdict)}">${data.verdict}</span>
          </header>
          <dl class="metric-card-body">
            <div><dt>Breaches</dt><dd>${data.x} / ${data.T} <span class="muted">(${(data.p_obs * 100).toFixed(2)}%)</span></dd></div>
            <div><dt>Cible</dt><dd>${(data.p_target * 100).toFixed(0)}%</dd></div>
            <div><dt>Stat. LR</dt><dd>${data.lr.toFixed(3)}</dd></div>
            <div><dt>p-value</dt><dd class="num is-${pvalueClass(data.pvalue)}">${data.pvalue.toFixed(4)}</dd></div>
          </dl>
        </article>`);
    }
  }
  if (v.christoffersen) {
    for (const [key, data] of Object.entries(v.christoffersen)) {
      cards.push(`
        <article class="metric-card">
          <header class="metric-card-head">
            <p class="eyebrow">Christoffersen · ${key === "parametric" ? "paramétrique" : "historique"}</p>
            <span class="badge badge-${verdictClass(data.verdict)}">${data.verdict}</span>
          </header>
          <dl class="metric-card-body">
            <div><dt>n₀₀ / n₁₁</dt><dd>${data.n00} / ${data.n11}</dd></div>
            <div><dt>n₀₁ / n₁₀</dt><dd>${data.n01} / ${data.n10}</dd></div>
            <div><dt>LR ind.</dt><dd>${data.lr_ind.toFixed(3)}</dd></div>
            <div><dt>p-value</dt><dd class="num is-${pvalueClass(data.pvalue)}">${data.pvalue.toFixed(4)}</dd></div>
          </dl>
        </article>`);
    }
  }
  grid.innerHTML = cards.join("");
}

async function loadBacktest() {
  try {
    const [strats, eq] = await Promise.all([api.strategies(), api.equityCurves()]);
    const tbody = document.querySelector("#strategyTable tbody");
    tbody.innerHTML = strats.strategies
      .map((s) => {
        const annR = s.ann_return ?? 0;
        const mdd = s.max_drawdown ?? 0;
        return `
        <tr>
          <td><span class="strategy-badge">${s.label || s.id}</span></td>
          <td class="num">${s.sharpe == null ? "—" : s.sharpe.toFixed(3)}</td>
          <td class="num">${s.sortino == null ? "—" : s.sortino.toFixed(3)}</td>
          <td class="num ${annR > 0 ? "pos" : annR < 0 ? "neg" : ""}">${fmt.signed(annR, 2)}</td>
          <td class="num neg">${fmt.signed(mdd, 2)}</td>
          <td class="num">${s.final_equity == null ? "—" : s.final_equity.toFixed(3)}</td>
          <td class="num">${s.n_trades ?? "—"}</td>
        </tr>`;
      })
      .join("");

    await waitForPlotly();
    charts.equityAll(document.getElementById("chartEquityAll"), eq);
  } catch (err) {
    toast(`Backtest indisponible : ${err.message}`, { error: true });
  }
}

// ============================== Health ping ==============================
async function ping() {
  try {
    const h = await api.health();
    if (h.status === "ok") {
      setApiStatus("ok", `API · ${h.llm_backend}`);
    } else {
      setApiStatus("err", `artefacts manquants`);
    }
  } catch {
    setApiStatus("err", "API offline");
  }
}

// ============================== Refresh ==============================
document.getElementById("refreshBtn")?.addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  btn.classList.add("is-loading");
  btn.disabled = true;
  state.loadedViews.clear();
  try {
    await loadView(currentRoute());
    toast("Données rafraîchies");
  } finally {
    btn.classList.remove("is-loading");
    btn.disabled = false;
  }
});

// ============================== Boot ==============================
initTheme(() => {
  // Re-render Plotly charts when theme changes (text colors etc.)
  state.loadedViews.delete(currentRoute());
  loadView(currentRoute());
});

initChat();
ping();
handleRoute();
setInterval(ping, 30000);
