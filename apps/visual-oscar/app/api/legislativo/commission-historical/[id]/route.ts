/**
 * /api/legislativo/commission-historical/[id]
 *
 * Detalle de comisión de legislatura histórica.
 * ID formato: cgr-XIV-301
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchHistoricalComposition, type Legislatura, HISTORICAL_LEGISLATURAS } from '@/lib/legislative/congreso-historical'
import { groupInfo } from '@/lib/legislative/congreso'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id)
    // Formato: cgr-XIV-301
    const match = id.match(/^cgr-(IX|X|XI|XII|XIII|XIV|XV)-(\d+)$/)
    if (!match) {
      return NextResponse.json(withMeta({ error: 'invalid_id_format' }, 'error'), { status: 400 })
    }
    const legislatura = match[1] as Legislatura
    const codigo = match[2]
    if (!HISTORICAL_LEGISLATURAS.includes(legislatura)) {
      return NextResponse.json(withMeta({ error: 'invalid_legislatura' }, 'error'), { status: 400 })
    }

    // Probar varios organoSup (1=Permanentes, 152=Investigación, 157=Mixtas)
    let composition = null
    for (const sup of ['1', '152', '157']) {
      composition = await fetchHistoricalComposition(codigo, legislatura, sup)
      if (composition && composition.total > 0) break
    }

    const groupSummary = composition
      ? Object.entries(composition.byGroup).map(([siglas, n]) => ({
          siglas, ...groupInfo(siglas), n,
        })).sort((a, b) => b.n - a.n)
      : []

    return NextResponse.json(withMeta({
      legislatura,
      codigo,
      composition,
      groupSummary,
    }, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
