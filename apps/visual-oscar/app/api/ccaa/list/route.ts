import { NextResponse } from 'next/server'
import { CCAA_LIST } from '@/lib/territorial/ccaa-catalog'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(withMeta({ items: CCAA_LIST, total: CCAA_LIST.length }, 'live'))
}
