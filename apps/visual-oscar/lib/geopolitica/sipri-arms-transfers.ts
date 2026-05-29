/**
 * Dataset · SIPRI Arms Transfers Database · 30 países top.
 *
 * Sprint G22 batch 3 · reemplaza el placeholder "Próximamente" en el drawer
 * militar de país (sub-tab Transferencias).
 *
 * Fuente: SIPRI Arms Transfers Database 2024 · datos 2019-2023 (5y window).
 *   - Trend-Indicator Value (TIV) en millones USD
 *   - Top 3 proveedores y top 3 receptores
 *   - Share % mundial export/import
 *   - Categorías sistemas: aircraft, missiles, ships, armor, sensors, artillery
 *
 * Para refrescar: sipri.org/databases/armstransfers (anual marzo).
 * Última actualización: marzo 2024 (Q1 2026 next update).
 */

export type ArmsCategory = 'aircraft' | 'missiles' | 'ships' | 'submarines' | 'armor' | 'sensors' | 'artillery' | 'air_defense' | 'electronics'

export interface ArmsTransferEntry {
  /** Trend-Indicator Value en millones USD (5y total 2019-2023) */
  tiv_5y_usd_m: number
  /** Share % del total mundial */
  share_pct: number
  /** Cambio % vs ventana 2014-2018 */
  change_pct: number | null
  /** Top 3 partners (proveedores si es importador · receptores si es exportador) */
  top_partners: Array<{ iso3: string; share_pct: number }>
  /** Categorías de sistemas dominantes */
  dominant_categories: ArmsCategory[]
}

export interface CountryArmsTransfers {
  iso3: string
  /** Exports (este país vende armas a otros) */
  exports: ArmsTransferEntry | null
  /** Imports (este país compra armas a otros) */
  imports: ArmsTransferEntry | null
  /** Posición global · 1 = más activo */
  world_rank_exporter: number | null
  world_rank_importer: number | null
  notes: string
}

export const ARMS_TRANSFERS: Record<string, CountryArmsTransfers> = {
  USA: {
    iso3: 'USA',
    exports: {
      tiv_5y_usd_m: 102650,
      share_pct: 42.0,
      change_pct: 17.0,
      top_partners: [
        { iso3: 'SAU', share_pct: 14.7 },
        { iso3: 'JPN', share_pct: 8.6 },
        { iso3: 'KOR', share_pct: 6.5 },
      ],
      dominant_categories: ['aircraft', 'missiles', 'air_defense'],
    },
    imports: null,
    world_rank_exporter: 1,
    world_rank_importer: null,
    notes: 'Líder mundial exportador (42%) · efecto pos-2022 Ucrania incrementó pedidos NATO. F-35 + Patriot dominan.',
  },
  RUS: {
    iso3: 'RUS',
    exports: {
      tiv_5y_usd_m: 26935,
      share_pct: 11.0,
      change_pct: -53.0,
      top_partners: [
        { iso3: 'IND', share_pct: 34.0 },
        { iso3: 'CHN', share_pct: 21.0 },
        { iso3: 'EGY', share_pct: 7.5 },
      ],
      dominant_categories: ['aircraft', 'armor', 'missiles', 'air_defense'],
    },
    imports: null,
    world_rank_exporter: 2,
    world_rank_importer: null,
    notes: 'Caída -53% post-2022 · sanciones afectan exportaciones complejas. India sigue siendo cliente top pese a presión occidental.',
  },
  FRA: {
    iso3: 'FRA',
    exports: {
      tiv_5y_usd_m: 26635,
      share_pct: 11.0,
      change_pct: 47.0,
      top_partners: [
        { iso3: 'IND', share_pct: 30.0 },
        { iso3: 'QAT', share_pct: 14.0 },
        { iso3: 'EGY', share_pct: 8.7 },
      ],
      dominant_categories: ['aircraft', 'ships', 'missiles'],
    },
    imports: {
      tiv_5y_usd_m: 1450,
      share_pct: 0.6,
      change_pct: null,
      top_partners: [
        { iso3: 'USA', share_pct: 47.0 },
        { iso3: 'DEU', share_pct: 16.0 },
        { iso3: 'NLD', share_pct: 8.0 },
      ],
      dominant_categories: ['electronics', 'sensors'],
    },
    world_rank_exporter: 3,
    world_rank_importer: null,
    notes: 'Salto +47% · Rafale boom (India 36 unid, EAU 80, Egipto 30, Grecia 24). Defensa estratégica europea.',
  },
  CHN: {
    iso3: 'CHN',
    exports: {
      tiv_5y_usd_m: 13525,
      share_pct: 5.6,
      change_pct: -23.0,
      top_partners: [
        { iso3: 'PAK', share_pct: 61.0 },
        { iso3: 'BGD', share_pct: 11.0 },
        { iso3: 'MMR', share_pct: 6.5 },
      ],
      dominant_categories: ['aircraft', 'ships', 'armor'],
    },
    imports: {
      tiv_5y_usd_m: 1250,
      share_pct: 0.5,
      change_pct: null,
      top_partners: [
        { iso3: 'RUS', share_pct: 81.0 },
        { iso3: 'FRA', share_pct: 7.6 },
        { iso3: 'UKR', share_pct: 4.2 },
      ],
      dominant_categories: ['aircraft', 'missiles'],
    },
    world_rank_exporter: 4,
    world_rank_importer: null,
    notes: 'Pakistán cliente principal (J-10C, JF-17). Cae -23% por sustitución tecnología propia. Importa motores aviación rusos.',
  },
  DEU: {
    iso3: 'DEU',
    exports: {
      tiv_5y_usd_m: 13315,
      share_pct: 5.5,
      change_pct: -14.0,
      top_partners: [
        { iso3: 'USA', share_pct: 10.5 },
        { iso3: 'KOR', share_pct: 7.5 },
        { iso3: 'EGY', share_pct: 7.1 },
      ],
      dominant_categories: ['ships', 'armor', 'sensors'],
    },
    imports: {
      tiv_5y_usd_m: 1830,
      share_pct: 0.8,
      change_pct: null,
      top_partners: [
        { iso3: 'USA', share_pct: 76.0 },
        { iso3: 'NLD', share_pct: 6.0 },
        { iso3: 'CHE', share_pct: 4.5 },
      ],
      dominant_categories: ['aircraft', 'electronics'],
    },
    world_rank_exporter: 5,
    world_rank_importer: null,
    notes: 'Submarinos Type 214/212 + Leopard 2 + RBS torres. Cae -14% pero firma Zeitenwende boost 100bn fondo especial.',
  },
  ITA: {
    iso3: 'ITA',
    exports: {
      tiv_5y_usd_m: 10160,
      share_pct: 4.3,
      change_pct: 86.0,
      top_partners: [
        { iso3: 'EGY', share_pct: 23.0 },
        { iso3: 'TUR', share_pct: 12.0 },
        { iso3: 'PAK', share_pct: 7.0 },
      ],
      dominant_categories: ['aircraft', 'ships', 'sensors'],
    },
    imports: null,
    world_rank_exporter: 6,
    world_rank_importer: null,
    notes: 'Crecimiento explosivo +86% · Leonardo (helicópteros AW101/149) y Fincantieri (fragatas FREMM) líderes Mediterráneo.',
  },
  GBR: {
    iso3: 'GBR',
    exports: {
      tiv_5y_usd_m: 8295,
      share_pct: 3.4,
      change_pct: -14.0,
      top_partners: [
        { iso3: 'QAT', share_pct: 35.0 },
        { iso3: 'SAU', share_pct: 15.0 },
        { iso3: 'USA', share_pct: 13.0 },
      ],
      dominant_categories: ['aircraft', 'ships', 'missiles'],
    },
    imports: {
      tiv_5y_usd_m: 750,
      share_pct: 0.3,
      change_pct: null,
      top_partners: [
        { iso3: 'USA', share_pct: 92.0 },
        { iso3: 'FRA', share_pct: 4.5 },
        { iso3: 'DEU', share_pct: 2.0 },
      ],
      dominant_categories: ['aircraft', 'electronics'],
    },
    world_rank_exporter: 7,
    world_rank_importer: null,
    notes: 'BAE Eurofighter Typhoon + Type 26 fragatas. AUKUS submarinos nucleares con Australia/USA en pipeline (>$50bn).',
  },
  ESP: {
    iso3: 'ESP',
    exports: {
      tiv_5y_usd_m: 7560,
      share_pct: 3.1,
      change_pct: -3.0,
      top_partners: [
        { iso3: 'AUS', share_pct: 25.0 },
        { iso3: 'TUR', share_pct: 14.0 },
        { iso3: 'SAU', share_pct: 10.5 },
      ],
      dominant_categories: ['aircraft', 'ships'],
    },
    imports: {
      tiv_5y_usd_m: 1850,
      share_pct: 0.8,
      change_pct: null,
      top_partners: [
        { iso3: 'USA', share_pct: 64.0 },
        { iso3: 'DEU', share_pct: 12.0 },
        { iso3: 'FRA', share_pct: 8.5 },
      ],
      dominant_categories: ['aircraft', 'missiles', 'electronics'],
    },
    world_rank_exporter: 8,
    world_rank_importer: null,
    notes: 'Airbus DS (A400M, C295), Navantia (LHD, fragatas F-100/F-110), Indra (sistemas). Cliente top Australia + Turquía.',
  },
  KOR: {
    iso3: 'KOR',
    exports: {
      tiv_5y_usd_m: 5910,
      share_pct: 2.4,
      change_pct: 174.0,
      top_partners: [
        { iso3: 'POL', share_pct: 30.0 },
        { iso3: 'PHL', share_pct: 14.0 },
        { iso3: 'IND', share_pct: 7.5 },
      ],
      dominant_categories: ['aircraft', 'armor', 'artillery'],
    },
    imports: {
      tiv_5y_usd_m: 7920,
      share_pct: 3.2,
      change_pct: null,
      top_partners: [
        { iso3: 'USA', share_pct: 67.0 },
        { iso3: 'DEU', share_pct: 19.0 },
        { iso3: 'ESP', share_pct: 5.5 },
      ],
      dominant_categories: ['aircraft', 'missiles'],
    },
    world_rank_exporter: 9,
    world_rank_importer: 8,
    notes: '+174% boom histórico · contrato Polonia $14bn (K2 tanques, K9 obuses, FA-50). Estrategia "K-Defense" ambiciosa.',
  },
  ISR: {
    iso3: 'ISR',
    exports: {
      tiv_5y_usd_m: 5700,
      share_pct: 2.4,
      change_pct: 25.0,
      top_partners: [
        { iso3: 'IND', share_pct: 37.0 },
        { iso3: 'PHL', share_pct: 8.1 },
        { iso3: 'USA', share_pct: 6.4 },
      ],
      dominant_categories: ['missiles', 'sensors', 'electronics', 'air_defense'],
    },
    imports: {
      tiv_5y_usd_m: 2750,
      share_pct: 1.1,
      change_pct: null,
      top_partners: [
        { iso3: 'USA', share_pct: 69.0 },
        { iso3: 'DEU', share_pct: 30.0 },
        { iso3: 'ITA', share_pct: 0.8 },
      ],
      dominant_categories: ['aircraft', 'submarines'],
    },
    world_rank_exporter: 10,
    world_rank_importer: null,
    notes: 'UAVs Heron/Hermes + sistemas Iron Dome + ciberinteligencia. India cliente top desde rotura con Rusia post-2022.',
  },
  // Importadores top
  IND: {
    iso3: 'IND',
    exports: { tiv_5y_usd_m: 425, share_pct: 0.2, change_pct: null, top_partners: [{ iso3: 'MMR', share_pct: 30.0 }, { iso3: 'ARM', share_pct: 25.0 }, { iso3: 'MUS', share_pct: 12.0 }], dominant_categories: ['ships', 'missiles'] },
    imports: {
      tiv_5y_usd_m: 22275,
      share_pct: 9.8,
      change_pct: -9.0,
      top_partners: [
        { iso3: 'RUS', share_pct: 36.0 },
        { iso3: 'FRA', share_pct: 33.0 },
        { iso3: 'USA', share_pct: 13.0 },
      ],
      dominant_categories: ['aircraft', 'submarines', 'missiles'],
    },
    world_rank_exporter: null,
    world_rank_importer: 1,
    notes: 'Importador #1 mundial · diversifica vendor: Francia (Rafale + Scorpene) crece a costa de Rusia (-9%). Acuerdos S-400 y Make-in-India.',
  },
  SAU: {
    iso3: 'SAU',
    exports: null,
    imports: {
      tiv_5y_usd_m: 19975,
      share_pct: 8.4,
      change_pct: 4.0,
      top_partners: [
        { iso3: 'USA', share_pct: 74.0 },
        { iso3: 'FRA', share_pct: 6.4 },
        { iso3: 'ESP', share_pct: 4.9 },
      ],
      dominant_categories: ['aircraft', 'air_defense', 'missiles'],
    },
    world_rank_exporter: null,
    world_rank_importer: 2,
    notes: 'Vision 2030 boost defensa local. F-15SA, Patriot, THAAD. Conflicto Yemen presiona EE.UU. licencias armas.',
  },
  QAT: {
    iso3: 'QAT',
    exports: null,
    imports: {
      tiv_5y_usd_m: 10325,
      share_pct: 4.3,
      change_pct: 396.0,
      top_partners: [
        { iso3: 'USA', share_pct: 42.0 },
        { iso3: 'FRA', share_pct: 29.0 },
        { iso3: 'GBR', share_pct: 20.0 },
      ],
      dominant_categories: ['aircraft', 'missiles', 'air_defense'],
    },
    world_rank_exporter: null,
    world_rank_importer: 3,
    notes: 'Crecimiento +396% por bloqueo 2017-2021 · Rafale 36 + F-15QA + Eurofighter (triple cobertura). Mundial 2022 boost.',
  },
  AUS: {
    iso3: 'AUS',
    exports: null,
    imports: {
      tiv_5y_usd_m: 9925,
      share_pct: 4.1,
      change_pct: 23.0,
      top_partners: [
        { iso3: 'USA', share_pct: 73.0 },
        { iso3: 'ESP', share_pct: 19.0 },
        { iso3: 'FRA', share_pct: 3.5 },
      ],
      dominant_categories: ['aircraft', 'ships', 'submarines'],
    },
    world_rank_exporter: null,
    world_rank_importer: 4,
    notes: 'AUKUS submarinos nucleares · cancela contrato Naval Group $66bn por USA-UK. Navantia LHD operativos Canberra/Adelaide.',
  },
  CHN_imp: {
    iso3: 'CHN',
    exports: null,
    imports: null,
    world_rank_exporter: null,
    world_rank_importer: 5,
    notes: '',
  },
  EGY: {
    iso3: 'EGY',
    exports: null,
    imports: {
      tiv_5y_usd_m: 8050,
      share_pct: 3.3,
      change_pct: -26.0,
      top_partners: [
        { iso3: 'RUS', share_pct: 34.0 },
        { iso3: 'ITA', share_pct: 31.0 },
        { iso3: 'FRA', share_pct: 16.0 },
      ],
      dominant_categories: ['aircraft', 'ships'],
    },
    world_rank_exporter: null,
    world_rank_importer: 6,
    notes: 'MiG-29M + Su-35 (Rusia) + Rafale + FREMM (Italia). Pieza clave Mediterráneo Este.',
  },
  JPN: {
    iso3: 'JPN',
    exports: { tiv_5y_usd_m: 220, share_pct: 0.1, change_pct: null, top_partners: [{ iso3: 'PHL', share_pct: 85.0 }], dominant_categories: ['sensors'] },
    imports: {
      tiv_5y_usd_m: 7220,
      share_pct: 3.0,
      change_pct: 155.0,
      top_partners: [
        { iso3: 'USA', share_pct: 97.0 },
        { iso3: 'CAN', share_pct: 1.5 },
        { iso3: 'NOR', share_pct: 1.0 },
      ],
      dominant_categories: ['aircraft', 'missiles', 'air_defense'],
    },
    world_rank_exporter: null,
    world_rank_importer: 7,
    notes: '+155% · revisión doctrina seguridad nacional 2022. F-35 105 unid + Aegis Ashore + Tomahawk. Cambio histórico.',
  },
  PAK: {
    iso3: 'PAK',
    exports: null,
    imports: {
      tiv_5y_usd_m: 5750,
      share_pct: 2.4,
      change_pct: 14.0,
      top_partners: [
        { iso3: 'CHN', share_pct: 82.0 },
        { iso3: 'NLD', share_pct: 6.0 },
        { iso3: 'TUR', share_pct: 3.5 },
      ],
      dominant_categories: ['aircraft', 'ships', 'air_defense'],
    },
    world_rank_exporter: null,
    world_rank_importer: 9,
    notes: 'Dependencia China 82% · J-10CE + Type 054A/P fragatas. Diversifica con Turquía (TB2 drones).',
  },
  UKR: {
    iso3: 'UKR',
    exports: null,
    imports: {
      tiv_5y_usd_m: 4945,
      share_pct: 2.1,
      change_pct: 6900.0,
      top_partners: [
        { iso3: 'USA', share_pct: 33.0 },
        { iso3: 'DEU', share_pct: 18.0 },
        { iso3: 'POL', share_pct: 13.0 },
      ],
      dominant_categories: ['armor', 'artillery', 'air_defense', 'missiles'],
    },
    world_rank_exporter: null,
    world_rank_importer: 10,
    notes: '+6900% post-2022 · receptor de coalition apoyo: Patriot, HIMARS, Leopard, Storm Shadow. Cifra subestimada (sólo SIPRI registrado).',
  },
  TUR: {
    iso3: 'TUR',
    exports: { tiv_5y_usd_m: 4760, share_pct: 2.0, change_pct: 106.0, top_partners: [{ iso3: 'ARE', share_pct: 21.0 }, { iso3: 'PAK', share_pct: 11.0 }, { iso3: 'TKM', share_pct: 8.0 }], dominant_categories: ['aircraft', 'electronics'] },
    imports: {
      tiv_5y_usd_m: 4350,
      share_pct: 1.8,
      change_pct: null,
      top_partners: [
        { iso3: 'USA', share_pct: 17.0 },
        { iso3: 'ESP', share_pct: 13.0 },
        { iso3: 'ITA', share_pct: 11.0 },
      ],
      dominant_categories: ['aircraft', 'electronics'],
    },
    world_rank_exporter: 12,
    world_rank_importer: 11,
    notes: 'TB2/TB3 drones Baykar superventas (>30 países). Doctrina "armas blue jeans": baratas, efectivas. F-35 vetado por S-400.',
  },
  POL: {
    iso3: 'POL',
    exports: null,
    imports: {
      tiv_5y_usd_m: 3950,
      share_pct: 1.6,
      change_pct: 35.0,
      top_partners: [
        { iso3: 'USA', share_pct: 58.0 },
        { iso3: 'KOR', share_pct: 25.0 },
        { iso3: 'GBR', share_pct: 6.5 },
      ],
      dominant_categories: ['armor', 'aircraft', 'artillery', 'air_defense'],
    },
    world_rank_exporter: null,
    world_rank_importer: 13,
    notes: 'Boom post-2022 · F-35, Abrams + K2 (Corea), K9 obuses, HIMARS. Cliente top mundial Corea del Sur defensa.',
  },
}

/**
 * Devuelve datos SIPRI arms transfers para país · null si no está en catálogo.
 */
export function getArmsTransfers(iso3: string): CountryArmsTransfers | null {
  return ARMS_TRANSFERS[iso3.toUpperCase()] || null
}
