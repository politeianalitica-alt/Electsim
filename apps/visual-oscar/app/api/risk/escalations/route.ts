import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface BurstTopic {
  topic: string
  recent_n: number
  baseline_n: number
  ratio: number
  is_new: boolean
}

export interface AmplificationTopic {
  topic: string
  n_sources: number
  n_countries: number
  n_articles: number
  examples: string[]
}

export interface DualPolarizationTopic {
  topic: string
  total: number
  pos_pct: number
  neg_pct: number
  neu_pct: number
}

export interface EscalationsResponse {
  burst_topics: BurstTopic[]
  amplification: AmplificationTopic[]
  dual_polarization: DualPolarizationTopic[]
  fetched_at: string
}

const MOCK_ESCALATIONS: Omit<EscalationsResponse, 'fetched_at'> = {
  burst_topics: [
    { topic: 'moción de censura',     recent_n: 56, baseline_n: 8,  ratio: 7.0, is_new: false },
    { topic: 'amnistía',              recent_n: 41, baseline_n: 12, ratio: 3.4, is_new: false },
    { topic: 'vivienda asequible',    recent_n: 38, baseline_n: 14, ratio: 2.7, is_new: false },
    { topic: 'prima de riesgo',       recent_n: 24, baseline_n: 5,  ratio: 4.8, is_new: true  },
    { topic: 'aranceles aceite/vino', recent_n: 18, baseline_n: 0,  ratio: 99,  is_new: true  },
    { topic: 'reforma CGPJ',          recent_n: 16, baseline_n: 7,  ratio: 2.3, is_new: false },
  ],
  amplification: [
    { topic: 'caída PP sondeos',      n_sources: 14, n_countries: 5, n_articles: 34, examples: ['El Mundo', 'ABC', 'La Razón', 'OK Diario'] },
    { topic: 'crisis vivienda',       n_sources: 12, n_countries: 7, n_articles: 28, examples: ['El País', 'La Sexta', 'eldiario.es'] },
    { topic: 'tensión Junts',         n_sources: 11, n_countries: 4, n_articles: 22, examples: ['La Vanguardia', 'Ara', 'NacióDigital'] },
    { topic: 'aranceles agro EE.UU.', n_sources: 9,  n_countries: 8, n_articles: 18, examples: ['Reuters', 'Cinco Días', 'Expansión'] },
  ],
  dual_polarization: [
    { topic: 'amnistía',              total: 87, pos_pct: 31, neg_pct: 58, neu_pct: 11 },
    { topic: 'moción de censura',     total: 64, pos_pct: 12, neg_pct: 71, neu_pct: 17 },
    { topic: 'reforma fiscal',        total: 52, pos_pct: 28, neg_pct: 49, neu_pct: 23 },
    { topic: 'transferencia IRPF',    total: 41, pos_pct: 18, neg_pct: 62, neu_pct: 20 },
  ],
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/risk/escalations${params ? '?' + params : ''}`
  const real = await fromBackend<EscalationsResponse>(path)
  if (real && (real.burst_topics?.length || real.amplification?.length || real.dual_polarization?.length)) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({
    ...MOCK_ESCALATIONS,
    fetched_at: new Date().toISOString(),
  }, 'mock'))
}
