/**
 * GET /api/energia/politica · Capa de POLÍTICA ENERGÉTICA España + UE
 * ============================================================================
 * Expone la orquestación de fetchPoliticaEnergetica(): regulación viva (BOE
 * LIVE, EUR-Lex, CNMC), estrategia curada (PNIEC, REPowerEU, PERTEs, subastas)
 * y mercado regulado (PVPC, peajes, impuestos, bono social).
 *
 * Envelope estándar Politeia:
 *   { ok, data, error, fetched_at, source_url }  (HTTP 200 SIEMPRE).
 *
 * Cada bloque LIVE degrada por separado dentro de la capa de datos: si una
 * fuente falla, su `ok:false` / catálogo curado no tumba el resto. Sin claves
 * hardcodeadas. Caché HTTP s-maxage 1h.
 */
import { NextResponse } from 'next/server'
import { fetchPoliticaEnergetica } from '@/lib/energia/politica-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const CACHE = { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' }

const SOURCE_URL = 'https://www.miteco.gob.es/es/energia.html'

export async function GET() {
  try {
    const data = await fetchPoliticaEnergetica()
    return NextResponse.json(
      {
        ok: data.ok,
        data,
        error: data.fuentes_error.length > 0 ? data.fuentes_error.join(' · ') : null,
        fetched_at: data.fetched_at,
        source_url: SOURCE_URL,
      },
      { headers: CACHE },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: e instanceof Error ? e.message : String(e),
        fetched_at: new Date().toISOString(),
        source_url: SOURCE_URL,
      },
      { headers: CACHE },
    )
  }
}
