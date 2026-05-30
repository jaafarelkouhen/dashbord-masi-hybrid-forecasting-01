"use client";

import { useEffect, useMemo, useRef } from "react";

type PlotlyChartProps = {
  data: unknown[];
  layout?: Record<string, unknown>;
  className?: string;
};

const config = {
  responsive: true,
  displayModeBar: false,
  displaylogo: false,
};

function cssVar(name: string) {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function chartTheme() {
  return {
    ink: cssVar("--ink") || "#f5f1e8",
    muted: cssVar("--muted") || "#8c94a3",
    panel: cssVar("--panel") || "#10151c",
    line: cssVar("--line") || "rgba(246,241,230,.1)",
    lineStrong: cssVar("--line-strong") || "rgba(246,241,230,.18)",
    masi: cssVar("--masi") || "#ff6a5e",
    mint: cssVar("--mint") || "#35c7b3",
    gain: cssVar("--gain") || "#4fd18b",
    warning: cssVar("--warning") || "#e2ad43",
    violet: cssVar("--violet") || "#a99cff",
  };
}

export function baseLayout() {
  const theme = chartTheme();

  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 54, r: 20, t: 14, b: 38 },
    font: {
      family: "Inter, system-ui, sans-serif",
      size: 11,
      color: theme.muted,
    },
    xaxis: {
      gridcolor: "rgba(246, 241, 230, 0.055)",
      zerolinecolor: theme.line,
      showline: false,
      ticks: "",
      automargin: true,
      tickfont: { color: theme.muted, size: 11 },
    },
    yaxis: {
      gridcolor: "rgba(246, 241, 230, 0.055)",
      zerolinecolor: theme.lineStrong,
      showline: false,
      ticks: "",
      automargin: true,
      tickfont: { color: theme.muted, size: 11 },
    },
    legend: {
      orientation: "h",
      x: 0,
      y: 1.12,
      xanchor: "left",
      yanchor: "bottom",
      bgcolor: "rgba(0,0,0,0)",
      font: { color: theme.ink, size: 11 },
    },
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: theme.panel,
      bordercolor: theme.lineStrong,
      font: { color: theme.ink, family: "Inter, sans-serif", size: 11 },
    },
  };
}

export function PlotlyChart({ data, layout, className }: PlotlyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mergedLayout = useMemo(() => ({ ...baseLayout(), ...(layout ?? {}) }), [layout]);

  useEffect(() => {
    let cancelled = false;
    const node = ref.current;

    async function render() {
      const PlotlyModule = await import("plotly.js-dist-min");
      const Plotly = PlotlyModule.default ?? PlotlyModule;
      if (cancelled || !node) return;
      await Plotly.react(node, data, mergedLayout, config);
    }

    render();

    return () => {
      cancelled = true;
      if (node) {
        import("plotly.js-dist-min").then((PlotlyModule) => {
          const Plotly = PlotlyModule.default ?? PlotlyModule;
          Plotly.purge(node);
        });
      }
    };
  }, [data, mergedLayout]);

  return (
    <div
      ref={ref}
      className={`min-h-[320px] w-full rounded-md border border-white/10 bg-[linear-gradient(90deg,transparent_0_31px,rgba(246,241,230,.045)_32px),linear-gradient(180deg,transparent_0_31px,rgba(246,241,230,.045)_32px)] bg-[length:32px_32px] ${className ?? ""}`}
    />
  );
}
