/**
 * Cliente para Red Eléctrica de España (REE) API · apidatos.ree.es
 *
 * Endpoint público sin auth, devuelve JSON-API. Datos del sistema eléctrico
 * peninsular: demanda, generación por tecnología, precios del mercado spot,
 * intercambios internacionales, balance mensual, emisiones CO2.
 *
 * Docs: https://www.ree.es/es/apidatos
 */

const BASE = 'https://apidatos.ree.es/es/datos'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

interface ReeValue {
  value: number
  percentage?: number
  datetime: string
}
interface ReeIncluded {
  type: string
  id: string
  attributes: {
    title?: string
    color?: string
    type?: string
    magnitude?: string
    composite?: boolean
    last_update?: string
    values?: ReeValue[]
  }
}
interface ReeResponse {
  data?: { id?: string; attributes?: { title?: string; description?: string } }
  included?: ReeIncluded[]
  errors?: Array<{ status: string; title: string; detail: string }>
}

export interface ReeSerie {
  id: string
  title: string
  color?: string
  magnitude?: string
  type?: string             // 'Renovable' | 'No-Renovable' | 'Generación total' | etc.
  composite?: boolean       // true para series agregadas (no contar como tecnología)
  values: ReeValue[]
  last_value?: number
  last_datetime?: string
  total?: number
}

async function fetchRee(
  path: string,
  qs: Record<string, string>,
  timeoutMs = 6000,
): Promise<ReeResponse> {
  const url = new URL(`${BASE}/${path}`)
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, v)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 600 },
    })
    clearTimeout(timer)
    if (!res.ok) return { errors: [{ status: String(res.status), title: 'HTTP', detail: 'fetch failed' }] }
    return (await res.json()) as ReeResponse
  } catch (e: unknown) {
    return { errors: [{ status: '0', title: 'TIMEOUT', detail: e instanceof Error ? e.message : 'unknown' }] }
  }
}

function pick(r: ReeResponse): ReeSerie[] {
  if (!r.included) return []
  return r.included.map(s => {
    const vals = s.attributes?.values || []
    const last = vals[vals.length - 1]
    const total = vals.reduce((acc, v) => acc + (v.value || 0), 0)
    return {
      id: s.id,
      title: s.attributes?.title || '',
      color: s.attributes?.color,
      magnitude: s.attributes?.magnitude,
      type: s.attributes?.type,
      composite: s.attributes?.composite,
      values: vals,
      last_value: last?.value,
      last_datetime: last?.datetime,
      total,
    }
  })
}

// ─── Helpers de fechas ────────────────────────────────────
function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
function monthsAgo(n: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d
}

// ─── Endpoints ────────────────────────────────────────────

/** Demanda peninsular en tiempo real (resolución horaria, último día con datos). */
export async function demandaTiempoReal(daysBack = 1): Promise<{ ok: boolean; series: ReeSerie[]; error?: string }> {
  const start = daysAgo(daysBack)
  const end = daysAgo(0)
  const r = await fetchRee('demanda/demanda-tiempo-real', {
    start_date: `${isoDate(start)}T00:00`,
    end_date: `${isoDate(end)}T23:59`,
    time_trunc: 'hour',
  })
  if (r.errors) return { ok: false, series: [], error: r.errors[0]?.detail }
  return { ok: true, series: pick(r) }
}

/** Mix de generación por tecnología (resolución diaria, últimos N días). */
export async function mixGeneracion(daysBack = 7): Promise<{ ok: boolean; series: ReeSerie[]; error?: string }> {
  const start = daysAgo(daysBack)
  const end = daysAgo(1)
  const r = await fetchRee('generacion/estructura-generacion', {
    start_date: `${isoDate(start)}T00:00`,
    end_date: `${isoDate(end)}T23:59`,
    time_trunc: 'day',
  })
  if (r.errors) return { ok: false, series: [], error: r.errors[0]?.detail }
  return { ok: true, series: pick(r) }
}

/** Precio mercado spot + PVPC (resolución horaria, últimas 24-48h). */
export async function preciosMercado(daysBack = 1): Promise<{ ok: boolean; series: ReeSerie[]; error?: string }> {
  const start = daysAgo(daysBack)
  const end = daysAgo(0)
  const r = await fetchRee('mercados/precios-mercados-tiempo-real', {
    start_date: `${isoDate(start)}T00:00`,
    end_date: `${isoDate(end)}T23:59`,
    time_trunc: 'hour',
  })
  if (r.errors) return { ok: false, series: [], error: r.errors[0]?.detail }
  return { ok: true, series: pick(r) }
}

/** Intercambios internacionales programados (Francia/Portugal/Marruecos/Andorra). */
export async function intercambiosInternacionales(daysBack = 7): Promise<{ ok: boolean; series: ReeSerie[]; error?: string }> {
  const start = daysAgo(daysBack)
  const end = daysAgo(1)
  const r = await fetchRee('intercambios/todas-fronteras-programados', {
    start_date: `${isoDate(start)}T00:00`,
    end_date: `${isoDate(end)}T23:59`,
    time_trunc: 'day',
  })
  if (r.errors) return { ok: false, series: [], error: r.errors[0]?.detail }
  return { ok: true, series: pick(r) }
}

/** Balance eléctrico mensual (renovable / no renovable, últimos 12 meses). */
export async function balanceElectrico(monthsBack = 12): Promise<{ ok: boolean; series: ReeSerie[]; error?: string }> {
  const start = monthsAgo(monthsBack)
  const end = monthsAgo(1)
  const r = await fetchRee('balance/balance-electrico', {
    start_date: `${isoDate(start)}T00:00`,
    end_date: `${isoDate(end)}T23:59`,
    time_trunc: 'month',
  })
  if (r.errors) return { ok: false, series: [], error: r.errors[0]?.detail }
  return { ok: true, series: pick(r) }
}

/** Emisiones CO2 medias por tecnología (resolución diaria, últimos N días). */
export async function emisionesCO2(daysBack = 7): Promise<{ ok: boolean; series: ReeSerie[]; error?: string }> {
  const start = daysAgo(daysBack)
  const end = daysAgo(1)
  const r = await fetchRee('generacion/no-renovables-detalle-emisiones-CO2', {
    start_date: `${isoDate(start)}T00:00`,
    end_date: `${isoDate(end)}T23:59`,
    time_trunc: 'day',
  })
  if (r.errors) return { ok: false, series: [], error: r.errors[0]?.detail }
  return { ok: true, series: pick(r) }
}

/** Evolución de la demanda agregada (mensual, últimos 12 meses). */
export async function demandaEvolucion(monthsBack = 12): Promise<{ ok: boolean; series: ReeSerie[]; error?: string }> {
  const start = monthsAgo(monthsBack)
  const end = monthsAgo(1)
  const r = await fetchRee('demanda/evolucion', {
    start_date: `${isoDate(start)}T00:00`,
    end_date: `${isoDate(end)}T23:59`,
    time_trunc: 'month',
  })
  if (r.errors) return { ok: false, series: [], error: r.errors[0]?.detail }
  return { ok: true, series: pick(r) }
}

// ─── Catálogo de empresas del sector ──────────────────────
// Datos curados manualmente · enlaces a CNMV, sitios web, IBEX 35
export const EMPRESAS_ENERGIA = [
  {
    nombre: 'Iberdrola', ticker: 'IBE.MC', ibex: true,
    descripcion: 'Líder mundial en eólica · 17 GW renovable instalada en España.',
    capitalizacion_b: 95.2,
    web: 'https://www.iberdrola.es',
    segmento: 'Integrada · Renovables líder',
  },
  {
    nombre: 'Endesa', ticker: 'ELE.MC', ibex: true,
    descripcion: 'Filial de Enel · operadora histórica con 8 GW en España.',
    capitalizacion_b: 22.4,
    web: 'https://www.endesa.es',
    segmento: 'Integrada · Convencional + renovable',
  },
  {
    nombre: 'Naturgy', ticker: 'NTGY.MC', ibex: true,
    descripcion: 'Gas natural y electricidad · ex-Gas Natural Fenosa.',
    capitalizacion_b: 26.1,
    web: 'https://www.naturgy.es',
    segmento: 'Gas y electricidad',
  },
  {
    nombre: 'Repsol', ticker: 'REP.MC', ibex: true,
    descripcion: 'Petrolera con plan de transición a renovables.',
    capitalizacion_b: 17.8,
    web: 'https://www.repsol.com',
    segmento: 'Hidrocarburos · transición',
  },
  {
    nombre: 'Acciona Energía', ticker: 'ANE.MC', ibex: false,
    descripcion: '100 % renovable · 12 GW operativos globalmente.',
    capitalizacion_b: 7.9,
    web: 'https://www.acciona-energia.com',
    segmento: 'Renovables pure-play',
  },
  {
    nombre: 'EDP España', ticker: 'EDP.LS', ibex: false,
    descripcion: 'Filial española de la portuguesa EDP · hidráulica y eólica.',
    capitalizacion_b: 16.4,
    web: 'https://www.edpenergia.es',
    segmento: 'Renovables y comercializadora',
  },
  {
    nombre: 'Solaria', ticker: 'SLR.MC', ibex: false,
    descripcion: 'Solar fotovoltaica · puro proyectos en España.',
    capitalizacion_b: 1.6,
    web: 'https://www.solariaenergia.com',
    segmento: 'Solar pure-play',
  },
  {
    nombre: 'Grenergy', ticker: 'GRE.MC', ibex: false,
    descripcion: 'Renovables y almacenamiento · proyectos en LATAM.',
    capitalizacion_b: 1.1,
    web: 'https://www.grenergy.eu',
    segmento: 'Renovables · almacenamiento',
  },
] as const

// ─── Áreas regulatorias clave ─────────────────────────────
export const REGULADORES_ENERGIA = [
  {
    nombre: 'CNMC',
    full: 'Comisión Nacional de los Mercados y la Competencia',
    web: 'https://www.cnmc.es',
    competencias: 'Regulación de mercados energéticos y supervisión.',
  },
  {
    nombre: 'MITECO',
    full: 'Ministerio para la Transición Ecológica y el Reto Demográfico',
    web: 'https://www.miteco.gob.es',
    competencias: 'Política energética, PNIEC, Estrategia de descarbonización.',
  },
  {
    nombre: 'IDAE',
    full: 'Instituto para la Diversificación y Ahorro de la Energía',
    web: 'https://www.idae.es',
    competencias: 'Eficiencia energética, certificaciones, ayudas.',
  },
  {
    nombre: 'REE',
    full: 'Red Eléctrica de España',
    web: 'https://www.ree.es',
    competencias: 'Operador del sistema eléctrico peninsular y red de transporte.',
  },
  {
    nombre: 'OMIE',
    full: 'Operador del Mercado Ibérico de Energía',
    web: 'https://www.omie.es',
    competencias: 'Mercado mayorista de electricidad ibérico (España + Portugal).',
  },
  {
    nombre: 'Enagás',
    full: 'Enagás · Sistema gasista',
    web: 'https://www.enagas.es',
    competencias: 'Transporte y operación del sistema gasista español.',
  },
] as const
