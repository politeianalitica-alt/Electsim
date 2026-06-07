/**
 * Cliente · Orígenes del crudo de España (CORES) · curado + datado · Energía v3 · E2-data
 *
 * España no tiene API JSON pública de orígenes del crudo: CORES (Corporación de
 * Reservas Estratégicas de Productos Petrolíferos · MITECO) publica la
 * estadística de aprovisionamiento de crudo MENSUALMENTE, en boletines PDF/Excel,
 * sin endpoint REST consultable. Por tanto este dato es inevitablemente CURADO,
 * pero el diseño v3 (§2) exige que lo curado sea HONESTO: con `fuente`,
 * `fuente_url`, `fecha_ref` y una métrica de frescura (`freshness`) explícitos.
 *
 * Este cliente toma el catálogo `PETROLEO_DEPENDENCIA_ES` y lo reestructura con
 * esos campos calculados, para que la UI muestre claramente "dato curado de
 * <fecha>, hace N días" en vez de aparentar un dato vivo.
 *
 * ── Diseño defensivo (patrón Politeia) ───────────────────────────────────────
 *   - Respuesta: { ok, data|null, error?, fetched_at, source_url }. Siempre
 *     `ok:true` (el catálogo está embebido; no hay red que pueda fallar).
 *   - `computeFreshness()` y `buildPetroleoOrigenes()` son PURAS y se exportan
 *     para tests.
 *
 * Sin red, sin secretos. Cero emojis.
 */
import { PETROLEO_DEPENDENCIA_ES } from './catalog.ts'
import type { PetroleoOrigen } from './types'

const CACHE_TTL_MS = 24 * 3600_000 // 24h (el catálogo no cambia, pero `freshness` sí)

// ─────────────────────────────────────────────────────────────────────────
// Tipos (definidos AQUÍ · no se edita types.ts)
// ─────────────────────────────────────────────────────────────────────────

/** Métrica de frescura de un dato curado y datado. */
export interface Freshness {
  /** Fecha de referencia del dato (ISO 'YYYY-MM-DD' o 'YYYY'). */
  fecha_ref: string
  /** Días transcurridos desde `fecha_ref` hasta ahora (>= 0), null si no parseable. */
  dias_desde_ref: number | null
  /** Etiqueta legible (ej. "hace 1 año y 4 meses", "hace 45 días"). */
  label: string
  /** Frescura cualitativa para colorear badges en la UI. */
  nivel: 'reciente' | 'aceptable' | 'desactualizado' | 'desconocido'
}

/** Orígenes del crudo de España, estructurados con procedencia + frescura. */
export interface PetroleoOrigenesData {
  /** Naturaleza del dato (siempre curado: no hay API live de CORES). */
  source: 'catalog'
  /** % del crudo consumido que se importa (≈99%). */
  dependencia_importacion_pct: number
  /** Orígenes por país, ordenados por cuota descendente. */
  origenes: PetroleoOrigen[]
  /** Fuente citada (CORES/MITECO). */
  fuente: string
  /** URL pública de la fuente. */
  fuente_url: string
  /** Fecha de referencia del dato (ISO 'YYYY-MM-DD' o 'YYYY'). */
  fecha_ref: string
  /** Métrica de frescura calculada. */
  freshness: Freshness
  /** Notas de contexto (chokepoints, diversificación, embargo Rusia, etc.). */
  nota: string
}

/** Envoltura de degradación (patrón Politeia). */
export interface PetroleoOrigenesResponse {
  ok: boolean
  error?: string
  data?: PetroleoOrigenesData
  fetched_at: string
  source_url?: string
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria · TTL 24h (recalcula `freshness` cada día)
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry { expires: number; value: PetroleoOrigenesResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearPetroleoOrigenesCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS (testeables)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Normaliza `fecha_ref` (que puede ser 'YYYY', 'YYYY-MM' o 'YYYY-MM-DD') a un
 * Date UTC. Para 'YYYY' usa el 1-jul (mitad de año) para no exagerar la antigüedad.
 * Devuelve null si no es parseable.
 */
function refToDate(fechaRef: string): Date | null {
  const s = String(fechaRef).trim()
  if (/^\d{4}$/.test(s)) return new Date(Date.UTC(Number(s), 6, 1)) // 1-jul
  if (/^\d{4}-\d{2}$/.test(s)) return new Date(`${s}-15T00:00:00Z`) // día 15
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00Z`)
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Etiqueta legible de antigüedad a partir de días. */
function labelFromDays(dias: number): string {
  if (dias < 0) return 'fecha futura'
  if (dias < 45) return `hace ${dias} día${dias === 1 ? '' : 's'}`
  const meses = Math.round(dias / 30)
  if (meses < 12) return `hace ${meses} mes${meses === 1 ? '' : 'es'}`
  const anos = Math.floor(meses / 12)
  const restoMeses = meses % 12
  const parteAnos = `${anos} año${anos === 1 ? '' : 's'}`
  return restoMeses > 0
    ? `hace ${parteAnos} y ${restoMeses} mes${restoMeses === 1 ? '' : 'es'}`
    : `hace ${parteAnos}`
}

/**
 * Calcula la frescura de un dato datado respecto a `now`. Pura: pasa `now` para
 * testear de forma determinista. CORES publica mensual → umbrales: <120 días
 * reciente, <540 días (~18 meses) aceptable, mayor desactualizado.
 */
export function computeFreshness(fechaRef: string, now: Date = new Date()): Freshness {
  const ref = refToDate(fechaRef)
  if (!ref) {
    return { fecha_ref: fechaRef, dias_desde_ref: null, label: 'fecha desconocida', nivel: 'desconocido' }
  }
  const dias = Math.max(0, Math.floor((now.getTime() - ref.getTime()) / 86_400_000))
  let nivel: Freshness['nivel']
  if (dias < 120) nivel = 'reciente'
  else if (dias < 540) nivel = 'aceptable'
  else nivel = 'desactualizado'
  return { fecha_ref: fechaRef, dias_desde_ref: dias, label: labelFromDays(dias), nivel }
}

/**
 * Construye `PetroleoOrigenesData` desde el catálogo `PETROLEO_DEPENDENCIA_ES`
 * con `freshness` calculada. Pura: `now` inyectable para tests.
 */
export function buildPetroleoOrigenes(now: Date = new Date()): PetroleoOrigenesData {
  const cat = PETROLEO_DEPENDENCIA_ES
  const fechaRef = String(cat.ano_ref)
  // Orígenes ordenados por cuota descendente (defensivo: el catálogo ya lo está).
  const origenes = [...cat.origenes].sort((a, b) => b.cuota_pct - a.cuota_pct)
  return {
    source: 'catalog',
    dependencia_importacion_pct: cat.dependencia_importacion_pct,
    origenes,
    fuente: cat.fuente,
    fuente_url: cat.fuente_url,
    fecha_ref: fechaRef,
    freshness: computeFreshness(fechaRef, now),
    nota: cat.nota,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch (sin red · catálogo datado)
// ─────────────────────────────────────────────────────────────────────────

export interface FetchPetroleoOrigenesOpts {
  /** Forzar recálculo ignorando la caché. */
  noCache?: boolean
  /** `now` inyectable (tests). */
  now?: Date
}

/**
 * Devuelve los orígenes del crudo de España (catálogo CORES) estructurados con
 * fuente + frescura explícitas. No hay red: siempre `ok:true`. Caché 24h (para
 * que `freshness` se recalcule a diario).
 */
export async function fetchPetroleoOrigenes(
  opts: FetchPetroleoOrigenesOpts = {},
): Promise<PetroleoOrigenesResponse> {
  const fetched_at = new Date().toISOString()

  if (!opts.noCache && !opts.now) {
    const hit = _cache.get('petroleo')
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  const result: PetroleoOrigenesResponse = {
    ok: true,
    data: buildPetroleoOrigenes(opts.now),
    fetched_at,
    source_url: PETROLEO_DEPENDENCIA_ES.fuente_url,
  }

  if (!opts.now) {
    _cache.set('petroleo', { expires: Date.now() + CACHE_TTL_MS, value: result })
  }
  return result
}
