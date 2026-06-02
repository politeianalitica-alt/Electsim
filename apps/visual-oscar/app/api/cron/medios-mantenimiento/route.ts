/**
 * Sprint 0+1 · Task 7 · Vercel Cron · GET /api/cron/medios-mantenimiento
 *
 * Endpoint disparado por Vercel Cron cada hora (vercel.json
 * `"schedule": "0 * * * *"`). Itera el registry `JOBS` de
 * `lib/medios/canonical/maintenance` y ejecuta sólo los jobs que
 * `shouldRunNow(job, now)` selecciona en función del momento UTC.
 *
 * Cada job está envuelto en try/catch: un fallo en un job NO aborta el resto;
 * el error se serializa como `JobResult` con `errors[]` poblado, manteniendo
 * la observabilidad por job.
 *
 * Auth: si `CRON_SECRET` está definida, exige `Authorization: Bearer
 * <secret>` (Vercel cron lo inyecta automáticamente). En dev local sin
 * la env var, el endpoint queda abierto.
 *
 * Respuesta: `{ ok: true, ranAt: ISO, results: JobResult[] }`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { JOBS, shouldRunNow, type JobResult } from '@/lib/medios/canonical/maintenance'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const results: JobResult[] = []

  for (const job of JOBS) {
    if (!shouldRunNow(job, now)) continue
    try {
      const r = await job.run()
      results.push(r)
    } catch (e: unknown) {
      results.push({
        job: job.name,
        durationMs: 0,
        itemsProcessed: 0,
        errors: [String((e as Error)?.message ?? e)],
      })
    }
  }

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    results,
  })
}
