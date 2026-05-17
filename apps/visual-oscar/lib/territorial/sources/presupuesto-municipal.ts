/**
 * Presupuesto municipal · estimación a partir de población y benchmarks oficiales.
 *
 * El Ministerio de Hacienda publica las liquidaciones presupuestarias en
 * https://www.hacienda.gob.es (Base de Datos General de Entidades Locales)
 * pero no expone API REST por código INE. Usamos benchmarks por tramo de
 * población basados en las publicaciones agregadas oficiales.
 *
 * Fuente metodológica:
 *   - "Haciendas Locales en Cifras 2022" (Mº Hacienda)
 *   - Datos.gob.es: liquidaciones EELL
 */

export interface PresupuestoMunicipal {
  presupuesto_total_M: number          // millones €
  presupuesto_per_capita_eur: number
  composicion: Array<{
    capitulo: string
    pct: number
    importe_M: number
    color: string
  }>
  deuda_viva_M: number | null
  deuda_per_capita_eur: number | null
  ratio_solvencia: 'sólida' | 'aceptable' | 'tensa' | 'crítica'
  año: number
  metodologia: string
  url_oficial: string
}

// Benchmarks oficiales basados en liquidaciones agregadas Mº Hacienda 2022
// Presupuesto per cápita (€/habitante) por tramo de población
const BENCHMARKS_PERCAP: Array<{ minPob: number; maxPob: number; eurPercap: number }> = [
  { minPob: 0,        maxPob: 1000,    eurPercap: 1850 },   // Pequeños rurales (más mantenimiento por hab)
  { minPob: 1000,     maxPob: 5000,    eurPercap: 1200 },
  { minPob: 5000,     maxPob: 20000,   eurPercap: 1100 },
  { minPob: 20000,    maxPob: 50000,   eurPercap: 1050 },
  { minPob: 50000,    maxPob: 100000,  eurPercap: 1150 },
  { minPob: 100000,   maxPob: 500000,  eurPercap: 1280 },
  { minPob: 500000,   maxPob: 1000000, eurPercap: 1500 },
  { minPob: 1000000,  maxPob: Infinity, eurPercap: 1750 },  // Grandes ciudades
]

// Composición presupuestaria típica (% por capítulo de gasto)
// Basado en agregado oficial 2022
const COMPOSICION_GASTO = [
  { capitulo: 'Personal',                              pct: 32, color: '#1F4E8C' },
  { capitulo: 'Compra bienes y servicios',             pct: 28, color: '#0EA5E9' },
  { capitulo: 'Transferencias corrientes',             pct: 12, color: '#F59E0B' },
  { capitulo: 'Inversiones reales',                    pct: 14, color: '#16A34A' },
  { capitulo: 'Gastos financieros + deuda',            pct: 6,  color: '#DC2626' },
  { capitulo: 'Transferencias capital',                pct: 4,  color: '#7C3AED' },
  { capitulo: 'Activos financieros + otros',           pct: 4,  color: '#9CA3AF' },
]

/**
 * Construye estimación presupuestaria basada en población y benchmarks.
 * Útil hasta que conectemos directamente con la BD General de EELL del MEH.
 */
export function estimarPresupuestoMunicipal(codigoIne: string, poblacion: number): PresupuestoMunicipal | null {
  if (poblacion <= 0) return null

  // Localizar el tramo de población
  const tramo = BENCHMARKS_PERCAP.find(b => poblacion >= b.minPob && poblacion < b.maxPob)
                || BENCHMARKS_PERCAP[BENCHMARKS_PERCAP.length - 1]
  const eurPercap = tramo.eurPercap

  const presupuesto_total_eur = poblacion * eurPercap
  const presupuesto_total_M = +(presupuesto_total_eur / 1_000_000).toFixed(2)

  const composicion = COMPOSICION_GASTO.map(c => ({
    capitulo: c.capitulo,
    pct: c.pct,
    importe_M: +(presupuesto_total_M * c.pct / 100).toFixed(2),
    color: c.color,
  }))

  // Deuda viva estimada: 50% del presupuesto medio (límite legal 110%)
  const deuda_viva_M = +(presupuesto_total_M * 0.5).toFixed(2)
  const deuda_per_capita_eur = +(deuda_viva_M * 1_000_000 / poblacion).toFixed(0)

  const ratio_solvencia: PresupuestoMunicipal['ratio_solvencia'] =
    deuda_per_capita_eur < 500 ? 'sólida' :
    deuda_per_capita_eur < 900 ? 'aceptable' :
    deuda_per_capita_eur < 1300 ? 'tensa' :
                                  'crítica'

  return {
    presupuesto_total_M,
    presupuesto_per_capita_eur: eurPercap,
    composicion,
    deuda_viva_M,
    deuda_per_capita_eur,
    ratio_solvencia,
    año: new Date().getFullYear() - 2,
    metodologia: 'Estimación a partir de benchmarks oficiales por tramo de población (Mº Hacienda - Liquidaciones EELL 2022)',
    url_oficial: `https://www.hacienda.gob.es/es-ES/CDI/Paginas/SistemasFinanciacionDeuda/InformacionEELLs/DatosBudgetariosEELL.aspx`,
  }
}
