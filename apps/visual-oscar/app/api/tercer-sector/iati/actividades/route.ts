/**
 * /api/tercer-sector/iati/actividades · Actividades IATI filtradas.
 * Sprint Tercer Sector v3 · TS2-iati. Ver `lib/tercer-sector/iati-datastore.ts`.
 *
 * Query:
 *   - ?recipient_country=ET  → país receptor (ISO-2 DAC)
 *   - ?reporting_org=ES-CIF-G58236803 → org reportante (iati-identifier)
 *   - ?sector=12220          → sector DAC (5 dígitos)
 *   - ?rows=N                → tamaño página (default 50, clamp 1-1000)
 *   - ?start=N               → offset paginación (default 0)
 *   Sin filtros → acota a las ONGD españolas curadas.
 *
 * Respuesta (HTTP 200 incluso degradado):
 *   { ok, data: IatiActivitiesData|null, error?, fetched_at, source_url, _meta }
 *   Cada actividad: { id, title, reporting_org_ref/name, recipient_countries[],
 *                     sectors[], amount_eur, status }.
 *
 * Auth: requiere IATI_API_KEY (Datastore). Sin ella → { ok:false, error:'no_key' }.
 * Cache: s-maxage=21600 (6h).
 */
import { NextResponse } from 'next/server'
import { fetchIatiActivities } from '@/lib/tercer-sector/iati-datastore'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const recipient_country = searchParams.get('recipient_country')
  const reporting_org = searchParams.get('reporting_org')
  const sector = searchParams.get('sector')

  const rowsRaw = parseInt(searchParams.get('rows') || '50', 10)
  const rows = Number.isFinite(rowsRaw) ? Math.max(1, Math.min(1000, rowsRaw)) : 50
  const startRaw = parseInt(searchParams.get('start') || '0', 10)
  const start = Number.isFinite(startRaw) ? Math.max(0, startRaw) : 0

  try {
    const res = await fetchIatiActivities({
      recipient_country,
      reporting_org,
      sector,
      rows,
      start,
    })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'iati_datastore',
          source_label: 'IATI Datastore · activity core',
          env_hint: 'IATI_API_KEY',
          register_url: 'https://developer.iatistandard.org/',
          cache_ttl_seconds: 21600,
          note:
            'Actividades IATI filtradas por país receptor / org reportante / sector DAC. Requiere IATI_API_KEY. amount_eur solo se rellena si el presupuesto está en EUR (no se inventa FX).',
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
