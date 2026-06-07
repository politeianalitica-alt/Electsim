/**
 * /api/tercer-sector/iati/overview · Visión España de la cooperación IATI.
 * Sprint Tercer Sector v3 · TS2-iati. Ver `lib/tercer-sector/iati-overview.ts`.
 *
 * Devuelve: nº de actividades, total desembolsado (EUR comparable), top países
 * receptores, top sectores DAC y top organizaciones reportantes.
 *
 * Modos:
 *   - CON IATI_API_KEY  → mode:'datastore' (facetas reales del Solr).
 *   - SIN IATI_API_KEY  → mode:'registry', degraded:true (ONGD reportantes del
 *     Registry keyless; país/sector/desembolsos requieren el Datastore).
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso degradado):
 *   { ok, data: IatiOverviewData|null, degraded?, degraded_reason?, error?,
 *     fetched_at, source_url, _meta }
 *
 * Cache: s-maxage=21600 (6h · datos IATI ~mensuales).
 * NO existe colisión con /api/iati/spain-overview (módulo legacy, shape distinto).
 */
import { NextResponse } from 'next/server'
import { buildIatiOverview } from '@/lib/tercer-sector/iati-overview'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  try {
    const res = await buildIatiOverview()
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'iati',
          source_label: 'IATI · International Aid Transparency Initiative',
          env_hint: 'IATI_API_KEY',
          register_url: 'https://developer.iatistandard.org/',
          cache_ttl_seconds: 21600,
          note:
            'Cooperación internacional española vía IATI. Con IATI_API_KEY usa el Datastore (facetas país/sector/org + desembolsos EUR); sin ella degrada al Registry keyless. Los totales EUR son un mínimo comparable (no se inventa FX).',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
        },
      },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source_url: 'https://iatistandard.org/',
      },
      { status: 200 },
    )
  }
}
