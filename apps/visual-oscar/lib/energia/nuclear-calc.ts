/**
 * Cálculos puros de la vista Nuclear · Sprint Energía S6.
 *
 * Extraídos de los componentes (`NuclearView`, `ReactorFleet`) para que la
 * lógica de agregación del parque nuclear sea testeable sin montar React ni
 * hacer fetch. Sin dependencias de runtime (usable en componentes cliente y en
 * tests Node con `--experimental-strip-types`).
 *
 * Conceptos:
 *   - Potencia instalada total: suma de la potencia eléctrica neta (MW) de los
 *     reactores en estado "operativo".
 *   - Nº operativos: cuenta de reactores con estado === 'operativo'.
 *   - Factor de carga del parque: generación media observada (ESIOS, MW) sobre
 *     la potencia instalada operativa (MW). Adimensional [0,1].
 *   - Calendario de cierre: reactores ordenados por `cierre_previsto` asc,
 *     agrupados por año (varios grupos cierran el mismo año).
 */

import type { Reactor } from './types'

/** Resumen agregado del parque nuclear. */
export interface FleetSummary {
  /** Nº de reactores en estado operativo. */
  operativos: number
  /** Nº total de reactores del catálogo (incluye parados/cerrados). */
  total: number
  /** Potencia instalada total de los reactores operativos (MW). */
  potencia_operativa_mw: number
  /** Potencia instalada total de todos los reactores del catálogo (MW). */
  potencia_total_mw: number
}

/**
 * Resume el parque: nº operativos y potencia instalada (operativa y total).
 * Nunca lanza; tolera un array vacío (devuelve ceros).
 */
export function summarizeFleet(reactores: Reactor[]): FleetSummary {
  let operativos = 0
  let potencia_operativa_mw = 0
  let potencia_total_mw = 0
  for (const r of reactores) {
    const mw = typeof r?.potencia_mw === 'number' && Number.isFinite(r.potencia_mw) ? r.potencia_mw : 0
    potencia_total_mw += mw
    if (r?.estado === 'operativo') {
      operativos += 1
      potencia_operativa_mw += mw
    }
  }
  return {
    operativos,
    total: reactores.length,
    potencia_operativa_mw,
    potencia_total_mw,
  }
}

/**
 * Factor de carga del parque = generación media (MW) / potencia instalada (MW).
 * Devuelve null si los datos no permiten un cálculo válido (potencia ≤ 0,
 * valores no finitos, generación negativa). Clamp a [0,1] · redondeo a 1
 * decimal en el porcentaje. Mismo criterio que `renovables-calc.computeLoadFactor`.
 */
export function fleetLoadFactor(
  genMediaMw: number | null | undefined,
  potenciaInstaladaMw: number | null | undefined,
): { factor: number | null; factor_pct: number | null } {
  const gen = typeof genMediaMw === 'number' && Number.isFinite(genMediaMw) ? genMediaMw : NaN
  const cap = typeof potenciaInstaladaMw === 'number' && Number.isFinite(potenciaInstaladaMw) ? potenciaInstaladaMw : NaN
  if (!Number.isFinite(gen) || !Number.isFinite(cap) || cap <= 0 || gen < 0) {
    return { factor: null, factor_pct: null }
  }
  const clamped = Math.min(1, Math.max(0, gen / cap))
  return { factor: clamped, factor_pct: Math.round(clamped * 1000) / 10 }
}

/** Un año del calendario de cierre con los reactores que cesan ese año. */
export interface ClosureYear {
  /** Año de cierre previsto. */
  year: number
  /** Reactores que cierran ese año (orden de catálogo). */
  reactores: Reactor[]
  /** Potencia que sale del sistema ese año (MW). */
  potencia_mw: number
}

/**
 * Construye el calendario de cierre: agrupa los reactores por
 * `cierre_previsto`, ordenado por año ascendente. Cada grupo incluye la
 * potencia agregada que abandona el sistema ese año. Nunca lanza.
 */
export function buildClosureSchedule(reactores: Reactor[]): ClosureYear[] {
  const byYear = new Map<number, ClosureYear>()
  for (const r of reactores) {
    const y = typeof r?.cierre_previsto === 'number' && Number.isFinite(r.cierre_previsto) ? r.cierre_previsto : null
    if (y === null) continue
    const mw = typeof r?.potencia_mw === 'number' && Number.isFinite(r.potencia_mw) ? r.potencia_mw : 0
    const entry = byYear.get(y) ?? { year: y, reactores: [], potencia_mw: 0 }
    entry.reactores.push(r)
    entry.potencia_mw += mw
    byYear.set(y, entry)
  }
  return Array.from(byYear.values()).sort((a, b) => a.year - b.year)
}
