/**
 * Sprint 2 C4 · tierWeightScore = media ponderada del weight por medio,
 * derivado de `credibilidad` + `establishment` de medios_config.
 *
 * Función pura — sin acceso a DB. El caller (snapshot-writer.ts) lee
 * `medios_config` vía readAllMediosConfig() y nos pasa la lista, así
 * podemos cachear el catálogo entre topics en la misma ejecución.
 *
 * SCHEMA AWARENESS (design Sprint 2 §4.4):
 *   `medios_config` NO tiene columna `tier`. Las columnas disponibles
 *   relevantes son:
 *     - credibilidad NUMERIC(3,2) ∈ [0, 1]  (NULL si no clasificado)
 *     - establishment BOOLEAN              (NULL si no clasificado)
 *
 *   Derivamos el peso por medio con:
 *     weight(medio) = 0.6 · credibilidad + 0.4 · (establishment ? 1 : 0)
 *
 *   Justificación:
 *     · credibilidad domina (60%) porque mide calidad editorial directa
 *       (ground truth: MBFC factual rating + fact-check track record).
 *     · establishment (40%) marca peso institucional: medios con tirada
 *       histórica, asistentes a ruedas Moncloa, etc. — independiente de
 *       credibilidad (ABC y The Objective pueden ambos ser establishment
 *       sin coincidir en credibilidad).
 *
 *   Medio NO encontrado en medios_config → weight = 0.5 (neutro).
 *   Medio con credibilidad=NULL → tratado como 0.5.
 *   Medio con establishment=NULL → tratado como false (0).
 *
 * El score final del topic es la media ponderada por volumen:
 *   tierWeightScore = Σ (weight_i · count_i) / Σ count_i
 *
 * Distribución vacía → 0 (mismo contrato que diversity.ts).
 *
 * Diseñado para ser callable desde snapshot-writer.ts sin efectos
 * secundarios → trivialmente testeable con fixtures sintéticos.
 */
import type { MedioConfig } from '../stores/medios-config-store.ts'
import type { SourceCount } from './diversity.ts'

/** Peso neutro para medios desconocidos o sin clasificar. */
const DEFAULT_WEIGHT = 0.5

/** Pesos internos de la fórmula weight(medio). Σ = 1.0. */
const W_CREDIBILIDAD = 0.6
const W_ESTABLISHMENT = 0.4

/**
 * Calcula tierWeightScore ∈ [0, 1] como media ponderada por volumen del
 * weight individual de cada medio.
 *
 * @param distribution Lista de `(source_id, count)` — orden no importa.
 * @param mediosConfig Catálogo de medios (de readAllMediosConfig()).
 * @returns Score normalizado: 0 = sin datos, ≈0.5 si medios neutros,
 *          → 1 si predominan medios establecidos de alta credibilidad.
 */
export function computeTierWeight(
  distribution: SourceCount[],
  mediosConfig: MedioConfig[],
): number {
  const total = distribution.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) return 0

  const mediosMap = new Map(mediosConfig.map((m) => [m.clave, m]))

  const weightedSum = distribution.reduce((sum, d) => {
    const medio = mediosMap.get(d.source_id)
    const weight = medio ? weightFor(medio) : DEFAULT_WEIGHT
    return sum + weight * d.count
  }, 0)

  return weightedSum / total
}

/** Peso individual del medio según la fórmula §4.4. */
function weightFor(medio: MedioConfig): number {
  const cred = medio.credibilidad ?? DEFAULT_WEIGHT
  const est = medio.establishment ? 1 : 0
  return W_CREDIBILIDAD * cred + W_ESTABLISHMENT * est
}
