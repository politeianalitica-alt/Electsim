/**
 * /api/tercer-sector/iati/sector-deep-dive/[sector] · Sector DAC en profundidad.
 * Sprint IATI-MAX. Ver `lib/tercer-sector/iati-enriched.ts`.
 *
 * Path param:
 *   sector → código DAC (5 dígitos, ej. 12220 = Basic health care).
 *
 * Devuelve: total actividades ES en el sector, total desembolsado EUR, top
 * países receptores y top ONGD ejecutoras.
 *
 * Auth: requiere IATI_API_KEY. Cache 6h.
 */
import { NextResponse } from 'next/server'
import { fetchIatiSectorDeepDive } from '@/lib/tercer-sector/iati-enriched'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(
  _req: Request,
  ctx: { params: { sector: string } | Promise<{ sector: string }> },
) {
  const p = await (ctx.params as Promise<{ sector: string }>)
  const sector = decodeURIComponent(p?.sector ?? '').trim()

  try {
    const res = await fetchIatiSectorDeepDive(sector)
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'iati_datastore',
          source_label: 'IATI Datastore · sector deep dive',
          env_hint: 'IATI_API_KEY',
          cache_ttl_seconds: 21600,
          note: 'Actividades ES en un sector DAC (5 dígitos), con países, ONGD e importes.',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200' } },
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
