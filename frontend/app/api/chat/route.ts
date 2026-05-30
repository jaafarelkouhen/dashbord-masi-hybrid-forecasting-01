/**
 * Route handler dédié /api/chat — forward direct vers le backend FastAPI
 * SANS le timeout court du proxy `rewrites()` par défaut de Next.js dev.
 *
 * Le proxy intégré ferme le socket si Ollama prend >5s à répondre
 * (ECONNRESET / "socket hang up"). Ce handler Node tourne sans deadline,
 * donc on attend toute la durée de la génération LLM.
 *
 * Les autres routes (/api/health, /api/forecast/*, etc.) continuent à
 * passer par les `rewrites()` rapides, c'est juste le chat qui a besoin
 * d'un long-poll Node.
 */

import { NextRequest } from "next/server";

export const runtime = "nodejs";
// Pas de cache, pas de timeout côté Next
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min cap (Vercel hint, ignoré en dev)

const BACKEND = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8001";

export async function POST(req: NextRequest) {
  const body = await req.text();
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
      // pas de signal/timeout — on attend que le LLM finisse
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { detail: `Backend FastAPI injoignable (${BACKEND}) — ${message}` },
      { status: 502 }
    );
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
