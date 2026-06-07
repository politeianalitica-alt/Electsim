/**
 * /api/energia/commodities · Sprint Energía S7
 *
 * Commodities energía con spot + SERIE histórica (no solo nivel/24h como el
 * snapshot-all genérico). Recorre la cascada Alpha Vantage → Nasdaq DL →
 * Yahoo (ver `lib/energia/commodities.ts`).
 *
 * Query:
 *   - ?category=oil   → Brent, WTI, OPEP, gasolina, diésel
 *   - ?category=gas   → Henry Hub, TTF
 *   - ?category=all   → todos (default)
 *   - ?days=N         → ventana de la serie (default 90, clamp 7-180)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si una fuente degrada):
 *   { ok, data: { [symbol]: EnergyCommodityResponse }, fetched_at }
 *
 * Cache: s-maxage=3600 (1h · Alpha Vantage rate-limit 25/día → caché agresiva).
 */
import { NextResponse } from 'next/server'
import { fetchEnergyCategory } from '@/lib/energia/commodities'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const VALID = new Set(['oil', 'gas', 'all'])

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const catParam = (searchParams.get('category') || 'all').toLowerCase()
  const category = (VALID.has(catParam) ? catParam : 'all') as 'oil' | 'gas' | 'all'

  const daysRaw = parseInt(searchParams.get('days') || '90', 10)
  const days = Number.isFinite(daysRaw) ? Math.max(7, Math.min(180, daysRaw)) : 90

  const fetchedAt = new Date().toISOString()
  try {
    const data = await fetchEnergyCategory(category, { days })
    const okCount = Object.values(data).filter((r) => r.ok).length
    return NextResponse.json(
      {
        ok: okCount > 0,
        category,
        days,
        data,
        summary: {
          requested: Object.keys(data).length,
          with_series: okCount,
        },
        fetched_at: fetchedAt,
        _meta: {
          sources_cascade: ['alpha_vantage', 'nasdaq_data_link', 'yahoo_finance'],
          note: 'Alpha Vantage commodity functions (BRENT/WTI/NATURAL_GAS) → Nasdaq DL (OPEC/ORB) → Yahoo (series largas). TTF sin fuente gratuita fiable → degrada.',
          cache_ttl_seconds: 3600,
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=10800' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        category,
        days,
        data: {},
        error: e instanceof Error ? e.message : String(e),
        fetched_at: fetchedAt,
      },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=300' } },
    )
  }
}
