/**
 * /api/maritimo/flota · Capa de FLOTA MUNDIAL (curado + datado)
 * ─────────────────────────────────────────────────────────────────────────────
 * GET → envelope { ok, data, error, fetched_at, source_url } con:
 *   data.por_pabellon[] · flota mundial por bandera (UNCTAD RMT 2024, a 1 ene 2024)
 *   data.navieras[]      · grandes navieras de portacontenedores (Alphaliner-style, ~may 2025)
 *   data.resumen         · agregados de ambos datasets
 *
 * Datos CURADOS y DATADOS en lib/maritimo/flota.ts. No hay fetch externo: el
 * dataset es estático y de referencia, así que la respuesta es determinista.
 * HTTP 200 siempre; si por cualquier razón fallara el armado, se degrada a
 * { ok:false, error, data:null } manteniendo el 200. Cache 24 h.
 */
import { NextResponse } from 'next/server'
import {
  FLEET_BY_FLAG,
  CARRIERS,
  flagsByGt,
  carriersByTeu,
  fleetSummary,
  teuByAlliance,
  FLEET_BY_FLAG_AS_OF,
  FLEET_BY_FLAG_SOURCE,
  FLEET_BY_FLAG_SOURCE_URL,
  CARRIERS_AS_OF,
  CARRIERS_SOURCE,
  CARRIERS_SOURCE_URL,
} from '@/lib/maritimo/flota'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const CACHE_24H = 'public, s-maxage=86400, stale-while-revalidate=172800'

export async function GET() {
  const fetched_at = new Date().toISOString()
  try {
    const por_pabellon = flagsByGt(FLEET_BY_FLAG)
    const navieras = carriersByTeu(CARRIERS)
    const resumen = fleetSummary(FLEET_BY_FLAG, CARRIERS)
    const teu_por_alianza = teuByAlliance(CARRIERS)

    return NextResponse.json(
      {
        ok: true,
        data: {
          por_pabellon,
          navieras,
          resumen,
          teu_por_alianza,
        },
        error: null,
        fetched_at,
        source_url: FLEET_BY_FLAG_SOURCE_URL,
        _meta: {
          data_quality: 'curated',
          por_pabellon_source: FLEET_BY_FLAG_SOURCE,
          por_pabellon_source_url: FLEET_BY_FLAG_SOURCE_URL,
          por_pabellon_as_of: FLEET_BY_FLAG_AS_OF,
          navieras_source: CARRIERS_SOURCE,
          navieras_source_url: CARRIERS_SOURCE_URL,
          navieras_as_of: CARRIERS_AS_OF,
          units: {
            gt_thousand: 'tonelaje bruto en miles de GT',
            dwt_thousand: 'peso muerto en miles de DWT',
            teu: 'capacidad operada en TEU (propios + fletados)',
            share_pct: 'cuota sobre la capacidad mundial de portacontenedores',
          },
          cache_ttl_seconds: 86400,
        },
      },
      { headers: { 'Cache-Control': CACHE_24H } },
    )
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      {
        ok: false,
        data: { por_pabellon: [], navieras: [], resumen: null, teu_por_alianza: null },
        error,
        fetched_at,
        source_url: FLEET_BY_FLAG_SOURCE_URL,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
