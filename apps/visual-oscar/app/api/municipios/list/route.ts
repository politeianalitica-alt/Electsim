import { NextRequest, NextResponse } from 'next/server'
import { MUNICIPIOS, searchMunicipios } from '@/lib/territorial/municipios-catalog'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || ''
  const ccaa = req.nextUrl.searchParams.get('ccaa')
  const limit = Math.min(500, Number(req.nextUrl.searchParams.get('limit') || 100))
  let items = q ? searchMunicipios(q, 500) : MUNICIPIOS
  if (ccaa) items = items.filter(m => m.ccaa === ccaa)
  items = items.sort((a, b) => b.poblacion - a.poblacion).slice(0, limit)
  return NextResponse.json(withMeta({ items, total: items.length, grandTotal: MUNICIPIOS.length }, 'live'))
}
