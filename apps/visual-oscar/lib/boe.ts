// Cliente para la API de Datos Abiertos del BOE
// https://www.boe.es/datosabiertos/api/
//
// Endpoint usado: /api/boe/sumario/{YYYYMMDD}
// Requiere header `Accept: application/json` (sin él devuelve 400 XML)
//
// Estructura típica de respuesta:
//   data.sumario.diario[*].seccion[*].departamento[*].(item[*] | epigrafe[*].item[*])
// Cada item tiene: identificador, titulo, url_html, url_pdf, control

export interface BoeItem {
  id: string                   // p.ej. "BOE-A-2026-9876"
  fecha: string                // ISO date
  seccion_codigo: string       // "1", "2A", "2B", "3", "4", "5", etc.
  seccion_nombre: string       // "I. Disposiciones generales"
  departamento: string         // "MINISTERIO DE HACIENDA"
  epigrafe: string | null      // sub-categoría (ej. "Tratados internacionales")
  titulo: string
  url_html: string             // enlace al texto en BOE.es
  url_pdf: string
}

interface BoeApiResponse {
  status: { code: string; text: string }
  data?: { sumario?: BoeRawSumario }
}

interface BoeRawSumario {
  metadatos?: { fecha_publicacion?: string }
  diario?: unknown
}

// Helper para listas que el BOE serializa como dict cuando hay 1 item solo
function asArray<T = unknown>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[]
  if (v == null) return []
  return [v as T]
}

function deepText(v: unknown, key: string): string {
  if (v && typeof v === 'object' && key in v) {
    const inner = (v as Record<string, unknown>)[key]
    if (typeof inner === 'string') return inner
  }
  return ''
}

function getUrl(it: Record<string, unknown>, kind: 'url_html' | 'url_pdf'): string {
  const v = it[kind]
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') return deepText(v, 'texto')
  return ''
}

function fechaIsoFromYYYYMMDD(s: string): string {
  if (!s || s.length !== 8) return ''
  return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`
}

/** Devuelve YYYYMMDD para una fecha dada (offset en días desde hoy). */
export function dateOffset(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

/** Fetch del sumario del BOE para un día. Tolerante a errores (devuelve []). */
export async function fetchBoeSumario(yyyymmdd: string, timeoutMs = 8000): Promise<BoeItem[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`https://boe.es/datosabiertos/api/boe/sumario/${yyyymmdd}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
      // Cache 1 día — el BOE de un día concreto no cambia
      next: { revalidate: 86400 },
    } as RequestInit & { next?: { revalidate: number } })
    if (!res.ok) return []
    const data = (await res.json()) as BoeApiResponse
    if (data.status?.code !== '200') return []
    return parseBoeSumario(data, yyyymmdd)
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

function parseBoeSumario(data: BoeApiResponse, yyyymmdd: string): BoeItem[] {
  const out: BoeItem[] = []
  const fechaIso = fechaIsoFromYYYYMMDD(yyyymmdd)
  const sumario = data.data?.sumario
  if (!sumario) return out
  for (const diario of asArray<Record<string, unknown>>(sumario.diario)) {
    for (const sec of asArray<Record<string, unknown>>(diario.seccion)) {
      const seccionCodigo = String(sec.codigo ?? '')
      const seccionNombre = String(sec.nombre ?? '')
      for (const dep of asArray<Record<string, unknown>>(sec.departamento)) {
        const depNombre = String(dep.nombre ?? '')
        // Items directos en el departamento
        for (const it of asArray<Record<string, unknown>>(dep.item)) {
          out.push({
            id: String(it.identificador ?? ''),
            fecha: fechaIso,
            seccion_codigo: seccionCodigo,
            seccion_nombre: seccionNombre,
            departamento: depNombre,
            epigrafe: null,
            titulo: String(it.titulo ?? '').trim(),
            url_html: getUrl(it, 'url_html'),
            url_pdf: getUrl(it, 'url_pdf'),
          })
        }
        // Items dentro de epígrafes
        for (const ep of asArray<Record<string, unknown>>(dep.epigrafe)) {
          const epNombre = String(ep.nombre ?? '')
          for (const it of asArray<Record<string, unknown>>(ep.item)) {
            out.push({
              id: String(it.identificador ?? ''),
              fecha: fechaIso,
              seccion_codigo: seccionCodigo,
              seccion_nombre: seccionNombre,
              departamento: depNombre,
              epigrafe: epNombre,
              titulo: String(it.titulo ?? '').trim(),
              url_html: getUrl(it, 'url_html'),
              url_pdf: getUrl(it, 'url_pdf'),
            })
          }
        }
      }
    }
  }
  return out.filter(it => it.id && it.titulo)
}

/** Atajos: fetch últimos N días en paralelo (omite fines de semana, BOE no publica). */
export async function fetchBoeLastNDays(n: number, timeoutMs = 8000): Promise<BoeItem[]> {
  const dates: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    // BOE no publica sábado · ajustar (domingo sí publica)
    if (d.getDay() === 6) continue
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ''))
  }
  const results = await Promise.all(dates.map(d => fetchBoeSumario(d, timeoutMs)))
  return results.flat()
}
