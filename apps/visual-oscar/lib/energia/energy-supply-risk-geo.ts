/**
 * Riesgo geopolítico del aprovisionamiento energético · Sprint v3 · E2-cross
 *
 * Cruza el módulo GEOPOLÍTICA (riesgo país) con la dependencia energética de
 * España: mapea cada país proveedor de crudo (CORES) y de GNL (Enagás/CORES) a
 * un score de riesgo país y lo pondera por su cuota de importación. Devuelve un
 * riesgo ponderado del petróleo y otro del gas, más el desglose por país.
 *
 * ── FUENTES (import directo de los datasets seed geopolítica, SIN red) ──────
 *   - `lib/geopolitica/geo-risk-engine.ts` → `buildCountryRiskProfile()` para
 *     un perfil multidimensional por país (estructural UCDP, eventos ACLED,
 *     sanciones, etc.). Aquí lo alimentamos SOLO con las dimensiones que
 *     tenemos como dataset seed sin red (V-Dem + sanciones conocidas), por lo
 *     que ACLED/UCDP/ReliefWeb quedan `available:false` (degradación honesta).
 *   - `lib/geopolitica/vdem-data.ts` → `vdemRiskComponent(iso3)` (0-100, a más
 *     autocracia más riesgo) y `getVdemEntry()` para categoría/tendencia. Es el
 *     componente estructural principal disponible offline.
 *   - `lib/geopolitica/country-coords.ts` → `getCountryCoord()` / `iso2ToIso3()`
 *     para resolver nombre español ↔ ISO3 y lat/lon (mapa).
 *
 *   Las CUOTAS de importación se LEEN (solo lectura) del catálogo:
 *   `PETROLEO_DEPENDENCIA_ES.origenes` y `GNL_ESPANA.origenes` de
 *   `lib/energia/catalog.ts`. No se edita catalog.ts.
 *
 * Funciones PURAS exportadas (testables sin red):
 *   - `paisToIso3(nombre)`               · normaliza nombre ES de proveedor → ISO3.
 *   - `countryRiskScore(iso3, fallback)` · score 0-100 desde V-Dem (+ baseline).
 *   - `weightedRisk(items)`              · media ponderada por cuota (excluye "Resto").
 *   - `buildSupplyRisk(petroleo, gas)`   · ensambla el shape final.
 *
 * Degradación honesta (CLAUDE.md): nunca lanza; HTTP 200 aun degradado.
 */
import {
  PETROLEO_DEPENDENCIA_ES,
  GNL_ESPANA,
} from './catalog.ts'
import {
  getVdemEntry,
  vdemRiskComponent,
} from '../geopolitica/vdem-data.ts'
import {
  getCountryCoord,
  isoToName,
} from '../geopolitica/country-coords.ts'
import {
  buildCountryRiskProfile,
  type GeoCountryRiskProfile,
} from '../geopolitica/geo-risk-engine.ts'

// ─────────────────────────────────────────────────────────────────────────
// Tipos propios (NO se editan types.ts ni catalog.ts)
// ─────────────────────────────────────────────────────────────────────────

/** Componentes del score de riesgo de un país proveedor. */
export interface SupplyRiskComponents {
  /** Riesgo estructural V-Dem (0-100, a más autocracia más riesgo). */
  vdem: number | null
  /** Categoría V-Dem (autocracia_cerrada … democracia_liberal). */
  vdem_categoria: string | null
  /** Tendencia 5y de la calidad democrática. */
  vdem_tendencia: string | null
  /** Nº de programas de sanciones conocidos (seed, ver SANCTIONED_SUPPLIERS). */
  sanciones_programas: number
  /** Urgencia para España del perfil multidimensional (0-100). */
  urgency_for_spain: number | null
}

/** Riesgo de un país proveedor con su cuota de importación. */
export interface SupplyRiskCountry {
  pais: string
  iso: string | null
  lat: number | null
  lon: number | null
  cuota_pct: number
  /** Score de riesgo país 0-100 combinado. */
  riesgo: number | null
  /** Banda cualitativa derivada del score. */
  riesgo_banda: 'bajo' | 'medio' | 'alto' | 'critico' | 'desconocido'
  componentes: SupplyRiskComponents
}

export interface SupplyRiskByVector {
  /** Etiqueta del vector (petroleo|gnl). */
  vector: 'petroleo' | 'gnl'
  /** Países con su riesgo + cuota, orden desc por exposición (cuota×riesgo). */
  por_pais: SupplyRiskCountry[]
  /** Riesgo ponderado por cuota (0-100), excluyendo "Resto". */
  riesgo_ponderado: number | null
  /** Cuota total cubierta por países identificados (sin "Resto"). */
  cuota_identificada_pct: number
  /** Fuente curada del desglose de cuotas. */
  fuente: string
  fuente_url: string
}

export interface EnergySupplyRiskGeo {
  petroleo: SupplyRiskByVector
  gas: SupplyRiskByVector
  /** Acceso plano para la UI: riesgo ponderado de cada vector. */
  riesgo_ponderado_petroleo: number | null
  riesgo_ponderado_gas: number | null
  nota: string
}

export interface EnergySupplyRiskGeoResponse {
  ok: boolean
  data: EnergySupplyRiskGeo | null
  error?: string
  fetched_at: string
  source: string
}

// ─────────────────────────────────────────────────────────────────────────
// Normalización nombre proveedor (catálogo, en español) → ISO3
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mapa nombre-en-catálogo → ISO3. Los catálogos de energía usan nombres en
 * español ("México", "Arabia Saudí", "Rusia (GNL)"…). Cubrimos exactamente los
 * orígenes presentes en PETROLEO_DEPENDENCIA_ES + GNL_ESPANA + los proveedores
 * mencionados en el sprint (Rusia, Argelia, Nigeria, EEUU, Catar, Arabia Saudí,
 * México, Libia, Irak, Noruega).
 */
const SUPPLIER_NAME_TO_ISO3: Record<string, string> = {
  // Petróleo (CORES)
  'mexico': 'MEX',
  'estados unidos': 'USA',
  'nigeria': 'NGA',
  'brasil': 'BRA',
  'arabia saudi': 'SAU',
  'libia': 'LBY',
  'angola': 'AGO',
  'kazajistan': 'KAZ',
  'irak': 'IRQ',
  // GNL (Enagás/CORES)
  'argelia': 'DZA',
  'rusia': 'RUS',
  'rusia (gnl)': 'RUS',
  'qatar': 'QAT',
  'catar': 'QAT',
  'trinidad y tobago': 'TTO',
  // Otros proveedores citados en el sprint
  'noruega': 'NOR',
}

/** Quita acentos y normaliza a minúsculas. Pura. */
// Rango U+0300–U+036F = "Combining Diacritical Marks" (los acentos que NFD
// separa de su letra base). Lo construimos con escapes \u para no dejar
// caracteres combinantes invisibles en el código fuente.
const COMBINING_MARKS = /[̀-ͯ]/g
function deburr(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .trim()
}

/**
 * Resuelve el ISO3 de un país proveedor por su nombre de catálogo. Devuelve
 * null para agregados como "Resto". Pura.
 */
export function paisToIso3(nombre: string): string | null {
  const key = deburr(nombre)
  if (!key || key === 'resto' || key === 'otros') return null
  return SUPPLIER_NAME_TO_ISO3[key] ?? null
}

// ─────────────────────────────────────────────────────────────────────────
// Sanciones conocidas (seed mínimo · sin red)
// ─────────────────────────────────────────────────────────────────────────
// El backend OpenSanctions/feeds no corre aquí; usamos un seed curado del nº de
// regímenes de sanciones internacionales relevantes por país proveedor para
// alimentar la dimensión `sanctions` del perfil. Marcado como seed en `source`.
const SANCTIONED_SUPPLIERS: Record<string, { active_programs: number; sources: string[] }> = {
  RUS: { active_programs: 5, sources: ['EU', 'OFAC', 'UK'] }, // embargo crudo/GNL parcial 2022+
  IRN: { active_programs: 5, sources: ['OFAC', 'EU', 'UN'] },
  LBY: { active_programs: 1, sources: ['UN'] }, // embargo armas; crudo no
}

// ─────────────────────────────────────────────────────────────────────────
// Score de riesgo país
// ─────────────────────────────────────────────────────────────────────────

/** Banda cualitativa desde un score 0-100. Pura. */
export function riskBand(
  score: number | null,
): SupplyRiskCountry['riesgo_banda'] {
  if (score == null || !Number.isFinite(score)) return 'desconocido'
  if (score >= 75) return 'critico'
  if (score >= 55) return 'alto'
  if (score >= 35) return 'medio'
  return 'bajo'
}

/**
 * Score de riesgo país 0-100 desde V-Dem (componente estructural principal
 * disponible offline). Si no hay dato V-Dem devuelve `fallback` (default 50,
 * neutral). Pura.
 */
export function countryRiskScore(iso3: string | null, fallback = 50): number {
  if (!iso3) return fallback
  // vdemRiskComponent ya devuelve 50 (neutral) si no hay datos; respetamos eso
  // pero permitimos un fallback explícito distinto si se quisiera.
  const entry = getVdemEntry(iso3)
  if (!entry) return fallback
  return vdemRiskComponent(iso3)
}

/**
 * Media ponderada de riesgo por cuota de importación. Excluye items con
 * `iso === null` (agregado "Resto") y normaliza por la suma de cuotas
 * identificadas. Devuelve null si no hay base. Pura.
 */
export function weightedRisk(
  items: ReadonlyArray<{ iso: string | null; cuota_pct: number; riesgo: number | null }>,
): number | null {
  let num = 0
  let den = 0
  for (const it of items) {
    if (it.iso == null) continue // "Resto" no pondera
    if (it.riesgo == null || !Number.isFinite(it.riesgo)) continue
    const w = Number.isFinite(it.cuota_pct) ? it.cuota_pct : 0
    if (w <= 0) continue
    num += it.riesgo * w
    den += w
  }
  if (den <= 0) return null
  return Math.round((num / den) * 10) / 10
}

// ─────────────────────────────────────────────────────────────────────────
// Ensamblado PURO (testeable)
// ─────────────────────────────────────────────────────────────────────────

interface OrigenCuota {
  pais: string
  cuota_pct: number
}

/** Construye el bloque de un vector (petróleo o gas) desde sus orígenes. Pura. */
function buildVector(
  vector: 'petroleo' | 'gnl',
  origenes: ReadonlyArray<OrigenCuota>,
  fuente: string,
  fuente_url: string,
): SupplyRiskByVector {
  const por_pais: SupplyRiskCountry[] = origenes.map((o) => {
    const iso = paisToIso3(o.pais)
    const vdem = iso ? (getVdemEntry(iso) ? vdemRiskComponent(iso) : null) : null
    const vEntry = iso ? getVdemEntry(iso) : null
    const sanc = iso ? SANCTIONED_SUPPLIERS[iso] : undefined

    // Perfil multidimensional (solo con dimensiones offline disponibles).
    let profile: GeoCountryRiskProfile | null = null
    if (iso) {
      const coord = getCountryCoord(iso)
      profile = buildCountryRiskProfile({
        iso3: iso,
        country: coord?.name_es ?? isoToName(iso),
        region: coord?.region,
        // Estructural: derivamos un proxy desde V-Dem (autocracia → intensidad).
        // V-Dem no es UCDP; usamos solo sanciones como dimensión "dura" extra.
        sanctions: sanc,
      })
    }

    // Score combinado: V-Dem como base; si hay sanciones, elevamos el suelo.
    let riesgo: number | null = vdem
    if (sanc && sanc.active_programs > 0) {
      const sancScore = Math.min(100, 40 + sanc.active_programs * 10)
      riesgo = riesgo == null ? sancScore : Math.max(riesgo, sancScore)
    }

    const coord = iso ? getCountryCoord(iso) : null
    return {
      pais: o.pais,
      iso,
      lat: coord?.lat ?? null,
      lon: coord?.lon ?? null,
      cuota_pct: o.cuota_pct,
      riesgo,
      riesgo_banda: riskBand(riesgo),
      componentes: {
        vdem,
        vdem_categoria: vEntry?.category ?? null,
        vdem_tendencia: vEntry?.trend_5y ?? null,
        sanciones_programas: sanc?.active_programs ?? 0,
        urgency_for_spain: profile?.urgency_for_spain ?? null,
      },
    }
  })

  // Orden por EXPOSICIÓN (cuota × riesgo), mayor primero; "Resto" al final.
  const sorted = [...por_pais].sort((a, b) => {
    if (a.iso == null && b.iso != null) return 1
    if (b.iso == null && a.iso != null) return -1
    const ea = (a.riesgo ?? 0) * a.cuota_pct
    const eb = (b.riesgo ?? 0) * b.cuota_pct
    return eb - ea
  })

  const riesgo_ponderado = weightedRisk(
    sorted.map((p) => ({ iso: p.iso, cuota_pct: p.cuota_pct, riesgo: p.riesgo })),
  )
  const cuota_identificada_pct = Math.round(
    sorted
      .filter((p) => p.iso != null)
      .reduce((s, p) => s + (Number.isFinite(p.cuota_pct) ? p.cuota_pct : 0), 0) * 10,
  ) / 10

  return {
    vector,
    por_pais: sorted,
    riesgo_ponderado,
    cuota_identificada_pct,
    fuente,
    fuente_url,
  }
}

/**
 * Ensambla el shape final desde los dos catálogos de dependencia. Pura (lee
 * los catálogos importados; no hace red). Testeable.
 */
export function buildSupplyRisk(
  petroleo: typeof PETROLEO_DEPENDENCIA_ES = PETROLEO_DEPENDENCIA_ES,
  gas: typeof GNL_ESPANA = GNL_ESPANA,
): EnergySupplyRiskGeo {
  const pet = buildVector(
    'petroleo',
    petroleo.origenes,
    petroleo.fuente,
    petroleo.fuente_url,
  )
  const gnl = buildVector('gnl', gas.origenes, gas.fuente, gas.fuente_url)

  return {
    petroleo: pet,
    gas: gnl,
    riesgo_ponderado_petroleo: pet.riesgo_ponderado,
    riesgo_ponderado_gas: gnl.riesgo_ponderado,
    nota:
      'Riesgo país ponderado por cuota de importación. Componente principal: V-Dem ' +
      '(calidad democrática invertida) + sanciones conocidas (seed). ACLED/UCDP en vivo ' +
      'requieren el backend de geopolítica, que no corre en este endpoint → el score es ' +
      'estructural, no de eventos recientes. Las cuotas son orden de magnitud (varían mes a mes).',
  }
}

// ─────────────────────────────────────────────────────────────────────────
// API pública (sin red · solo datasets seed + catálogo)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Devuelve el riesgo geopolítico del aprovisionamiento energético de España.
 * No hace red (todo es seed/catálogo). Nunca lanza.
 */
export async function fetchEnergySupplyRiskGeo(): Promise<EnergySupplyRiskGeoResponse> {
  const fetched_at = new Date().toISOString()
  try {
    const data = buildSupplyRisk()
    return {
      ok: true,
      data,
      fetched_at,
      source:
        'geopolitica seeds (V-Dem v15 + country-coords + geo-risk-engine) · sanciones seed · ' +
        'cuotas import: PETROLEO_DEPENDENCIA_ES (CORES) + GNL_ESPANA.origenes (Enagás/CORES)',
    }
  } catch (e: any) {
    return {
      ok: false,
      data: null,
      error: String(e?.message ?? e).slice(0, 160),
      fetched_at,
      source: 'geopolitica seeds + catalog cuotas',
    }
  }
}
