import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// politeia_v3.py · GET /api/alerts
// Backend puede devolver una lista directa o un objeto { alerts: [...] }
const ALERTS_MOCK = [
  { id:'al-01', severity:'warning', text:'PP supera el 33% en la última encuesta de Sigma Dos' },
  { id:'al-02', severity:'info',    text:'Sumar pierde 1.2 puntos en la media semanal' },
  { id:'al-03', severity:'warning', text:'Tensión parlamentaria sube a 42/100 en el Termómetro' },
  { id:'al-04', severity:'info',    text:'Nueva encuesta: El Mundo / GAD3 — Trabajo de campo: 22–24 abr' },
  { id:'al-05', severity:'ok',      text:'Bono español 10Y se estabiliza en 3.24%' },
  { id:'al-06', severity:'warning', text:'VOX mantiene intención de presentar moción de censura parcial' },
]

export async function GET() {
  // Backend puede devolver un array directamente o { alerts: [...] }
  const real = await fromBackend<unknown>('/api/alerts')
  if (real !== null) {
    let alerts: unknown[]
    if (Array.isArray(real)) {
      alerts = real
    } else if (real && typeof real === 'object' && 'alerts' in (real as object)) {
      alerts = (real as { alerts: unknown[] }).alerts
    } else {
      alerts = []
    }
    // Normalizar shape: el backend usa {titulo, descripcion, severidad, tipo}
    // el frontend espera {id, severity, text}
    const normalized = alerts.map((a: unknown, i: number) => {
      const alert = a as Record<string, unknown>
      // Si ya tiene shape frontend, devolver tal cual
      if (alert.text) return alert
      // Convertir desde shape backend
      const sev = String(alert.severidad || alert.level || 'info').toLowerCase()
      const severity = sev === 'critical' || sev === 'high' ? 'warning'
        : sev === 'medium' ? 'info'
        : sev === 'low' ? 'ok'
        : sev
      return {
        id:       alert.id || `al-${i}`,
        severity,
        text:     alert.titulo || alert.title || alert.text || String(a),
        body:     alert.descripcion || alert.description || alert.body,
        tipo:     alert.tipo || alert.category,
        source:   alert.source || alert.modulo_origen,
        created_at: alert.created_at,
      }
    })
    return NextResponse.json(withMeta({ alerts: normalized }, 'backend'))
  }
  return NextResponse.json(withMeta({ alerts: ALERTS_MOCK }, 'mock'))
}
