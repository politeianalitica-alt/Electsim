/**
 * /api/legislativo/traceability/[id] — Trazabilidad completa de una iniciativa.
 *
 * Devuelve el timeline cronológico de pasos de la iniciativa, combinando:
 *   - Estado actual de la iniciativa (real)
 *   - Pasos completados y pendientes (sintetizados desde el estado)
 *   - Fechas reales conocidas
 */

import { NextRequest, NextResponse } from 'next/server'
import { findInitiative } from '@/lib/legislative/aggregator'
import { buildTraceability } from '@/lib/legislative/traceability'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const init = await findInitiative(decodeURIComponent(params.id))
    if (!init) {
      return NextResponse.json(withMeta({ error: 'not_found' }, 'error'), { status: 404 })
    }
    const trace = await buildTraceability(init)
    return NextResponse.json(withMeta(trace, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
