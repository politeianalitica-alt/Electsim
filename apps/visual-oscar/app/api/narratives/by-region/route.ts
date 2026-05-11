import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface CCAARegion {
  n: number
  pos: number
  neg: number
  neu: number
  sent_score: number
  top_topics: string[]
}
export interface EuropeCountry {
  n: number
  pos: number
  neg: number
  spain_imp: number
  sample_titles: string[]
}

const MOCK_CCAA: Record<string, CCAARegion> = {
  'Madrid':          { n: 312, pos:  84, neg: 156, neu:  72, sent_score: -0.23, top_topics: ['moción censura', 'amnistía', 'vivienda'] },
  'Cataluña':        { n: 287, pos:  72, neg: 142, neu:  73, sent_score: -0.24, top_topics: ['amnistía', 'transferencia IRPF', 'Junts'] },
  'Andalucía':       { n: 198, pos:  74, neg:  86, neu:  38, sent_score: -0.06, top_topics: ['sondeos', 'agricultura', 'aranceles'] },
  'Valencia':        { n: 142, pos:  46, neg:  61, neu:  35, sent_score: -0.11, top_topics: ['vivienda', 'turismo', 'CCAA'] },
  'País Vasco':      { n: 118, pos:  41, neg:  44, neu:  33, sent_score: -0.03, top_topics: ['PNV', 'Bildu', 'IRPF'] },
  'Galicia':         { n:  87, pos:  32, neg:  31, neu:  24, sent_score: +0.01, top_topics: ['BNG', 'pesca', 'A Coruña'] },
  'Castilla y León': { n:  68, pos:  22, neg:  29, neu:  17, sent_score: -0.10, top_topics: ['agro', 'rural', 'demografía'] },
  'Castilla-La Mancha': { n: 54, pos:  19, neg:  22, neu:  13, sent_score: -0.06, top_topics: ['agua', 'rural', 'Page'] },
  'Aragón':          { n:  41, pos:  15, neg:  16, neu:  10, sent_score: -0.02, top_topics: ['eólica', 'sequía', 'Lambán'] },
  'Canarias':        { n:  39, pos:  16, neg:  14, neu:   9, sent_score: +0.05, top_topics: ['turismo', 'migración', 'volcán'] },
  'Murcia':          { n:  35, pos:  11, neg:  14, neu:  10, sent_score: -0.09, top_topics: ['agua', 'mar menor', 'agro'] },
  'Asturias':        { n:  28, pos:  10, neg:  11, neu:   7, sent_score: -0.04, top_topics: ['industria', 'transición'] },
  'Baleares':        { n:  26, pos:  10, neg:   9, neu:   7, sent_score: +0.04, top_topics: ['turismo', 'vivienda', 'agua'] },
  'Extremadura':     { n:  22, pos:   9, neg:   8, neu:   5, sent_score: +0.05, top_topics: ['agro', 'PAC', 'Guardiola'] },
  'Navarra':         { n:  21, pos:   7, neg:   9, neu:   5, sent_score: -0.10, top_topics: ['UPN', 'Bildu', 'TC'] },
  'Cantabria':       { n:  17, pos:   6, neg:   7, neu:   4, sent_score: -0.06, top_topics: ['Buruaga', 'sanidad'] },
  'La Rioja':        { n:  14, pos:   6, neg:   5, neu:   3, sent_score: +0.07, top_topics: ['vino', 'PP', 'Capellán'] },
  'Ceuta':           { n:   8, pos:   3, neg:   3, neu:   2, sent_score:  0.00, top_topics: ['frontera', 'migración'] },
  'Melilla':         { n:   7, pos:   2, neg:   3, neu:   2, sent_score: -0.14, top_topics: ['frontera', 'migración'] },
}

const MOCK_EUROPE: Record<string, EuropeCountry> = {
  'Francia':       { n: 38, pos: 14, neg: 18, spain_imp: 0.62, sample_titles: ['Le Monde · L\'Espagne face au défi de Junts', 'Le Figaro · Sánchez et la coalition fragile'] },
  'Reino Unido':   { n: 31, pos: 12, neg: 14, spain_imp: 0.41, sample_titles: ['FT · Spain risk premium climbs amid political uncertainty', 'BBC · Madrid housing crisis explained'] },
  'Alemania':      { n: 27, pos: 11, neg: 10, spain_imp: 0.38, sample_titles: ['FAZ · Spaniens Wirtschaft trotz politischer Spannungen', 'Die Zeit · Katalanien und Madrid'] },
  'Italia':        { n: 22, pos:  9, neg:  8, spain_imp: 0.45, sample_titles: ['Corriere · La Spagna e l\'amnistia', 'La Repubblica · Sánchez al limite'] },
  'Portugal':      { n: 19, pos:  9, neg:  6, spain_imp: 0.71, sample_titles: ['Público · Espanha e o pacto fiscal', 'Expresso · Sondagens em Madrid'] },
  'Estados Unidos': { n: 17, pos:  6, neg:  9, spain_imp: 0.52, sample_titles: ['WSJ · Spain\'s coalition under strain', 'NYT · Tariffs on Spanish olive oil'] },
  'Bélgica (UE)':  { n: 14, pos:  6, neg:  6, spain_imp: 0.78, sample_titles: ['Politico EU · Spain\'s next test for Brussels', 'EUobserver · Sánchez and the EU'] },
  'Marruecos':     { n: 11, pos:  4, neg:  5, spain_imp: 0.65, sample_titles: ['Le Matin · Maroc-Espagne, relations renforcées', 'Yabiladi · Frontera de Ceuta'] },
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/narratives/by-region${params ? '?' + params : ''}`
  const real = await fromBackend<{ spain_ccaa: Record<string, CCAARegion>; europe: Record<string, EuropeCountry> }>(path)
  if (real && (Object.keys(real.spain_ccaa || {}).length > 0 || Object.keys(real.europe || {}).length > 0)) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({ spain_ccaa: MOCK_CCAA, europe: MOCK_EUROPE }, 'mock'))
}
