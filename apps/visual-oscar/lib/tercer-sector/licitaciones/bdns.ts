/**
 * Conector BDNS — Base de Datos Nacional de Subvenciones · ES · TS2-lic-src
 *
 * BDNS (infosubvenciones.es) publica TODAS las convocatorias de subvenciones y
 * ayudas de las administraciones españolas. Para el tercer sector las
 * subvenciones son tan o más relevantes que los contratos: son la vía principal
 * por la que llega dinero público a las ONGs. Las modelamos como "licitación de
 * tipo subvención" dentro del shape común (nivel `nacional_es` / `ccaa`).
 *
 * API JSON KEYLESS:
 *   Base: https://www.infosubvenciones.es/bdnstrans/api
 *   Convocatorias búsqueda: GET /convocatorias/busqueda?page=0&pageSize=...&
 *     descripcion=<q>&fechaDesde=DD/MM/YYYY&fechaHasta=DD/MM/YYYY
 *   La respuesta es un objeto con `content: [ {convocatoria...} ]` y metadatos
 *   de paginación (`totalElements`). Los campos varían; el parser es defensivo.
 *
 * `parseBdnsItems()` es PURO y testeable con un fixture JSON pequeño (sin red).
 */
import type { LicitacionNormalizada, SourceResult } from './types'
import {
  cacheGet,
  cacheSet,
  errResult,
  okResult,
  parseNum,
  safeFetch,
  toIso,
} from './shared'
import { normalizeCpv } from './cpv'

const BASE = 'https://www.infosubvenciones.es/bdnstrans/api'
const PUBLIC_URL = 'https://www.infosubvenciones.es/bdnstrans/GE/es/index'
const FUENTE = 'bdns' as const

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixture JSON)
// ─────────────────────────────────────────────────────────────────────────

interface BdnsRaw {
  // Los nombres reales varían entre versiones del API; cubrimos alias.
  id?: number | string
  numeroConvocatoria?: string
  codigoBDNS?: string | number
  descripcion?: string
  titulo?: string
  descripcionFinalidad?: string
  organo?: { nivel1?: string; nivel2?: string; nivel3?: string } | string
  desconvocante?: string
  nivel1?: string
  fechaRecepcion?: string
  fechaPublicacion?: string
  fechaInicioSolicitud?: string
  fechaFinSolicitud?: string
  importeTotal?: number | string
  presupuestoTotal?: number | string
  sectores?: { descripcion?: string }[] | string[]
  ambito?: string
  comunidadAutonoma?: string
}

/** Resuelve el nombre del órgano convocante tolerando varias formas. */
function resolveOrgano(raw: BdnsRaw): string {
  if (typeof raw.organo === 'string' && raw.organo.trim()) return raw.organo.trim()
  if (raw.organo && typeof raw.organo === 'object') {
    const parts = [raw.organo.nivel1, raw.organo.nivel2, raw.organo.nivel3].filter(Boolean)
    if (parts.length) return parts.join(' · ')
  }
  if (raw.desconvocante) return String(raw.desconvocante)
  if (raw.nivel1) return String(raw.nivel1)
  return 'Administración (BDNS)'
}

/** Detecta CCAA vs nacional por el ámbito/órgano. */
function resolveNivel(raw: BdnsRaw): 'ccaa' | 'nacional_es' {
  const ambito = `${raw.ambito ?? ''} ${raw.comunidadAutonoma ?? ''}`.toLowerCase()
  const organoStr =
    typeof raw.organo === 'string'
      ? raw.organo.toLowerCase()
      : `${raw.organo?.nivel1 ?? ''}`.toLowerCase()
  if (
    raw.comunidadAutonoma ||
    /auton[oó]m|comunidad|junta|generalitat|gobierno de|diputaci|ayuntamiento|consejer/.test(
      ambito + ' ' + organoStr,
    )
  ) {
    // "Administración General del Estado" / "Estado" → nacional
    if (/administraci[oó]n general del estado|estado\b/.test(organoStr)) return 'nacional_es'
    return 'ccaa'
  }
  return 'nacional_es'
}

/** Parsea un item de convocatoria BDNS al shape común. Pura. */
export function parseBdnsItem(raw: BdnsRaw): LicitacionNormalizada | null {
  if (!raw || typeof raw !== 'object') return null
  const code = raw.codigoBDNS ?? raw.numeroConvocatoria ?? raw.id
  if (code == null) return null
  const id = `bdns:${String(code)}`

  const titulo =
    raw.descripcion || raw.titulo || raw.descripcionFinalidad || 'Convocatoria de subvención'

  const importe =
    parseNum(raw.importeTotal) ?? parseNum(raw.presupuestoTotal) ?? null

  // Región (CCAA) si la da.
  let region: string | null = null
  if (raw.comunidadAutonoma) region = String(raw.comunidadAutonoma)

  // Sectores → no son CPV, pero intentamos mapear códigos numéricos si aparecen.
  let cpv: string | null = null
  if (Array.isArray(raw.sectores)) {
    for (const s of raw.sectores) {
      const text = typeof s === 'string' ? s : (s?.descripcion ?? '')
      const codeM = String(text).match(/\b(\d{5,8})\b/)
      if (codeM) {
        cpv = normalizeCpv(codeM[1])
        break
      }
    }
  }

  const fechaPub = toIso(raw.fechaPublicacion || raw.fechaRecepcion)
  const plazo = toIso(raw.fechaFinSolicitud)

  return {
    id,
    titulo: String(titulo).slice(0, 300),
    comprador: resolveOrgano(raw).slice(0, 200),
    nivel: resolveNivel(raw),
    pais: 'España',
    region,
    valor_eur: importe,
    moneda: 'EUR',
    cpv,
    plazo,
    fecha_pub: fechaPub,
    url: `https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/${String(code)}`,
    fuente: FUENTE,
    documentos: [], // BDNS no expone docs de pliego en este endpoint; la ficha sí.
    idioma: 'es',
  }
}

/**
 * Parsea la respuesta de búsqueda de BDNS. Acepta tanto `{content:[...]}` como
 * un array directo o `{convocatorias:[...]}`. Pura.
 */
export function parseBdnsItems(json: unknown): { items: LicitacionNormalizada[]; total: number } {
  if (!json) return { items: [], total: 0 }
  let arr: unknown[] = []
  let total = 0
  if (Array.isArray(json)) {
    arr = json
    total = json.length
  } else if (typeof json === 'object') {
    const o = json as Record<string, unknown>
    if (Array.isArray(o.content)) {
      arr = o.content
      total = typeof o.totalElements === 'number' ? o.totalElements : o.content.length
    } else if (Array.isArray(o.convocatorias)) {
      arr = o.convocatorias
      total = typeof o.total === 'number' ? o.total : o.convocatorias.length
    } else if (Array.isArray(o.data)) {
      arr = o.data
      total = typeof o.total === 'number' ? o.total : o.data.length
    }
  }
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const raw of arr) {
    const item = parseBdnsItem(raw as BdnsRaw)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }
  return { items, total: total || items.length }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}
// ─────────────────────────────────────────────────────────────────────────

/** Convierte ISO/YYYY-MM-DD a DD/MM/YYYY que espera BDNS. null si no válida. */
function toDdmmyyyy(iso: string | undefined): string | null {
  if (!iso) return null
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return `${m[3]}/${m[2]}/${m[1]}`
}

export interface FetchBdnsOpts {
  q?: string
  desde?: string
  hasta?: string
  page?: number
  pageSize?: number
  timeoutMs?: number
  noCache?: boolean
}

/**
 * Busca convocatorias de subvención en BDNS. KEYLESS. Caché 30 min. Degrada a
 * `{ok:false}` ante fallo (nunca lanza).
 */
export async function fetchBdns(opts: FetchBdnsOpts = {}): Promise<SourceResult> {
  const page = Math.max(0, (opts.page ?? 1) - 1) // BDNS es 0-based
  const pageSize = Math.max(1, Math.min(100, opts.pageSize ?? 30))

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    order: 'fechaRecepcion',
    direccion: 'desc',
  })
  if (opts.q) params.set('descripcion', opts.q)
  const desde = toDdmmyyyy(opts.desde)
  const hasta = toDdmmyyyy(opts.hasta)
  if (desde) params.set('fechaDesde', desde)
  if (hasta) params.set('fechaHasta', hasta)

  const url = `${BASE}/convocatorias/busqueda?${params.toString()}`
  const cacheKey = `bdns:${params.toString()}`
  if (!opts.noCache) {
    const hit = cacheGet(cacheKey)
    if (hit) return hit
  }

  const res = await safeFetch(url, {
    as: 'json',
    timeoutMs: opts.timeoutMs,
    headers: { Accept: 'application/json' },
  })

  if (res.error) return errResult(FUENTE, res.error, PUBLIC_URL)
  if (!res.ok) return errResult(FUENTE, `http_${res.status}`, PUBLIC_URL)

  const { items, total } = parseBdnsItems(res.json)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
