/**
 * GET /api/news/desinformacion
 * Agregador de fact-checkers · EFE Verifica + Newtral + Maldita.
 *
 * Parámetros:
 *   limit = 60       (máx 100)
 *   q     = string   (buscador texto)
 *   v     = veredicto filtrar
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDesinformacionFeed } from '@/lib/news/desinformacion'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(100, Number(sp.get('limit') || 60))
  const q = (sp.get('q') || '').toLowerCase().trim()
  const v = sp.get('v')

  const report = await getDesinformacionFeed(limit)

  let items = report.items
  if (q) items = items.filter(i =>
    i.titulo.toLowerCase().includes(q) ||
    i.descripcion.toLowerCase().includes(q) ||
    i.actoresAfectados.some(a => a.toLowerCase().includes(q)),
  )
  if (v) items = items.filter(i => i.veredicto === v)

  return NextResponse.json(
    { ...report, items, queryAplicada: { q, v, limit } },
    { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=900' } },
  )
}
