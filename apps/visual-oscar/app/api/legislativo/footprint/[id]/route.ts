/**
 * /api/legislativo/footprint/[id] — Huella legislativa de una iniciativa.
 *
 * Devuelve actores con presencia identificada (lobbies, instituciones, expertos),
 * enmiendas previsibles por grupo parlamentario, y audiencias.
 */

import { NextRequest, NextResponse } from 'next/server'
import { findInitiative } from '@/lib/legislative/aggregator'
import { buildFootprint } from '@/lib/legislative/footprint'
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
    const footprint = buildFootprint(init)
    return NextResponse.json(withMeta(footprint, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
