/**
 * POST /api/macro/ai/analyze-sector
 *
 * Análisis Groq de un sector económico estratégico español. Schema
 * SectorInsight: estado del ciclo · drivers · oportunidades ·
 * riesgos · señales político-regulatorias.
 */
import { NextRequest, NextResponse } from "next/server";
import { AiUnavailableError, withCascade, AI_CONFIG } from "@/lib/ai";
import { hashKey, MACRO_AI_DISCLAIMER } from "@/lib/macro/ai-tab-schema";
import type { SpanishSector } from "@/lib/macro/sector-catalog";

export const runtime = "nodejs";
export const maxDuration = 60;

interface CompanySnap {
  id: string;
  shortName: string;
  ticker: string;
  price: number | null;
  changePct: number | null;
}

interface SectorInsight {
  headline: string;
  cyclePhase: "expansion" | "peak" | "deceleration" | "contraction" | "trough" | "recovery" | "unclear";
  state: string;
  drivers: Array<{ driver: string; impact: "low" | "medium" | "high"; explanation: string }>;
  opportunities: string[];
  risks: Array<{ risk: string; trigger: string; severity: "low" | "medium" | "high" }>;
  topPlayersReading: string;
  politicalRegulatorySignals: string[];
  watchNext: string[];
  confidenceScore: number;
}

interface SectorAnalysisResponse {
  ok: true;
  cache_hit: boolean;
  generated_at: string;
  generated_by_llm: true;
  provider: "groq" | "anthropic";
  model: string;
  insight: SectorInsight;
  disclaimer: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE = new Map<string, { expiresAt: number; payload: SectorAnalysisResponse }>();

function cacheGet(k: string): SectorAnalysisResponse | null {
  const h = CACHE.get(k);
  if (!h) return null;
  if (Date.now() > h.expiresAt) { CACHE.delete(k); return null; }
  return { ...h.payload, cache_hit: true };
}
function cacheSet(k: string, p: SectorAnalysisResponse): void {
  if (CACHE.size > 60) {
    const keys = Array.from(CACHE.keys()).slice(0, 30);
    for (const x of keys) CACHE.delete(x);
  }
  CACHE.set(k, { expiresAt: Date.now() + CACHE_TTL_MS, payload: { ...p, cache_hit: false } });
}

const SECTOR_INSIGHT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "cyclePhase", "state", "drivers", "opportunities", "risks", "topPlayersReading", "politicalRegulatorySignals", "watchNext", "confidenceScore"],
  properties: {
    headline: { type: "string", maxLength: 220 },
    cyclePhase: { type: "string", enum: ["expansion", "peak", "deceleration", "contraction", "trough", "recovery", "unclear"] },
    state: { type: "string", maxLength: 900 },
    drivers: {
      type: "array", minItems: 2, maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["driver", "impact", "explanation"],
        properties: {
          driver: { type: "string", maxLength: 100 },
          impact: { type: "string", enum: ["low", "medium", "high"] },
          explanation: { type: "string", maxLength: 280 },
        },
      },
    },
    opportunities: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", maxLength: 240 } },
    risks: {
      type: "array", minItems: 1, maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["risk", "trigger", "severity"],
        properties: {
          risk: { type: "string", maxLength: 200 },
          trigger: { type: "string", maxLength: 200 },
          severity: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    topPlayersReading: { type: "string", maxLength: 600 },
    politicalRegulatorySignals: { type: "array", minItems: 0, maxItems: 4, items: { type: "string", maxLength: 240 } },
    watchNext: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", maxLength: 200 } },
    confidenceScore: { type: "number", minimum: 0, maximum: 1 },
  },
};

const SYSTEM_PROMPT = `Eres el analista jefe sectorial de Politeia Analítica. Produces lecturas analíticas de sectores económicos españoles para gabinetes y consultores. NO eres asesor de inversión.

REGLAS:
1. Cita sólo información del payload (metadata sector, top empresas, precios).
2. PROHIBIDO: recomendaciones de inversión, atribución política partidista, predicción de precios futuros.
3. \`headline\`: 1 frase 14-22 palabras sobre el estado actual del sector.
4. \`state\` (4-7 frases): diagnóstico sectorial. Estructura: ciclo · drivers principales activos · posicionamiento competitivo de España (vs UE/global) · presión regulatoria · transformación estructural.
5. \`cyclePhase\`: estado del ciclo sectorial específico (puede divergir del macro general).
6. \`drivers\` (3-5): variables macro/regulatorias que mueven el sector ahora. \`impact\` realista.
7. \`opportunities\` (1-3): áreas de expansión/consolidación visibles.
8. \`risks\` (2-4): vulnerabilidades concretas con trigger específico.
9. \`topPlayersReading\` (2-4 frases): qué dicen los movimientos de las empresas representativas (si están en payload) sobre el sector.
10. \`politicalRegulatorySignals\` (0-3): regulación CNMC/CNMV/UE, fiscalidad sectorial, fondos europeos, debate parlamentario. NUNCA partidismo.
11. \`watchNext\` (2-4): indicadores/eventos sectoriales que vigilar.
12. Español de España, registro institucional. SOLO JSON.`;

function buildPrompt(sector: SpanishSector, companies: CompanySnap[]): string {
  return `SECTOR: ${sector.label} (${sector.id})
PESO PIB: ${sector.gdpShare}% · EMPLEO: ${sector.employmentShare}%
DESCRIPCIÓN: ${sector.description}

DRIVERS MACRO HABITUALES: ${sector.macroDrivers.join(" · ")}
RIESGOS RECURRENTES: ${sector.recurringRisks.join(" · ")}

TOP EMPRESAS REPRESENTATIVAS Y SNAPSHOT:
${companies.length > 0
  ? companies.map((c) => `- ${c.shortName} (${c.ticker}): ${c.price ?? "n/a"} (${c.changePct != null ? c.changePct.toFixed(2) + "%" : "n/a"})`).join("\n")
  : "(sin cotizadas representativas en el catálogo)"}

SUBTABS RELACIONADOS: ${sector.relatedSubtabs.join(", ")}

TAREA: produce el JSON SectorInsight según el schema. Sólo JSON.`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const b = body as { sector?: SpanishSector; companies?: CompanySnap[] };
  if (!b?.sector?.id) {
    return NextResponse.json({ ok: false, error: "sector_missing" }, { status: 400 });
  }
  const companies = b.companies ?? [];

  const cacheKey = `macro:sector:${b.sector.id}:${hashKey([
    companies.map((c) => `${c.id}:${c.price ?? ""}:${c.changePct ?? ""}`).join("|"),
    new Date().toISOString().slice(0, 13),
  ])}`;
  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached, { headers: { "Cache-Control": "private, max-age=3600" } });

  if (!AI_CONFIG.groqApiKey) {
    return NextResponse.json({ ok: false, error: "ai_unavailable" }, { status: 503 });
  }

  try {
    const { result, provider, modelHint } = await withCascade(async (client) => {
      const insight = await client.generateJSON<SectorInsight>({
        tier: "premium",
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPrompt(b.sector!, companies) }],
        temperature: 0.3,
        maxTokens: 2600,
        jsonSchema: SECTOR_INSIGHT_SCHEMA,
        schemaName: "SectorInsight",
      });
      return { insight, modelName: client.modelName({ tier: "premium", messages: [] }) };
    });

    const payload: SectorAnalysisResponse = {
      ok: true,
      cache_hit: false,
      generated_at: new Date().toISOString(),
      generated_by_llm: true,
      provider,
      model: result.modelName || modelHint,
      insight: result.insight,
      disclaimer: `${MACRO_AI_DISCLAIMER} · Análisis sectorial, no recomendación de inversión.`,
    };
    cacheSet(cacheKey, payload);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[macro/ai/analyze-sector] failed:", msg);
    return NextResponse.json({
      ok: false,
      error: err instanceof AiUnavailableError ? "ai_provider_failed" : "internal",
      detail: msg.slice(0, 400),
    }, { status: 502 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, endpoint: "POST /api/macro/ai/analyze-sector", primary_provider: AI_CONFIG.provider });
}
