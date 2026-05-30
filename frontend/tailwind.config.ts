import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#05070a",
        panel: "#0b1118",
        panelSoft: "#111821",
        line: "rgba(125, 154, 190, 0.22)",
        ink: "#f6f7fb",
        muted: "#7f91ab",
        masi: "#ff6b00",
        ember: "#ff3f2d",
        mint: "#00f59f",
        gain: "#00f59f",
        warning: "#ffb000",
        danger: "#ff3f57",
        violet: "#8db7ff",
        cyan: "#22d3ee",
        plasma: "#a855f7",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        desk: "0 1px 0 rgba(255,255,255,.05) inset, 0 18px 46px -34px rgba(0,0,0,.92)",
        glow: "0 20px 58px -28px rgba(255,107,0,.78)",
        terminal: "0 0 0 1px rgba(255,107,0,.35), 0 22px 60px -36px rgba(255,107,0,.8)",
        lift: "0 1px 0 rgba(255,255,255,.08) inset, 0 30px 80px -38px rgba(0,0,0,1), 0 0 0 1px rgba(141,183,255,.08)",
        premium: "0 24px 80px -32px rgba(255,107,0,.55), 0 8px 32px -16px rgba(168,85,247,.35)",
      },
      backgroundImage: {
        "aurora-orange": "radial-gradient(60% 80% at 20% 20%, rgba(255,107,0,.35), transparent 60%), radial-gradient(50% 70% at 80% 30%, rgba(168,85,247,.28), transparent 60%), radial-gradient(60% 80% at 60% 90%, rgba(34,211,238,.22), transparent 60%)",
        "grid-fade": "linear-gradient(180deg, rgba(125,154,190,.08) 0, transparent 60%)",
        "gradient-headline": "linear-gradient(135deg, #fff 0%, #ffd9b3 32%, #ff6b00 60%, #a855f7 100%)",
        "gradient-mint": "linear-gradient(135deg, #00f59f 0%, #22d3ee 100%)",
        "gradient-ember": "linear-gradient(135deg, #ff6b00 0%, #ff3f2d 100%)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
        motion: "cubic-bezier(0.77, 0, 0.175, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
