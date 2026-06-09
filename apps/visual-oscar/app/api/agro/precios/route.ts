/**
 * GET /api/agro/precios
 *
 * Snapshot de los precios de todos los productos agrícolas del catálogo
 * `lib/agro/catalogos/productos-agro.json` a través de Yahoo Finance.
 *
 * Respuesta:
 *   {
 *     ok: boolean,
 *     data: {
 *       productos: Array<{
 *         id: string, nombre: string, categoria: string, unidad: string,
 *         contrato: string, rol_espana: string, color: string,
 *         ticker: string | null,
 *         snapshot: {price, previous_close, change, change_pct, currency, ts, spark} | null,
 *       }>,
 *       n_total: number,
 *       n_con_precio: number,
 *     } | null,
 *     fuente: "Yahoo Finance",
 *     fuente_url: string,
 *     fuentes_error: string[],
 *   }
 */
import { NextResponse } from 'next/server'
import { PRODUCTOS_AGRO } from '@/lib/agro/catalogos'
import { fetchYahooSnapshots } from '@/lib/agro/sources/yahoo-agro'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const tickers = PRODUCTOS_AGRO.map((p) => p.ticker).filter((t): t is string => !!t)
  const snaps = await fetchYahooSnapshots(tickers)
  const bySymbol = new Map(snaps.map((s) => [s.symbol, s.snapshot]))

  const productos = PRODUCTOS_AGRO.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    unidad: p.unidad,
    contrato: p.contrato,
    rol_espana: p.rol_espana,
    color: p.color,
    ticker: p.ticker,
    snapshot: p.ticker ? bySymbol.get(p.ticker) ?? null : null,
  }))

  const n_con_precio = productos.filter((p) => p.snapshot?.price != null).length
  const fuentes_error: string[] = []
  if (n_con_precio === 0) fuentes_error.push('yahoo finance · sin respuesta para ningún ticker')

  return NextResponse.json(
    {
      ok: productos.length > 0,
      data: { productos, n_total: productos.length, n_con_precio },
      fuente: 'Yahoo Finance · futuros CME / Euronext / ICE',
      fuente_url: 'https://finance.yahoo.com/commodities',
      fuentes_error,
      generado_en: 'ISR · cache 10 min',
    },
    { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' } }
  )
}
