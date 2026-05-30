// Plotly themed config + chart builders.

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function theme() {
  return {
    ink: cssVar("--ink"),
    muted: cssVar("--muted"),
    line: cssVar("--line"),
    lineStrong: cssVar("--line-strong"),
    brand: cssVar("--brand"),
    brandStrong: cssVar("--brand-strong"),
    accent: cssVar("--accent"),
    ink2: cssVar("--ink-2"),
    green: cssVar("--green"),
    red: cssVar("--red"),
    yellow: cssVar("--yellow"),
    violet: cssVar("--violet"),
    amber: cssVar("--amber"),
    chartFill: cssVar("--chart-fill"),
    chartFill2: cssVar("--chart-fill-2"),
    bgElev: cssVar("--bg-elev"),
    panel: cssVar("--panel"),
    grid: cssVar("--grid"),
  };
}

const COMMON = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: [
    "lasso2d",
    "select2d",
    "autoScale2d",
    "toggleSpikelines",
  ],
  displayModeBar: false,
};

function baseLayout() {
  const t = theme();
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 54, r: 22, t: 10, b: 40 },
    font: {
      family: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
      size: 11,
      color: t.muted,
    },
    xaxis: {
      gridcolor: t.grid,
      linecolor: t.line,
      zerolinecolor: t.line,
      showline: false,
      ticks: "",
      automargin: true,
      tickfont: { color: t.muted, size: 11 },
    },
    yaxis: {
      gridcolor: t.grid,
      linecolor: t.line,
      zerolinecolor: t.lineStrong,
      showline: false,
      ticks: "",
      automargin: true,
      tickfont: { color: t.muted, size: 11 },
    },
    legend: {
      orientation: "h",
      x: 0,
      xanchor: "left",
      y: 1.12,
      yanchor: "bottom",
      font: { color: t.ink, size: 11 },
      bgcolor: "rgba(0,0,0,0)",
    },
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: t.bgElev,
      bordercolor: t.lineStrong,
      font: { color: t.ink, family: "Inter, sans-serif", size: 11 },
    },
    spikedistance: 24,
  };
}

export const charts = {
  theme,

  equity(target, series) {
    const t = theme();
    // Rebase modèle ET B&H à 1.0 au début de la fenêtre affichée — sinon le modèle
    // "part" avec les gains cumulés des années précédentes et la comparaison est faussée.
    const rawEq = series.equity || [];
    const base = rawEq.length && Number.isFinite(rawEq[0]) && rawEq[0] !== 0 ? rawEq[0] : 1;
    const eq = rawEq.map((v) => v / base);
    let bh = 1;
    const bhSeries = series.actual_return.map((r) => (bh *= 1 + r));
    const values = [...eq, ...bhSeries].filter(Number.isFinite);
    const floor = values.length ? Math.min(...values) * 0.985 : 0;
    const traces = [
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
        y: eq,
        type: "scatter",
        mode: "lines",
        name: "Modèle (HMM-gate)",
        fill: "tonexty",
        fillcolor: t.chartFill,
        line: { color: t.brandStrong, width: 2.4 },
        hovertemplate: "%{x|%Y-%m-%d}<br>Modèle <b>%{y:.3f}</b><extra></extra>",
      },
      {
        x: series.dates,
        y: bhSeries,
        type: "scatter",
        mode: "lines",
        name: "Buy & Hold",
        line: { color: t.ink2, width: 1.5, dash: "dot" },
        hovertemplate: "%{x|%Y-%m-%d}<br>B&H <b>%{y:.3f}</b><extra></extra>",
      },
    ];
    const layout = {
      ...baseLayout(),
      yaxis: { ...baseLayout().yaxis, tickformat: ".2f", title: { text: "Equity (1.0 = start)", font: { color: t.muted, size: 11 } } },
    };
    Plotly.react(target, traces, layout, COMMON);
  },

  regimes(target, data) {
    const t = theme();
    const order = ["Bear", "Neutral", "Bull"];
    const colorMap = { Bear: t.red, Neutral: t.yellow, Bull: t.green };
    const sorted = order
      .map((name) => data.regimes.find((r) => r.name === name))
      .filter(Boolean);
    const fallback = data.regimes.filter((r) => !order.includes(r.name));
    const all = [...sorted, ...fallback];

    const traces = [
      {
        labels: all.map((r) => r.name),
        values: all.map((r) => r.count),
        type: "pie",
        hole: 0.62,
        marker: {
          colors: all.map((r) => colorMap[r.name] || t.accent),
          line: { color: t.panel, width: 2 },
        },
        textinfo: "label+percent",
        sort: false,
        textfont: { color: t.ink, size: 12, family: "Inter" },
        hovertemplate: "<b>%{label}</b><br>%{value} jours (%{percent})<extra></extra>",
      },
    ];
    const layout = {
      ...baseLayout(),
      margin: { l: 20, r: 20, t: 20, b: 20 },
      showlegend: false,
    };
    Plotly.react(target, traces, layout, COMMON);
  },

  risk(target, series) {
    const t = theme();
    const traces = [
      {
        x: series.dates,
        y: series.es_param_5,
        name: "ES 5% (paramétrique)",
        type: "scatter",
        mode: "lines",
        line: { color: t.brand, width: 1.4, dash: "dot" },
        hovertemplate: "%{x|%Y-%m-%d}<br>ES=%{y:.3%}<extra></extra>",
      },
      {
        x: series.dates,
        y: series.var_param_5,
        name: "VaR 5% (paramétrique)",
        type: "scatter",
        mode: "lines",
        fill: "tonexty",
        fillcolor: t.chartFill,
        line: { color: t.brandStrong, width: 1.7 },
        hovertemplate: "%{x|%Y-%m-%d}<br>VaR=%{y:.3%}<extra></extra>",
      },
      {
        x: series.dates,
        y: series.actual_return,
        name: "Rendement réalisé",
        type: "scatter",
        mode: "markers",
        marker: { color: t.ink, size: 4, opacity: 0.48, line: { color: t.panel, width: 0.5 } },
        hovertemplate: "%{x|%Y-%m-%d}<br>r=%{y:.3%}<extra></extra>",
      },
    ];
    const layout = {
      ...baseLayout(),
      yaxis: { ...baseLayout().yaxis, tickformat: ".1%", title: { text: "Rendement log", font: { color: t.muted, size: 11 } } },
    };
    Plotly.react(target, traces, layout, COMMON);
  },

  equityAll(target, equityData) {
    const t = theme();
    const palette = [
      t.brandStrong,
      t.accent,
      t.green,
      t.amber,
      t.violet,
      "#5ea1ff",
      "#f97362",
    ];
    const traces = Object.entries(equityData.series).map(([name, ys], i) => ({
      x: equityData.dates,
      y: ys,
      name,
      type: "scattergl",
      mode: "lines",
      line: { color: palette[i % palette.length], width: 1.6 },
      hovertemplate: `<b>${name}</b><br>%{x|%Y-%m-%d}<br>Equity %{y:.3f}<extra></extra>`,
    }));
    const layout = {
      ...baseLayout(),
      yaxis: { ...baseLayout().yaxis, tickformat: ".2f" },
    };
    Plotly.react(target, traces, layout, COMMON);
  },

  horizonFan(target, daily, summary, opts = {}) {
    const t = theme();
    const dates = daily.date || [];
    const close = daily.predicted_close || [];
    const p10 = daily.mc_p10 || [];
    const p50 = daily.mc_p50 || [];
    const p90 = daily.mc_p90 || [];
    const source = daily.source || [];
    const month = daily.month || [];

    const filter = opts.month && opts.month !== "all" ? opts.month : null;
    const keep = dates.map((_, i) => !filter || month[i] === filter);
    const sub = (arr) => arr.filter((_, i) => keep[i]);

    const traces = [
      // bande p10-p90 : trace basse invisible puis trace haute remplie vers le bas
      {
        x: sub(dates),
        y: sub(p10),
        type: "scatter",
        mode: "lines",
        line: { color: "rgba(0,0,0,0)", width: 0 },
        showlegend: false,
        hoverinfo: "skip",
      },
      {
        x: sub(dates),
        y: sub(p90),
        type: "scatter",
        mode: "lines",
        name: "Bande p10 – p90 (Monte-Carlo)",
        line: { color: "rgba(0,0,0,0)", width: 0 },
        fill: "tonexty",
        fillcolor: t.chartFill || "rgba(124,156,255,0.18)",
        hovertemplate: "%{x|%Y-%m-%d}<br>p90 <b>%{y:,.0f}</b><extra></extra>",
      },
      // médiane p50
      {
        x: sub(dates),
        y: sub(p50),
        type: "scatter",
        mode: "lines",
        name: "Médiane p50",
        line: { color: t.accent, width: 1.6, dash: "dot" },
        hovertemplate: "%{x|%Y-%m-%d}<br>p50 <b>%{y:,.0f}</b><extra></extra>",
      },
      // projection ARIMA (close prédit)
      {
        x: sub(dates),
        y: sub(close),
        type: "scatter",
        mode: "lines",
        name: "Projection ARIMA",
        line: { color: t.brandStrong, width: 2.4 },
        hovertemplate: "%{x|%Y-%m-%d}<br>close <b>%{y:,.0f}</b><extra></extra>",
      },
    ];

    // marqueurs source = observed (s'il y en a)
    const obsIdx = source.map((s, i) => (s === "observed" ? i : -1)).filter((i) => i >= 0 && keep[i]);
    if (obsIdx.length) {
      traces.push({
        x: obsIdx.map((i) => dates[i]),
        y: obsIdx.map((i) => close[i]),
        type: "scatter",
        mode: "markers",
        name: "Observed",
        marker: { color: t.green, size: 6 },
        hovertemplate: "%{x|%Y-%m-%d}<br>observed <b>%{y:,.0f}</b><extra></extra>",
      });
    }

    // ligne de référence : dernier close observé
    if (summary && summary.last_obs_close) {
      const xs = sub(dates);
      if (xs.length) {
        traces.push({
          x: [xs[0], xs[xs.length - 1]],
          y: [summary.last_obs_close, summary.last_obs_close],
          type: "scatter",
          mode: "lines",
          name: `Dernier observed (${summary.last_obs_date || ""})`,
          line: { color: t.muted, width: 1, dash: "dash" },
          hovertemplate: "Dernier observed<br><b>%{y:,.0f}</b><extra></extra>",
        });
      }
    }

    const layout = {
      ...baseLayout(),
      yaxis: {
        ...baseLayout().yaxis,
        tickformat: ",.0f",
        title: { text: "MASI close", font: { color: t.muted, size: 11 } },
      },
    };
    Plotly.react(target, traces, layout, COMMON);
  },

  horizonSignals(target, signalCounts) {
    const t = theme();
    const order = ["hausse", "neutre", "baisse"];
    const colorMap = { hausse: t.green, neutre: t.yellow, baisse: t.red };
    const items = order
      .map((name) => ({ name, count: Number(signalCounts?.[name] || 0) }))
      .filter((r) => r.count > 0);
    if (!items.length) {
      Plotly.react(target, [], { ...baseLayout(), annotations: [{ text: "Pas de signaux disponibles", showarrow: false, font: { color: t.muted, size: 12 } }] }, COMMON);
      return;
    }
    const traces = [{
      labels: items.map((r) => r.name),
      values: items.map((r) => r.count),
      type: "pie",
      hole: 0.62,
      marker: {
        colors: items.map((r) => colorMap[r.name] || t.accent),
        line: { color: t.panel, width: 2 },
      },
      textinfo: "label+percent",
      sort: false,
      textfont: { color: t.ink, size: 12, family: "Inter" },
      hovertemplate: "<b>%{label}</b><br>%{value} jours (%{percent})<extra></extra>",
    }];
    const layout = {
      ...baseLayout(),
      margin: { l: 20, r: 20, t: 20, b: 20 },
      showlegend: false,
    };
    Plotly.react(target, traces, layout, COMMON);
  },

  // Re-render all visible charts (theme switch)
  redrawAll() {
    document.querySelectorAll(".chart").forEach((el) => {
      if (el && el.data) {
        Plotly.relayout(el, baseLayout());
      }
    });
  },
};
