/**
 * POST /api/macro/ai/analyze-detail
 *
 * Análisis enriquecido de un indicador individual para la página
 * `/macro/pulso/indicator/[id]`. Más profundo que `analyze-chart`:
 * incluye fase del ciclo, drivers con confianza, contexto internacional
 * (peers UE), lectura del forecast, señales político-económicas y
 * watchlist.
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
  MACRO_DETAIL_INSIGHT_SCHEMA,
  hashKey,
  type DetailAnalysisInput,
  type DetailAnalysisResponse,
  type MacroDetailInsight,
} from "@/lib/macro/ai-tab-schema";

interface DetailAnalysisError {
  ok: false;
  error: string;
  detail?: string;
}

export const runtime = "nodejs";
export const maxDuration = 60;

const CACHE_TTL_MS = 60 * 60 * 1000;
interface CacheEntry { expiresAt: number; payload: DetailAnalysisResponse }
const CACHE = new Map<string, CacheEntry>();

function cacheGet(key: string): DetailAnalysisResponse | null {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) { CACHE.delete(key); return null; }
  return { ...hit.payload, cache_hit: true };
}
function cacheSet(key: string, payload: DetailAnalysisResponse): void {
  if (CACHE.size > 100) {
    const keys = Array.from(CACHE.keys()).slice(0, 50);
    for (const k of keys) CACHE.delete(k);
  }
  CACHE.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload: { ...payload, cache_hit: false } });
}

function validate(body: unknown): DetailAnalysisInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "body_required" };
  const b = body as any;
  if (typeof b.indicatorId !== "string") return { error: "indicatorId_required" };
  if (typeof b.indicatorLabel !== "string") return { error: "indicatorLabel_required" };
  if (!Array.isArray(b.series) || b.series.length < 4) return { error: "insufficient_data" };
  const series = b.series
    .filter((p: any) => p && typeof p.period === "string" && Number.isFinite(p.value))
    .map((p: any) => ({
      period: String(p.period),
      value: Number(p.value),
      forecast: Boolean(p.forecast),
    }));
  if (series.length < 4) return { error: "insufficient_data" };
  return {
    indicatorId: b.indicatorId,
    indicatorLabel: b.indicatorLabel,
    tabSlug: typeof b.tabSlug === "string" ? b.tabSlug : "pulso-macro",
    unit: typeof b.unit === "string" ? b.unit : "",
    source: typeof b.source === "string" ? b.source : "",
    sourceCode: typeof b.sourceCode === "string" ? b.sourceCode : "",
    series,
    peers: Array.isArray(b.peers) ? b.peers.slice(0, 8) : undefined,
    threshold: b.threshold && typeof b.threshold === "object" ? b.threshold : undefined,
    notes: Array.isArray(b.notes) ? b.notes.filter((n: any) => typeof n === "string") : undefined,
    windowLabel: typeof b.windowLabel === "string" ? b.windowLabel : undefined,
    tier: b.tier === "fast" ? "fast" : "premium",
  };
}

const SYSTEM_PROMPT = `Eres el analista jefe macro de Politeia Analítica. Produces análisis profundos de UN indicador para un dashboard institucional. Estás en la página de detalle: tu lectura debe ser más larga, más analítica y menos defensiva que la del Hero ejecutivo del subtab.

MARCO ANALÍTICO (úsalo sin nombrarlo):
- Identifica la FASE DEL CICLO con criterio. Sólo "unclear" si la serie es genuinamente ambigua o demasiado corta. Si hay forecast, la fase debe reflejar a dónde apunta el WEO.
- Para series largas (>15y): busca patrones seculares + ciclos + shocks. España tiene anclas reconocibles: 2008-2014 doble recesión, 2020 COVID, 2022 shock energético, 2023-24 desinflación + restricción monetaria BCE.
- Identifica DRIVERS estructurales (demografía, productividad, regulación) vs cíclicos (tipos, comercio mundial, energía).
- INTERNACIONAL: compara con peers (Alemania = anclaje núcleo eurozona, Francia = comparable continental, Italia = vulnerabilidad fiscal, Portugal = peer ibérico).
- POLÍTICO-ECONÓMICO: lectura institucional, NUNCA partidista. Implicaciones para BCE, AIReF, Comisión Europea, Bruselas, marco fiscal UE.

REGLAS ABSOLUTAS:
1. Cita sólo valores literales presentes en \`series\`, \`peers\` o \`notes\`. No inventes.
2. Distingue siempre HECHO OBSERVADO / INFERENCIA / RIESGO POTENCIAL en el lenguaje.
3. PROHIBIDO:
   - Recomendaciones de inversión, asignación, comprar/vender.
   - Predicciones numéricas concretas más allá del forecast del payload.
   - Atribuir responsabilidad política a partidos o gobiernos.
   - Correlación = causalidad.
   - Fuentes externas no presentes en el payload.
4. \`headline\`: 1 frase 16-26 palabras que capture la lectura principal del indicador.
5. \`longExplanation\`: 5-9 frases. Lectura profunda. Cita 4-6 cifras del payload. Debe distinguir entre dinámica reciente (últimos 4-8 puntos) y patrón secular (toda la serie). Si hay forecast, comenta dirección.
6. \`cyclePhase\`: enum. Justifica brevemente en longExplanation.
7. \`inflectionPoints\` (0-4): períodos REALES de la serie donde hubo cambio de régimen. Descripción concreta.
8. \`drivers\` (2-5): drivers identificables con \`evidence\` que cite dato del payload y \`confidence\` honesto (0.4-0.9).
9. \`internationalContext\` (2-4 frases): usa \`peers\` si disponibles. Compara España con núcleo + sur + atípicos.
10. \`forecastReading\` (2-3 frases): SÓLO si hay puntos con forecast=true. Si no, di explícitamente "El payload no incluye proyección".
11. \`politicalEconomySignals\` (0-4): lecturas de economía política institucional. Por ejemplo: "presión sobre marco fiscal UE", "espacio para política monetaria menos restrictiva", "tensión salario-productividad limita transmisión BCE".
12. \`watchlist\` (2-5): indicadores adicionales que se vigilarían a continuación, con ID estable.
13. \`confidenceScore\` (0-1) honesto.
14. Idioma: español de España, registro analítico institucional, frases concretas.
15. NO razonamiento expuesto. SÓLO el JSON final.`;

function buildUserPrompt(input: DetailAnalysisInput): string {
  const head = input.series.slice(0, 4).map((p) => `  ${p.period}: ${p.value}${p.forecast ? " (forecast)" : ""}`).join("\n");
  const tail = input.series.slice(-30).map((p) => `  ${p.period}: ${p.value}${p.forecast ? " (forecast)" : ""}`).join("\n");
  const peers = input.peers
    ? input.peers.map((p) => `  - ${p.country}: ${p.lastValue ?? "?"} (${p.lastPeriod ?? "?"})`).join("\n")
    : "(sin peers)";
  const threshold = input.threshold
    ? `umbral_ambar=${input.threshold.amber ?? "-"}, umbral_rojo=${input.threshold.red ?? "-"}, mejor_si_mayor=${Boolean(input.threshold.goodAbove)}`
    : "(sin umbral)";

  return `INDICADOR: ${input.indicatorLabel}
ID: ${input.indicatorId}
PESTAÑA: ${input.tabSlug}
UNIDAD: ${input.unit}
FUENTE: ${input.source} (${input.sourceCode})
VENTANA: ${input.windowLabel ?? `${input.series.length} puntos`}
THRESHOLD: ${threshold}

SERIE inicio:
${head}

SERIE últimos 30 (con forecast si aplica):
${tail}

PEERS UE (último valor):
${peers}

NOTAS:
${(input.notes ?? []).map((n) => `  - ${n}`).join("\n") || "(ninguna)"}

TAREA: produce el JSON MacroDetailInsight. Sólo JSON.`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json<DetailAnalysisError>({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const v = validate(body);
  if ("error" in v) return NextResponse.json<DetailAnalysisError>({ ok: false, error: v.error }, { status: 400 });
  const input = v;

  const last = input.series[input.series.length - 1];
  const cacheKey = `macro:detail:${input.indicatorId}:${hashKey([
    input.tier ?? "",
    input.series.length,
    last?.period ?? "",
    last?.value ?? "",
    input.peers?.map((p) => `${p.country}:${p.lastValue ?? ""}`).join("|") ?? "",
  ])}`;
  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json<DetailAnalysisResponse>(cached, { headers: { "Cache-Control": "private, max-age=3600" } });

  if (!AI_CONFIG.groqApiKey && !AI_CONFIG.anthropicApiKey) {
    return NextResponse.json<DetailAnalysisError>({ ok: false, error: "ai_unavailable" }, { status: 503 });
  }

  try {
    const { result, provider, modelHint } = await withCascade(async (client) => {
      const insight = await client.generateJSON<MacroDetailInsight>({
        tier: input.tier ?? "premium",
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(input) }],
        temperature: 0.25,
        maxTokens: 2800,
        jsonSchema: MACRO_DETAIL_INSIGHT_SCHEMA,
        schemaName: "MacroDetailInsight",
      });
      return {
        insight,
        modelName: client.modelName({ tier: input.tier ?? "premium", messages: [] }),
      };
    });

    const payload: DetailAnalysisResponse = {
      ok: true,
      cache_hit: false,
      generated_at: new Date().toISOString(),
      generated_by_llm: true,
      provider,
      model: result.modelName || modelHint,
      indicatorId: input.indicatorId,
      insight: result.insight,
      disclaimer: MACRO_AI_DISCLAIMER,
    };
    cacheSet(cacheKey, payload);
    return NextResponse.json<DetailAnalysisResponse>(payload, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[macro/ai/analyze-detail] failed:", msg);
    return NextResponse.json<DetailAnalysisError>({
      ok: false,
      error: err instanceof AiUnavailableError ? "ai_provider_failed" : "internal",
      detail: msg.slice(0, 400),
    }, { status: 502 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/macro/ai/analyze-detail",
    cascade_available: isGroqCascadeAvailable(),
    primary_provider: AI_CONFIG.provider,
  });
}
