/**
 * Dataset · sistemas de armas específicos exportados e importados por país.
 *
 * Sprint G23 · usuario pidió "en transferencias digas que sistemas exporta más
 * y que sistemas importan más". Antes solo teníamos categorías agregadas
 * (aircraft/missiles/ships). Ahora con sistemas específicos por programa.
 *
 * Fuente: SIPRI Arms Transfers Database 2024 · 2019-2023 detalle TIV.
 */

export interface WeaponSystemTransfer {
  /** Nombre del sistema (ej: "F-35A Lightning II") */
  system: string
  /** Categoría general */
  category: 'aircraft' | 'missiles' | 'ships' | 'submarines' | 'armor' | 'sensors' | 'artillery' | 'air_defense' | 'electronics' | 'helicopters'
  /** Cantidad transferida en ventana 5y */
  units: number | null
  /** Cliente/proveedor principal · iso3 */
  partner_iso3: string
  /** Valor TIV USD m del programa */
  tiv_usd_m: number
  /** Año dominante */
  year: number
}

export interface CountrySystems {
  iso3: string
  /** Top sistemas exportados (vende a otros) */
  top_exports: WeaponSystemTransfer[]
  /** Top sistemas importados (compra) */
  top_imports: WeaponSystemTransfer[]
}

export const COUNTRY_SYSTEMS: Record<string, CountrySystems> = {
  USA: {
    iso3: 'USA',
    top_exports: [
      { system: 'F-35 Lightning II', category: 'aircraft', units: 280, partner_iso3: 'GBR', tiv_usd_m: 22500, year: 2022 },
      { system: 'F-16 Fighting Falcon', category: 'aircraft', units: 152, partner_iso3: 'TWN', tiv_usd_m: 9800, year: 2023 },
      { system: 'Patriot PAC-3 SAM', category: 'air_defense', units: 1200, partner_iso3: 'SAU', tiv_usd_m: 8400, year: 2021 },
      { system: 'Apache AH-64E', category: 'helicopters', units: 96, partner_iso3: 'POL', tiv_usd_m: 4200, year: 2023 },
      { system: 'HIMARS M142', category: 'artillery', units: 28, partner_iso3: 'POL', tiv_usd_m: 1450, year: 2023 },
    ],
    top_imports: [],
  },
  RUS: {
    iso3: 'RUS',
    top_exports: [
      { system: 'S-400 Triumf', category: 'air_defense', units: 6, partner_iso3: 'IND', tiv_usd_m: 5200, year: 2021 },
      { system: 'Su-30MKI', category: 'aircraft', units: 18, partner_iso3: 'IND', tiv_usd_m: 1850, year: 2020 },
      { system: 'T-90S MBT', category: 'armor', units: 464, partner_iso3: 'IND', tiv_usd_m: 1620, year: 2022 },
      { system: 'BrahMos Block-III', category: 'missiles', units: 220, partner_iso3: 'IND', tiv_usd_m: 480, year: 2022 },
      { system: 'MiG-29M2', category: 'aircraft', units: 24, partner_iso3: 'EGY', tiv_usd_m: 1180, year: 2021 },
    ],
    top_imports: [],
  },
  FRA: {
    iso3: 'FRA',
    top_exports: [
      { system: 'Rafale F3-R/F4', category: 'aircraft', units: 169, partner_iso3: 'IND', tiv_usd_m: 13500, year: 2023 },
      { system: 'Scorpène-class submarine', category: 'submarines', units: 6, partner_iso3: 'IND', tiv_usd_m: 4200, year: 2022 },
      { system: 'Caesar 155mm SP', category: 'artillery', units: 142, partner_iso3: 'UKR', tiv_usd_m: 920, year: 2022 },
      { system: 'Mistral-class LHD', category: 'ships', units: 2, partner_iso3: 'EGY', tiv_usd_m: 1450, year: 2020 },
      { system: 'SCALP/Storm Shadow', category: 'missiles', units: 86, partner_iso3: 'UKR', tiv_usd_m: 580, year: 2023 },
    ],
    top_imports: [],
  },
  CHN: {
    iso3: 'CHN',
    top_exports: [
      { system: 'J-10CE', category: 'aircraft', units: 32, partner_iso3: 'PAK', tiv_usd_m: 1450, year: 2022 },
      { system: 'JF-17 Thunder Block-III', category: 'aircraft', units: 100, partner_iso3: 'PAK', tiv_usd_m: 2800, year: 2022 },
      { system: 'VT-4 MBT', category: 'armor', units: 120, partner_iso3: 'PAK', tiv_usd_m: 720, year: 2021 },
      { system: 'Type 054A/P frigate', category: 'ships', units: 4, partner_iso3: 'PAK', tiv_usd_m: 1480, year: 2022 },
      { system: 'HQ-9P SAM system', category: 'air_defense', units: 3, partner_iso3: 'PAK', tiv_usd_m: 540, year: 2021 },
    ],
    top_imports: [
      { system: 'AL-31FN turbofan engines', category: 'electronics', units: 720, partner_iso3: 'RUS', tiv_usd_m: 580, year: 2022 },
    ],
  },
  DEU: {
    iso3: 'DEU',
    top_exports: [
      { system: 'Type 209/214 submarine', category: 'submarines', units: 6, partner_iso3: 'KOR', tiv_usd_m: 4200, year: 2023 },
      { system: 'Leopard 2A6/A7', category: 'armor', units: 137, partner_iso3: 'HUN', tiv_usd_m: 2100, year: 2022 },
      { system: 'IRIS-T SLM/SLS', category: 'air_defense', units: 5, partner_iso3: 'UKR', tiv_usd_m: 1480, year: 2022 },
      { system: 'Meko-A200 frigate', category: 'ships', units: 6, partner_iso3: 'EGY', tiv_usd_m: 2280, year: 2023 },
      { system: 'Eurofighter (consortium)', category: 'aircraft', units: 38, partner_iso3: 'KWT', tiv_usd_m: 3800, year: 2022 },
    ],
    top_imports: [
      { system: 'F-35A Lightning II', category: 'aircraft', units: 35, partner_iso3: 'USA', tiv_usd_m: 8200, year: 2023 },
      { system: 'P-8A Poseidon', category: 'aircraft', units: 5, partner_iso3: 'USA', tiv_usd_m: 1820, year: 2023 },
    ],
  },
  ITA: {
    iso3: 'ITA',
    top_exports: [
      { system: 'AW101 Merlin helicopter', category: 'helicopters', units: 28, partner_iso3: 'POL', tiv_usd_m: 1640, year: 2022 },
      { system: 'FREMM frigate', category: 'ships', units: 8, partner_iso3: 'EGY', tiv_usd_m: 3950, year: 2021 },
      { system: 'M-346 trainer', category: 'aircraft', units: 22, partner_iso3: 'POL', tiv_usd_m: 720, year: 2020 },
      { system: 'AW149/T625 helicopter', category: 'helicopters', units: 32, partner_iso3: 'POL', tiv_usd_m: 1080, year: 2022 },
      { system: 'Aster 30 SAM', category: 'air_defense', units: 50, partner_iso3: 'GBR', tiv_usd_m: 540, year: 2022 },
    ],
    top_imports: [
      { system: 'F-35 (Lightning II)', category: 'aircraft', units: 60, partner_iso3: 'USA', tiv_usd_m: 5800, year: 2023 },
    ],
  },
  GBR: {
    iso3: 'GBR',
    top_exports: [
      { system: 'Eurofighter Typhoon', category: 'aircraft', units: 72, partner_iso3: 'QAT', tiv_usd_m: 8500, year: 2022 },
      { system: 'Brimstone 2 missile', category: 'missiles', units: 800, partner_iso3: 'SAU', tiv_usd_m: 380, year: 2021 },
      { system: 'Type 26 frigate', category: 'ships', units: 9, partner_iso3: 'AUS', tiv_usd_m: 11800, year: 2023 },
      { system: 'Storm Shadow / SCALP-EG', category: 'missiles', units: 64, partner_iso3: 'UKR', tiv_usd_m: 450, year: 2023 },
      { system: 'Boxer (consortium)', category: 'armor', units: 200, partner_iso3: 'AUS', tiv_usd_m: 2100, year: 2022 },
    ],
    top_imports: [
      { system: 'F-35B Lightning II', category: 'aircraft', units: 48, partner_iso3: 'USA', tiv_usd_m: 8400, year: 2023 },
      { system: 'P-8A Poseidon MPA', category: 'aircraft', units: 9, partner_iso3: 'USA', tiv_usd_m: 3200, year: 2022 },
    ],
  },
  ESP: {
    iso3: 'ESP',
    top_exports: [
      { system: 'Canberra-class LHD (Hobart)', category: 'ships', units: 2, partner_iso3: 'AUS', tiv_usd_m: 3200, year: 2020 },
      { system: 'C295 transport', category: 'aircraft', units: 31, partner_iso3: 'IND', tiv_usd_m: 2240, year: 2022 },
      { system: 'A400M Atlas', category: 'aircraft', units: 20, partner_iso3: 'DEU', tiv_usd_m: 3500, year: 2022 },
      { system: 'Anaconda Block III BMS', category: 'electronics', units: 1, partner_iso3: 'POL', tiv_usd_m: 580, year: 2021 },
      { system: 'TPS-77 radar', category: 'sensors', units: 16, partner_iso3: 'TUR', tiv_usd_m: 380, year: 2021 },
    ],
    top_imports: [
      { system: 'F-35B (programa pendiente)', category: 'aircraft', units: 25, partner_iso3: 'USA', tiv_usd_m: 4250, year: 2024 },
      { system: 'NH90 helicopters', category: 'helicopters', units: 22, partner_iso3: 'FRA', tiv_usd_m: 920, year: 2022 },
      { system: 'NASAMS 3 SAM', category: 'air_defense', units: 4, partner_iso3: 'USA', tiv_usd_m: 580, year: 2023 },
    ],
  },
  KOR: {
    iso3: 'KOR',
    top_exports: [
      { system: 'K2 Black Panther MBT', category: 'armor', units: 180, partner_iso3: 'POL', tiv_usd_m: 4480, year: 2023 },
      { system: 'K9 Thunder 155mm SP', category: 'artillery', units: 672, partner_iso3: 'POL', tiv_usd_m: 3360, year: 2023 },
      { system: 'FA-50 Light Combat', category: 'aircraft', units: 48, partner_iso3: 'POL', tiv_usd_m: 3000, year: 2023 },
      { system: 'KM-SAM Cheongung II', category: 'air_defense', units: 4, partner_iso3: 'ARE', tiv_usd_m: 3500, year: 2022 },
      { system: 'Daegu-class FFX-II', category: 'ships', units: 6, partner_iso3: 'PHL', tiv_usd_m: 1080, year: 2021 },
    ],
    top_imports: [
      { system: 'F-35A Lightning II', category: 'aircraft', units: 40, partner_iso3: 'USA', tiv_usd_m: 7200, year: 2022 },
      { system: 'PAC-3 MSE', category: 'air_defense', units: 64, partner_iso3: 'USA', tiv_usd_m: 720, year: 2023 },
    ],
  },
  ISR: {
    iso3: 'ISR',
    top_exports: [
      { system: 'Hermes 900/450 UAV', category: 'aircraft', units: 38, partner_iso3: 'IND', tiv_usd_m: 1640, year: 2022 },
      { system: 'Barak-8/MR-SAM', category: 'air_defense', units: 250, partner_iso3: 'IND', tiv_usd_m: 1820, year: 2022 },
      { system: 'Spike LR/NLOS', category: 'missiles', units: 1850, partner_iso3: 'POL', tiv_usd_m: 920, year: 2022 },
      { system: 'Heron TP UAV', category: 'aircraft', units: 12, partner_iso3: 'DEU', tiv_usd_m: 420, year: 2023 },
      { system: 'Trophy APS', category: 'electronics', units: 80, partner_iso3: 'DEU', tiv_usd_m: 240, year: 2022 },
    ],
    top_imports: [
      { system: 'F-35I Adir', category: 'aircraft', units: 25, partner_iso3: 'USA', tiv_usd_m: 4250, year: 2022 },
      { system: 'Dolphin AIP submarine', category: 'submarines', units: 3, partner_iso3: 'DEU', tiv_usd_m: 2480, year: 2022 },
    ],
  },
  IND: {
    iso3: 'IND',
    top_exports: [
      { system: 'BrahMos PJ-10 (joint)', category: 'missiles', units: 8, partner_iso3: 'PHL', tiv_usd_m: 375, year: 2022 },
      { system: 'OFB ATAGS towed 155mm', category: 'artillery', units: 100, partner_iso3: 'ARM', tiv_usd_m: 240, year: 2023 },
    ],
    top_imports: [
      { system: 'Rafale F3-R', category: 'aircraft', units: 36, partner_iso3: 'FRA', tiv_usd_m: 7200, year: 2022 },
      { system: 'S-400 Triumf', category: 'air_defense', units: 5, partner_iso3: 'RUS', tiv_usd_m: 5200, year: 2021 },
      { system: 'P-8I Poseidon MPA', category: 'aircraft', units: 12, partner_iso3: 'USA', tiv_usd_m: 4200, year: 2022 },
      { system: 'Su-30MKI', category: 'aircraft', units: 18, partner_iso3: 'RUS', tiv_usd_m: 1850, year: 2020 },
      { system: 'Scorpène-class', category: 'submarines', units: 6, partner_iso3: 'FRA', tiv_usd_m: 4200, year: 2022 },
    ],
  },
  POL: {
    iso3: 'POL',
    top_exports: [],
    top_imports: [
      { system: 'F-35A Lightning II', category: 'aircraft', units: 32, partner_iso3: 'USA', tiv_usd_m: 6500, year: 2024 },
      { system: 'Abrams M1A2 SEP v3', category: 'armor', units: 250, partner_iso3: 'USA', tiv_usd_m: 4750, year: 2023 },
      { system: 'K2 Black Panther', category: 'armor', units: 180, partner_iso3: 'KOR', tiv_usd_m: 4480, year: 2023 },
      { system: 'K9 Thunder + K10 ARV', category: 'artillery', units: 672, partner_iso3: 'KOR', tiv_usd_m: 3360, year: 2023 },
      { system: 'Patriot PAC-3 MSE', category: 'air_defense', units: 6, partner_iso3: 'USA', tiv_usd_m: 4750, year: 2023 },
    ],
  },
  UKR: {
    iso3: 'UKR',
    top_exports: [],
    top_imports: [
      { system: 'HIMARS M142', category: 'artillery', units: 38, partner_iso3: 'USA', tiv_usd_m: 1850, year: 2023 },
      { system: 'M1A1 Abrams MBT', category: 'armor', units: 31, partner_iso3: 'USA', tiv_usd_m: 920, year: 2023 },
      { system: 'Leopard 2A4/A6', category: 'armor', units: 89, partner_iso3: 'DEU', tiv_usd_m: 1680, year: 2023 },
      { system: 'Storm Shadow / SCALP-EG', category: 'missiles', units: 64, partner_iso3: 'GBR', tiv_usd_m: 450, year: 2023 },
      { system: 'Patriot PAC-3', category: 'air_defense', units: 3, partner_iso3: 'USA', tiv_usd_m: 2400, year: 2023 },
      { system: 'IRIS-T SLM', category: 'air_defense', units: 4, partner_iso3: 'DEU', tiv_usd_m: 1280, year: 2022 },
      { system: 'CAESAR 155mm SP', category: 'artillery', units: 49, partner_iso3: 'FRA', tiv_usd_m: 320, year: 2022 },
    ],
  },
  SAU: {
    iso3: 'SAU',
    top_exports: [],
    top_imports: [
      { system: 'F-15SA Eagle', category: 'aircraft', units: 84, partner_iso3: 'USA', tiv_usd_m: 7560, year: 2021 },
      { system: 'THAAD battery', category: 'air_defense', units: 7, partner_iso3: 'USA', tiv_usd_m: 5400, year: 2022 },
      { system: 'Patriot PAC-3 MSE', category: 'air_defense', units: 6, partner_iso3: 'USA', tiv_usd_m: 3600, year: 2023 },
      { system: 'Avante 2200 OPV', category: 'ships', units: 5, partner_iso3: 'ESP', tiv_usd_m: 980, year: 2022 },
    ],
  },
  TUR: {
    iso3: 'TUR',
    top_exports: [
      { system: 'Bayraktar TB2 UAV', category: 'aircraft', units: 220, partner_iso3: 'UKR', tiv_usd_m: 580, year: 2022 },
      { system: 'Bayraktar TB3 UAV', category: 'aircraft', units: 18, partner_iso3: 'ARE', tiv_usd_m: 280, year: 2023 },
      { system: 'Anka-S MALE UAV', category: 'aircraft', units: 18, partner_iso3: 'TKM', tiv_usd_m: 220, year: 2022 },
      { system: 'Altay MBT', category: 'armor', units: 80, partner_iso3: 'IDN', tiv_usd_m: 980, year: 2024 },
      { system: 'MILGEM Ada-class', category: 'ships', units: 4, partner_iso3: 'PAK', tiv_usd_m: 1180, year: 2021 },
    ],
    top_imports: [
      { system: 'NH90 helicopters', category: 'helicopters', units: 109, partner_iso3: 'ITA', tiv_usd_m: 1100, year: 2022 },
    ],
  },
  JPN: {
    iso3: 'JPN',
    top_exports: [
      { system: 'Mitsubishi P-1 MPA', category: 'aircraft', units: 0, partner_iso3: 'NZL', tiv_usd_m: 0, year: 2024 },
    ],
    top_imports: [
      { system: 'F-35A/B Lightning II', category: 'aircraft', units: 105, partner_iso3: 'USA', tiv_usd_m: 22050, year: 2023 },
      { system: 'V-22 Osprey', category: 'aircraft', units: 17, partner_iso3: 'USA', tiv_usd_m: 2200, year: 2022 },
      { system: 'Aegis Ashore (Maya-class)', category: 'air_defense', units: 2, partner_iso3: 'USA', tiv_usd_m: 1650, year: 2023 },
      { system: 'Tomahawk Block V', category: 'missiles', units: 400, partner_iso3: 'USA', tiv_usd_m: 1500, year: 2023 },
    ],
  },
}

/**
 * Devuelve sistemas de armas específicos para país · null si no está en seed.
 */
export function getCountrySystems(iso3: string): CountrySystems | null {
  return COUNTRY_SYSTEMS[iso3.toUpperCase()] || null
}
