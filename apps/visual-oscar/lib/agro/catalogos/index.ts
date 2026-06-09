/**
 * Catálogos curados del sector Agro · Politeia Agro v3
 */
import empresasJson from './empresas.json'
import reguladoresJson from './reguladores.json'
import programasJson from './programas.json'
import areasJson from './areas.json'
import productosJson from './productos-agro.json'

export type AgroTabId =
  | 'global'
  | 'precios'
  | 'cadena'
  | 'produccion'
  | 'demanda'
  | 'politica'
  | 'sequia'

export interface EmpresaAgro {
  id: string
  nombre: string
  ticker: string | null
  segmento: string
  descripcion: string
  ibex: boolean
  mercado: string
  cnmv_url: string
  web: string
  cooperativa: boolean
}

export interface ReguladorAgro {
  id: string
  nombre: string
  siglas: string
  competencias: string
  web: string
  categoria: string
  ambito: 'estatal' | 'autonomico' | 'ue'
}

export interface ProgramaAgro {
  id: string
  programa: string
  estado: 'vigente' | 'finalizado' | 'planificado'
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

export interface AreaAgro {
  id: string
  titulo: string
  descripcion: string
  color: string
  keywords: string[]
  tab_destino: AgroTabId
}

export interface CategoriaProducto {
  id: string
  nombre: string
  color: string
}

export interface ProductoAgro {
  id: string
  nombre: string
  ticker: string | null
  categoria: string
  unidad: string
  contrato: string
  rol_espana: string
  color: string
  /** Slug en FRED_AGRO_IDS para histórico largo IMF (null si no hay serie). */
  fred_slug?: string | null
  /** Sector EU Agri-food Data Portal para precio físico (null si no aplica). */
  agrifood_sector?: string | null
  /** Capítulo HS (2 dígitos) para comercio (null si no es producto agro comerciable). */
  hs_chapter?: string | null
  /** Código HS4 para demanda por país-destino vía OEC/Comtrade. */
  hs4?: string | null
  /** Etiqueta honesta de qué representa el código HS en la vista de demanda. */
  demanda_label?: string | null
}

export const EMPRESAS_AGRO: EmpresaAgro[] = empresasJson.empresas as EmpresaAgro[]
export const REGULADORES_AGRO: ReguladorAgro[] = reguladoresJson.reguladores as ReguladorAgro[]
export const PROGRAMAS_AGRO: ProgramaAgro[] = programasJson.programas as ProgramaAgro[]
export const AREAS_AGRO: AreaAgro[] = areasJson.areas as AreaAgro[]
export const CATEGORIAS_PRODUCTOS: CategoriaProducto[] = productosJson.categorias as CategoriaProducto[]
export const PRODUCTOS_AGRO: ProductoAgro[] = productosJson.productos as ProductoAgro[]

export const CATALOGOS_AGRO_META = {
  empresas: empresasJson._meta,
  reguladores: reguladoresJson._meta,
  programas: programasJson._meta,
  areas: areasJson._meta,
  productos: productosJson._meta,
}
