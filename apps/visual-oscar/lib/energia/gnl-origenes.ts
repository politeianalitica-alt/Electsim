/**
 * Cliente · GNL España · estado vivo (ALSI) + plantas + orígenes · Energía v3 · E2-data
 *
 * De-hardcodea el estado del GNL español combinando:
 *   - DATO VIVO (GIE ALSI · `lib/energia/alsi.ts`): nivel de llenado agregado de
 *     España (inventory.gwh / dtmi.gwh × 100) y emisión a la red (send-out
 *     GWh/d), día a día. ALSI publica el agregado por país (ES), no por terminal;
 *     se expone como "estado del conjunto de terminales españolas".
 *   - ESTRUCTURA (catálogo `GNL_ESPANA` · Enagás): las 6 plantas + El Musel con
 *     su capacidad de emisión nominal (GWh/día) → se calcula la cuota de cada
 *     terminal sobre el send-out vivo total, prorrateada por capacidad nominal.
 *   - ORÍGENES (catálogo `GNL_ESPANA.origenes` · CORES/Enagás): los países de
 *     procedencia del GNL no tienen API JSON pública (CORES publica mensual) →
 *     se exponen como `nota_origenes` curada + datada, no inventada.
 *
 * El resultado es "live" en el estado de llenado/send-out (lo que cambia a
 * diario) y "catálogo" en la estructura física + orígenes (lo estructural).
 *
 * ── Diseño defensivo (patrón agsi.ts / alsi.ts) ────────────────────────────
 *   - Respuesta: { ok, data|null, error?, fetched_at, source_url }.
 *   - Requiere GIE_API_KEY para el estado vivo; sin ella `ok:false` con error
 *     explícito (igual que ALSI). NUNCA lanza ni inventa el dato vivo.
 *   - Caché en memoria 6h (el dato ALSI es diario · gas-day).
 *   - `prorrateaSendOut()` y `buildGnlOrigenes()` son PURAS (sin red) y se
 *     exportan para tests.
 *
 * GIE_API_KEY es server-side. Cero secretos en código. Cero emojis.
 */
import { fetchLngStorage, type FetchLngStorageOpts } from './alsi.ts'
import { GNL_ESPANA } from './catalog.ts'
import type { LngStorage } from './types'

const PUBLIC_URL = 'https://alsi.gie.eu'
const CACHE_TTL_MS = 6 * 3600_000 // 6h · el dato ALSI es diario (gas-day)

// ─────────────────────────────────────────────────────────────────────────
// Tipos (definidos AQUÍ · no se edita types.ts)
// ─────────────────────────────────────────────────────────────────────────

/** Estado prorrateado de una terminal española de GNL. */
export interface GnlTerminalEstado {
  /** Nombre de la planta (ej. "Barcelona"). */
  nombre: string
  /** Ubicación (provincia / CCAA). */
  ubicacion: string
  /** Operador de la terminal. */
  operador: string
  /** Capacidad de emisión nominal en GWh/día (catálogo Enagás), null si N/D. */
  emision_nominal_gwh_dia: number | null
  /** Estado operativo de la planta. */
  estado: string
  /**
   * Send-out estimado de esta terminal (GWh/d), prorrateado del send-out vivo
   * agregado por su cuota de capacidad nominal. Null si no calculable.
   */
  send_out_estimado_gwh: number | null
  /** Cuota de esta terminal sobre la capacidad nominal total del sistema (%). */
  cuota_capacidad_pct: number | null
  /** Nota de contexto de la planta (si la trae el catálogo). */
  nota?: string
}

/** País de origen del GNL (catálogo CORES/Enagás). */
export interface GnlOrigenItem {
  pais: string
  cuota_pct: number
}

/** Estado completo del GNL español (vivo + estructura + orígenes). */
export interface GnlOrigenesData {
  /** ── Estado VIVO agregado (ALSI) ────────────────────────────────── */
  /** % de llenado agregado de los tanques de GNL de España (ALSI), null. */
  fullness_pct: number | null
  /** Energía de GNL en tanque agregada en GWh (ALSI inventory.gwh), null. */
  inventory_gwh: number | null
  /** Capacidad máxima declarada agregada en GWh (ALSI dtmi.gwh), null. */
  dtmi_gwh: number | null
  /** Send-out (emisión a la red) agregado del último gas-day en GWh/d, null. */
  send_out_total_gwh: number | null
  /** Fecha del último dato vivo de ALSI (ISO 'YYYY-MM-DD'), null. */
  updated_at: string | null
  /** ── Estructura (catálogo · prorrateo del send-out vivo) ─────────── */
  /** Terminales con su estado prorrateado. */
  terminales: GnlTerminalEstado[]
  /** ── Orígenes (catálogo CORES/Enagás · curado + datado) ──────────── */
  /** Países de origen del GNL, ordenados por cuota descendente. */
  origenes: GnlOrigenItem[]
  /** Año de referencia de los orígenes (catálogo). */
  origenes_ano_ref: number
  /** Nota de orígenes (honesta: por qué es curado y no live). */
  nota_origenes: string
  /** Fuente de los orígenes. */
  origenes_fuente: string
  /** URL de la fuente de orígenes. */
  origenes_fuente_url: string
}

/** Envoltura de degradación (patrón Politeia). */
export interface GnlOrigenesResponse {
  ok: boolean
  error?: string
  data?: GnlOrigenesData
  fetched_at: string
  source_url?: string
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria · TTL 6h
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry { expires: number; value: GnlOrigenesResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearGnlOrigenesCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS (testeables)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Prorratea un send-out agregado (GWh/d) entre las plantas del catálogo según su
 * capacidad de emisión nominal. Las plantas con `emision_gwh_dia` null (ej. El
 * Musel en puesta en marcha) reciben cuota/send-out null. Pura: testeable.
 *
 * @param sendOutTotal send-out agregado vivo (GWh/d), o null si no hay dato.
 */
export function prorrateaSendOut(sendOutTotal: number | null): GnlTerminalEstado[] {
  const plantas = GNL_ESPANA.plantas
  const capTotal = plantas.reduce(
    (acc, p) => acc + (typeof p.emision_gwh_dia === 'number' ? p.emision_gwh_dia : 0),
    0,
  )

  return plantas.map((p) => {
    const cap = typeof p.emision_gwh_dia === 'number' ? p.emision_gwh_dia : null
    const cuota = cap != null && capTotal > 0 ? Math.round((cap / capTotal) * 1000) / 10 : null
    const sendEst =
      cap != null && capTotal > 0 && typeof sendOutTotal === 'number'
        ? Math.round((cap / capTotal) * sendOutTotal * 10) / 10
        : null
    return {
      nombre: p.nombre,
      ubicacion: p.ubicacion,
      operador: p.operador,
      emision_nominal_gwh_dia: cap,
      estado: p.estado,
      send_out_estimado_gwh: sendEst,
      cuota_capacidad_pct: cuota,
      ...(p.nota ? { nota: p.nota } : {}),
    }
  })
}

/**
 * Ensambla `GnlOrigenesData` a partir del estado vivo ALSI (puede ser null si la
 * key falta) + el catálogo `GNL_ESPANA`. Pura: testeable sin red.
 */
export function buildGnlOrigenes(live: LngStorage | null): GnlOrigenesData {
  const sendOutTotal = live?.send_out_gwh ?? null
  return {
    fullness_pct: live?.fullness_pct ?? null,
    inventory_gwh: live?.inventory_gwh ?? null,
    dtmi_gwh: live?.dtmi_gwh ?? null,
    send_out_total_gwh: sendOutTotal,
    updated_at: live?.updated_at ?? null,
    terminales: prorrateaSendOut(sendOutTotal),
    origenes: GNL_ESPANA.origenes.map((o) => ({ pais: o.pais, cuota_pct: o.cuota_pct })),
    origenes_ano_ref: GNL_ESPANA.ano_ref,
    nota_origenes:
      `Orígenes por país: catálogo curado de CORES/Enagás (datos ~${GNL_ESPANA.ano_ref}). ` +
      'CORES publica el desglose por país mensualmente sin API JSON pública, por lo que ' +
      'estos porcentajes son orden de magnitud y no el mes corriente. El estado de llenado ' +
      'y el send-out SÍ son en vivo (GIE ALSI). ' +
      GNL_ESPANA.nota,
    origenes_fuente: GNL_ESPANA.fuente,
    origenes_fuente_url: GNL_ESPANA.fuente_url,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch (ALSI ES) con degradación
// ─────────────────────────────────────────────────────────────────────────

export interface FetchGnlOrigenesOpts {
  /** Forzar refetch ignorando la caché. */
  noCache?: boolean
  /** Ventana de la serie ALSI en días (default 30). */
  days?: number
  /** Timeout en ms (se pasa a ALSI). */
  timeoutMs?: number
}

/**
 * Devuelve el estado del GNL español: nivel/send-out VIVO (ALSI · España) +
 * terminales prorrateadas + orígenes curados. Nunca lanza. Requiere GIE_API_KEY
 * para el dato vivo; sin ella degrada con el error de ALSI. Caché 6h.
 */
export async function fetchGnlOrigenes(
  opts: FetchGnlOrigenesOpts = {},
): Promise<GnlOrigenesResponse> {
  const fetched_at = new Date().toISOString()

  if (!opts.noCache) {
    const hit = _cache.get('gnl')
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  const alsiOpts: FetchLngStorageOpts = {
    country: 'es',
    days: opts.days ?? 30,
    timeoutMs: opts.timeoutMs,
  }
  const alsi = await fetchLngStorage(alsiOpts)

  // Si ALSI degrada (key ausente o fallo), propagamos el error pero igual
  // devolvemos la estructura + orígenes del catálogo (con el dato vivo null).
  if (!alsi.ok || !alsi.data) {
    const result: GnlOrigenesResponse = {
      ok: false,
      error: alsi.error ?? 'alsi_sin_datos',
      data: buildGnlOrigenes(null),
      fetched_at,
      source_url: PUBLIC_URL,
    }
    // No cacheamos errores de auth (la key puede arreglarse).
    return result
  }

  const result: GnlOrigenesResponse = {
    ok: true,
    data: buildGnlOrigenes(alsi.data),
    fetched_at,
    source_url: PUBLIC_URL,
  }
  _cache.set('gnl', { expires: Date.now() + CACHE_TTL_MS, value: result })
  return result
}
