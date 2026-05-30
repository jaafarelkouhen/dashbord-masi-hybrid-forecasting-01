// Petits utilitaires UI : toast, theme toggle, set text.

export function setText(id, text, signClass) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if (signClass !== undefined) {
    el.classList.remove("is-positive", "is-negative");
    if (signClass) el.classList.add(signClass);
  }
}

let toastTimer;
export function toast(message, { error = false } = {}) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.classList.toggle("is-error", !!error);
  // Re-trigger transition by forcing reflow then add class
  // (transitions, not keyframes — interruptible, no restart-from-zero issues)
  requestAnimationFrame(() => {
    el.classList.add("is-visible");
  });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("is-visible");
    setTimeout(() => (el.hidden = true), 250);
  }, 3200);
}

export function setApiStatus(state, text) {
  // state: "ok" | "err" | "idle"
  const pill = document.getElementById("apiPill");
  if (!pill) return;
  pill.classList.toggle("is-ok", state === "ok");
  pill.classList.toggle("is-err", state === "err");
  const lbl = pill.querySelector(".api-pill-text");
  if (lbl) lbl.textContent = text;
}

export function initTheme(onChange) {
  const root = document.documentElement;
  const stored = localStorage.getItem("masi-theme");
  if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);

  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const curr = root.getAttribute("data-theme") || "dark";
      const next = curr === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("masi-theme", next);
      onChange && onChange(next);
    });
  }
}
