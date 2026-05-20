import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews, byCCAA, type CCAARegionStat } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export type CCAARegion = CCAARegionStat
export interface EuropeCountry {
  n: number
  pos: number
  neg: number
  spain_imp: number
  sample_titles: string[]
}

// País europeo · estática por ahora (los medios de catálogo son todos
// españoles). Se rellena con counts proporcionales al total para que
// se vea poblado en el mapa.
const EUROPE_BASE: Record<string, EuropeCountry> = {
 'Francia':       { n: 0, pos: 0, neg: 0, spain_imp: 0.62, sample_titles: ['Le Monde · L\'Espagne face au défi de Junts', 'Le Figaro · Sánchez et la coalition fragile'] },
 'Reino Unido':   { n: 0, pos: 0, neg: 0, spain_imp: 0.41, sample_titles: ['FT · Spain risk premium climbs', 'BBC · Madrid housing crisis'] },
 'Alemania':      { n: 0, pos: 0, neg: 0, spain_imp: 0.38, sample_titles: ['FAZ · Spaniens Wirtschaft', 'Die Zeit · Katalanien'] },
 'Italia':        { n: 0, pos: 0, neg: 0, spain_imp: 0.45, sample_titles: ['Corriere · La Spagna e l\'amnistia'] },
 'Portugal':      { n: 0, pos: 0, neg: 0, spain_imp: 0.71, sample_titles: ['Público · Espanha e o pacto fiscal'] },
 'Estados Unidos': { n: 0, pos: 0, neg: 0, spain_imp: 0.52, sample_titles: ['WSJ · Spain\'s coalition under strain'] },
 'Bélgica (UE)':  { n: 0, pos: 0, neg: 0, spain_imp: 0.78, sample_titles: ['Politico EU · Spain\'s next test for Brussels'] },
 'Marruecos':     { n: 0, pos: 0, neg: 0, spain_imp: 0.65, sample_titles: ['Le Matin · Maroc-Espagne, relations renforcées'] },
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const path = `/api/narratives/by-region${params.toString() ? '?' + params.toString() : ''}`
  const real = await fromBackend<{ spain_ccaa: Record<string, CCAARegion>; europe: Record<string, EuropeCountry> }>(path)
  if (real && (Object.keys(real.spain_ccaa || {}).length > 0 || Object.keys(real.europe || {}).length > 0)) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  const hours = Math.min(168, Number(params.get('hours_back') || 72))
  try {
    const articles = await getAggregatedNews({ maxSources: 50, hoursBack: hours })
    const spain_ccaa = byCCAA(articles)
    // Europe: distribuir un % del total para que el mapa se vea poblado
    const total = articles.length
    const europe: Record<string, EuropeCountry> = {}
    let i = 0
    for (const [k, base] of Object.entries(EUROPE_BASE)) {
      const share = Math.max(2, Math.round(total * 0.04 * (1 - i * 0.06)))
      const negPct = 0.45 + (i % 3) * 0.05
      europe[k] = {
        ...base,
        n: share,
        pos: Math.round(share * (1 - negPct - 0.30)),
        neg: Math.round(share * negPct),
      }
      i++
    }
    return NextResponse.json(withMeta({ spain_ccaa, europe }, 'mock'))
  } catch {
    return NextResponse.json(withMeta({ spain_ccaa: {}, europe: {} }, 'mock'))
  }
}
