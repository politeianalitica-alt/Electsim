/**
 * BDNS Deep Enrichment Types.
 * Sprint TS-Deep B1: tipos enriquecidos para convocatorias BDNS.
 *
 * La convocatoria cruda de la API BDNS tiene pocos campos utiles:
 * titulo, organo, codigo, url. Esta interfaz enriquecida extrae
 * informacion de la ficha publica, clasifica sector, detecta
 * beneficiarios elegibles, calcula scoring ONG y documenta la
 * calidad del dato obtenido.
 *
 * Regla: si un campo no puede determinarse, se deja null/[]/false.
 * NUNCA se inventa. El campo `fuente_calidad` documenta que se intento
 * y que se obtuvo.
 */

// ─── Sector classification ─────────────────────────────────────────
export type SectorTercerSector =
  | 'accion_social'
  | 'discapacidad'
  | 'infancia_juventud'
  | 'migracion_refugio'
  | 'igualdad_genero'
  | 'cooperacion_internacional'
  | 'educacion'
  | 'salud'
  | 'empleo_insercion'
  | 'vivienda_sinhogarismo'
  | 'medio_ambiente'
  | 'cultura_deporte'
  | 'voluntariado'
  | 'dependencia_mayores'
  | 'emergencia_humanitaria'
  | 'derechos_humanos'
  | 'investigacion_social'
  | 'otro'

export type ColectivoObjetivo =
  | 'personas_discapacidad'
  | 'menores'
  | 'jovenes'
  | 'mayores'
  | 'migrantes'
  | 'refugiados'
  | 'mujeres_victimas_violencia'
  | 'personas_sin_hogar'
  | 'personas_drogodependientes'
  | 'reclusos_exreclusos'
  | 'minoria_etnica'
  | 'familias_vulnerables'
  | 'desempleados'
  | 'poblacion_rural'
  | 'comunidad_lgbtiq'
  | 'general'

export type NivelAdministrativo =
  | 'estatal'
  | 'autonomico'
  | 'local'
  | 'universitario'
  | 'ue'
  | 'otro'

export type ScoreLabelConv = 'alta' | 'media' | 'baja' | 'incierta'

// ─── Ficha quality ──────────────────────────────────────────────────
export interface FichaCalidad {
  /** Se intento leer la ficha publica de infosubvenciones */
  ficha_leida: boolean
  /** Se intento leer las bases reguladoras */
  bases_leidas: boolean
  /** Campos que no pudieron determinarse (para transparencia) */
  campos_faltantes: string[]
  /** Fuente de cada campo clave (api|ficha|bases|inferido|null) */
  origen_campos: Record<string, 'api' | 'ficha' | 'bases' | 'inferido' | null>
}

// ─── Territorialidad ────────────────────────────────────────────────
export interface Territorialidad {
  pais: string
  ccaa: string | null
  provincia: string | null
  municipio: string | null
}

// ─── Convocatoria enriquecida ───────────────────────────────────────
export interface BdnsConvocatoriaEnriquecida {
  id: string
  numero: string | null
  titulo: string
  organo: string | null
  nivel: NivelAdministrativo
  territorio: string | null
  fecha_recepcion: string | null
  fecha_publicacion: string | null
  fecha_inicio_solicitud: string | null
  fecha_fin_solicitud: string | null
  dias_restantes: number | null
  importe_total_eur: number | null
  beneficiarios_elegibles: string[]
  objeto: string | null
  sectores_ts: SectorTercerSector[]
  colectivo_objetivo: ColectivoObjetivo[]
  territorialidad: Territorialidad
  /** Plan de Recuperacion, Transformacion y Resiliencia (MRR/NextGenEU) */
  mrr: boolean
  url_ficha: string
  url_bases_reguladoras: string | null
  url_extracto: string | null
  score_ong: number
  score_label: ScoreLabelConv
  razones_score: string[]
  riesgos: string[]
  fuente_calidad: FichaCalidad
}

// ─── Concesion enriched ─────────────────────────────────────────────
export interface BdnsConcesionEnriquecida {
  id: string
  convocatoria_id: string | null
  beneficiario: string
  nif: string | null
  nif_tipo: 'G' | 'R' | 'F' | 'V' | 'Q' | 'A' | 'B' | 'otro' | null
  es_tercer_sector: boolean
  confianza_ts: 'alta' | 'media' | 'baja'
  razon_ts: string
  importe_eur: number | null
  fecha: string | null
  organo: string | null
  nivel: NivelAdministrativo
  ccaa: string | null
  sector_ts: SectorTercerSector | null
  url: string
}

// ─── Financiacion response shape ────────────────────────────────────
export interface FinanciacionCalidad {
  convocatorias_enriquecidas: number
  convocatorias_sin_ficha: number
  concesiones_clasificadas_ts: number
  concesiones_total: number
  fuentes_ok: string[]
  fuentes_error: { fuente: string; error: string }[]
}

export interface FinanciadorActivo {
  organismo: string
  nivel: NivelAdministrativo
  territorio: string | null
  oportunidades_abiertas: number
  importe_conocido_eur: number | null
  sectores: SectorTercerSector[]
  ultimo_movimiento: string | null
  fuente: string
}

export interface FinanciacionResumen {
  convocatorias_abiertas: number
  alto_encaje_ong: number
  cierran_15d: number
  importe_conocido_eur: number | null
  financiadores_activos: number
  concesiones_recientes: number
  total_concedido_eur: number | null
}
