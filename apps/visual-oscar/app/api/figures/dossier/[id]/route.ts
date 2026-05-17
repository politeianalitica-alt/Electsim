/**
 * /api/figures/dossier/[id] — Dossier rico de una figura pública.
 *
 * Combina en paralelo:
 *   - Bio Wikipedia (REST API)
 *   - Noticias RSS recientes (50+ medios, 7 días)
 *   - Intervenciones parlamentarias (dataset Congreso)
 *   - Comisiones a las que pertenece (scraping composición real)
 *   - Conexiones con otras figuras (mismo partido, sector, etc.)
 *   - Sentimiento agregado y tendencia
 *   - Tags clave de cobertura
 */

import { NextRequest, NextResponse } from 'next/server'
import { buildFigureDossier } from '@/lib/figures/dossier'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id)
    const dossier = await buildFigureDossier(id)
    if (!dossier) return NextResponse.json(withMeta({ error: 'not_found' }, 'error'), { status: 404 })
    return NextResponse.json(withMeta(dossier, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
