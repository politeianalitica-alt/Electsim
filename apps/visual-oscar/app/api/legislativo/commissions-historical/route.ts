/**
 * /api/legislativo/commissions-historical
 *
 * Comisiones de legislaturas anteriores del Congreso (IX-XIV).
 *
 * Query:
 *   ?legislatura=XIV|XIII|XII|XI|X|IX  (obligatorio)
 *   ?investigation=true|false
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchHistoricalCommissions, type Legislatura, HISTORICAL_LEGISLATURAS } from '@/lib/legislative/congreso-historical'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const legislatura = params.get('legislatura') as Legislatura | null
  const investigation = params.get('investigation')

  if (!legislatura || !HISTORICAL_LEGISLATURAS.includes(legislatura)) {
    return NextResponse.json(withMeta({
      error: 'invalid_legislatura',
      valid: HISTORICAL_LEGISLATURAS,
    }, 'error'), { status: 400 })
  }

  try {
    let items = await fetchHistoricalCommissions(legislatura)
    if (investigation === 'true') items = items.filter(c => c.isInvestigation)
    if (investigation === 'false') items = items.filter(c => !c.isInvestigation)
    items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

    return NextResponse.json(withMeta({
      legislatura,
      items,
      total: items.length,
    }, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
