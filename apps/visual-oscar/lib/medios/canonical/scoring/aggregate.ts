/**
 * Sprint 2 C4 · TopicProminenceScore agregado.
 *
 * Pesos de la fórmula (design Sprint 2 §4.3):
 *
 *   score = 0.30 · volume
 *         + 0.25 · momentum
 *         + 0.20 · sourceDiversity
 *         + 0.15 · tierWeight
 *         + 0.10 · entityDensity
 *
 * Σ pesos = 1.0 → con todos los componentes en [0, 1], el score agregado
 * también ∈ [0, 1] por construcción (no necesita clamp adicional, aunque
 * snapshot-writer.ts lo aplica defensivamente vía `clamp01`).
 *
 * Por qué estos pesos:
 *   · volume (30%): la masa cruda es la señal más directa de "qué se
 *     cuece" — un topic con 0 artículos no es prominente por mucho
 *     momentum o diversidad que tuviera ayer.
 *   · momentum (25%): un topic estable de fondo es menos noticioso que
 *     uno que acaba de explotar; el ratio current/baseline lo captura.
 *   · sourceDiversity (20%): que muchos medios cubran un topic implica
 *     consenso de agenda mediática (vs. titular sectario de 1 medio).
 *   · tierWeight (15%): no todos los medios pesan igual — un titular de
 *     El País + ABC + La Razón pesa más que 10 hiperlocales obscuros.
 *   · entityDensity (10%): topics ricos en actores/orgs son más analíticos
 *     y procesables (vs. opinión genérica sin nombres propios).
 *
 * Función pura — sin I/O, sin estado. Trivialmente testeable.
 */

export interface ProminenceComponents {
  volume: number
  momentum: number
  sourceDiversity: number
  tierWeight: number
  entityDensity: number
}

/**
 * Combina los 5 componentes en el TopicProminenceScore final.
 *
 * @param c Componentes individuales, cada uno ∈ [0, 1] (no se valida).
 * @returns Score agregado ∈ [0, 1] suponiendo entradas válidas.
 */
export function aggregateProminenceScore(c: ProminenceComponents): number {
  return (
    0.30 * c.volume +
    0.25 * c.momentum +
    0.20 * c.sourceDiversity +
    0.15 * c.tierWeight +
    0.10 * c.entityDensity
  )
}
