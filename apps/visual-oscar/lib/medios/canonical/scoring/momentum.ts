/**
 * Sprint 2 C3 · momentumScore desde topic_prominence_history.
 *
 * Pure function — sin acceso a DB ni a `Date.now()` cacheado. Recibe el
 * histórico ya leído del store (lista de snapshots ordenados o no por fecha)
 * y devuelve un score normalizado en [0, 1].
 *
 * Fórmula (ver design Sprint 2 §momentumScore):
 *   recent_window   = últimas 24 h
 *   baseline_window = 7 d previas (excluyendo las últimas 24 h)
 *
 *   current_volume = Σ volume de snapshots en recent_window
 *   baseline_mean  = mean(volume de snapshots en baseline_window)
 *
 *   momentum      = current_volume / max(baseline_mean, 1)
 *   momentumScore = min(momentum / 3, 1)   // satura a 3× baseline → 1
 *
 * Casos especiales:
 *   · history vacío               → 0
 *   · sin baseline (todo recent)  → momentum = current / max(0, 1) = current,
 *                                   score = min(current / 3, 1) ∈ (0, 1]
 *   · sin recent (todo baseline)  → momentum = 0 / mean = 0 → score = 0
 *
 * Diseñado para ser callable desde snapshot-writer.ts (cron horario) sin
 * efectos secundarios → trivialmente testeable con fixtures sintéticos.
 */

export interface VolumePoint {
  computed_at: Date
  volume: number
}

const T24H = 24 * 3600_000

/**
 * Calcula momentumScore ∈ [0, 1] a partir del histórico de snapshots
 * `topic_prominence_history` de un topic concreto.
 *
 * @param history Lista de `(computed_at, volume)` — orden no importa,
 *                la función los segmenta por edad respecto a `Date.now()`.
 * @returns Score normalizado en [0, 1] (1 = saturado a 3× baseline).
 */
export function computeMomentum(history: VolumePoint[]): number {
  if (history.length === 0) return 0
  const now = Date.now()
  const recent = history.filter((h) => now - h.computed_at.getTime() <= T24H)
  const baseline = history.filter((h) => now - h.computed_at.getTime() > T24H)
  const currentVolume = recent.reduce((sum, h) => sum + h.volume, 0)
  const baselineMean =
    baseline.length > 0
      ? baseline.reduce((sum, h) => sum + h.volume, 0) / baseline.length
      : 0
  const momentum = currentVolume / Math.max(baselineMean, 1)
  return Math.min(momentum / 3, 1)
}
