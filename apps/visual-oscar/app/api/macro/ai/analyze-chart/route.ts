/**
 * POST /api/macro/ai/analyze-chart
 *
 * Analiza una serie macroeconómica con Groq GPT-OSS (cascade Anthropic).
 * Sólo servidor: GROQ_API_KEY nunca llega al cliente.
 *
 * Contrato:
 *   request  → ChartAnalysisInput   (lib/macro/ai-schema)
 *   response → ChartAnalysisResponse | ChartAnalysisError
 *
 * Reglas:
 *  - Cache 1h en memoria por `computeChartCacheKey(input)`.
 *  - Si `series.length < 4` → error `insufficient_data` (no llama al LLM).
 *  - Structured Outputs strict en Groq; Anthropic devuelve JSON normal.
 *  - Disclaimer obligatorio (CLAUDE.md A2).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withCascade,
  AiUnavailableError,
  isGroqCascadeAvailable,
  AI_CONFIG,
} from "@/lib/ai";
import {
  MACRO_AI_DISCLAIMER,
  MACRO_CHART_INSIGHT_SCHEMA,
  computeChartCacheKey,
  type ChartAnalysisError,
  type ChartAnalysisInput,
  type ChartAnalysisResponse,
  type MacroChartInsight,
} from "@/lib/macro/ai-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Cache en memoria 1h ────────────────────────────────────────────────

interface CacheEntry {
  expiresAt: number;
  payload: ChartAnalysisResponse;
}
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE = new Map<string, CacheEntry>();

function cacheGet(key: string): ChartAnalysisResponse | null {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return { ...hit.payload, cache_hit: true };
}

function cacheSet(key: string, payload: ChartAnalysisResponse): void {
  // LRU básico: si superamos 200 entradas borra la mitad por orden de inserción
  if (CACHE.size > 200) {
    const keys = Array.from(CACHE.keys()).slice(0, 100);
    for (const k of keys) CACHE.delete(k);
  }
  CACHE.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    payload: { ...payload, cache_hit: false },
  });
}

// ─── Validación ligera ──────────────────────────────────────────────────

function validateInput(body: unknown): ChartAnalysisInput | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "body_required" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.indicator !== "string" || !b.indicator.trim()) {
    return { error: "indicator_required" };
  }
  if (typeof b.indicatorId !== "string" || !b.indicatorId.trim()) {
    return { error: "indicatorId_required" };
  }
  if (!Array.isArray(b.series) || b.series.length < 4) {
    return { error: "insufficient_data" };
  }
  // Sanea puntos: cada uno debe tener period (string) y value (number finito)
  const series = b.series
    .filter(
      (p: unknown) =>
        p &&
        typeof (p as { period?: unknown }).period === "string" &&
        Number.isFinite((p as { value?: unknown }).value as number)
    )
    .map((p) => ({
      period: String((p as { period: string }).period),
      value: Number((p as { value: number }).value),
      forecast: Boolean((p as { forecast?: boolean }).forecast),
    }));
  if (series.length < 4) {
    return { error: "insufficient_data" };
  }
  const md = (b.metadata ?? {}) as Record<string, unknown>;
  return {
    indicator: b.indicator,
    indicatorId: b.indicatorId,
    tabSlug: typeof b.tabSlug === "string" ? b.tabSlug : undefined,
    series,
    metadata: {
      unit: typeof md.unit === "string" ? md.unit : "",
      source: typeof md.source === "string" ? md.source : "",
      sourceCode: typeof md.sourceCode === "string" ? md.sourceCode : "",
      lastUpdate: typeof md.lastUpdate === "string" ? md.lastUpdate : undefined,
      frequency: md.frequency as ChartAnalysisInput["metadata"]["frequency"],
      threshold:
        md.threshold && typeof md.threshold === "object"
          ? (md.threshold as ChartAnalysisInput["metadata"]["threshold"])
          : undefined,
      benchmarkPeers: Array.isArray(md.benchmarkPeers)
        ? (md.benchmarkPeers as ChartAnalysisInput["metadata"]["benchmarkPeers"])
        : undefined,
      notes: Array.isArray(md.notes)
        ? (md.notes as string[]).filter((n) => typeof n === "string")
        : undefined,
    },
    windowLabel:
      typeof b.windowLabel === "string" ? b.windowLabel : undefined,
    tier: b.tier === "fast" ? "fast" : "premium",
  };
}

// ─── Prompts ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un analista macroeconómico senior español que produce briefings rigurosos para un dashboard de inteligencia política y económica.

REGLAS ABSOLUTAS:
1. Sólo puedes citar números que aparezcan literalmente en el payload (series, metadata, peers). Nunca inventes valores ni cites fuentes externas.
2. Distingue siempre entre:
   - HECHO OBSERVADO (lo que muestran los datos)
   - INFERENCIA (lectura analítica del patrón)
   - RIESGO POTENCIAL (escenario futuro condicionado)
3. Prohibido:
   - Recomendaciones de inversión, compra/venta, o asignación de activos.
   - Presentar correlaciones como causalidad. Usa "asociado a", "coincide con", no "causa".
   - Juicios partidistas o calificativos políticos.
   - Cifras inventadas o redondeos que distorsionen la magnitud.
4. Idioma: español de España, registro analítico, frases cortas.
5. No expongas razonamiento interno ni cadena de pensamiento; entrega sólo el JSON final.
6. Si la serie es corta, vieja o ambigua, baja \`confidenceScore\` y dilo en \`sourceNotes\`.
7. Las consecuencias y riesgos deben ser concretos (qué pasa, a quién afecta, qué horizonte).
8. \`watchlist\` propone indicadores adicionales que un analista vigilaría a continuación, con su razón.
9. \`contradictions\` recoge señales del payload que apuntan en direcciones opuestas; si no las hay, deja el array vacío.
10. La respuesta DEBE ser JSON válido contra el schema proporcionado por el sistema. Nada más.`;

function buildUserPrompt(input: ChartAnalysisInput): string {
  const tail = input.series.slice(-24);
  const head = input.series.slice(0, Math.min(input.series.length, 6));
  const peers = input.metadata.benchmarkPeers
    ? input.metadata.benchmarkPeers
        .map((p) => `  - ${p.country}: ${p.value}`)
        .join("\n")
    : "(no peers en payload)";
  const threshold = input.metadata.threshold
    ? `umbral_ambar=${input.metadata.threshold.amber ?? "-"}, umbral_rojo=${
        input.metadata.threshold.red ?? "-"
      }, mejor_si_mayor=${Boolean(input.metadata.threshold.goodAbove)}`
    : "(sin umbral)";

  const fmtPoint = (p: { period: string; value: number; forecast?: boolean }) =>
    `  - ${p.period}: ${p.value}${p.forecast ? " (forecast)" : ""}`;

  const headBlock = head.map(fmtPoint).join("\n");
  const tailBlock = tail.map(fmtPoint).join("\n");

  return `INDICADOR: ${input.indicator}
ID: ${input.indicatorId}
PESTAÑA: ${input.tabSlug ?? "n/a"}
UNIDAD: ${input.metadata.unit || "n/a"}
FUENTE: ${input.metadata.source} (código ${input.metadata.sourceCode})
ÚLTIMA ACTUALIZACIÓN: ${input.metadata.lastUpdate ?? "n/a"}
FRECUENCIA: ${input.metadata.frequency ?? "n/a"}
VENTANA: ${input.windowLabel ?? `${input.series.length} puntos`}
THRESHOLD: ${threshold}

SERIE (primeros puntos):
${headBlock || "(vacío)"}

SERIE (últimos 24 puntos / forecast si aplica):
${tailBlock}

PEERS (último valor disponible):
${peers}

NOTAS METADATA:
${(input.metadata.notes ?? []).map((n) => `  - ${n}`).join("\n") || "(ninguna)"}

TAREA: produce el JSON \`MacroChartInsight\` siguiendo las reglas. Sólo JSON.`;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function computeConfidence(input: ChartAnalysisInput): number {
  // Heurística simple: base por n_puntos + penalización por antigüedad.
  const n = input.series.length;
  let conf = Math.min(0.4 + n / 60, 0.9);
  if (input.metadata.lastUpdate) {
    // Si lastUpdate parece un año <= cy-2, penaliza
    const yMatch = input.metadata.lastUpdate.match(/(\d{4})/);
    if (yMatch) {
      const y = Number(yMatch[1]);
      const cy = new Date().getFullYear();
      if (y < cy - 2) conf -= 0.15;
    }
  }
  return Math.max(0.2, Math.min(0.95, conf));
}

function sanitizeInsight(
  raw: unknown,
  fallbackConfidence: number
): MacroChartInsight | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const required = [
    "headline",
    "executiveSummary",
    "trend",
    "why",
    "consequences",
    "risks",
    "watchlist",
    "contradictions",
    "analystQuestions",
    "sourceNotes",
  ];
  for (const k of required) {
    if (!(k in r)) return null;
  }
  if (typeof r.confidenceScore !== "number") {
    r.confidenceScore = fallbackConfidence;
  }
  return r as unknown as MacroChartInsight;
}

// ─── Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ChartAnalysisError>(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const v = validateInput(body);
  if ("error" in v) {
    return NextResponse.json<ChartAnalysisError>(
      { ok: false, error: v.error },
      { status: 400 }
    );
  }
  const input = v;

  // Cache lookup
  const cacheKey = computeChartCacheKey(input);
  const cached = cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json<ChartAnalysisResponse>(cached, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  }

  if (!AI_CONFIG.groqApiKey && !AI_CONFIG.anthropicApiKey) {
    return NextResponse.json<ChartAnalysisError>(
      {
        ok: false,
        error: "ai_unavailable",
        detail: "No AI provider configured (GROQ_API_KEY / ANTHROPIC_API_KEY)",
      },
      { status: 503 }
    );
  }

  const userPrompt = buildUserPrompt(input);
  const fallbackConfidence = computeConfidence(input);

  try {
    const { result, provider, modelHint } = await withCascade(async (client) => {
      const insightRaw = await client.generateJSON<MacroChartInsight>({
        tier: input.tier ?? "premium",
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.25,
        maxTokens: 2200,
        jsonSchema: MACRO_CHART_INSIGHT_SCHEMA,
        schemaName: "MacroChartInsight",
        schemaHint:
          "Devuelve un objeto con headline, executiveSummary, trend, why[], consequences[], risks[], watchlist[], contradictions[], analystQuestions[], sourceNotes[], confidenceScore.",
      });
      const insight = sanitizeInsight(insightRaw, fallbackConfidence);
      if (!insight) {
        throw new AiUnavailableError("Insight payload missing required fields");
      }
      return { insight, modelName: client.modelName({ tier: input.tier ?? "premium", messages: [] }) };
    });

    const payload: ChartAnalysisResponse = {
      ok: true,
      cache_hit: false,
      generated_at: new Date().toISOString(),
      generated_by_llm: true,
      provider,
      model: result.modelName || modelHint,
      indicator: input.indicator,
      indicatorId: input.indicatorId,
      insight: result.insight,
      disclaimer: MACRO_AI_DISCLAIMER,
    };

    cacheSet(cacheKey, payload);

    return NextResponse.json<ChartAnalysisResponse>(payload, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[macro/ai/analyze-chart] failed:", msg);
    return NextResponse.json<ChartAnalysisError>(
      {
        ok: false,
        error:
          err instanceof AiUnavailableError ? "ai_provider_failed" : "internal",
        detail: msg.slice(0, 400),
      },
      { status: 502 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/macro/ai/analyze-chart",
    cascade_available: isGroqCascadeAvailable(),
    primary_provider: AI_CONFIG.provider,
  });
}
