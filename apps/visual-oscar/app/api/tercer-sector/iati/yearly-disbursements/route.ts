/**
 * /api/tercer-sector/iati/yearly-disbursements · Heatmap años × países.
 * Sprint IATI-MAX. Ver `lib/tercer-sector/iati-enriched.ts`.
 *
 * Query:
 *   - ?year_from=2015, ?year_to=2025      → ventana
 *   - ?reporting_org=ES-CIF-G58236803     → opcional (acota a una ONGD)
 *   - ?top_n_countries=15                 → top países por importe acumulado
 *
 * Devuelve:
 *   data.points[]      → (year, country_code, country_name, value_eur, count)
 *   data.years[]       → años cubiertos
 *   data.top_countries[] → top-N receptores por importe acumulado
 *
 * Auth: requiere IATI_API_KEY. Cache 6h.
 */
import { NextResponse } from 'next/server'
import { fetchIatiYearlyDisbursements } from '@/lib/tercer-sector/iati-enriched'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

function parseIntSafe(s: string | null, fallback: number, min: number, max: number): number {
  if (!s) return fallback
  const n = parseInt(s, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const currentYear = new Date().getUTCFullYear()
  const year_from = parseIntSafe(searchParams.get('year_from'), 2015, 2000, currentYear)
  const year_to = parseIntSafe(searchParams.get('year_to'), currentYear, year_from, currentYear)
  const top_n_countries = parseIntSafe(searchParams.get('top_n_countries'), 15, 3, 50)
  const reporting_org = searchParams.get('reporting_org')

  try {
    const res = await fetchIatiYearlyDisbursements({
      reporting_org,
      year_from,
      year_to,
      top_n_countries,
    })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'iati_datastore',
          source_label: 'IATI Datastore · yearly disbursements heatmap',
          env_hint: 'IATI_API_KEY',
          cache_ttl_seconds: 21600,
          note:
            'Heatmap de desembolsos EUR por (año × país). Solo valores en EUR comparables (no FX).',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source_url: 'https://iatistandard.org/',
      },
      { status: 200 },
    )
  }
}
