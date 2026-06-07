/**
 * /api/tercer-sector/iati/country-deep-dive/[iso] · País receptor en profundidad.
 * Sprint IATI-MAX. Ver `lib/tercer-sector/iati-enriched.ts`.
 *
 * Path param:
 *   iso → ISO-2 del país receptor (ej. ET, CO, MA).
 *
 * Devuelve: total actividades ES en ese país, desembolsado EUR, top sectores
 * DAC y top ONGD ejecutoras.
 *
 * Auth: requiere IATI_API_KEY. Cache 6h.
 */
import { NextResponse } from 'next/server'
import { fetchIatiCountryDeepDive } from '@/lib/tercer-sector/iati-enriched'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(
  _req: Request,
  ctx: { params: { iso: string } | Promise<{ iso: string }> },
) {
  const p = await (ctx.params as Promise<{ iso: string }>)
  const iso = decodeURIComponent(p?.iso ?? '').trim()

  try {
    const res = await fetchIatiCountryDeepDive(iso)
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'iati_datastore',
          source_label: 'IATI Datastore · country deep dive',
          env_hint: 'IATI_API_KEY',
          cache_ttl_seconds: 21600,
          note: 'Actividades ES en un país receptor, con sectores, ONGD e importes EUR.',
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
