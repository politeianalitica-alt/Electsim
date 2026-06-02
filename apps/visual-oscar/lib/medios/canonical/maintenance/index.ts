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
import { unmappedTagsJob } from './unmapped-tags.ts'
import { termsNotClassifiedJob } from './otro-cluster.ts'
import { computeAndWriteSnapshot } from '../scoring/snapshot-writer.ts'

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

// Lista hardcodeada de topicIds para el snapshot de prominence (C3). Coincide
// con `data/medios/topic-rules.json` salvo OTRO (placeholder ruidoso que no
// merece snapshot horario). C5 puede sustituir esto por un loader del
// catálogo si la taxonomía crece.
const TOPIC_IDS_FOR_SNAPSHOT = [
  'POLITICA_INSTITUCIONAL',
  'PARLAMENTO',
  'PARTIDOS',
  'JUDICIAL',
  'ECONOMIA',
  'EMPLEO',
  'VIVIENDA',
  'ENERGIA',
  'TERRITORIAL',
  'INTERNACIONAL',
  'UNION_EUROPEA',
  'DEFENSA',
  'SEGURIDAD',
  'MIGRACION',
  'SANIDAD',
  'EDUCACION',
  'MEDIO_AMBIENTE',
  'TECNOLOGIA',
  'COMUNICACION',
  'SOCIEDAD',
  'CRISIS',
  'CORRUPCION',
  'IBEREX_EMPRESAS',
  'SINDICAL_PATRONAL',
] as const

async function topicProminenceSnapshot(): Promise<JobResult> {
  const t0 = Date.now()
  const errors: string[] = []
  let processed = 0
  try {
    const result = await computeAndWriteSnapshot([...TOPIC_IDS_FOR_SNAPSHOT], '24h')
    processed = result.processed
    errors.push(...result.errors)
  } catch (e: unknown) {
    errors.push(String((e as Error)?.message ?? e))
  }
  return {
    job: 'topic-prominence-snapshot',
    durationMs: Date.now() - t0,
    itemsProcessed: processed,
    errors,
  }
}

export const JOBS: Job[] = [
  { name: 'cleanup-clusters', schedule: 'hourly', run: cleanupClusters },
  { name: 'recompute-source-scores', schedule: 'daily', run: recomputeSourceScores },
  { name: 'otro-alert', schedule: '6hourly', run: otroAlert },
  // Sprint 2 C3: snapshot horario de prominence por topic (vol + momentum).
  // C4 añadirá diversity/tier/entity_density; C5 derivará TopicState real.
  { name: 'topic-prominence-snapshot', schedule: 'hourly', run: topicProminenceSnapshot },
  // Sprint 2 C7: cada 6h detecta RSS tags vistos en article.raw_tags que no
  // están en data/medios/rss-tag-map.json. Output Top 50 → curación humana.
  { name: 'unmapped-tags', schedule: '6hourly', run: unmappedTagsJob },
  // Sprint 2 C8: cada 12h clusteriza artículos OTRO con TF-IDF + cosine
  // (sin LLM, sin embeddings). Identifica subtemas recurrentes que podrían
  // justificar nuevas reglas heurísticas o macrotemas en topic-rules.json.
  { name: 'terms-not-classified', schedule: '12hourly', run: termsNotClassifiedJob },
  // SPRINT_2_REGISTER_HERE (C9):
  //   { name: 'classifier-metrics',    schedule: 'daily',    run: classifierMetricsJob },
  // SPRINT_4_REGISTER_HERE (requerirá extender Schedule con 'quarter-hourly' |
  // 'half-hourly' + cambiar el cron de Vercel a "*/15 * * * *"):
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
