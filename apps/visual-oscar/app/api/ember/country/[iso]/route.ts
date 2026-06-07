/**
 * /api/ember/country/[iso] · Sprint Energía S2
 *
 * Perfil energético completo de un país por código ISO-3: mix de generación
 * del último año (fuentes + agregados renovable/limpio/fósil), intensidad de
 * carbono, demanda eléctrica y serie histórica de % renovable.
 *
 * Ejemplo: GET /api/ember/country/ESP
 *
 * Respuesta (patrón ESIOS): `{ ok, data, fetched_at }`, HTTP 200 siempre.
 * Las sub-consultas (generación, carbono, demanda) degradan de forma
 * independiente: el perfil se devuelve si al menos una tiene datos.
 *
 * Sin EMBER_API_KEY → `{ ok:false, error:'no_key', ... }`.
 * Fuente: Ember Energy. Cliente tipado en lib/ember.
 *
 * NOTA · ruta dinámica más específica que `/api/ember/[...path]`; gana en el
 * router (mismo patrón que `/api/geopolitica/country-profile/[iso3]`).
 */
import { NextResponse } from 'next/server'
import { fetchCountryProfile } from '@/lib/ember/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(
  _req: Request,
  { params }: { params: { iso: string } },
) {
  const iso = (params?.iso || '').trim().toUpperCase()
  const r = await fetchCountryProfile(iso)

  return NextResponse.json(
    {
      ok: r.ok,
      data: r.data ?? null,
      error: r.error,
      fetched_at: r.fetched_at,
      _meta: {
        source: 'Ember Energy',
        source_url: r.source_url || 'https://ember-energy.org/data/',
        api_docs: 'https://api.ember-energy.org/docs',
        iso,
        cache_ttl_hours: 24,
      },
    },
    {
      headers: {
        'Cache-Control': r.ok
          ? 'public, s-maxage=3600, stale-while-revalidate=86400'
          : 'public, s-maxage=300',
      },
    },
  )
}
