/**
 * /api/legislativo/commission/[id] — Detalle real de una comisión.
 *
 * Obtiene en paralelo:
 *   - Metadata de la comisión (nombre, código, tipo)
 *   - Composición real (POST AJAX Congreso): miembros con cargo y grupo
 *   - Próxima convocatoria (scrape de página oficial)
 */

import { NextRequest, NextResponse } from 'next/server'
import { findCommission } from '@/lib/legislative/aggregator'
import { fetchCommissionComposition, fetchCommissionSchedule, inferOrganoSup, groupInfo } from '@/lib/legislative/congreso'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id)
    const c = await findCommission(id)
    if (!c) return NextResponse.json(withMeta({ error: 'not_found' }, 'error'), { status: 404 })

    // Solo Congreso tiene endpoint AJAX de composición
    if (c.camara !== 'congreso' && c.camara !== 'mixta') {
      return NextResponse.json(withMeta({
        commission: c,
        composition: null,
        schedule: null,
        groupSummary: [],
      }, 'live'))
    }

    const organoSup = inferOrganoSup(c)
    const [composition, schedule] = await Promise.all([
      fetchCommissionComposition(c.codigo, organoSup),
      fetchCommissionSchedule(c.codigo),
    ])

    const groupSummary = composition
      ? Object.entries(composition.byGroup).map(([siglas, n]) => ({
          siglas,
          ...groupInfo(siglas),
          n,
        })).sort((a, b) => b.n - a.n)
      : []

    return NextResponse.json(withMeta({
      commission: c,
      composition,
      schedule,
      groupSummary,
    }, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
