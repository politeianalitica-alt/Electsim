/**
 * Serie histórica de población municipal · INE Padrón continuo.
 *
 * Tabla 2879 INE Wstempus: cifras oficiales de población por municipio
 * desde 1996/1998. Permite trazar evolución demográfica completa.
 */

const BASE = 'https://servicios.ine.es/wstempus/js/ES'
const TTL = 24 * 60 * 60 * 1000

interface CacheEntry<T> { ts: number; data: T }
const cache: Map<string, CacheEntry<unknown>> = new Map()

interface INEDato { Anyo?: number; Valor?: number }
interface INESerie {
  Nombre?: string
  COD?: string
  Data?: INEDato[]
  MetaData?: Array<{ Codigo?: string; Nombre?: string }>
}

async function fetchInJson<T>(url: string, key: string): Promise<T | null> {
  const c = cache.get(key) as CacheEntry<T> | undefined
  if (c && Date.now() - c.ts < TTL) return c.data
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json() as T
    cache.set(key, { ts: Date.now(), data })
    return data
  } catch { return null } finally { clearTimeout(t) }
}

export interface PuntoPoblacion {
  año: number
  poblacion: number
  variacion_pct?: number
}

export interface SerieHistoricaPoblacion {
  puntos: PuntoPoblacion[]
  añoMin: number
  añoMax: number
  poblacionMin: number
  poblacionMax: number
  cagr_pct: number              // Compound Annual Growth Rate
  variacionTotal_pct: number
  banda: 'fuerte crecimiento' | 'crecimiento moderado' | 'estable' | 'declive moderado' | 'declive severo'
}

/**
 * Serie histórica de población para un municipio (últimos N años).
 * Combina datos del Padrón Municipal Continuo (tabla 2879) y cifras oficiales.
 */
export async function fetchSerieHistoricaPoblacion(codigoIne: string, nUltimos = 20): Promise<SerieHistoricaPoblacion | null> {
  // Intentamos primero tabla 2879 (Padrón actualizado)
  const url = `${BASE}/DATOS_MUNICIPIO/POBLAMUN?mun=${codigoIne}&nult=${nUltimos}`
  const data = await fetchInJson<INESerie[]>(url, `pob-hist:${codigoIne}:${nUltimos}`)

  if (!data || !Array.isArray(data) || data.length === 0) return null

  // Buscar la serie TOTAL (no por sexo/edad)
  const serieTotal = data.find(s => {
    const n = (s.Nombre || '').toLowerCase()
    return n.includes('total') || n.includes('ambos sexos')
  }) || data[0]

  if (!serieTotal.Data || serieTotal.Data.length === 0) return null

  // Ordenar por año ascendente
  const puntos: PuntoPoblacion[] = serieTotal.Data
    .filter(d => d.Anyo && d.Valor != null)
    .map(d => ({ año: d.Anyo!, poblacion: d.Valor! }))
    .sort((a, b) => a.año - b.año)

  if (puntos.length === 0) return null

  // Calcular variaciones
  for (let i = 1; i < puntos.length; i++) {
    puntos[i].variacion_pct = +((puntos[i].poblacion / puntos[i - 1].poblacion - 1) * 100).toFixed(2)
  }

  const añoMin = puntos[0].año
  const añoMax = puntos[puntos.length - 1].año
  const poblacionMin = Math.min(...puntos.map(p => p.poblacion))
  const poblacionMax = Math.max(...puntos.map(p => p.poblacion))
  const variacionTotal_pct = +((puntos[puntos.length - 1].poblacion / puntos[0].poblacion - 1) * 100).toFixed(2)
  const años = añoMax - añoMin
  const cagr_pct = años > 0
    ? +((Math.pow(puntos[puntos.length - 1].poblacion / puntos[0].poblacion, 1 / años) - 1) * 100).toFixed(2)
    : 0

  const banda: SerieHistoricaPoblacion['banda'] =
    cagr_pct >= 1.5 ? 'fuerte crecimiento' :
    cagr_pct >= 0.3 ? 'crecimiento moderado' :
    cagr_pct >= -0.3 ? 'estable' :
    cagr_pct >= -1.0 ? 'declive moderado' :
                       'declive severo'

  return {
    puntos, añoMin, añoMax, poblacionMin, poblacionMax,
    cagr_pct, variacionTotal_pct, banda,
  }
}
