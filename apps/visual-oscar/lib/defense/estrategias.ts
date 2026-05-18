/**
 * Estrategias industriales de defensa por país.
 * Loader del JSON externo + tipos + helpers.
 */
import data from '@/data/defense/estrategias-industriales.json'

export interface DocEstrategico {
  titulo: string
  tipo: 'ley_programacion' | 'concepto_defensa' | 'estrategia_seguridad' | 'white_paper' | 'plan_industrial' | 'directiva_politica'
  año: number
  vigencia_hasta?: number
  url_oficial: string
  resumen: string
  objetivos_clave?: string[]
  presupuesto_previsto_usd_m?: number
  periodo?: string
}

export interface OrgNode {
  id: string
  nombre: string
  nombre_corto: string
  tipo: 'ministerio' | 'agencia_adquisicion' | 'estado_mayor' | 'rama_militar' | 'agencia_exportacion' | 'organismo_id' | 'empresa_publica' | 'prime_contractor' | 'tier1'
  nivel: number
  parent_id?: string
  url_oficial?: string
  presupuesto_usd_m?: number
  descripcion_corta: string
  pais: string
}

export interface OrgRelacion {
  origen: string
  destino: string
  tipo: 'jerarquia' | 'supervision' | 'coordinacion' | 'contratacion'
}

export interface EmpresaDefensa {
  nombre: string
  ticker?: string
  tipo: 'prime_contractor' | 'tier1' | 'pyme_especializada' | 'empresa_publica'
  pais: string
  revenue_defensa_usd_m?: number
  capacidades: string[]
  programas_activos?: string[]
  exporta_a?: string[]
}

export interface ObjetivoCapacidad {
  dominio: string
  meta: string
  estado: 'en_plazo' | 'con_retraso' | 'cancelado' | 'completado'
  programa_vinculado?: string
  plazo_declarado?: string
}

export interface EstrategiaIndustrial {
  iso2: string
  iso3: string
  nombre: string
  documentos_estrategicos: DocEstrategico[]
  organigrama: { nodos: OrgNode[]; relaciones: OrgRelacion[] }
  empresas_clave: EmpresaDefensa[]
  objetivos_capacidad: ObjetivoCapacidad[]
}

interface JsonData { paises: EstrategiaIndustrial[]; _meta?: Record<string, unknown> }

export const ESTRATEGIAS: EstrategiaIndustrial[] = (data as unknown as JsonData).paises

export function getEstrategiaPorIso3(iso3: string): EstrategiaIndustrial | null {
  return ESTRATEGIAS.find(e => e.iso3 === iso3.toUpperCase()) ?? null
}

export function getEstrategiaPorIso2(iso2: string): EstrategiaIndustrial | null {
  return ESTRATEGIAS.find(e => e.iso2 === iso2.toUpperCase()) ?? null
}
