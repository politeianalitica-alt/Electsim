/**
 * Cliente · Progreso real vs PNIEC 2030 · Energía v3 · E2-data
 *
 * De-hardcodea el seguimiento del PNIEC: en vez de servir el `valor_actual`
 * estático del catálogo `PNIEC_2030`, calcula el progreso usando fuentes VIVAS
 * donde es posible:
 *   - Cuota renovable eléctrica  ← mix REE en vivo (`generacion/estructura-
 *       generacion`, % renovable computado sobre el último periodo).
 *   - Potencia solar FV / eólica instalada (GW) ← REE potencia instalada en vivo
 *       (`lib/energia/renovables-capacity.ts`, ya de-hardcodeada).
 * El resto de métricas del PNIEC sin fuente viva directa (eficiencia, GEI,
 * almacenamiento, electrolizadores) conservan el `valor_actual` del catálogo,
 * marcadas con `source: 'catalog'` para ser honestos (diseño Energía v3 §2).
 *
 * ── Fuentes ─────────────────────────────────────────────────────────────────
 *   - REE apidatos `estructura-generacion` (vía `lib/sources/ree.ts`
 *     `mixGeneracion`): clasificación 'Renovable' / 'No-Renovable' por serie →
 *     % renovable = renovable / total. Keyless.
 *   - REE apidatos `potencia-instalada` (vía `lib/energia/renovables-capacity.ts`):
 *     MW por tecnología → GW de solar FV y eólica.
 *   - Objetivos: catálogo `PNIEC_2030` (curado, MITECO).
 *
 * ── Diseño defensivo (patrón Politeia) ───────────────────────────────────────
 *   - Respuesta: { ok, data|null, error?, fetched_at, source_url }.
 *   - `ok:true` aun si todas las métricas caen al catálogo (siempre hay objetivos
 *     que mostrar). Cada métrica lleva su `source` ('live'|'catalog').
 *   - Caché en memoria 6h.
 *   - `computeProgress()`, `buildPniecProgress()` son PURAS (sin red) y se
 *     exportan para tests.
 *
 * Sin secretos (endpoints keyless). Cero emojis.
 */
import { PNIEC_2030 } from './catalog.ts'
import { mixGeneracion, type ReeSerie } from '../sources/ree.ts'
import { fetchRenovablesCapacity, type CapacidadTecnologia } from './renovables-capacity.ts'

const PUBLIC_URL = 'https://www.miteco.gob.es/es/energia/estrategia-normativa/pniec.html'
const CACHE_TTL_MS = 6 * 3600_000 // 6h

// ─────────────────────────────────────────────────────────────────────────
// Tipos (definidos AQUÍ · no se edita types.ts)
// ─────────────────────────────────────────────────────────────────────────

/** Progreso de una métrica del PNIEC 2030 (objetivo vs valor actual). */
export interface PniecMetricProgress {
  /** Métrica (ej. "Generación eléctrica de origen renovable"). */
  metrica: string
  /** Valor objetivo a 2030. */
  objetivo_2030: number | string
  /** Valor actual (último dato disponible · vivo o catálogo). */
  valor_actual: number | string
  /** Progreso hacia el objetivo en % (valor/objetivo×100), null si no calculable. */
  progreso_pct: number | null
  /** Unidad de medida. */
  unidad: string
  /** Procedencia del `valor_actual`: 'live' (fuente viva) o 'catalog' (curado). */
  source: 'live' | 'catalog'
  /** Etiqueta de la fuente del valor actual (para la UI). */
  source_label: string
}

/** Conjunto de métricas PNIEC con su progreso. */
export interface PniecProgressData {
  /** Métricas con progreso, en el orden del catálogo. */
  metricas: PniecMetricProgress[]
  /** Cuántas métricas usan dato vivo. */
  live_count: number
  /** Total de métricas. */
  total_count: number
  /** Fecha de referencia del mix renovable vivo usado (ISO), null si no hubo. */
  fecha_ref_mix: string | null
}

/** Envoltura de degradación (patrón Politeia). */
export interface PniecProgressResponse {
  ok: boolean
  error?: string
  data?: PniecProgressData
  fetched_at: string
  source_url?: string
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria · TTL 6h
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry { expires: number; value: PniecProgressResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearPniecProgressCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS (testeables)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Progreso hacia el objetivo en %, redondeado a 1 decimal. Null si alguno no es
 * numérico o el objetivo es 0/negativo. Clamp inferior a 0 (no negativos).
 */
export function computeProgress(
  valor: number | string,
  objetivo: number | string,
): number | null {
  const v = typeof valor === 'number' ? valor : Number(valor)
  const o = typeof objetivo === 'number' ? objetivo : Number(objetivo)
  if (!Number.isFinite(v) || !Number.isFinite(o) || o <= 0) return null
  const pct = (v / o) * 100
  if (!Number.isFinite(pct)) return null
  return Math.round(Math.max(0, pct) * 10) / 10
}

/**
 * Calcula el % renovable a partir de las series del mix REE
 * (`estructura-generacion`). Suma la generación de las series clasificadas como
 * 'Renovable' y la divide por el total (excluyendo agregados `composite`).
 * Pura: testeable con fixtures de series REE. Devuelve null si no hay datos.
 */
export function renewableShareFromMix(series: ReeSerie[]): number | null {
  if (!Array.isArray(series) || series.length === 0) return null
  let renov = 0
  let total = 0
  for (const s of series) {
    if (s.composite) continue // serie agregada (ej. "Generación total")
    // Preferimos `last_value` (instante más reciente); si no, el total acumulado.
    const v = typeof s.last_value === 'number' ? s.last_value : s.total
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    if (v < 0) continue // descartar consumos negativos (bombeo)
    total += v
    if (typeof s.type === 'string' && /renovab/i.test(s.type) && !/no.?renovab/i.test(s.type)) {
      renov += v
    }
  }
  if (total <= 0) return null
  return Math.round((renov / total) * 1000) / 10 // 1 decimal
}

/** Busca una tecnología por substring (case-insensitive) y devuelve sus GW. */
function gwForTech(techs: CapacidadTecnologia[], pattern: RegExp): number | null {
  const hit = techs.find((t) => pattern.test(t.tecnologia))
  if (!hit || hit.capacidad_mw == null) return null
  return Math.round((hit.capacidad_mw / 1000) * 10) / 10 // MW → GW, 1 decimal
}

/** Inputs vivos para ensamblar el progreso (cualquiera puede ser null). */
export interface PniecLiveInputs {
  /** % renovable eléctrico vivo (del mix REE), null si no disponible. */
  renewable_share_pct: number | null
  /** GW solar FV instalados vivos, null si no disponibles. */
  solar_gw: number | null
  /** GW eólicos instalados vivos, null si no disponibles. */
  eolica_gw: number | null
  /** Si la capacidad provino de REE en vivo (true) o del catálogo (false). */
  capacity_is_live: boolean
  /** Fecha de referencia del mix renovable (ISO), null si no hubo. */
  mix_date: string | null
}

/**
 * Ensambla el progreso PNIEC combinando los objetivos del catálogo `PNIEC_2030`
 * con los inputs vivos. Pura: testeable sin red. Cada métrica se marca con su
 * `source` según haya podido usar dato vivo o no.
 */
export function buildPniecProgress(live: PniecLiveInputs): PniecProgressData {
  const metricas: PniecMetricProgress[] = PNIEC_2030.map((t) => {
    let valor_actual: number | string = t.valor_actual
    let source: 'live' | 'catalog' = 'catalog'
    let source_label = 'PNIEC 2023-2030 · seguimiento curado (MITECO)'

    const m = t.metrica.toLowerCase()

    if (/generaci[oó]n el[eé]ctrica.*renovable|el[eé]ctrica de origen renovable/.test(m)) {
      if (live.renewable_share_pct != null) {
        valor_actual = live.renewable_share_pct
        source = 'live'
        source_label = 'REE apidatos · % renovable del mix (en vivo)'
      }
    } else if (/solar fotovoltaica/.test(m)) {
      if (live.solar_gw != null) {
        valor_actual = live.solar_gw
        source = live.capacity_is_live ? 'live' : 'catalog'
        source_label = live.capacity_is_live
          ? 'REE apidatos · potencia solar FV instalada (en vivo)'
          : 'REE · potencia instalada (catálogo curado)'
      }
    } else if (/potencia e[oó]lica/.test(m)) {
      if (live.eolica_gw != null) {
        valor_actual = live.eolica_gw
        source = live.capacity_is_live ? 'live' : 'catalog'
        source_label = live.capacity_is_live
          ? 'REE apidatos · potencia eólica instalada (en vivo)'
          : 'REE · potencia instalada (catálogo curado)'
      }
    }

    return {
      metrica: t.metrica,
      objetivo_2030: t.objetivo_2030,
      valor_actual,
      progreso_pct: computeProgress(valor_actual, t.objetivo_2030),
      unidad: t.unidad,
      source,
      source_label,
    }
  })

  const live_count = metricas.filter((x) => x.source === 'live').length

  return {
    metricas,
    live_count,
    total_count: metricas.length,
    fecha_ref_mix: live.mix_date,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch (combina REE mix + capacidad live) con degradación
// ─────────────────────────────────────────────────────────────────────────

export interface FetchPniecProgressOpts {
  /** Forzar refetch ignorando la caché. */
  noCache?: boolean
  /** Ventana del mix REE en días (default 2 · último día con datos). */
  mixDaysBack?: number
}

/**
 * Devuelve el progreso del PNIEC 2030 combinando mix renovable + capacidad VIVOS
 * (REE) con los objetivos curados. Nunca lanza: si las fuentes vivas fallan,
 * cae a los `valor_actual` del catálogo. Caché 6h.
 */
export async function fetchPniecProgress(
  opts: FetchPniecProgressOpts = {},
): Promise<PniecProgressResponse> {
  const fetched_at = new Date().toISOString()

  if (!opts.noCache) {
    const hit = _cache.get('pniec')
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  // Mix REE (renovable %) + capacidad instalada en paralelo. Ambos degradan solos.
  const [mixRes, capRes] = await Promise.all([
    mixGeneracion(opts.mixDaysBack ?? 2).catch(() => ({ ok: false, series: [] as ReeSerie[] })),
    fetchRenovablesCapacity().catch(() => null),
  ])

  const renewable_share_pct = mixRes.ok ? renewableShareFromMix(mixRes.series) : null
  const mix_date =
    mixRes.ok && mixRes.series.length
      ? (mixRes.series.find((s) => s.last_datetime)?.last_datetime?.slice(0, 10) ?? null)
      : null

  const capTechs = capRes?.data?.tecnologias ?? []
  const capacity_is_live = capRes?.data?.source === 'live'
  const solar_gw = gwForTech(capTechs, /solar.*fotovolta|fotovolta/i)
  const eolica_gw = gwForTech(capTechs, /e[oó]lica/i)

  const data = buildPniecProgress({
    renewable_share_pct,
    solar_gw,
    eolica_gw,
    capacity_is_live,
    mix_date,
  })

  const result: PniecProgressResponse = {
    ok: true,
    data,
    fetched_at,
    source_url: PUBLIC_URL,
  }
  _cache.set('pniec', { expires: Date.now() + CACHE_TTL_MS, value: result })
  return result
}
