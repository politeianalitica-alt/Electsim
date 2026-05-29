/**
 * Dataset · Freedom House (Freedom in the World 2024) + V-Dem detallado.
 *
 * Sprint G24 · usuario pidió integrar:
 *   - https://github.com/pachadotdev/freedomhouse (Freedom House R package)
 *   - https://github.com/xmarquez/democracyData (V-Dem + Polity detallado)
 *
 * Freedom House: 25 indicadores agregados en 2 scores (PR + CL) → 1-7 cada uno
 * → categoria Free/Partly Free/Not Free.
 *
 * V-Dem: 7 high-level indicators (electoral, liberal, participatory, deliberative,
 * egalitarian democracy) cada uno 0-1.
 */

export interface FreedomScores {
  iso3: string
  /** Political Rights · 0-40 puntos */
  political_rights: number
  /** Civil Liberties · 0-60 puntos */
  civil_liberties: number
  /** Total: 0-100 */
  total: number
  /** Status oficial */
  status: 'Free' | 'Partly Free' | 'Not Free'
  /** Cambio vs año anterior (puntos) */
  change_vs_prev: number
  /** Notas */
  year: number
}

export interface VdemScores {
  iso3: string
  /** Electoral Democracy Index (Polyarchy) */
  v2x_polyarchy: number
  /** Liberal Democracy Index */
  v2x_libdem: number
  /** Participatory Democracy Index */
  v2x_partipdem: number
  /** Deliberative Democracy Index */
  v2x_delibdem: number
  /** Egalitarian Democracy Index */
  v2x_egaldem: number
  /** Regime type · 0=closed autocracy, 1=electoral autocracy, 2=electoral democracy, 3=liberal democracy */
  v2x_regime: 0 | 1 | 2 | 3
  /** Año de los datos */
  year: number
}

export const FREEDOM_HOUSE: Record<string, FreedomScores> = {
  USA: { iso3: 'USA', political_rights: 33, civil_liberties: 50, total: 83, status: 'Free', change_vs_prev: 0, year: 2024 },
  GBR: { iso3: 'GBR', political_rights: 39, civil_liberties: 53, total: 92, status: 'Free', change_vs_prev: -1, year: 2024 },
  FRA: { iso3: 'FRA', political_rights: 36, civil_liberties: 53, total: 89, status: 'Free', change_vs_prev: 0, year: 2024 },
  DEU: { iso3: 'DEU', political_rights: 39, civil_liberties: 55, total: 94, status: 'Free', change_vs_prev: 0, year: 2024 },
  ESP: { iso3: 'ESP', political_rights: 37, civil_liberties: 53, total: 90, status: 'Free', change_vs_prev: 0, year: 2024 },
  ITA: { iso3: 'ITA', political_rights: 36, civil_liberties: 54, total: 90, status: 'Free', change_vs_prev: 0, year: 2024 },
  PRT: { iso3: 'PRT', political_rights: 39, civil_liberties: 57, total: 96, status: 'Free', change_vs_prev: 0, year: 2024 },
  NLD: { iso3: 'NLD', political_rights: 39, civil_liberties: 58, total: 97, status: 'Free', change_vs_prev: 0, year: 2024 },
  CAN: { iso3: 'CAN', political_rights: 40, civil_liberties: 57, total: 97, status: 'Free', change_vs_prev: 0, year: 2024 },
  JPN: { iso3: 'JPN', political_rights: 40, civil_liberties: 56, total: 96, status: 'Free', change_vs_prev: 0, year: 2024 },
  AUS: { iso3: 'AUS', political_rights: 38, civil_liberties: 57, total: 95, status: 'Free', change_vs_prev: 0, year: 2024 },
  KOR: { iso3: 'KOR', political_rights: 33, civil_liberties: 50, total: 83, status: 'Free', change_vs_prev: -1, year: 2024 },
  POL: { iso3: 'POL', political_rights: 37, civil_liberties: 44, total: 81, status: 'Free', change_vs_prev: 4, year: 2024 },
  // Partly Free
  IND: { iso3: 'IND', political_rights: 33, civil_liberties: 33, total: 66, status: 'Partly Free', change_vs_prev: -1, year: 2024 },
  TUR: { iso3: 'TUR', political_rights: 16, civil_liberties: 17, total: 33, status: 'Not Free', change_vs_prev: -1, year: 2024 },
  HUN: { iso3: 'HUN', political_rights: 26, civil_liberties: 39, total: 65, status: 'Partly Free', change_vs_prev: 0, year: 2024 },
  MEX: { iso3: 'MEX', political_rights: 27, civil_liberties: 33, total: 60, status: 'Partly Free', change_vs_prev: 0, year: 2024 },
  BRA: { iso3: 'BRA', political_rights: 32, civil_liberties: 40, total: 72, status: 'Free', change_vs_prev: 0, year: 2024 },
  ARG: { iso3: 'ARG', political_rights: 33, civil_liberties: 52, total: 85, status: 'Free', change_vs_prev: 0, year: 2024 },
  ZAF: { iso3: 'ZAF', political_rights: 31, civil_liberties: 48, total: 79, status: 'Free', change_vs_prev: 0, year: 2024 },
  NGA: { iso3: 'NGA', political_rights: 21, civil_liberties: 24, total: 45, status: 'Partly Free', change_vs_prev: 0, year: 2024 },
  // Not Free
  CHN: { iso3: 'CHN', political_rights: -2, civil_liberties: 11, total: 9, status: 'Not Free', change_vs_prev: 0, year: 2024 },
  RUS: { iso3: 'RUS', political_rights: 5, civil_liberties: 8, total: 13, status: 'Not Free', change_vs_prev: -3, year: 2024 },
  IRN: { iso3: 'IRN', political_rights: 4, civil_liberties: 8, total: 12, status: 'Not Free', change_vs_prev: 0, year: 2024 },
  SAU: { iso3: 'SAU', political_rights: 1, civil_liberties: 6, total: 7, status: 'Not Free', change_vs_prev: 0, year: 2024 },
  EGY: { iso3: 'EGY', political_rights: 6, civil_liberties: 12, total: 18, status: 'Not Free', change_vs_prev: 0, year: 2024 },
  PRK: { iso3: 'PRK', political_rights: 0, civil_liberties: 3, total: 3, status: 'Not Free', change_vs_prev: 0, year: 2024 },
  BLR: { iso3: 'BLR', political_rights: 1, civil_liberties: 7, total: 8, status: 'Not Free', change_vs_prev: 0, year: 2024 },
  SYR: { iso3: 'SYR', political_rights: 0, civil_liberties: 1, total: 1, status: 'Not Free', change_vs_prev: 0, year: 2024 },
  AFG: { iso3: 'AFG', political_rights: 0, civil_liberties: 6, total: 6, status: 'Not Free', change_vs_prev: 0, year: 2024 },
  VEN: { iso3: 'VEN', political_rights: 2, civil_liberties: 13, total: 15, status: 'Not Free', change_vs_prev: 0, year: 2024 },
  CUB: { iso3: 'CUB', political_rights: 1, civil_liberties: 11, total: 12, status: 'Not Free', change_vs_prev: 0, year: 2024 },
  PAK: { iso3: 'PAK', political_rights: 14, civil_liberties: 23, total: 37, status: 'Partly Free', change_vs_prev: -1, year: 2024 },
  UKR: { iso3: 'UKR', political_rights: 23, civil_liberties: 27, total: 50, status: 'Partly Free', change_vs_prev: -1, year: 2024 },
}

export const VDEM_DETAILED: Record<string, VdemScores> = {
  USA: { iso3: 'USA', v2x_polyarchy: 0.79, v2x_libdem: 0.71, v2x_partipdem: 0.51, v2x_delibdem: 0.65, v2x_egaldem: 0.55, v2x_regime: 3, year: 2023 },
  GBR: { iso3: 'GBR', v2x_polyarchy: 0.83, v2x_libdem: 0.75, v2x_partipdem: 0.49, v2x_delibdem: 0.68, v2x_egaldem: 0.60, v2x_regime: 3, year: 2023 },
  FRA: { iso3: 'FRA', v2x_polyarchy: 0.81, v2x_libdem: 0.73, v2x_partipdem: 0.50, v2x_delibdem: 0.66, v2x_egaldem: 0.58, v2x_regime: 3, year: 2023 },
  DEU: { iso3: 'DEU', v2x_polyarchy: 0.86, v2x_libdem: 0.79, v2x_partipdem: 0.55, v2x_delibdem: 0.71, v2x_egaldem: 0.65, v2x_regime: 3, year: 2023 },
  ESP: { iso3: 'ESP', v2x_polyarchy: 0.82, v2x_libdem: 0.74, v2x_partipdem: 0.52, v2x_delibdem: 0.69, v2x_egaldem: 0.62, v2x_regime: 3, year: 2023 },
  ITA: { iso3: 'ITA', v2x_polyarchy: 0.79, v2x_libdem: 0.69, v2x_partipdem: 0.50, v2x_delibdem: 0.65, v2x_egaldem: 0.55, v2x_regime: 3, year: 2023 },
  CAN: { iso3: 'CAN', v2x_polyarchy: 0.84, v2x_libdem: 0.77, v2x_partipdem: 0.54, v2x_delibdem: 0.71, v2x_egaldem: 0.62, v2x_regime: 3, year: 2023 },
  JPN: { iso3: 'JPN', v2x_polyarchy: 0.79, v2x_libdem: 0.69, v2x_partipdem: 0.48, v2x_delibdem: 0.66, v2x_egaldem: 0.58, v2x_regime: 3, year: 2023 },
  KOR: { iso3: 'KOR', v2x_polyarchy: 0.71, v2x_libdem: 0.63, v2x_partipdem: 0.45, v2x_delibdem: 0.62, v2x_egaldem: 0.55, v2x_regime: 2, year: 2023 },
  POL: { iso3: 'POL', v2x_polyarchy: 0.62, v2x_libdem: 0.46, v2x_partipdem: 0.40, v2x_delibdem: 0.45, v2x_egaldem: 0.42, v2x_regime: 2, year: 2023 },
  HUN: { iso3: 'HUN', v2x_polyarchy: 0.51, v2x_libdem: 0.36, v2x_partipdem: 0.33, v2x_delibdem: 0.32, v2x_egaldem: 0.38, v2x_regime: 1, year: 2023 },
  IND: { iso3: 'IND', v2x_polyarchy: 0.43, v2x_libdem: 0.32, v2x_partipdem: 0.30, v2x_delibdem: 0.31, v2x_egaldem: 0.35, v2x_regime: 1, year: 2023 },
  BRA: { iso3: 'BRA', v2x_polyarchy: 0.71, v2x_libdem: 0.59, v2x_partipdem: 0.43, v2x_delibdem: 0.58, v2x_egaldem: 0.48, v2x_regime: 2, year: 2023 },
  ARG: { iso3: 'ARG', v2x_polyarchy: 0.78, v2x_libdem: 0.68, v2x_partipdem: 0.48, v2x_delibdem: 0.65, v2x_egaldem: 0.55, v2x_regime: 3, year: 2023 },
  MEX: { iso3: 'MEX', v2x_polyarchy: 0.55, v2x_libdem: 0.42, v2x_partipdem: 0.35, v2x_delibdem: 0.40, v2x_egaldem: 0.38, v2x_regime: 1, year: 2023 },
  TUR: { iso3: 'TUR', v2x_polyarchy: 0.30, v2x_libdem: 0.18, v2x_partipdem: 0.22, v2x_delibdem: 0.20, v2x_egaldem: 0.25, v2x_regime: 1, year: 2023 },
  RUS: { iso3: 'RUS', v2x_polyarchy: 0.15, v2x_libdem: 0.08, v2x_partipdem: 0.12, v2x_delibdem: 0.10, v2x_egaldem: 0.15, v2x_regime: 0, year: 2023 },
  CHN: { iso3: 'CHN', v2x_polyarchy: 0.06, v2x_libdem: 0.04, v2x_partipdem: 0.05, v2x_delibdem: 0.04, v2x_egaldem: 0.08, v2x_regime: 0, year: 2023 },
  IRN: { iso3: 'IRN', v2x_polyarchy: 0.18, v2x_libdem: 0.10, v2x_partipdem: 0.15, v2x_delibdem: 0.12, v2x_egaldem: 0.16, v2x_regime: 0, year: 2023 },
  EGY: { iso3: 'EGY', v2x_polyarchy: 0.16, v2x_libdem: 0.09, v2x_partipdem: 0.12, v2x_delibdem: 0.10, v2x_egaldem: 0.13, v2x_regime: 0, year: 2023 },
  SAU: { iso3: 'SAU', v2x_polyarchy: 0.02, v2x_libdem: 0.02, v2x_partipdem: 0.02, v2x_delibdem: 0.02, v2x_egaldem: 0.05, v2x_regime: 0, year: 2023 },
  PRK: { iso3: 'PRK', v2x_polyarchy: 0.01, v2x_libdem: 0.01, v2x_partipdem: 0.01, v2x_delibdem: 0.01, v2x_egaldem: 0.03, v2x_regime: 0, year: 2023 },
  VEN: { iso3: 'VEN', v2x_polyarchy: 0.18, v2x_libdem: 0.11, v2x_partipdem: 0.18, v2x_delibdem: 0.15, v2x_egaldem: 0.20, v2x_regime: 0, year: 2023 },
  UKR: { iso3: 'UKR', v2x_polyarchy: 0.61, v2x_libdem: 0.45, v2x_partipdem: 0.40, v2x_delibdem: 0.48, v2x_egaldem: 0.42, v2x_regime: 2, year: 2023 },
  PAK: { iso3: 'PAK', v2x_polyarchy: 0.32, v2x_libdem: 0.20, v2x_partipdem: 0.25, v2x_delibdem: 0.22, v2x_egaldem: 0.28, v2x_regime: 1, year: 2023 },
  ZAF: { iso3: 'ZAF', v2x_polyarchy: 0.73, v2x_libdem: 0.61, v2x_partipdem: 0.50, v2x_delibdem: 0.60, v2x_egaldem: 0.52, v2x_regime: 3, year: 2023 },
  NGA: { iso3: 'NGA', v2x_polyarchy: 0.43, v2x_libdem: 0.31, v2x_partipdem: 0.32, v2x_delibdem: 0.30, v2x_egaldem: 0.35, v2x_regime: 1, year: 2023 },
}

export function getFreedomHouse(iso3: string): FreedomScores | null {
  return FREEDOM_HOUSE[iso3.toUpperCase()] || null
}

export function getVdemDetailed(iso3: string): VdemScores | null {
  return VDEM_DETAILED[iso3.toUpperCase()] || null
}
