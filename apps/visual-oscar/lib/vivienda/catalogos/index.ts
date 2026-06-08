/**
 * Catálogos curados del sector Vivienda · Politeia Vivienda v3
 *
 * Centraliza el acceso a los JSON estáticos para que las vistas no toquen
 * los ficheros directamente y para que los tipos sean uniformes.
 *
 * Cada catálogo incluye un bloque `_meta` con descripción + fecha de
 * actualización + principio. NUNCA exponer datos sin fuente.
 */
import programasJson from './programas.json'
import reguladoresJson from './reguladores.json'
import empresasJson from './empresas.json'
import areasJson from './areas-tematicas.json'
import ongsJson from './ongs-vivienda.json'

// ─── Tipos ──────────────────────────────────────────────────────────

export interface Programa {
  id: string
  programa: string
  estado: 'vigente' | 'mercado' | 'finalizado' | 'planificado'
  descripcion: string
  presupuesto_eur: number | null
  presupuesto_descripcion: string
  eje: string
  color: string
  fuente_url: string
  fuente_label: string
  fecha_inicio: string | null
  fecha_fin: string | null
  ministerio: string | null
}

export interface Regulador {
  id: string
  nombre: string
  siglas: string
  competencias: string
  web: string
  categoria:
    | 'ministerio'
    | 'sociedad_publica'
    | 'supervisor'
    | 'asociacion_publica'
    | 'asociacion_privada'
    | 'corporacion_publica'
    | 'agencia_publica'
  ambito: 'estatal' | 'autonomico' | 'local' | 'ue'
}

export interface Empresa {
  id: string
  nombre: string
  ticker: string
  segmento: string
  descripcion: string
  ibex: boolean
  mercado: string
  cnmv_url: string
  web: string | null
}

export interface AreaTematica {
  id: string
  titulo: string
  descripcion: string
  color: string
  keywords: string[]
  tab_destino: ViviendaTabId
}

export interface OngVivienda {
  id: string
  nombre: string
  tipo: 'asociacion' | 'fundacion' | 'confederacion' | 'orden_religiosa' | 'red_de_redes'
  scope: string[]
  ambito_geografico: string[]
  ccaa_principales: string[]
  descripcion: string
  fundacion: number | null
  web: string
  nif_publico: string | null
  memoria_url: string | null
  fuente_label: string
  keywords_bdns: string[]
}

export type ViviendaTabId =
  | 'global'
  | 'precios'
  | 'mercado'
  | 'alquiler'
  | 'politica'
  | 'social'
  | 'turistica'
  | 'sostenibilidad'

// ─── Exports tipados ────────────────────────────────────────────────

export const PROGRAMAS: Programa[] = programasJson.programas as Programa[]
export const REGULADORES: Regulador[] = reguladoresJson.reguladores as Regulador[]
export const EMPRESAS: Empresa[] = empresasJson.empresas as Empresa[]
export const AREAS_TEMATICAS: AreaTematica[] = areasJson.areas as AreaTematica[]
export const ONGS_VIVIENDA: OngVivienda[] = ongsJson.ongs as OngVivienda[]

export const CATALOGOS_META = {
  programas: programasJson._meta,
  reguladores: reguladoresJson._meta,
  empresas: empresasJson._meta,
  areas: areasJson._meta,
  ongs: ongsJson._meta,
}
