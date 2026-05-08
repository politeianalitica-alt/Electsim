import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const real = await fromBackend<Record<string, unknown>>('/api/geopolitica/presencia-espanola-geo')
  if (real && typeof real === 'object') {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  const mock = {
    data: [
      { pais: 'Marruecos', lat: 31.8, lon: -7.1, categoria: 'diplomatica', intensidad: 85 },
      { pais: 'México', lat: 23.6, lon: -102.5, categoria: 'empresarial', intensidad: 72 },
      { pais: 'Brasil', lat: -14.2, lon: -51.9, categoria: 'empresarial', intensidad: 68 },
      { pais: 'Francia', lat: 46.2, lon: 2.2, categoria: 'diplomatica', intensidad: 78 },
      { pais: 'Alemania', lat: 51.2, lon: 10.5, categoria: 'diplomatica', intensidad: 71 },
      { pais: 'Ucrania', lat: 48.4, lon: 31.2, categoria: 'militar', intensidad: 45 },
    ],
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
