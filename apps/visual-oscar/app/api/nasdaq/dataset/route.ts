/**
 * /api/nasdaq/dataset · proxy genérico a Nasdaq Data Link.
 *
 * Acepta:
 *   ?slug=opec_oil                · descarga uno del catálogo curado
 *   ?database=OPEC&dataset=ORB    · descarga arbitrario
 *
 * Parámetros opcionales:
 *   ?rows=100                     · default 100
 *   ?start_date=2020-01-01
 *   ?end_date=2026-05-27
 *   ?collapse=monthly             · daily | weekly | monthly | quarterly | annual
 *   ?order=desc                   · default desc (más recientes primero)
 *
 * Devuelve siempre `{ ok: bool, ... }`. Si falta NASDAQ_DATA_LINK_KEY,
 * `ok=false` y `error='no_key'` para que el frontend pueda mostrar
 * estado "needs_config" en lugar de fallar silenciosamente.
 *
 * Cache: s-maxage=21600 (6h) · datos diarios/mensuales no cambian intra-día.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  fetchNasdaqDataset,
  NASDAQ_CURATED,
  type NasdaqCuratedSlug,
} from '@/lib/nasdaq/data-link'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  // ── Modo 1 · slug del catálogo curado
  const slug = searchParams.get('slug')
  if (slug) {
    const entry = NASDAQ_CURATED[slug as NasdaqCuratedSlug]
    if (!entry) {
      return NextResponse.json({
        ok: false,
        error: `slug_unknown · curated slugs disponibles: ${Object.keys(NASDAQ_CURATED).join(', ')}`,
      }, { status: 400 })
    }
    const result = await fetchNasdaqDataset({
      database: entry.database,
      dataset: entry.dataset,
      rows: Number(searchParams.get('rows') || 100),
      startDate: searchParams.get('start_date') || undefined,
      endDate: searchParams.get('end_date') || undefined,
      collapse: (searchParams.get('collapse') as any) || undefined,
      order: (searchParams.get('order') as any) || 'desc',
    })
    return NextResponse.json({
      ...result,
      label: entry.label,
      unit: entry.unit,
      use_case: entry.use_case,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  // ── Modo 2 · database + dataset arbitrarios
  const database = searchParams.get('database')
  const dataset = searchParams.get('dataset')
  if (!database || !dataset) {
    return NextResponse.json({
      ok: false,
      error: 'missing_params · usa ?slug=opec_oil o ?database=OPEC&dataset=ORB',
      curated_slugs: Object.keys(NASDAQ_CURATED),
    }, { status: 400 })
  }

  const result = await fetchNasdaqDataset({
    database,
    dataset,
    rows: Number(searchParams.get('rows') || 100),
    startDate: searchParams.get('start_date') || undefined,
    endDate: searchParams.get('end_date') || undefined,
    collapse: (searchParams.get('collapse') as any) || undefined,
    order: (searchParams.get('order') as any) || 'desc',
  })

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
  })
}
