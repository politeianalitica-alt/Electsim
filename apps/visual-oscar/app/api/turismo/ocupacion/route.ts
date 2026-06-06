/**
 * GET /api/turismo/ocupacion · Ocupación por tipo de alojamiento (INE) · T2-ine.
 *
 * Hoteles (EOH) / apartamentos (EOAP) / campings (EOAC) / rural (EOTR). Por
 * tipo: pernoctaciones + serie, grado de ocupación %, estancia media; ADR y
 * RevPAR para hoteles. Degrada por tipo y por métrica de forma honesta.
 * Ver lib/turismo/ocupacion.ts.
 *
 * Query:
 *   ?months=N → ventana de las series de pernoctaciones (default 24, clamp 6-48)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: OcupacionData, fetched_at, source_url, partial?, _meta }
 *
 * Fuente: INE WSTempus (EOH/EOAP/EOAC/EOTR + IRSH). Pública, sin auth.
 * Cache s-maxage 12h.
 */
import { NextResponse } from 'next/server'
import { fetchOcupacion } from '@/lib/turismo/ocupacion'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const META = {
  source: 'ine_ocupacion',
  source_label: 'INE · EOH / EOAP / EOAC / EOTR + rentabilidad hotelera (IRSH)',
  tables: {
    pernoctaciones: { hoteles: 2074, apartamentos: 1993, campings: 2016, rural: 1995 },
    grado_ocupacion: { hoteles: 2011, apartamentos: 2021, campings: 2042, rural: 2046 },
    estancia_media: { unificada: 2024, rural: 2023 },
    rentabilidad_hotel: { adr: 2058, revpar: 2056 },
  },
  auth_required: false,
  cache_ttl_seconds: 43200,
  note: 'Ocupación por tipo de alojamiento · pernoctaciones, grado de ocupación %, estancia media; ADR/RevPAR en hoteles.',
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const monthsRaw = parseInt(searchParams.get('months') || '24', 10)
  const months = Number.isFinite(monthsRaw) ? Math.max(6, Math.min(48, monthsRaw)) : 24

  try {
    const res = await fetchOcupacion({ months })
    return NextResponse.json(
      { ...res, _meta: META },
      { headers: { 'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e).slice(0, 200),
        fetched_at: new Date().toISOString(),
        source_url: 'https://www.ine.es',
        _meta: META,
      },
      { status: 200 },
    )
  }
}
