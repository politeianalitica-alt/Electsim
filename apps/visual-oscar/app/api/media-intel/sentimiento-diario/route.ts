import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function mockSeries() {
  const parties = ['PP', 'PSOE', 'VOX', 'Sumar']
  const base: Record<string, number> = { PP: 0.12, PSOE: -0.08, VOX: -0.35, Sumar: 0.05 }
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86_400_000)
    const entry: Record<string, string | number> = { fecha: d.toISOString().slice(0, 10) }
    for (const p of parties) {
      entry[p] = +(base[p] + (Math.random() - 0.5) * 0.3).toFixed(3)
    }
    return entry
  })
}

const MOCK = { series: mockSeries(), entidades: ['PP', 'PSOE', 'VOX', 'Sumar'] }

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const qs = sp.toString() ? `?${sp.toString()}` : ''
  const data = await fromBackend<typeof MOCK>(`/api/media-intel/sentimiento-diario${qs}`)
  if (data) return NextResponse.json(withMeta(data, 'backend'))
  return NextResponse.json(withMeta(MOCK, 'mock'))
}
