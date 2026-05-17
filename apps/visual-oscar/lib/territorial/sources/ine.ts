/**
 * Cliente INE Wstempus para datos demográficos por municipio/CCAA.
 *
 * Tablas usadas:
 *   - Padrón continuo por sexo y grupos de edad (pirámide poblacional)
 *   - Población extranjera por nacionalidad
 *   - Renta media por hogar (Atlas de distribución)
 *   - Movimiento natural de población (nacimientos, defunciones)
 *
 * Endpoint base: https://servicios.ine.es/wstempus/js/ES/
 */

const BASE = 'https://servicios.ine.es/wstempus/js/ES'
const UA = 'PoliteiaAnalitica/1.0 (+https://politeia-visual-oscar.vercel.app)'

interface Cache<T> { ts: number; data: T }
const cache: Map<string, Cache<unknown>> = new Map()
const TTL = 24 * 60 * 60 * 1000

async function fetchInJson<T>(path: string): Promise<T | null> {
  const key = `ine:${path}`
  const c = cache.get(key) as Cache<T> | undefined
  if (c && Date.now() - c.ts < TTL) return c.data
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json() as T
    cache.set(key, { ts: Date.now(), data })
    return data
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export interface INEPiramide {
  hombres: Record<string, number>   // grupo de edad → count
  mujeres: Record<string, number>
  totalHombres: number
  totalMujeres: number
  edadMedia: number | null
}

interface INEDato {
  Valor?: number
  Anyo?: number
  NombrePeriodo?: string
}
interface INESerie {
  Nombre?: string
  COD?: string
  Data?: INEDato[]
}

/**
 * Pirámide poblacional por municipio (último año).
 * Tabla 33561 — Cifras oficiales población municipios por sexo y edad.
 */
export async function fetchPiramide(codigoIne: string): Promise<INEPiramide | null> {
  // El código INE de municipio en wstempus es 5 dígitos con prefijo "MUN"
  // Endpoint correcto: SERIE_MUNICIPIO/{code}?nult=1
  // Pero no todas las series están disponibles. Probamos versión simplificada.
  try {
    const data = await fetchInJson<INESerie[]>(`/DATOS_MUNICIPIO/POB001?mun=${codigoIne}&nult=1`)
    if (!data || !Array.isArray(data) || data.length === 0) return null

    const hombres: Record<string, number> = {}
    const mujeres: Record<string, number> = {}
    let totH = 0, totM = 0

    for (const serie of data) {
      const nombre = (serie.Nombre || '').toLowerCase()
      const valor = serie.Data?.[0]?.Valor || 0
      if (!nombre || valor === 0) continue
      // "Total" "0-4 años hombre" "0-4 años mujer" etc.
      const edadMatch = nombre.match(/(\d+)[\s-]+(\d+|m[áa]s|\+)\s*a[ñn]os/)
      const isHombre = /hombre|var[óo]n/.test(nombre)
      const isMujer = /mujer|hembra/.test(nombre)
      if (edadMatch && (isHombre || isMujer)) {
        const grupo = `${edadMatch[1]}-${edadMatch[2]}`
        if (isHombre) { hombres[grupo] = valor; totH += valor }
        else { mujeres[grupo] = valor; totM += valor }
      }
    }

    if (totH === 0 && totM === 0) return null
    return { hombres, mujeres, totalHombres: totH, totalMujeres: totM, edadMedia: null }
  } catch {
    return null
  }
}

export interface INERentaMedia {
  rentaMediaHogar: number | null      // €
  rentaMediaPersona: number | null
  ginis: number | null
  año: number | null
}

/**
 * Atlas de distribución de renta de los hogares · INE.
 */
export async function fetchRentaMedia(codigoIne: string): Promise<INERentaMedia | null> {
  try {
    const data = await fetchInJson<INESerie[]>(`/DATOS_MUNICIPIO/ADRH?mun=${codigoIne}&nult=1`)
    if (!data || data.length === 0) return null
    let rmh: number | null = null
    let rmp: number | null = null
    let gini: number | null = null
    let año: number | null = null
    for (const s of data) {
      const nombre = (s.Nombre || '').toLowerCase()
      const v = s.Data?.[0]?.Valor || null
      const a = s.Data?.[0]?.Anyo || null
      if (a && (!año || a > año)) año = a
      if (/renta.*media.*hogar/.test(nombre)) rmh = v
      else if (/renta.*media.*persona/.test(nombre)) rmp = v
      else if (/gini/.test(nombre)) gini = v
    }
    if (rmh === null && rmp === null) return null
    return { rentaMediaHogar: rmh, rentaMediaPersona: rmp, ginis: gini, año }
  } catch {
    return null
  }
}

export interface INEExtranjeros {
  totalExtranjeros: number
  porcentaje: number
  topNacionalidades: Array<{ nacionalidad: string; total: number; porcentaje: number }>
}

/**
 * Población extranjera por nacionalidad.
 */
export async function fetchExtranjeros(codigoIne: string): Promise<INEExtranjeros | null> {
  try {
    const data = await fetchInJson<INESerie[]>(`/DATOS_MUNICIPIO/POB003?mun=${codigoIne}&nult=1`)
    if (!data || data.length === 0) return null
    const list: Array<{ nacionalidad: string; total: number }> = []
    let total = 0
    let totalPob = 0
    for (const s of data) {
      const nombre = (s.Nombre || '').replace(/\s+total$/i, '').trim()
      const v = s.Data?.[0]?.Valor || 0
      if (!nombre || v === 0) continue
      if (/^total$|^española$/i.test(nombre)) {
        if (/total$/i.test(nombre)) totalPob = v
        continue
      }
      if (/extranjeros?$/i.test(nombre)) { total = v; continue }
      list.push({ nacionalidad: nombre, total: v })
    }
    list.sort((a, b) => b.total - a.total)
    const top = list.slice(0, 8).map(x => ({
      ...x,
      porcentaje: total > 0 ? +((x.total / total) * 100).toFixed(1) : 0,
    }))
    return {
      totalExtranjeros: total,
      porcentaje: totalPob > 0 ? +((total / totalPob) * 100).toFixed(1) : 0,
      topNacionalidades: top,
    }
  } catch {
    return null
  }
}
