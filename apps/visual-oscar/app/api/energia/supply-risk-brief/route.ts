/**
 * GET /api/energia/supply-risk-brief · Sprint Energía S10
 *
 * Análisis IA de riesgo de seguridad de suministro energético. Recoge señales
 * reales (spot eléctrico ESIOS, Brent, almacenamiento de gas AGSI, cuota
 * renovable), las pasa por la heurística pura `computeSupplyRisk` (que produce
 * los vectores + nivel global factuales), y luego intenta que Gemini redacte
 * un resumen ejecutivo SOBRE esos vectores ya calculados (el LLM narra, no
 * inventa números). Si Gemini no está disponible → resumen heurístico.
 *
 * Respuesta:
 *   { ok, brief: { resumen, nivel_riesgo_global, vectores[], generated_by_llm },
 *     inputs, fetched_at }
 *
 * Degrada siempre a HTTP 200. Cache 30 min.
 */
import { NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/gemini-client'
import {
  computeSupplyRisk,
  heuristicSummary,
  type SupplyRiskInput,
} from '@/lib/energia/supply-risk-calc'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function safeJson(url: string): Promise<unknown | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

async function gatherInputs(origin: string): Promise<SupplyRiskInput> {
  const [snapshot, mix, commodities, gas] = await Promise.all([
    safeJson(`${origin}/api/esios/snapshot`),
    safeJson(`${origin}/api/esios/mix`),
    safeJson(`${origin}/api/energia/commodities?category=oil`),
    safeJson(`${origin}/api/energia/gas-storage?country=eu`),
  ])

  // Spot eléctrico (ESIOS snapshot · mercado_spot)
  const spot = num(
    (snapshot as { indicators?: { mercado_spot?: { latest?: { value?: unknown } } } })
      ?.indicators?.mercado_spot?.latest?.value,
  )

  // Cuota renovable (ESIOS mix · agregados.porcentaje_renovable)
  const renovable = num(
    (mix as { agregados?: { porcentaje_renovable?: unknown } })?.agregados?.porcentaje_renovable,
  )

  // Brent (commodities · busca el símbolo BRENT)
  let brent: number | null = null
  const cData = (commodities as { data?: Array<{ symbol?: string; latest?: unknown }> })?.data
  if (Array.isArray(cData)) {
    const b = cData.find((c) => (c.symbol ?? '').toUpperCase().includes('BRENT'))
    brent = num(b?.latest)
  }

  // Almacenamiento de gas UE (AGSI · full %)
  const gData = (gas as { data?: { full?: unknown; full_pct?: unknown; latest?: { full?: unknown } } })?.data
  const gasStoragePctEu =
    num(gData?.full) ?? num(gData?.full_pct) ?? num(gData?.latest?.full)

  return {
    spotPriceEurMwh: spot,
    renovablePct: renovable,
    brentUsd: brent,
    gasStoragePctEu,
    dependenciaPct: 73, // estructural Eurostat (dependencia energética exterior ES)
  }
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin
  const inputs = await gatherInputs(origin)
  const risk = computeSupplyRisk(inputs)

  let resumen = heuristicSummary(risk)
  let generated_by_llm = false

  // Intentar narración LLM sobre los vectores ya calculados (Gemini → heurístico)
  try {
    const factual = risk.vectores
      .map((v) => `- ${v.nombre}: ${v.banda}${v.score != null ? ` (${v.score}/100)` : ''} · ${v.nota}`)
      .join('\n')
    const prompt = `Eres un analista de seguridad energética. Con estos vectores de riesgo YA CALCULADOS para España (no inventes cifras, solo interpreta):

Nivel global: ${risk.nivel_global}${risk.score != null ? ` (${risk.score}/100)` : ''}
${factual}

Redacta un resumen ejecutivo de 3-4 frases para un analista: qué vectores preocupan, qué vigilar, e implicación para la seguridad de suministro de España. Tono profesional, español, sin markdown, sin inventar números nuevos.`
    const text = await generateText({
      system: 'Analista de seguridad energética. Conciso, factual, español. No inventes datos.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      maxTokens: 380,
    })
    if (text && text.trim().length > 0) {
      resumen = text.trim()
      generated_by_llm = true
    }
  } catch {
    // Gemini no disponible → se mantiene el resumen heurístico
  }

  return NextResponse.json(
    {
      ok: true,
      brief: {
        resumen,
        nivel_riesgo_global: risk.nivel_global,
        score: risk.score,
        vectores: risk.vectores,
        generated_by_llm,
      },
      inputs,
      fetched_at: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } },
  )
}
