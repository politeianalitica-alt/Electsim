import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Ticker en tiempo real · politeia_v3.py · GET /api/system/ticker
// Backend devuelve una lista directa de TickerItem:
//   { text, category, color, priority, timestamp }
const SAMPLE_EVENTS = [
  { kind: 'parliament', icon: '', text: 'Pleno del Congreso · convalidación decreto-ley 4/2026 · 11:00 mañana' },
  { kind: 'market',     icon: '', text: 'IBEX 35 sube +0,42% · banca lidera (+1,1%)' },
  { kind: 'poll',       icon: '', text: 'Sigma Dos: PP 33,2% · PSOE 26,1% · VOX 12,8%' },
  { kind: 'risk',       icon: '',  text: 'Termómetro de Riesgo Político: 38/100 (MEDIO-ALTO)' },
  { kind: 'media',      icon: '', text: '#MociónCensura trending top 1 nacional · 56k tweets' },
  { kind: 'geo',        icon: '', text: 'USTR anuncia aranceles 12% sobre aceite y vino' },
  { kind: 'gov',        icon: '', text: 'Moncloa convoca reunión con presidentes autonómicos PSOE' },
  { kind: 'parliament', icon: '', text: 'PNV exige reunión bilateral antes 15 mayo' },
]

export async function GET() {
  // Backend devuelve lista directa o { events: [...] }
  const real = await fromBackend<unknown>('/api/system/ticker')
  if (real !== null) {
    let events: unknown[]
    if (Array.isArray(real)) {
      events = real
    } else if (real && typeof real === 'object' && 'events' in (real as object)) {
      events = (real as { events: unknown[] }).events
    } else {
      events = []
    }
    if (events.length > 0) {
      return NextResponse.json(withMeta({ events }, 'backend'))
    }
  }

  // Mock dinámico: rotamos los eventos según el minuto actual
  const now = Date.now()
  const offset = Math.floor(now / 60000) % SAMPLE_EVENTS.length
  const events = Array.from({ length: 6 }, (_, i) => {
    const e = SAMPLE_EVENTS[(offset + i) % SAMPLE_EVENTS.length]
    return { ...e, ts: new Date(now - i * 4 * 60000).toISOString() }
  })
  return NextResponse.json(withMeta({ events }, 'mock'))
}
