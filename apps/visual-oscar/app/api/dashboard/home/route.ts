import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  good: 'up' | 'down'
  data: number[]
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
  risk: { score: number; semaforo: string; fecha: string | null; dimensiones: unknown[] }
  _warnings?: string[]
}

const MOCK_DASHBOARD: DashboardHome = {
  last_updated: new Date().toISOString(),
  parties: [
    { partido_id: 2, siglas: 'PP',    nombre: 'Partido Popular', pct: 32.1, ci_inf: 30.6, ci_sup: 33.6, seats: 132, seats_low: 126, seats_high: 138, color: '#0070D1', bloque: 'derecha',   delta: +1.2 },
    { partido_id: 1, siglas: 'PSOE',  nombre: 'PSOE',            pct: 26.8, ci_inf: 25.3, ci_sup: 28.3, seats: 110, seats_low: 105, seats_high: 115, color: '#C01818', bloque: 'izquierda', delta: -2.1 },
    { partido_id: 3, siglas: 'VOX',   nombre: 'VOX',             pct: 12.4, ci_inf: 10.9, ci_sup: 13.9, seats:  42, seats_low:  38, seats_high:  46, color: '#63BE21', bloque: 'derecha',   delta: +0.4 },
    { partido_id: 4, siglas: 'SUMAR', nombre: 'Sumar',           pct: 10.2, ci_inf:  8.7, ci_sup: 11.7, seats:  35, seats_low:  31, seats_high:  39, color: '#BF3F7E', bloque: 'izquierda', delta: -1.1 },
    { partido_id: 6, siglas: 'ERC',   nombre: 'ERC',             pct:  3.1, ci_inf:  1.6, ci_sup:  4.6, seats:  11, seats_low:   9, seats_high:  13, color: '#FFAB00', bloque: 'izquierda', delta: +0.2 },
    { partido_id: 7, siglas: 'JUNTS', nombre: 'Junts',           pct:  2.8, ci_inf:  1.3, ci_sup:  4.3, seats:   7, seats_low:   5, seats_high:   9, color: '#00C4D4', bloque: 'otros',     delta: -0.1 },
  ],
  kpis: [
    { label: 'Escaños PP',        value: 132, sub: 'de 350 · +1.2 pp', accent: '#0070D1' },
    { label: 'Escaños PSOE',      value: 110, sub: 'de 350 · -2.1 pp', accent: '#C01818' },
    { label: 'Distancia PP–PSOE', value: 22,  sub: 'escaños · margen sólido', accent: '#8B5CF6' },
    { label: 'P(PP gobierna)',    value: '78%', sub: 'probabilidad simulada', accent: '#16A34A' },
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
  regions: [],
  coalitions: [],
  news_pulse: [],
  risk: { score: 38, semaforo: 'amarillo', fecha: null, dimensiones: [] },
}

export async function GET() {
  const real = await fromBackend<DashboardHome>('/api/dashboard/home')
  if (real && Array.isArray(real.parties) && real.parties.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta(MOCK_DASHBOARD, 'mock'))
}
