import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const real = await fromBackend<Record<string, unknown>>('/api/geopolitica/osint-feed?limite=20')
  if (real && typeof real === 'object') {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  const mock = {
    data: [
      {
        id: '1',
        titulo: 'Reunión bilateral España-Marruecos sobre migración',
        fuente: 'El País',
        fecha: new Date().toISOString(),
        urgencia: 4,
        categoria: 'migracion',
        resumen: 'Los ministros de exteriores han acordado nuevas medidas.',
      },
      {
        id: '2',
        titulo: 'OTAN reafirma compromiso con España en Mediterráneo',
        fuente: 'ABC',
        fecha: new Date().toISOString(),
        urgencia: 3,
        categoria: 'militar',
        resumen: 'La alianza confirma presencia naval.',
      },
      {
        id: '3',
        titulo: 'Tensión energética: España reduce dependencia del gas argelino',
        fuente: 'El Mundo',
        fecha: new Date().toISOString(),
        urgencia: 2,
        categoria: 'energia',
        resumen: 'El Gobierno diversifica proveedores.',
      },
    ],
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
