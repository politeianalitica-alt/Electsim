/**
 * /api/tercer-sector/iati/orgs · Directorio de ONGD españolas reportantes.
 * Sprint Tercer Sector v3 · TS2-iati. Ver `lib/tercer-sector/iati-orgs.ts`.
 *
 * KEYLESS · usa el IATI Registry CKAN (no requiere IATI_API_KEY). Devuelve las
 * organizaciones publicadoras españolas con su identificador IATI y nº de
 * datasets, marcando las ONGD curadas (Oxfam Intermón, Acción contra el Hambre,
 * AECID, Cruz Roja, Save the Children, Cáritas, MSF, UNICEF-ES, Manos Unidas).
 *
 * Respuesta (HTTP 200 incluso degradado):
 *   { ok, data: IatiOrgsData|null, error?, fetched_at, source_url, _meta }
 *   Cada org: { slug, name, iati_ref, org_type, country, dataset_count,
 *               curated_spanish }.
 *
 * Cache: s-maxage=43200 (12h · el padrón de publishers cambia poco).
 */
import { NextResponse } from 'next/server'
import { fetchIatiOrgs } from '@/lib/tercer-sector/iati-orgs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  try {
    const res = await fetchIatiOrgs()
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'iati_registry',
          source_label: 'IATI Registry · CKAN (keyless)',
          env_hint: null,
          register_url: 'https://iatiregistry.org/',
          cache_ttl_seconds: 43200,
          note:
            'Directorio de ONGD españolas reportantes en IATI. Fuente keyless (Registry CKAN); funciona sin IATI_API_KEY. Marca curated_spanish para las grandes ONGD curadas.',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400',
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
        source_url: 'https://iatiregistry.org/',
      },
      { status: 200 },
    )
  }
}
