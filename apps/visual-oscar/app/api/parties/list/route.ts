import { NextResponse } from 'next/server'
import { PARTIES } from '@/lib/parties/catalog'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(withMeta({ items: PARTIES, total: PARTIES.length }, 'live'))
}
