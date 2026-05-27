/**
 * /api/esios/ajustes · Sprint ESIOS-DEEP S4
 *
 * Servicios de ajuste del sistema eléctrico (mercado de regulación):
 *   - Banda secundaria subir / bajar (precios reserva capacidad)
 *   - Terciaria subir / bajar (precio energía activada)
 *   - Gestión desvíos (coste balancear sistema)
 *   - Restricciones técnicas (coste por congestiones de red)
 *
 * Útil para trading de energía y comercializadoras (B2B/pro).
 * Tensión del sistema = precios altos en estos servicios.
 *
 * Cache: s-maxage=600 (datos horarios).
 */
import { NextResponse } from 'next/server'
import {
  fetchEsiosIndicator,
  latestValue,
  avgLastN,
  type EsiosResponse,
} from '@/lib/esios/client'
import {
  ESIOS_CATALOG,
  ESIOS_MERCADO_AJUSTE_SLUGS,
  type EsiosSlug,
} from '@/lib/esios/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface AjusteService {
  slug: string
  ok: boolean
  label: string
  short: string
  unit: string
  use_case: string
  latest: { value: number; datetime: string } | null
  avg_24h: number | null
  max_24h: number | null
  min_24h: number | null
  serie_24h: Array<{ t: string; v: number }>
  tension_level: 'low' | 'normal' | 'elevated' | 'high' | null
  error?: string
}

/**
 * Clasifica el nivel de tensión por servicio según el ratio latest / avg_24h.
 * Si actual > 2x media → high · 1.5x → elevated · normal · < 0.5x → low
 */
function classifyTension(latest: number | null, avg: number | null): AjusteService['tension_level'] {
  if (latest === null || avg === null || avg === 0) return null
  const ratio = latest / Math.abs(avg)
  if (ratio > 2) return 'high'
  if (ratio > 1.5) return 'elevated'
  if (ratio < 0.5) return 'low'
  return 'normal'
}

export async function GET() {
  const startedAt = new Date().toISOString()
  const apiKey = process.env.ESIOS_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'no_key',
      message: 'ESIOS_API_KEY no configurada · añadir a Vercel env vars (Production)',
      services: {},
      fetched_at: startedAt,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    })
  }

  const now = new Date()
  const start = new Date(now.getTime() - 24 * 3600_000).toISOString().slice(0, 16)
  const end = new Date(now.getTime() + 1 * 3600_000).toISOString().slice(0, 16)

  const results = await Promise.all(
    ESIOS_MERCADO_AJUSTE_SLUGS.map(async (slug: EsiosSlug): Promise<AjusteService> => {
      const item = ESIOS_CATALOG[slug]
      const r: EsiosResponse = await fetchEsiosIndicator(item.id, {
        startDate: start, endDate: end,
        geoIds: [item.geo_default],
        timeTrunc: 'hour',
      })
      const ind = r.indicator
      const last = latestValue(ind)
      const values = ind?.values || []
      const last24 = values.slice(-24)
      const avg24 = avgLastN(ind, 24)
      const max24 = last24.length > 0 ? Math.max(...last24.map((p) => p.value)) : null
      const min24 = last24.length > 0 ? Math.min(...last24.map((p) => p.value)) : null

      const latestValueRaw = last?.value ?? null
      const tension = classifyTension(latestValueRaw, avg24)

      return {
        slug: item.slug,
        ok: r.ok,
        label: item.label,
        short: item.short,
        unit: item.unit,
        use_case: item.use_case,
        latest: last ? { value: Math.round(last.value * 100) / 100, datetime: last.datetime } : null,
        avg_24h: avg24 !== null ? Math.round(avg24 * 100) / 100 : null,
        max_24h: max24 !== null ? Math.round(max24 * 100) / 100 : null,
        min_24h: min24 !== null ? Math.round(min24 * 100) / 100 : null,
        serie_24h: last24.map((p) => ({ t: p.datetime, v: p.value })),
        tension_level: tension,
        error: r.error,
      }
    })
  )

  // Sistema global = high si cualquiera de los 6 está high
  const tensions = results.map((s) => s.tension_level).filter(Boolean)
  const systemTension: 'low' | 'normal' | 'elevated' | 'high' =
    tensions.includes('high') ? 'high'
    : tensions.includes('elevated') ? 'elevated'
    : tensions.every((t) => t === 'low') && tensions.length > 0 ? 'low'
    : 'normal'

  const services: Record<string, AjusteService> = {}
  for (const s of results) services[s.slug] = s

  return NextResponse.json({
    ok: results.every((r) => r.ok),
    services,
    system_tension: systemTension,
    services_count: results.length,
    services_ok: results.filter((r) => r.ok).length,
    fetched_at: startedAt,
    _meta: {
      source: 'ESIOS · Red Eléctrica España',
      source_url: 'https://www.esios.ree.es/',
      cache_ttl_seconds: 600,
      tension_rules: 'low: <0.5x media · normal · elevated: >1.5x · high: >2x',
      note: 'Indicador de tensión del sistema · precios altos = renovable no se predice bien o red congestionada',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
  })
}
