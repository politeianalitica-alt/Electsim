/**
 * /api/parties/profile/[slug]
 *
 * Perfil completo de un partido con:
 *   - Bio Wikipedia
 *   - Iniciativas legislativas que promueve
 *   - Noticias RSS últimos 7 días
 *   - Sentimiento agregado + tendencia
 *   - Líderes del catálogo de figuras
 *   - Tags clave en cobertura mediática
 */

import { NextRequest, NextResponse } from 'next/server'
import { buildPartyProfile } from '@/lib/parties/profile'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const profile = await buildPartyProfile(decodeURIComponent(params.slug))
    if (!profile) return NextResponse.json(withMeta({ error: 'not_found' }, 'error'), { status: 404 })
    return NextResponse.json(withMeta(profile, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
