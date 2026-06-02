/**
 * Sprint 2 C3-C5 · cron job hourly · snapshot writer de
 * topic_prominence_history.
 *
 * Cada hora (registrado en maintenance/index.ts como
 * `{ name: 'topic-prominence-snapshot', schedule: 'hourly' }`):
 *   1. Para cada topic activo del catálogo:
 *      a) Cuenta `volume` y `source_count` en la ventana 24h del topic
 *         (vía `readArticleVolumeInWindow`).
 *      b) Si volume = 0 → skip (no escribimos snapshots vacíos para no
 *         hinchar la tabla con ruido).
 *      c) Lee histórico de 7 días desde `topic_prominence_history` y
 *         deriva `momentumScore` con `computeMomentum`.
 *      d) Lee distribución por medio + entidades extraídas + catálogo de
 *         medios_config y deriva sourceDiversityScore / tierWeightScore /
 *         entityDensityScore.
 *      e) Calcula `volumeScore` (log normalizado).
 *      f) Agrega score = 0.30·V + 0.25·M + 0.20·D + 0.15·T + 0.10·E.
 *      g) Lee histórico de 14 días y deriva `state` con `deriveTopicState`
 *         (Sprint 2 C5 · STRUCTURAL/EMERGENT/STABLE).
 *      h) Insertar fila en `topic_prominence_history`.
 *
 * Sprint 2 C5: state es real (STRUCTURAL si volumen sostenido 14d ≥ 0.5,
 * EMERGENT si momentum 24h ≥ 0.7 con volumen < 0.4, STABLE en el resto).
 *
 * Test injection:
 *   `__withTestStore(stub, fn)` ejecuta `fn()` con `_storeOverride = stub`,
 *   restaurándolo al final. Patrón usado para evitar tocar DB real en CI
 *   (mismo principio que `generateJSON` inyectable en llm-classifier.ts).
 */
import { aggregateProminenceScore } from './aggregate.ts'
import { computeSourceDiversity } from './diversity.ts'
import { computeEntityDensity } from './entity-density.ts'
import { computeMomentum } from './momentum.ts'
import { deriveTopicState } from './state-machine.ts'
import { computeTierWeight } from './tier.ts'
import {
  readAllMediosConfig as _readAllMediosConfig,
  type MedioConfig,
} from '../stores/medios-config-store.ts'
import {
  readArticleDistributionByTopic as _readArticleDistributionByTopic,
  readArticleEntitiesByTopic as _readArticleEntitiesByTopic,
  readArticleVolumeInWindow as _readArticleVolumeInWindow,
  readHistoryForTopic as _readHistoryForTopic,
  writeSnapshot as _writeSnapshot,
  type ArticleVolumeRow,
  type HistorySnapshot,
  type SnapshotInsertRow,
} from '../stores/topic-prominence-store.ts'

const T24H = 24 * 3600_000
const T7D = 7 * T24H
const T14D = 14 * T24H

export interface TopicProminenceStore {
  readArticleVolumeInWindow: (
    topicId: string,
    from: Date,
    to: Date,
  ) => Promise<ArticleVolumeRow>
  readHistoryForTopic: (
    topicId: string,
    windowSpec: '24h' | '7d' | '30d',
    since: Date,
  ) => Promise<HistorySnapshot[]>
  readArticleDistributionByTopic: (
    topicId: string,
    from: Date,
    to: Date,
  ) => Promise<Array<{ source_id: string; count: number }>>
  readArticleEntitiesByTopic: (
    topicId: string,
    from: Date,
    to: Date,
  ) => Promise<Array<{ entities: Array<{ type: string; id: string }> }>>
  readAllMediosConfig: () => Promise<MedioConfig[]>
  writeSnapshot: (row: SnapshotInsertRow) => Promise<void>
}

// Override mutable, sólo usado por tests. En producción es null y las
// funciones reales del store son las efectivas.
let _storeOverride: TopicProminenceStore | null = null

/** Helper test-only: ejecuta `fn` con un store stub activo, restaurando al
 *  acabar. No exportar a producción ni usar fuera de tests. */
export async function __withTestStore<T>(
  stub: TopicProminenceStore,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = _storeOverride
  _storeOverride = stub
  try {
    return await fn()
  } finally {
    _storeOverride = prev
  }
}

function currentStore(): TopicProminenceStore {
  if (_storeOverride) return _storeOverride
  return {
    readArticleVolumeInWindow: _readArticleVolumeInWindow,
    readHistoryForTopic: _readHistoryForTopic,
    readArticleDistributionByTopic: _readArticleDistributionByTopic,
    readArticleEntitiesByTopic: _readArticleEntitiesByTopic,
    readAllMediosConfig: _readAllMediosConfig,
    writeSnapshot: _writeSnapshot,
  }
}

/**
 * Calcula snapshots de prominence para `topicIds` y los persiste en
 * `topic_prominence_history`. Omite topics con volume=0 (sin actividad
 * reciente). No lanza errores: cualquier fallo de un topic se ignora,
 * el cron continúa con el resto.
 *
 * @param topicIds Lista de topics canónicos a snapshottear.
 * @param windowSpec Granularidad de la ventana — C3 sólo usa '24h'.
 * @returns Resumen { processed, skipped } para observabilidad del cron.
 */
export async function computeAndWriteSnapshot(
  topicIds: string[],
  windowSpec: '24h' | '7d' | '30d' = '24h',
): Promise<{ processed: number; skipped: number; errors: string[] }> {
  const store = currentStore()
  const now = Date.now()
  let processed = 0
  let skipped = 0
  const errors: string[] = []

  // medios_config se cachea internamente (5 min); leerlo una vez por
  // ejecución del cron y reusar la misma snapshot para todos los topics.
  const mediosConfig = await store.readAllMediosConfig()

  for (const topicId of topicIds) {
    try {
      const windowFrom = new Date(now - T24H)
      const windowTo = new Date(now)
      const { volume, source_count } = await store.readArticleVolumeInWindow(
        topicId,
        windowFrom,
        windowTo,
      )
      if (volume === 0) {
        skipped++
        continue
      }

      const history = await store.readHistoryForTopic(
        topicId,
        windowSpec,
        new Date(now - T7D),
      )
      const momentumScore = computeMomentum(
        history.map((h) => ({ computed_at: h.computed_at, volume: h.volume })),
      )

      // volumeScore: log normalizado. Saturación a 100 artículos/topic/24h.
      // log10(101)/log10(100) ≈ 1.0022 → clamp a 1 con Math.min.
      const volumeScore = Math.min(Math.log(volume + 1) / Math.log(100), 1)

      const distribution = await store.readArticleDistributionByTopic(
        topicId,
        windowFrom,
        windowTo,
      )
      const articleEntities = await store.readArticleEntitiesByTopic(
        topicId,
        windowFrom,
        windowTo,
      )

      const sourceDiversityScore = computeSourceDiversity(distribution)
      const tierWeightScore = computeTierWeight(distribution, mediosConfig)
      const entityDensityScore = computeEntityDensity(articleEntities)

      const score = clamp01(
        aggregateProminenceScore({
          volume: volumeScore,
          momentum: momentumScore,
          sourceDiversity: sourceDiversityScore,
          tierWeight: tierWeightScore,
          entityDensity: entityDensityScore,
        }),
      )

      // Sprint 2 C5 · TopicState desde histórico 14d (segundo read; reusar el
      // de 7d no detectaría STRUCTURAL). El reloj `new Date(now)` se inyecta
      // explícitamente para que el state derivado sea consistente con el
      // mismo `now` usado en los filtros de ventana arriba.
      const stateHistory = await store.readHistoryForTopic(
        topicId,
        windowSpec,
        new Date(now - T14D),
      )
      const state = deriveTopicState(
        stateHistory.map((h) => ({
          computed_at: h.computed_at,
          volume_score: h.volume_score,
          momentum_score: h.momentum_score,
        })),
        new Date(now),
      )

      await store.writeSnapshot({
        topic_id: topicId,
        subtopic_id: '',
        window_spec: windowSpec,
        score,
        volume_score: volumeScore,
        momentum_score: momentumScore,
        source_diversity_score: sourceDiversityScore,
        tier_weight_score: tierWeightScore,
        entity_density_score: entityDensityScore,
        state,
        volume,
        source_count,
      })
      processed++
    } catch (e) {
      errors.push(`${topicId}: ${String((e as Error)?.message ?? e)}`)
    }
  }
  return { processed, skipped, errors }
}

function clamp01(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}
