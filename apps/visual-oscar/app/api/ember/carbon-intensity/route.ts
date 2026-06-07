/**
 * /api/ember/carbon-intensity · Sprint Energía S2
 *
 * Intensidad de carbono (gCO2/kWh) de la generación eléctrica más reciente.
 * Modos:
 *   - Un país:  ?country=Spain  o  ?entity_code=ESP  → intensidad de ese país.
 *   - Ranking:  ?ranking=1&codes=ESP,FRA,DEU,...     → serie comparada para
 *               varios países (para mapas/rankings de Visión Global, S4).
 *
 * Query:
 *   ?country=Spain | ?entity_code=ESP
 *   ?ranking=1&codes=ESP,FRA,DEU,POL,ITA   (codes ISO-3 separados por coma)
 *   ?resolution=yearly|monthly             (default yearly)
 *
 * Respuesta (patrón ESIOS): `{ ok, data, fetched_at }`, HTTP 200 siempre.
 * - Modo país: `data` = EmberCarbonIntensity.
 * - Modo ranking: `data.ranking` = [{ entity_code, entity, gco2_per_kwh, date }]
 *   ordenado ascendente (menor intensidad = más limpio primero).
 *
 * Sin EMBER_API_KEY → `{ ok:false, error:'no_key', ... }`.
 * Fuente: Ember Energy. Cliente tipado en lib/ember.
 */
import { NextResponse } from 'next/server'
import { fetchCarbonIntensity } from '@/lib/ember/client'
import type { EmberResolution } from '@/lib/energia/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// Conjunto por defecto del ranking · grandes mercados eléctricos EU + global.
const DEFAULT_RANKING_CODES = [
  'ESP', 'FRA', 'DEU', 'ITA', 'POL', 'PRT', 'GBR', 'NLD', 'SWE', 'NOR',
  'USA', 'CHN', 'IND', 'JPN',
]

export async function GET(req: Request) {
  const url = new URL(req.url)
  const resParam = url.searchParams.get('resolution')
  const resolution: EmberResolution = resParam === 'monthly' ? 'monthly' : 'yearly'

  const isRanking = url.searchParams.get('ranking') === '1'

  if (isRanking) {
    const codesParam = url.searchParams.get('codes')
    const codes = (codesParam ? codesParam.split(',') : DEFAULT_RANKING_CODES)
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean)

    const fetched_at = new Date().toISOString()
    const results = await Promise.all(
      codes.map((code) => fetchCarbonIntensity({ entity_code: code, resolution })),
    )

    const ranking = results
      .filter((r) => r.ok && r.data && r.data.gco2_per_kwh != null)
      .map((r) => ({
        entity_code: r.data!.entity_code,
        entity: r.data!.entity,
        gco2_per_kwh: r.data!.gco2_per_kwh,
        date: r.data!.date,
      }))
      .sort((a, b) => (a.gco2_per_kwh ?? Infinity) - (b.gco2_per_kwh ?? Infinity))

    const ok = ranking.length > 0
    return NextResponse.json(
      {
        ok,
        data: ok ? { ranking, resolution } : null,
        error: ok ? undefined : (results[0]?.error ?? 'sin_datos'),
        fetched_at,
        _meta: {
          source: 'Ember Energy',
          source_url: 'https://ember-energy.org/data/',
          api_docs: 'https://api.ember-energy.org/docs',
          requested: codes.length,
          returned: ranking.length,
          cache_ttl_hours: 24,
        },
      },
      {
        headers: {
          'Cache-Control': ok
            ? 'public, s-maxage=3600, stale-while-revalidate=86400'
            : 'public, s-maxage=300',
        },
      },
    )
  }

  // Modo país único.
  const country = url.searchParams.get('country') || undefined
  const entity_code = url.searchParams.get('entity_code') || undefined
  const r = await fetchCarbonIntensity({ country, entity_code, resolution })

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
