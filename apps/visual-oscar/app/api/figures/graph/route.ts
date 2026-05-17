/**
 * /api/figures/graph — Grafo de figuras públicas con relaciones múltiples.
 *
 * Query:
 *   ?categories=politico,empresario,...
 *   ?minInfluencia=50           default 0
 *   ?withCommissionEdges=true   incluye edges desde composición real comisiones (lento, 30s+)
 */

import { NextRequest, NextResponse } from 'next/server'
import { buildFigureGraph } from '@/lib/figures/graph'
import type { FigureCategory } from '@/lib/figures/types'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const categoriesRaw = params.get('categories')
  const categories = categoriesRaw ? categoriesRaw.split(',') as FigureCategory[] : undefined
  const minInfluencia = Number(params.get('minInfluencia') || 0)
  const withCommissionEdges = params.get('withCommissionEdges') === 'true'

  try {
    const graph = await buildFigureGraph({ categories, minInfluencia, withCommissionEdges })
    return NextResponse.json(withMeta(graph, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
