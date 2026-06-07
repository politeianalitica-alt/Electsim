/**
 * /api/ember/generation · Sprint Energía S2
 *
 * Generación eléctrica por fuente de un país (TWh + %), del año solicitado o
 * del último disponible, con agregados renovable/limpio/fósil.
 *
 * Query:
 *   ?country=Spain        nombre país tal como lo espera Ember (default Spain)
 *   ?entity_code=ESP      código ISO-3 (prioritario sobre country)
 *   ?year=2024            año concreto (opcional → último disponible)
 *   ?resolution=yearly    yearly|monthly (default yearly)
 *
 * Respuesta (patrón ESIOS): `{ ok, data, fetched_at }`, HTTP 200 siempre.
 * Sin EMBER_API_KEY → `{ ok:false, error:'no_key', ... }` (empty-state honesto).
 *
 * Fuente: Ember Energy · api.ember-energy.org. Cliente tipado en lib/ember.
 *
 * NOTA · convive con `/api/ember/[...path]` (legacy): esta ruta explícita es
 * más específica y gana en el router de Next.js (mismo patrón que
 * `/api/geopolitica/country-profile` junto a `/api/geopolitica/[...path]`).
 */
import { NextResponse } from 'next/server'
import { fetchEmberGeneration } from '@/lib/ember/client'
import type { EmberResolution } from '@/lib/energia/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const url = new URL(req.url)
  const country = url.searchParams.get('country') || undefined
  const entity_code = url.searchParams.get('entity_code') || undefined
  const yearParam = url.searchParams.get('year')
  const year = yearParam ? Number(yearParam) : undefined
  const resParam = url.searchParams.get('resolution')
  const resolution: EmberResolution = resParam === 'monthly' ? 'monthly' : 'yearly'

  const r = await fetchEmberGeneration({
    country,
    entity_code,
    year: Number.isFinite(year) ? year : undefined,
    resolution,
  })

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
