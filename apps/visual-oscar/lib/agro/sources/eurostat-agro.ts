/**
 * Wrappers Eurostat para datos agrícolas regionales · Politeia Agro v4
 *
 * Reusa el cliente genérico fetchEurostatDataset (lib/vivienda/sources/
 * eurostat-vivienda.ts) — JSON-stat 2.0, sin auth.
 *
 * Datasets:
 *   - apro_cpshr · Crop production by NUTS 2 region (producción de cultivos
 *     en humedad estándar, por región NUTS2 = CCAA). VERIFICADO: devuelve
 *     valores por geo=ES11…ES70.
 *
 * Para comercio por país-destino (demanda internacional) usamos el catch-all
 * /api/comtrade ó /api/oec desde el endpoint, no este módulo.
 */
import { fetchEurostatDataset, type EurostatPoint } from '@/lib/vivienda/sources/eurostat-vivienda'
import { NUTS2_AGRICOLAS, NUTS2_TO_NOMBRE } from '@/lib/agro/catalogos/ccaa-map'

/** Catálogo de cultivos agregados (código Eurostat strucpro/crops). */
export const CULTIVOS_EUROSTAT: Array<{ code: string; nombre: string; color: string }> = [
  { code: 'C1110', nombre: 'Trigo blando y escanda', color: '#F59E0B' },
  { code: 'C1300', nombre: 'Cebada', color: '#D97706' },
  { code: 'C1500', nombre: 'Maíz en grano', color: '#FBBF24' },
  { code: 'R1000', nombre: 'Patata', color: '#A16207' },
  { code: 'I1110', nombre: 'Girasol', color: '#16A34A' },
  { code: 'G1000', nombre: 'Hortalizas frescas', color: '#0EA5E9' },
  { code: 'W1000', nombre: 'Viñedo (uva)', color: '#831843' },
]

export interface RegionalValue {
  nuts2: string
  nombre: string
  value: number | null
  time: string
}

/**
 * Producción de un cultivo por CCAA (NUTS2) en el último año disponible.
 * `crop` = código Eurostat (ver CULTIVOS_EUROSTAT). `year` opcional.
 */
export async function fetchProduccionRegional(
  crop: string,
  year?: string
): Promise<{ ok: true; values: RegionalValue[]; year: string } | { ok: false; error: string }> {
  const time = year ? [year] : ['2024', '2023', '2022']
  const r = await fetchEurostatDataset({
    dataset: 'apro_cpshr',
    geo: NUTS2_AGRICOLAS,
    time,
    filters: {
      crops: crop,
      strucpro: 'PR', // Harvested production
      unit: 'T', // toneladas
    },
  })
  if (!r.ok) return { ok: false, error: r.error }
  // Quedarnos con el año más reciente que tenga datos
  const byYear = new Map<string, EurostatPoint[]>()
  for (const p of r.points) {
    if (p.value == null) continue
    const arr = byYear.get(p.time) || []
    arr.push(p)
    byYear.set(p.time, arr)
  }
  const years = Array.from(byYear.keys()).sort().reverse()
  const bestYear = years[0]
  if (!bestYear) return { ok: false, error: 'sin datos regionales para el cultivo' }
  const values: RegionalValue[] = (byYear.get(bestYear) || []).map((p) => ({
    nuts2: p.geo,
    nombre: NUTS2_TO_NOMBRE[p.geo] ?? p.geo,
    value: p.value,
    time: p.time,
  }))
  return { ok: true, values, year: bestYear }
}
