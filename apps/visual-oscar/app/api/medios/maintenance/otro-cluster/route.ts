/**
 * GET /api/medios/maintenance/otro-cluster · Sprint 2 C8.
 *
 * Devuelve el reporte de clusters TF-IDF computados sobre los artículos
 * con `categoria='OTRO'` (legacy column · equivale a topic_id='OTRO' en
 * el modelo canónico) de las últimas 12h. Cada cluster lleva top_terms,
 * sample_articles y cluster_size para curación humana.
 *
 * Consumidores:
 *   - UI futura (Sprint 3+): panel "OTRO clusters" en /estudio para
 *     identificar subtemas recurrentes que justifiquen nuevas reglas
 *     heurísticas en topic-rules.json o nuevos rss-tag mappings.
 *   - Cron Vercel: lo invoca cada 12h vía
 *     /api/cron/medios-mantenimiento → termsNotClassifiedJob() registrado
 *     en maintenance/index.ts (este endpoint sirve la lectura on-demand).
 *
 * Cache: 5 min (s-maxage=300, stale-while-revalidate=600).
 */
import { NextResponse } from 'next/server'
import { jobOtroCluster } from '@/lib/medios/canonical/maintenance/otro-cluster'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const report = await jobOtroCluster()
  return NextResponse.json(report, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
