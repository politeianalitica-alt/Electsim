import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK_TOPICS = [
  { topic: 'moción de censura',     cnt: 87 },
  { topic: 'amnistía',              cnt: 64 },
  { topic: 'crisis de vivienda',    cnt: 58 },
  { topic: 'prima de riesgo',       cnt: 41 },
  { topic: 'transferencia IRPF',    cnt: 36 },
  { topic: 'sondeos electorales',   cnt: 33 },
  { topic: 'reforma del CGPJ',      cnt: 28 },
  { topic: 'aranceles agroalimentarios', cnt: 24 },
  { topic: 'PNV vs Bildu',          cnt: 19 },
  { topic: 'ley de movilidad',      cnt: 16 },
  { topic: 'IPC subyacente',        cnt: 14 },
  { topic: 'Ucrania · ayudas',      cnt: 11 },
]

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/news/topics${params ? '?' + params : ''}`
  const real = await fromBackend<{ topics: { topic: string; cnt: number }[] }>(path)
  if (real && Array.isArray(real.topics) && real.topics.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({ topics: MOCK_TOPICS }, 'mock'))
}
