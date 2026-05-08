import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK = {
  clusters: [
    { categoria: 'economia', n_articulos: 312, velocidad_7d: 28, velocidad_label: 'acelerando', emocion_dominante: 'negativa', partidos_top: ['PSOE', 'PP'], recomendacion: 'Monitorizar intensamente' },
    { categoria: 'politica', n_articulos: 287, velocidad_7d: 12, velocidad_label: 'creciendo', emocion_dominante: 'negativa', partidos_top: ['PP', 'VOX'], recomendacion: 'Preparar respuesta' },
    { categoria: 'justicia', n_articulos: 198, velocidad_7d: -5, velocidad_label: 'decayendo', emocion_dominante: 'neutra', partidos_top: ['PSOE'], recomendacion: 'Observación pasiva' },
    { categoria: 'vivienda', n_articulos: 154, velocidad_7d: 41, velocidad_label: 'acelerando', emocion_dominante: 'negativa', partidos_top: ['Sumar', 'PSOE'], recomendacion: 'Monitorizar intensamente' },
    { categoria: 'sanidad', n_articulos: 98, velocidad_7d: 3, velocidad_label: 'estable', emocion_dominante: 'positiva', partidos_top: ['PSOE'], recomendacion: 'Oportunidad narrativa' },
  ],
}

export async function GET() {
  const data = await fromBackend<typeof MOCK>('/api/media-intel/narrativas')
  if (data) return NextResponse.json(withMeta(data, 'backend'))
  return NextResponse.json(withMeta(MOCK, 'mock'))
}
