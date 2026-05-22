/**
 * POST /api/macro/ai/analyze-tab
 *
 * Análisis transversal de un subtab macro: diagnóstico, fortalezas,
 * vulnerabilidades, implicaciones de política, watchlist.
 *
 * Recibe N indicadores resumidos (NO sus series completas, sólo el
 * último valor + umbral + status). Esto mantiene el payload <8KB.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  AiUnavailableError,
  withCascade,
  isGroqCascadeAvailable,
  AI_CONFIG,
} from "@/lib/ai";
import {
  MACRO_AI_DISCLAIMER,
  MACRO_TAB_INSIGHT_SCHEMA,
  hashKey,
  type MacroTabInsight,
  type TabAnalysisError,
  type TabAnalysisInput,
  type TabAnalysisResponse,
} from "@/lib/macro/ai-tab-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const CACHE_TTL_MS = 60 * 60 * 1000;
interface CacheEntry { expiresAt: number; payload: TabAnalysisResponse }
const CACHE = new Map<string, CacheEntry>();

function cacheGet(key: string): TabAnalysisResponse | null {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) { CACHE.delete(key); return null; }
  return { ...hit.payload, cache_hit: true };
}
function cacheSet(key: string, payload: TabAnalysisResponse): void {
  if (CACHE.size > 60) {
    const keys = Array.from(CACHE.keys()).slice(0, 30);
    for (const k of keys) CACHE.delete(k);
  }
  CACHE.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload: { ...payload, cache_hit: false } });
}

function validate(body: unknown): TabAnalysisInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "body_required" };
  const b = body as any;
  if (typeof b.tabSlug !== "string") return { error: "tabSlug_required" };
  if (typeof b.tabLabel !== "string") return { error: "tabLabel_required" };
  if (typeof b.termometroScore !== "number") return { error: "termometro_required" };
  if (!Array.isArray(b.signals) || b.signals.length < 3) return { error: "insufficient_signals" };
  return {
    tabSlug: b.tabSlug,
    tabLabel: b.tabLabel,
    termometroScore: Math.max(0, Math.min(100, Number(b.termometroScore))),
    signals: b.signals.slice(0, 30),
    tier: b.tier === "fast" ? "fast" : "premium",
  };
}

const SYSTEM_PROMPT = `Eres un analista macroeconómico senior español. Produces un diagnóstico ejecutivo del estado macro de España a partir de N indicadores que recibirás.

REGLAS:
1. Cita sólo valores presentes en \`signals\`. Cero invención de datos.
2. Distingue siempre HECHO OBSERVADO, INFERENCIA y RIESGO POTENCIAL.
3. Prohibido: recomendaciones de inversión, juicios partidistas, correlación = causalidad.
4. Idioma español de España, registro analítico institucional, frases cortas.
5. No expongas razonamiento interno. Sólo el JSON final.
6. Si la mayoría de señales son missing/stale, baja confidenceScore y dilo en headline.
7. \`strengths\` = áreas en verde (vs umbral). \`vulnerabilities\` = áreas en rojo o ámbar con severidad estimada.
8. \`policyImplications\` = implicaciones para política fiscal / monetaria / industrial. NUNCA recomienda invertir.
9. \`watchNext\` = indicadores adicionales que un analista vigilaría a continuación dado este cuadro.
10. La respuesta DEBE ser JSON válido contra el schema.`;

function buildUserPrompt(input: TabAnalysisInput): string {
  const signals = input.signals
    .map((s) => {
      const thr = s.threshold
        ? `umbral_ambar=${s.threshold.amber ?? "-"}, umbral_rojo=${s.threshold.red ?? "-"}, mejor_si_mayor=${Boolean(s.threshold.goodAbove)}`
        : "(sin umbral)";
      return `- [${s.family}] ${s.label} (${s.sourceCode}) = ${s.lastValue ?? "?"}${s.unit} en ${s.lastPeriod ?? "?"} · estado ${s.status} · ${thr}`;
    })
    .join("\n");

  return `SUBTAB: ${input.tabLabel} (${input.tabSlug})
TERMÓMETRO COMPUESTO: ${input.termometroScore}/100 (0=todo rojo, 100=todo verde)

SEÑALES (${input.signals.length}):
${signals}

TAREA: produce el JSON MacroTabInsight con diagnóstico transversal. Sólo JSON.`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json<TabAnalysisError>({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const v = validate(body);
  if ("error" in v) return NextResponse.json<TabAnalysisError>({ ok: false, error: v.error }, { status: 400 });
  const input = v;

  // Cache key: tabSlug + termometro + signal hash
  const sigDigest = input.signals
    .map((s) => `${s.id}:${s.lastValue ?? ""}:${s.lastPeriod ?? ""}`)
    .join("|");
  const cacheKey = `macro:tab:${input.tabSlug}:${hashKey([input.termometroScore, sigDigest, input.tier ?? ""])}`;
  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json<TabAnalysisResponse>(cached, { headers: { "Cache-Control": "private, max-age=3600" } });

  if (!AI_CONFIG.groqApiKey && !AI_CONFIG.anthropicApiKey) {
    return NextResponse.json<TabAnalysisError>({ ok: false, error: "ai_unavailable" }, { status: 503 });
  }

  try {
    const { result, provider, modelHint } = await withCascade(async (client) => {
      const insight = await client.generateJSON<MacroTabInsight>({
        tier: input.tier ?? "premium",
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(input) }],
        temperature: 0.25,
        maxTokens: 2400,
        jsonSchema: MACRO_TAB_INSIGHT_SCHEMA,
        schemaName: "MacroTabInsight",
      });
      return {
        insight,
        modelName: client.modelName({ tier: input.tier ?? "premium", messages: [] }),
      };
    });

    const payload: TabAnalysisResponse = {
      ok: true,
      cache_hit: false,
      generated_at: new Date().toISOString(),
      generated_by_llm: true,
      provider,
      model: result.modelName || modelHint,
      tabSlug: input.tabSlug,
      termometroScore: input.termometroScore,
      insight: result.insight,
      disclaimer: MACRO_AI_DISCLAIMER,
    };
    cacheSet(cacheKey, payload);
    return NextResponse.json<TabAnalysisResponse>(payload, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[macro/ai/analyze-tab] failed:", msg);
    return NextResponse.json<TabAnalysisError>({
      ok: false,
      error: err instanceof AiUnavailableError ? "ai_provider_failed" : "internal",
      detail: msg.slice(0, 400),
    }, { status: 502 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/macro/ai/analyze-tab",
    cascade_available: isGroqCascadeAvailable(),
    primary_provider: AI_CONFIG.provider,
  });
}
