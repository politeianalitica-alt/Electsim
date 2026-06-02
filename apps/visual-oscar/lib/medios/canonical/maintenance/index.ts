/**
 * Sprint 0+1 · Task 7 · Registry de jobs de mantenimiento del pipeline
 * Prensa canónico.
 *
 * Diseño:
 *   - Cada job es una función async que retorna `JobResult` (forma uniforme
 *     observable: nombre, duración, items procesados, errores).
 *   - El cron Vercel se dispara cada hora (schedule "0 * * * *" en
 *     vercel.json) y este registry decide qué jobs ejecutar mediante
 *     `shouldRunNow(job, now)` (selector basado en hora UTC).
 *   - Es seguro añadir/quitar jobs sin tocar el endpoint /api/cron/
 *     medios-mantenimiento — sólo extender el array JOBS.
 *
 * Sprint 0+1 jobs activos:
 *   · cleanup-clusters         · hourly  · marca clusters stale/closed
 *   · recompute-source-scores  · daily   · qualityScore por Source (3UTC)
 *   · otro-alert               · 6hourly · alerta si OTRO % > 5% en 72h
 *
 * Plug points (no implementados aún, comentados abajo):
 *   · Sprint 2: unmapped-tags, terms-not-classified, classifier-metrics
 *   · Sprint 4: topic-prominence (quarter-hourly), narrative-detection
 *               (half-hourly) — requerirán extender `Schedule` type.
 */
// Imports con extensión .ts (allowImportingTsExtensions en tsconfig + Node
// 24+ native TS runner) idéntico al patrón usado en lib/medios/canonical/
// pipeline.ts para value imports cross-file.
import { cleanupClusters } from './cleanup-clusters.ts'
import { recomputeSourceScores } from './recompute-source-scores.ts'
import { otroAlert } from './otro-alert.ts'

export interface JobResult {
  job: string
  durationMs: number
  itemsProcessed: number
  errors: string[]
}

export type Schedule = 'hourly' | '6hourly' | '12hourly' | 'daily'

export interface Job {
  name: string
  schedule: Schedule
  run: () => Promise<JobResult>
}

export const JOBS: Job[] = [
  { name: 'cleanup-clusters', schedule: 'hourly', run: cleanupClusters },
  { name: 'recompute-source-scores', schedule: 'daily', run: recomputeSourceScores },
  { name: 'otro-alert', schedule: '6hourly', run: otroAlert },
  // SPRINT_2_REGISTER_HERE:
  //   { name: 'unmapped-tags',         schedule: '6hourly',  run: unmappedTagsJob },
  //   { name: 'terms-not-classified',  schedule: '12hourly', run: termsNotClassifiedJob },
  //   { name: 'classifier-metrics',    schedule: 'daily',    run: classifierMetricsJob },
  // SPRINT_4_REGISTER_HERE (requerirá extender Schedule con 'quarter-hourly' |
  // 'half-hourly' + cambiar el cron de Vercel a "*/15 * * * *"):
  //   { name: 'topic-prominence',      schedule: 'quarter-hourly', run: topicProminenceJob },
  //   { name: 'narrative-detection',   schedule: 'half-hourly',    run: narrativeDetectionJob },
]

/**
 * Decide si un job debe ejecutarse en la hora `now` (UTC).
 *
 * Mapeo schedule → condición horaria:
 *   - hourly:   siempre true (cron base "0 * * * *" dispara cada hora)
 *   - 6hourly:  hour ∈ {0, 6, 12, 18}
 *   - 12hourly: hour ∈ {0, 12}
 *   - daily:    hour === 3 (ventana de menor tráfico)
 */
export function shouldRunNow(job: Job, now: Date): boolean {
  const hour = now.getUTCHours()
  switch (job.schedule) {
    case 'hourly':
      return true
    case '6hourly':
      return hour % 6 === 0
    case '12hourly':
      return hour % 12 === 0
    case 'daily':
      return hour === 3
    default:
      return false
  }
}
