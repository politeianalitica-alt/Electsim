/**
 * GET /api/medios/narrativas · stub Sprint 0+1.
 *
 * Sprint 4 llenará con detección real de narrativas (Narrative shape).
 * Sprint 0+1 devuelve un shape estable para que el frontend pueda
 * empezar a consumirlo sin esperar.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(
    {
      narratives: [],
      total: 0,
      generatedAt: new Date().toISOString(),
      _note:
        'Sprint 4 llena con detección real de narrativas. Sprint 0+1 devuelve stub estable.',
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  )
}
