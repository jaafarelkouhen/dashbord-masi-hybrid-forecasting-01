"use client";

import {
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  FileText,
  NotebookPen,
  Send,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api, ChatBackendResponse, ChatMessage, ChatSource } from "@/lib/api";

type ChatTurn = ChatMessage & {
  sources?: ChatSource[];
  backend?: string;
  intent?: string;
  used_rag?: boolean;
  used_live?: boolean;
};

type SuggestionGroup = {
  label: string;
  items: string[];
};

const SUGGESTION_GROUPS: SuggestionGroup[] = [
  {
    label: "Prévision live",
    items: [
      "Quelle est la prévision du jour ?",
      "Quel est le VaR 5% actuel ?",
      "Régime HMM courant et streak ?",
    ],
  },
  {
    label: "Risque",
    items: [
      "Différence VaR vs ES ?",
      "Verdicts Kupiec et Christoffersen ?",
      "Combien de breaches sur le Test ?",
    ],
  },
  {
    label: "Stratégies",
    items: [
      "Meilleure stratégie par Sharpe ?",
      "Comment marche le HMM-gate ?",
      "Drawdown du CNN-LSTM nu ?",
    ],
  },
  {
    label: "Méthodologie",
    items: [
      "Explique l'anti-leakage",
      "Architecture du CNN-LSTM ?",
      "C'est quoi le walk-forward ?",
    ],
  },
];

const INTENT_LABEL: Record<string, string> = {
  help_request: "Aide",
  definition_query: "Définition",
  forecast_query: "Prévision",
  risk_query: "Risque",
  regime_query: "Régime",
  strategy_query: "Stratégie",
  methodology_query: "Méthodologie",
  out_of_scope: "Hors scope",
};

const KIND_ICON: Record<string, typeof FileText> = {
  notebook: NotebookPen,
  curated: BookOpen,
  markdown: FileText,
};

export function ChatView() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [meta, setMeta] = useState(
    "Pose une question sur la méthodologie, les métriques live, le backtest ou les stratégies."
  );
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  const send = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || pending) return;

      const history: ChatMessage[] = [
        ...messages.map(({ role, content }) => ({ role, content })),
        { role: "user", content: message },
      ];

      setMessages((current) => [...current, { role: "user", content: message }]);
      setInput("");
      setPending(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await api.chat({ message, history: history.slice(-12) });
        const turn: ChatTurn = {
          role: "assistant",
          content: response.answer,
          sources: response.sources,
          backend: response.backend,
          intent: response.intent,
          used_rag: response.used_rag,
          used_live: response.used_live,
        };
        setMessages((current) => [...current, turn]);
        setMeta(
          [
            `Intent : ${INTENT_LABEL[response.intent] ?? response.intent}`,
            `Backend : ${response.backend}`,
            response.used_rag ? "RAG : oui" : "RAG : non",
            response.used_live ? "Snapshot live : oui" : "Snapshot live : non",
          ].join(" · ")
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setMeta("Génération annulée.");
        } else {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              content:
                err instanceof Error
                  ? `Erreur API : ${err.message}`
                  : "Erreur API inconnue.",
            },
          ]);
        }
      } finally {
        setPending(false);
        abortRef.current = null;
      }
    },
    [messages, pending]
  );

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      send(input);
    },
    [input, send]
  );

  const clear = useCallback(() => {
    setMessages([]);
    setMeta("Conversation effacée. Pose une nouvelle question.");
    inputRef.current?.focus();
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const showSuggestions = messages.length === 0;

  return (
    <section className="grid gap-6">
      <ChatHeader meta={meta} onClear={clear} hasMessages={messages.length > 0} />

      <div className="desk-panel grid min-h-[calc(100vh-260px)] grid-rows-[1fr_auto] gap-4 p-4">
        <div className="grid content-start gap-4 overflow-y-auto pr-1">
          {showSuggestions ? <SuggestionsBlock onPick={send} /> : null}

          {messages.map((message, index) => (
            <ChatBubble key={`${message.role}-${index}`} message={message} />
          ))}

          {pending ? <PendingBubble /> : null}
          <div ref={bottomRef} aria-hidden />
        </div>

        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-2 backdrop-blur-sm"
        >
          <input
            ref={inputRef}
            className="desk-input flex-1"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Pose ta question — ex: « Régime HMM actuel ? »"
            aria-label="Question pour l'assistant"
            disabled={pending}
          />
          {pending ? (
            <button
              type="button"
              onClick={abort}
              className="desk-button border-danger/30 bg-danger/15 text-danger hover:bg-danger/25"
            >
              <Square size={14} fill="currentColor" />
              <span className="max-sm:hidden">Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              className="desk-button btn-primary border-0 shadow-premium"
              disabled={!input.trim()}
            >
              <span className="max-sm:hidden">Envoyer</span>
              <Send size={16} />
            </button>
          )}
        </form>
      </div>
    </section>
  );
}

function ChatHeader({
  meta,
  onClear,
  hasMessages,
}: {
  meta: string;
  onClear: () => void;
  hasMessages: boolean;
}) {
  return (
    <header className="flex w-full min-w-0 items-start justify-between gap-5 max-md:flex-col">
      <div className="w-full min-w-0">
        <p className="mb-2 flex items-center gap-2 font-mono text-xs font-black uppercase text-violet">
          <Sparkles size={12} />
          RAG · ChromaDB · Ollama · sentence-transformers
        </p>
        <h2 className="font-mono text-2xl font-black uppercase leading-tight text-ink max-md:text-xl">
          Assistant <span className="gradient-text-mint">quant</span>
        </h2>
        <p className="mt-3 max-w-full break-words font-mono text-sm text-muted">{meta}</p>
      </div>
      {hasMessages ? (
        <button type="button" onClick={onClear} className="desk-button">
          <Trash2 size={14} />
          Effacer
        </button>
      ) : null}
    </header>
  );
}

function SuggestionsBlock({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="grid gap-4">
      <div className="glass-panel rounded-xl p-5">
        <p className="flex items-center gap-2 font-mono text-xs font-black uppercase text-violet">
          <span className="h-1.5 w-1.5 rounded-full bg-violet" />
          Comment je peux t'aider
        </p>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-zinc-300">
          Je suis branché sur les docs du projet MASI (méthodologie, anti-leakage,
          glossary), les 9 notebooks Jupyter (preprocessing → robustesse), et le
          snapshot live du dashboard (prévision J+1, VaR 5%, ES 5%, régime HMM).
          Je ne donne pas de conseil d'investissement, je n'invente pas de chiffres.
        </p>
      </div>

      <div className="grid gap-3">
        {SUGGESTION_GROUPS.map((group) => (
          <div key={group.label} className="grid gap-2">
            <p className="font-mono text-[11px] font-black uppercase text-muted">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {group.items.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onPick(q)}
                  className="desk-chip transition active:scale-[0.97]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatTurn }) {
  const [copied, setCopied] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const isUser = message.role === "user";
  const rendered = useMemo(() => renderInlineMarkdown(message.content), [message.content]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  }, [message.content]);

  return (
    <article
      className={`max-w-[820px] rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-desk backdrop-blur-sm ${
        isUser
          ? "justify-self-end border-masi/25 bg-masi/10"
          : "justify-self-start border-mint/20 bg-mint/8"
      }`}
    >
      {!isUser && (message.intent || message.backend) ? (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase">
          {message.intent ? (
            <span className="rounded-md border border-violet/30 bg-violet/15 px-2 py-0.5 font-mono text-violet">
              {INTENT_LABEL[message.intent] ?? message.intent}
            </span>
          ) : null}
          {message.backend ? (
            <span
              className={`rounded-md border px-2 py-0.5 font-mono ${
                message.backend === "ollama"
                  ? "border-mint/30 bg-mint/15 text-mint"
                  : message.backend === "fallback"
                    ? "border-warning/30 bg-warning/15 text-warning"
                    : "border-white/10 bg-white/5 text-muted"
              }`}
            >
              {message.backend}
            </span>
          ) : null}
          {message.used_live ? (
            <span className="rounded-md border border-cyan/30 bg-cyan/15 px-2 py-0.5 font-mono text-cyan">
              live
            </span>
          ) : null}
          {message.used_rag ? (
            <span className="rounded-md border border-plasma/30 bg-plasma/15 px-2 py-0.5 font-mono text-plasma">
              rag
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="prose-chat">{rendered}</div>

      {!isUser ? (
        <footer className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[11px] font-bold text-muted transition hover:border-white/20 hover:text-ink"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copié" : "Copier"}
          </button>

          {message.sources?.length ? (
            <button
              type="button"
              onClick={() => setSourcesOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[11px] font-bold text-muted transition hover:border-white/20 hover:text-ink"
              aria-expanded={sourcesOpen}
            >
              <ChevronDown
                size={12}
                className={`transition-transform ${sourcesOpen ? "rotate-180" : ""}`}
              />
              {message.sources.length} source{message.sources.length > 1 ? "s" : ""}
            </button>
          ) : null}
        </footer>
      ) : null}

      {!isUser && sourcesOpen && message.sources?.length ? (
        <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
          {message.sources.map((source, i) => (
            <SourceCard key={`${source.title}-${i}`} source={source} index={i + 1} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function SourceCard({ source, index }: { source: ChatSource; index: number }) {
  const Icon = KIND_ICON[source.kind ?? "markdown"] ?? FileText;
  const fileName = source.source ? source.source.split(/[\\/]/).pop() : "";

  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
      <header className="flex items-center justify-between gap-3 text-xs">
        <div className="flex min-w-0 items-center gap-2 font-bold">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/10 text-[10px] font-black">
            {index}
          </span>
          <Icon size={12} className="shrink-0 text-muted" />
          <span className="truncate text-ink">{source.title}</span>
          {source.section && source.section !== source.title ? (
            <span className="truncate text-muted">· {source.section}</span>
          ) : null}
        </div>
        <span className="shrink-0 font-mono text-muted">{(source.score * 100).toFixed(0)}%</span>
      </header>
      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-300">{source.snippet}</p>
      {fileName ? (
        <p className="mt-2 truncate font-mono text-[10px] text-muted/80" title={source.source}>
          {fileName}
        </p>
      ) : null}
    </div>
  );
}

function PendingBubble() {
  return (
    <div className="flex w-fit items-center gap-2 rounded-xl border border-mint/20 bg-mint/8 px-4 py-3 text-sm text-muted">
      <span className="flex gap-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-mint" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 animate-pulse rounded-full bg-mint" style={{ animationDelay: "180ms" }} />
        <span className="h-2 w-2 animate-pulse rounded-full bg-mint" style={{ animationDelay: "360ms" }} />
      </span>
      Analyse en cours...
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline markdown renderer — bold, italic, code, headers, lists, paragraphs.
// Pas une dépendance npm — suffisant pour les réponses RAG.
// ---------------------------------------------------------------------------

function renderInlineMarkdown(raw: string): ReactNode {
  const blocks = raw.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return blocks.map((block, i) => renderBlock(block.trim(), i));
}

function renderBlock(block: string, key: number): ReactNode {
  if (!block) return null;

  // Fenced code
  if (block.startsWith("```")) {
    const match = block.match(/^```([a-zA-Z0-9_-]*)\n([\s\S]*?)\n?```$/);
    if (match) {
      return (
        <pre
          key={key}
          className="my-2 overflow-x-auto rounded-md border border-white/10 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-zinc-100"
        >
          <code>{match[2]}</code>
        </pre>
      );
    }
  }

  // Header
  const header = block.match(/^(#{1,6})\s+(.+)$/);
  if (header) {
    const level = header[1].length;
    const text = header[2];
    const size =
      level === 1
        ? "text-base"
        : level === 2
          ? "text-sm"
          : "text-xs";
    return (
      <p key={key} className={`mt-2 mb-1 font-mono font-black uppercase text-masi ${size}`}>
        {renderInline(text)}
      </p>
    );
  }

  // Bullet list
  if (block.split("\n").every((line) => /^\s*[-*]\s+/.test(line))) {
    const items = block.split("\n").map((line) => line.replace(/^\s*[-*]\s+/, ""));
    return (
      <ul key={key} className="my-1 grid list-disc gap-1 pl-5 marker:text-masi">
        {items.map((item, j) => (
          <li key={j}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }

  // Numbered list
  if (block.split("\n").every((line) => /^\s*\d+\.\s+/.test(line))) {
    const items = block.split("\n").map((line) => line.replace(/^\s*\d+\.\s+/, ""));
    return (
      <ol key={key} className="my-1 grid list-decimal gap-1 pl-5 marker:text-masi marker:font-bold">
        {items.map((item, j) => (
          <li key={j}>{renderInline(item)}</li>
        ))}
      </ol>
    );
  }

  return (
    <p key={key} className="my-1 whitespace-pre-wrap text-zinc-100">
      {renderInline(block)}
    </p>
  );
}

function renderInline(text: string): ReactNode {
  // Tokenize : **bold**, *italic*, `code`
  const tokens: Array<{ kind: "bold" | "italic" | "code" | "text"; value: string }> = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) tokens.push({ kind: "text", value: text.slice(last, start) });
    const tok = m[0];
    if (tok.startsWith("**") && tok.endsWith("**")) {
      tokens.push({ kind: "bold", value: tok.slice(2, -2) });
    } else if (tok.startsWith("`") && tok.endsWith("`")) {
      tokens.push({ kind: "code", value: tok.slice(1, -1) });
    } else if (tok.startsWith("*") && tok.endsWith("*")) {
      tokens.push({ kind: "italic", value: tok.slice(1, -1) });
    } else {
      tokens.push({ kind: "text", value: tok });
    }
    last = start + tok.length;
  }
  if (last < text.length) tokens.push({ kind: "text", value: text.slice(last) });

  return tokens.map((t, i) => {
    if (t.kind === "bold") return <strong key={i} className="font-black text-ink">{t.value}</strong>;
    if (t.kind === "italic") return <em key={i} className="italic text-zinc-200">{t.value}</em>;
    if (t.kind === "code") {
      return (
        <code
          key={i}
          className="rounded bg-black/45 px-1.5 py-0.5 font-mono text-[12px] text-mint"
        >
          {t.value}
        </code>
      );
    }
    return <span key={i}>{t.value}</span>;
  });
}
