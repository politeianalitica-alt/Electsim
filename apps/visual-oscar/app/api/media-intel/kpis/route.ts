import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK = {
  articulos_totales: 1336,
  fuentes_activas: 47,
  narrativas_detectadas: 10,
  articulos_internacionales: 890,
}

export async function GET() {
  const data = await fromBackend<typeof MOCK>('/api/media-intel/kpis')
  if (data) return NextResponse.json(withMeta(data, 'backend'))
  return NextResponse.json(withMeta(MOCK, 'mock'))
}
