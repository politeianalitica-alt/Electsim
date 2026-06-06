/**
 * Destinos enriquecidos · Turismo v3 · Sprint T2-cross
 *
 * Sirve el catálogo de destinos (`lib/turismo/destinos-catalog.ts`) ENRIQUECIDO
 * con las pernoctaciones turísticas en vivo por CCAA (NUTS2). De-hardcode del
 * antiguo `data/tourism/destinations_seed.json`.
 *
 * ── FUENTE DE PERNOCTACIONES (live) ────────────────────────────────────────
 * Eurostat `tour_occ_nin2c` (nights spent at tourist accommodation
 * establishments, by NUTS2 region). Es la misma familia que usa el catálogo
 * macro (`co-pernoct-nuts2`). Se mapea CCAA→pernoctaciones y se inyecta en cada
 * destino por su `ccaa_iso`.
 *
 * Si existe ya un lib `lib/turismo/ccaa.ts` (lo crea T2-ine en paralelo), se
 * intenta usar vía import DINÁMICO (no rompe si aún no existe). Si no, se
 * consulta Eurostat directamente. Si TODO falla, se degrada a "catálogo" sin
 * pernoctaciones. Cada destino lleva `live` (true/false) marcando si tiene dato
 * de demanda vivo. NUNCA lanza.
 *
 * Patrón Politeia: `{ ok, data|null, error?, fetched_at, source_url }`, caché
 * TTL, helpers PUROS testeables.
 *
 * Docs: Eurostat tour_occ_nin2c · https://ec.europa.eu/eurostat
 */
import { parseJsonStat } from '../macro-utils.ts'
import { DESTINOS } from './destinos-catalog.ts'
import type { Destino, DestinoTipo } from './destinos-catalog.ts'

// ─────────────────────────────────────────────────────────────────────────
// Tipos (propios de este lib)
// ─────────────────────────────────────────────────────────────────────────

export interface DestinoEnriquecido extends Destino {
  /** Pernoctaciones de la CCAA del destino (último periodo). null si no live. */
  pernoctaciones_ccaa: number | null
  /** Periodo del dato de pernoctaciones. */
  pernoctaciones_period: string | null
  /** true si el destino tiene dato de demanda en vivo. */
  live: boolean
}

export interface DestinosData {
  destinos: DestinoEnriquecido[]
  /** Nº de destinos con pernoctaciones live. */
  n_live: number
  /** Nº total de destinos. */
  n_total: number
  /** Procedencia agregada de las pernoctaciones. */
  pernoctaciones_source: 'eurostat' | 'ccaa-lib' | 'unavailable'
  nota: string
}

export interface DestinosResponse {
  ok: boolean
  data: DestinosData | null
  error?: string
  fetched_at: string
  source_url: string
}

const PUBLIC_URL = 'https://ec.europa.eu/eurostat'
const EUROSTAT_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'
const DEFAULT_TIMEOUT_MS = 15_000
const CACHE_TTL_MS = 12 * 3600_000

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS (sin red) · testeables
// ─────────────────────────────────────────────────────────────────────────

/**
 * A partir de un JSON-stat de Eurostat con dimensión `geo` (NUTS2) y `time`,
 * devuelve un mapa CCAA(NUTS2)→{value, period} con el último periodo por región.
 * Pura: testeable con fixtures. Usa `parseJsonStat` (no duplica el parser).
 */
export function nightsByCcaaFromEurostat(
  json: any,
): Record<string, { value: number; period: string }> {
  const out: Record<string, { value: number; period: string }> = {}
  const points = parseJsonStat(json).filter((p) => p.value != null && typeof p.value === 'number')
  for (const p of points) {
    const geo = String(p.geo ?? '')
    const period = String(p.time ?? '')
    if (!geo) continue
    const prev = out[geo]
    // Nos quedamos con el periodo más reciente por región.
    if (!prev || period > prev.period) {
      out[geo] = { value: p.value as number, period }
    }
  }
  return out
}

/**
 * Enriquece el catálogo de destinos con el mapa CCAA→pernoctaciones. Pura.
 * Marca `live=true` solo en destinos cuya CCAA tiene dato.
 */
export function enrichDestinos(
  catalog: Destino[],
  nightsByCcaa: Record<string, { value: number; period: string }>,
): { destinos: DestinoEnriquecido[]; n_live: number } {
  let nLive = 0
  const destinos = catalog.map((d) => {
    const hit = nightsByCcaa[d.ccaa_iso]
    const live = !!hit
    if (live) nLive++
    return {
      ...d,
      pernoctaciones_ccaa: hit ? hit.value : null,
      pernoctaciones_period: hit ? hit.period : null,
      live,
    }
  })
  return { destinos, n_live: nLive }
}

/** Filtra destinos enriquecidos por tipo. Pura. */
export function filterDestinosByTipo(
  destinos: DestinoEnriquecido[],
  tipo?: DestinoTipo,
): DestinoEnriquecido[] {
  if (!tipo) return destinos
  return destinos.filter((d) => d.tipo.includes(tipo))
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria · TTL 12h
// ─────────────────────────────────────────────────────────────────────────

interface CacheEntry { expires: number; value: DestinosResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearDestinosCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch pernoctaciones por CCAA · ccaa-lib (opcional) → Eurostat → degradación
// ─────────────────────────────────────────────────────────────────────────

/** Consulta Eurostat tour_occ_nin2c (nights by NUTS2). Devuelve JSON o null. */
async function fetchEurostatNights(timeoutMs: number): Promise<any | null> {
  // geo=ES* (todas las NUTS2 ES), c_resid=TOTAL, nace_r2=I551-I553 (alojamientos
  // turísticos), unit=NR (número). Eurostat acepta múltiples `geo`.
  const qs = new URLSearchParams()
  qs.append('c_resid', 'TOTAL')
  qs.append('nace_r2', 'I551-I553')
  qs.append('unit', 'NR')
  // NUTS2 de España (las que usa el catálogo + todas las CCAA peninsulares).
  for (const geo of [
    'ES11', 'ES12', 'ES13', 'ES21', 'ES22', 'ES23', 'ES24', 'ES30',
    'ES41', 'ES42', 'ES43', 'ES51', 'ES52', 'ES53', 'ES61', 'ES62', 'ES70',
  ]) {
    qs.append('geo', geo)
  }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const r = await fetch(`${EUROSTAT_BASE}/tour_occ_nin2c?${qs}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 43200 },
    } as RequestInit)
    clearTimeout(t)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

/**
 * Intenta obtener pernoctaciones por CCAA del lib hermano `lib/turismo/ccaa.ts`
 * (creado por T2-ine) vía import dinámico. Devuelve el mapa o null si el lib no
 * existe / no expone la forma esperada. NUNCA lanza. Best-effort y tolerante:
 * sólo se usa si el lib expone una función que devuelva pernoctaciones por
 * NUTS2; en cualquier otro caso devolvemos null y caemos a Eurostat directo.
 */
async function tryCcaaLib(): Promise<Record<string, { value: number; period: string }> | null> {
  try {
    // @ts-ignore · módulo opcional creado por T2-ine (puede no existir aún).
    const mod: any = await import('./ccaa.ts').catch(() => null)
    if (!mod) return null
    // Buscamos una función plausible que devuelva pernoctaciones por CCAA.
    const fn =
      mod.pernoctacionesPorCcaa ||
      mod.fetchPernoctacionesCcaa ||
      mod.fetchCcaaPernoctaciones ||
      null
    if (typeof fn !== 'function') return null
    const res = await fn()
    // Normalizamos varias formas posibles a Record<nuts2,{value,period}>.
    const rows: any[] = Array.isArray(res)
      ? res
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.ccaa)
          ? res.data.ccaa
          : Array.isArray(res?.items)
            ? res.items
            : []
    if (!rows.length) return null
    const out: Record<string, { value: number; period: string }> = {}
    for (const row of rows) {
      const iso = String(row?.ccaa_iso ?? row?.nuts2 ?? row?.geo ?? '')
      const value = Number(row?.pernoctaciones ?? row?.value ?? row?.nights)
      const period = String(row?.period ?? row?.time ?? '')
      if (iso && Number.isFinite(value)) out[iso] = { value, period }
    }
    return Object.keys(out).length ? out : null
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────

export interface FetchDestinosOpts {
  /** Filtra por tipo de turismo. */
  tipo?: DestinoTipo
  noCache?: boolean
  timeoutMs?: number
}

/**
 * Devuelve el catálogo de destinos enriquecido con pernoctaciones por CCAA en
 * vivo. NUNCA lanza: si no hay fuente de demanda, devuelve el catálogo con
 * `live=false` y `pernoctaciones_source:'unavailable'`.
 */
export async function fetchDestinos(opts: FetchDestinosOpts = {}): Promise<DestinosResponse> {
  const fetched_at = new Date().toISOString()
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const cacheKey = `destinos:${opts.tipo ?? 'all'}`
  if (!opts.noCache) {
    const hit = _cache.get(cacheKey)
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  // 1) lib hermano ccaa (si existe) · 2) Eurostat directo · 3) degradación.
  let nightsByCcaa: Record<string, { value: number; period: string }> = {}
  let source: DestinosData['pernoctaciones_source'] = 'unavailable'

  const fromLib = await tryCcaaLib()
  if (fromLib && Object.keys(fromLib).length) {
    nightsByCcaa = fromLib
    source = 'ccaa-lib'
  } else {
    const json = await fetchEurostatNights(timeoutMs)
    if (json) {
      const parsed = nightsByCcaaFromEurostat(json)
      if (Object.keys(parsed).length) {
        nightsByCcaa = parsed
        source = 'eurostat'
      }
    }
  }

  const all = enrichDestinos(DESTINOS, nightsByCcaa)
  const destinos = filterDestinosByTipo(all.destinos, opts.tipo)
  const nLive = destinos.filter((d) => d.live).length

  const nota =
    source === 'unavailable'
      ? 'Pernoctaciones por CCAA no disponibles (Eurostat falló) · solo catálogo de destinos.'
      : source === 'ccaa-lib'
        ? 'Pernoctaciones por CCAA del módulo Turismo (lib/turismo/ccaa).'
        : 'Pernoctaciones por CCAA en vivo de Eurostat tour_occ_nin2c (NUTS2).'

  const data: DestinosData = {
    destinos,
    n_live: nLive,
    n_total: destinos.length,
    pernoctaciones_source: source,
    nota,
  }

  const result: DestinosResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
  _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: result })
  return result
}
