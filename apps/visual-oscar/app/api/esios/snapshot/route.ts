/**
 * /api/esios/snapshot · 6 indicadores ESIOS clave en una llamada.
 *
 * Pensado para bloques KPI de dashboards:
 *   - PVPC (€/MWh hora actual + serie 24h)
 *   - Mercado spot OMIE
 *   - Demanda peninsular real
 *   - % renovable instantáneo
 *   - Factor emisión CO2 (gCO2/kWh)
 *   - Precio EUA CO2 (€/t)
 *
 * Para cada indicador devuelve `latest`, `prev` (24h antes), `change_pct`,
 * `avg_24h`, y los últimos 24 puntos para mini-spark.
 *
 * Cache: 10 min (datos horarios).
 *
 * Empty state honesto: si ESIOS_API_KEY no está, `ok: false, error: 'no_key'`
 * en lugar de fingir datos.
 */
import { NextResponse } from 'next/server'
import {
  fetchEsiosIndicator,
  latestValue,
  changePct,
  avgLastN,
  type EsiosResponse,
} from '@/lib/esios/client'
import { ESIOS_CATALOG, ESIOS_SNAPSHOT_SLUGS, type EsiosSlug } from '@/lib/esios/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface IndicatorSummary {
  slug: string
  ok: boolean
  label: string
  short: string
  unit: string
  category: string
  use_case: string
  higher_is_worse?: boolean
  latest: { value: number; datetime: string } | null
  prev: { value: number; datetime: string } | null
  change_pct: number | null
  avg_24h: number | null
  points: Array<{ t: string; v: number }>
  source_url: string
  error?: string
}

export async function GET() {
  const startedAt = new Date().toISOString()
  const apiKey = process.env.ESIOS_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'no_key',
      message: 'ESIOS_API_KEY no configurada en variables de entorno de Vercel · el endpoint está listo pero los indicadores no se descargan',
      indicators: {},
      fetched_at: startedAt,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    })
  }

  // Fetch los 6 en paralelo · cada uno con su propio try/catch
  const results = await Promise.all(
    ESIOS_SNAPSHOT_SLUGS.map(async (slug: EsiosSlug): Promise<IndicatorSummary> => {
      const item = ESIOS_CATALOG[slug]
      const r: EsiosResponse = await fetchEsiosIndicator(item.id, {
        geoIds: [item.geo_default],
        // últimas 48h hacia atrás + 24h hacia delante (PVPC publica D+1)
      })
      const ind = r.indicator
      const latest = latestValue(ind)
      const values = ind?.values || []
      // Para series horarias, prev = 24 posiciones atrás (24h). Para 10-min = 144.
      const positionsBack = item.frequency === '10min' ? 144 : item.frequency === 'horaria' ? 24 : 1
      const prevIdx = values.length - 1 - positionsBack
      const prev = prevIdx >= 0 ? values[prevIdx] : null
      const change = changePct(ind, positionsBack)
      const avg24 = avgLastN(ind, positionsBack)

      // Mini-spark · últimos 24 puntos (sample si la frecuencia es 10min)
      const stride = item.frequency === '10min' ? 6 : 1   // sampling cada 1h
      const spark = values.slice(-24 * stride).filter((_, i) => i % stride === 0)
        .map((p) => ({ t: p.datetime, v: p.value }))

      return {
        slug: item.slug,
        ok: r.ok,
        label: item.label,
        short: item.short,
        unit: item.unit,
        category: item.category,
        use_case: item.use_case,
        higher_is_worse: item.higher_is_worse,
        latest: latest ? { value: latest.value, datetime: latest.datetime } : null,
        prev: prev ? { value: prev.value, datetime: prev.datetime } : null,
        change_pct: change !== null ? Math.round(change * 100) / 100 : null,
        avg_24h: avg24 !== null ? Math.round(avg24 * 100) / 100 : null,
        points: spark,
        source_url: r.source_url || `https://www.esios.ree.es/es/analisis/${item.id}`,
        error: r.error,
      }
    })
  )

  const indicators: Record<string, IndicatorSummary> = {}
  for (const r of results) indicators[r.slug] = r

  return NextResponse.json({
    ok: results.every((r) => r.ok),
    indicators,
    indicators_count: results.length,
    indicators_ok: results.filter((r) => r.ok).length,
    fetched_at: startedAt,
    _meta: {
      source: 'ESIOS · Red Eléctrica España',
      source_url: 'https://www.esios.ree.es/',
      api_docs: 'https://api.esios.ree.es/doc',
      cache_ttl_minutes: 10,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
  })
}
