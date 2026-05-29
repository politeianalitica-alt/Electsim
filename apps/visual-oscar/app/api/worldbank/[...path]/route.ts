/**
 * /api/worldbank/[...path] · World Bank Open Data v2 API.
 *
 * Fuente: https://api.worldbank.org/v2/
 * Pública sin auth. Devuelve JSON array [metadata, data[]].
 *
 * Rutas:
 *   GET /api/worldbank/health
 *   GET /api/worldbank/indicator/<id>?country=ES&from=2000&to=2024&per_page=50
 *     → Serie temporal indicador WB para 1 país (default ES, últimos 50 puntos)
 *   GET /api/worldbank/indicator/<id>/multi?countries=ES,DE,FR,IT
 *     → Serie temporal multi-país (último valor por país)
 *
 * Indicadores frecuentes:
 *   SP.POP.65UP.TO.ZS  · % población ≥65
 *   SP.URB.TOTL.IN.ZS  · % urbano
 *   IQ.CPA.PUBS.XQ     · CPIA gestión sector público
 *   CC.PER.RNK         · WGI Control Corruption (percentile rank)
 *   GE.PER.RNK         · WGI Government Effectiveness
 *   RL.PER.RNK         · WGI Rule of Law
 *   VA.PER.RNK         · WGI Voice & Accountability
 *   PV.PER.RNK         · WGI Political Stability
 *   RQ.PER.RNK         · WGI Regulatory Quality
 *
 * Sprint Backend C1 (2026-05-30): primera versión genérica del proxy.
 * Cache HTTP 24h (datos anuales · revalidación frecuente innecesaria).
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 86400

const WB_BASE = 'https://api.worldbank.org/v2'

interface WBPoint {
  date: string  // year as string "2023"
  value: number | null
}

interface WBSeriesResult {
  ok: boolean
  indicator: string
  country: string
  source?: string
  data_quality: ReturnType<typeof quality>
  n_points: number
  points: WBPoint[]
  last: WBPoint | null
}

async function wbFetch(indicator: string, countries: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({
    format: 'json',
    per_page: params.per_page || '50',
    ...(params.from && params.to ? { date: `${params.from}:${params.to}` } : {}),
  })
  try {
    const url = `${WB_BASE}/country/${countries}/indicator/${indicator}?${qs}`
    const r = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    } as RequestInit)
    if (r.status === 429) return { error: 'rate_limited' }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    const json = await r.json()
    // WB returns array: [meta, data[]] when there's data, or [meta] when there isn't.
    if (!Array.isArray(json) || json.length < 2) {
      return { error: 'no_data', meta: json[0] }
    }
    return { meta: json[0], rows: json[1] || [] }
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/worldbank/health
  if (action === 'health' || segs.length === 0) {
    return NextResponse.json({
      ok: true,
      service: 'World Bank Open Data v2',
      base: WB_BASE,
      example: '/api/worldbank/indicator/SP.POP.65UP.TO.ZS?country=ES',
    })
  }

  // /api/worldbank/indicator/<id>?country=ES&from=2000&to=2024
  // /api/worldbank/indicator/<id>/multi?countries=ES,DE,FR
  if (action === 'indicator' && segs[1]) {
    const indicator = segs[1]
    const isMulti = segs[2] === 'multi'

    if (isMulti) {
      const countries = url.searchParams.get('countries') || 'ES;DE;FR;IT'
      // WB accepts ; or codes joined by ; for multi-country
      const result = await wbFetch(indicator, countries, {
        per_page: url.searchParams.get('per_page') || '500',
      })
      if (result.error) {
        return NextResponse.json({
          ok: false,
          data_quality: quality('missing', 'World Bank', result.error),
        })
      }
      // Last available value per country
      const byCountry = new Map<string, WBPoint>()
      for (const row of result.rows as any[]) {
        if (row.value == null) continue
        const cc = row.countryiso3code || row.country?.id || 'XX'
        const existing = byCountry.get(cc)
        const point: WBPoint = { date: row.date, value: row.value }
        if (!existing || existing.date < point.date) {
          byCountry.set(cc, point)
        }
      }
      return NextResponse.json({
        ok: true,
        indicator,
        source: result.meta?.source?.value || 'World Bank',
        data_quality: quality('live', `World Bank · ${indicator}`),
        countries: Array.from(byCountry.entries()).map(([country, point]) => ({
          country,
          ...point,
        })),
      })
    }

    // Single country
    const country = url.searchParams.get('country') || 'ES'
    const result = await wbFetch(indicator, country, {
      per_page: url.searchParams.get('per_page') || '50',
      from: url.searchParams.get('from') || '',
      to: url.searchParams.get('to') || '',
    })
    if (result.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'World Bank', result.error),
      } as Partial<WBSeriesResult>)
    }
    // World Bank returns most recent first. Filter nulls + sort ascending for serie temporal.
    const points: WBPoint[] = (result.rows as any[])
      .map((r) => ({ date: r.date, value: r.value }))
      .filter((p) => p.value != null)
      .sort((a, b) => a.date.localeCompare(b.date))
    const last = points.length > 0 ? points[points.length - 1] : null

    const out: WBSeriesResult = {
      ok: true,
      indicator,
      country,
      source: result.meta?.source?.value || 'World Bank',
      data_quality: quality('live', `World Bank · ${indicator}`),
      n_points: points.length,
      points,
      last,
    }
    return NextResponse.json(out)
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'unknown action',
      available: ['health', 'indicator/<id>', 'indicator/<id>/multi'],
    },
    { status: 400 },
  )
}
