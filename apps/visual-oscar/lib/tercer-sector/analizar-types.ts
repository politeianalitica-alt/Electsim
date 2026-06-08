/**
 * AnalisisLicitacionONG — Analisis profundo de un pliego de licitacion.
 * Sprint TS-Deep B2.
 *
 * Estructura el resultado de analizar documentos de un expediente
 * de contratacion publica con foco en aptitud para ONG/tercer sector.
 *
 * Cada campo documenta su origen (regex vs LLM) en `evidencia`.
 * Si un campo no se encuentra, queda null (no se inventa).
 * Si regex y LLM discrepan, se marcan ambos + conflicto.
 */

// ─── Expediente ─────────────────────────────────────────────────────
export interface ExpedienteInfo {
  titulo: string | null
  comprador: string | null
  objeto: string | null
  cpv: string[]
  procedimiento: string | null
  tipo_contrato: string | null
  lugar_ejecucion: string | null
  idioma: string | null
}

// ─── Economia ───────────────────────────────────────────────────────
export interface LoteInfo {
  numero: string
  titulo: string
  importe_eur: number | null
  cpv: string[]
}

export interface GarantiasInfo {
  provisional: string | null
  definitiva: string | null
}

export interface EconomiaInfo {
  presupuesto_base_eur: number | null
  valor_estimado_eur: number | null
  iva: string | null
  lotes: LoteInfo[]
  garantias: GarantiasInfo
}

// ─── Plazos ─────────────────────────────────────────────────────────
export interface PlazosInfo {
  presentacion: string | null
  apertura: string | null
  ejecucion: string | null
  dias_restantes: number | null
}

// ─── Elegibilidad ───────────────────────────────────────────────────
export interface ElegibilidadInfo {
  admite_entidades_sin_animo_lucro: boolean | null
  requiere_clasificacion_empresarial: boolean | null
  requiere_ute: boolean | null
  permite_subcontratacion: boolean | null
  exige_inscripcion_registro: string[]
  restricciones_territoriales: string[]
}

// ─── Solvencia ──────────────────────────────────────────────────────
export interface SolvenciaInfo {
  economica: string | null
  economica_importe_min_eur: number | null
  tecnica: string | null
  experiencia_previa: string | null
  personal_minimo: string | null
  certificados: string[]
}

// ─── Criterios de adjudicacion ──────────────────────────────────────
export type CriterioTipo = 'precio' | 'calidad' | 'social' | 'medioambiental' | 'experiencia' | 'otro'

export interface CriterioAdjudicacion {
  nombre: string
  peso: number | null
  tipo: CriterioTipo
}

// ─── Clausulas sociales ─────────────────────────────────────────────
export interface ClausulasSocialesInfo {
  tiene_clausulas_sociales: boolean
  resumen: string | null
  evidencias: string[]
}

// ─── Riesgo ─────────────────────────────────────────────────────────
export interface RiesgoInfo {
  nivel: 'bajo' | 'medio' | 'alto' | 'incierto'
  items: string[]
}

// ─── Aptitud ONG ────────────────────────────────────────────────────
export interface AptitudOngInfo {
  score: number
  label: 'alta' | 'media' | 'baja' | 'incierta'
  razones: string[]
  blockers: string[]
  recomendacion: string
}

// ─── Evidencia ──────────────────────────────────────────────────────
export interface DocumentoAnalizado {
  url: string
  tipo: string
  formato: string
  ok: boolean
  error?: string
}

export interface EvidenciaInfo {
  documentos_analizados: DocumentoAnalizado[]
  campos_extraidos_por_regex: string[]
  campos_extraidos_por_llm: string[]
  campos_no_encontrados: string[]
  conflictos: { campo: string; valor_regex: string; valor_llm: string }[]
  confidence: number
}

// ─── Tipo documento de pliego ───────────────────────────────────────
export type TipoDocumentoPliego =
  | 'pcap'
  | 'ppt'
  | 'anuncio'
  | 'anexo'
  | 'memoria'
  | 'deuc'
  | 'otro'

// ─── Resultado completo ─────────────────────────────────────────────
export interface AnalisisLicitacionONG {
  expediente: ExpedienteInfo
  economia: EconomiaInfo
  plazos: PlazosInfo
  elegibilidad: ElegibilidadInfo
  solvencia: SolvenciaInfo
  criterios: CriterioAdjudicacion[]
  clausulas_sociales: ClausulasSocialesInfo
  riesgos: RiesgoInfo
  aptitud_ong: AptitudOngInfo
  evidencia: EvidenciaInfo
  generated_by_llm: boolean
}
