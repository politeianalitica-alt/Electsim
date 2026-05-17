/**
 * /api/legislativo/initiatives — TODAS las iniciativas en tramitación.
 *
 * Fuentes REALES:
 *   - Congreso de los Diputados (opendata JSON)
 *   - Senado (opendata XML)
 *   - 8+ Parlamentos autonómicos (RSS)
 *
 * Query params:
 *   ?ambito=nacional-congreso|nacional-senado|autonomico
 *   ?ccaa=madrid|cataluna|...
 *   ?materia=Económica|Social|...
 *   ?stage=registrado|comision|...
 *   ?q=texto-libre (busca en título)
 *   ?limit=N (default 200)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllInitiatives } from '@/lib/legislative/aggregator'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const ambito = params.get('ambito')
  const ccaa = params.get('ccaa')
  const materia = params.get('materia')
  const stage = params.get('stage')
  const q = (params.get('q') || '').toLowerCase().trim()
  const limit = Math.min(500, Math.max(10, Number(params.get('limit') || 200)))
  const onlyActive = params.get('only_active') !== 'false'

  try {
    const { initiatives, stats } = await getAllInitiatives()
    let filtered = initiatives

    if (onlyActive) {
      filtered = filtered.filter(it => it.stage !== 'rechazado' && it.stage !== 'caducado' && it.stage !== 'publicado')
    }
    if (ambito) filtered = filtered.filter(it => it.ambito === ambito)
    if (ccaa) filtered = filtered.filter(it => it.ccaa === ccaa)
    if (materia) filtered = filtered.filter(it => it.materia === materia)
    if (stage) filtered = filtered.filter(it => it.stage === stage)
    if (q) filtered = filtered.filter(it =>
      it.titulo.toLowerCase().includes(q) ||
      it.expediente.toLowerCase().includes(q) ||
      it.tags.some(t => t.includes(q))
    )

    // Orden por fecha más reciente
    filtered.sort((a, b) =>
      (new Date(b.fechaActualizacion || 0).getTime()) - (new Date(a.fechaActualizacion || 0).getTime())
    )

    const items = filtered.slice(0, limit)
    return NextResponse.json(withMeta({ items, stats, total: filtered.length, returned: items.length }, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({
      items: [],
      stats: { total: 0, porAmbito: {}, porKind: {}, porMateria: {}, porStage: {}, enTramitacion: 0, aprobadas: 0, fetchedAt: new Date().toISOString() },
      total: 0,
      returned: 0,
      error: String(e),
    }, 'error'))
  }
}
