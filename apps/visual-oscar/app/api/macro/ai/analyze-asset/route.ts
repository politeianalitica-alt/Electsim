/**
 * POST /api/macro/ai/analyze-asset
 *
 * Análisis Groq de un activo financiero a partir de su snapshot
 * (precio, OHLC, variación) + metadata macro. Devuelve qué está
 * descontando el activo, qué canales macro activa, qué riesgos y
 * qué vigilar.
 *
 * Diseñado para `/macro/mercados-activos/asset/[id]`.
 */
import { NextRequest, NextResponse } from "next/server";
import { AiUnavailableError, withCascade, AI_CONFIG } from "@/lib/ai";
import type { MarketAsset } from "@/lib/macro/asset-catalog";
import { hashKey, MACRO_AI_DISCLAIMER } from "@/lib/macro/ai-tab-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Snapshot {
  price: number | null;
  change: number | null;
  changePct: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  timestamp: number | null;
  source: string;
}

interface AssetInsight {
  headline: string;
  marketRegime: "risk_on" | "risk_off" | "neutral" | "stress" | "unclear";
  whatItDiscounts: string;
  macroChannels: Array<{ channel: string; explanation: string; severity: "low" | "medium" | "high" }>;
  risks: Array<{ risk: string; trigger: string; horizon: string }>;
  watchNext: string[];
  contradictions: string[];
  confidenceScore: number;
}

interface AssetAnalysisResponse {
  ok: true;
  cache_hit: boolean;
  generated_at: string;
  generated_by_llm: true;
  provider: "groq" | "anthropic";
  model: string;
  insight: AssetInsight;
  disclaimer: string;
}

interface AssetAnalysisError {
  ok: false;
  error: string;
  detail?: string;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30min - mercados se mueven
interface CacheEntry { expiresAt: number; payload: AssetAnalysisResponse }
const CACHE = new Map<string, CacheEntry>();

function cacheGet(key: string): AssetAnalysisResponse | null {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) { CACHE.delete(key); return null; }
  return { ...hit.payload, cache_hit: true };
}
function cacheSet(key: string, payload: AssetAnalysisResponse): void {
  if (CACHE.size > 100) {
    const keys = Array.from(CACHE.keys()).slice(0, 50);
    for (const k of keys) CACHE.delete(k);
  }
  CACHE.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload: { ...payload, cache_hit: false } });
}

const ASSET_INSIGHT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "marketRegime", "whatItDiscounts", "macroChannels", "risks", "watchNext", "contradictions", "confidenceScore"],
  properties: {
    headline: { type: "string", maxLength: 200 },
    marketRegime: { type: "string", enum: ["risk_on", "risk_off", "neutral", "stress", "unclear"] },
    whatItDiscounts: { type: "string", maxLength: 800 },
    macroChannels: {
      type: "array", minItems: 1, maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["channel", "explanation", "severity"],
        properties: {
          channel: { type: "string", maxLength: 100 },
          explanation: { type: "string", maxLength: 300 },
          severity: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    risks: {
      type: "array", minItems: 0, maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["risk", "trigger", "horizon"],
        properties: {
          risk: { type: "string", maxLength: 200 },
          trigger: { type: "string", maxLength: 200 },
          horizon: { type: "string", maxLength: 60 },
        },
      },
    },
    watchNext: {
      type: "array", minItems: 1, maxItems: 5,
      items: { type: "string", maxLength: 200 },
    },
    contradictions: {
      type: "array", minItems: 0, maxItems: 4,
      items: { type: "string", maxLength: 240 },
    },
    confidenceScore: { type: "number", minimum: 0, maximum: 1 },
  },
};

const SYSTEM_PROMPT = `Eres un analista macro-financiero senior español. NO eres asesor de inversiones — tu trabajo es leer qué está descontando un activo financiero y traducirlo a canales macro (inflación, tipos, crecimiento, riesgo soberano, divisas, geopolítica), nunca dar recomendaciones de comprar/vender.

REGLAS:
1. Cita sólo cifras presentes en el payload (precio, variación %, OHLC).
2. Distingue HECHO OBSERVADO (precio actual, variación) / INFERENCIA (qué descuenta) / RIESGO POTENCIAL (escenario condicional).
3. PROHIBIDO:
   - Recomendar comprar, vender, mantener, sobreponderar, infraponderar.
   - Predecir precios futuros con número concreto.
   - Tratar correlación como causalidad.
   - Juicios partidistas sobre política española.
4. \`marketRegime\` debe reflejar el tono general del snapshot:
   - risk_on: subida con vol baja, drivers cíclicos
   - risk_off: caída, fuga a refugios
   - neutral: movimiento contenido, sin sesgo claro
   - stress: caída brusca con vol alta, gap risk
   - unclear: ambiguo o sin contexto suficiente
5. \`whatItDiscounts\` (2-4 frases) debe explicar qué interpretación macro tiene el movimiento.
6. \`macroChannels\` son los canales macro afectados con severity (low/medium/high), p.ej. para Brent: "inflación importada" alto, "márgenes industriales" medio.
7. \`risks\` son escenarios condicionales (si X ocurre, entonces Y). \`horizon\` puede ser "días", "semanas", "meses", "trimestres".
8. \`contradictions\` son señales que no encajan (p.ej. equity sube con yields subiendo y vol baja — coexistencia inusual).
9. Lenguaje español de España, registro analítico institucional.
10. SOLO devuelve el JSON. Sin razonamiento expuesto.`;

function buildUserPrompt(asset: MarketAsset, snap: Snapshot): string {
  return `ACTIVO: ${asset.label} (${asset.id})
CLASE: ${asset.assetClass}
TICKER: ${asset.ticker ?? "n/a"}
GEOGRAFÍA: ${asset.geography ?? "Global"}
MONEDA: ${asset.currency}
UNIDAD: ${asset.unit}
FUENTE PRIMARIA: ${asset.primarySource}

SNAPSHOT (último observado):
- Precio: ${snap.price ?? "n/a"} ${asset.unit}
- Variación: ${snap.change ?? "n/a"} (${snap.changePct != null ? snap.changePct.toFixed(2) : "n/a"}%)
- Apertura: ${snap.open ?? "n/a"} · Máximo: ${snap.high ?? "n/a"} · Mínimo: ${snap.low ?? "n/a"}
- Volumen: ${snap.volume ?? "n/a"}

DESCRIPCIÓN ACTIVO: ${asset.description}
SEÑAL MACRO ESPERADA: ${asset.macroSignal}
SUBTABS RELACIONADOS: ${asset.relatedSubtabs.join(", ")}

TAREA: produce el JSON AssetInsight según el schema. Sólo JSON.`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json<AssetAnalysisError>({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const b = body as { asset?: MarketAsset; snapshot?: Snapshot };
  if (!b?.asset?.id || !b.snapshot) {
    return NextResponse.json<AssetAnalysisError>({ ok: false, error: "asset_or_snapshot_missing" }, { status: 400 });
  }
  if (b.snapshot.price == null) {
    return NextResponse.json<AssetAnalysisError>({ ok: false, error: "no_price_data" }, { status: 400 });
  }

  const cacheKey = `macro:asset:${b.asset.id}:${hashKey([
    b.snapshot.price ?? 0,
    b.snapshot.changePct ?? 0,
    new Date().toISOString().slice(0, 13), // hora actual
  ])}`;
  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json<AssetAnalysisResponse>(cached, { headers: { "Cache-Control": "private, max-age=1800" } });

  if (!AI_CONFIG.geminiApiKey && !AI_CONFIG.groqApiKey) {
    return NextResponse.json<AssetAnalysisError>({ ok: false, error: "ai_unavailable" }, { status: 503 });
  }

  try {
    const { result, provider, modelHint } = await withCascade(async (client) => {
      const insight = await client.generateJSON<AssetInsight>({
        tier: "premium",
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(b.asset!, b.snapshot!) }],
        temperature: 0.3,
        maxTokens: 2200,
        jsonSchema: ASSET_INSIGHT_SCHEMA,
        schemaName: "AssetInsight",
      });
      return { insight, modelName: client.modelName({ tier: "premium", messages: [] }) };
    });

    const payload: AssetAnalysisResponse = {
      ok: true,
      cache_hit: false,
      generated_at: new Date().toISOString(),
      generated_by_llm: true,
      provider,
      model: result.modelName || modelHint,
      insight: result.insight,
      disclaimer: `${MACRO_AI_DISCLAIMER} · Sin recomendaciones de compra/venta de activos.`,
    };
    cacheSet(cacheKey, payload);
    return NextResponse.json<AssetAnalysisResponse>(payload, { headers: { "Cache-Control": "private, max-age=1800" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[macro/ai/analyze-asset] failed:", msg);
    return NextResponse.json<AssetAnalysisError>({
      ok: false,
      error: err instanceof AiUnavailableError ? "ai_provider_failed" : "internal",
      detail: msg.slice(0, 400),
    }, { status: 502 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/macro/ai/analyze-asset",
    primary_provider: AI_CONFIG.provider,
  });
}
