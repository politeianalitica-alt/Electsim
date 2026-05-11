import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface SentimentMapPoint {
  source_country: string
  source_region: string
  lat: number
  lon: number
  volume: number
  avg_relevance: number
  pos: number
  neg: number
  neu: number
  spain_high: number
}

const MOCK_POINTS: SentimentMapPoint[] = [
  { source_country: 'España',       source_region: 'Madrid',          lat: 40.42, lon: -3.70, volume: 412, avg_relevance: 0.74, pos:  88, neg: 198, neu: 126, spain_high: 380 },
  { source_country: 'España',       source_region: 'Cataluña',        lat: 41.39, lon:  2.16, volume: 187, avg_relevance: 0.71, pos:  38, neg:  92, neu:  57, spain_high: 172 },
  { source_country: 'España',       source_region: 'Andalucía',       lat: 37.39, lon: -5.99, volume: 121, avg_relevance: 0.66, pos:  41, neg:  44, neu:  36, spain_high: 102 },
  { source_country: 'España',       source_region: 'Valencia',        lat: 39.47, lon: -0.38, volume:  88, avg_relevance: 0.63, pos:  28, neg:  37, neu:  23, spain_high:  74 },
  { source_country: 'España',       source_region: 'País Vasco',      lat: 43.27, lon: -2.93, volume:  62, avg_relevance: 0.68, pos:  18, neg:  26, neu:  18, spain_high:  56 },
  { source_country: 'Francia',      source_region: 'Île-de-France',   lat: 48.86, lon:  2.35, volume:  44, avg_relevance: 0.42, pos:  10, neg:  22, neu:  12, spain_high:  18 },
  { source_country: 'Reino Unido',  source_region: 'Londres',         lat: 51.51, lon: -0.13, volume:  38, avg_relevance: 0.38, pos:  12, neg:  16, neu:  10, spain_high:  14 },
  { source_country: 'Alemania',     source_region: 'Berlín',          lat: 52.52, lon: 13.40, volume:  31, avg_relevance: 0.36, pos:  11, neg:  12, neu:   8, spain_high:  10 },
  { source_country: 'Italia',       source_region: 'Roma',            lat: 41.90, lon: 12.50, volume:  26, avg_relevance: 0.35, pos:   8, neg:  11, neu:   7, spain_high:   9 },
  { source_country: 'Portugal',     source_region: 'Lisboa',          lat: 38.72, lon: -9.14, volume:  22, avg_relevance: 0.48, pos:   9, neg:   7, neu:   6, spain_high:  13 },
  { source_country: 'Estados Unidos', source_region: 'Washington DC', lat: 38.91, lon: -77.04, volume: 19, avg_relevance: 0.45, pos:  5, neg:  10, neu:   4, spain_high:  12 },
  { source_country: 'Bélgica',      source_region: 'Bruselas (UE)',   lat: 50.85, lon:  4.35, volume:  17, avg_relevance: 0.58, pos:   6, neg:   7, neu:   4, spain_high:  14 },
]

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/news/sentiment-map${params ? '?' + params : ''}`
  const real = await fromBackend<{ points: SentimentMapPoint[] }>(path)
  if (real && Array.isArray(real.points) && real.points.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({ points: MOCK_POINTS }, 'mock'))
}
