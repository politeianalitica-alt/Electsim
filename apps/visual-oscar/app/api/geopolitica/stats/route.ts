import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const real = await fromBackend<Record<string, unknown>>('/api/geopolitica/geo-stats')
  if (real && typeof real === 'object') {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  const mock = {
    osint_24h: 47,
    alertas_activas: 8,
    paises_monitorizados: 23,
    presencia_activa: 12,
    alertas_count: { CRITICO: 2, ALTO: 3, MEDIO: 3 },
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
