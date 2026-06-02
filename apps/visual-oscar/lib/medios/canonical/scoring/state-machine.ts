/**
 * Sprint 2 C5 · TopicState derivation desde topic_prominence_history.
 *
 * Pure function — sin acceso a DB ni a `Date.now()` cacheado. Recibe el
 * histórico ya leído del store (lista de snapshots con scores) y devuelve
 * el `TopicState` derivado de forma determinista.
 *
 * Reglas (determinista por construcción, ver design Sprint 2 §TopicState):
 *   STRUCTURAL: avg(volume_score) últimos 14d ≥ 0.5
 *   EMERGENT:   avg(momentum_score) últimas 24h ≥ 0.7 AND
 *               avg(volume_score) últimas 24h < 0.4
 *   STABLE:     el resto (default)
 *
 * Casos especiales:
 *   · history vacío → STABLE
 *
 * Diseñado para ser callable desde snapshot-writer.ts (cron horario) sin
 * efectos secundarios → trivialmente testeable con fixtures sintéticos.
 *
 * `now` es inyectable como segundo parámetro (default `new Date()`) para
 * facilitar tests deterministas — establece el precedente que computeMomentum
 * (C3) adoptará en refactor posterior según code review.
 */
import type { TopicState } from '../types.ts'

export interface StateInput {
  computed_at: Date
  volume_score: number
  momentum_score: number
}

const T24H = 24 * 3600_000
const T14D = 14 * T24H
const STRUCTURAL_THRESHOLD = 0.5
const EMERGENT_MOMENTUM_THRESHOLD = 0.7
const EMERGENT_VOLUME_CEILING = 0.4

/**
 * Deriva `TopicState` (STRUCTURAL | EMERGENT | STABLE) a partir del
 * histórico de snapshots de `topic_prominence_history` de un topic concreto.
 *
 * @param history Lista de `(computed_at, volume_score, momentum_score)` —
 *                orden no importa, la función filtra por edad respecto a
 *                `now`.
 * @param now     Reloj de referencia (default `new Date()`). Inyectable
 *                para tests deterministas.
 * @returns TopicState derivado.
 */
export function deriveTopicState(
  history: StateInput[],
  now: Date = new Date(),
): TopicState {
  if (history.length === 0) return 'STABLE'

  const nowMs = now.getTime()

  // STRUCTURAL: avg(volume_score) últimos 14d ≥ 0.5
  const last14d = history.filter(
    (h) => nowMs - h.computed_at.getTime() <= T14D,
  )
  const avgVolume14d = avg(last14d.map((h) => h.volume_score))
  if (avgVolume14d >= STRUCTURAL_THRESHOLD) return 'STRUCTURAL'

  // EMERGENT: momentum alto + volume bajo (últimas 24h)
  const last24h = history.filter(
    (h) => nowMs - h.computed_at.getTime() <= T24H,
  )
  const avgMomentum24h = avg(last24h.map((h) => h.momentum_score))
  const avgVolume24h = avg(last24h.map((h) => h.volume_score))
  if (
    avgMomentum24h >= EMERGENT_MOMENTUM_THRESHOLD &&
    avgVolume24h < EMERGENT_VOLUME_CEILING
  ) {
    return 'EMERGENT'
  }

  return 'STABLE'
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((sum, n) => sum + n, 0) / arr.length
}
