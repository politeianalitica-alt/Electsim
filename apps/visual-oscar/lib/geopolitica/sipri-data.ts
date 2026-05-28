/**
 * SIPRI · Gasto militar por país, datos 2023.
 *
 * Fuente oficial: SIPRI Military Expenditure Database 2024.
 *   https://www.sipri.org/databases/milex
 *   (Stockholm International Peace Research Institute)
 *
 * Para integrar en el panel de impacto económico del drawer de conflicto
 * y el panel de actores militares. Datos en USD constantes (billions 2022)
 * + porcentaje sobre PIB (carga militar relativa).
 *
 * Cobertura: 60 países más relevantes en gasto absoluto o intensidad militar.
 * Para los no listados, milex_usd_bn y milex_pct_gdp serán null.
 *
 * Tendencias clave del release 2024:
 *   - Gasto militar global 2023: $2,443bn (+6.8% vs 2022, mayor incremento desde 2009)
 *   - Top 5: USA, China, Rusia, India, Arabia Saudí
 *   - Ucrania: 36.7% del PIB (única economía 30%+ por guerra)
 *   - Europa: +13% vs 2022 (mayor desde Guerra Fría)
 *
 * Para refrescar:
 *   1. Descargar SIPRI Milex Excel database (publicación anual, ~abril)
 *   2. Extraer sheet "Constant (2022) US$" y "Share of GDP"
 *   3. Actualizar SIPRI_2023 abajo
 */

export interface SipriEntry {
  /** Gasto militar en miles de millones USD constantes 2022 */
  milex_usd_bn: number
  /** Gasto militar como % del PIB */
  milex_pct_gdp: number
  /** Cambio % vs 2022 (real, ajustado inflación) */
  change_vs_2022_pct?: number
  /** Rango mundial 2023 (1 = USA, etc.) */
  world_rank?: number
}

export const SIPRI_2023: Record<string, SipriEntry> = {
  // Top 5 mundial
  USA: { milex_usd_bn: 916, milex_pct_gdp: 3.4, change_vs_2022_pct: 2.3, world_rank: 1 },
  CHN: { milex_usd_bn: 296, milex_pct_gdp: 1.7, change_vs_2022_pct: 6.0, world_rank: 2 },
  RUS: { milex_usd_bn: 109, milex_pct_gdp: 5.9, change_vs_2022_pct: 24.0, world_rank: 3 },
  IND: { milex_usd_bn: 83.6, milex_pct_gdp: 2.4, change_vs_2022_pct: 4.2, world_rank: 4 },
  SAU: { milex_usd_bn: 75.8, milex_pct_gdp: 7.1, change_vs_2022_pct: 4.3, world_rank: 5 },
  // Europa Occidental
  GBR: { milex_usd_bn: 74.9, milex_pct_gdp: 2.3, change_vs_2022_pct: 7.9, world_rank: 6 },
  DEU: { milex_usd_bn: 66.8, milex_pct_gdp: 1.5, change_vs_2022_pct: 9.0, world_rank: 7 },
  FRA: { milex_usd_bn: 61.3, milex_pct_gdp: 2.1, change_vs_2022_pct: 6.5, world_rank: 9 },
  ITA: { milex_usd_bn: 35.5, milex_pct_gdp: 1.6, change_vs_2022_pct: 4.5, world_rank: 12 },
  ESP: { milex_usd_bn: 23.4, milex_pct_gdp: 1.5, change_vs_2022_pct: 2.7, world_rank: 18 },
  NLD: { milex_usd_bn: 15.6, milex_pct_gdp: 1.6, change_vs_2022_pct: 8.9, world_rank: 24 },
  PRT: { milex_usd_bn: 4.7, milex_pct_gdp: 1.5, change_vs_2022_pct: 5.4 },
  BEL: { milex_usd_bn: 9.8, milex_pct_gdp: 1.2, change_vs_2022_pct: 10.5 },
  GRC: { milex_usd_bn: 7.9, milex_pct_gdp: 3.1, change_vs_2022_pct: -7.7 },
  CHE: { milex_usd_bn: 6.0, milex_pct_gdp: 0.7, change_vs_2022_pct: 6.0 },
  // Nórdicos
  SWE: { milex_usd_bn: 12.0, milex_pct_gdp: 2.0, change_vs_2022_pct: 15.5 },
  NOR: { milex_usd_bn: 9.7, milex_pct_gdp: 1.7, change_vs_2022_pct: 9.4 },
  DNK: { milex_usd_bn: 8.1, milex_pct_gdp: 1.7, change_vs_2022_pct: 14.4 },
  FIN: { milex_usd_bn: 7.3, milex_pct_gdp: 2.2, change_vs_2022_pct: 16.1 },
  // Europa Este · efecto guerra Ucrania
  POL: { milex_usd_bn: 31.6, milex_pct_gdp: 3.8, change_vs_2022_pct: 75.0, world_rank: 14 }, // mayor incremento mundial
  UKR: { milex_usd_bn: 64.8, milex_pct_gdp: 36.7, change_vs_2022_pct: 51.0, world_rank: 8 }, // 3er mayor en Europa
  CZE: { milex_usd_bn: 4.6, milex_pct_gdp: 1.5, change_vs_2022_pct: 30.0 },
  ROU: { milex_usd_bn: 8.5, milex_pct_gdp: 2.5, change_vs_2022_pct: 33.0 },
  HUN: { milex_usd_bn: 3.5, milex_pct_gdp: 1.7, change_vs_2022_pct: 22.0 },
  AUT: { milex_usd_bn: 4.4, milex_pct_gdp: 0.9, change_vs_2022_pct: 22.0 },
  // Asia
  JPN: { milex_usd_bn: 50.2, milex_pct_gdp: 1.2, change_vs_2022_pct: 11.0, world_rank: 10 },
  KOR: { milex_usd_bn: 47.9, milex_pct_gdp: 2.8, change_vs_2022_pct: 1.1, world_rank: 11 },
  AUS: { milex_usd_bn: 32.3, milex_pct_gdp: 1.9, change_vs_2022_pct: 0.8, world_rank: 13 },
  TWN: { milex_usd_bn: 16.6, milex_pct_gdp: 2.6, change_vs_2022_pct: -7.0 },
  SGP: { milex_usd_bn: 13.4, milex_pct_gdp: 2.7, change_vs_2022_pct: 1.5 },
  IDN: { milex_usd_bn: 8.1, milex_pct_gdp: 0.7, change_vs_2022_pct: -5.4 },
  PAK: { milex_usd_bn: 8.5, milex_pct_gdp: 2.8, change_vs_2022_pct: -7.7 },
  THA: { milex_usd_bn: 5.5, milex_pct_gdp: 1.0, change_vs_2022_pct: -2.0 },
  VNM: { milex_usd_bn: 6.4, milex_pct_gdp: 1.4, change_vs_2022_pct: -0.4 },
  MYS: { milex_usd_bn: 4.7, milex_pct_gdp: 1.0, change_vs_2022_pct: 1.6 },
  PHL: { milex_usd_bn: 4.5, milex_pct_gdp: 1.1, change_vs_2022_pct: 9.8 },
  BGD: { milex_usd_bn: 4.6, milex_pct_gdp: 1.2, change_vs_2022_pct: 12.0 },
  MMR: { milex_usd_bn: 2.7, milex_pct_gdp: 4.0, change_vs_2022_pct: 6.0 }, // junta militar
  // Oriente Medio
  ISR: { milex_usd_bn: 27.5, milex_pct_gdp: 5.3, change_vs_2022_pct: 24.0, world_rank: 15 },
  TUR: { milex_usd_bn: 15.8, milex_pct_gdp: 1.5, change_vs_2022_pct: -2.0 },
  IRN: { milex_usd_bn: 10.3, milex_pct_gdp: 2.1, change_vs_2022_pct: 0.6 },
  ARE: { milex_usd_bn: 25.4, milex_pct_gdp: 5.3 }, // estimado SIPRI 2021 último dato
  QAT: { milex_usd_bn: 17.0, milex_pct_gdp: 8.0 }, // estimado
  KWT: { milex_usd_bn: 8.2, milex_pct_gdp: 4.8, change_vs_2022_pct: 12.0 },
  IRQ: { milex_usd_bn: 10.3, milex_pct_gdp: 4.1, change_vs_2022_pct: 6.0 },
  EGY: { milex_usd_bn: 4.7, milex_pct_gdp: 1.3, change_vs_2022_pct: -5.6 }, // dato oficial bajo
  JOR: { milex_usd_bn: 2.2, milex_pct_gdp: 4.5, change_vs_2022_pct: 1.0 },
  // América
  CAN: { milex_usd_bn: 27.2, milex_pct_gdp: 1.3, change_vs_2022_pct: 13.4, world_rank: 16 },
  BRA: { milex_usd_bn: 22.9, milex_pct_gdp: 1.0, change_vs_2022_pct: -5.0, world_rank: 19 },
  MEX: { milex_usd_bn: 9.0, milex_pct_gdp: 0.5, change_vs_2022_pct: 4.0 },
  COL: { milex_usd_bn: 9.5, milex_pct_gdp: 2.6, change_vs_2022_pct: 1.6 },
  CHL: { milex_usd_bn: 6.2, milex_pct_gdp: 1.4, change_vs_2022_pct: 7.3 },
  ARG: { milex_usd_bn: 6.4, milex_pct_gdp: 0.4, change_vs_2022_pct: 0.4 },
  VEN: { milex_usd_bn: 0.3, milex_pct_gdp: 0.5, change_vs_2022_pct: -1.0 }, // dato muy degradado
  PER: { milex_usd_bn: 2.7, milex_pct_gdp: 1.0, change_vs_2022_pct: 1.3 },
  // África
  ZAF: { milex_usd_bn: 5.3, milex_pct_gdp: 1.0, change_vs_2022_pct: 18.0 },
  NGA: { milex_usd_bn: 3.2, milex_pct_gdp: 0.6, change_vs_2022_pct: 20.0 },
  DZA: { milex_usd_bn: 18.3, milex_pct_gdp: 8.2, change_vs_2022_pct: 76.0 }, // gran incremento
  MAR: { milex_usd_bn: 5.5, milex_pct_gdp: 4.2, change_vs_2022_pct: 5.2 },
  ETH: { milex_usd_bn: 1.0, milex_pct_gdp: 0.7, change_vs_2022_pct: 35.0 },
  KEN: { milex_usd_bn: 1.2, milex_pct_gdp: 1.3, change_vs_2022_pct: -5.0 },
  COD: { milex_usd_bn: 0.8, milex_pct_gdp: 1.4, change_vs_2022_pct: 105.0 }, // ofensiva M23
  SDN: { milex_usd_bn: 2.5, milex_pct_gdp: 4.0, change_vs_2022_pct: -10.0 }, // guerra civil distorsiona
  MLI: { milex_usd_bn: 1.0, milex_pct_gdp: 4.1, change_vs_2022_pct: 5.0 },
}

/** Devuelve gasto militar en bn USD o null. */
export function getMilexUsd(iso3: string): number | null {
  const e = SIPRI_2023[iso3.toUpperCase()]
  return e ? e.milex_usd_bn : null
}

/** Devuelve gasto militar como % del PIB o null. */
export function getMilexPctGdp(iso3: string): number | null {
  const e = SIPRI_2023[iso3.toUpperCase()]
  return e ? e.milex_pct_gdp : null
}

/** Devuelve la entry completa con tendencia. */
export function getSipriEntry(iso3: string): SipriEntry | null {
  return SIPRI_2023[iso3.toUpperCase()] || null
}

/**
 * Componente del IRC · militarización extrema (>5% PIB) = riesgo elevado.
 * Devuelve score 0-100 (0 = pacífico, 100 = economía de guerra).
 * Sin datos = 30 (neutral-bajo).
 */
export function militarizationRisk(iso3: string): number {
  const pct = getMilexPctGdp(iso3)
  if (pct === null) return 30
  if (pct > 20) return 100   // economía de guerra (Ucrania)
  if (pct > 7) return 85     // muy militarizado (Arabia Saudí, Argelia)
  if (pct > 4) return 65     // alto (Israel, Polonia, Rusia)
  if (pct > 2.5) return 45   // medio-alto (USA, Grecia)
  if (pct > 1.5) return 25   // medio (UK, Francia, Italia)
  return 10                   // bajo (Alemania, España, Japón)
}

export const SIPRI_COUNTRIES_COUNT = Object.keys(SIPRI_2023).length
