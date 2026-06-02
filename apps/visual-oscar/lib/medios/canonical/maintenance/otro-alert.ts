/**
 * Sprint 0+1 · Task 7 · Job otro-alert.
 *
 * Alerta si el porcentaje de artículos clasificados como `OTRO` (sin topic
 * confiable) supera el 5% en la ventana 72h. Indicador de calidad del
 * clasificador semántico (Sprint 0.3 Ollama, Sprint 1.3 Groq).
 *
 * Sprint 0+1: lee `/api/medios/pipeline-metrics?window=72h` localmente
 * y, si threshold superado, registra console.warn (+ incrementa counter
 * para visibilidad en el cron output). En Sprint 2+ se sustituirá por
 * notificación real (Slack / email / in-app).
 *
 * Failure mode: cualquier error en fetch o JSON parse se atrapa y se
 * empuja a `errors[]` sin lanzar — el cron no debe abortar por un job
 * de alerta.
 */
import type { JobResult } from './index.ts'

export async function otroAlert(): Promise<JobResult> {
  const t0 = Date.now()
  const errors: string[] = []
  let processed = 0
  try {
    // Base URL local: en Vercel usa el deployment URL; en dev cae a localhost:3001.
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const r = await fetch(`${baseUrl}/api/medios/pipeline-metrics?window=72h`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (!r.ok) {
      errors.push(`pipeline-metrics HTTP ${r.status}`)
    } else {
      const data = (await r.json()) as { otroPercentage?: number }
      const pct = data.otroPercentage ?? 0
      if (pct > 5) {
        // eslint-disable-next-line no-console
        console.warn(
          `[otro-alert] OTRO % = ${pct.toFixed(2)} > threshold 5% (window 72h)`,
        )
        processed++
      }
    }
  } catch (e: unknown) {
    errors.push(String((e as Error)?.message ?? e))
  }
  return {
    job: 'otro-alert',
    durationMs: Date.now() - t0,
    itemsProcessed: processed,
    errors,
  }
}
