/**
 * /api/tercer-sector/iati/codelists · Proxy cacheado de codelists IATI.
 * Sprint Tercer Sector v3 · TS2-iati. Ver `lib/tercer-sector/iati-codelists.ts`.
 *
 * KEYLESS · descarga y cachea los diccionarios oficiales de IATI para mapear
 * códigos → nombres: Sector (DAC 5 dígitos) y Country (ISO-2). Lo usan tanto el
 * resto de endpoints de esta capa (para resolver nombres) como la UI (para
 * pintar selectores de sector/país sin hardcodear).
 *
 * Respuesta (HTTP 200 incluso degradado):
 *   { ok, data: CodelistsData|null, error?, fetched_at, source_url, _meta }
 *   data: { sectors: {code→entry}, countries: {code→entry}, counts }.
 *
 * Cache: s-maxage=86400 (24h · los codelists casi nunca cambian).
 */
import { NextResponse } from 'next/server'
import { fetchCodelists } from '@/lib/tercer-sector/iati-codelists'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  try {
    const res = await fetchCodelists()
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'iati_codelists',
          source_label: 'IATI Codelists · clv3 (keyless)',
          env_hint: null,
          register_url: 'https://iatistandard.org/en/iati-standard/203/codelists/',
          cache_ttl_seconds: 86400,
          note:
            'Diccionarios IATI Sector (DAC) y Country (ISO-2) para mapear códigos a nombres. Fuente keyless; funciona sin IATI_API_KEY.',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
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
        source_url: 'https://iatistandard.org/en/iati-standard/203/codelists/',
      },
      { status: 200 },
    )
  }
}
