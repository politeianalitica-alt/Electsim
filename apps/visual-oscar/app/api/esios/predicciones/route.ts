/**
 * /api/esios/predicciones · Sprint ESIOS-DEEP S4
 *
 * Predicciones oficiales de REE para D+1 + comparativa con realización:
 *   - Eólica prevista (541) vs eólica real (551)
 *   - Solar PV prevista (542) vs solar real (1161)
 *   - Renovable total prevista (10034) vs real (10171)
 *   - Demanda prevista (460) vs real (1293)
 *
 * Para cada par calcula:
 *   - MAPE 24h (calidad histórica del forecast)
 *   - Bias (sesgo · forecast tiende a sobre/infraestimar)
 *   - Serie 48h con prevista (línea futuro) + real (pasado solapado)
 *
 * Cache: s-maxage=900 (15 min · predicciones se actualizan poco intra-día).
 */
import { NextResponse } from 'next/server'
import {
  fetchEsiosIndicator,
  type EsiosResponse,
} from '@/lib/esios/client'
import {
  ESIOS_CATALOG,
  ESIOS_PREDICCION_SLUGS,
  ESIOS_PREDICCION_REALES_SLUGS,
  type EsiosSlug,
} from '@/lib/esios/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface SerieValor { t: string; v: number }
interface PredPair {
  pred_slug: string
  real_slug: string
  ok: boolean
  label: string
  short: string
  unit: string
  pred_serie: SerieValor[]      // futuro · 24h hacia delante
  real_serie: SerieValor[]      // pasado · 24h hacia atrás
  pred_now: number | null       // valor para esta hora (referencia)
  real_now: number | null
  mape_24h_pct: number | null
  bias_pct: number | null       // (pred - real) / real
  error?: string
}

function alignByDatetime(real: SerieValor[], pred: SerieValor[]): { realA: SerieValor[]; predA: SerieValor[] } {
  // Devuelve los pares por t coincidente · solo donde hay match
  const realMap = new Map<string, number>()
  for (const r of real) realMap.set(r.t.slice(0, 13), r.v)
  const predMap = new Map<string, number>()
  for (const p of pred) predMap.set(p.t.slice(0, 13), p.v)
  const keys = [...realMap.keys()].filter((k) => predMap.has(k))
  const realA = keys.map((k) => ({ t: k, v: realMap.get(k)! }))
  const predA = keys.map((k) => ({ t: k, v: predMap.get(k)! }))
  return { realA, predA }
}

function calcMAPE(real: SerieValor[], pred: SerieValor[]): number | null {
  const n = Math.min(real.length, pred.length)
  if (n < 2) return null
  let sum = 0, count = 0
  for (let i = 0; i < n; i++) {
    if (real[i].v === 0 || !Number.isFinite(real[i].v)) continue
    sum += Math.abs((real[i].v - pred[i].v) / real[i].v)
    count++
  }
  return count > 0 ? Math.round((sum / count) * 10000) / 100 : null
}

function calcBias(real: SerieValor[], pred: SerieValor[]): number | null {
  const n = Math.min(real.length, pred.length)
  if (n < 2) return null
  let sum = 0, count = 0
  for (let i = 0; i < n; i++) {
    if (real[i].v === 0 || !Number.isFinite(real[i].v)) continue
    sum += (pred[i].v - real[i].v) / real[i].v
    count++
  }
  return count > 0 ? Math.round((sum / count) * 10000) / 100 : null
}

export async function GET() {
  const startedAt = new Date().toISOString()
  const apiKey = process.env.ESIOS_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'no_key',
      message: 'ESIOS_API_KEY no configurada · añadir a Vercel env vars (Production)',
      pairs: [],
      fetched_at: startedAt,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    })
  }

  const now = new Date()
  const start = new Date(now.getTime() - 24 * 3600_000).toISOString().slice(0, 16)
  const end = new Date(now.getTime() + 36 * 3600_000).toISOString().slice(0, 16)

  // Pedimos en paralelo predicciones + reales (8 reqs)
  const allSlugs = [...ESIOS_PREDICCION_SLUGS, ...ESIOS_PREDICCION_REALES_SLUGS]
  const allResp = await Promise.all(
    allSlugs.map(async (slug: EsiosSlug): Promise<{ slug: string; resp: EsiosResponse }> => {
      const item = ESIOS_CATALOG[slug]
      const r = await fetchEsiosIndicator(item.id, {
        startDate: start, endDate: end,
        geoIds: [item.geo_default],
        timeTrunc: 'hour',
      })
      return { slug, resp: r }
    })
  )

  const responseBySlug = new Map(allResp.map((r) => [r.slug, r.resp]))

  // Construir los 4 pares
  const pairs: PredPair[] = ESIOS_PREDICCION_SLUGS.map((predSlug, idx) => {
    const realSlug = ESIOS_PREDICCION_REALES_SLUGS[idx]
    const predResp = responseBySlug.get(predSlug)
    const realResp = responseBySlug.get(realSlug)
    const predInd = predResp?.indicator
    const realInd = realResp?.indicator
    const predValues = predInd?.values || []
    const realValues = realInd?.values || []

    // Separar pred en serie futura (>= ahora) y real en pasado (<= ahora)
    const nowMs = now.getTime()
    const predFuture = predValues
      .filter((p) => new Date(p.datetime).getTime() >= nowMs - 1800_000)
      .slice(0, 36)
      .map((p) => ({ t: p.datetime, v: p.value }))
    const realPast = realValues.slice(-24).map((p) => ({ t: p.datetime, v: p.value }))

    // Para MAPE: pares alineados pasados (real ya tiene valor, pred lo tenía)
    const predHistorical = predValues
      .filter((p) => new Date(p.datetime).getTime() < nowMs)
      .slice(-24)
      .map((p) => ({ t: p.datetime, v: p.value }))
    const { realA, predA } = alignByDatetime(realPast, predHistorical)
    const mape = calcMAPE(realA, predA)
    const bias = calcBias(realA, predA)

    // Valores "now"
    const realNow = realPast.length > 0 ? realPast[realPast.length - 1].v : null
    const predNow = predFuture.length > 0 ? predFuture[0].v : null

    const item = ESIOS_CATALOG[predSlug]
    const okPred = predResp?.ok ?? false
    const okReal = realResp?.ok ?? false

    return {
      pred_slug: predSlug,
      real_slug: realSlug,
      ok: okPred && okReal,
      label: item.label,
      short: item.short,
      unit: item.unit,
      pred_serie: predFuture,
      real_serie: realPast,
      pred_now: predNow !== null ? Math.round(predNow) : null,
      real_now: realNow !== null ? Math.round(realNow) : null,
      mape_24h_pct: mape,
      bias_pct: bias,
      error: predResp?.error || realResp?.error,
    }
  })

  return NextResponse.json({
    ok: pairs.every((p) => p.ok),
    pairs,
    fetched_at: startedAt,
    _meta: {
      source: 'ESIOS · Red Eléctrica España',
      source_url: 'https://www.esios.ree.es/',
      cache_ttl_seconds: 900,
      note: 'Predicciones D+1 oficiales REE · publican varias veces al día (al menos cada 4h)',
      mape_note: 'MAPE = error medio % calculado sobre últimas 24h alineadas pred-real',
      bias_note: 'Bias positivo = forecast sobreestima · negativo = infraestima',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' },
  })
}
