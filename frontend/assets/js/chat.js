// Chat panel : envoi message, render bulles + sources.

import { api } from "./api.js";

const log = () => document.getElementById("chatLog");
const form = () => document.getElementById("chatForm");
const input = () => document.getElementById("chatInput");
const sendBtn = () => document.getElementById("chatSend");
const meta = () => document.getElementById("chatMeta");

const history = [];

function clearEmpty() {
  const empty = log()?.querySelector(".chat-empty");
  if (empty) empty.remove();
}

function appendBubble(role, html, opts = {}) {
  const b = document.createElement("div");
  b.className = `bubble ${role}`;
  if (opts.thinking) b.classList.add("is-thinking");
  b.innerHTML = html;
  log().appendChild(b);
  // Scroll to bottom — smooth, ease-out
  log().scrollTo({ top: log().scrollHeight, behavior: "smooth" });
  return b;
}

function renderSources(sources) {
  if (!sources?.length) return "";
  const items = sources
    .map(
      (s) => `
      <div class="source">
        <div class="source-head">
          <span>${escape(s.title)}</span>
          <span class="source-score">${(s.score * 100).toFixed(0)}%</span>
        </div>
        <div class="source-snippet">${escape(s.snippet)}</div>
      </div>`
    )
    .join("");
  return `<div class="sources">${items}</div>`;
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, (m) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m])
  );
}

function mdInline(s) {
  // mini-markdown : **gras**, _italique_, `code`, sauts de ligne préservés
  let out = escape(s);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/_(.+?)_/g, "<em>$1</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

async function send(message) {
  if (!message?.trim()) return;
  clearEmpty();
  appendBubble("user", mdInline(message));
  history.push({ role: "user", content: message });
  input().value = "";

  const thinking = appendBubble(
    "assistant",
    '<span class="thinking-dots"><span></span><span></span><span></span></span>',
    { thinking: true }
  );
  sendBtn().disabled = true;

  try {
    const res = await api.chat({ message, history: history.slice(-12) });
    thinking.classList.remove("is-thinking");
    thinking.innerHTML = mdInline(res.answer) + renderSources(res.sources);
    history.push({ role: "assistant", content: res.answer });
    if (meta()) {
      meta().textContent = `Intent : ${res.intent} · backend : ${res.backend}`;
    }
  } catch (err) {
    thinking.classList.remove("is-thinking");
    thinking.innerHTML =
      `<strong>Erreur :</strong> ${escape(err.message || "appel API échoué")}.`;
  } finally {
    sendBtn().disabled = false;
    // Focus revient à l'input — l'utilisateur peut enchaîner sans clic souris
    input()?.focus();
  }
}

export function initChat() {
  form()?.addEventListener("submit", (e) => {
    e.preventDefault();
    send(input().value);
  });
  // Suggestions chips
  document.querySelectorAll("[data-suggest]").forEach((btn) => {
    btn.addEventListener("click", () => send(btn.textContent.trim()));
  });
}
