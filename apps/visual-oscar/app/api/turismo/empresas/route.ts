/**
 * /api/turismo/empresas · Turismo v3 · Sprint T2-cross
 *
 * Cotización en vivo de empresas turísticas (hoteleras, aerolíneas, GDS,
 * aeropuertos, OTAs, turoperadores) con exposición a España, vía Finnhub. Cruza
 * Turismo con MERCADOS. Ver `lib/turismo/empresas.ts`.
 *
 * Query:
 *   - ?segmento=hotelera,aerolinea  → filtra por segmento(s) (CSV)
 *     (hotelera|aerolinea|gds|aeropuertos|ota|turoperador)
 *
 * Respuesta · SHAPE EXACTO (contrato del sprint):
 *   { empresas: [ { slug, nombre, ticker, segmento,
 *                   quote: { price: number|null,
 *                            change_percent: number|null,
 *                            available: boolean } } ] }
 * (se añaden ok/fetched_at/source_url/_meta como metadatos no contractuales).
 *
 * Degrada `quote.available=false` por empresa sin FINNHUB_API_KEY / rate-limit /
 * ticker no soportado. HTTP 200 siempre.
 */
import { NextResponse } from 'next/server'
import { fetchEmpresas } from '@/lib/turismo/empresas'
import type { TurismoSegmento } from '@/lib/turismo/empresas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const VALID: TurismoSegmento[] = ['hotelera', 'aerolinea', 'gds', 'aeropuertos', 'ota', 'turoperador']

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const segParam = (searchParams.get('segmento') || '').trim()
  const segmentos = segParam
    ? (segParam.split(',').map((s) => s.trim().toLowerCase()).filter((s): s is TurismoSegmento =>
        (VALID as string[]).includes(s),
      ))
    : undefined

  try {
    const res = await fetchEmpresas({ segmentos })
    return NextResponse.json(
      {
        // Contrato exacto primero.
        empresas: res.empresas,
        // Metadatos no contractuales.
        ok: res.ok,
        fetched_at: res.fetched_at,
        source_url: res.source_url,
        _meta: {
          source: 'finnhub',
          source_label: 'Finnhub · cotización empresas turísticas',
          env_hint: 'FINNHUB_API_KEY',
          cross_module: 'mercados',
          cache_ttl_seconds: 300,
          note: 'Hoteleras/aéreas/GDS/aeropuertos/OTA/turoperador. Degrada available:false por empresa.',
        },
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      },
    )
  } catch (e: unknown) {
    // Shape válido aun en error: empresas vacío.
    return NextResponse.json(
      {
        empresas: [],
        ok: false,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source_url: 'https://finnhub.io',
      },
      { status: 200 },
    )
  }
}
