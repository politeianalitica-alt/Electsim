/**
 * /api/esios/no-peninsular · Sprint ESIOS-DEEP S5
 *
 * Datos de sistemas eléctricos no peninsulares (NP):
 *   - Canarias (geo 8742)
 *   - Baleares (geo 8743)
 *   - Ceuta (geo 8744)
 *   - Melilla (geo 8745)
 *
 * Para cada sistema NP devuelve:
 *   - Demanda real (10-min)
 *   - PVPC (precio regulado por geo)
 *   - Total demanda 24h GWh
 *   - Pico demanda + hora del pico
 *
 * Útil porque los sistemas NP tienen perfiles muy distintos a Península
 * (más diesel/fuel, picos turismo verano en Baleares, etc.).
 *
 * Cache: s-maxage=300 (5 min).
 */
import { NextResponse } from 'next/server'
import {
  fetchEsiosIndicator,
  latestValue,
  type EsiosResponse,
} from '@/lib/esios/client'
import { ESIOS_CATALOG, type EsiosSlug } from '@/lib/esios/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface SistemaNP {
  sistema: 'canarias' | 'baleares' | 'ceuta' | 'melilla'
  name: string
  geo_id: number
  ok: boolean
  demanda: {
    latest_mw: number | null
    latest_datetime: string | null
    avg_24h_mw: number | null
    peak_24h_mw: number | null
    peak_24h_hour: string | null
    total_24h_gwh: number | null
    serie_24h: Array<{ t: string; v: number }>
  } | null
  pvpc: {
    latest: number | null
    latest_datetime: string | null
    avg_24h: number | null
    serie_24h: Array<{ t: string; v: number }>
  } | null
  errors?: string[]
}

const SISTEMAS_NP: Array<{
  sistema: SistemaNP['sistema']
  name: string
  demanda_slug: EsiosSlug
}> = [
  { sistema: 'canarias', name: 'Canarias', demanda_slug: 'demanda_canarias' },
  { sistema: 'baleares', name: 'Baleares', demanda_slug: 'demanda_baleares' },
  { sistema: 'ceuta', name: 'Ceuta', demanda_slug: 'demanda_ceuta' },
  { sistema: 'melilla', name: 'Melilla', demanda_slug: 'demanda_melilla' },
]

export async function GET() {
  const startedAt = new Date().toISOString()
  const apiKey = process.env.ESIOS_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'no_key',
      message: 'ESIOS_API_KEY no configurada · añadir a Vercel env vars (Production)',
      sistemas: [],
      fetched_at: startedAt,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    })
  }

  const now = new Date()
  const start = new Date(now.getTime() - 24 * 3600_000).toISOString().slice(0, 16)
  const end = new Date(now.getTime() + 24 * 3600_000).toISOString().slice(0, 16)

  // Para cada sistema NP, pedimos demanda + PVPC (PVPC slug 1001 con geo del sistema)
  const results = await Promise.all(
    SISTEMAS_NP.map(async (cfg): Promise<SistemaNP> => {
      const demandaItem = ESIOS_CATALOG[cfg.demanda_slug]
      const pvpcItem = ESIOS_CATALOG.pvpc
      const errors: string[] = []

      const [demandaResp, pvpcResp]: [EsiosResponse, EsiosResponse] = await Promise.all([
        fetchEsiosIndicator(demandaItem.id, {
          startDate: start, endDate: end,
          geoIds: [demandaItem.geo_default],
          timeTrunc: 'hour',
        }),
        fetchEsiosIndicator(pvpcItem.id, {
          startDate: start, endDate: end,
          geoIds: [demandaItem.geo_default],   // PVPC con geo de cada sistema
          timeTrunc: 'hour',
        }),
      ])

      if (demandaResp.error) errors.push(`demanda: ${demandaResp.error}`)
      if (pvpcResp.error) errors.push(`pvpc: ${pvpcResp.error}`)

      // Demanda
      let demanda: SistemaNP['demanda'] = null
      if (demandaResp.ok && demandaResp.indicator) {
        const values = demandaResp.indicator.values
        const last = latestValue(demandaResp.indicator)
        const last24 = values.slice(-24)
        const sumMW = last24.reduce((s, v) => s + v.value, 0)
        const avgMW = last24.length > 0 ? sumMW / last24.length : null
        const totalGWh = last24.length > 0 ? sumMW / 1000 : null
        const peak = last24.length > 0
          ? last24.reduce((m, v) => (v.value > m.value ? v : m), last24[0])
          : null

        demanda = {
          latest_mw: last ? Math.round(last.value) : null,
          latest_datetime: last?.datetime || null,
          avg_24h_mw: avgMW !== null ? Math.round(avgMW) : null,
          peak_24h_mw: peak ? Math.round(peak.value) : null,
          peak_24h_hour: peak?.datetime.slice(11, 16) || null,
          total_24h_gwh: totalGWh !== null ? Math.round(totalGWh * 100) / 100 : null,
          serie_24h: last24.map((p) => ({ t: p.datetime, v: p.value })),
        }
      }

      // PVPC del sistema
      let pvpc: SistemaNP['pvpc'] = null
      if (pvpcResp.ok && pvpcResp.indicator) {
        const values = pvpcResp.indicator.values
        const last = latestValue(pvpcResp.indicator)
        const last24 = values.slice(-24)
        const avg = last24.length > 0
          ? last24.reduce((s, v) => s + v.value, 0) / last24.length : null

        pvpc = {
          latest: last ? Math.round(last.value * 100) / 100 : null,
          latest_datetime: last?.datetime || null,
          avg_24h: avg !== null ? Math.round(avg * 100) / 100 : null,
          serie_24h: last24.map((p) => ({ t: p.datetime, v: p.value })),
        }
      }

      return {
        sistema: cfg.sistema,
        name: cfg.name,
        geo_id: demandaItem.geo_default,
        ok: demandaResp.ok && pvpcResp.ok,
        demanda,
        pvpc,
        errors: errors.length > 0 ? errors : undefined,
      }
    })
  )

  return NextResponse.json({
    ok: results.every((s) => s.ok),
    sistemas: results,
    sistemas_count: results.length,
    sistemas_ok: results.filter((s) => s.ok).length,
    fetched_at: startedAt,
    _meta: {
      source: 'ESIOS · Red Eléctrica España',
      source_url: 'https://www.esios.ree.es/',
      cache_ttl_seconds: 300,
      note: 'Sistemas NP tienen perfiles distintos a Península · alta dependencia diesel/fuel · Baleares con enlace HVDC Pen-Bal',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' },
  })
}
