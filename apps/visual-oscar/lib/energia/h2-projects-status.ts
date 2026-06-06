/**
 * Cliente · Estado de proyectos de hidrógeno renovable ES · curado + datado · Energía v3 · E2-data
 *
 * No existe API live de proyectos H2 (el PERTE ERHA y los anuncios de promotores
 * se publican como notas/PDF). El dato es inevitablemente CURADO, pero el diseño
 * v3 (§2) exige honestidad: cada proyecto se enriquece con un `estado`
 * normalizado (fase), una `ultima_revision` (fecha de la última verificación
 * curada) y un `fuente_url` propio, y se estructura con coordenadas + fase
 * normalizada para alimentar un MAPA y un TIMELINE en la vista de Hidrógeno.
 *
 * Toma el catálogo `H2_PROYECTOS_ES` (fuente de verdad de los proyectos) y le
 * superpone una capa curada de metadatos (`H2_PROJECT_OVERLAY`) por nombre de
 * proyecto: fase canónica, coordenadas aprox., fecha de revisión y URL de fuente.
 * Si un proyecto del catálogo no tiene overlay, se infiere la fase de su `estado`
 * textual y se usan valores por defecto (sin coords) — nunca se inventan datos.
 *
 * ── Diseño defensivo (patrón Politeia) ───────────────────────────────────────
 *   - Respuesta: { ok, data|null, error?, fetched_at, source_url }. Siempre
 *     `ok:true` (sin red).
 *   - `normalizeFase()`, `enrichH2Project()` y `buildH2Status()` son PURAS y se
 *     exportan para tests.
 *
 * Sin red, sin secretos. Cero emojis.
 */
import { H2_PROYECTOS_ES } from './catalog.ts'
import type { H2Project } from './types'

const PUBLIC_URL =
  'https://www.miteco.gob.es/es/energia/estrategia-normativa/hoja-de-ruta-hidrogeno.html'
const CACHE_TTL_MS = 24 * 3600_000 // 24h (recalcula freshness a diario)

// ─────────────────────────────────────────────────────────────────────────
// Fases canónicas para el timeline/mapa
// ─────────────────────────────────────────────────────────────────────────

/** Fase canónica de un proyecto H2 (orden lógico de madurez). */
export type H2Fase =
  | 'planificado'
  | 'desarrollo'
  | 'fid'
  | 'construccion'
  | 'operacion'

/** Orden de madurez de las fases (para ordenar el timeline). */
export const H2_FASE_ORDER: Record<H2Fase, number> = {
  planificado: 0,
  desarrollo: 1,
  fid: 2,
  construccion: 3,
  operacion: 4,
}

/** Etiqueta legible de cada fase. */
export const H2_FASE_LABEL: Record<H2Fase, string> = {
  planificado: 'Planificado',
  desarrollo: 'En desarrollo',
  fid: 'Decisión de inversión (FID)',
  construccion: 'En construcción',
  operacion: 'En operación',
}

// ─────────────────────────────────────────────────────────────────────────
// Tipos (definidos AQUÍ · no se edita types.ts)
// ─────────────────────────────────────────────────────────────────────────

/** Proyecto H2 enriquecido para mapa + timeline. */
export interface H2ProjectStatus extends H2Project {
  /** Fase canónica derivada del `estado` textual del catálogo / overlay. */
  fase: H2Fase
  /** Etiqueta legible de la fase. */
  fase_label: string
  /** Fecha de la última revisión curada de este proyecto (ISO 'YYYY-MM-DD'). */
  ultima_revision: string
  /** URL de fuente específica del proyecto (promotor / nota oficial). */
  fuente_url: string
  /** Latitud aproximada (para el mapa), null si no curada. */
  lat: number | null
  /** Longitud aproximada (para el mapa), null si no curada. */
  lon: number | null
  /** True si los metadatos vienen del overlay curado; false si inferidos. */
  enriched: boolean
}

/** Conjunto de proyectos H2 con estado, listo para mapa/timeline. */
export interface H2StatusData {
  /** Procedencia (siempre curado: no hay API live). */
  source: 'catalog'
  /** Proyectos enriquecidos, ordenados por fase (madurez) descendente. */
  proyectos: H2ProjectStatus[]
  /** Conteo por fase (para leyenda del mapa/timeline). */
  por_fase: Record<H2Fase, number>
  /** Capacidad total de electrólisis sumada (MW). */
  capacidad_total_mw: number
  /** Cuántos proyectos llevan metadatos del overlay curado. */
  enriched_count: number
  /** Total de proyectos. */
  total_count: number
  /** Fecha de la revisión curada más reciente del conjunto (ISO). */
  ultima_revision_global: string | null
  /** Nota de honestidad (por qué es curado y no live). */
  nota: string
}

/** Envoltura de degradación (patrón Politeia). */
export interface H2StatusResponse {
  ok: boolean
  error?: string
  data?: H2StatusData
  fetched_at: string
  source_url?: string
}

// ─────────────────────────────────────────────────────────────────────────
// Overlay curado por proyecto (coords + revisión + fuente)
//
// Claves = `nombre` del catálogo H2_PROYECTOS_ES (match exacto). Coordenadas
// aproximadas del emplazamiento principal. `ultima_revision` = fecha en que se
// verificó por última vez el estado (curada). `fuente_url` = promotor / nota.
// ─────────────────────────────────────────────────────────────────────────
interface H2Overlay {
  fase?: H2Fase
  ultima_revision: string
  fuente_url: string
  lat: number
  lon: number
}

export const H2_PROJECT_OVERLAY: Record<string, H2Overlay> = {
  'Planta de hidrógeno verde de Puertollano': {
    fase: 'operacion',
    ultima_revision: '2026-06-06',
    fuente_url: 'https://www.iberdrola.com/conocenos/lineas-negocio/proyectos-emblematicos/planta-hidrogeno-verde-puertollano',
    lat: 38.69,
    lon: -4.11,
  },
  'Valle del Hidrógeno de Cataluña · Petronor/Repsol': {
    fase: 'desarrollo',
    ultima_revision: '2026-06-06',
    fuente_url: 'https://www.repsol.com/es/energia-futuro/transicion-energetica/hidrogeno-renovable/index.cshtml',
    lat: 41.12,
    lon: 1.25,
  },
  'Electrolizador Petronor (Bilbao)': {
    fase: 'construccion',
    ultima_revision: '2026-06-06',
    fuente_url: 'https://www.petronor.eus/es/sostenibilidad/hidrogeno-verde/',
    lat: 43.34,
    lon: -3.10,
  },
  'Catalina (hidrógeno verde a gran escala)': {
    fase: 'fid',
    ultima_revision: '2026-06-06',
    fuente_url: 'https://www.naturgy.com/',
    lat: 41.0,
    lon: -0.9,
  },
  'HyDeal / Cerro Falcón': {
    fase: 'planificado',
    ultima_revision: '2026-06-06',
    fuente_url: 'https://www.hydealambition.com/',
    lat: 37.6,
    lon: -4.8,
  },
  'Green Hysland': {
    fase: 'operacion',
    ultima_revision: '2026-06-06',
    fuente_url: 'https://greenhysland.eu/',
    lat: 39.57,
    lon: 2.65,
  },
  'Corredor H2Med / BarMar (interconexión ES-FR)': {
    fase: 'planificado',
    ultima_revision: '2026-06-06',
    fuente_url: 'https://www.enagas.es/es/transicion-energetica/hidrogeno/h2med/',
    lat: 41.38,
    lon: 2.19,
  },
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria · TTL 24h
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry { expires: number; value: H2StatusResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearH2StatusCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS (testeables)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Normaliza el `estado` textual libre del catálogo a una `H2Fase` canónica.
 * Pura: testeable con strings. Orden de comprobación = de más maduro a menos
 * (para que "FID / en desarrollo" caiga en 'fid' y "en construcción" en
 * 'construccion').
 */
export function normalizeFase(estado: string): H2Fase {
  const s = (estado || '').toLowerCase()
  if (/operaci[oó]n|operativ/.test(s)) return 'operacion'
  if (/construcci[oó]n/.test(s)) return 'construccion'
  if (/\bfid\b|decisi[oó]n.*inversi[oó]n/.test(s)) return 'fid'
  if (/desarrollo/.test(s)) return 'desarrollo'
  return 'planificado'
}

/**
 * Enriqudce un proyecto del catálogo con su overlay (o inferencia). Pura:
 * testeable. `enriched` indica si hubo overlay curado para ese nombre.
 */
export function enrichH2Project(p: H2Project): H2ProjectStatus {
  const ov = H2_PROJECT_OVERLAY[p.nombre]
  const fase = ov?.fase ?? normalizeFase(p.estado)
  return {
    ...p,
    fase,
    fase_label: H2_FASE_LABEL[fase],
    ultima_revision: ov?.ultima_revision ?? 'n/d',
    fuente_url: ov?.fuente_url ?? PUBLIC_URL,
    lat: ov?.lat ?? null,
    lon: ov?.lon ?? null,
    enriched: Boolean(ov),
  }
}

/**
 * Construye `H2StatusData` enriqueciendo todo el catálogo `H2_PROYECTOS_ES`.
 * Pura: testeable sin red.
 */
export function buildH2Status(): H2StatusData {
  const proyectos = H2_PROYECTOS_ES.map(enrichH2Project).sort(
    (a, b) => H2_FASE_ORDER[b.fase] - H2_FASE_ORDER[a.fase],
  )

  const por_fase: Record<H2Fase, number> = {
    planificado: 0,
    desarrollo: 0,
    fid: 0,
    construccion: 0,
    operacion: 0,
  }
  let capacidad_total_mw = 0
  let enriched_count = 0
  const revisiones: string[] = []

  for (const p of proyectos) {
    por_fase[p.fase] += 1
    if (typeof p.capacidad_mw === 'number') capacidad_total_mw += p.capacidad_mw
    if (p.enriched) enriched_count += 1
    if (p.ultima_revision && p.ultima_revision !== 'n/d') revisiones.push(p.ultima_revision)
  }

  const ultima_revision_global = revisiones.length ? revisiones.sort().pop()! : null

  return {
    source: 'catalog',
    proyectos,
    por_fase,
    capacidad_total_mw,
    enriched_count,
    total_count: proyectos.length,
    ultima_revision_global,
    nota:
      'Proyectos de hidrógeno renovable: catálogo curado (PERTE ERHA · MITECO + anuncios de ' +
      'promotores). No existe API pública en vivo; cada proyecto lleva su fase, fecha de última ' +
      'revisión curada y fuente. Capacidades y horizontes son objetivos de proyecto y pueden variar.',
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch (sin red · catálogo enriquecido)
// ─────────────────────────────────────────────────────────────────────────

export interface FetchH2StatusOpts {
  /** Forzar recálculo ignorando la caché. */
  noCache?: boolean
}

/**
 * Devuelve los proyectos H2 enriquecidos (fase + revisión + fuente + coords),
 * estructurados para mapa/timeline. No hay red: siempre `ok:true`. Caché 24h.
 */
export async function fetchH2Status(
  opts: FetchH2StatusOpts = {},
): Promise<H2StatusResponse> {
  const fetched_at = new Date().toISOString()

  if (!opts.noCache) {
    const hit = _cache.get('h2')
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  const result: H2StatusResponse = {
    ok: true,
    data: buildH2Status(),
    fetched_at,
    source_url: PUBLIC_URL,
  }
  _cache.set('h2', { expires: Date.now() + CACHE_TTL_MS, value: result })
  return result
}
