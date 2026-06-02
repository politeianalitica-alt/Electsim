/**
 * GET /api/medios/maintenance/unmapped-tags · Sprint 2 C7.
 *
 * Devuelve el reporte de RSS tags vistos en `article.raw_tags` en las
 * últimas 6h que NO están en `data/medios/rss-tag-map.json`, ordenados
 * por frecuencia. Top 50.
 *
 * Consumidores:
 *   - UI futura (Sprint 3+): panel "Tags no clasificados" en /estudio
 *     para curación humana.
 *   - Cron Vercel: lo invoca cada 6h vía
 *     /api/cron/medios-mantenimiento → unmappedTagsJob() registrado en
 *     maintenance/index.ts (este endpoint sirve la lectura on-demand).
 *
 * Cache: 5 min (s-maxage=300, stale-while-revalidate=600).
 */
import { NextResponse } from 'next/server'
import { jobUnmappedTags } from '@/lib/medios/canonical/maintenance/unmapped-tags'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const report = await jobUnmappedTags()
  return NextResponse.json(report, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
