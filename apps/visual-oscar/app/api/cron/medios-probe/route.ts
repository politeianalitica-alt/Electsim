/**
 * GET /api/cron/medios-probe · Vercel Cron schedule `0 6 * * *` (diario 06:00 UTC).
 *
 * Snapshot diario del health endpoint para trazabilidad histórica del estado del
 * pipeline canónico. Loguea via console.log (capturado por Vercel runtime logs)
 * un JSON con timestamp + status para que el operador pueda construir series
 * temporales del semáforo.
 *
 * Auth opcional: si `CRON_SECRET` está definido, exige `Authorization: Bearer <secret>`.
 * Vercel Cron lo inyecta automáticamente en producción cuando la env var existe.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (expected) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const base = req.nextUrl.origin
  const t0 = Date.now()

  let snapshot: unknown = null
  let probeOk = false
  try {
    const r = await fetch(`${base}/api/medios/health`, { cache: 'no-store' })
    if (r.ok) {
      snapshot = await r.json()
      probeOk = true
    }
  } catch (err) {
    console.error('[medios-probe] fetch_failed', String(err))
  }

  const status =
    (snapshot as { status?: 'ok' | 'degraded' | 'critical' } | null)?.status ?? 'unknown'

  console.log(
    '[medios-probe]',
    JSON.stringify({
      ts: new Date().toISOString(),
      status,
      probe_ok: probeOk,
      elapsed_ms: Date.now() - t0,
    }),
  )

  return NextResponse.json({ ok: probeOk, snapshot })
}
