/**
 * GET /api/farma/ema-alertas?kind=news|shortages|referrals&limit=20
 *
 * Alertas RSS de la European Medicines Agency. Tres feeds:
 *   - news      · novedades regulatorias de medicamentos humanos
 *   - shortages · escasez de medicamentos críticos en la UE
 *   - referrals · revisiones de seguridad y casos derivados
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchEmaFeed, type EmaFeedKind } from '@/lib/farma/sources/ema-rss'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED: EmaFeedKind[] = ['news', 'shortages', 'referrals']

export async function GET(req: NextRequest) {
  const kindParam = (req.nextUrl.searchParams.get('kind') || 'news') as EmaFeedKind
  const kind: EmaFeedKind = (ALLOWED as string[]).includes(kindParam) ? kindParam : 'news'
  const limit = clamp(Number(req.nextUrl.searchParams.get('limit') || 20), 1, 60)

  const r = await fetchEmaFeed(kind)
  const fuentes_error: string[] = []
  if (!r.ok) fuentes_error.push(`ema rss ${kind} · ${r.error}`)

  return NextResponse.json(
    {
      ok: r.ok,
      data: r.ok ? { items: r.items.slice(0, limit) } : null,
      fuente: r.ok ? r.fuente_label : 'EMA RSS',
      fuente_url: r.ok ? r.fuente : `https://www.ema.europa.eu/en/rss/${kind}_en.xml`,
      fuentes_error,
      generado_en: 'ISR · cache 30 min',
    },
    { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } }
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}
