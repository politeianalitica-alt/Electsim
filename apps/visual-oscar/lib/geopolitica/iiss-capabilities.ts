/**
 * Dataset · IISS Military Balance · capacidades militares declaradas top 50.
 *
 * Cobertura: 50 países más relevantes por gasto militar absoluto o relativo.
 * Fuente original: IISS Military Balance 2024 (publicación anual febrero).
 *
 * Para refrescar:
 *   1. Comprar IISS Military Balance edición vigente
 *   2. Extraer cifras por categoría manualmente
 *   3. Actualizar este archivo (los valores no son fijos · cambian con tiempo)
 *
 * Valores aproximados a 2024 release. NULL = dato no público o variable.
 */

export interface IissCapability {
  iso3: string
  /** Personal activo total */
  active_personnel: number
  reservists: number | null
  /** Capacidades clave (números aproximados, varían con tiempo) */
  tanks_mbt: number | null
  ifv_apcs: number | null               // vehículos blindados infantería
  artillery_sp: number | null            // artillería autopropulsada
  combat_aircraft: number | null
  combat_uavs: number | null
  carriers_lhds: number | null
  submarines: number | null
  destroyers_frigates: number | null
  /** Cabezas nucleares operativas estimadas (5 declarados NPT + 4 de facto) */
  nuclear_warheads: number | null
  cyber_unit: boolean
  conscription: boolean
}

export const IISS_2024: Record<string, IissCapability> = {
  USA: { iso3: 'USA', active_personnel: 1330000, reservists: 800000, tanks_mbt: 2500, ifv_apcs: 35000, artillery_sp: 950, combat_aircraft: 2700, combat_uavs: 400, carriers_lhds: 20, submarines: 67, destroyers_frigates: 90, nuclear_warheads: 3700, cyber_unit: true, conscription: false },
  CHN: { iso3: 'CHN', active_personnel: 2035000, reservists: 510000, tanks_mbt: 4800, ifv_apcs: 14000, artillery_sp: 5800, combat_aircraft: 1700, combat_uavs: 200, carriers_lhds: 3, submarines: 60, destroyers_frigates: 90, nuclear_warheads: 500, cyber_unit: true, conscription: true },
  RUS: { iso3: 'RUS', active_personnel: 1320000, reservists: 1500000, tanks_mbt: 1900, ifv_apcs: 13000, artillery_sp: 4300, combat_aircraft: 1170, combat_uavs: 80, carriers_lhds: 1, submarines: 64, destroyers_frigates: 78, nuclear_warheads: 4500, cyber_unit: true, conscription: true },
  IND: { iso3: 'IND', active_personnel: 1455000, reservists: 1155000, tanks_mbt: 4600, ifv_apcs: 5500, artillery_sp: 350, combat_aircraft: 800, combat_uavs: 50, carriers_lhds: 2, submarines: 18, destroyers_frigates: 30, nuclear_warheads: 170, cyber_unit: true, conscription: false },
  SAU: { iso3: 'SAU', active_personnel: 250000, reservists: null, tanks_mbt: 1100, ifv_apcs: 7500, artillery_sp: 400, combat_aircraft: 380, combat_uavs: 30, carriers_lhds: 0, submarines: 0, destroyers_frigates: 11, nuclear_warheads: null, cyber_unit: true, conscription: false },
  GBR: { iso3: 'GBR', active_personnel: 138000, reservists: 78000, tanks_mbt: 220, ifv_apcs: 1200, artillery_sp: 89, combat_aircraft: 280, combat_uavs: 30, carriers_lhds: 2, submarines: 10, destroyers_frigates: 17, nuclear_warheads: 225, cyber_unit: true, conscription: false },
  DEU: { iso3: 'DEU', active_personnel: 184000, reservists: 31000, tanks_mbt: 313, ifv_apcs: 1100, artillery_sp: 121, combat_aircraft: 230, combat_uavs: 20, carriers_lhds: 0, submarines: 6, destroyers_frigates: 17, nuclear_warheads: null, cyber_unit: true, conscription: false },
  FRA: { iso3: 'FRA', active_personnel: 206000, reservists: 35000, tanks_mbt: 222, ifv_apcs: 1200, artillery_sp: 109, combat_aircraft: 230, combat_uavs: 30, carriers_lhds: 1, submarines: 10, destroyers_frigates: 22, nuclear_warheads: 290, cyber_unit: true, conscription: false },
  KOR: { iso3: 'KOR', active_personnel: 555000, reservists: 3100000, tanks_mbt: 2500, ifv_apcs: 5500, artillery_sp: 3400, combat_aircraft: 620, combat_uavs: 70, carriers_lhds: 2, submarines: 22, destroyers_frigates: 26, nuclear_warheads: null, cyber_unit: true, conscription: true },
  JPN: { iso3: 'JPN', active_personnel: 250000, reservists: 56000, tanks_mbt: 545, ifv_apcs: 1100, artillery_sp: 220, combat_aircraft: 320, combat_uavs: 25, carriers_lhds: 4, submarines: 22, destroyers_frigates: 36, nuclear_warheads: null, cyber_unit: true, conscription: false },
  ITA: { iso3: 'ITA', active_personnel: 165000, reservists: 18000, tanks_mbt: 200, ifv_apcs: 1900, artillery_sp: 70, combat_aircraft: 200, combat_uavs: 12, carriers_lhds: 2, submarines: 8, destroyers_frigates: 16, nuclear_warheads: null, cyber_unit: true, conscription: false },
  AUS: { iso3: 'AUS', active_personnel: 60000, reservists: 32000, tanks_mbt: 59, ifv_apcs: 700, artillery_sp: 35, combat_aircraft: 95, combat_uavs: 10, carriers_lhds: 2, submarines: 6, destroyers_frigates: 11, nuclear_warheads: null, cyber_unit: true, conscription: false },
  ISR: { iso3: 'ISR', active_personnel: 170000, reservists: 465000, tanks_mbt: 530, ifv_apcs: 3000, artillery_sp: 530, combat_aircraft: 345, combat_uavs: 60, carriers_lhds: 0, submarines: 5, destroyers_frigates: 7, nuclear_warheads: 90, cyber_unit: true, conscription: true },
  TUR: { iso3: 'TUR', active_personnel: 355000, reservists: 380000, tanks_mbt: 2350, ifv_apcs: 6500, artillery_sp: 1100, combat_aircraft: 290, combat_uavs: 110, carriers_lhds: 1, submarines: 12, destroyers_frigates: 16, nuclear_warheads: null, cyber_unit: true, conscription: true },
  IRN: { iso3: 'IRN', active_personnel: 610000, reservists: 350000, tanks_mbt: 1500, ifv_apcs: 1500, artillery_sp: 580, combat_aircraft: 330, combat_uavs: 250, carriers_lhds: 0, submarines: 19, destroyers_frigates: 6, nuclear_warheads: null, cyber_unit: true, conscription: true },
  PAK: { iso3: 'PAK', active_personnel: 640000, reservists: 550000, tanks_mbt: 2200, ifv_apcs: 2800, artillery_sp: 360, combat_aircraft: 400, combat_uavs: 50, carriers_lhds: 0, submarines: 9, destroyers_frigates: 11, nuclear_warheads: 170, cyber_unit: true, conscription: false },
  POL: { iso3: 'POL', active_personnel: 165000, reservists: 100000, tanks_mbt: 600, ifv_apcs: 1600, artillery_sp: 600, combat_aircraft: 100, combat_uavs: 20, carriers_lhds: 0, submarines: 1, destroyers_frigates: 4, nuclear_warheads: null, cyber_unit: true, conscription: false },
  UKR: { iso3: 'UKR', active_personnel: 900000, reservists: 1200000, tanks_mbt: 1100, ifv_apcs: 7000, artillery_sp: 850, combat_aircraft: 70, combat_uavs: 400, carriers_lhds: 0, submarines: 0, destroyers_frigates: 1, nuclear_warheads: null, cyber_unit: true, conscription: true },
  CAN: { iso3: 'CAN', active_personnel: 63000, reservists: 23000, tanks_mbt: 82, ifv_apcs: 670, artillery_sp: 25, combat_aircraft: 75, combat_uavs: 8, carriers_lhds: 0, submarines: 4, destroyers_frigates: 12, nuclear_warheads: null, cyber_unit: true, conscription: false },
  ESP: { iso3: 'ESP', active_personnel: 124000, reservists: 13000, tanks_mbt: 240, ifv_apcs: 1850, artillery_sp: 105, combat_aircraft: 130, combat_uavs: 15, carriers_lhds: 1, submarines: 2, destroyers_frigates: 11, nuclear_warheads: null, cyber_unit: true, conscription: false },
  NLD: { iso3: 'NLD', active_personnel: 40000, reservists: 6000, tanks_mbt: 18, ifv_apcs: 590, artillery_sp: 36, combat_aircraft: 60, combat_uavs: 5, carriers_lhds: 1, submarines: 4, destroyers_frigates: 6, nuclear_warheads: null, cyber_unit: true, conscription: false },
  GRC: { iso3: 'GRC', active_personnel: 142000, reservists: 220000, tanks_mbt: 1300, ifv_apcs: 2500, artillery_sp: 415, combat_aircraft: 170, combat_uavs: 8, carriers_lhds: 0, submarines: 11, destroyers_frigates: 13, nuclear_warheads: null, cyber_unit: true, conscription: true },
  BRA: { iso3: 'BRA', active_personnel: 365000, reservists: 1340000, tanks_mbt: 220, ifv_apcs: 1900, artillery_sp: 110, combat_aircraft: 50, combat_uavs: 10, carriers_lhds: 0, submarines: 5, destroyers_frigates: 7, nuclear_warheads: null, cyber_unit: true, conscription: true },
  EGY: { iso3: 'EGY', active_personnel: 440000, reservists: 480000, tanks_mbt: 3700, ifv_apcs: 3700, artillery_sp: 1200, combat_aircraft: 460, combat_uavs: 30, carriers_lhds: 2, submarines: 8, destroyers_frigates: 13, nuclear_warheads: null, cyber_unit: true, conscription: true },
  PRK: { iso3: 'PRK', active_personnel: 1280000, reservists: 600000, tanks_mbt: 3500, ifv_apcs: 5500, artillery_sp: 4400, combat_aircraft: 540, combat_uavs: 80, carriers_lhds: 0, submarines: 35, destroyers_frigates: 3, nuclear_warheads: 50, cyber_unit: true, conscription: true },
  TWN: { iso3: 'TWN', active_personnel: 169000, reservists: 1655000, tanks_mbt: 800, ifv_apcs: 950, artillery_sp: 270, combat_aircraft: 290, combat_uavs: 30, carriers_lhds: 0, submarines: 4, destroyers_frigates: 26, nuclear_warheads: null, cyber_unit: true, conscription: true },
  SGP: { iso3: 'SGP', active_personnel: 72000, reservists: 312000, tanks_mbt: 196, ifv_apcs: 1200, artillery_sp: 56, combat_aircraft: 100, combat_uavs: 15, carriers_lhds: 4, submarines: 4, destroyers_frigates: 6, nuclear_warheads: null, cyber_unit: true, conscription: true },
  IDN: { iso3: 'IDN', active_personnel: 396000, reservists: 400000, tanks_mbt: 100, ifv_apcs: 1300, artillery_sp: 90, combat_aircraft: 110, combat_uavs: 10, carriers_lhds: 0, submarines: 4, destroyers_frigates: 7, nuclear_warheads: null, cyber_unit: true, conscription: true },
  VNM: { iso3: 'VNM', active_personnel: 482000, reservists: 5000000, tanks_mbt: 1300, ifv_apcs: 2000, artillery_sp: 700, combat_aircraft: 80, combat_uavs: 15, carriers_lhds: 0, submarines: 6, destroyers_frigates: 9, nuclear_warheads: null, cyber_unit: true, conscription: true },
  THA: { iso3: 'THA', active_personnel: 360000, reservists: 200000, tanks_mbt: 600, ifv_apcs: 1500, artillery_sp: 280, combat_aircraft: 120, combat_uavs: 5, carriers_lhds: 1, submarines: 0, destroyers_frigates: 9, nuclear_warheads: null, cyber_unit: true, conscription: true },
  PHL: { iso3: 'PHL', active_personnel: 144000, reservists: 130000, tanks_mbt: 0, ifv_apcs: 230, artillery_sp: 60, combat_aircraft: 12, combat_uavs: 0, carriers_lhds: 0, submarines: 0, destroyers_frigates: 2, nuclear_warheads: null, cyber_unit: true, conscription: false },
  ARG: { iso3: 'ARG', active_personnel: 76000, reservists: 0, tanks_mbt: 200, ifv_apcs: 200, artillery_sp: 35, combat_aircraft: 25, combat_uavs: 2, carriers_lhds: 0, submarines: 3, destroyers_frigates: 4, nuclear_warheads: null, cyber_unit: false, conscription: false },
  MEX: { iso3: 'MEX', active_personnel: 277000, reservists: 81500, tanks_mbt: 0, ifv_apcs: 1700, artillery_sp: 30, combat_aircraft: 12, combat_uavs: 4, carriers_lhds: 0, submarines: 0, destroyers_frigates: 7, nuclear_warheads: null, cyber_unit: true, conscription: false },
  COL: { iso3: 'COL', active_personnel: 295000, reservists: 35000, tanks_mbt: 0, ifv_apcs: 600, artillery_sp: 24, combat_aircraft: 75, combat_uavs: 5, carriers_lhds: 0, submarines: 4, destroyers_frigates: 4, nuclear_warheads: null, cyber_unit: true, conscription: true },
  ZAF: { iso3: 'ZAF', active_personnel: 73000, reservists: 12000, tanks_mbt: 168, ifv_apcs: 940, artillery_sp: 43, combat_aircraft: 20, combat_uavs: 0, carriers_lhds: 0, submarines: 3, destroyers_frigates: 4, nuclear_warheads: null, cyber_unit: false, conscription: false },
  NGA: { iso3: 'NGA', active_personnel: 230000, reservists: 32000, tanks_mbt: 200, ifv_apcs: 500, artillery_sp: 30, combat_aircraft: 50, combat_uavs: 0, carriers_lhds: 0, submarines: 0, destroyers_frigates: 4, nuclear_warheads: null, cyber_unit: false, conscription: false },
  DZA: { iso3: 'DZA', active_personnel: 130000, reservists: 150000, tanks_mbt: 920, ifv_apcs: 1300, artillery_sp: 250, combat_aircraft: 200, combat_uavs: 15, carriers_lhds: 0, submarines: 8, destroyers_frigates: 10, nuclear_warheads: null, cyber_unit: false, conscription: true },
  MAR: { iso3: 'MAR', active_personnel: 200000, reservists: 150000, tanks_mbt: 1300, ifv_apcs: 1000, artillery_sp: 220, combat_aircraft: 80, combat_uavs: 18, carriers_lhds: 0, submarines: 0, destroyers_frigates: 7, nuclear_warheads: null, cyber_unit: false, conscription: true },
  ARE: { iso3: 'ARE', active_personnel: 64000, reservists: null, tanks_mbt: 440, ifv_apcs: 1000, artillery_sp: 220, combat_aircraft: 145, combat_uavs: 50, carriers_lhds: 0, submarines: 0, destroyers_frigates: 9, nuclear_warheads: null, cyber_unit: true, conscription: false },
  QAT: { iso3: 'QAT', active_personnel: 17000, reservists: null, tanks_mbt: 130, ifv_apcs: 400, artillery_sp: 60, combat_aircraft: 40, combat_uavs: 12, carriers_lhds: 0, submarines: 0, destroyers_frigates: 0, nuclear_warheads: null, cyber_unit: false, conscription: true },
  SWE: { iso3: 'SWE', active_personnel: 24000, reservists: 30000, tanks_mbt: 110, ifv_apcs: 600, artillery_sp: 26, combat_aircraft: 90, combat_uavs: 10, carriers_lhds: 0, submarines: 5, destroyers_frigates: 7, nuclear_warheads: null, cyber_unit: true, conscription: true },
  FIN: { iso3: 'FIN', active_personnel: 24000, reservists: 900000, tanks_mbt: 200, ifv_apcs: 1100, artillery_sp: 700, combat_aircraft: 60, combat_uavs: 0, carriers_lhds: 0, submarines: 0, destroyers_frigates: 4, nuclear_warheads: null, cyber_unit: true, conscription: true },
  NOR: { iso3: 'NOR', active_personnel: 24000, reservists: 40000, tanks_mbt: 36, ifv_apcs: 270, artillery_sp: 24, combat_aircraft: 50, combat_uavs: 0, carriers_lhds: 0, submarines: 6, destroyers_frigates: 4, nuclear_warheads: null, cyber_unit: true, conscription: true },
  ROU: { iso3: 'ROU', active_personnel: 71000, reservists: 50000, tanks_mbt: 850, ifv_apcs: 1700, artillery_sp: 130, combat_aircraft: 35, combat_uavs: 0, carriers_lhds: 0, submarines: 0, destroyers_frigates: 7, nuclear_warheads: null, cyber_unit: true, conscription: false },
  CZE: { iso3: 'CZE', active_personnel: 28000, reservists: 4000, tanks_mbt: 30, ifv_apcs: 200, artillery_sp: 50, combat_aircraft: 30, combat_uavs: 0, carriers_lhds: 0, submarines: 0, destroyers_frigates: 0, nuclear_warheads: null, cyber_unit: true, conscription: false },
  HUN: { iso3: 'HUN', active_personnel: 22000, reservists: 22000, tanks_mbt: 44, ifv_apcs: 380, artillery_sp: 24, combat_aircraft: 14, combat_uavs: 0, carriers_lhds: 0, submarines: 0, destroyers_frigates: 0, nuclear_warheads: null, cyber_unit: true, conscription: false },
  SYR: { iso3: 'SYR', active_personnel: 169000, reservists: 50000, tanks_mbt: 1900, ifv_apcs: 2000, artillery_sp: 380, combat_aircraft: 90, combat_uavs: null, carriers_lhds: 0, submarines: 0, destroyers_frigates: 0, nuclear_warheads: null, cyber_unit: false, conscription: true },
  YEM: { iso3: 'YEM', active_personnel: 50000, reservists: null, tanks_mbt: 200, ifv_apcs: 200, artillery_sp: 40, combat_aircraft: 10, combat_uavs: null, carriers_lhds: 0, submarines: 0, destroyers_frigates: 0, nuclear_warheads: null, cyber_unit: false, conscription: false },
  AFG: { iso3: 'AFG', active_personnel: 150000, reservists: null, tanks_mbt: 50, ifv_apcs: 250, artillery_sp: 5, combat_aircraft: 0, combat_uavs: 0, carriers_lhds: 0, submarines: 0, destroyers_frigates: 0, nuclear_warheads: null, cyber_unit: false, conscription: false },
}

export function getIissCapability(iso3: string): IissCapability | null {
  return IISS_2024[iso3.toUpperCase()] || null
}

/** Score capacidad militar agregada (0-100) · útil para scatter chart en panel 'Gasto vs Capacidad'. */
export function getCapabilityScore(iso3: string): number | null {
  const c = getIissCapability(iso3)
  if (!c) return null
  // Suma normalizada con pesos · NUM = no normalizada × peso
  let score = 0
  score += Math.log10((c.active_personnel || 0) + 1) * 6
  score += Math.log10((c.tanks_mbt || 0) + 1) * 4
  score += Math.log10((c.combat_aircraft || 0) + 1) * 6
  score += Math.log10((c.submarines || 0) + 1) * 5
  score += Math.log10((c.destroyers_frigates || 0) + 1) * 4
  score += c.carriers_lhds ? Math.log10(c.carriers_lhds + 1) * 8 : 0
  score += c.nuclear_warheads ? Math.log10(c.nuclear_warheads + 1) * 7 : 0
  score += c.cyber_unit ? 5 : 0
  return Math.min(100, Math.round(score))
}

export const IISS_COUNTRIES_COUNT = Object.keys(IISS_2024).length
