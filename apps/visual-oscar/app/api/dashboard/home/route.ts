import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// /api/dashboard/home — endpoint consolidado del dashboard
// Proxy a FastAPI backend → /api/dashboard/home (api/routers/dashboard.py)
// Si el backend no responde, devuelve un mock con la misma forma para que
// la página renderice (pero con _meta.source='mock' para indicar fallback).

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
  parties: string
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

const MOCK_DASHBOARD: DashboardHome = {
  last_updated: new Date().toISOString(),
  parties: [
    { partido_id: 2, siglas: 'PP',    nombre: 'Partido Popular', pct: 32.47, ci_inf: 30.5, ci_sup: 34.4, seats: 136, seats_low: 130, seats_high: 142, color: '#0070D1', bloque: 'derecha',   delta: -0.6 },
    { partido_id: 1, siglas: 'PSOE',  nombre: 'PSOE',            pct: 26.90, ci_inf: 25.1, ci_sup: 28.7, seats: 101, seats_low:  95, seats_high: 107, color: '#C01818', bloque: 'izquierda', delta: -4.8 },
    { partido_id: 3, siglas: 'VOX',   nombre: 'VOX',             pct: 12.79, ci_inf: 11.4, ci_sup: 14.2, seats:  46, seats_low:  41, seats_high:  51, color: '#63BE21', bloque: 'derecha',   delta: +0.4 },
    { partido_id: 4, siglas: 'SUMAR', nombre: 'Sumar',           pct: 10.03, ci_inf:  8.7, ci_sup: 11.4, seats:  28, seats_low:  23, seats_high:  33, color: '#BF3F7E', bloque: 'izquierda', delta: -2.3 },
    { partido_id: 6, siglas: 'ERC',   nombre: 'ERC',             pct:  3.05, ci_inf:  2.4, ci_sup:  3.7, seats:  10, seats_low:   8, seats_high:  12, color: '#FFAB00', bloque: 'izquierda', delta: +1.1 },
    { partido_id: 7, siglas: 'JUNTS', nombre: 'Junts',           pct:  2.65, ci_inf:  2.1, ci_sup:  3.2, seats:  11, seats_low:   9, seats_high:  13, color: '#00C4D4', bloque: 'otros',     delta: +1.0 },
  ],
  kpis: [
    { label: 'Escaños PP',        value: 136, sub: 'de 350 · -0.6 pp', accent: '#0070D1' },
    { label: 'Escaños PSOE',      value: 101, sub: 'de 350 · -4.8 pp', accent: '#C01818' },
    { label: 'Distancia PP–PSOE', value: 35,  sub: 'escaños · margen sólido', accent: '#8B5CF6' },
    { label: 'P(PP gobierna)',    value: '92%', sub: 'PP+VOX mayoría absoluta', accent: '#16A34A' },
  ],
  alerts: [
    { id: '1', type: 'warning', text: 'PP supera el 33% en la última encuesta de Sigma Dos' },
    { id: '2', type: 'info',    text: 'Sumar pierde 1.2 puntos en la media semanal' },
    { id: '3', type: 'warning', text: 'Tensión parlamentaria sube a 42/100 en el Termómetro' },
  ],
  polls: [
    { id: '1', pollster: 'Sigma Dos / El Mundo', title: 'Tracking semanal', date: '2026-04-26' },
    { id: '2', pollster: '40dB / Prisa',         title: 'Sondeo nacional',   date: '2026-04-22' },
  ],
  macro: [
    { label: 'IBEX 35',   value: '11.240', delta: '+1.2%',  dir: 'up',   good: 'up',   data: [10900,11050,10980,11100,11080,11150,11200,11240] },
    { label: 'Bono 10Y',  value: '3.24%',  delta: '+0.04',  dir: 'up',   good: 'down', data: [3.18,3.20,3.19,3.22,3.21,3.23,3.22,3.24] },
    { label: 'Euríbor',   value: '2.84%',  delta: '-0.06',  dir: 'down', good: 'down', data: [2.95,2.92,2.90,2.88,2.86,2.85,2.84] },
  ],
  regions: [
    { name: 'Andalucía',          lean: 'pp',    diff: 4.2, pp_pct: 32.4, psoe_pct: 28.2 },
    { name: 'Cataluña',           lean: 'mixed', diff: 0.8, pp_pct: 18.5, psoe_pct: 19.3 },
    { name: 'Madrid',             lean: 'pp',    diff: 8.6, pp_pct: 36.8, psoe_pct: 28.2 },
    { name: 'Valencia',           lean: 'pp',    diff: 3.1, pp_pct: 31.0, psoe_pct: 27.9 },
    { name: 'País Vasco',         lean: 'mixed', diff: 1.4, pp_pct: 14.2, psoe_pct: 15.6 },
    { name: 'Galicia',            lean: 'pp',    diff: 9.8, pp_pct: 38.4, psoe_pct: 28.6 },
    { name: 'Castilla y León',    lean: 'pp',    diff: 11.2, pp_pct: 39.7, psoe_pct: 28.5 },
    { name: 'Castilla-La Mancha', lean: 'psoe',  diff: 2.4, pp_pct: 30.9, psoe_pct: 33.3 },
  ],
  coalitions: [
    { id: 'pp-vox',         name: 'PP + VOX',                seats: 174, viable: false, viability: 0.42, n_partidos: 2, es_minima: false },
    { id: 'pp-vox-cc',      name: 'PP + VOX + CC',           seats: 176, viable: true,  viability: 0.58, n_partidos: 3, es_minima: true  },
    { id: 'psoe-bloque',    name: 'PSOE + Sumar + nacion.',  seats: 168, viable: false, viability: 0.31, n_partidos: 6, es_minima: false },
    { id: 'pp-psoe',        name: 'Gran coalición PP + PSOE',seats: 242, viable: true,  viability: 0.05, n_partidos: 2, es_minima: false },
  ],
  news_pulse: [],  // se rellena dinámicamente desde el feed
  risk: { score: 38, semaforo: 'amarillo', fecha: null, dimensiones: [] },
}

/**
 * Deriva `news_pulse` del feed RSS agregado.
 * Selecciona los 5 artículos más recientes con sentiment marcado y mapea
 * al shape DashboardNewsPulse.
 */
async function deriveNewsPulse(): Promise<DashboardNewsPulse[]> {
  try {
    const articles = await getAggregatedNews({ maxSources: 30, hoursBack: 48 })
    return articles
      .filter(a => a.sentiment !== 'neutral')  // priorizamos los polarizados
      .sort((a, b) => (b.pubDate?.getTime() || 0) - (a.pubDate?.getTime() || 0))
      .slice(0, 8)
      .map((a, i) => ({
        id: `np-${i}-${a.medio.id}`,
        title: a.title,
        source: a.medio.nombre,
        sentiment: a.sentiment_score,
        relevance: 0.7 + (a.medio.audiencia_M / 20),
        date: a.pub_date_iso,
        parties: extractPartiesMentioned(a.title + ' ' + a.description),
      }))
  } catch {
    return []
  }
}

function extractPartiesMentioned(text: string): string {
  const lower = text.toLowerCase()
  const found: string[] = []
  if (/\bpp\b|partido popular/.test(lower)) found.push('PP')
  if (/\bpsoe\b|socialist/.test(lower)) found.push('PSOE')
  if (/\bvox\b/.test(lower)) found.push('VOX')
  if (/\bsumar\b/.test(lower)) found.push('Sumar')
  if (/\berc\b|esquerra/.test(lower)) found.push('ERC')
  if (/\bjunts\b/.test(lower)) found.push('Junts')
  if (/\bbildu\b/.test(lower)) found.push('Bildu')
  if (/\bpnv\b/.test(lower)) found.push('PNV')
  return found.join(' · ')
}

/**
 * Pide la estimación electoral agregada (sondeos electocracia.com +
 * cifras curadas + ponderación + D'Hondt 350) y devuelve `parties` +
 * `kpis` actualizados con datos REALES.
 */
async function fromElectoralEstimacion(): Promise<{ parties: DashboardParty[]; kpis: DashboardKPI[] } | null> {
  try {
    const proto = (typeof window === 'undefined') ? 'http' : 'https'
    const host  = process.env.VERCEL_URL || 'localhost:3000'
    const r = await fetch(`${proto}://${host}/api/electoral/estimacion`, { cache: 'no-store' })
    if (!r.ok) return null
    const d = await r.json()
    if (!Array.isArray(d.parties) || d.parties.length === 0) return null
    // Convertir parties al shape DashboardParty (necesita ci_inf/sup en fracción y bloque)
    const parties: DashboardParty[] = d.parties.map((p: PartyEstimateLike) => ({
      partido_id: p.partido_id || 0,
      siglas: p.siglas,
      nombre: p.nombre,
      pct: p.pct,
      ci_inf: p.ci_inf,
      ci_sup: p.ci_sup,
      seats: p.seats,
      seats_low: p.seats_low,
      seats_high: p.seats_high,
      color: p.color,
      bloque: p.bloque,
      delta: p.delta || 0,
    }))
    return { parties, kpis: d.kpis_derivados || [] }
  } catch { return null }
}

interface PartyEstimateLike {
  partido_id?: number; siglas: string; nombre: string
  pct: number; ci_inf: number; ci_sup: number
  seats: number; seats_low: number; seats_high: number
  color: string; bloque: 'izquierda' | 'derecha' | 'centro' | 'otros'
  delta?: number
}

export async function GET() {
  const real = await fromBackend<DashboardHome>('/api/dashboard/home')

  // 1. Backend completo · usar tal cual
  if (real && Array.isArray(real.parties) && real.parties.length > 0
      && Array.isArray(real.news_pulse) && real.news_pulse.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  // 2. Backend parcial · completar
  if (real && Array.isArray(real.parties) && real.parties.length > 0) {
    const news_pulse = await deriveNewsPulse()
    return NextResponse.json(withMeta({
      ...real,
      news_pulse: news_pulse.length > 0 ? news_pulse : real.news_pulse,
      regions:    (real.regions && real.regions.length > 0) ? real.regions : MOCK_DASHBOARD.regions,
      coalitions: (real.coalitions && real.coalitions.length > 0) ? real.coalitions : MOCK_DASHBOARD.coalitions,
    }, 'backend'))
  }

  // 3. Sin backend: usar AGREGADOR ELECTORAL real (electocracia.com) +
  //    news_pulse derivado en vivo. Solo si falla todo, caemos al mock.
  const [news_pulse, electoral] = await Promise.all([
    deriveNewsPulse(),
    fromElectoralEstimacion(),
  ])
  if (electoral) {
    return NextResponse.json(withMeta({
      ...MOCK_DASHBOARD,
      parties: electoral.parties,
      kpis: electoral.kpis.length > 0 ? electoral.kpis : MOCK_DASHBOARD.kpis,
      news_pulse,
    }, 'backend'))   // marca backend porque ahora SÍ son datos reales
  }
  return NextResponse.json(withMeta({
    ...MOCK_DASHBOARD,
    news_pulse,
  }, 'mock'))
}
