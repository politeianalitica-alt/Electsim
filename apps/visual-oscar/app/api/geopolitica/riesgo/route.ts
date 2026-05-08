import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const real = await fromBackend<Record<string, unknown>>('/api/geopolitica/riesgo-pais?limite=30')
  if (real && typeof real === 'object') {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  const mock = {
    data: [
      { pais: 'Rusia', iso: 'RUS', score: 8.5, interes_espana: 7.2, lat: 60, lon: 100, categoria: 'militar' },
      { pais: 'Marruecos', iso: 'MAR', score: 6.1, interes_espana: 8.5, lat: 31.8, lon: -7.1, categoria: 'migracion' },
      { pais: 'Venezuela', iso: 'VEN', score: 7.3, interes_espana: 6.8, lat: 6.4, lon: -66.6, categoria: 'diplomatica' },
      { pais: 'Argelia', iso: 'DZA', score: 5.8, interes_espana: 7.9, lat: 28.0, lon: 2.6, categoria: 'energia' },
      { pais: 'Ucrania', iso: 'UKR', score: 9.1, interes_espana: 6.5, lat: 48.4, lon: 31.2, categoria: 'militar' },
    ],
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
