/**
 * Cliente · Potencia instalada por tecnología (REE apidatos) · Energía v3 · E2-data
 *
 * De-hardcodea la capacidad instalada del sistema eléctrico español: en vez de
 * servir siempre el catálogo curado `CAPACIDAD_RENOVABLE_ES`, intenta el dato
 * vivo de REE (apidatos.ree.es · categoría `generacion/potencia-instalada`) y
 * solo cae al catálogo si la API falla. Cada respuesta marca su procedencia con
 * `source: 'live' | 'catalog'` para que la UI sea honesta (CLAUDE.md §0.4).
 *
 * ── API REAL (REData · apidatos.ree.es) ────────────────────────────────────
 *   Base    : https://apidatos.ree.es/es/datos
 *   Widget  : generacion/potencia-instalada  (documentado en ree.es/es/apidatos)
 *   Auth    : NINGUNA (endpoint público JSON-API). User-Agent recomendado.
 *   Query   : start_date / end_date (ISO 'YYYY-MM-DDTHH:mm') ·
 *             time_trunc (hour|day|month|year) · geo_limit (peninsular|…) ·
 *             geo_ids opcionales.
 *   Envelope: JSON-API { data:{…}, included:[ { type, id, attributes:{ title,
 *             type ('Renovable'|'No-Renovable'|…), values:[{value, datetime,
 *             percentage}] } } ] }. Cada `included` es una tecnología; su último
 *             `values[]` es la potencia instalada (MW) del periodo.
 *   NOTA    : REE sirve `potencia-instalada` mejor con `time_trunc=year` (un
 *             punto por año). Si el WAF/Incapsula o la API devuelven 500/HTML,
 *             `fetchReeJson()` lo trata como fallo y el cliente degrada al
 *             catálogo (NO lanza, NO inventa). Verificado: el path es el oficial;
 *             la estructura `included[].attributes.values[]` es la misma que usa
 *             `lib/sources/ree.ts` para `estructura-generacion`.
 *
 * ── Diseño defensivo (patrón agsi.ts / lib/sources/ree.ts) ─────────────────
 *   - Respuesta: { ok, data|null, error?, fetched_at, source_url } (patrón
 *     Politeia). `ok:true` aun degradando al catálogo (el dato existe, solo
 *     cambia la procedencia); `source` indica si es live o catálogo.
 *   - Caché en memoria TTL 12h (la potencia instalada se mueve mensual/anual).
 *   - `parseReeCapacity()` y `buildCapacityFromCatalog()` son PURAS (sin red) y
 *     se exportan para testearlas con fixtures.
 *
 * Sin secretos (endpoint keyless). Cero emojis.
 */
import { CAPACIDAD_RENOVABLE_ES } from './catalog.ts'

const BASE = 'https://apidatos.ree.es/es/datos'
const PUBLIC_URL = 'https://www.ree.es/es/apidatos'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'
const DEFAULT_TIMEOUT_MS = 8_000
const CACHE_TTL_MS = 12 * 3600_000 // 12h · la potencia instalada cambia mensual/anual

// ─────────────────────────────────────────────────────────────────────────
// Tipos (definidos AQUÍ · no se edita types.ts)
// ─────────────────────────────────────────────────────────────────────────

/** Una tecnología con su potencia instalada (MW) y la fecha del dato. */
export interface CapacidadTecnologia {
  /** Nombre de la tecnología (ej. "Eólica", "Solar fotovoltaica"). */
  tecnologia: string
  /** Potencia instalada en MW (null si la fuente no la provee). */
  capacidad_mw: number | null
  /** Fecha de referencia del dato (ISO 'YYYY-MM-DD' o año 'YYYY'). */
  fecha: string
  /** Clasificación REE de la tecnología ('Renovable' | 'No renovable' | etc.), si disponible. */
  tipo?: string | null
}

/** Capacidad instalada del sistema eléctrico ES (por tecnología). */
export interface RenovablesCapacityData {
  /** Procedencia del dato: 'live' (REE apidatos) o 'catalog' (fallback curado). */
  source: 'live' | 'catalog'
  /** Fecha de referencia más reciente del conjunto (ISO o año). */
  fecha_ref: string | null
  /** Potencia instalada por tecnología, ordenada de mayor a menor MW. */
  tecnologias: CapacidadTecnologia[]
  /** Suma total de potencia instalada (MW), null si no calculable. */
  total_mw: number | null
  /** Suma de potencia renovable (MW) según clasificación REE, null si no clasificada. */
  total_renovable_mw: number | null
  /** Etiqueta legible de la fuente para citar en la UI. */
  source_label: string
  /** Nota cuando se degrada al catálogo (motivo). */
  nota?: string
}

/** Envoltura de degradación (patrón Politeia). */
export interface RenovablesCapacityResponse {
  ok: boolean
  error?: string
  data?: RenovablesCapacityData
  fetched_at: string
  source_url?: string
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL 12h
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry { expires: number; value: RenovablesCapacityResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearRenovablesCapacityCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixtures) — sin red
// ─────────────────────────────────────────────────────────────────────────

/** Estructura mínima de un `included[]` de REE potencia-instalada. */
interface ReeIncludedRaw {
  type?: string
  id?: string
  attributes?: {
    title?: string
    type?: string
    composite?: boolean
    values?: Array<{ value?: number; datetime?: string; percentage?: number }>
  }
}

/** ¿La clasificación REE marca esta tecnología como renovable? */
function esRenovable(tipo: string | null | undefined): boolean {
  return typeof tipo === 'string' && /renovab/i.test(tipo) && !/no.?renovab/i.test(tipo)
}

/** Convierte una fecha ISO a 'YYYY-MM-DD' (o la deja tal cual si es solo año). */
function ymdOrYear(dt: string | undefined): string {
  if (!dt) return ''
  const s = String(dt)
  // 'YYYY' o 'YYYY-MM-DDTHH...' → recortamos a fecha; si es solo 'YYYY' lo deja.
  if (/^\d{4}$/.test(s)) return s
  return s.slice(0, 10)
}

/**
 * Parsea la respuesta JSON-API de REE `potencia-instalada` a una lista de
 * tecnologías con su potencia instalada (último valor de cada serie). Pura:
 * testeable con un fixture de `included[]`. Ignora series compuestas/agregadas
 * (`composite: true`) y las que no aportan valores. Ordena por MW descendente.
 */
export function parseReeCapacity(included: unknown): CapacidadTecnologia[] {
  if (!Array.isArray(included)) return []
  const out: CapacidadTecnologia[] = []
  for (const raw of included as ReeIncludedRaw[]) {
    const attrs = raw?.attributes
    if (!attrs) continue
    if (attrs.composite === true) continue // serie agregada, no una tecnología
    const title = typeof attrs.title === 'string' ? attrs.title.trim() : ''
    if (!title) continue
    const values = Array.isArray(attrs.values) ? attrs.values : []
    if (values.length === 0) continue
    // último valor = dato más reciente del periodo
    const last = values[values.length - 1]
    const mw = typeof last?.value === 'number' && Number.isFinite(last.value) ? last.value : null
    out.push({
      tecnologia: title,
      capacidad_mw: mw,
      fecha: ymdOrYear(last?.datetime),
      tipo: typeof attrs.type === 'string' ? attrs.type : null,
    })
  }
  out.sort((a, b) => (b.capacidad_mw ?? -1) - (a.capacidad_mw ?? -1))
  return out
}

/** Suma de MW de una lista (null si ninguna tecnología tiene valor). */
function sumMw(techs: CapacidadTecnologia[], onlyRenovable = false): number | null {
  let sum = 0
  let any = false
  for (const t of techs) {
    if (onlyRenovable && !esRenovable(t.tipo)) continue
    if (t.capacidad_mw != null) {
      sum += t.capacidad_mw
      any = true
    }
  }
  return any ? Math.round(sum) : null
}

/**
 * Construye `RenovablesCapacityData` desde el catálogo curado
 * `CAPACIDAD_RENOVABLE_ES` (todas renovables). Pura: el fallback honesto cuando
 * REE falla. `source: 'catalog'`.
 */
export function buildCapacityFromCatalog(motivo?: string): RenovablesCapacityData {
  const techs: CapacidadTecnologia[] = CAPACIDAD_RENOVABLE_ES.map((c) => ({
    tecnologia: c.tecnologia,
    capacidad_mw: c.capacidad_mw,
    fecha: String(c.ano),
    tipo: 'Renovable',
  })).sort((a, b) => (b.capacidad_mw ?? -1) - (a.capacidad_mw ?? -1))

  const fecha = CAPACIDAD_RENOVABLE_ES.length
    ? String(Math.max(...CAPACIDAD_RENOVABLE_ES.map((c) => c.ano)))
    : null
  const total = sumMw(techs)

  return {
    source: 'catalog',
    fecha_ref: fecha,
    tecnologias: techs,
    total_mw: total,
    total_renovable_mw: total, // el catálogo solo trae renovables
    source_label: 'REE · potencia instalada (catálogo curado)',
    nota:
      (motivo ? motivo + ' · ' : '') +
      'Dato curado de REE/MITECO (solo renovables); la API de potencia instalada en vivo no respondió.',
  }
}

/** Construye `RenovablesCapacityData` desde la respuesta viva de REE. */
function buildCapacityFromLive(techs: CapacidadTecnologia[]): RenovablesCapacityData {
  const fecha = techs.map((t) => t.fecha).filter(Boolean).sort().pop() ?? null
  return {
    source: 'live',
    fecha_ref: fecha,
    tecnologias: techs,
    total_mw: sumMw(techs),
    total_renovable_mw: sumMw(techs, true),
    source_label: 'REE · apidatos · potencia instalada (en vivo)',
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch crudo REE (JSON-API) con degradación a catálogo
// ─────────────────────────────────────────────────────────────────────────

export interface FetchRenovablesCapacityOpts {
  /** Año de referencia (default: año actual). Se consulta el año completo. */
  year?: number
  /** Ámbito geográfico REE (default 'peninsular'). */
  geoLimit?: 'peninsular' | 'canarias' | 'baleares' | 'ceuta' | 'melilla' | 'ccaa'
  /** Forzar refetch ignorando la caché. */
  noCache?: boolean
  /** Timeout en ms (default 8s). */
  timeoutMs?: number
  /** Forzar uso del catálogo sin tocar la red (tests / modo offline). */
  forceCatalog?: boolean
}

/** Llama a REE apidatos y devuelve el JSON-API parseado, o null si falla. */
async function fetchReeJson(
  path: string,
  qs: Record<string, string>,
  timeoutMs: number,
): Promise<{ included?: unknown } | null> {
  const url = new URL(`${BASE}/${path}`)
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, v)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      // Caché HTTP de Next además de la caché de proceso (12h).
      next: { revalidate: 43200 },
    } as RequestInit)
    clearTimeout(timer)
    if (!res.ok) return null
    // REE puede devolver HTML (WAF Incapsula) con 200 → exigir JSON.
    const ct = res.headers?.get?.('content-type') ?? ''
    if (ct && !/json/i.test(ct)) return null
    const json: any = await res.json()
    if (!json || typeof json !== 'object') return null
    return json
  } catch {
    clearTimeout(timer)
    return null
  }
}

/**
 * Devuelve la potencia instalada por tecnología del sistema eléctrico español.
 * Intenta REE en vivo; si falla degrada al catálogo `CAPACIDAD_RENOVABLE_ES`.
 * Nunca lanza. Marca `source: 'live'|'catalog'`. Caché 12h en memoria.
 */
export async function fetchRenovablesCapacity(
  opts: FetchRenovablesCapacityOpts = {},
): Promise<RenovablesCapacityResponse> {
  const fetched_at = new Date().toISOString()
  const year = Number.isFinite(opts.year as number)
    ? (opts.year as number)
    : new Date().getUTCFullYear()
  const geoLimit = opts.geoLimit ?? 'peninsular'

  // Modo offline / tests: catálogo directo, sin red.
  if (opts.forceCatalog) {
    return {
      ok: true,
      data: buildCapacityFromCatalog('Modo catálogo forzado'),
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }

  const cacheKey = `${year}:${geoLimit}`
  if (!opts.noCache) {
    const hit = _cache.get(cacheKey)
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  const json = await fetchReeJson(
    'generacion/potencia-instalada',
    {
      start_date: `${year}-01-01T00:00`,
      end_date: `${year}-12-31T23:59`,
      time_trunc: 'year',
      geo_trunc: 'electric_system',
      geo_limit: geoLimit,
    },
    opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  )

  const techs = json ? parseReeCapacity(json.included) : []

  let result: RenovablesCapacityResponse
  if (techs.length > 0) {
    result = {
      ok: true,
      data: buildCapacityFromLive(techs),
      fetched_at,
      source_url: PUBLIC_URL,
    }
  } else {
    // Degradación honesta: catálogo curado, marcado como tal. ok:true (hay dato).
    result = {
      ok: true,
      data: buildCapacityFromCatalog('REE apidatos no devolvió datos'),
      error: json ? 'ree_sin_datos' : 'ree_no_responde',
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }

  _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: result })
  return result
}
