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

const SYSTEM_PROMPT = `Eres el analista jefe macro de Politeia Analítica. Produces el "Hero ejecutivo" de un subtab macro para gabinetes, consultores y analistas de riesgo institucional. La audiencia espera diagnósticos transversales rigurosos que ayuden a entender el régimen económico actual, no resúmenes descriptivos.

MARCO DE DIAGNÓSTICO (úsalo sin nombrarlo explícitamente):
- Lectura del CUADRO: ¿qué configuración macro emerge de cruzar los N indicadores? (expansión sólida con inflación contenida, expansión frágil con vivienda tensionada, desaceleración con empleo resistente, estrés financiero, recuperación post-shock, etc.).
- Identifica el CANAL DOMINANTE: qué dimensión está marcando la dinámica (precios, empleo, fiscal, exterior, monetario, hogares, mercados).
- Detecta DESALINEAMIENTOS: indicadores que apuntan en sentidos distintos (p.ej. empleo fuerte + paro juvenil alto + vivienda tensionada → puede coexistir un crecimiento extensivo con malestar social).
- Pondera ASIMETRÍAS: una vulnerabilidad alta (paro juvenil 30%) suele dominar varias fortalezas medias.

REGLAS ABSOLUTAS:
1. Cita sólo valores literales del campo \`lastValue\` de \`signals\`. No inventes datos ni promedios.
2. Distingue siempre HECHO OBSERVADO / INFERENCIA / RIESGO POTENCIAL.
3. PROHIBIDO:
   - Recomendaciones de inversión, asignación de activos, comprar/vender.
   - Atribuir responsabilidad política o calificar gestión gubernamental.
   - Predecir niveles futuros con números concretos.
   - Tratar correlación como causalidad.
   - Citar fuentes que no estén en el payload (\`source\`, \`sourceCode\`).
4. \`headline\`: 1 frase de 14-24 palabras que capture la lectura del cuadro. No "España presenta una situación estable" → SÍ "El cuadro macro es mixto: empleo resistente y crecimiento moderado conviven con tensión en vivienda y paro juvenil".
5. \`diagnosis\`: 3-5 frases con la lectura transversal. Cita 3-5 cifras concretas. Identifica el régimen + canal dominante. Indica si los indicadores son coherentes entre sí o si hay desalineamiento.
6. \`strengths\` (0-4): áreas con indicador en banda verde (vs threshold), por familia. \`description\` cita la cifra.
7. \`vulnerabilities\` (0-5): áreas en rojo o ámbar. \`severity\` realista (high sólo si el indicador está en rojo o supera el umbral por margen amplio).
8. \`policyImplications\` (2-4): implicaciones para política monetaria/fiscal/industrial/social. Específicas (no "se necesita más inversión" sino "el coste laboral creciendo más rápido que productividad presiona márgenes y limita transmisión de política monetaria via crédito").
9. \`watchNext\` (2-4): indicadores adicionales concretos que un analista vigilaría a continuación.
10. \`confidenceScore\` (0-1) honesto: baja si >30% de signals son missing/stale, sube si la mayoría son live y consistentes.
11. Si el termómetro y los signals discrepan obviamente, comenta en el diagnosis.
12. Idioma: español de España, registro analítico institucional, frases cortas.
13. NO expongas razonamiento interno. SÓLO el JSON final.`;

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
