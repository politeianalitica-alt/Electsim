/**
 * /api/medios/ccaa?ccaa=Madrid — drill deep por CCAA.
 *
 * Devuelve el CCAADeepDetail completo (categorías, topics, top news,
 * top medios, figuras públicas activas, empresas mencionadas y
 * provincias con drill).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAggregatedNews } from '@/lib/news-aggregator'
import { ccaaDeep } from '@/lib/news-intel'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 45
export const revalidate = 300

export async function GET(req: NextRequest) {
  const ccaa = req.nextUrl.searchParams.get('ccaa') || 'Madrid'
  const hours = Math.min(168, Math.max(6, Number(req.nextUrl.searchParams.get('hours') || 72)))
  try {
    const articles = await getAggregatedNews({ maxSources: 60, hoursBack: hours })
    const detail = ccaaDeep(articles, ccaa)
    return NextResponse.json({ ...detail, updatedAt: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({
      ccaa, total: 0, polarity: 0, categories: [], topTopics: [], topNews: [],
      topMedios: [], topFigures: [], topCompanies: [], provinces: [],
      error: String(e),
    })
  }
}
