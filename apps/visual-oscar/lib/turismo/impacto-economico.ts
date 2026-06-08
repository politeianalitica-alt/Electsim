/**
 * Impacto económico del turismo · Turismo v3 · Sprint T2-cross
 *
 * Cruza Turismo con MACRO. Tres bloques:
 *   1) `pib_turistico_pct` · exportaciones de servicios turísticos como % del
 *      PIB (Eurostat `bop_its6_det`, bop_item=SC "Travel"). España ~5-6% del
 *      PIB sólo en turismo — de los más altos del mundo.
 *   2) `empleo_horeca` · ocupados en hostelería+restauración (Eurostat
 *      `lfsq_egan2`, NACE Rev2 sección I "Accommodation & Food Service").
 *   3) `gasto_publico_perte` · presupuesto de los PERTE/planes públicos ligados
 *      al turismo (curado + DATADO con fuente + fecha; no hay API de ejecución).
 *
 * Reutiliza el MISMO dataset/parser que el catálogo macro
 * (`lib/macro/cultura-ocio-catalog.ts`: co-tourism-services-export bop_its6_det,
 * co-empleo-hosteleria lfsq_egan2). Aquí se consulta la Eurostat dissemination
 * API directamente (igual base que `/api/eurostat`) y se parsea con
 * `parseJsonStat` de `lib/macro-utils.ts` — sin duplicar el parser.
 *
 * Patrón Politeia: `{ ok, data|null, error?, fetched_at, source_url }`, caché
 * TTL, helpers PUROS. Degrada por bloque: si Eurostat falla, los % quedan null
 * y el bloque PERTE (curado) sigue disponible.
 *
 * Docs: Eurostat bop_its6_det · lfsq_egan2 ;
 *       PERTE Turismo · https://www.lamoncloa.gob.es / planderecuperacion.gob.es
 */
import { parseJsonStat } from '../macro-utils.ts'

// ─────────────────────────────────────────────────────────────────────────
// Tipos (propios de este lib)
// ─────────────────────────────────────────────────────────────────────────

export interface PerteProgram {
  /** Nombre del programa / PERTE / plan. */
  programa: string
  /** Presupuesto comprometido en millones de euros. */
  presupuesto_meur: number
  /** Fuente del dato. */
  fuente: string
  /** Fecha de referencia del dato (YYYY o YYYY-MM). */
  fecha: string
}

export interface ImpactoEconomicoData {
  /** Exports turísticos como % PIB (Eurostat bop_its6_det · SC). null si falla. */
  pib_turistico_pct: number | null
  /** Periodo del dato de %PIB. */
  pib_turistico_period: string | null
  /** Ocupados HORECA (Eurostat lfsq_egan2 · NACE I), en miles. null si falla. */
  empleo_horeca: number | null
  /** Periodo del dato de empleo. */
  empleo_horeca_period: string | null
  /** Unidad del empleo ('miles de personas'). */
  empleo_horeca_unit: string
  /** Gasto público en planes turísticos (curado + datado). */
  gasto_publico_perte: PerteProgram[]
  /** Suma del gasto público curado (MEUR). */
  gasto_publico_total_meur: number
  /** Procedencia agregada del bloque de datos vivos. */
  eurostat_source: 'live' | 'partial' | 'unavailable'
  nota: string
}

export interface ImpactoEconomicoResponse {
  ok: boolean
  data: ImpactoEconomicoData | null
  error?: string
  fetched_at: string
  source_url: string
}

const PUBLIC_URL = 'https://ec.europa.eu/eurostat'
const EUROSTAT_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'
const DEFAULT_TIMEOUT_MS = 15_000
const CACHE_TTL_MS = 12 * 3600_000

// ─────────────────────────────────────────────────────────────────────────
// Gasto público en turismo · curado + DATADO (PERTE + planes).
// Fuentes públicas: Plan de Recuperación (planderecuperacion.gob.es) y notas
// de prensa de La Moncloa / Mintur. Cifras de presupuesto comprometido.
// ─────────────────────────────────────────────────────────────────────────

export const GASTO_PUBLICO_PERTE: PerteProgram[] = [
  {
    programa: 'Plan de Modernización y Competitividad del Sector Turístico · Componente 14 (PSTD)',
    presupuesto_meur: 3_400,
    fuente: 'Plan de Recuperación · Componente 14 (Turismo) · Mintur',
    fecha: '2024',
  },
  {
    programa: 'Estrategia de Turismo Sostenible de España 2030 · transformación digital',
    presupuesto_meur: 337,
    fuente: 'Secretaría de Estado de Turismo · ETSE 2030',
    fecha: '2023',
  },
  {
    programa: 'Programa Experiencias Turismo España (mercados emisores)',
    presupuesto_meur: 60,
    fuente: 'Turespaña · Mintur',
    fecha: '2023',
  },
  {
    programa: 'Bono / actuaciones de digitalización pymes turísticas (Kit Digital sector)',
    presupuesto_meur: 200,
    fuente: 'Red.es · Plan de Recuperación',
    fecha: '2023',
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS (sin red) · testeables con fixtures de Eurostat JSON-stat
// ─────────────────────────────────────────────────────────────────────────

/**
 * Dado un JSON-stat de Eurostat, devuelve el último punto (por dimensión
 * temporal) con valor no nulo: { value, period }. Pura: testeable.
 * Usa `parseJsonStat` de macro-utils (no duplica el parser).
 */
export function latestEurostatPoint(json: any): { value: number | null; period: string | null } {
  const points = parseJsonStat(json).filter((p) => p.value != null)
  if (!points.length) return { value: null, period: null }
  const sorted = points.sort((a, b) => String(a.time ?? '').localeCompare(String(b.time ?? '')))
  const last = sorted[sorted.length - 1]
  return { value: typeof last.value === 'number' ? last.value : null, period: last.time ? String(last.time) : null }
}

/**
 * Ensambla la respuesta de impacto económico a partir de los dos puntos de
 * Eurostat (pib %, empleo) + el catálogo curado de gasto público. Pura.
 */
export function buildImpactoEconomico(
  pib: { value: number | null; period: string | null },
  empleo: { value: number | null; period: string | null },
  opts: { gasto: PerteProgram[]; nota: string },
): ImpactoEconomicoData {
  const okPib = pib.value != null
  const okEmpleo = empleo.value != null
  const src: ImpactoEconomicoData['eurostat_source'] =
    okPib && okEmpleo ? 'live' : okPib || okEmpleo ? 'partial' : 'unavailable'
  const total = opts.gasto.reduce((s, p) => s + (p.presupuesto_meur || 0), 0)
  return {
    pib_turistico_pct: pib.value != null ? Math.round(pib.value * 100) / 100 : null,
    pib_turistico_period: pib.period,
    empleo_horeca: empleo.value != null ? Math.round(empleo.value) : null,
    empleo_horeca_period: empleo.period,
    empleo_horeca_unit: 'miles de personas',
    gasto_publico_perte: opts.gasto,
    gasto_publico_total_meur: total,
    eurostat_source: src,
    nota: opts.nota,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria · TTL 12h
// ─────────────────────────────────────────────────────────────────────────

interface CacheEntry { expires: number; value: ImpactoEconomicoResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearImpactoCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch Eurostat · degradación silenciosa
// ─────────────────────────────────────────────────────────────────────────

/** Consulta un dataset Eurostat con filtros. Devuelve JSON o null. NUNCA lanza. */
async function eurostatFetch(
  code: string,
  filters: Record<string, string>,
  timeoutMs: number,
): Promise<any | null> {
  const qs = new URLSearchParams(filters)
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const r = await fetch(`${EUROSTAT_BASE}/${code}?${qs}`, {
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

// ─────────────────────────────────────────────────────────────────────────
// API pública (Eurostat + degradación por bloque)
// ─────────────────────────────────────────────────────────────────────────

export interface FetchImpactoOpts {
  noCache?: boolean
  timeoutMs?: number
}

/**
 * Devuelve el impacto económico del turismo: %PIB turístico (bop_its6_det),
 * empleo HORECA (lfsq_egan2 NACE I) y gasto público PERTE (curado). NUNCA lanza:
 * si Eurostat falla, los % quedan null y el bloque PERTE sigue presente.
 */
export async function fetchImpactoEconomico(
  opts: FetchImpactoOpts = {},
): Promise<ImpactoEconomicoResponse> {
  const fetched_at = new Date().toISOString()
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

  if (!opts.noCache) {
    const hit = _cache.get('impacto')
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  // bop_its6_det · bop_item=SC (Travel) · % PIB. unit=PC_GDP, stk_flow=CRE
  // (créditos = ingresos por turismo receptor), partner=WRL_REST.
  const [pibJson, empleoJson] = await Promise.all([
    eurostatFetch(
      'bop_its6_det',
      { geo: 'ES', bop_item: 'SC', unit: 'PC_GDP', stk_flow: 'CRE', partner: 'WRL_REST' },
      timeoutMs,
    ),
    // lfsq_egan2 · NACE I · ocupados (THS_PER, miles de personas), sexo total,
    // todas las edades, ESP.
    eurostatFetch(
      'lfsq_egan2',
      { geo: 'ES', nace_r2: 'I', unit: 'THS_PER', sex: 'T', age: 'Y_GE15' },
      timeoutMs,
    ),
  ])

  const pib = pibJson ? latestEurostatPoint(pibJson) : { value: null, period: null }
  const empleo = empleoJson ? latestEurostatPoint(empleoJson) : { value: null, period: null }

  const parts: string[] = []
  parts.push(
    pib.value != null
      ? `%PIB turístico de Eurostat bop_its6_det (${pib.period}).`
      : '%PIB turístico no disponible (Eurostat bop_its6_det falló).',
  )
  parts.push(
    empleo.value != null
      ? `Empleo HORECA de Eurostat lfsq_egan2 NACE I (${empleo.period}).`
      : 'Empleo HORECA no disponible (Eurostat lfsq_egan2 falló).',
  )
  parts.push('Gasto público PERTE/planes: curado + datado (sin API de ejecución).')

  const data = buildImpactoEconomico(pib, empleo, {
    gasto: GASTO_PUBLICO_PERTE,
    nota: parts.join(' '),
  })

  const result: ImpactoEconomicoResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
  _cache.set('impacto', { expires: Date.now() + CACHE_TTL_MS, value: result })
  return result
}
