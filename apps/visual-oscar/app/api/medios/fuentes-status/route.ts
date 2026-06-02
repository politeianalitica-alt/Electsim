/**
 * GET /api/medios/fuentes-status · estado del catálogo de fuentes.
 *
 * Sprint 0.4: reporta el catálogo source-catalog.json (20 fuentes activas).
 * Sprint 1.1+: lee tabla source_health con métricas reales (lastSuccessfulFetch,
 * articlesLastRun, noiseFlaggedLastRun, errores) y combina con catálogo.
 */
import { NextResponse } from 'next/server'
import { loadSourceCatalog } from '@/lib/medios/canonical/catalogs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const sources = await loadSourceCatalog()
  const sourcesList = sources.map((s) => ({
    sourceId: s.id,
    domain: s.domain,
    tier: s.tier,
    lastSuccessfulFetch: null as string | null,
    lastErrorCode: null as string | null,
    articlesLastRun: 0,
    newArticlesLastRun: 0,
    noiseFlaggedLastRun: 0,
    status: (s.active ? 'alive' : 'inactive') as 'alive' | 'inactive' | 'errored' | 'stale',
  }))
  const summary = {
    total: sources.length,
    alive: sourcesList.filter((s) => s.status === 'alive').length,
    errored: 0,
    stale: 0,
  }
  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      summary,
      sources: sourcesList,
      _note: 'Sprint 1.1+ lee tabla source_health con métricas reales',
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  )
}
