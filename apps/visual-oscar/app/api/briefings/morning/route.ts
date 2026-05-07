import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// politeia_v3.py · GET /api/briefings/morning
const BRIEFING_BASE = {
  date: '',
  greeting: 'Buenos días.',
  highlights: [
    { kind: 'risk',     title: 'Riesgo político en MEDIO-ALTO (38/100)',
      detail: 'El Termómetro sube +12 pts en 48h por confluencia de prima de riesgo y tensión Junts.' },
    { kind: 'parliament', title: 'Convalidación decreto-ley 4/2026 al límite',
      detail: 'Margen ±2 escaños. PNV pendiente de cierre bilateral antes del 15 mayo.' },
    { kind: 'poll',     title: 'PP marca techo en 33,2% (Sigma Dos)',
      detail: 'PSOE 26,1% (-0,3) · VOX 12,8% (+0,2) · Sumar 9,5% (-0,8 en franja 25-44).' },
    { kind: 'market',   title: 'IBEX cierra -1,8% · prima 112 pb',
      detail: 'Banca (-2,4%) e inmobiliario (-3,1%) lideran las caídas.' },
    { kind: 'media',    title: '#MociónCensura top 1 nacional',
      detail: '56k tweets en 4h · sentimiento neto -0,42 (negativo).' },
  ],
  agenda: [
    { hora: '09:00', evento: 'Consejo de Ministros' },
    { hora: '11:00', evento: 'Pleno del Congreso · convalidación decreto-ley' },
    { hora: '13:00', evento: 'Sesión de control · preguntas a Sánchez y Yolanda Díaz' },
    { hora: '17:00', evento: 'Comparecencia Cuerpo en Comisión de Economía' },
    { hora: '19:30', evento: 'Cierre BME · seguimiento prima de riesgo' },
  ],
  podcast: {
    available: true,
    durations_min: [1, 5, 10],
    voice: 'es-ES-Neural2-D',
  },
}

export async function GET() {
  const real = await fromBackend<typeof BRIEFING_BASE>('/api/briefings/morning')
  if (real) return NextResponse.json(withMeta(real, 'backend'))

  return NextResponse.json(withMeta({
    ...BRIEFING_BASE,
    date: new Date().toISOString().slice(0, 10),
  }, 'mock'))
}
