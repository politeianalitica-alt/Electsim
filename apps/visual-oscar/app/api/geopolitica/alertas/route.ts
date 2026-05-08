import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const real = await fromBackend<Record<string, unknown>>('/api/geopolitica/alertas-geo?limite=40')
  if (real && typeof real === 'object') {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  const mock = {
    data: [
      {
        id: '1',
        titulo: 'Crisis migratoria Canarias — nivel máximo',
        nivel: 'CRITICO',
        fecha: new Date().toISOString(),
        paises: ['Marruecos', 'Senegal'],
        descripcion: 'Llegadas +34% en 2026. Presión extrema.',
        fuente: 'FRONTEX',
      },
      {
        id: '2',
        titulo: 'Escalada tensión Oriente Medio',
        nivel: 'ALTO',
        fecha: new Date().toISOString(),
        paises: ['Israel', 'Irán'],
        descripcion: 'Riesgo de extensión del conflicto.',
        fuente: 'ACLED',
      },
      {
        id: '3',
        titulo: 'Aranceles EE.UU. a exportaciones españolas',
        nivel: 'ALTO',
        fecha: new Date().toISOString(),
        paises: ['EE.UU.'],
        descripcion: 'Exposición estimada 12.000M€.',
        fuente: 'Comisión Europea',
      },
      {
        id: '4',
        titulo: 'Elecciones Francia — escenario Le Pen',
        nivel: 'MEDIO',
        fecha: new Date().toISOString(),
        paises: ['Francia'],
        descripcion: 'Victoria Le Pen reforzaría narrativa VOX.',
        fuente: 'ElectSim',
      },
    ],
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
