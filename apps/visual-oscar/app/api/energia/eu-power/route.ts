/**
 * /api/energia/eu-power · Contexto eléctrico europeo vía energy-charts.info
 *
 * Fuente PRIMARIA (keyless · CC-BY · Fraunhofer ISE) del "Contexto europeo" del
 * sistema eléctrico. Ver `lib/energia/energy-charts.ts`.
 *
 * Query:
 *   - ?type=price      → precios day-ahead por bidding zone.
 *       ?zones=ES,FR,DE-LU,PT,IT-North  (default · varias zonas, SECUENCIAL)
 *       ?zone=ES        → atajo de una sola zona (compat).
 *   - ?type=generation → generación por fuente (mix EU-style).
 *       ?country=es     (default · ISO-2 minúsculas)
 *   - ?type=flows      → flujos físicos cross-border netos por país vecino.
 *       ?country=es     (default)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data, fetched_at, source_url, _meta }
 * o, ante fallo / rate-limit 429 de la fuente:
 *   { ok:false, error, fetched_at, source_url }
 *
 * Cache: s-maxage=3600 (1h) · stale-while-revalidate=7200 (2h). El cliente hace
 * además fetches SECUENCIALES + caché en memoria 1h para evitar el 429 de la API.
 *
 * Auth: NINGUNA (energy-charts es gratuita y sin key).
 */
import { NextResponse } from 'next/server'
import {
  fetchEuPrices,
  fetchEuGeneration,
  fetchCrossBorderFlows,
  DEFAULT_EU_ZONES,
} from '@/lib/energia/energy-charts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const CACHE_HEADER = 'public, s-maxage=3600, stale-while-revalidate=7200'

const META = {
  source: 'energy_charts',
  source_label: 'energy-charts.info · Fraunhofer ISE (CC-BY)',
  source_url: 'https://energy-charts.info',
  license: 'CC-BY',
  keyless: true,
  cache_ttl_seconds: 3600,
  note: 'Contexto eléctrico europeo sin token. ENTSO-E disponible como fuente adicional cuando se configure ENTSOE_SECURITY_TOKEN.',
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = (searchParams.get('type') || 'price').toLowerCase()

  try {
    if (type === 'price') {
      // Acepta ?zones=ES,FR,… (varias) o ?zone=ES (una). Default = DEFAULT_EU_ZONES.
      const zonesParam = searchParams.get('zones')
      const single = searchParams.get('zone')
      let zones: string[]
      if (zonesParam) {
        zones = zonesParam.split(',').map((z) => z.trim()).filter(Boolean)
      } else if (single) {
        zones = [single.trim()]
      } else {
        zones = [...DEFAULT_EU_ZONES]
      }
      // Clamp defensivo: máximo 8 zonas por petición (anti-429).
      zones = zones.slice(0, 8)
      const res = await fetchEuPrices(zones)
      return NextResponse.json({ ...res, _meta: META }, { headers: { 'Cache-Control': CACHE_HEADER } })
    }

    if (type === 'generation') {
      const country = (searchParams.get('country') || 'es').toLowerCase()
      const res = await fetchEuGeneration(country)
      return NextResponse.json({ ...res, _meta: META }, { headers: { 'Cache-Control': CACHE_HEADER } })
    }

    if (type === 'flows') {
      const country = (searchParams.get('country') || 'es').toLowerCase()
      const res = await fetchCrossBorderFlows(country)
      return NextResponse.json({ ...res, _meta: META }, { headers: { 'Cache-Control': CACHE_HEADER } })
    }

    return NextResponse.json(
      {
        ok: false,
        error: `type_invalido · usa price|generation|flows (recibido: ${type})`,
        fetched_at: new Date().toISOString(),
        source_url: 'https://energy-charts.info',
      },
      { status: 200 },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source_url: 'https://energy-charts.info',
      },
      { status: 200 },
    )
  }
}
