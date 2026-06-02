/**
 * Sprint 2 C4 · sourceDiversityScore = 1 − Herfindahl(shares por medio).
 *
 * Función pura — sin acceso a DB ni a `Date.now()`. Recibe una lista de
 * `{ source_id, count }` ya agregada por el store (un row por medio que
 * publicó al menos un artículo del topic en la ventana) y devuelve un
 * score normalizado en [0, 1].
 *
 * Herfindahl-Hirschman Index (HHI):
 *   share_i = count_i / Σ count
 *   HHI     = Σ share_i²
 *
 * HHI = 1 → un solo medio concentra todo (monopolio mediático del topic)
 * HHI = 1/n → reparto uniforme con n medios (máxima diversidad)
 *
 * Score = 1 − HHI:
 *   · 1 medio dominante → score → 0  (poca diversidad → titular sectario)
 *   · n medios uniformes → score → 1 (alta diversidad → cobertura amplia)
 *
 * Distribución vacía (sin artículos) → 0 (no penalizamos: el caller decide
 * si calcular o saltar; nuestro contrato dice "0 si no hay datos").
 *
 * Diseñado para ser callable desde snapshot-writer.ts (cron horario) sin
 * efectos secundarios → trivialmente testeable con fixtures sintéticos.
 */

export interface SourceCount {
  source_id: string
  count: number
}

/**
 * Calcula sourceDiversityScore ∈ [0, 1] a partir de la distribución por
 * medio de los artículos de un topic en una ventana.
 *
 * @param distribution Lista de `(source_id, count)` — orden no importa.
 * @returns Score normalizado: 0 = sin datos / monopolio, 1 = diversidad máxima.
 */
export function computeSourceDiversity(distribution: SourceCount[]): number {
  const total = distribution.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) return 0
  const herfindahl = distribution.reduce((sum, d) => {
    const share = d.count / total
    return sum + share * share
  }, 0)
  // Math.max guard: con un solo medio HHI=1 → 1-1=0; con muchos medios
  // muy concentrados pero no idénticos, HHI cae rápidamente. Nunca negativo.
  return Math.max(0, 1 - herfindahl)
}
