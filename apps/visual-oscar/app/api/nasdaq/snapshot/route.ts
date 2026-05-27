/**
 * /api/nasdaq/snapshot · snapshot rápido de macro+commodities Nasdaq Data Link.
 *
 * Devuelve los 5 indicadores más útiles para el dashboard ejecutivo y
 * para la página macro/sector-energia, en una sola llamada:
 *
 *   - opec_oil           · precio cesta OPEP USD/barril (daily)
 *   - gold_lbma_am       · oro fixing LBMA Londres USD/oz (daily)
 *   - fred_us_10y_yield  · bono soberano EEUU 10y % (daily)
 *   - fred_us_unemployment · paro EEUU % (monthly)
 *   - multpl_sp500_pe    · Shiller CAPE S&P 500 (monthly)
 *
 * Para cada uno devuelve `{ latest, prev, change_pct, points: [...] }`
 * para que el dashboard pueda renderizar mini-spark + valor + delta.
 *
 * Cache: s-maxage=21600 (6h) · datos diarios/mensuales.
 *
 * Si NASDAQ_DATA_LINK_KEY no está configurada, devuelve `ok: false`
 * con todos los indicadores `error='no_key'` para que el frontend
 * pueda mostrar estado "needs_config" honestamente.
 */
import { NextResponse } from 'next/server'
import { fetchNasdaqDataset, NASDAQ_CURATED } from '@/lib/nasdaq/data-link'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// Los 5 que queremos en el snapshot · selección consciente:
// - opec_oil: energía global
// - gold_lbma_am: refugio + inflación
// - fred_us_10y_yield: tipos largos benchmark
// - fred_us_unemployment: ciclo USA
// - multpl_sp500_pe: valoración bolsa USA
const SNAPSHOT_SLUGS = [
  'opec_oil',
  'gold_lbma_am',
  'fred_us_10y_yield',
  'fred_us_unemployment',
  'multpl_sp500_pe',
] as const

export async function GET() {
  const startedAt = new Date().toISOString()
  const apiKey = process.env.NASDAQ_DATA_LINK_KEY

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'no_key',
      message: 'NASDAQ_DATA_LINK_KEY no configurada en variables de entorno · el endpoint está listo pero los datasets no se descargan',
      indicators: {},
      fetched_at: startedAt,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=600' },
    })
  }

  // Fetch en paralelo · cada uno con su propio try/catch
  const results = await Promise.all(
    SNAPSHOT_SLUGS.map(async (slug) => {
      const entry = NASDAQ_CURATED[slug]
      const data = await fetchNasdaqDataset({
        database: entry.database,
        dataset: entry.dataset,
        rows: 30,                // 30 puntos para mini-spark
        order: 'desc',
      })
      const points = data.points || []
      const latest = points[0]
      const prev = points[1]
      const change_pct = (latest && prev && prev.value !== 0)
        ? ((latest.value - prev.value) / Math.abs(prev.value)) * 100
        : null
      return {
        slug,
        ok: data.ok,
        label: entry.label,
        unit: entry.unit,
        frequency: entry.frequency,
        use_case: entry.use_case,
        latest: latest ? { date: latest.date, value: latest.value } : null,
        prev: prev ? { date: prev.date, value: prev.value } : null,
        change_pct: change_pct !== null ? Math.round(change_pct * 100) / 100 : null,
        points: points.slice(0, 30).map((p) => ({ date: p.date, value: p.value })),
        source_url: data.source_url,
        error: data.error,
      }
    })
  )

  const indicators: Record<string, any> = {}
  for (const r of results) indicators[r.slug] = r

  const all_ok = results.every((r) => r.ok)
  return NextResponse.json({
    ok: all_ok,
    indicators,
    indicators_count: results.length,
    indicators_ok: results.filter((r) => r.ok).length,
    fetched_at: startedAt,
    _meta: {
      source: 'Nasdaq Data Link',
      source_url: 'https://data.nasdaq.com/',
      cache_ttl_hours: 6,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
  })
}
