// Formatters consistents partout dans l'UI.

export const fmt = {
  pct: (v, digits = 2) => {
    if (v == null || Number.isNaN(v)) return "—";
    return (v * 100).toFixed(digits) + "%";
  },

  num: (v, digits = 2) => {
    if (v == null || Number.isNaN(v)) return "—";
    return Number(v).toFixed(digits);
  },

  signed: (v, digits = 2) => {
    if (v == null || Number.isNaN(v)) return "—";
    const s = (v * 100).toFixed(digits);
    return (v > 0 ? "+" : "") + s + "%";
  },

  date: (s) => {
    if (!s) return "—";
    return String(s).slice(0, 10);
  },

  signClass: (v) => (v == null ? "" : v > 0 ? "is-positive" : v < 0 ? "is-negative" : ""),
};
