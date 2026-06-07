/**
 * lib/tercer-sector/global-opportunities/scoring.ts · Puente de scoring del
 * GLOBAL OPPORTUNITY GRAPH · Tercer Sector cockpit · Sprint Ga.
 *
 * Una `GlobalOpportunity` tiene un shape más rico que `OportunidadTS`, pero la
 * lógica de "¿es apta para una ONG y por qué?" debe ser UNA SOLA. Por eso este
 * módulo NO reimplementa reglas ni duplica listas (CPV/keywords): mapea una
 * `GlobalOpportunity` (parcial) al `ScoreInput` de
 * `lib/tercer-sector/oportunidades/scoring.ts` y delega en `scoreOportunidad`,
 * la FUENTE ÚNICA DE VERDAD.
 *
 * Devuelve los campos que la `GlobalOpportunity` espera:
 *   - `ngo_relevance_score` (= ScoreResult.score, 0-100)
 *   - `reasons`             (= ScoreResult.razones)
 * y, por conveniencia, el `label` y `riesgo` calculados (mismo veredicto).
 *
 * Pura y sin red: testeable con `node --experimental-strip-types`. Cero emojis.
 */

import {
  scoreOportunidad,
  type ScoreInput,
  type ScoreResult,
} from '../oportunidades/scoring.ts'
import type { TipoOportunidad } from '../oportunidades/types.ts'
import type { GlobalOpportunity } from './types.ts'

/**
 * Mapa `OpportunityKind` → `TipoOportunidad` para que la regla "+20 tipo afín"
 * de `scoreOportunidad` (que solo conoce el vocabulario de `OportunidadTS`)
 * dispare correctamente sobre el vocabulario más amplio del grafo global.
 *
 *   - grant / call_for_proposal → grant_ue   (subvención/convocatoria → afín)
 *   - implementing_partner_call → cooperacion_internacional (socio cooperación)
 *   - tender / RFP / ITB / RFQ / framework → licitacion (contrato; no afín)
 *   - consultancy → licitacion (servicio contratado)
 *   - EOI → licitacion (fase de un contrato)
 *   - award_notice / procurement_plan / project_pipeline → otro (no es "apto")
 *
 * NB: el mapeo a `grant_ue` no afirma que la fuente sea europea; reutiliza la
 * categoría "afín al tercer sector" que ya pondera el scoring. La trazabilidad
 * de la familia real vive en `GlobalOpportunity.source` / `kind`.
 */
const KIND_TO_TIPO: Record<GlobalOpportunity['kind'], TipoOportunidad> = {
  tender: 'licitacion',
  grant: 'grant_ue',
  call_for_proposal: 'grant_ue',
  expression_of_interest: 'licitacion',
  request_for_proposal: 'licitacion',
  request_for_quotation: 'licitacion',
  invitation_to_bid: 'licitacion',
  consultancy: 'licitacion',
  implementing_partner_call: 'cooperacion_internacional',
  framework_agreement: 'licitacion',
  award_notice: 'otro',
  procurement_plan: 'otro',
  project_pipeline: 'otro',
}

/** Lo mínimo que necesita el puente: un `GlobalOpportunity` parcial. */
export type GlobalScoreInput = Partial<GlobalOpportunity> & {
  /** Título es lo único imprescindible (igual que el scoring base). */
  title: string
  /** Override de "ahora" para tests deterministas (se reenvía al scoring base). */
  now?: Date
}

/** Resultado del puente: lo que `GlobalOpportunity` consume + label/riesgo. */
export interface GlobalScoreResult {
  /** = ScoreResult.score (0-100). Campo `ngo_relevance_score` de la oportunidad. */
  ngo_relevance_score: number
  /** = ScoreResult.razones. Campo `reasons` de la oportunidad. */
  reasons: string[]
  /** Etiqueta de aptitud (mismo veredicto que el scoring base). */
  label: ScoreResult['label']
  /** Riesgo de encaje/ejecución (mismo veredicto que el scoring base). */
  riesgo: ScoreResult['riesgo']
}

/**
 * Convierte una `GlobalOpportunity` (parcial) en el `ScoreInput` canónico.
 * Pura. No inventa datos: lo ausente queda `null`/`undefined` y el scoring base
 * decide (incl. el veredicto 'incierta' cuando faltan importe Y plazo).
 */
export function toScoreInput(o: GlobalScoreInput): ScoreInput {
  // Importe: preferimos el ya convertido a EUR; si no, el importe original.
  const importe_eur =
    typeof o.value_eur === 'number'
      ? o.value_eur
      : typeof o.value_amount === 'number'
        ? o.value_amount
        : null

  // Idioma exigido (si la fuente lo declara en requirements) — el scoring base
  // solo penaliza cuando hay idioma declarado y NO es operable (es/en).
  const idioma = o.requirements?.language ?? null

  // Lotes: el grafo no modela lotes explícitos; un acuerdo marco implica
  // división en pedidos, lo que mitiga la penalización por importe gigante.
  const tiene_lotes = o.kind === 'framework_agreement' ? true : null

  return {
    titulo: o.title,
    cpv: o.cpv ?? null,
    tipo: o.kind ? KIND_TO_TIPO[o.kind] : null,
    importe_eur,
    fecha_limite: o.deadline ?? null,
    documentos: Array.isArray(o.documents)
      ? o.documents.map((d) => ({ url: d.url }))
      : null,
    moneda: o.value_currency ?? null,
    idioma,
    descripcion: o.description ?? null,
    tiene_lotes,
    now: o.now,
  }
}

/**
 * Puntúa una `GlobalOpportunity` (parcial) reutilizando `scoreOportunidad`.
 * Determinista y transparente. NO duplica listas/reglas: todo cambio de criterio
 * vive en `oportunidades/scoring.ts`.
 */
export function scoreGlobalOpportunity(o: GlobalScoreInput): GlobalScoreResult {
  const r = scoreOportunidad(toScoreInput(o))
  return {
    ngo_relevance_score: r.score,
    reasons: r.razones,
    label: r.label,
    riesgo: r.riesgo,
  }
}
