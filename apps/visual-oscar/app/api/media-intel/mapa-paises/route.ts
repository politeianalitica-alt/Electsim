import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK = {
  paises: [
    { country_code: 'GB', country_name: 'United Kingdom', n_articulos: 187, sentiment_avg: -0.12, lat: 51.5, lon: -0.1 },
    { country_code: 'DE', country_name: 'Germany', n_articulos: 142, sentiment_avg: 0.05, lat: 52.5, lon: 13.4 },
    { country_code: 'FR', country_name: 'France', n_articulos: 134, sentiment_avg: -0.08, lat: 48.9, lon: 2.3 },
    { country_code: 'US', country_name: 'United States', n_articulos: 98, sentiment_avg: -0.22, lat: 38.9, lon: -77.0 },
    { country_code: 'IT', country_name: 'Italy', n_articulos: 76, sentiment_avg: 0.11, lat: 41.9, lon: 12.5 },
    { country_code: 'PT', country_name: 'Portugal', n_articulos: 54, sentiment_avg: 0.18, lat: 38.7, lon: -9.1 },
    { country_code: 'NL', country_name: 'Netherlands', n_articulos: 43, sentiment_avg: 0.03, lat: 52.4, lon: 4.9 },
    { country_code: 'BE', country_name: 'Belgium', n_articulos: 38, sentiment_avg: -0.05, lat: 50.8, lon: 4.4 },
  ],
}

export async function GET() {
  const data = await fromBackend<typeof MOCK>('/api/media-intel/mapa-paises')
  if (data) return NextResponse.json(withMeta(data, 'backend'))
  return NextResponse.json(withMeta(MOCK, 'mock'))
}
