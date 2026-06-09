/**
 * GET /api/agro/ohlc/[slug]?range=1y&interval=1d
 *
 * Serie OHLC histórica (candlestick) de un producto del catálogo agro vía
 * Yahoo Finance, para el drill-down de «Lonjas y Precios». range/interval
 * siguen la convención Yahoo (range: 1mo|3mo|6mo|1y|2y|5y · interval: 1d|1wk|1mo).
 *
 * Degradación honesta: si el producto no tiene ticker o Yahoo no responde,
 * devuelve ok:false con el motivo · NO se inventan velas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { PRODUCTOS_AGRO } from '@/lib/agro/catalogos'
import { fetchYahooOHLC } from '@/lib/agro/sources/yahoo-agro'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RANGES = new Set(['1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'])
const INTERVALS = new Set(['1d', '1wk', '1mo'])

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const producto = PRODUCTOS_AGRO.find((p) => p.id === params.slug)
  if (!producto) {
    return NextResponse.json(
      { ok: false, data: null, error: `producto desconocido: ${params.slug}`, fuente: 'catálogo Politeia' },
      { status: 404 }
    )
  }
  const range = req.nextUrl.searchParams.get('range') || '1y'
  const interval = req.nextUrl.searchParams.get('interval') || '1d'
  const safeRange = RANGES.has(range) ? range : '1y'
  const safeInterval = INTERVALS.has(interval) ? interval : '1d'

  if (!producto.ticker) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        fuente: 'Yahoo Finance',
        fuentes_error: ['producto sin ticker · sin serie histórica'],
        producto: { id: producto.id, nombre: producto.nombre, ticker: null },
      },
      { headers: { 'Cache-Control': 's-maxage=600' } }
    )
  }

  const ohlc = await fetchYahooOHLC(producto.ticker, safeRange, safeInterval)
  if (!ohlc || ohlc.bars.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        fuente: 'Yahoo Finance',
        fuente_url: `https://finance.yahoo.com/quote/${encodeURIComponent(producto.ticker)}`,
        fuentes_error: [`Yahoo no devuelve OHLC para ${producto.ticker}`],
      },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' } }
    )
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          ticker: producto.ticker,
          unidad: producto.unidad,
          categoria: producto.categoria,
          color: producto.color,
        },
        range: safeRange,
        interval: safeInterval,
        currency: ohlc.currency,
        bars: ohlc.bars,
        n_bars: ohlc.bars.length,
      },
      fuente: 'Yahoo Finance · OHLC histórico',
      fuente_url: `https://finance.yahoo.com/quote/${encodeURIComponent(producto.ticker)}`,
      generado_en: 'ISR · cache 30 min',
    },
    { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } }
  )
}
