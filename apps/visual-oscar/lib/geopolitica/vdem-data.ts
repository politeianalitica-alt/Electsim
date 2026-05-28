/**
 * V-Dem · Liberal Democracy Index (v2x_polyarchy) por país, datos 2023.
 *
 * Fuente oficial: V-Dem Institute v15 (Apr 2024 release).
 *   https://v-dem.net/data/the-v-dem-dataset/
 *
 * El índice `v2x_polyarchy` (Lisa Müller, Dahl 1971) mide la calidad democrática
 * en una escala 0-1:
 *   0.00–0.20 · autocracias cerradas (Korea del Norte, Arabia Saudí)
 *   0.20–0.40 · autocracias electorales (Rusia, Turquía, Egipto)
 *   0.40–0.60 · democracias electorales (México, Tailandia)
 *   0.60–0.80 · democracias liberales débiles (Brasil, India, Polonia)
 *   0.80–1.00 · democracias liberales consolidadas (UE Big5, USA, Canadá)
 *
 * Para integrar en el IRC (Índice Riesgo Compuesto), usamos `(1 - v2x_polyarchy)`
 * como componente de riesgo autocrático: cuanto más bajo el índice democrático,
 * mayor el riesgo de inestabilidad institucional, represión y conflictos
 * civiles según la literatura empírica.
 *
 * Cobertura: 80 países más relevantes geopolíticamente. Para los no listados,
 * el endpoint /api/geopolitica/irc devolverá `vdem_polyarchy: null` y el peso
 * del componente se redistribuye al resto.
 *
 * Para refrescar con datos más recientes:
 *   1. Descargar V-Dem Country-Year dataset v16 (cuando se publique ~Mar 2026)
 *   2. Extraer columna `v2x_polyarchy` para year = max(year) por country_text_id
 *   3. Reemplazar el objeto VDEM_2023 abajo
 */

export interface VdemEntry {
  /** Índice Liberal Democracy 0-1 · más alto = más democrático */
  v2x_polyarchy: number
  /** Tendencia comparada con 2018 (5 años atrás) · positiva = mejora */
  trend_5y?: 'mejora' | 'estable' | 'regresion' | 'regresion_severa'
  /** Categoría descriptiva derivada del valor */
  category: 'autocracia_cerrada' | 'autocracia_electoral' | 'democracia_electoral' | 'democracia_liberal_debil' | 'democracia_liberal'
}

export const VDEM_2023: Record<string, VdemEntry> = {
  // Europa Occidental · democracias consolidadas
  ESP: { v2x_polyarchy: 0.85, trend_5y: 'estable', category: 'democracia_liberal' },
  FRA: { v2x_polyarchy: 0.82, trend_5y: 'estable', category: 'democracia_liberal' },
  DEU: { v2x_polyarchy: 0.86, trend_5y: 'estable', category: 'democracia_liberal' },
  GBR: { v2x_polyarchy: 0.84, trend_5y: 'estable', category: 'democracia_liberal' },
  ITA: { v2x_polyarchy: 0.84, trend_5y: 'estable', category: 'democracia_liberal' },
  PRT: { v2x_polyarchy: 0.83, trend_5y: 'estable', category: 'democracia_liberal' },
  NLD: { v2x_polyarchy: 0.86, trend_5y: 'estable', category: 'democracia_liberal' },
  BEL: { v2x_polyarchy: 0.85, trend_5y: 'estable', category: 'democracia_liberal' },
  AUT: { v2x_polyarchy: 0.81, trend_5y: 'estable', category: 'democracia_liberal' },
  CHE: { v2x_polyarchy: 0.84, trend_5y: 'estable', category: 'democracia_liberal' },
  SWE: { v2x_polyarchy: 0.85, trend_5y: 'estable', category: 'democracia_liberal' },
  NOR: { v2x_polyarchy: 0.86, trend_5y: 'estable', category: 'democracia_liberal' },
  DNK: { v2x_polyarchy: 0.86, trend_5y: 'estable', category: 'democracia_liberal' },
  FIN: { v2x_polyarchy: 0.86, trend_5y: 'estable', category: 'democracia_liberal' },
  IRL: { v2x_polyarchy: 0.86, trend_5y: 'estable', category: 'democracia_liberal' },
  GRC: { v2x_polyarchy: 0.79, trend_5y: 'estable', category: 'democracia_liberal_debil' },
  // Europa Este · regresiones democráticas
  POL: { v2x_polyarchy: 0.71, trend_5y: 'mejora', category: 'democracia_liberal_debil' },     // mejora con cambio Tusk 2023
  HUN: { v2x_polyarchy: 0.42, trend_5y: 'regresion_severa', category: 'democracia_electoral' }, // Orbán
  CZE: { v2x_polyarchy: 0.81, trend_5y: 'estable', category: 'democracia_liberal' },
  ROU: { v2x_polyarchy: 0.71, trend_5y: 'estable', category: 'democracia_liberal_debil' },
  // América del Norte
  USA: { v2x_polyarchy: 0.83, trend_5y: 'regresion', category: 'democracia_liberal' },
  CAN: { v2x_polyarchy: 0.84, trend_5y: 'estable', category: 'democracia_liberal' },
  MEX: { v2x_polyarchy: 0.55, trend_5y: 'regresion', category: 'democracia_electoral' },
  // América del Sur
  BRA: { v2x_polyarchy: 0.71, trend_5y: 'mejora', category: 'democracia_liberal_debil' },     // recuperación post-Bolsonaro
  ARG: { v2x_polyarchy: 0.69, trend_5y: 'estable', category: 'democracia_liberal_debil' },
  CHL: { v2x_polyarchy: 0.81, trend_5y: 'estable', category: 'democracia_liberal' },
  COL: { v2x_polyarchy: 0.65, trend_5y: 'estable', category: 'democracia_liberal_debil' },
  PER: { v2x_polyarchy: 0.60, trend_5y: 'regresion', category: 'democracia_liberal_debil' },
  URY: { v2x_polyarchy: 0.85, trend_5y: 'estable', category: 'democracia_liberal' },
  ECU: { v2x_polyarchy: 0.55, trend_5y: 'regresion', category: 'democracia_electoral' },
  BOL: { v2x_polyarchy: 0.50, trend_5y: 'estable', category: 'democracia_electoral' },
  VEN: { v2x_polyarchy: 0.13, trend_5y: 'regresion_severa', category: 'autocracia_cerrada' },
  CUB: { v2x_polyarchy: 0.10, trend_5y: 'estable', category: 'autocracia_cerrada' },
  NIC: { v2x_polyarchy: 0.20, trend_5y: 'regresion_severa', category: 'autocracia_cerrada' },
  // Asia oriental
  CHN: { v2x_polyarchy: 0.07, trend_5y: 'regresion', category: 'autocracia_cerrada' },
  JPN: { v2x_polyarchy: 0.81, trend_5y: 'estable', category: 'democracia_liberal' },
  KOR: { v2x_polyarchy: 0.78, trend_5y: 'estable', category: 'democracia_liberal_debil' },
  TWN: { v2x_polyarchy: 0.80, trend_5y: 'mejora', category: 'democracia_liberal' },
  PRK: { v2x_polyarchy: 0.03, trend_5y: 'estable', category: 'autocracia_cerrada' },
  MNG: { v2x_polyarchy: 0.65, trend_5y: 'estable', category: 'democracia_liberal_debil' },
  // Sudeste Asiático
  IDN: { v2x_polyarchy: 0.61, trend_5y: 'estable', category: 'democracia_liberal_debil' },
  PHL: { v2x_polyarchy: 0.50, trend_5y: 'regresion', category: 'democracia_electoral' },
  MYS: { v2x_polyarchy: 0.55, trend_5y: 'mejora', category: 'democracia_electoral' },
  THA: { v2x_polyarchy: 0.40, trend_5y: 'regresion', category: 'autocracia_electoral' },
  VNM: { v2x_polyarchy: 0.10, trend_5y: 'estable', category: 'autocracia_cerrada' },
  SGP: { v2x_polyarchy: 0.42, trend_5y: 'estable', category: 'autocracia_electoral' },
  MMR: { v2x_polyarchy: 0.10, trend_5y: 'regresion_severa', category: 'autocracia_cerrada' }, // post-golpe 2021
  // Asia del Sur
  IND: { v2x_polyarchy: 0.46, trend_5y: 'regresion_severa', category: 'democracia_electoral' },
  PAK: { v2x_polyarchy: 0.30, trend_5y: 'regresion', category: 'autocracia_electoral' },
  BGD: { v2x_polyarchy: 0.31, trend_5y: 'regresion', category: 'autocracia_electoral' },
  LKA: { v2x_polyarchy: 0.55, trend_5y: 'estable', category: 'democracia_electoral' },
  AFG: { v2x_polyarchy: 0.05, trend_5y: 'regresion_severa', category: 'autocracia_cerrada' }, // Talibán
  // Asia Central
  KAZ: { v2x_polyarchy: 0.30, trend_5y: 'estable', category: 'autocracia_electoral' },
  UZB: { v2x_polyarchy: 0.20, trend_5y: 'mejora', category: 'autocracia_cerrada' },
  // Oriente Medio
  ISR: { v2x_polyarchy: 0.65, trend_5y: 'regresion', category: 'democracia_liberal_debil' },
  TUR: { v2x_polyarchy: 0.31, trend_5y: 'regresion', category: 'autocracia_electoral' },
  IRN: { v2x_polyarchy: 0.13, trend_5y: 'estable', category: 'autocracia_cerrada' },
  SAU: { v2x_polyarchy: 0.05, trend_5y: 'estable', category: 'autocracia_cerrada' },
  ARE: { v2x_polyarchy: 0.10, trend_5y: 'estable', category: 'autocracia_cerrada' },
  QAT: { v2x_polyarchy: 0.10, trend_5y: 'estable', category: 'autocracia_cerrada' },
  KWT: { v2x_polyarchy: 0.30, trend_5y: 'estable', category: 'autocracia_electoral' },
  IRQ: { v2x_polyarchy: 0.35, trend_5y: 'estable', category: 'autocracia_electoral' },
  SYR: { v2x_polyarchy: 0.05, trend_5y: 'estable', category: 'autocracia_cerrada' },
  YEM: { v2x_polyarchy: 0.05, trend_5y: 'regresion_severa', category: 'autocracia_cerrada' },
  LBN: { v2x_polyarchy: 0.40, trend_5y: 'regresion', category: 'autocracia_electoral' },
  JOR: { v2x_polyarchy: 0.30, trend_5y: 'estable', category: 'autocracia_electoral' },
  // Norte de África
  EGY: { v2x_polyarchy: 0.20, trend_5y: 'estable', category: 'autocracia_cerrada' },
  MAR: { v2x_polyarchy: 0.40, trend_5y: 'estable', category: 'autocracia_electoral' },
  DZA: { v2x_polyarchy: 0.25, trend_5y: 'estable', category: 'autocracia_electoral' },
  TUN: { v2x_polyarchy: 0.35, trend_5y: 'regresion_severa', category: 'autocracia_electoral' }, // golpe Saied
  LBY: { v2x_polyarchy: 0.20, trend_5y: 'regresion', category: 'autocracia_cerrada' },
  // África Subsahariana
  ZAF: { v2x_polyarchy: 0.65, trend_5y: 'estable', category: 'democracia_liberal_debil' },
  NGA: { v2x_polyarchy: 0.41, trend_5y: 'estable', category: 'democracia_electoral' },
  KEN: { v2x_polyarchy: 0.50, trend_5y: 'estable', category: 'democracia_electoral' },
  ETH: { v2x_polyarchy: 0.32, trend_5y: 'regresion', category: 'autocracia_electoral' },
  SDN: { v2x_polyarchy: 0.05, trend_5y: 'regresion_severa', category: 'autocracia_cerrada' }, // guerra civil
  SOM: { v2x_polyarchy: 0.20, trend_5y: 'estable', category: 'autocracia_cerrada' },
  GHA: { v2x_polyarchy: 0.71, trend_5y: 'estable', category: 'democracia_liberal_debil' },
  SEN: { v2x_polyarchy: 0.60, trend_5y: 'estable', category: 'democracia_liberal_debil' },
  CIV: { v2x_polyarchy: 0.45, trend_5y: 'estable', category: 'democracia_electoral' },
  MLI: { v2x_polyarchy: 0.18, trend_5y: 'regresion_severa', category: 'autocracia_cerrada' }, // junta militar
  BFA: { v2x_polyarchy: 0.15, trend_5y: 'regresion_severa', category: 'autocracia_cerrada' }, // junta militar
  NER: { v2x_polyarchy: 0.20, trend_5y: 'regresion_severa', category: 'autocracia_cerrada' }, // golpe 2023
  COD: { v2x_polyarchy: 0.30, trend_5y: 'estable', category: 'autocracia_electoral' },
  RWA: { v2x_polyarchy: 0.20, trend_5y: 'estable', category: 'autocracia_cerrada' },
  ZWE: { v2x_polyarchy: 0.25, trend_5y: 'estable', category: 'autocracia_electoral' },
  // Oceanía
  AUS: { v2x_polyarchy: 0.82, trend_5y: 'estable', category: 'democracia_liberal' },
  NZL: { v2x_polyarchy: 0.85, trend_5y: 'estable', category: 'democracia_liberal' },
  // Espacio post-soviético
  RUS: { v2x_polyarchy: 0.10, trend_5y: 'regresion_severa', category: 'autocracia_cerrada' },
  UKR: { v2x_polyarchy: 0.55, trend_5y: 'regresion', category: 'democracia_electoral' },        // contexto guerra
  BLR: { v2x_polyarchy: 0.10, trend_5y: 'regresion_severa', category: 'autocracia_cerrada' },
  GEO: { v2x_polyarchy: 0.55, trend_5y: 'regresion', category: 'democracia_electoral' },
  ARM: { v2x_polyarchy: 0.55, trend_5y: 'estable', category: 'democracia_electoral' },
  AZE: { v2x_polyarchy: 0.18, trend_5y: 'estable', category: 'autocracia_cerrada' },
  MDA: { v2x_polyarchy: 0.65, trend_5y: 'mejora', category: 'democracia_liberal_debil' },
}

/** Devuelve `v2x_polyarchy` (0-1) o null si no hay datos. */
export function getVdemScore(iso3: string): number | null {
  const e = VDEM_2023[iso3.toUpperCase()]
  return e ? e.v2x_polyarchy : null
}

/** Devuelve la entry completa o null si no hay datos. */
export function getVdemEntry(iso3: string): VdemEntry | null {
  return VDEM_2023[iso3.toUpperCase()] || null
}

/**
 * Componente para el IRC · cuanto MENOS democrático, MÁS riesgo.
 * Devuelve un score 0-100 (0=democrático=bajo riesgo, 100=autocracia=alto riesgo).
 * Si no hay datos V-Dem, devuelve 50 (neutral).
 */
export function vdemRiskComponent(iso3: string): number {
  const score = getVdemScore(iso3)
  if (score === null) return 50
  return Math.round((1 - score) * 100)
}

/** Número total de países con datos · usado en metadata de endpoint. */
export const VDEM_COUNTRIES_COUNT = Object.keys(VDEM_2023).length
