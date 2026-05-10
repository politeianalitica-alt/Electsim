import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface GeoEvent {
  date: string | null
  country: string
  type: string
  description: string
  impact: number
  url?: string | null
  source?: string | null
  spain_impact?: string | null
  title: string
}

const MOCK_EVENTS: GeoEvent[] = [
  {
    date: new Date(Date.now() - 2 * 3600000).toISOString(),
    country: 'Ucrania',
    type: 'Seguridad',
    description: 'Rusia intensifica ataques sobre infraestructura energética ucraniana afectando suministros a Europa del Este.',
    impact: 88,
    source: 'Reuters',
    spain_impact: 'alto',
    title: 'Nuevos ataques rusos a infraestructura energética ucraniana',
  },
  {
    date: new Date(Date.now() - 5 * 3600000).toISOString(),
    country: 'Marruecos',
    type: 'Diplomático',
    description: 'Rabat anuncia nuevas restricciones a paso de frontera en Ceuta y Melilla tras tensión bilateral.',
    impact: 74,
    source: 'El País',
    spain_impact: 'critico',
    title: 'Marruecos restringe paso fronterizo en enclaves españoles',
  },
  {
    date: new Date(Date.now() - 8 * 3600000).toISOString(),
    country: 'Irán',
    type: 'Seguridad',
    description: 'Tensiones en el Estrecho de Ormuz elevan precio del barril de Brent +3.2%. Impacto directo en costes energéticos españoles.',
    impact: 71,
    source: 'Bloomberg',
    spain_impact: 'alto',
    title: 'Irán escala tensión en Ormuz — Brent sube 3.2%',
  },
  {
    date: new Date(Date.now() - 14 * 3600000).toISOString(),
    country: 'Argelia',
    type: 'Energía',
    description: 'Argelia confirma mantenimiento del gasoducto Medgaz hasta 2027 — suministro español garantizado por 2 años.',
    impact: 62,
    source: 'Sonatrach',
    spain_impact: 'alto',
    title: 'Argelia ratifica suministro gas vía Medgaz hasta 2027',
  },
  {
    date: new Date(Date.now() - 22 * 3600000).toISOString(),
    country: 'Venezuela',
    type: 'Diplomático',
    description: 'Madrid congela negociaciones sobre deuda soberana venezolana — 500.000 ciudadanos con vínculos afectados.',
    impact: 55,
    source: 'Expansión',
    spain_impact: 'medio',
    title: 'España congela negociaciones de deuda con Venezuela',
  },
]

export async function GET() {
  const real = await fromBackend<GeoEvent[]>('/api/geopolitica/events?limit=12')
  if (Array.isArray(real) && real.length > 0) {
    return NextResponse.json(withMeta({ data: real }, 'backend'))
  }
  return NextResponse.json(withMeta({ data: MOCK_EVENTS }, 'mock'))
}
