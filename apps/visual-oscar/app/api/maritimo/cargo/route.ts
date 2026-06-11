/**
 * GET /api/maritimo/cargo?reporter=ESP&year=
 *
 * Capa de CARGO / MERCANCÍAS · qué se transporta por mar.
 *
 * Cruza el comercio declarado real (UN Comtrade · capítulos HS2 del reporter)
 * con un catálogo curado de tipos de carga marítima (contenedor, granel seco,
 * crudo, productos petrolíferos, GNL, GLP, químicos, ro-ro, reefer…).
 *
 * Envelope: { ok, data:{ por_categoria[], top_productos[], catalogo[] },
 *             error, fetched_at, source_url }
 *
 * Degradación honesta: HTTP 200 SIEMPRE. Si Comtrade falla, por_categoria y
 * top_productos quedan vacíos y ok=false, pero catalogo (seed) siempre va.
 * Cache 12h (datos oficiales de baja frecuencia).
 */
import { NextResponse } from 'next/server'
import { fetchCargoFlows } from '@/lib/maritimo/cargo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const url = new URL(req.url)
  const reporter = (url.searchParams.get('reporter') || 'ESP').toUpperCase()
  const yearParam = url.searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : undefined

  const fetched_at = new Date().toISOString()

  try {
    const result = await fetchCargoFlows(reporter, Number.isNaN(year as number) ? undefined : year)
    return NextResponse.json(
      {
        ok: result.ok,
        data: {
          reporter: result.reporter,
          reporter_iso: result.reporter_iso,
          year: result.year,
          por_categoria: result.por_categoria,
          top_productos: result.top_productos,
          catalogo: result.catalogo,
          data_quality: result.data_quality,
        },
        error: result.ok ? null : result.error ?? 'sin datos',
        fetched_at,
        source_url: result.source_url,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400',
        },
      },
    )
  } catch (e: any) {
    // HTTP 200 incluso en error inesperado · degrada honesto
    return NextResponse.json(
      {
        ok: false,
        data: { reporter, year: year ?? null, por_categoria: [], top_productos: [], catalogo: [] },
        error: String(e?.message ?? e).slice(0, 200),
        fetched_at,
        source_url: 'https://comtradeplus.un.org/',
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' },
      },
    )
  }
}
