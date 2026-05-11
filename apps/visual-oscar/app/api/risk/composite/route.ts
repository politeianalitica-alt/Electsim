import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface RiskDriver {
  id: number
  title: string
  source: string
  relevance: number
  sentiment: string
  spain_impact: string
  contribution: number
  scraped_at: string | null
  dimension?: string
  dimension_label?: string
}

export interface RiskDimension {
  label: string
  score: number
  level: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO'
  weight: number
  n_articles: number
  delta_24h: number
  z_score: number
  is_anomaly: boolean
  drivers: RiskDriver[]
}

export interface RiskComposite {
  fetched_at: string
  hours_back: number
  composite: number
  composite_level: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO'
  composite_semaforo: 'verde' | 'amarillo' | 'naranja' | 'rojo'
  framework: string
  dimensions: Record<string, RiskDimension>
  top_risks: RiskDriver[]
}

// Mock realista para que el panel se vea poblado cuando el backend no
// expone /api/risk/composite (Vercel cae a este fallback si el backend
// devuelve 500 o no tiene los datos de la tabla `risk_*` en Postgres).
const SAMPLE_DRIVERS: RiskDriver[] = [
  { id: 1, title: 'Junts condiciona apoyo a Presupuestos a transferencia fiscal antes de junio', source: 'El Mundo', relevance: 0.92, sentiment: 'negative', spain_impact: 'high', contribution: 0.28, scraped_at: new Date(Date.now() - 3*3600_000).toISOString(), dimension: 'institutional', dimension_label: 'Institucional' },
  { id: 2, title: 'Prima de riesgo supera los 100 pb por tercer día consecutivo', source: 'Bloomberg', relevance: 0.88, sentiment: 'negative', spain_impact: 'high', contribution: 0.24, scraped_at: new Date(Date.now() - 1*3600_000).toISOString(), dimension: 'economic', dimension_label: 'Económica' },
  { id: 3, title: 'Caída del PP en sondeos territoriales · 2pp en 2 semanas', source: 'Sigma Dos / El Mundo', relevance: 0.81, sentiment: 'mixed', spain_impact: 'medium', contribution: 0.20, scraped_at: new Date(Date.now() - 6*3600_000).toISOString(), dimension: 'electoral', dimension_label: 'Electoral' },
  { id: 4, title: 'Narrativa de vivienda alcanza pico histórico de menciones', source: 'Politeia · Monitor RRSS', relevance: 0.78, sentiment: 'negative', spain_impact: 'medium', contribution: 0.18, scraped_at: new Date(Date.now() - 4*3600_000).toISOString(), dimension: 'social', dimension_label: 'Social' },
  { id: 5, title: 'USTR anuncia aranceles 12% sobre aceite y vino', source: 'Reuters', relevance: 0.74, sentiment: 'negative', spain_impact: 'medium', contribution: 0.16, scraped_at: new Date(Date.now() - 8*3600_000).toISOString(), dimension: 'geopolitical', dimension_label: 'Geopolítica' },
  { id: 6, title: '#MociónCensura trending top 1 nacional · 56k tweets en 4h', source: 'X (antes Twitter)', relevance: 0.71, sentiment: 'negative', spain_impact: 'medium', contribution: 0.15, scraped_at: new Date(Date.now() - 5*3600_000).toISOString(), dimension: 'media', dimension_label: 'Media' },
  { id: 7, title: 'PNV exige reunión bilateral antes 15 mayo', source: 'EAJ-PNV · prensa', relevance: 0.68, sentiment: 'mixed', spain_impact: 'medium', contribution: 0.13, scraped_at: new Date(Date.now() - 12*3600_000).toISOString(), dimension: 'institutional', dimension_label: 'Institucional' },
  { id: 8, title: 'BCE actas abril · tono moderadamente hawkish', source: 'Reuters', relevance: 0.62, sentiment: 'mixed', spain_impact: 'low', contribution: 0.10, scraped_at: new Date(Date.now() - 16*3600_000).toISOString(), dimension: 'economic', dimension_label: 'Económica' },
]

function levelOf(score: number): { level: RiskDimension['level']; semaforo: RiskComposite['composite_semaforo'] } {
  if (score >= 75) return { level: 'CRÍTICO', semaforo: 'rojo' }
  if (score >= 55) return { level: 'ALTO',    semaforo: 'naranja' }
  if (score >= 35) return { level: 'MEDIO',   semaforo: 'amarillo' }
  return { level: 'BAJO', semaforo: 'verde' }
}

function buildMockComposite(): RiskComposite {
  // Sub-scores realistas por dimensión (corresponden con el contexto político actual)
  const dimScores: Record<string, { score: number; label: string; weight: number; n_articles: number; delta_24h: number; z: number; anom: boolean }> = {
    institutional: { score: 62, label: 'Institucional', weight: 0.20, n_articles: 38, delta_24h: +12, z: 1.4, anom: true  },
    electoral:     { score: 48, label: 'Electoral',     weight: 0.18, n_articles: 26, delta_24h: +4,  z: 0.6, anom: false },
    geopolitical:  { score: 52, label: 'Geopolítica',   weight: 0.15, n_articles: 31, delta_24h: +8,  z: 1.0, anom: false },
    economic:      { score: 58, label: 'Económica',     weight: 0.18, n_articles: 44, delta_24h: +7,  z: 1.1, anom: true  },
    media:         { score: 67, label: 'Media',         weight: 0.14, n_articles: 121, delta_24h: +22, z: 1.8, anom: true },
    social:        { score: 41, label: 'Social',        weight: 0.15, n_articles: 19, delta_24h: -3,  z: -0.2, anom: false },
  }
  const composite = Math.round(
    Object.values(dimScores).reduce((s, d) => s + d.score * d.weight, 0)
  )
  const { level, semaforo } = levelOf(composite)
  const dimensions: Record<string, RiskDimension> = {}
  for (const [key, d] of Object.entries(dimScores)) {
    const drivers = SAMPLE_DRIVERS.filter(dr => dr.dimension === key)
    dimensions[key] = {
      label: d.label, score: d.score, level: levelOf(d.score).level,
      weight: d.weight, n_articles: d.n_articles,
      delta_24h: d.delta_24h, z_score: d.z, is_anomaly: d.anom,
      drivers,
    }
  }
  return {
    fetched_at: new Date().toISOString(),
    hours_back: 72,
    composite,
    composite_level: level,
    composite_semaforo: semaforo,
    framework: 'ICRG-EWMA · 6 dimensiones · Kleinberg burst',
    dimensions,
    top_risks: SAMPLE_DRIVERS.slice(0, 6),
  }
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/risk/composite${params ? '?' + params : ''}`
  const real = await fromBackend<RiskComposite>(path)
  if (real && real.dimensions && Object.keys(real.dimensions).length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta(buildMockComposite(), 'mock'))
}
