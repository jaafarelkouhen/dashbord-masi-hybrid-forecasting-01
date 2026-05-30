export function pct(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function signedPct(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  const formatted = (value * 100).toFixed(digits);
  return `${value > 0 ? "+" : ""}${formatted}%`;
}

export function num(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

export function date(value: string | null | undefined) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

export function toneFromValue(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "text-ink";
  if (value > 0) return "text-gain";
  if (value < 0) return "text-masi";
  return "text-ink";
}
