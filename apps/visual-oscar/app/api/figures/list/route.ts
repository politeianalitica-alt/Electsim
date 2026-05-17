/**
 * /api/figures/list — Catálogo expandido de figuras públicas.
 *
 * Combina políticos + empresarios + medios + lobbies + consultoras + fondos
 * + institucionales + académicos.
 *
 * Query:
 *   ?category=politico|empresario|...
 *   ?minInfluencia=N
 *   ?search=term
 */

import { NextRequest, NextResponse } from 'next/server'
import { getExpandedCatalog, getIbexCeosCatalog } from '@/lib/figures/catalog'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const category = params.get('category')
  const minInf = Number(params.get('minInfluencia') || 0)
  const q = (params.get('search') || '').toLowerCase()
  const includeIbex = params.get('ibex') !== 'false'

  try {
    const catalog = [...getExpandedCatalog(), ...(includeIbex ? getIbexCeosCatalog() : [])]
    let items = catalog
    if (category) items = items.filter(f => f.category === category)
    if (minInf > 0) items = items.filter(f => f.influencia >= minInf)
    if (q) items = items.filter(f =>
      f.nombre.toLowerCase().includes(q) ||
      f.organizacion.toLowerCase().includes(q) ||
      (f.afiliacion || '').toLowerCase().includes(q) ||
      f.tags.some(t => t.toLowerCase().includes(q))
    )
    items.sort((a, b) => b.influencia - a.influencia)

    const porCategoria: Record<string, number> = {}
    for (const f of items) porCategoria[f.category] = (porCategoria[f.category] || 0) + 1

    return NextResponse.json(withMeta({
      items,
      stats: {
        total: items.length,
        porCategoria,
        fetchedAt: new Date().toISOString(),
      },
    }, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
