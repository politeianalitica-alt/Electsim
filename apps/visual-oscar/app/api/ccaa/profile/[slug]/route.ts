import { NextRequest, NextResponse } from 'next/server'
import { buildCCAAProfile } from '@/lib/territorial/ccaa-profile'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const profile = await buildCCAAProfile(decodeURIComponent(params.slug))
    if (!profile) return NextResponse.json(withMeta({ error: 'not_found' }, 'error'), { status: 404 })
    return NextResponse.json(withMeta(profile, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
