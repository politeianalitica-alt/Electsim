/**
 * Tejido empresarial · INE DIRCE (Directorio Central de Empresas).
 *
 * Tabla 4721: "Empresas por municipio y actividad principal".
 * Cobertura: 8.132 municipios × 11 sectores CNAE → ~90.000 series.
 *
 * Estrategia: la API no permite filtrar por municipio individualmente,
 * así que descargamos toda la tabla en una request y filtramos por código
 * con caché muy agresiva (24h).
 */

const BASE = 'https://servicios.ine.es/wstempus/js/ES'
const TABLA_DIRCE_MUN = 4721
const TTL = 24 * 60 * 60 * 1000

interface DircePeriodo { Anyo?: number; Valor?: number }
interface DirceMeta { Codigo?: string; Nombre?: string; T3_Variable?: string }
interface DirceSerie {
  COD: string
  Nombre: string
  MetaData?: DirceMeta[]
  Data?: DircePeriodo[]
}

let cacheGlobal: { ts: number; data: DirceSerie[] } | null = null
let inFlight: Promise<DirceSerie[]> | null = null

async function fetchTodasEmpresas(): Promise<DirceSerie[]> {
  if (cacheGlobal && Date.now() - cacheGlobal.ts < TTL) return cacheGlobal.data
  if (inFlight) return inFlight
  inFlight = (async () => {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 25000)
    try {
      const res = await fetch(`${BASE}/DATOS_TABLA/${TABLA_DIRCE_MUN}?nult=1&tip=AM`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        next: { revalidate: 86400 },
      })
      if (!res.ok) return []
      const data = await res.json() as DirceSerie[]
      cacheGlobal = { ts: Date.now(), data }
      return data
    } catch {
      return []
    } finally {
      clearTimeout(t)
      inFlight = null
    }
  })()
  return inFlight
}

export interface TejidoEmpresarial {
  totalEmpresas: number
  año: number
  densidad: number          // empresas / 1000 habitantes
  sectores: Array<{ sector: string; empresas: number; pct: number; color: string }>
  comparativa: {
    vsMediaNacional: number  // razón vs media (1 = media nacional)
    ranking: string          // texto interpretativo
  }
  fuente: string
}

const SECTOR_COLORS: Record<string, string> = {
  'Industrias extractivas': '#8D6E63',
  'Construcción': '#FF9800',
  'Comercio y hostelería': '#E91E63',
  'Información y comunicaciones': '#3F51B5',
  'Actividades financieras y de seguros': '#009688',
  'Actividades inmobiliarias': '#795548',
  'Actividades profesionales': '#9C27B0',
  'Actividades administrativas': '#607D8B',
  'Educación, sanidad y servicios sociales': '#4CAF50',
  'Actividades artísticas y de entretenimiento': '#FF5722',
  'Otros servicios': '#9E9E9E',
  'Total': '#1d1d1f',
}

const SECTOR_LABELS: Record<string, string> = {
  'Industrias extractivas (excepto construcción)': 'Industrias extractivas',
  'Comercio al por mayor y al por menor; reparación de vehículos de motor y motocicletas; transporte y almacenamiento; hostelería': 'Comercio y hostelería',
  'Información y comunicaciones': 'Información y comunicaciones',
  'Actividades financieras y de seguros': 'Actividades financieras y de seguros',
  'Actividades inmobiliarias': 'Actividades inmobiliarias',
  'Actividades profesionales, científicas y técnicas; actividades administrativas y servicios auxiliares': 'Actividades profesionales',
  'Administración pública y defensa; seguridad social obligatoria; educación; actividades sanitarias y de servicios sociales': 'Educación, sanidad y servicios sociales',
  'Actividades artísticas, recreativas y de entretenimiento; reparación de artículos de uso doméstico y otros servicios': 'Actividades artísticas y de entretenimiento',
  'Construcción': 'Construcción',
}

function normalizaSector(raw: string): string {
  for (const [pattern, label] of Object.entries(SECTOR_LABELS)) {
    if (raw.includes(pattern.substring(0, 30))) return label
  }
  return raw.split(';')[0].trim().slice(0, 40)
}

/**
 * Devuelve el tejido empresarial de un municipio.
 * Requiere población para calcular densidad.
 */
export async function fetchTejidoEmpresarial(codigoIne: string, poblacion: number): Promise<TejidoEmpresarial | null> {
  const todas = await fetchTodasEmpresas()
  if (todas.length === 0) return null

  // Filtrar por código municipal
  const series = todas.filter(s => s.MetaData?.some(m => m.Codigo === codigoIne))
  if (series.length === 0) return null

  let totalEmpresas = 0
  let año = 0
  const sectores: Array<{ sector: string; empresas: number; pct: number; color: string }> = []

  for (const s of series) {
    const valor = s.Data?.[0]?.Valor || 0
    const año_ = s.Data?.[0]?.Anyo || 0
    if (año_ > año) año = año_
    // Identificar tipo de serie por la metadata CNAE
    const cnaeMeta = s.MetaData?.find(m => m.T3_Variable?.includes('CNAE'))
    if (!cnaeMeta) continue
    if (cnaeMeta.Nombre?.toLowerCase() === 'total cnae') {
      totalEmpresas = valor
      continue
    }
    if (valor > 0) {
      const sectorLabel = normalizaSector(cnaeMeta.Nombre || '')
      sectores.push({ sector: sectorLabel, empresas: valor, pct: 0, color: SECTOR_COLORS[sectorLabel] || '#9E9E9E' })
    }
  }

  if (totalEmpresas === 0) return null

  // Calcular porcentajes
  for (const s of sectores) {
    s.pct = +((s.empresas / totalEmpresas) * 100).toFixed(1)
  }
  sectores.sort((a, b) => b.empresas - a.empresas)

  // Densidad: empresas / 1000 habitantes
  const densidad = poblacion > 0 ? +((totalEmpresas / poblacion) * 1000).toFixed(1) : 0
  // Media nacional aprox: 70 empresas/1000 hab
  const MEDIA_NACIONAL_DENSIDAD = 70
  const ratio = densidad / MEDIA_NACIONAL_DENSIDAD
  const ranking =
    ratio > 1.5 ? '★ Tejido empresarial muy fuerte (50%+ sobre media)'
    : ratio > 1.15 ? '◉ Tejido por encima de la media nacional'
    : ratio > 0.85 ? '◐ Tejido empresarial en línea con la media'
    : ratio > 0.6 ? '◓ Tejido por debajo de la media'
    : '◌ Tejido empresarial muy escaso'

  return {
    totalEmpresas,
    año,
    densidad,
    sectores: sectores.slice(0, 10),
    comparativa: { vsMediaNacional: +ratio.toFixed(2), ranking },
    fuente: 'INE · Directorio Central de Empresas (DIRCE)',
  }
}
