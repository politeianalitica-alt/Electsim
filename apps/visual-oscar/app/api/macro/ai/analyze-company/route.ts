/**
 * POST /api/macro/ai/analyze-company
 *
 * Análisis Groq de una empresa cotizada española.
 * Schema CompanyInsight: posicionamiento sectorial · exposiciones macro
 * · drivers · riesgos · señales político-regulatorias.
 */
import { NextRequest, NextResponse } from "next/server";
import { AiUnavailableError, withCascade, AI_CONFIG } from "@/lib/ai";
import { hashKey, MACRO_AI_DISCLAIMER } from "@/lib/macro/ai-tab-schema";
import type { SpanishCompany } from "@/lib/macro/company-catalog";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Snapshot {
  price: number | null;
  changePct: number | null;
  marketCap: number | null;
}

interface CompanyInsight {
  headline: string;
  positioning: string;
  macroExposures: Array<{ driver: string; sensitivity: "low" | "medium" | "high"; explanation: string }>;
  cycleSignal: "expansion" | "deceleration" | "contraction" | "recovery" | "unclear";
  risks: Array<{ risk: string; trigger: string; severity: "low" | "medium" | "high" | "critical" }>;
  watchNext: string[];
  politicalRegulatorySignals: string[];
  confidenceScore: number;
}

interface CompanyAnalysisResponse {
  ok: true;
  cache_hit: boolean;
  generated_at: string;
  generated_by_llm: true;
  provider: "groq" | "anthropic";
  model: string;
  insight: CompanyInsight;
  disclaimer: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE = new Map<string, { expiresAt: number; payload: CompanyAnalysisResponse }>();

function cacheGet(k: string): CompanyAnalysisResponse | null {
  const h = CACHE.get(k);
  if (!h) return null;
  if (Date.now() > h.expiresAt) { CACHE.delete(k); return null; }
  return { ...h.payload, cache_hit: true };
}
function cacheSet(k: string, p: CompanyAnalysisResponse): void {
  if (CACHE.size > 100) {
    const keys = Array.from(CACHE.keys()).slice(0, 50);
    for (const x of keys) CACHE.delete(x);
  }
  CACHE.set(k, { expiresAt: Date.now() + CACHE_TTL_MS, payload: { ...p, cache_hit: false } });
}

const COMPANY_INSIGHT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "positioning", "macroExposures", "cycleSignal", "risks", "watchNext", "politicalRegulatorySignals", "confidenceScore"],
  properties: {
    headline: { type: "string", maxLength: 220 },
    positioning: { type: "string", maxLength: 700 },
    macroExposures: {
      type: "array", minItems: 2, maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["driver", "sensitivity", "explanation"],
        properties: {
          driver: { type: "string", maxLength: 80 },
          sensitivity: { type: "string", enum: ["low", "medium", "high"] },
          explanation: { type: "string", maxLength: 280 },
        },
      },
    },
    cycleSignal: { type: "string", enum: ["expansion", "deceleration", "contraction", "recovery", "unclear"] },
    risks: {
      type: "array", minItems: 0, maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["risk", "trigger", "severity"],
        properties: {
          risk: { type: "string", maxLength: 200 },
          trigger: { type: "string", maxLength: 200 },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
        },
      },
    },
    watchNext: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", maxLength: 200 } },
    politicalRegulatorySignals: { type: "array", minItems: 0, maxItems: 4, items: { type: "string", maxLength: 240 } },
    confidenceScore: { type: "number", minimum: 0, maximum: 1 },
  },
};

const SYSTEM_PROMPT = `Eres el analista jefe macro de Politeia Analítica. Produces lecturas analíticas de empresas cotizadas españolas para gabinetes y consultores que necesitan entender el posicionamiento macro de cada empresa, NO decisiones de inversión.

REGLAS:
1. Cita sólo datos del payload (precio, variación, metadata empresa, exposiciones declaradas).
2. PROHIBIDO:
   - Recomendar comprar/vender/mantener/sobreponderar.
   - Predicción de precio futuro con número concreto.
   - Atribución política partidista.
   - Tratar correlación como causalidad.
3. \`headline\` (1 frase 14-22 palabras): captura el posicionamiento de la empresa en el ciclo macro actual.
4. \`positioning\` (3-5 frases): qué hace la empresa, en qué ciclo está y cómo se relaciona con la coyuntura. Usa datos del payload.
5. \`macroExposures\` (3-5): drivers macro a los que la empresa es sensible (tipos, energía, FX, regulación, consumo). \`sensitivity\` debe basarse en \`company.macroExposure\` (campo declarado en catálogo).
6. \`cycleSignal\`: lectura del ciclo en el que la empresa opera.
7. \`risks\` (1-4): escenarios específicos con trigger concreto y severity realista.
8. \`watchNext\` (2-4): indicadores macro o noticias a vigilar para esta empresa concreta.
9. \`politicalRegulatorySignals\` (0-3): lecturas institucionales (regulación CNMC/CNMV, fiscalidad, exposición geopolítica). NUNCA partidismo.
10. \`confidenceScore\` (0-1) honesto.
11. Español de España, registro institucional, frases cortas. SOLO el JSON final.`;

function buildPrompt(company: SpanishCompany, snap: Snapshot): string {
  const exp = company.macroExposure;
  return `EMPRESA: ${company.legalName}
TICKER: ${company.ticker} / Finnhub ${company.finnhubSymbol}
SECTOR: ${company.sector}
SEDE: ${company.geography}
DESCRIPCIÓN: ${company.description}

EXPOSICIONES MACRO DECLARADAS (catálogo):
- Tipos de interés: ${exp.interestRates}
- Energía: ${exp.energy}
- FX: ${exp.fx}
- Regulación: ${exp.regulation}
- Consumo: ${exp.consumer}

SNAPSHOT:
- Precio: ${snap.price ?? "n/a"}
- Variación: ${snap.changePct != null ? snap.changePct.toFixed(2) + "%" : "n/a"}
- Cap. bursátil: ${snap.marketCap ?? "n/a"}

SUBTABS RELACIONADOS: ${company.relatedSubtabs.join(", ")}

TAREA: produce el JSON CompanyInsight según el schema. Sólo JSON.`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const b = body as { company?: SpanishCompany; snapshot?: Snapshot };
  if (!b?.company?.id || !b.snapshot) {
    return NextResponse.json({ ok: false, error: "company_or_snapshot_missing" }, { status: 400 });
  }

  const cacheKey = `macro:company:${b.company.id}:${hashKey([b.snapshot.price ?? 0, b.snapshot.changePct ?? 0, new Date().toISOString().slice(0, 13)])}`;
  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached, { headers: { "Cache-Control": "private, max-age=3600" } });

  if (!AI_CONFIG.geminiApiKey && !AI_CONFIG.groqApiKey) {
    return NextResponse.json({ ok: false, error: "ai_unavailable" }, { status: 503 });
  }

  try {
    const { result, provider, modelHint } = await withCascade(async (client) => {
      const insight = await client.generateJSON<CompanyInsight>({
        tier: "premium",
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPrompt(b.company!, b.snapshot!) }],
        temperature: 0.3,
        maxTokens: 2400,
        jsonSchema: COMPANY_INSIGHT_SCHEMA,
        schemaName: "CompanyInsight",
      });
      return { insight, modelName: client.modelName({ tier: "premium", messages: [] }) };
    });

    const payload: CompanyAnalysisResponse = {
      ok: true,
      cache_hit: false,
      generated_at: new Date().toISOString(),
      generated_by_llm: true,
      provider,
      model: result.modelName || modelHint,
      insight: result.insight,
      disclaimer: `${MACRO_AI_DISCLAIMER} · Análisis de posicionamiento macro, no recomendación de inversión.`,
    };
    cacheSet(cacheKey, payload);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[macro/ai/analyze-company] failed:", msg);
    return NextResponse.json({
      ok: false,
      error: err instanceof AiUnavailableError ? "ai_provider_failed" : "internal",
      detail: msg.slice(0, 400),
    }, { status: 502 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, endpoint: "POST /api/macro/ai/analyze-company", primary_provider: AI_CONFIG.provider });
}
