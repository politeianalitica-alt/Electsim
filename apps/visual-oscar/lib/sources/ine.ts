/**
 * Cliente para INE TempUS · Web Service del Instituto Nacional de Estadística
 * https://servicios.ine.es/wstempus/js/ES/...
 *
 * Endpoint público sin auth. Devuelve series temporales en JSON.
 *
 * Patrón: /DATOS_SERIE/{COD}?nult=N  → últimas N observaciones de la serie
 *         /SERIES_OPERACION/{ID}     → catálogo de series por operación
 */

const BASE = 'https://servicios.ine.es/wstempus/js/ES'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

interface IneObs {
  Anyo: number
  FK_Periodo: number      // 1-12 mensual o 21-24 trimestral o 28 anual
  T3_Periodo?: string
  Valor: number | null
  Tasas?: Array<{ Valor?: number; Tipo?: number; PeriodoComparacion?: { FK_Periodo: number; Anyo: number } }>
}

interface IneSerie {
  Id?: number
  COD?: string
  Nombre?: string
  Decimales?: number
  Data?: IneObs[]
}

export interface SeriePoint {
  anyo: number
  periodo: number       // 1-12 mes, 21-24 trimestre, 28 anual
  periodo_label: string // "2025-02" / "2025T2" / "2025"
  valor: number | null
  var_anual?: number | null
}

async function fetchSerie(cod: string, nult = 24, timeoutMs = 8000): Promise<IneSerie | null> {
  const url = `${BASE}/DATOS_SERIE/${cod}?nult=${nult}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 3600 },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text.length < 5) return null
    try { return JSON.parse(text) as IneSerie } catch { return null }
  } catch { return null }
}

/** Convierte FK_Periodo a etiqueta legible según frecuencia. */
function periodoLabel(anyo: number, p: number): string {
  if (p >= 1 && p <= 12) return `${anyo}-${String(p).padStart(2, '0')}`
  if (p >= 21 && p <= 24) return `${anyo}T${p - 20}`
  if (p === 28) return `${anyo}`
  return `${anyo}/${p}`
}

export async function getSerie(cod: string, nult = 24): Promise<{
  cod: string; nombre: string; points: SeriePoint[]; last?: SeriePoint
}> {
  const r = await fetchSerie(cod, nult)
  if (!r) return { cod, nombre: '', points: [] }
  const points: SeriePoint[] = (r.Data || []).map(o => ({
    anyo: o.Anyo,
    periodo: o.FK_Periodo,
    periodo_label: periodoLabel(o.Anyo, o.FK_Periodo),
    valor: o.Valor,
    var_anual: o.Tasas?.find(t => t.Tipo === 3)?.Valor ?? o.Tasas?.[0]?.Valor ?? null,
  }))
  return { cod, nombre: r.Nombre || '', points, last: points[points.length - 1] }
}

// ─── Series clave del sector vivienda ─────────────────────
export const INE_SERIES_VIVIENDA = {
  IPV_INDICE:       'IPV769',    // IPV nacional general índice trimestral (último 2025T2)
  IPV_VAR_ANUAL:    'IPV948',    // IPV nacional general variación anual %
  COMPRA_TOTAL:     'ETDP3337',  // Total compraventa viviendas anual
  COMPRA_LIBRE:     'ETDP1823',  // Vivienda libre mensual
  COMPRA_PROTEGIDA: 'ETDP1822',  // Vivienda protegida mensual
  COMPRA_NUEVA:     'ETDP1825',  // Vivienda nueva mensual
  COMPRA_USADA:     'ETDP1824',  // Vivienda segunda mano mensual
  ALQUILER_INDICE:  'IPVA5',     // Índice precio alquiler nacional anual
  ALQUILER_VAR:     'IPVA4',     // Variación anual alquiler nacional %
} as const

// ─── Catálogo curado de empresas del sector ───────────────
export const EMPRESAS_VIVIENDA = [
  {
    nombre: 'Aedas Homes', ticker: 'AEDAS.MC', ibex: false,
    descripcion: 'Promotor residencial · 1.000+ entregas/año · Castlelake.',
    capitalizacion_b: 1.2,
    web: 'https://www.aedashomes.com',
    segmento: 'Promotor obra nueva',
  },
  {
    nombre: 'Metrovacesa', ticker: 'MVC.MC', ibex: false,
    descripcion: 'Promotor histórico con suelo en Madrid, Barcelona y costa.',
    capitalizacion_b: 1.4,
    web: 'https://www.metrovacesa.com',
    segmento: 'Promotor · suelo',
  },
  {
    nombre: 'Neinor Homes', ticker: 'HOME.MC', ibex: false,
    descripcion: 'Promotor pure-play · joint venture con Stoneshield BTR.',
    capitalizacion_b: 1.0,
    web: 'https://www.neinorhomes.com',
    segmento: 'Promotor · BTR',
  },
  {
    nombre: 'Inmobiliaria Colonial', ticker: 'COL.MC', ibex: true,
    descripcion: 'SOCIMI oficinas prime · Madrid, Barcelona, París (SFL).',
    capitalizacion_b: 3.4,
    web: 'https://www.inmocolonial.com',
    segmento: 'SOCIMI · oficinas',
  },
  {
    nombre: 'Merlin Properties', ticker: 'MRL.MC', ibex: true,
    descripcion: 'SOCIMI multitenant · oficinas, logística, centros comerciales.',
    capitalizacion_b: 5.0,
    web: 'https://www.merlinproperties.com',
    segmento: 'SOCIMI · diversificado',
  },
  {
    nombre: 'Realia', ticker: 'RLIA.MC', ibex: false,
    descripcion: 'Carlos Slim · oficinas, residencial promoción, suelo finalista.',
    capitalizacion_b: 0.7,
    web: 'https://www.realia.es',
    segmento: 'Mixto · patrimonialista',
  },
  {
    nombre: 'Sacyr Patrimonio', ticker: 'SCYR.MC', ibex: false,
    descripcion: 'División inmobiliaria de Sacyr · concesiones y BTR.',
    capitalizacion_b: 0,
    web: 'https://www.sacyr.com',
    segmento: 'Promotor · concesiones',
  },
  {
    nombre: 'Vía Célere', ticker: '—', ibex: false,
    descripcion: 'Promotor en manos de fondos (Värde, Marathon, Attestor).',
    capitalizacion_b: 0,
    web: 'https://www.viacelere.com',
    segmento: 'Promotor · fondos',
  },
  {
    nombre: 'AzoraN', ticker: 'AZRT.MC', ibex: false,
    descripcion: 'Gestora de activos inmobiliarios · BTR, residencial, hoteles.',
    capitalizacion_b: 0.4,
    web: 'https://www.azora.com',
    segmento: 'Asset manager · BTR',
  },
  {
    nombre: 'Lar España', ticker: 'LRE.MC', ibex: false,
    descripcion: 'SOCIMI especializada en centros comerciales · Helix Investments.',
    capitalizacion_b: 0.7,
    web: 'https://www.larespana.com',
    segmento: 'SOCIMI · retail',
  },
] as const

export const REGULADORES_VIVIENDA = [
  {
    nombre: 'MIVAU',
    full: 'Ministerio de Vivienda y Agenda Urbana',
    web: 'https://www.mivau.gob.es',
    competencias: 'Política nacional de vivienda · Plan Estatal · Ley Vivienda 12/2023.',
  },
  {
    nombre: 'SAREB',
    full: 'Sociedad de Gestión de Activos Procedentes de la Reestructuración Bancaria',
    web: 'https://www.sareb.es',
    competencias: 'Gestión de activos inmobiliarios bancarios · 50.000 viviendas para uso social.',
  },
  {
    nombre: 'CCAA · Vivienda',
    full: 'Consejerías autonómicas de Vivienda',
    web: 'https://www.mivau.gob.es/vivienda/portal-vivienda/portal-de-comunidades-autonomas',
    competencias: 'Planes autonómicos · vivienda social · zona tensionada · IRAV (índice referencia alquiler).',
  },
  {
    nombre: 'AHE',
    full: 'Asociación Hipotecaria Española',
    web: 'https://www.ahe.es',
    competencias: 'Patronal sectorial · estadísticas mercado hipotecario.',
  },
  {
    nombre: 'CGN',
    full: 'Consejo General del Notariado',
    web: 'https://www.notariado.org',
    competencias: 'Centro Información Estadística · transmisiones autenticadas.',
  },
  {
    nombre: 'BdE',
    full: 'Banco de España · Servicio de Reclamaciones',
    web: 'https://www.bde.es',
    competencias: 'Tipos de referencia hipotecarios (IRPH, EURIBOR), supervisión BdE.',
  },
  {
    nombre: 'AVS',
    full: 'Asociación Española de Promotores Públicos de Vivienda',
    web: 'https://www.a-v-s.org',
    competencias: 'Federación de empresas y entes públicos de vivienda asequible.',
  },
] as const

export const PROGRAMAS_VIVIENDA = [
  {
    programa: 'Plan Estatal Vivienda 2026-2030', estado: 'En diseño', presupuesto_b: 6.0,
    descripcion: 'Sucesor del PEV 2022-2025 · ayudas alquiler, accesibilidad, rehabilitación.',
    color: '#5B21B6',
  },
  {
    programa: 'Bono Alquiler Joven', estado: 'En vigor', presupuesto_b: 0.45,
    descripcion: '250 €/mes durante 2 años para jóvenes 18-35 con renta < 3 IPREM.',
    color: '#0EA5E9',
  },
  {
    programa: 'Ley 12/2023 · Vivienda', estado: 'En aplicación CCAA', presupuesto_b: 0,
    descripcion: 'Zonas tensionadas, índice IRAV, gran tenedor (5 viviendas urbanas).',
    color: '#DC2626',
  },
  {
    programa: 'Plan SAREB 50k', estado: 'En ejecución', presupuesto_b: 0,
    descripcion: 'Cesión 50.000 viviendas SAREB a CCAA para alquiler asequible.',
    color: '#16A34A',
  },
  {
    programa: 'Fondos NextGen Rehabilitación', estado: 'En ejecución', presupuesto_b: 3.42,
    descripcion: 'PRTR · 510.000 viviendas rehabilitadas energéticamente para 2026.',
    color: '#F97316',
  },
  {
    programa: 'Build to Rent (BTR)', estado: 'En crecimiento', presupuesto_b: 0,
    descripcion: 'Pipeline 25.000+ viviendas en alquiler institucional 2024-2027.',
    color: '#0F766E',
  },
] as const
