/**
 * /api/tercer-sector/iati/top-flows · Top flujos donante→receptor por importe.
 * Sprint IATI-MAX. Ver `lib/tercer-sector/iati-enriched.ts`.
 *
 * Query:
 *   - ?year_from=2022, ?year_to=2025  → ventana temporal
 *   - ?top_n=20                       → cuántos flujos devolver (default 20)
 *
 * Devuelve: lista ordenada de flujos ONGD ES → país receptor con suma EUR.
 *
 * Auth: requiere IATI_API_KEY. Cache 6h.
 */
import { NextResponse } from 'next/server'
import { fetchIatiTopFlows } from '@/lib/tercer-sector/iati-enriched'

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
  const year_from = parseIntSafe(searchParams.get('year_from'), currentYear - 3, 2000, currentYear)
  const year_to = parseIntSafe(searchParams.get('year_to'), currentYear, year_from, currentYear)
  const top_n = parseIntSafe(searchParams.get('top_n'), 20, 5, 50)

  try {
    const res = await fetchIatiTopFlows({ year_from, year_to, top_n })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'iati_datastore',
          source_label: 'IATI Datastore · top flows',
          env_hint: 'IATI_API_KEY',
          cache_ttl_seconds: 21600,
          note:
            'Top flujos donante→receptor por importe EUR. Solo valores en EUR (no inventamos FX).',
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
