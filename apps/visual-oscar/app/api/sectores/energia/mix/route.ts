/**
 * GET /api/sectores/energia/mix?days=7
 * Mix de generación por tecnología (REE).
 *
 * El feed de REE devuelve 14 tecnologías individuales + 1 serie agregada
 * "Generación total" (composite=true). Esta última se EXCLUYE de items
 * para no duplicar el total.
 *
 * Cada item se enriquece con:
 *   - bucket: 'Renovable' | 'No-Renovable' (del campo type oficial REE)
 *   - pct sobre total real de tecnologías individuales
 */
import { NextRequest, NextResponse } from 'next/server'
import { mixGeneracion } from '@/lib/sources/ree'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const days = clamp(Number(req.nextUrl.searchParams.get('days') || 7), 1, 90)
  const r = await mixGeneracion(days)
  if (!r.ok) return NextResponse.json({ error: r.error, series: [] }, { status: 200 })

  // Filtrar agregados (composite=true) y series con type "Generación total"
  // y "Demanda b.c." que pueden venir mezcladas en algunos endpoints REE.
  const tecnologias = r.series.filter(s =>
    !s.composite &&
    s.type !== 'Generación total' &&
    s.type !== 'Demanda b.c.' &&
    (s.type === 'Renovable' || s.type === 'No-Renovable')
  )

  // total real (suma de tecnologías individuales)
  const items = tecnologias.map(s => ({
    tecnologia: s.title,
    color: s.color,
    bucket: s.type as 'Renovable' | 'No-Renovable',
    total_mwh: Math.round(s.total || 0),
  })).filter(i => i.total_mwh > 0)
    .sort((a, b) => b.total_mwh - a.total_mwh)

  const total = items.reduce((acc, i) => acc + i.total_mwh, 0)
  const totalRenov = items
    .filter(i => i.bucket === 'Renovable')
    .reduce((s, i) => s + i.total_mwh, 0)
  const totalNoRenov = items
    .filter(i => i.bucket === 'No-Renovable')
    .reduce((s, i) => s + i.total_mwh, 0)

  // composite "Generación total" oficial de REE para verificación
  const gtotal = r.series.find(s => s.composite && /Generación total/i.test(s.title || ''))
  const total_oficial_mwh = Math.round(gtotal?.total || 0)

  return NextResponse.json({
    items: items.map(i => ({
      ...i,
      pct: total ? Math.round((i.total_mwh / total) * 1000) / 10 : 0,
    })),
    total_mwh: total,
    total_oficial_mwh,                // referencia REE composite (debe coincidir)
    renovable_mwh: totalRenov,
    no_renovable_mwh: totalNoRenov,
    renovable_pct: total ? Math.round((totalRenov / total) * 1000) / 10 : 0,
    no_renovable_pct: total ? Math.round((totalNoRenov / total) * 1000) / 10 : 0,
    days,
    fuente: 'Red Eléctrica de España · estructura-generacion (composite excluido)',
  }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
