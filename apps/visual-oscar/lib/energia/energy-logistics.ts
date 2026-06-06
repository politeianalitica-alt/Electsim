/**
 * Logística energética · Sprint Energía v3 · E2-cross
 *
 * Cruza el módulo PUERTOS con el sector Energía para un panel "Logística
 * energética": los chokepoints marítimos por los que transita el crudo y el
 * GNL que importa España, el termómetro de fletes (Baltic Dry Index) y un
 * conteo de los buques energéticos relevantes (petroleros + metaneros) del
 * catálogo de Puertos.
 *
 * ── FUENTE (import directo server-side, SIN BACKEND_URL) ───────────────────
 *   `lib/ports-handlers.ts` es un módulo standalone (sirve datos sin backend
 *   Python). Lo importamos DIRECTAMENTE y llamamos a sus handlers:
 *     - `chokepointsList(params)`  → corredores marítimos + risk_score/level
 *       (score base curado + boost determinista; ACLED real solo con
 *       ACLED_API_KEY en el backend Python, que aquí no corre → el risk_score
 *       es seed+heurístico, marcado como tal en `source`).
 *     - `freightSnapshot()`        → Baltic Dry Index y subíndices (último
 *       nivel + change_pct + signal). Sin yfinance real el precio es
 *       determinista por hash (marcado `synthetic` en su data_quality).
 *     - `catalogVessels(params)`   → buques del seed por tipo (tanker/lng).
 *
 *   Estos handlers NO hacen red para chokepoints/freight/vessels (son seed +
 *   hash determinista), así que el endpoint responde rápido y nunca depende de
 *   un backend desplegado. `source` refleja honestamente que el risk_score y
 *   el BDI son seed/heurísticos, no live.
 *
 * Funciones PURAS exportadas (testables sin red):
 *   - `freightTrend(changePct)`        · mapea variación → tendencia legible.
 *   - `isEnergyChokepoint(slug)`       · ¿el corredor es relevante a energía?
 *   - `buildEnergyLogistics(raw)`      · ensambla el shape final desde los
 *                                        outputs crudos de ports-handlers.
 *
 * Degradación honesta (CLAUDE.md): nunca lanza; ante cualquier fallo devuelve
 * `{ ok:false, error, fetched_at, source }` con HTTP 200 en la route.
 *
 * NOTA · `ports-handlers` se importa de forma DINÁMICA dentro de
 * `fetchEnergyLogistics()` (no a nivel de módulo). Razón: ese módulo hace
 * `import ... from './ports-seed'` SIN extensión, y el harness de tests Node
 * (`--experimental-strip-types`) exige extensiones explícitas en imports de
 * VALOR; un import estático rompería la carga del archivo en los tests de las
 * funciones puras (freightTrend/isEnergyChokepoint/buildEnergyLogistics). El
 * bundler de Next.js resuelve el import dinámico con normalidad.
 */

// ─────────────────────────────────────────────────────────────────────────
// Tipos propios (NO se editan types.ts ni catalog.ts)
// ─────────────────────────────────────────────────────────────────────────

/** Tendencia cualitativa del flete a partir de su variación %. */
export type FreightTrend =
  | 'fuerte_subida'
  | 'subida'
  | 'estable'
  | 'bajada'
  | 'fuerte_bajada'

/** Un chokepoint relevante a energía con su riesgo y eventos recientes. */
export interface EnergyChokepoint {
  slug: string
  name: string
  region: string
  /** % aproximado del comercio marítimo mundial por el corredor. */
  traffic_volume_pct: number | null
  /** Score 0-100 (seed curado + boost; ACLED real requiere backend). */
  risk_score: number | null
  /** Banda cualitativa: minimo|bajo|medio|alto|critico. */
  risk_level: string | null
  /** Nº de eventos en la ventana (heurístico sin ACLED real). */
  n_events_30d: number | null
  /** Disrupciones típicas curadas (Houthis, sequía Panamá, etc.). */
  typical_disruptions: string[]
  /** Por qué es relevante para la energía que importa España. */
  energia_nota: string
}

/** Termómetro de fletes (Baltic Dry Index + variación). */
export interface FreightSnapshotLite {
  bdi: number | null
  change_pct: number | null
  trend: FreightTrend
  /** Índice/nombre legible de la referencia. */
  name: string | null
  /** Subíndices tanker (dirty/clean) si están disponibles. */
  tanker_indices: Array<{ slug: string; name: string; last: number | null; change_pct: number | null }>
}

/** Conteo de buques energéticos del catálogo Puertos. */
export interface EnergyVesselCounts {
  tankers: number
  lng: number
  /** Muestra (hasta 8) para la UI · imo+nombre+subtipo. */
  sample: Array<{ imo: string; name: string; type: string; subtype?: string; dwt?: number }>
  source_note: string
}

export interface EnergyLogistics {
  chokepoints: EnergyChokepoint[]
  freight: FreightSnapshotLite
  tankers: EnergyVesselCounts
}

export interface EnergyLogisticsResponse {
  ok: boolean
  data: EnergyLogistics | null
  error?: string
  fetched_at: string
  /** Procedencia honesta de cada bloque (seed/heurístico, no live). */
  source: string
}

// ─────────────────────────────────────────────────────────────────────────
// Chokepoints relevantes a energía
// ─────────────────────────────────────────────────────────────────────────

/**
 * Corredores marítimos por los que pasa el crudo/GNL que importa España.
 * Mapea el `slug` del seed de Puertos (`CHOKEPOINTS_SEED`) → nota energética.
 * Ormuz (golfo Pérsico), Suez + Bab-el-Mandeb (Mar Rojo, ruta Asia-Europa) y
 * el Bósforo (crudo ruso/Mar Negro post-sanciones) son los relevantes para los
 * flujos atlánticos y mediterráneos hacia las refinerías y plantas de
 * regasificación españolas.
 */
const ENERGY_CHOKEPOINT_NOTES: Record<string, string> = {
  ormuz:
    'Salida del golfo Pérsico: ~20% del petróleo marítimo mundial y gran parte del GNL de Qatar. ' +
    'Sin ruta alternativa real; su cierre dispararía Brent y la prima de riesgo del crudo de Oriente Medio.',
  suez:
    'Canal de Suez: ruta corta Asia-Europa para crudo, productos y GNL. Un bloqueo (p. ej. Ever Given 2021) ' +
    'obliga a rodear el Cabo de Buena Esperanza (+10-14 días), encareciendo fletes hacia España.',
  bab_el_mandeb:
    'Estrecho de Bab-el-Mandeb / Mar Rojo: acceso sur a Suez. Los ataques houthis (2023-25) re-rutaron buques ' +
    'al Cabo, alargando los tránsitos de crudo y GNL hacia el Mediterráneo y subiendo el coste del flete.',
  bosporus:
    'Estrecho del Bósforo: salida del crudo del Mar Negro (incl. tráfico ruso post-sanciones UE). ' +
    'Congestiones e inspecciones afectan a la oferta de crudo que llega al Mediterráneo.',
}

/** ¿El corredor (por slug del seed Puertos) es relevante para energía? Pura. */
export function isEnergyChokepoint(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(
    ENERGY_CHOKEPOINT_NOTES,
    String(slug || '').toLowerCase(),
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Fletes
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mapea una variación porcentual a una tendencia legible. Pura.
 * Umbrales alineados con `freightSnapshot()` de ports-handlers (±1 / ±4).
 */
export function freightTrend(changePct: number | null | undefined): FreightTrend {
  if (changePct == null || !Number.isFinite(changePct)) return 'estable'
  if (changePct >= 4) return 'fuerte_subida'
  if (changePct >= 1) return 'subida'
  if (changePct <= -4) return 'fuerte_bajada'
  if (changePct <= -1) return 'bajada'
  return 'estable'
}

// ─────────────────────────────────────────────────────────────────────────
// Ensamblado PURO (testeable con fixtures de los outputs de ports-handlers)
// ─────────────────────────────────────────────────────────────────────────

/** Outputs crudos de los 3 handlers de Puertos (subset que usamos). */
export interface EnergyLogisticsRaw {
  chokepoints?: { items?: any[] } | null
  freight?: { items?: any[] } | null
  tankers?: { items?: any[] } | null
  lng?: { items?: any[] } | null
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

/**
 * Ensambla el `EnergyLogistics` a partir de los outputs crudos de
 * ports-handlers. Pura: no hace red, testeable con fixtures.
 */
export function buildEnergyLogistics(raw: EnergyLogisticsRaw): EnergyLogistics {
  // ── Chokepoints relevantes a energía ──────────────────────────────────
  const ckItems = Array.isArray(raw.chokepoints?.items) ? raw.chokepoints!.items! : []
  const chokepoints: EnergyChokepoint[] = ckItems
    .filter((c) => isEnergyChokepoint(c?.slug))
    .map((c) => ({
      slug: String(c.slug),
      name: String(c.name ?? c.slug),
      region: String(c.region ?? ''),
      traffic_volume_pct: num(c.traffic_volume_pct),
      risk_score: num(c.risk_score),
      risk_level: typeof c.risk_level === 'string' ? c.risk_level : null,
      n_events_30d: num(c.n_events_30d),
      typical_disruptions: Array.isArray(c.typical_disruptions)
        ? c.typical_disruptions.map((x: unknown) => String(x))
        : [],
      energia_nota: ENERGY_CHOKEPOINT_NOTES[String(c.slug).toLowerCase()] ?? '',
    }))
    // Más riesgo primero.
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))

  // ── Fletes · Baltic Dry Index + subíndices tanker ─────────────────────
  const frItems = Array.isArray(raw.freight?.items) ? raw.freight!.items! : []
  const bdiRow = frItems.find((f) => f?.slug === 'baltic_dry') ?? null
  const tankerRows = frItems.filter((f) =>
    f?.category === 'freight_tanker' ||
    String(f?.slug ?? '').includes('tanker'),
  )
  const freight: FreightSnapshotLite = {
    bdi: num(bdiRow?.last_price),
    change_pct: num(bdiRow?.change_pct),
    trend: freightTrend(num(bdiRow?.change_pct)),
    name: typeof bdiRow?.name === 'string' ? bdiRow.name : null,
    tanker_indices: tankerRows.map((t) => ({
      slug: String(t.slug),
      name: String(t.name ?? t.slug),
      last: num(t.last_price),
      change_pct: num(t.change_pct),
    })),
  }

  // ── Buques energéticos (petroleros + metaneros del seed Puertos) ──────
  const tankerVessels = Array.isArray(raw.tankers?.items) ? raw.tankers!.items! : []
  const lngVessels = Array.isArray(raw.lng?.items) ? raw.lng!.items! : []
  const sample = [...tankerVessels, ...lngVessels]
    .slice(0, 8)
    .map((v) => ({
      imo: String(v.imo ?? ''),
      name: String(v.name ?? ''),
      type: String(v.type ?? ''),
      subtype: typeof v.subtype === 'string' ? v.subtype : undefined,
      dwt: num(v.dwt) ?? undefined,
    }))
  const tankers: EnergyVesselCounts = {
    tankers: tankerVessels.length,
    lng: lngVessels.length,
    sample,
    source_note:
      'Conteo del catálogo curado de buques (Puertos · VESSELS_SEED), no posiciones AIS en vivo.',
  }

  return { chokepoints, freight, tankers }
}

// ─────────────────────────────────────────────────────────────────────────
// API pública (con red vía ports-handlers, que aquí es seed/heurístico)
// ─────────────────────────────────────────────────────────────────────────

export interface FetchEnergyLogisticsOpts {
  /** Ventana de días para chokepoints (heurístico). Default 30. */
  days?: number
}

/**
 * Construye el panel de logística energética llamando a los handlers
 * standalone de Puertos. Nunca lanza: ante fallo devuelve `{ ok:false }`.
 */
export async function fetchEnergyLogistics(
  opts: FetchEnergyLogisticsOpts = {},
): Promise<EnergyLogisticsResponse> {
  const fetched_at = new Date().toISOString()
  const days = Number.isFinite(opts.days as number)
    ? Math.max(7, Math.min(90, opts.days as number))
    : 30
  try {
    // Import dinámico (ver nota en la cabecera del módulo): mantiene los tests
    // de las funciones puras cargables bajo --experimental-strip-types.
    const { chokepointsList, freightSnapshot, catalogVessels } = await import(
      '../ports-handlers.ts'
    )

    const ckParams = new URLSearchParams({ days: String(days) })
    const tankerParams = new URLSearchParams({ type_: 'tanker' })
    const lngParams = new URLSearchParams({ type_: 'lng' })

    // Estos handlers son síncronos (seed + hash), pero los envolvemos por si
    // alguno evolucionara a async; Promise.resolve los normaliza.
    const [chokepoints, freight, tankers, lng] = await Promise.all([
      Promise.resolve(chokepointsList(ckParams)),
      Promise.resolve(freightSnapshot()),
      Promise.resolve(catalogVessels(tankerParams)),
      Promise.resolve(catalogVessels(lngParams)),
    ])

    const data = buildEnergyLogistics({ chokepoints, freight, tankers, lng })
    return {
      ok: true,
      data,
      fetched_at,
      source:
        'ports-handlers (standalone) · chokepoints seed+heurístico (ACLED real requiere backend) · ' +
        'BDI freightSnapshot (hash determinista sin yfinance) · vessels VESSELS_SEED',
    }
  } catch (e: any) {
    return {
      ok: false,
      data: null,
      error: String(e?.message ?? e).slice(0, 160),
      fetched_at,
      source: 'ports-handlers (standalone)',
    }
  }
}
