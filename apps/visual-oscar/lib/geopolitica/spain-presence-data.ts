/**
 * Dataset · Presencia institucional España en el exterior.
 *
 * Cubre 4 dimensiones para Tab 6:
 *   1. Presencia diplomática (embajadas/consulados/oficinas ICEX)
 *   2. Institutos Cervantes
 *   3. Misiones militares activas
 *   4. Stock IED española estimada (DataInvex aprox 2023)
 *   5. Top destinos exportación 2024 acumulado (DataComex/ICEX)
 *
 * Fuentes:
 *   - MAEC · embajadas y consulados oficiales
 *   - Instituto Cervantes · centros
 *   - Ministerio Defensa · misiones internacionales
 *   - DataInvex · stock IED por país 2023
 *   - DataComex/ICEX · exportaciones 2024
 *
 * Para refrescar: trimestral con datos oficiales.
 */

export interface SpainPresence {
  iso3: string
  embassy: boolean
  consulate_count: number
  icex_office: boolean
  cervantes_centers: number
  military_mission: boolean
  /** Stock IED española en bn EUR (aprox 2023) */
  fdi_stock_eur_bn: number | null
  /** Exportaciones España → país en 2024 acumulado (bn EUR) */
  exports_2024_eur_bn: number | null
  /** Importaciones España ← país 2024 acumulado (bn EUR) */
  imports_2024_eur_bn: number | null
}

export const SPAIN_PRESENCE: Record<string, SpainPresence> = {
  // Europa · UE Big 5 + cercanos
  FRA: { iso3: 'FRA', embassy: true, consulate_count: 12, icex_office: true, cervantes_centers: 7, military_mission: true, fdi_stock_eur_bn: 18.5, exports_2024_eur_bn: 53.2, imports_2024_eur_bn: 41.8 },
  DEU: { iso3: 'DEU', embassy: true, consulate_count: 8, icex_office: true, cervantes_centers: 4, military_mission: true, fdi_stock_eur_bn: 14.2, exports_2024_eur_bn: 35.8, imports_2024_eur_bn: 45.2 },
  ITA: { iso3: 'ITA', embassy: true, consulate_count: 6, icex_office: true, cervantes_centers: 5, military_mission: true, fdi_stock_eur_bn: 8.6, exports_2024_eur_bn: 26.5, imports_2024_eur_bn: 26.8 },
  PRT: { iso3: 'PRT', embassy: true, consulate_count: 4, icex_office: true, cervantes_centers: 3, military_mission: false, fdi_stock_eur_bn: 22.4, exports_2024_eur_bn: 23.6, imports_2024_eur_bn: 11.2 },
  GBR: { iso3: 'GBR', embassy: true, consulate_count: 7, icex_office: true, cervantes_centers: 4, military_mission: false, fdi_stock_eur_bn: 65.3, exports_2024_eur_bn: 19.5, imports_2024_eur_bn: 14.5 },
  NLD: { iso3: 'NLD', embassy: true, consulate_count: 3, icex_office: true, cervantes_centers: 2, military_mission: false, fdi_stock_eur_bn: 32.1, exports_2024_eur_bn: 13.8, imports_2024_eur_bn: 14.2 },
  BEL: { iso3: 'BEL', embassy: true, consulate_count: 3, icex_office: true, cervantes_centers: 2, military_mission: false, fdi_stock_eur_bn: 5.8, exports_2024_eur_bn: 9.3, imports_2024_eur_bn: 6.5 },
  POL: { iso3: 'POL', embassy: true, consulate_count: 2, icex_office: true, cervantes_centers: 2, military_mission: true, fdi_stock_eur_bn: 6.8, exports_2024_eur_bn: 6.7, imports_2024_eur_bn: 8.1 },
  IRL: { iso3: 'IRL', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 3.2, exports_2024_eur_bn: 2.8, imports_2024_eur_bn: 4.1 },
  GRC: { iso3: 'GRC', embassy: true, consulate_count: 2, icex_office: true, cervantes_centers: 2, military_mission: true, fdi_stock_eur_bn: 1.2, exports_2024_eur_bn: 2.4, imports_2024_eur_bn: 1.1 },
  CHE: { iso3: 'CHE', embassy: true, consulate_count: 3, icex_office: true, cervantes_centers: 2, military_mission: false, fdi_stock_eur_bn: 4.7, exports_2024_eur_bn: 4.2, imports_2024_eur_bn: 4.8 },
  SWE: { iso3: 'SWE', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 1.8, exports_2024_eur_bn: 2.9, imports_2024_eur_bn: 4.1 },
  NOR: { iso3: 'NOR', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 0.9, exports_2024_eur_bn: 1.4, imports_2024_eur_bn: 4.8 },
  DNK: { iso3: 'DNK', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 1.6, exports_2024_eur_bn: 1.8, imports_2024_eur_bn: 1.9 },
  FIN: { iso3: 'FIN', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 0.8, exports_2024_eur_bn: 1.1, imports_2024_eur_bn: 1.7 },
  AUT: { iso3: 'AUT', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 2.3, exports_2024_eur_bn: 1.7, imports_2024_eur_bn: 2.5 },
  CZE: { iso3: 'CZE', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 0.7, exports_2024_eur_bn: 2.1, imports_2024_eur_bn: 4.1 },
  ROU: { iso3: 'ROU', embassy: true, consulate_count: 2, icex_office: true, cervantes_centers: 2, military_mission: true, fdi_stock_eur_bn: 1.5, exports_2024_eur_bn: 2.6, imports_2024_eur_bn: 3.2 },
  HUN: { iso3: 'HUN', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 0.6, exports_2024_eur_bn: 1.8, imports_2024_eur_bn: 2.4 },
  // Norteamérica
  USA: { iso3: 'USA', embassy: true, consulate_count: 8, icex_office: true, cervantes_centers: 7, military_mission: false, fdi_stock_eur_bn: 75.4, exports_2024_eur_bn: 18.6, imports_2024_eur_bn: 14.2 },
  CAN: { iso3: 'CAN', embassy: true, consulate_count: 3, icex_office: true, cervantes_centers: 2, military_mission: false, fdi_stock_eur_bn: 8.4, exports_2024_eur_bn: 2.1, imports_2024_eur_bn: 1.6 },
  MEX: { iso3: 'MEX', embassy: true, consulate_count: 7, icex_office: true, cervantes_centers: 3, military_mission: false, fdi_stock_eur_bn: 56.2, exports_2024_eur_bn: 7.3, imports_2024_eur_bn: 4.5 },
  // Latam · alta presencia histórica española
  BRA: { iso3: 'BRA', embassy: true, consulate_count: 6, icex_office: true, cervantes_centers: 8, military_mission: false, fdi_stock_eur_bn: 51.2, exports_2024_eur_bn: 3.4, imports_2024_eur_bn: 4.8 },
  ARG: { iso3: 'ARG', embassy: true, consulate_count: 6, icex_office: true, cervantes_centers: 5, military_mission: false, fdi_stock_eur_bn: 18.6, exports_2024_eur_bn: 1.3, imports_2024_eur_bn: 1.9 },
  CHL: { iso3: 'CHL', embassy: true, consulate_count: 3, icex_office: true, cervantes_centers: 3, military_mission: false, fdi_stock_eur_bn: 17.4, exports_2024_eur_bn: 1.1, imports_2024_eur_bn: 1.6 },
  COL: { iso3: 'COL', embassy: true, consulate_count: 4, icex_office: true, cervantes_centers: 2, military_mission: false, fdi_stock_eur_bn: 12.8, exports_2024_eur_bn: 1.0, imports_2024_eur_bn: 0.8 },
  PER: { iso3: 'PER', embassy: true, consulate_count: 3, icex_office: true, cervantes_centers: 2, military_mission: false, fdi_stock_eur_bn: 9.6, exports_2024_eur_bn: 0.9, imports_2024_eur_bn: 0.6 },
  URY: { iso3: 'URY', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 3.2, exports_2024_eur_bn: 0.3, imports_2024_eur_bn: 0.2 },
  ECU: { iso3: 'ECU', embassy: true, consulate_count: 3, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 0.8, exports_2024_eur_bn: 0.5, imports_2024_eur_bn: 0.7 },
  CUB: { iso3: 'CUB', embassy: true, consulate_count: 2, icex_office: false, cervantes_centers: 0, military_mission: false, fdi_stock_eur_bn: 0.6, exports_2024_eur_bn: 0.6, imports_2024_eur_bn: 0.2 },
  VEN: { iso3: 'VEN', embassy: true, consulate_count: 3, icex_office: false, cervantes_centers: 0, military_mission: false, fdi_stock_eur_bn: 2.1, exports_2024_eur_bn: 0.2, imports_2024_eur_bn: 0.3 },
  DOM: { iso3: 'DOM', embassy: true, consulate_count: 2, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 2.4, exports_2024_eur_bn: 0.7, imports_2024_eur_bn: 0.2 },
  // Norte de África · proximidad estratégica
  MAR: { iso3: 'MAR', embassy: true, consulate_count: 8, icex_office: true, cervantes_centers: 6, military_mission: false, fdi_stock_eur_bn: 5.8, exports_2024_eur_bn: 10.4, imports_2024_eur_bn: 8.2 },
  DZA: { iso3: 'DZA', embassy: true, consulate_count: 3, icex_office: true, cervantes_centers: 2, military_mission: false, fdi_stock_eur_bn: 1.8, exports_2024_eur_bn: 2.1, imports_2024_eur_bn: 5.4 },
  TUN: { iso3: 'TUN', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 2, military_mission: false, fdi_stock_eur_bn: 0.4, exports_2024_eur_bn: 0.6, imports_2024_eur_bn: 0.8 },
  EGY: { iso3: 'EGY', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 2, military_mission: false, fdi_stock_eur_bn: 1.2, exports_2024_eur_bn: 1.8, imports_2024_eur_bn: 0.7 },
  // Oriente Medio
  TUR: { iso3: 'TUR', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: true, fdi_stock_eur_bn: 3.4, exports_2024_eur_bn: 4.6, imports_2024_eur_bn: 4.8 },
  ISR: { iso3: 'ISR', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 0.8, exports_2024_eur_bn: 1.4, imports_2024_eur_bn: 1.6 },
  SAU: { iso3: 'SAU', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 2.6, exports_2024_eur_bn: 2.8, imports_2024_eur_bn: 5.2 },
  ARE: { iso3: 'ARE', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 0, military_mission: false, fdi_stock_eur_bn: 1.4, exports_2024_eur_bn: 2.2, imports_2024_eur_bn: 0.9 },
  IRN: { iso3: 'IRN', embassy: true, consulate_count: 1, icex_office: false, cervantes_centers: 0, military_mission: false, fdi_stock_eur_bn: 0.2, exports_2024_eur_bn: 0.4, imports_2024_eur_bn: 0.1 },
  // Asia
  CHN: { iso3: 'CHN', embassy: true, consulate_count: 4, icex_office: true, cervantes_centers: 6, military_mission: false, fdi_stock_eur_bn: 5.4, exports_2024_eur_bn: 6.8, imports_2024_eur_bn: 31.2 },
  JPN: { iso3: 'JPN', embassy: true, consulate_count: 2, icex_office: true, cervantes_centers: 4, military_mission: false, fdi_stock_eur_bn: 1.2, exports_2024_eur_bn: 2.4, imports_2024_eur_bn: 3.1 },
  KOR: { iso3: 'KOR', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 0.8, exports_2024_eur_bn: 1.6, imports_2024_eur_bn: 2.4 },
  IND: { iso3: 'IND', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 2, military_mission: false, fdi_stock_eur_bn: 2.4, exports_2024_eur_bn: 2.1, imports_2024_eur_bn: 2.8 },
  IDN: { iso3: 'IDN', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 0.6, exports_2024_eur_bn: 0.7, imports_2024_eur_bn: 1.2 },
  PHL: { iso3: 'PHL', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 0.4, exports_2024_eur_bn: 0.4, imports_2024_eur_bn: 0.6 },
  SGP: { iso3: 'SGP', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 0, military_mission: false, fdi_stock_eur_bn: 0.8, exports_2024_eur_bn: 1.1, imports_2024_eur_bn: 0.4 },
  VNM: { iso3: 'VNM', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 0, military_mission: false, fdi_stock_eur_bn: 0.2, exports_2024_eur_bn: 0.5, imports_2024_eur_bn: 1.4 },
  AUS: { iso3: 'AUS', embassy: true, consulate_count: 2, icex_office: true, cervantes_centers: 2, military_mission: false, fdi_stock_eur_bn: 12.4, exports_2024_eur_bn: 0.8, imports_2024_eur_bn: 0.5 },
  // África Subsahariana
  ZAF: { iso3: 'ZAF', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 0, military_mission: false, fdi_stock_eur_bn: 0.4, exports_2024_eur_bn: 0.9, imports_2024_eur_bn: 0.8 },
  NGA: { iso3: 'NGA', embassy: true, consulate_count: 1, icex_office: true, cervantes_centers: 1, military_mission: false, fdi_stock_eur_bn: 0.6, exports_2024_eur_bn: 0.4, imports_2024_eur_bn: 3.2 },
  // Espacio post-soviético
  RUS: { iso3: 'RUS', embassy: true, consulate_count: 2, icex_office: false, cervantes_centers: 0, military_mission: false, fdi_stock_eur_bn: 0.8, exports_2024_eur_bn: 0.3, imports_2024_eur_bn: 0.8 },
  UKR: { iso3: 'UKR', embassy: true, consulate_count: 1, icex_office: false, cervantes_centers: 0, military_mission: false, fdi_stock_eur_bn: 0.2, exports_2024_eur_bn: 0.4, imports_2024_eur_bn: 0.3 },
}

export function getSpainPresence(iso3: string): SpainPresence | null {
  return SPAIN_PRESENCE[iso3.toUpperCase()] || null
}

/** Score combinado de presencia 0-100 · ponderado. */
export function getPresenceScore(iso3: string): number | null {
  const p = getSpainPresence(iso3)
  if (!p) return null
  let s = 0
  if (p.embassy) s += 10
  s += Math.min(15, p.consulate_count * 2)
  if (p.icex_office) s += 10
  s += Math.min(15, p.cervantes_centers * 2)
  if (p.military_mission) s += 5
  s += Math.min(25, (p.fdi_stock_eur_bn || 0) / 3)
  s += Math.min(20, (p.exports_2024_eur_bn || 0))
  return Math.min(100, Math.round(s))
}

export const SPAIN_PRESENCE_COUNT = Object.keys(SPAIN_PRESENCE).length

/** Top N destinos exportación 2024 acumulado. */
export function getTopExports(n = 20): SpainPresence[] {
  return Object.values(SPAIN_PRESENCE)
    .filter((p) => p.exports_2024_eur_bn !== null)
    .sort((a, b) => (b.exports_2024_eur_bn || 0) - (a.exports_2024_eur_bn || 0))
    .slice(0, n)
}

/** Top destinos FDI España (stock acumulado). */
export function getTopFDI(n = 15): SpainPresence[] {
  return Object.values(SPAIN_PRESENCE)
    .filter((p) => p.fdi_stock_eur_bn !== null)
    .sort((a, b) => (b.fdi_stock_eur_bn || 0) - (a.fdi_stock_eur_bn || 0))
    .slice(0, n)
}
