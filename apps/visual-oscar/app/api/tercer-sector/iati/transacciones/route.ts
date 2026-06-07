/**
 * /api/tercer-sector/iati/transacciones · Desembolsos IATI + timeline.
 * Sprint Tercer Sector v3 · TS2-iati. Ver `lib/tercer-sector/iati-datastore.ts`.
 *
 * Query:
 *   - ?reporting_org=ES-CIF-G58236803 → org reportante (default: ONGD ES curadas)
 *   - ?recipient_country=ET  → país receptor (ISO-2 DAC)
 *   - ?type_code=3           → tipo de transacción (default 3 = desembolso)
 *   - ?granularity=year|month → granularidad de la serie (default year)
 *   - ?rows=N                → muestra de transacciones (default 500, clamp 1-1000)
 *
 * Respuesta (HTTP 200 incluso degradado):
 *   { ok, data: IatiTransactionsData|null, error?, fetched_at, source_url, _meta }
 *   data.timeline: serie temporal agregada de desembolsos EUR comparables.
 *
 * Auth: requiere IATI_API_KEY (Datastore). Sin ella → { ok:false, error:'no_key' }.
 * Cache: s-maxage=21600 (6h).
 */
import { NextResponse } from 'next/server'
import { fetchIatiTransactions } from '@/lib/tercer-sector/iati-datastore'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const reporting_org = searchParams.get('reporting_org')
  const recipient_country = searchParams.get('recipient_country')
  const type_code = searchParams.get('type_code')
  const granularity = searchParams.get('granularity') === 'month' ? 'month' : 'year'

  const rowsRaw = parseInt(searchParams.get('rows') || '500', 10)
  const rows = Number.isFinite(rowsRaw) ? Math.max(1, Math.min(1000, rowsRaw)) : 500

  try {
    const res = await fetchIatiTransactions({
      reporting_org,
      recipient_country,
      type_code,
      granularity,
      rows,
    })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'iati_datastore',
          source_label: 'IATI Datastore · transaction core',
          env_hint: 'IATI_API_KEY',
          register_url: 'https://developer.iatistandard.org/',
          cache_ttl_seconds: 21600,
          note:
            'Desembolsos IATI (transaction_type 3) por org/país con serie temporal. Requiere IATI_API_KEY. El timeline agrega solo valores en EUR (mínimo comparable; no se inventa FX).',
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
