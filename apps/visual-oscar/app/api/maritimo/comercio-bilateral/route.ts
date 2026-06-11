/**
 * /api/maritimo/comercio-bilateral · Capa de COMERCIO BILATERAL entre países.
 *
 * Alimenta arcos del mapa marítimo + Sankey reporter→partner + tablas de
 * top socios y balanza. Reutiliza la integración UN Comtrade ya existente
 * (keyless / subscription-key) con fallback a OEC (público).
 *
 * GET ?reporter=ESP&partner=&year=
 *   - reporter (alpha-3 | ISO numeric | nombre). Default ESP.
 *   - partner  (opcional). Si se da → flujos de esa pareja; si no → top socios.
 *   - year     (opcional). Default último año cerrado (actual − 1).
 *
 * Envelope:
 *   {
 *     ok,
 *     data: { reporter, top_export[], top_import[], balanza, pares[] },
 *     error,
 *     fetched_at,
 *     source_url
 *   }
 *
 * HTTP 200 SIEMPRE (degrada honesto). Cache: s-maxage=21600 (6 h).
 */
import { NextResponse } from 'next/server'
import { buildBilateralResult } from '@/lib/maritimo/comercio-bilateral'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const CACHE = 'public, s-maxage=21600, stale-while-revalidate=43200'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const reporter = (url.searchParams.get('reporter') || 'ESP').trim()
  const partnerRaw = (url.searchParams.get('partner') || '').trim()
  const partner = partnerRaw ? partnerRaw : null
  const yearRaw = url.searchParams.get('year')
  const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : undefined

  const fetched_at = new Date().toISOString()

  try {
    const result = await buildBilateralResult(reporter, partner, year)
    return NextResponse.json(
      {
        ok: result.ok,
        data: {
          reporter: result.reporter,
          partner: result.partner,
          year: result.year,
          top_export: result.top_export,
          top_import: result.top_import,
          balanza: result.balanza,
          pares: result.pares,
          source: result.source,
        },
        error: result.ok ? null : (result.error ?? 'sin datos'),
        fetched_at,
        source_url: result.source_url,
      },
      { headers: { 'Cache-Control': CACHE } },
    )
  } catch (e: any) {
    // Degradación honesta · nunca lanzamos 500.
    return NextResponse.json(
      {
        ok: false,
        data: {
          reporter: reporter.toUpperCase(),
          partner: partner ? partner.toUpperCase() : null,
          year: year ?? new Date().getFullYear() - 1,
          top_export: [],
          top_import: [],
          balanza: {
            exports_usd: 0,
            imports_usd: 0,
            balance_usd: 0,
            exports_fmt: '—',
            imports_fmt: '—',
            balance_fmt: '—',
          },
          pares: [],
          source: 'none',
        },
        error: String(e?.message ?? e).slice(0, 200),
        fetched_at,
        source_url: 'https://comtradeplus.un.org',
      },
      { headers: { 'Cache-Control': CACHE } },
    )
  }
}
