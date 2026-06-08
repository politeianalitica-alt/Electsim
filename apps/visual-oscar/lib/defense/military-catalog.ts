/**
 * Catálogo militar mundial · perfil estilo IISS Military Balance.
 *
 * Datos cargados desde JSON externos en data/defense/:
 *   - paises.json       (17 países core: ESP, USA, CHN, FRA, DEU, GBR, RUS,
 *                        ITA, POL, IND, JPN, KOR, SAU, TUR, AUS, ISR, UKR)
 *   - paises-extra.json (26 países adicionales: NLD, BEL, PRT, GRC, NOR, SWE,
 *                        FIN, DNK, ROU, CZE, CAN, BRA, IRN, PAK, EGY, ARE,
 *                        TWN, IDN, ZAF, MAR, ARG, MEX, VNM, DZA, NGA, SGP, ...)
 *
 * Total: 43 países cubriendo ~95% del gasto militar mundial.
 * Datos públicos verificables. Actualizable editando los JSON.
 */

import paisesData from '@/data/defense/paises.json'
import paisesExtraData from '@/data/defense/paises-extra.json'

export type Alianza = 'OTAN' | 'EU' | 'UE-PESCO' | 'OCS' | 'ANZUS' | 'AUKUS' | 'QUAD' | 'BRICS' | 'OTROS'

export interface RamaArmada {
  rama: string
  efectivos: number
  unidades?: string[]
  equipoClave?: Array<{ tipo: string; cantidad: number; nota?: string }>
}

export interface Inventario {
  carros_combate?: number
  vehiculos_combate?: number
  artilleria?: number
  aeronaves_combate?: number
  helicopteros?: number
  buques_superficie?: number
  submarinos?: number
  portaaviones?: number
  uavs?: number
  cabezas_nucleares?: number | 'limitado'
}

export interface ProgramaActivo {
  nombre: string
  tipo: string
  socios: string[]
  cuantia_estimada_M?: number
  horizonte: string
  descripcion: string
  estado: 'planificación' | 'desarrollo' | 'producción' | 'despliegue'
}

export interface PaisMilitar {
  iso3: string
  pais: string
  pais_en: string
  region: string
  alianzas: Alianza[]
  capital: string
  poblacion_M: number
  pib_USD_b: number
  gasto_militar_USD_b: number
  gasto_militar_pct_pib: number
  ranking_global: number
  variacion_yoy_pct: number
  efectivos_activos: number
  efectivos_reserva: number
  efectivos_paramilitares: number
  ramas: RamaArmada[]
  inventario: Inventario
  capacidades: {
    nuclear: boolean
    espacial: boolean
    ciber: string
    expedicionaria: string
    portaaviones: number
    submarinos_nucleares: number
  }
  programas: ProgramaActivo[]
  doctrina: {
    documento_clave: string
    año: number
    enfoque: string
    url?: string
  }
  ministerio: {
    nombre: string
    ministro: string
    url_oficial?: string
    presupuesto_anual_M?: number
    agencias_clave: string[]
  }
  industria: {
    nivel: string
    empresas_top: string[]
    exportacion_USD_b?: number
    cuota_global_pct?: number
  }
  despliegues: Array<{ pais: string; tipo: string; efectivos: number; nota?: string }>
  postura: {
    nivel_riesgo: string
    factores: string[]
    conflictos_activos: string[]
  }
  fuentes: string[]
  actualizado: string
}

interface JsonData { paises: PaisMilitar[]; _meta?: Record<string, unknown> }

// Merge de los dos JSON
const _all = [
  ...(paisesData as unknown as JsonData).paises,
  ...(paisesExtraData as unknown as JsonData).paises,
]

// Deduplicar por ISO3 (por si hay overlap)
const _byIso = new Map<string, PaisMilitar>()
for (const p of _all) {
  if (!_byIso.has(p.iso3)) _byIso.set(p.iso3, p)
}

export const PAISES_MILITARES: PaisMilitar[] = Array.from(_byIso.values())

export function getPaisByIso3(iso3: string): PaisMilitar | null {
  return _byIso.get(iso3.toUpperCase()) ?? null
}

export function getPaisesPorAlianza(alianza: Alianza): PaisMilitar[] {
  return PAISES_MILITARES.filter(p => p.alianzas.includes(alianza))
}

export function getPaisesPorRegion(region: string): PaisMilitar[] {
  return PAISES_MILITARES.filter(p => p.region === region)
}

export function searchPaises(query: string): PaisMilitar[] {
  const q = query.toLowerCase().trim()
  if (!q) return PAISES_MILITARES
  return PAISES_MILITARES.filter(p =>
    p.pais.toLowerCase().includes(q) ||
    p.pais_en.toLowerCase().includes(q) ||
    p.iso3.toLowerCase().includes(q) ||
    p.capital.toLowerCase().includes(q) ||
    p.ministerio.ministro.toLowerCase().includes(q) ||
    p.industria.empresas_top.some(e => e.toLowerCase().includes(q))
  )
}

/**
 * Datos agregados por región / alianza / teatro.
 */
export function getAggregadosPorRegion(): Record<string, { n: number; gasto_USD_b: number; efectivos: number; portaaviones: number; nucleares: number }> {
  const out: Record<string, { n: number; gasto_USD_b: number; efectivos: number; portaaviones: number; nucleares: number }> = {}
  for (const p of PAISES_MILITARES) {
    if (!out[p.region]) out[p.region] = { n: 0, gasto_USD_b: 0, efectivos: 0, portaaviones: 0, nucleares: 0 }
    out[p.region].n++
    out[p.region].gasto_USD_b += p.gasto_militar_USD_b
    out[p.region].efectivos += p.efectivos_activos
    out[p.region].portaaviones += p.capacidades.portaaviones
    if (p.capacidades.nuclear) out[p.region].nucleares++
  }
  return out
}

/**
 * Teatros operacionales: agrupaciones de países por área de tensión.
 */
export const TEATROS = {
  'Indo-Pacífico': ['USA', 'CHN', 'JPN', 'KOR', 'AUS', 'IND', 'TWN', 'IDN', 'VNM', 'SGP', 'PAK'],
  'Flanco oriental OTAN': ['POL', 'ROU', 'CZE', 'NOR', 'SWE', 'FIN', 'DNK', 'DEU', 'GBR', 'USA', 'UKR'],
  'MENA': ['SAU', 'ISR', 'IRN', 'TUR', 'ARE', 'EGY', 'MAR', 'DZA'],
  'Europa Occidental': ['ESP', 'FRA', 'DEU', 'GBR', 'ITA', 'NLD', 'BEL', 'PRT', 'GRC'],
  'Latinoamérica': ['BRA', 'ARG', 'MEX'],
  'África Subsahariana': ['ZAF', 'NGA'],
}

export function getPaisesEnTeatro(teatro: keyof typeof TEATROS): PaisMilitar[] {
  const codes = TEATROS[teatro]
  return codes.map(c => _byIso.get(c)).filter((p): p is PaisMilitar => !!p)
}
