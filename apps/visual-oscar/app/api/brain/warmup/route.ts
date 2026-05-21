/**
 * GET /api/brain/warmup
 *
 * Pre-calienta el cache del context builder (5min TTL) llamando a los
 * endpoints internos en paralelo. El BrainBriefing del dashboard llama
 * a este endpoint al montarse, así la primera pregunta del usuario tiene
 * el contexto ya listo en memoria (latencia -1 a -2s).
 *
 * Devuelve { ok: true, ctx_bytes, ms } — visible en Vercel logs.
 */

import { NextResponse } from "next/server";
import { buildLiveContext } from "@/lib/ai/context-builder";

export const runtime = "nodejs";
export const maxDuration = 15;
export const dynamic = "force-dynamic";

export async function GET() {
  const t0 = Date.now();
  try {
    const ctx = await buildLiveContext();
    return NextResponse.json({
      ok: true,
      ctx_bytes: ctx.length,
      ms: Date.now() - t0,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message, ms: Date.now() - t0 },
      { status: 500 }
    );
  }
}
