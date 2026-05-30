import Link from "next/link";
import type { CSSProperties } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  CircuitBoard,
  Cpu,
  LineChart,
  LockKeyhole,
  Play,
  Quote,
  Shield,
  Sparkles,
  Star,
  Terminal,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";

const metrics = [
  { label: "Final equity", value: "1.712", detail: "+71.2% TEST curve", accent: "mint" as const },
  { label: "Regime posterior", value: "39%", detail: "Neutral HMM state", accent: "violet" as const },
  { label: "Risk score", value: "54.5", detail: "EGARCH layer live", accent: "warning" as const },
  { label: "Backtest span", value: "948", detail: "walk-forward days", accent: "cyan" as const },
];

const stack = [
  {
    icon: LineChart,
    title: "CNN-LSTM signal core",
    text: "Next-session return forecast with a production-ready signal surface.",
    stat: "-0.055%",
    tint: "from-masi/30 via-masi/10 to-transparent",
    border: "border-masi/40",
  },
  {
    icon: Cpu,
    title: "HMM regime gate",
    text: "Three-state market context, persistence tracking and posterior pressure.",
    stat: "3-state",
    tint: "from-plasma/30 via-plasma/10 to-transparent",
    border: "border-plasma/40",
  },
  {
    icon: Shield,
    title: "EGARCH risk layer",
    text: "VaR, ES and breach validation before a strategy gets trusted.",
    stat: "-1.79%",
    tint: "from-cyan/30 via-cyan/10 to-transparent",
    border: "border-cyan/40",
  },
];

const ticker = [
  "MASI LIVE",
  "HMM: NEUTRAL",
  "VAR 5%: -1.79%",
  "ES 5%: -2.26%",
  "EQUITY: 1.712",
  "DSR: 0.997",
  "SHARPE: 1.42",
  "SORTINO: 2.18",
];

const features = [
  {
    icon: Brain,
    title: "Hybrid intelligence",
    text: "Deep learning signal, regime-switching context and volatility risk fused into one decision surface.",
  },
  {
    icon: TrendingUp,
    title: "Walk-forward proof",
    text: "948 days of out-of-sample validation with anti-leakage rolling windows.",
  },
  {
    icon: Waves,
    title: "Regime-aware",
    text: "HMM posteriors gate the strategy in real time. No more trading blind through bear flips.",
  },
  {
    icon: CircuitBoard,
    title: "Full transparency",
    text: "Every metric traceable. RAG copilot explains methodology, breaches and decisions in plain French.",
  },
];

const pulseBars = [34, 58, 47, 72, 64, 88, 54, 76, 44, 68, 82, 60];

function reveal(delay: number): CSSProperties {
  return { "--reveal-delay": `${delay}ms` } as CSSProperties;
}

function barStyle(height: number, index: number): CSSProperties {
  return { height: `${height}%`, ["--bar-index" as never]: index } as CSSProperties;
}

export function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-canvas text-ink">
      <Hero />
      <ProofRail />
      <FeaturesGrid />
      <StackSection />
      <WorkflowSection />
      <SocialProof />
      <FinalCta />
    </main>
  );
}

function Hero() {
  return (
    <section className="landing-scanline relative min-h-[100svh] overflow-hidden border-b border-line">
      {/* Aurora background layers */}
      <div className="absolute inset-0 bg-canvas" />
      <div className="aurora-layer" />
      <span className="aurora-orb left-[-12%] top-[18%] h-72 w-72 bg-masi/40" style={{ animationDelay: "0s" }} />
      <span className="aurora-orb right-[-8%] top-[8%] h-80 w-80 bg-plasma/35" style={{ animationDelay: "2s" }} />
      <span className="aurora-orb bottom-[8%] left-[40%] h-80 w-80 bg-cyan/25" style={{ animationDelay: "4s" }} />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0_31px,rgba(125,154,190,.06)_32px),linear-gradient(180deg,transparent_0_31px,rgba(125,154,190,.06)_32px)] bg-[length:32px_32px]" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_100%,rgba(5,7,10,.85),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,10,.55),transparent_30%,rgba(5,7,10,.92))]" />

      <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-5 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 whitespace-nowrap font-mono text-lg font-black uppercase max-[420px]:text-base">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-gradient-ember shadow-glow">
            <Activity size={16} className="text-black" strokeWidth={3} />
          </span>
          <span>MASI</span>
          <span className="text-masi">.</span>
          <span className="max-[360px]:hidden">HYBRID</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="#system" className="desk-button hidden border-white/10 bg-white/[0.04] px-3 text-xs sm:inline-flex">
            <Terminal size={14} />
            System
          </Link>
          <Link href="/dashboard" className="desk-button btn-primary h-10 border-0 px-4 text-xs shadow-premium max-[480px]:hidden sm:px-4">
            <Play size={14} fill="currentColor" />
            <span className="max-[420px]:hidden">Launch</span>
          </Link>
        </div>
      </nav>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-[1.15fr_1fr] items-center gap-12 px-5 pb-24 pt-8 lg:px-8 max-xl:grid-cols-1">
        {/* Left column — copy */}
        <div className="min-w-0 max-w-3xl max-[420px]:max-w-[calc(100vw-40px)]">
          <div
            className="landing-reveal mb-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-mint/45 bg-mint/10 px-4 py-2 font-mono text-xs font-black uppercase text-mint shadow-[0_0_52px_-36px_rgba(0,245,159,.85)]"
            style={reveal(40)}
          >
            <span className="pulse-dot h-2 w-2 rounded-full bg-mint" />
            Forecasting engine online
          </div>
          <h1
            className="landing-reveal break-words font-mono text-5xl font-black uppercase leading-[0.95] tracking-tight max-[420px]:text-4xl sm:text-6xl lg:text-[5.5rem]"
            style={reveal(95)}
          >
            <span className="gradient-text">MASI</span>{" "}
            <span className="text-ink">Hybrid</span>
            <br />
            <span className="text-ink">Forecasting</span>
          </h1>
          <p
            className="landing-copy landing-reveal mt-7 max-w-2xl break-words text-lg leading-8 text-zinc-300 max-[420px]:max-w-[calc(100vw-40px)] max-[420px]:text-base max-[420px]:leading-7"
            style={reveal(145)}
          >
            Forecast signal, HMM regime, EGARCH risk and backtest intelligence for the MASI index — wrapped into one
            sharp, transparent cockpit. <span className="text-mint">No black boxes. No fairy tales.</span>
          </p>
          <div className="landing-reveal mt-9 flex flex-wrap gap-3" style={reveal(190)}>
            <Link href="/dashboard" className="desk-button btn-primary h-12 border-0 px-6 shadow-premium max-[420px]:px-4">
              Open dashboard
              <ArrowRight size={16} />
            </Link>
            <Link href="#workflow" className="desk-button h-12 border-white/15 bg-white/[0.04] px-6 backdrop-blur-md hover:border-mint/60 max-[420px]:px-4">
              See pipeline
              <Activity size={16} />
            </Link>
          </div>

          {/* Trust pills */}
          <div className="landing-reveal mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 font-mono text-xs font-black uppercase text-muted" style={reveal(240)}>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" /> Walk-forward 948j
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet" /> Kupiec + Christoffersen
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan" /> RAG copilot inclus
            </span>
          </div>
        </div>

        {/* Right column — Live HUD card */}
        <LiveHud />
      </div>

      {/* Ticker */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-y border-masi/35 bg-black/65 py-3 backdrop-blur-md">
        <div className="landing-ticker max-w-[100vw] overflow-hidden font-mono text-xs font-black uppercase text-violet">
          <div className="landing-ticker-track flex min-w-max gap-8">
            {[...ticker, ...ticker, ...ticker].map((item, index) => (
              <span key={`${item}-${index}`} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-masi" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveHud() {
  return (
    <aside className="landing-reveal relative z-10 mx-auto w-full max-w-md max-xl:hidden" style={reveal(280)}>
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6 shadow-premium">
        {/* Corner gradient accent */}
        <span className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-masi/30 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-plasma/20 blur-3xl" />

        <header className="relative flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-black uppercase tracking-wider text-violet">Live signal pulse</p>
            <p className="mt-3 font-mono text-4xl font-black leading-none text-masi">-0.055%</p>
            <p className="mt-2 font-mono text-xs font-black uppercase text-muted">forecast j+1 · cnn-lstm</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/45 bg-mint/10 px-3 py-1 font-mono text-[10px] font-black uppercase text-mint">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-mint" />
            armed
          </span>
        </header>

        {/* Animated SVG sparkline */}
        <div className="relative mt-6 h-28">
          <svg viewBox="0 0 400 110" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="hud-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ff6b00" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#ff6b00" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="hud-stroke" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#ff6b00" />
                <stop offset="60%" stopColor="#ff3f2d" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <path
              d="M0,70 L40,65 L80,58 L120,72 L160,48 L200,52 L240,38 L280,44 L320,28 L360,34 L400,18 L400,110 L0,110 Z"
              fill="url(#hud-fill)"
              opacity="0.85"
            />
            <path
              d="M0,70 L40,65 L80,58 L120,72 L160,48 L200,52 L240,38 L280,44 L320,28 L360,34 L400,18"
              fill="none"
              stroke="url(#hud-stroke)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="draw-path"
            />
            {/* Endpoint glow */}
            <circle cx="400" cy="18" r="4" fill="#a855f7" />
            <circle cx="400" cy="18" r="8" fill="#a855f7" opacity="0.35">
              <animate attributeName="r" values="6;12;6" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
            </circle>
          </svg>

          {/* Animated micro-bars overlay */}
          <div className="absolute inset-x-0 bottom-0 grid h-10 grid-cols-12 items-end gap-1 opacity-50">
            {pulseBars.map((height, index) => (
              <span
                key={index}
                className="bar-grow w-full rounded-sm"
                style={{
                  ...barStyle(height, index),
                  background: index % 3 === 0 ? "#00f59f" : "#ff6b00",
                  opacity: index % 3 === 0 ? 0.8 : 0.55,
                }}
              />
            ))}
          </div>
        </div>

        <dl className="relative mt-6 grid grid-cols-2 gap-3 font-mono">
          <div className="rounded-lg border border-white/8 bg-black/30 p-3">
            <dt className="text-[10px] font-black uppercase tracking-wider text-muted">Posterior</dt>
            <dd className="mt-1 text-2xl font-black text-mint">39%</dd>
          </div>
          <div className="rounded-lg border border-white/8 bg-black/30 p-3">
            <dt className="text-[10px] font-black uppercase tracking-wider text-muted">Risk gate</dt>
            <dd className="mt-1 text-2xl font-black text-warning">High</dd>
          </div>
          <div className="col-span-2 rounded-lg border border-white/8 bg-black/30 p-3">
            <dt className="text-[10px] font-black uppercase tracking-wider text-muted">Strategy · DSR</dt>
            <dd className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-ink">0.997</span>
              <span className="font-mono text-xs font-black uppercase text-mint">deflated sharpe</span>
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

function ProofRail() {
  return (
    <section className="relative border-b border-line bg-black/40 px-5 py-12 lg:px-8">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-masi/40 to-transparent" />
      <div className="mx-auto grid max-w-7xl grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {metrics.map((metric, index) => {
          const accentMap: Record<typeof metric.accent, string> = {
            mint: "from-mint/40 via-mint/10 to-transparent",
            violet: "from-violet/40 via-violet/10 to-transparent",
            warning: "from-warning/40 via-warning/10 to-transparent",
            cyan: "from-cyan/40 via-cyan/10 to-transparent",
          };
          const dotMap: Record<typeof metric.accent, string> = {
            mint: "bg-mint",
            violet: "bg-violet",
            warning: "bg-warning",
            cyan: "bg-cyan",
          };
          return (
            <article
              key={metric.label}
              className="tilt-card group relative overflow-hidden rounded-xl border border-white/8 bg-panel/70 p-6 backdrop-blur-sm"
              style={reveal(80 * index)}
            >
              <span
                className={`pointer-events-none absolute -top-12 right-[-30%] h-32 w-44 bg-gradient-to-br ${accentMap[metric.accent]} blur-2xl`}
              />
              <div className="relative flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${dotMap[metric.accent]}`} />
                <p className="font-mono text-[11px] font-black uppercase tracking-wider text-violet">{metric.label}</p>
              </div>
              <strong
                className="counter-fade mt-4 block font-mono text-4xl font-black leading-none text-ink"
                style={reveal(120 + 80 * index)}
              >
                {metric.value}
              </strong>
              <span className="mt-3 block font-mono text-xs font-black uppercase text-mint">{metric.detail}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FeaturesGrid() {
  return (
    <section className="relative px-5 py-24 lg:px-8">
      <div className="absolute inset-0 bg-grid-fade" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl">
          <p className="font-mono text-xs font-black uppercase tracking-wider text-cyan">Why MASI Hybrid</p>
          <h2 className="mt-3 font-mono text-3xl font-black uppercase leading-tight sm:text-4xl lg:text-5xl">
            One cockpit. <span className="gradient-text-mint">Four discoveries</span> per session.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
            We compress the messy reality of Casablanca Stock Exchange forecasting into one auditable surface — built
            for analysts who need to defend every number.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="tilt-card group relative overflow-hidden rounded-xl border border-white/8 bg-panel/60 p-7 backdrop-blur-sm"
                style={reveal(60 * index)}
              >
                <span className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-masi/15 blur-3xl transition-opacity duration-300 group-hover:bg-masi/30" />
                <div className="relative flex items-start gap-5">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent text-masi shadow-inner">
                    <Icon size={24} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-mono text-lg font-black uppercase text-ink">{feature.title}</h3>
                    <p className="mt-3 leading-7 text-muted">{feature.text}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StackSection() {
  return (
    <section id="system" className="relative border-y border-line bg-panel/30 px-5 py-24 lg:px-8">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-masi/40 to-transparent" />
      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-black uppercase tracking-wider text-masi">System layers</p>
          <h2 className="mt-3 font-mono text-3xl font-black uppercase leading-tight sm:text-4xl lg:text-5xl">
            Built like a <span className="gradient-text">quant desk</span>,<br />
            not a template.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-3 gap-5 max-lg:grid-cols-1">
          {stack.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className={`tilt-card relative min-h-80 overflow-hidden rounded-2xl border ${item.border} bg-panel/70 p-7 backdrop-blur-sm`}
                style={reveal(120 * index)}
              >
                <span className={`pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br ${item.tint} blur-2xl`} />
                <div className="relative flex items-start justify-between gap-4">
                  <span className="grid h-14 w-14 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-white/12 to-transparent text-masi shadow-inner">
                    <Icon size={24} strokeWidth={1.8} />
                  </span>
                  <span className="font-mono text-3xl font-black text-mint">{item.stat}</span>
                </div>
                <h3 className="relative mt-8 font-mono text-xl font-black uppercase text-ink">{item.title}</h3>
                <p className="relative mt-4 leading-7 text-muted">{item.text}</p>
                <div className="relative mt-8 grid h-16 grid-cols-12 items-end gap-1">
                  {Array.from({ length: 12 }).map((_, barIndex) => (
                    <span
                      key={barIndex}
                      className="bar-grow rounded-sm bg-gradient-to-t from-masi/70 to-masi/30 transition-all duration-300 group-hover:from-mint/80 group-hover:to-mint/40"
                      style={{
                        height: `${22 + ((barIndex * 17) % 42)}px`,
                        ["--bar-index" as never]: barIndex,
                      }}
                    />
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  const steps = [
    { icon: Zap, title: "Ingest", text: "Price data, features, realized returns and risk windows.", color: "violet" },
    { icon: BarChart3, title: "Forecast", text: "CNN-LSTM signal with live strategy posture.", color: "masi" },
    { icon: LockKeyhole, title: "Validate", text: "Backtest, regime persistence, VaR breaches and test metrics.", color: "cyan" },
    { icon: Sparkles, title: "Explain", text: "AI copilot ready for methodology and metric questions.", color: "mint" },
  ];

  const colorClasses: Record<string, { border: string; bg: string; text: string }> = {
    violet: { border: "border-violet/40", bg: "bg-violet/10", text: "text-violet" },
    masi: { border: "border-masi/40", bg: "bg-masi/10", text: "text-masi" },
    cyan: { border: "border-cyan/40", bg: "bg-cyan/10", text: "text-cyan" },
    mint: { border: "border-mint/40", bg: "bg-mint/10", text: "text-mint" },
  };

  return (
    <section id="workflow" className="relative px-5 py-24 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-[0.85fr_1.15fr] gap-12 max-lg:grid-cols-1">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-wider text-mint">Pipeline</p>
          <h2 className="mt-3 font-mono text-3xl font-black uppercase leading-tight sm:text-4xl lg:text-5xl">
            From market state to <span className="gradient-text-mint">action</span> in one flow.
          </h2>
          <p className="mt-6 leading-8 text-zinc-400">
            The page introduces the product, then the dashboard takes over for the real work: inspect signal quality,
            compare regimes, validate risk, and launch the AI copilot.
          </p>

          {/* Visual connector */}
          <div className="mt-10 hidden gap-3 lg:flex">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-masi via-plasma to-cyan opacity-70" />
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const c = colorClasses[step.color];
            return (
              <article
                key={step.title}
                className="tilt-card group relative grid grid-cols-[64px_1fr_auto] items-center gap-5 overflow-hidden rounded-xl border border-white/8 bg-panel/60 p-5 backdrop-blur-sm max-sm:grid-cols-[56px_1fr]"
                style={reveal(80 * index)}
              >
                <span className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-masi/10 blur-3xl transition-opacity duration-300 group-hover:bg-masi/20" />
                <span
                  className={`relative grid h-14 w-14 place-items-center rounded-xl border ${c.border} ${c.bg} ${c.text} shadow-inner`}
                >
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <div className="relative min-w-0">
                  <h3 className="font-mono text-sm font-black uppercase text-ink">
                    <span className={c.text}>0{index + 1}</span> — {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{step.text}</p>
                </div>
                <span className="relative font-mono text-[10px] font-black uppercase text-masi max-sm:hidden">
                  ● armed
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="relative border-y border-line bg-black/40 px-5 py-20 lg:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet/40 bg-violet/10 px-4 py-2 font-mono text-xs font-black uppercase text-violet">
          <Star size={12} fill="currentColor" />
          What it replaces
        </div>
        <h2 className="font-mono text-3xl font-black uppercase leading-tight sm:text-4xl lg:text-5xl">
          Five Excel files,<br />
          <span className="gradient-text">one Python notebook</span>,<br />
          zero defensible audit trail.
        </h2>
        <div className="mx-auto mt-10 max-w-3xl">
          <div className="glass-panel relative overflow-hidden rounded-2xl p-8 text-left shadow-lift">
            <Quote className="absolute right-6 top-6 text-masi/30" size={48} />
            <p className="text-lg leading-8 text-zinc-200 max-sm:text-base">
              &laquo; On voulait remplacer 5 fichiers Excel + 1 notebook qui prenait 40 min à recharger. Aujourd'hui le
              VaR est dispo en 2 secondes, le backtest est reproductible, et l'assistant explique chaque chiffre. C'est
              le cockpit qu'on aurait dû avoir depuis longtemps. &raquo;
            </p>
            <footer className="mt-6 flex items-center gap-4 border-t border-white/10 pt-5">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-ember font-mono text-sm font-black text-black">
                QD
              </span>
              <div>
                <p className="font-mono text-sm font-black uppercase text-ink">Quant Desk</p>
                <p className="font-mono text-xs uppercase text-muted">Internal user · Casablanca</p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden px-5 py-24 lg:px-8">
      <span className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[1200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-masi/15 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-32 left-1/3 h-[300px] w-[500px] rounded-full bg-plasma/15 blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        <div className="glass-panel rounded-3xl p-12 text-center shadow-premium max-md:p-8">
          <p className="font-mono text-xs font-black uppercase tracking-wider text-cyan">Ready when you are</p>
          <h2 className="mt-4 font-mono text-4xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl">
            Enter the <span className="gradient-text">MASI cockpit</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-zinc-400">
            Forecast, risk and backtest in one place. Launch the dashboard and start running scenarios in seconds.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard" className="desk-button btn-primary h-14 border-0 px-8 text-base shadow-premium">
              Launch dashboard
              <ArrowRight size={18} />
            </Link>
            <Link
              href="#system"
              className="desk-button h-14 border-white/15 bg-white/[0.04] px-8 text-base backdrop-blur-md hover:border-mint/60"
            >
              <Terminal size={16} />
              See the stack
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 font-mono text-[11px] font-black uppercase tracking-wider text-muted">
            <span className="flex items-center gap-2">
              <span className="pulse-dot h-2 w-2 rounded-full bg-mint" /> Engine online
            </span>
            <span className="text-line">·</span>
            <span>Walk-forward · 948j</span>
            <span className="text-line">·</span>
            <span>Anti-leakage validated</span>
          </div>
        </div>
      </div>
    </section>
  );
}
