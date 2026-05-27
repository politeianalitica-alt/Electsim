/**
 * /api/esios/indicator/[slug] · proxy a un indicador ESIOS por slug del catálogo.
 *
 * Acepta:
 *   GET /api/esios/indicator/pvpc                      · últimas 24h Península
 *   GET /api/esios/indicator/pvpc?hours=48             · 48h hacia atrás
 *   GET /api/esios/indicator/pvpc?geo=8742             · cambiar a Canarias
 *   GET /api/esios/indicator/pvpc?start=2026-05-27&end=2026-05-28 · rango custom
 *
 * Devuelve siempre `{ ok, indicator: { ... values: [...] }, meta }`.
 * Si ESIOS_API_KEY no está, `ok: false, error: 'no_key'`.
 *
 * Cache: s-maxage=600 (10 min · datos horarios cambian raramente intra-hora).
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchEsiosIndicator } from '@/lib/esios/client'
import { ESIOS_CATALOG, type EsiosSlug } from '@/lib/esios/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const slug = params.slug as EsiosSlug
  const item = ESIOS_CATALOG[slug]
  if (!item) {
    return NextResponse.json({
      ok: false,
      error: `slug_unknown · disponibles: ${Object.keys(ESIOS_CATALOG).slice(0, 10).join(', ')}…`,
      available_slugs: Object.keys(ESIOS_CATALOG),
    }, { status: 400 })
  }

  const { searchParams } = req.nextUrl
  const hours = Number(searchParams.get('hours') || 24)
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')
  const geo = Number(searchParams.get('geo') || item.geo_default)

  // Si no se pasan fechas explícitas, usamos last N hours hasta D+1
  const now = new Date()
  const start = startParam || new Date(now.getTime() - hours * 3600_000).toISOString().slice(0, 16)
  const end = endParam || new Date(now.getTime() + 24 * 3600_000).toISOString().slice(0, 16)

  const result = await fetchEsiosIndicator(item.id, {
    startDate: start,
    endDate: end,
    geoIds: [geo],
  })

  return NextResponse.json({
    ...result,
    meta: {
      slug: item.slug,
      label: item.label,
      short: item.short,
      unit: item.unit,
      frequency: item.frequency,
      category: item.category,
      use_case: item.use_case,
      geo_id: geo,
      higher_is_worse: item.higher_is_worse,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
  })
}
