/**
 * /api/medios/ccaa?ccaa=Madrid — drill detail por comunidad autónoma.
 *
 * Devuelve top noticias, top medios, polaridad, topics dominantes
 * de la CCAA seleccionada en el mapa.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAggregatedNews } from '@/lib/news-aggregator'
import { ccaaDetail } from '@/lib/news-intel'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 45
export const revalidate = 300

export async function GET(req: NextRequest) {
  const ccaa = req.nextUrl.searchParams.get('ccaa') || 'Madrid'
  const hours = Math.min(168, Math.max(6, Number(req.nextUrl.searchParams.get('hours') || 72)))
  try {
    const articles = await getAggregatedNews({ maxSources: 60, hoursBack: hours })
    const detail = ccaaDetail(articles, ccaa)
    return NextResponse.json({ ...detail, updatedAt: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({
      ccaa, total: 0, polarity: 0, topTopics: [], topNews: [], topMedios: [],
      error: String(e),
    })
  }
}
