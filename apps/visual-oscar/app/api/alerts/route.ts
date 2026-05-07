import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// politeia_v3.py · GET /api/alerts (simplificado)
const ALERTS_MOCK = [
  { id:'al-01', severity:'warning', text:'PP supera el 33% en la última encuesta de Sigma Dos' },
  { id:'al-02', severity:'info',    text:'Sumar pierde 1.2 puntos en la media semanal' },
  { id:'al-03', severity:'warning', text:'Tensión parlamentaria sube a 42/100 en el Termómetro' },
  { id:'al-04', severity:'info',    text:'Nueva encuesta: El Mundo / GAD3 — Trabajo de campo: 22–24 abr' },
  { id:'al-05', severity:'ok',      text:'Bono español 10Y se estabiliza en 3.24%' },
  { id:'al-06', severity:'warning', text:'VOX mantiene intención de presentar moción de censura parcial' },
]

export async function GET() {
  const real = await fromBackend<{ alerts: unknown[] }>('/api/alerts')
  if (real) return NextResponse.json(withMeta(real, 'backend'))
  return NextResponse.json(withMeta({ alerts: ALERTS_MOCK }, 'mock'))
}
