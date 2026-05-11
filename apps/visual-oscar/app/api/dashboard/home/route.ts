import { NextResponse } from 'next/server'
import { callBackend, withMeta, proxyResponse } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// /api/dashboard/home — endpoint consolidado del dashboard
// Proxy a FastAPI backend → /api/dashboard/home (api/routers/dashboard.py)
// Si el backend no responde, devuelve un mock con la misma forma para que
// la página renderice (con _meta.source='mock' y warnings indicando el fallo).

export interface DashboardParty {
  partido_id: number
  siglas: string
  nombre: string
  pct: number
  ci_inf: number
  ci_sup: number
  seats: number
  seats_low: number
  seats_high: number
  color: string
  bloque: 'izquierda' | 'derecha' | 'centro' | 'otros'
  delta: number
}

export interface DashboardKPI {
  label: string
  value: string | number
  sub: string
  accent: string
}

export interface DashboardAlert {
  id: string
  type: 'warning' | 'info' | 'ok'
  text: string
  tipo?: string
  severidad?: string
  created_at?: string
}

export interface DashboardPoll {
  id: string
  pollster: string
  title: string
  date: string
}

export interface DashboardMacro {
  label: string
  value: string
  delta: string
  dir: 'up' | 'down'
  good: 'up' | 'down' | 'es' | 'eu' | 'fx' | 'energy' | 'safehaven'
  data: number[]
  live?: boolean
}

export interface NewsIntel {
  by_party: Record<string, { mentions: number; pos: number; neg: number; neu: number; sent_score: number; last_24h: number }>
  critical_count: number
  high_impact_count: number
  total_24h: number
  alerts_from_news: Array<{ id: string; type: string; text: string; severidad: string; source: string; summary?: string; urgency?: string; created_at?: string; from_news: boolean }>
  top_topics: Array<{ topic: string; cnt: number }>
  avg_relevance?: number
}

export interface DashboardRegion {
  name: string
  lean: 'pp' | 'psoe' | 'mixed'
  diff: number
  pp_pct: number
  psoe_pct: number
}

export interface DashboardCoalition {
  id: string
  name: string
  seats: number
  viable: boolean
  viability: number
  n_partidos: number
  es_minima: boolean
}

export interface DashboardNewsPulse {
  id: string
  title: string
  source: string
  sentiment: number
  relevance: number
  date: string | null
  /** Backend may return a plain string "PP, PSOE" or an array of objects [{partido,pct},...] */
  parties: unknown
}

export interface DashboardHome {
  last_updated: string
  fecha_estimacion?: string
  parties: DashboardParty[]
  kpis: DashboardKPI[]
  alerts: DashboardAlert[]
  polls: DashboardPoll[]
  macro: DashboardMacro[]
  regions: DashboardRegion[]
  coalitions: DashboardCoalition[]
  news_pulse: DashboardNewsPulse[]
  risk: { score: number; semaforo: string; fecha: string | null; dimensiones: unknown[]; score_base?: number; score_news_boost?: number }
  news_intel?: NewsIntel
  _warnings?: string[]
}

/**
 * Fallback ÚNICAMENTE cuando el backend no devuelve un dashboard válido.
 * Se identifica claramente con `_meta.source='mock'` y `_warnings`.
 * NO usar como "datos base" — el backend es la fuente de verdad.
 */
const FALLBACK_DASHBOARD: DashboardHome = {
  last_updated: new Date().toISOString(),
  parties: [],   // Vacío intencional: si no hay backend, no mostramos números inventados.
  kpis: [],
  alerts: [{
    id: 'no_backend',
    type: 'warning',
    text: 'El backend de Politeia no está accesible. Mostrando estructura vacía.',
  }],
  polls: [],
  macro: [],
  regions: [],
  coalitions: [],
  news_pulse: [],
  risk: { score: 0, semaforo: 'gris', fecha: null, dimensiones: [] },
}

export async function GET() {
  const result = await callBackend<DashboardHome>('/api/dashboard/home')

  // Si llegó el backend con datos válidos, devolvemos tal cual con _meta=backend.
  if (result.data && Array.isArray(result.data.parties) && result.data.parties.length > 0) {
    return NextResponse.json(
      withMeta(result.data, 'backend', { latency_ms: result.latency_ms }),
    )
  }

  // Si llegó pero está vacío (parties.length==0), avisamos.
  if (result.data) {
    return NextResponse.json(
      withMeta(result.data, 'fallback', {
        warnings: ['backend_returned_empty_parties'],
        latency_ms: result.latency_ms,
      }),
    )
  }

  // Sin datos: fallback estructural con warnings claros.
  return NextResponse.json(
    proxyResponse(result, FALLBACK_DASHBOARD),
  )
}
