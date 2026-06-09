/**
 * Catálogos curados del sector Farma · Politeia Farma v3
 *
 * Centraliza el acceso a los JSON estáticos. Cada catálogo incluye `_meta`
 * con fuente verificable + fecha de actualización. Cero datos inventados.
 */
import empresasJson from './empresas-cotizadas.json'
import reguladoresJson from './reguladores.json'
import areasJson from './areas-terapeuticas.json'
import programasJson from './programas.json'

export interface EmpresaCotizada {
  id: string
  nombre: string
  ticker: string
  segmento: string
  descripcion: string
  ibex: boolean
  mercado: string
  cnmv_url: string
  web: string | null
  area_terapeutica: string[]
}

export interface ReguladorFarma {
  id: string
  nombre: string
  siglas: string
  competencias: string
  web: string
  categoria:
    | 'agencia_publica'
    | 'comision_interministerial'
    | 'ministerio'
    | 'organo_coordinacion'
    | 'agencia_ue'
    | 'direccion_ue'
    | 'red_agencias'
    | 'supervisor_financiero'
    | 'supervisor_mercado'
    | 'asociacion_sectorial'
    | 'corporacion_publica'
  ambito: 'estatal' | 'autonomico' | 'ue'
}

export type FarmaTabId =
  | 'global'
  | 'catalogo'
  | 'desabastecimientos'
  | 'pipeline'
  | 'mercado'
  | 'gasto'
  | 'regulacion'

export interface AreaTerapeutica {
  id: string
  titulo: string
  descripcion: string
  color: string
  keywords: string[]
  tab_destino: FarmaTabId
}

export interface ProgramaFarma {
  id: string
  programa: string
  estado: 'vigente' | 'en_negociacion' | 'finalizado' | 'planificado'
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

export const EMPRESAS_FARMA: EmpresaCotizada[] = empresasJson.empresas as EmpresaCotizada[]
export const REGULADORES_FARMA: ReguladorFarma[] = reguladoresJson.reguladores as ReguladorFarma[]
export const AREAS_TERAPEUTICAS: AreaTerapeutica[] = areasJson.areas as AreaTerapeutica[]
export const PROGRAMAS_FARMA: ProgramaFarma[] = programasJson.programas as ProgramaFarma[]

export const CATALOGOS_FARMA_META = {
  empresas: empresasJson._meta,
  reguladores: reguladoresJson._meta,
  areas: areasJson._meta,
  programas: programasJson._meta,
}
