/**
 * /api/legislativo/commissions — Hub de comisiones.
 *
 * Fuentes:
 *   - Congreso (enumerada · legislatura XV)
 *   - Senado (opendata XML)
 *
 * Filtros:
 *   ?camara=congreso|senado|mixta|autonomico
 *   ?kind=permanente|no-permanente|investigacion|mixta|subcomision|ponencia
 *   ?investigation=true → solo de investigación
 *   ?active=true|false  (default true)
 *   ?q=texto-libre
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllCommissions } from '@/lib/legislative/aggregator'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const camara = params.get('camara')
  const kind = params.get('kind')
  const investigation = params.get('investigation')
  const activeOnly = params.get('active') !== 'false'
  const q = (params.get('q') || '').toLowerCase().trim()

  try {
    const { commissions, stats } = await getAllCommissions()
    let filtered = commissions

    if (activeOnly) filtered = filtered.filter(c => c.active)
    if (camara) filtered = filtered.filter(c => c.camara === camara)
    if (kind) filtered = filtered.filter(c => c.kind === kind)
    if (investigation === 'true') filtered = filtered.filter(c => c.isInvestigation)
    if (investigation === 'false') filtered = filtered.filter(c => !c.isInvestigation)
    if (q) filtered = filtered.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.codigo.toLowerCase().includes(q)
    )

    // Ordenar: investigación primero, luego por nombre
    filtered.sort((a, b) => {
      if (a.isInvestigation !== b.isInvestigation) return a.isInvestigation ? -1 : 1
      return a.nombre.localeCompare(b.nombre, 'es')
    })

    return NextResponse.json(withMeta({
      items: filtered,
      stats,
      total: filtered.length,
    }, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({
      items: [],
      stats: { total: 0, porCamara: {}, porKind: {}, investigacion: 0, fetchedAt: new Date().toISOString() },
      total: 0,
      error: String(e),
    }, 'error'))
  }
}
