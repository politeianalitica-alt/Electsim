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

/**
 * Catálogo de cultivos (código Eurostat `crops` de apro_cpshr).
 * Códigos verificados contra la API (2026-06): todos existen y devuelven datos.
 */
export const CULTIVOS_EUROSTAT: Array<{ code: string; nombre: string; color: string }> = [
  { code: 'C1110', nombre: 'Trigo blando y escanda', color: '#F59E0B' },
  { code: 'C1300', nombre: 'Cebada', color: '#D97706' },
  { code: 'C1500', nombre: 'Maíz en grano', color: '#FBBF24' },
  { code: 'C0000', nombre: 'Cereales (total grano)', color: '#B45309' },
  { code: 'R1000', nombre: 'Patata', color: '#A16207' },
  { code: 'I1110', nombre: 'Colza y nabina', color: '#16A34A' },
  // Nota: W1000 (uva) y G-hortícolas no tienen producción por NUTS2 en
  // apro_cpshr (0 celdas) → se omiten para no mostrar mapas vacíos.
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
      // apro_cpshr NO tiene dimensión `unit`. strucpro válidos: AR_THS_HA,
      // MAR_THS_HA, HUMD_EU_PC, HPRD_HUMD_EU_THS_T, YLD_HUMD_EU_T_HA.
      // Producción cosechada (humedad estándar UE) en MILES de toneladas:
      strucpro: 'HPRD_HUMD_EU_THS_T',
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
  // strucpro=HPRD_HUMD_EU_THS_T viene en MILES de toneladas → ×1000 para t.
  const values: RegionalValue[] = (byYear.get(bestYear) || []).map((p) => ({
    nuts2: p.geo,
    nombre: NUTS2_TO_NOMBRE[p.geo] ?? p.geo,
    value: p.value != null ? Math.round(p.value * 1000) : null,
    time: p.time,
  }))
  return { ok: true, values, year: bestYear }
}
