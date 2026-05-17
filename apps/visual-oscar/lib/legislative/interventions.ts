/**
 * Comparecientes y sesiones REALES de comisiones del Congreso.
 *
 * Fuente: dataset `IntervencionesCronologicamente__YYYYMMDDHHMMSS.json` (50+ MB)
 * de /webpublica/opendata/intervenciones/.
 *
 * Cada item tiene SESION, ORGANO, ORADOR, CARGOORADOR, INICIOINTERVENCION,
 * ENLACEDIFERIDO (video), ENLACEPDF (acta), etc.
 *
 * Filtramos comparecientes = personas que NO son diputados, agrupadas por
 * sesión y por comisión.
 *
 * Cache 12h por el tamaño del dataset (50 MB).
 */

const BASE = 'https://www.congreso.es'
const UA = 'Mozilla/5.0 (compatible; PoliteiaAnalitica/1.0; +https://politeia-visual-oscar.vercel.app)'

export interface InterventionRaw {
  LEGISLATURA?: string
  OBJETOINICIATIVA?: string
  SESION?: string         // DD/MM/YYYY
  ORGANO?: string
  FASE?: string
  TIPOINTERVENCION?: string
  ORADOR?: string
  CARGOORADOR?: string
  INICIOINTERVENCION?: string  // HH:MM
  FININTERVENCION?: string
  ENLACEDIFERIDO?: string
  ENLACEDESCARGADIRECTA?: string
  ENLACETEXTOINTEGRO?: string
  ENLACEPDF?: string
}

export interface CommissionSession {
  fecha: string         // DD/MM/YYYY
  organo: string
  totalIntervenciones: number
  comparecientes: Array<{
    nombre: string
    cargo: string
    intervenciones: number
    inicio: string
    videoUrl?: string
    actaPdfUrl?: string
  }>
  // Iniciativas tratadas en esta sesión
  iniciativas: string[]
}

let datasetCache: { ts: number; data: InterventionRaw[] } | null = null
let urlCache: { ts: number; url: string } | null = null
const TTL_URL = 60 * 60 * 1000  // 1h para URL
const TTL_DATA = 12 * 60 * 60 * 1000  // 12h para dataset

async function getInterventionsDatasetUrl(): Promise<string | null> {
  if (urlCache && Date.now() - urlCache.ts < TTL_URL) return urlCache.url

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${BASE}/opendata/intervenciones`, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: controller.signal,
      next: { revalidate: 3600 },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const html = await res.text()
    // Buscar IntervencionesCronologicamente__YYYYMMDDHHMMSS.json
    const m = html.match(/\/webpublica\/opendata\/intervenciones\/IntervencionesCronologicamente__\d{14}\.json/)
    if (!m) return null
    const url = `${BASE}${m[0]}`
    urlCache = { ts: Date.now(), url }
    return url
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

async function fetchDataset(): Promise<InterventionRaw[]> {
  if (datasetCache && Date.now() - datasetCache.ts < TTL_DATA) return datasetCache.data
  const url = await getInterventionsDatasetUrl()
  if (!url) return []

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 30000)  // 30s para 50 MB
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 43200 },  // 12h
    })
    if (!res.ok) return datasetCache?.data ?? []
    const data = await res.json() as InterventionRaw[]
    if (Array.isArray(data)) datasetCache = { ts: Date.now(), data }
    return datasetCache?.data ?? []
  } catch {
    return datasetCache?.data ?? []
  } finally {
    clearTimeout(t)
  }
}

/**
 * Comparecientes únicos en una comisión (filtra diputados).
 */
export async function fetchCommissionComparecientes(organoSubstring: string): Promise<Array<{
  nombre: string
  cargo: string
  intervenciones: number
  ultimaSesion: string | null
  sesiones: string[]
}>> {
  const data = await fetchDataset()
  if (data.length === 0) return []

  const norm = organoSubstring.toLowerCase()
  const filtered = data.filter(it => {
    const o = (it.ORGANO || '').toLowerCase()
    if (!o.includes(norm)) return false
    const cargo = (it.CARGOORADOR || '').toLowerCase()
    // Filtrar miembros del Congreso (diputados/senadores)
    return !/\b(diputad|senador|presidente del congreso|secretari[ao] del congreso|vicepresid)/i.test(cargo)
  })

  // Agrupar por orador
  const byOrador = new Map<string, { cargo: string; sesiones: Set<string>; count: number }>()
  for (const it of filtered) {
    const orador = (it.ORADOR || '').trim()
    if (!orador) continue
    const entry = byOrador.get(orador) ?? { cargo: it.CARGOORADOR || '', sesiones: new Set(), count: 0 }
    entry.count++
    if (it.SESION) entry.sesiones.add(it.SESION)
    if (!entry.cargo && it.CARGOORADOR) entry.cargo = it.CARGOORADOR
    byOrador.set(orador, entry)
  }

  return Array.from(byOrador.entries())
    .map(([nombre, e]) => ({
      nombre,
      cargo: e.cargo,
      intervenciones: e.count,
      sesiones: Array.from(e.sesiones).sort(),
      ultimaSesion: Array.from(e.sesiones).sort().pop() || null,
    }))
    .sort((a, b) => b.intervenciones - a.intervenciones)
}

/**
 * Sesiones de una comisión con sus comparecientes agrupados.
 */
export async function fetchCommissionSessions(organoSubstring: string): Promise<CommissionSession[]> {
  const data = await fetchDataset()
  if (data.length === 0) return []

  const norm = organoSubstring.toLowerCase()
  const filtered = data.filter(it => (it.ORGANO || '').toLowerCase().includes(norm))

  // Agrupar por sesión (fecha)
  const bySession = new Map<string, InterventionRaw[]>()
  for (const it of filtered) {
    const key = it.SESION || 'sin-fecha'
    const arr = bySession.get(key) ?? []
    arr.push(it)
    bySession.set(key, arr)
  }

  const sessions: CommissionSession[] = []
  for (const [fecha, intervs] of bySession) {
    // Comparecientes externos por sesión
    const speakers = new Map<string, { cargo: string; count: number; inicio: string; video?: string; pdf?: string }>()
    const iniciativas = new Set<string>()
    for (const it of intervs) {
      const cargo = (it.CARGOORADOR || '').toLowerCase()
      if (/\b(diputad|senador|presidente del congreso|secretari[ao] del congreso|vicepresid)/i.test(cargo)) continue
      const orador = (it.ORADOR || '').trim()
      if (!orador) continue
      const entry = speakers.get(orador) ?? {
        cargo: it.CARGOORADOR || '',
        count: 0,
        inicio: it.INICIOINTERVENCION || '',
        video: it.ENLACEDIFERIDO,
        pdf: it.ENLACEPDF,
      }
      entry.count++
      speakers.set(orador, entry)
      if (it.OBJETOINICIATIVA && it.OBJETOINICIATIVA.length > 5) iniciativas.add(it.OBJETOINICIATIVA)
    }

    sessions.push({
      fecha,
      organo: intervs[0]?.ORGANO || '',
      totalIntervenciones: intervs.length,
      comparecientes: Array.from(speakers.entries()).map(([nombre, e]) => ({
        nombre, cargo: e.cargo, intervenciones: e.count, inicio: e.inicio,
        videoUrl: e.video, actaPdfUrl: e.pdf,
      })).sort((a, b) => b.intervenciones - a.intervenciones),
      iniciativas: Array.from(iniciativas).slice(0, 10),
    })
  }

  // Ordenar por fecha desc (parseando DD/MM/YYYY)
  sessions.sort((a, b) => {
    const da = a.fecha.split('/').reverse().join('-')
    const db = b.fecha.split('/').reverse().join('-')
    return db.localeCompare(da)
  })
  return sessions
}

// ─── Sesiones futuras (próximas convocatorias) ─────────────────────────────

export interface ScheduledSession {
  numSesion: number
  fechaSesion: string         // DD/MM/YYYY
  fechaFormateada: string
  descOrgano: string
  idOrgano: number
  isEnSenado: boolean
  isSubComision: boolean
}

/**
 * Próximas sesiones convocadas de una comisión.
 * Scrapea el HTML y extrae el `var jsonObject=...` embebido.
 */
export async function fetchScheduledSessions(codOrgano: string): Promise<ScheduledSession[]> {
  const url = `${BASE}/es/actualidad/sesiones-de-comisiones?p_p_id=Ordenes&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&codOrgano=${codOrgano}&modo=organoSesiones`
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: controller.signal,
      next: { revalidate: 3600 },
      redirect: 'follow',
    })
    if (!res.ok) return []
    const html = await res.text()
    // Buscar var jsonObject=[...];
    const m = html.match(/var\s+jsonObject\s*=\s*(\[[\s\S]*?\]);/)
    if (!m) return []
    try {
      return JSON.parse(m[1]) as ScheduledSession[]
    } catch {
      return []
    }
  } catch {
    return []
  } finally {
    clearTimeout(t)
  }
}
