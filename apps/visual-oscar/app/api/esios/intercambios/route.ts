/**
 * /api/esios/intercambios · Sprint ESIOS-DEEP S3
 *
 * Saldos de intercambio internacional en las 4 fronteras:
 *   - Francia (10209) · interconexión más relevante UE
 *   - Portugal (10210) · MIBEL ibérico
 *   - Marruecos (10211) · cable Tarifa-Fardioua
 *   - Andorra (10212) · pequeño exportador
 *
 * Convención de signo ESIOS:
 *   valor > 0 → importación a España
 *   valor < 0 → exportación desde España
 *
 * Devuelve por frontera: latest, serie_24h, sum_24h (GWh), max/min día.
 * Agregado: saldo neto España (suma 4 fronteras) + clasificación importadora/exportadora.
 */
import { NextResponse } from 'next/server'
import {
  fetchEsiosIndicator,
  latestValue,
  type EsiosResponse,
} from '@/lib/esios/client'
import {
  ESIOS_CATALOG,
  ESIOS_INTERCONEXIONES_SLUGS,
  type EsiosSlug,
} from '@/lib/esios/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface FronteraData {
  slug: string
  ok: boolean
  label: string
  short: string
  partner: string
  latest_mw: number | null
  latest_datetime: string | null
  sum_24h_gwh: number | null      // energía intercambiada (suma absoluta)
  net_24h_gwh: number | null      // energía neta (con signo)
  serie_24h: Array<{ t: string; v: number }>
  direction: 'import' | 'export' | 'balanced' | null
  error?: string
}

const PARTNERS: Record<string, string> = {
  intercambio_francia: 'Francia (FR)',
  intercambio_portugal: 'Portugal (PT)',
  intercambio_marruecos: 'Marruecos (MA)',
  intercambio_andorra: 'Andorra (AD)',
}

export async function GET() {
  const startedAt = new Date().toISOString()
  const apiKey = process.env.ESIOS_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'no_key',
      message: 'ESIOS_API_KEY no configurada · añadir a Vercel env vars (Production)',
      fronteras: {},
      fetched_at: startedAt,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    })
  }

  const now = new Date()
  const start = new Date(now.getTime() - 24 * 3600_000).toISOString().slice(0, 16)
  const end = new Date(now.getTime() + 1 * 3600_000).toISOString().slice(0, 16)

  const results = await Promise.all(
    ESIOS_INTERCONEXIONES_SLUGS.map(async (slug: EsiosSlug): Promise<FronteraData> => {
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
      const sumAbs = last24.reduce((s, v) => s + Math.abs(v.value), 0)
      const sumNet = last24.reduce((s, v) => s + v.value, 0)
      // MW × 1h = MWh → /1000 = GWh
      const sum_24h_gwh = last24.length > 0 ? Math.round(sumAbs / 1000 * 100) / 100 : null
      const net_24h_gwh = last24.length > 0 ? Math.round(sumNet / 1000 * 100) / 100 : null
      const lastV = last?.value ?? 0
      const direction = Math.abs(lastV) < 50 ? 'balanced' : lastV > 0 ? 'import' : 'export'

      return {
        slug: item.slug, ok: r.ok,
        label: item.label, short: item.short,
        partner: PARTNERS[item.slug] || item.short,
        latest_mw: last ? Math.round(last.value) : null,
        latest_datetime: last?.datetime || null,
        sum_24h_gwh, net_24h_gwh,
        serie_24h: last24.map((p) => ({ t: p.datetime, v: p.value })),
        direction,
        error: r.error,
      }
    })
  )

  // Agregado España
  const netoTotal = results.reduce((s, f) => s + (f.net_24h_gwh || 0), 0)
  const netoLatest = results.reduce((s, f) => s + (f.latest_mw || 0), 0)
  const claseEspana: 'importadora_neta' | 'exportadora_neta' | 'equilibrada' =
    Math.abs(netoTotal) < 1 ? 'equilibrada'
    : netoTotal > 0 ? 'importadora_neta' : 'exportadora_neta'

  const fronteras: Record<string, FronteraData> = {}
  for (const f of results) fronteras[f.slug] = f

  return NextResponse.json({
    ok: results.every((f) => f.ok),
    fronteras,
    agregado_espana: {
      neto_24h_gwh: Math.round(netoTotal * 100) / 100,
      neto_latest_mw: netoLatest,
      clasificacion: claseEspana,
    },
    fetched_at: startedAt,
    _meta: {
      source: 'ESIOS · Red Eléctrica España',
      source_url: 'https://www.esios.ree.es/',
      cache_ttl_seconds: 600,
      convention: 'valor > 0 = import a España · valor < 0 = export desde España',
      note: 'Saldos horarios programados · serie 24h hacia atrás',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
  })
}
