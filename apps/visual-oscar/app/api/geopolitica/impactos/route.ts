import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const real = await fromBackend<Record<string, unknown>>('/api/geopolitica/impactos-geo?limite=20')
  if (real && typeof real === 'object') {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  const mock = {
    data: [
      {
        id: '1',
        titulo: 'Presión migratoria sobre agenda política',
        dimension: 'seguridad',
        severidad: 4,
        horizonte: 'corto',
        descripcion: 'Principal vector narrativo de VOX.',
        paises_origen: ['Marruecos'],
      },
      {
        id: '2',
        titulo: 'Impacto aranceles en sector agroexportador',
        dimension: 'economica',
        severidad: 3,
        horizonte: 'medio',
        descripcion: 'Exportaciones agroalimentarias en riesgo.',
        paises_origen: ['EE.UU.'],
      },
      {
        id: '3',
        titulo: 'Diversificación energética post-Argelia',
        dimension: 'energetica',
        severidad: 2,
        horizonte: 'largo',
        descripcion: 'España acelera GNL y renovables.',
        paises_origen: ['Argelia'],
      },
    ],
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
