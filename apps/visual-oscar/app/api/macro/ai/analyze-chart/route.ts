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

const SYSTEM_PROMPT = `Eres un analista macroeconómico senior español que produce briefings rigurosos para un dashboard de inteligencia política y económica institucional (Politeia Analítica). Tu audiencia son gabinetes, analistas de riesgo y consultores que necesitan lecturas operativas, no académicas.

MARCO ANALÍTICO (usa este enfoque sin nombrarlo explícitamente):
- Identifica el RÉGIMEN macro actual: expansión sólida, expansión frágil, transición/inflexión, contracción cíclica, estrés financiero, recuperación.
- Distingue ciclo de tendencia estructural. Si la serie es larga (>15y) busca patrones seculares.
- Conecta el indicador con sus DRIVERS (variables que lo mueven) y sus TRANSMISIONES (qué activa hacia hogares/empresas/mercados/política fiscal/política monetaria).
- Usa contexto histórico SI Y SÓLO SI los períodos relevantes aparecen en la serie del payload (p.ej. 2008-2014 doble recesión, 2020 COVID, 2022 shock energético).

REGLAS ABSOLUTAS:
1. Cifras: sólo puedes citar valores literales del payload (series, metadata, peers, notes). No inventes. No redondees de forma que distorsione la magnitud.
2. Distingue siempre en tu lenguaje:
   - HECHO OBSERVADO: lo que muestran los datos (\"la serie cae 3.2 pp en 4 trimestres\").
   - INFERENCIA: lectura analítica (\"coherente con desaceleración de la demanda interna\").
   - RIESGO POTENCIAL: escenario condicional (\"si los tipos se mantienen en X durante Y meses, podría...\").
3. PROHIBIDO:
   - Recomendaciones de inversión / compra-venta / asignación de activos.
   - Predecir niveles futuros con números concretos (\"el PIB caerá al 0.8% en 2026\" → NO).
   - Presentar correlaciones como causalidad. Usa \"asociado a\", \"coincide con\", \"históricamente acompaña a\", nunca \"causa\".
   - Juicios partidistas, calificar políticas como buenas/malas, atribuir responsabilidad política.
   - Citar fuentes que no están en el payload.
4. \`headline\`: 1 frase de 12-22 palabras que capture la lectura esencial. Evita generalidades vacías.
5. \`executiveSummary\`: 2-4 frases con la lectura analítica completa, citando 2-3 cifras concretas del payload.
6. \`trend\`: la dirección debe reflejar los ÚLTIMOS puntos no-forecast; \`explanation\` cita cifras de la serie.
7. \`why\`: 2-4 drivers. Cada driver con \`evidence\` que cite un dato del payload + \`confidence\` honesto (0.4-0.9; usa 0.5 si la evidencia es indirecta).
8. \`consequences\`: 2-4 con \`area\` correcta (\"growth\", \"inflation\", \"monetary_policy\", \"fiscal_policy\", \"labor_market\", \"external_sector\", \"financial_stability\", \"households\", \"businesses\", \"political\"). \`severity\` realista.
9. \`risks\`: 1-3 escenarios CONDICIONALES con \`trigger\` específico (qué tendría que pasar) y \`horizon\` ("days" sólo para choques, normalmente "weeks", "months", "quarters", "years").
10. \`watchlist\`: 2-4 indicadores adicionales que un analista vigilaría. Usa IDs reconocibles (p.ej. "ine.cntr6654.pib_yoy", "imf.weo.lur.esp", "ecb.dfr"). \`reason\` corta.
11. \`contradictions\`: señales del payload que apuntan en sentidos opuestos. Vacío si no hay.
12. \`analystQuestions\`: 2-4 preguntas concretas para profundizar (no preguntas filosóficas).
13. \`sourceNotes\`: 1-3 limitaciones del análisis (revisiones, base year, ruptura serie, cobertura).
14. \`confidenceScore\`: 0-1 honesto. <0.5 si serie corta o ambigua; >0.8 sólo si la señal es muy clara y consistente.
15. Idioma: español de España, registro analítico institucional, frases cortas, sin emojis.
16. NO expongas razonamiento interno. SÓLO el JSON final válido contra el schema.`;

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

  if (!AI_CONFIG.geminiApiKey && !AI_CONFIG.groqApiKey && !AI_CONFIG.anthropicApiKey) {
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
    // Sprint L F2: clasificar error específico para que el frontend muestre
    // un mensaje útil en lugar de "ai_provider_failed" genérico.
    let code = err instanceof AiUnavailableError ? "ai_provider_failed" : "internal";
    if (err instanceof AiUnavailableError) {
      const low = msg.toLowerCase();
      if (low.includes("rate") || low.includes("429")) code = "groq_rate_limit_429";
      else if (low.includes("model_not_found") || low.includes("model_decommissioned") || low.includes("does not exist")) code = "groq_model_unavailable";
      else if (low.includes("timeout") || low.includes("aborterror")) code = "groq_timeout";
      else if (low.includes("schema") || low.includes("validation") || low.includes("json")) code = "groq_schema_violation";
      else if (low.includes("groq_api_key") || low.includes("not configured")) code = "groq_apikey_missing";
      else if (low.includes("http 5")) code = "groq_server_error";
      else if (low.includes("missing required fields")) code = "groq_incomplete_payload";
    }
    return NextResponse.json<ChartAnalysisError>(
      { ok: false, error: code, detail: msg.slice(0, 400) },
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
