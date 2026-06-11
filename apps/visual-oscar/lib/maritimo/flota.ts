/**
 * lib/maritimo/flota.ts · Capa de FLOTA MUNDIAL (curado + datado)
 * ─────────────────────────────────────────────────────────────────────────────
 * Dos datasets curados a mano, ambos con fecha de referencia explícita. NO se
 * inventa nada: si un campo no es público se omite. Marca de calidad en cada
 * registro (`data_quality: 'curated'`) y referencia a la fuente.
 *
 *  (a) FLEET_BY_FLAG · Flota mundial por pabellón (bandera de registro), con el
 *      tonelaje bruto (GT, miles), peso muerto (DWT, miles) y nº de buques
 *      aproximado. Top pabellones por GT. Fuente de referencia:
 *      UNCTAD Review of Maritime Transport 2024 (UNCTADstat · Merchant fleet by
 *      flag of registration), datos a 1 de enero de 2024. Buques ≥ 100 GT.
 *
 *  (b) CARRIERS · Catálogo curado de las grandes navieras de portacontenedores,
 *      con capacidad operada en TEU, cuota de mercado %, país de la matriz y nº
 *      de buques. Estilo Alphaliner Top 100 (datos públicos), referencia
 *      ~mayo 2025. Incluye buques propios + fletados (capacidad operada).
 *
 * Estos números son ÓRDENES DE MAGNITUD curados para contexto analítico, no un
 * registro operativo en vivo. La fecha de referencia va en cada constante
 * (`*_AS_OF`) y se propaga al endpoint.
 *
 * Exporta: FLEET_BY_FLAG, CARRIERS, helpers de agregación + tipos.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

/** Categoría de control del registro de pabellón. */
export type FlagCategory = 'open' | 'national'

/** Una entrada de la flota mundial agregada por pabellón de registro. */
export interface FlagFleet {
  /** ISO-3166 alpha-2 del país/territorio del registro. */
  iso2: string
  /** Nombre del pabellón en castellano. */
  name: string
  /** Tonelaje bruto total registrado, en miles de GT. */
  gt_thousand: number
  /** Peso muerto total, en miles de DWT. */
  dwt_thousand: number
  /** Nº aproximado de buques (≥ 100 GT). */
  vessels: number
  /** 'open' = pabellón de conveniencia / registro abierto; 'national' = nacional. */
  category: FlagCategory
  /** Notas analíticas (registro abierto, propietarios beneficiarios, etc.). */
  notes?: string
}

/** Alianza operativa de la naviera (o standalone). */
export type CarrierAlliance =
  | 'gemini'
  | 'ocean'
  | 'premier'
  | 'standalone'

/** Tipo de buque dominante operado por la naviera. */
export type VesselType = 'container'

/** Una naviera de portacontenedores (capacidad operada). */
export interface Carrier {
  /** Identificador estable en minúsculas. */
  slug: string
  /** Nombre comercial. */
  name: string
  /** ISO-3166 alpha-2 del país de la matriz. */
  country_iso2: string
  /** Capacidad operada en TEU (propios + fletados). */
  teu: number
  /** Nº de buques operados. */
  vessels: number
  /** Cuota de mercado sobre la capacidad mundial de portacontenedores, %. */
  share_pct: number
  /** Alianza operativa. */
  alliance: CarrierAlliance
  /** Tipo de buque dominante. */
  vessel_type: VesselType
  /** Notas curadas (propiedad, sanciones, particularidades). */
  notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// (a) FLOTA MUNDIAL POR PABELLÓN · UNCTAD Review of Maritime Transport 2024
//     UNCTADstat · Merchant fleet by flag of registration · a 1 ene 2024.
//     Buques ≥ 100 GT. GT y DWT en MILES. Cifras curadas (orden de magnitud).
// ─────────────────────────────────────────────────────────────────────────────

/** Fecha de referencia del dataset por pabellón. */
export const FLEET_BY_FLAG_AS_OF = '2024-01-01'

/** Fuente pública del dataset por pabellón. */
export const FLEET_BY_FLAG_SOURCE =
  'UNCTAD Review of Maritime Transport 2024 · UNCTADstat (Merchant fleet by flag of registration)'

/** URL pública de la fuente. */
export const FLEET_BY_FLAG_SOURCE_URL =
  'https://unctadstat.unctad.org/datacentre/dataviewer/US.MerchantFleet'

export const FLEET_BY_FLAG: FlagFleet[] = [
  {
    iso2: 'PA', name: 'Panamá', gt_thousand: 240000, dwt_thousand: 348000, vessels: 8000,
    category: 'open',
    notes: 'Mayor registro abierto del mundo por tonelaje. Propietarios beneficiarios principalmente griegos, japoneses y chinos.',
  },
  {
    iso2: 'LR', name: 'Liberia', gt_thousand: 230000, dwt_thousand: 380000, vessels: 5300,
    category: 'open',
    notes: 'Registro abierto gestionado desde EE. UU. (LISCR). Crecimiento muy fuerte la última década; lidera o iguala a Panamá en DWT.',
  },
  {
    iso2: 'MH', name: 'Islas Marshall', gt_thousand: 175000, dwt_thousand: 290000, vessels: 4900,
    category: 'open',
    notes: 'Registro abierto gestionado desde EE. UU. (IRI). Muy usado por tankers y graneleros.',
  },
  {
    iso2: 'HK', name: 'Hong Kong (China)', gt_thousand: 130000, dwt_thousand: 205000, vessels: 2700,
    category: 'open',
    notes: 'Registro de calidad asociado a armadores chinos y del este de Asia.',
  },
  {
    iso2: 'SG', name: 'Singapur', gt_thousand: 90000, dwt_thousand: 140000, vessels: 3500,
    category: 'open',
    notes: 'Hub naviero y financiero; registro de alta reputación.',
  },
  {
    iso2: 'MT', name: 'Malta', gt_thousand: 82000, dwt_thousand: 130000, vessels: 2100,
    category: 'open',
    notes: 'Mayor registro de la UE por tonelaje; pabellón abierto europeo.',
  },
  {
    iso2: 'CN', name: 'China', gt_thousand: 80000, dwt_thousand: 130000, vessels: 7000,
    category: 'national',
    notes: 'Registro nacional (sin Hong Kong). Flota controlada por China muy superior si se suman pabellones abiertos.',
  },
  {
    iso2: 'BS', name: 'Bahamas', gt_thousand: 55000, dwt_thousand: 75000, vessels: 1300,
    category: 'open',
    notes: 'Registro abierto clásico; cruceros y tankers.',
  },
  {
    iso2: 'GR', name: 'Grecia', gt_thousand: 40000, dwt_thousand: 70000, vessels: 1300,
    category: 'national',
    notes: 'Mayor potencia armadora del mundo por propiedad beneficiaria, aunque gran parte abandera fuera (PA/LR/MH/MT).',
  },
  {
    iso2: 'JP', name: 'Japón', gt_thousand: 38000, dwt_thousand: 50000, vessels: 5000,
    category: 'national',
    notes: 'Registro nacional reducido frente a su enorme propiedad beneficiaria (abanderada sobre todo en Panamá).',
  },
  {
    iso2: 'CY', name: 'Chipre', gt_thousand: 36000, dwt_thousand: 55000, vessels: 1000,
    category: 'open',
    notes: 'Pabellón abierto de la UE; vínculos con armadores griegos y alemanes.',
  },
  {
    iso2: 'KR', name: 'Corea del Sur', gt_thousand: 16000, dwt_thousand: 25000, vessels: 1800,
    category: 'national',
    notes: 'Registro nacional; gran constructor naval e impulsor de HMM.',
  },
  {
    iso2: 'GB', name: 'Reino Unido', gt_thousand: 15000, dwt_thousand: 18000, vessels: 1200,
    category: 'national',
    notes: 'Incluye registros de Isla de Man y territorios británicos en algunas series.',
  },
  {
    iso2: 'DK', name: 'Dinamarca', gt_thousand: 14000, dwt_thousand: 18000, vessels: 650,
    category: 'national',
    notes: 'Sede de Maersk; registro DIS competitivo.',
  },
  {
    iso2: 'NO', name: 'Noruega', gt_thousand: 13000, dwt_thousand: 16000, vessels: 1800,
    category: 'national',
    notes: 'Registros NOR/NIS; gran flota de gas, offshore y químicos.',
  },
  {
    iso2: 'ID', name: 'Indonesia', gt_thousand: 12000, dwt_thousand: 16000, vessels: 5500,
    category: 'national',
    notes: 'Numerosos buques pequeños de cabotaje interinsular.',
  },
  {
    iso2: 'IT', name: 'Italia', gt_thousand: 11000, dwt_thousand: 12000, vessels: 1300,
    category: 'national',
    notes: 'Ferries, cruceros (Carnival/Costa) y flota de cabotaje.',
  },
  {
    iso2: 'DE', name: 'Alemania', gt_thousand: 8000, dwt_thousand: 9000, vessels: 600,
    category: 'national',
    notes: 'Histórica potencia en portacontenedores (KG Häuser); flota nacional muy reducida tras deslocalizar pabellón.',
  },
  {
    iso2: 'IN', name: 'India', gt_thousand: 11000, dwt_thousand: 17000, vessels: 1700,
    category: 'national',
    notes: 'Registro nacional con flota mixta; reciclaje de buques en Alang.',
  },
  {
    iso2: 'TR', name: 'Turquía', gt_thousand: 7000, dwt_thousand: 11000, vessels: 1300,
    category: 'national',
    notes: 'Graneleros y portacontenedores medianos; armadores activos en el Mediterráneo.',
  },
  {
    iso2: 'ES', name: 'España', gt_thousand: 2500, dwt_thousand: 2700, vessels: 500,
    category: 'national',
    notes: 'Registro nacional pequeño; REC (Canarias) como segundo registro. Gran tránsito en sus puertos pese a flota propia reducida.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// (b) NAVIERAS DE PORTACONTENEDORES · estilo Alphaliner Top 100 (datos públicos)
//     Referencia ~mayo 2025. TEU = capacidad operada (propios + fletados).
//     Cuota % sobre capacidad mundial de portacontenedores (~31 M TEU).
// ─────────────────────────────────────────────────────────────────────────────

/** Fecha de referencia del catálogo de navieras. */
export const CARRIERS_AS_OF = '2025-05-01'

/** Fuente pública del catálogo de navieras. */
export const CARRIERS_SOURCE =
  'Capacidad operada de portacontenedores · datos públicos estilo Alphaliner Top 100'

/** URL pública de referencia. */
export const CARRIERS_SOURCE_URL = 'https://www.alphaliner.com/top-100/'

export const CARRIERS: Carrier[] = [
  {
    slug: 'msc', name: 'MSC (Mediterranean Shipping Company)', country_iso2: 'CH',
    teu: 6400000, vessels: 880, share_pct: 20.3, alliance: 'standalone', vessel_type: 'container',
    notes: '1ª del mundo desde 2022. Familia Aponte, privada, sede en Ginebra. Opera en solitario.',
  },
  {
    slug: 'maersk', name: 'Maersk (A.P. Moller-Maersk)', country_iso2: 'DK',
    teu: 4300000, vessels: 690, share_pct: 13.6, alliance: 'gemini', vessel_type: 'container',
    notes: 'Cooperación Gemini con Hapag-Lloyd desde 2025. APM Terminals opera terminales globales.',
  },
  {
    slug: 'cma_cgm', name: 'CMA CGM', country_iso2: 'FR',
    teu: 3900000, vessels: 640, share_pct: 12.4, alliance: 'ocean', vessel_type: 'container',
    notes: 'Familia Saadé. Controla CEVA Logistics y APL. Ocean Alliance con COSCO/Evergreen/OOCL.',
  },
  {
    slug: 'cosco', name: 'COSCO Shipping Lines', country_iso2: 'CN',
    teu: 3200000, vessels: 500, share_pct: 10.1, alliance: 'ocean', vessel_type: 'container',
    notes: 'Estatal china. Controla el puerto de El Pireo y minoría en Hamburgo. Bajo escrutinio OFAC.',
  },
  {
    slug: 'hapag_lloyd', name: 'Hapag-Lloyd', country_iso2: 'DE',
    teu: 2300000, vessels: 300, share_pct: 7.3, alliance: 'gemini', vessel_type: 'container',
    notes: '5ª del mundo. Cooperación Gemini con Maersk desde 2025. Sede en Hamburgo.',
  },
  {
    slug: 'one', name: 'Ocean Network Express (ONE)', country_iso2: 'SG',
    teu: 2000000, vessels: 240, share_pct: 6.3, alliance: 'premier', vessel_type: 'container',
    notes: 'JV japonesa (NYK + MOL + K Line) constituida en 2017. Sede en Singapur. Cascos magenta.',
  },
  {
    slug: 'evergreen', name: 'Evergreen Marine', country_iso2: 'TW',
    teu: 1750000, vessels: 220, share_pct: 5.5, alliance: 'ocean', vessel_type: 'container',
    notes: 'Taiwanesa. Famosa por el bloqueo del Ever Given en Suez (2021). Ocean Alliance.',
  },
  {
    slug: 'hmm', name: 'HMM (Hyundai Merchant Marine)', country_iso2: 'KR',
    teu: 800000, vessels: 75, share_pct: 2.5, alliance: 'premier', vessel_type: 'container',
    notes: 'Coreana. Reestructurada en 2017 con apoyo estatal (Korea Development Bank). Premier Alliance.',
  },
  {
    slug: 'yang_ming', name: 'Yang Ming Marine Transport', country_iso2: 'TW',
    teu: 700000, vessels: 90, share_pct: 2.2, alliance: 'premier', vessel_type: 'container',
    notes: 'Participación mayoritaria del Estado taiwanés. Premier Alliance con ONE y HMM.',
  },
  {
    slug: 'zim', name: 'ZIM Integrated Shipping', country_iso2: 'IL',
    teu: 700000, vessels: 130, share_pct: 2.2, alliance: 'standalone', vessel_type: 'container',
    notes: 'Israelí. Cotiza en NYSE. Estrategia asset-light (flota mayoritariamente fletada).',
  },
  {
    slug: 'wan_hai', name: 'Wan Hai Lines', country_iso2: 'TW',
    teu: 480000, vessels: 150, share_pct: 1.5, alliance: 'standalone', vessel_type: 'container',
    notes: 'Especialista intra-Asia. Expansión transpacífico tras la pandemia.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de agregación
// ─────────────────────────────────────────────────────────────────────────────

/** Resumen agregado de ambos datasets, para cabeceras y endpoints. */
export interface FleetSummary {
  flags_count: number
  flag_gt_thousand_total: number
  flag_dwt_thousand_total: number
  flag_vessels_total: number
  open_registry_gt_share_pct: number
  carriers_count: number
  carriers_teu_total: number
  carriers_vessels_total: number
  carriers_share_pct_total: number
  fleet_by_flag_as_of: string
  carriers_as_of: string
}

/** Suma el GT (miles) de todos los pabellones. */
export function totalFlagGt(flags: FlagFleet[] = FLEET_BY_FLAG): number {
  return flags.reduce((acc, f) => acc + f.gt_thousand, 0)
}

/** Suma el DWT (miles) de todos los pabellones. */
export function totalFlagDwt(flags: FlagFleet[] = FLEET_BY_FLAG): number {
  return flags.reduce((acc, f) => acc + f.dwt_thousand, 0)
}

/** Suma el nº de buques de todos los pabellones. */
export function totalFlagVessels(flags: FlagFleet[] = FLEET_BY_FLAG): number {
  return flags.reduce((acc, f) => acc + f.vessels, 0)
}

/** Cuota de GT (%) que representan los registros abiertos sobre el total listado. */
export function openRegistryGtSharePct(flags: FlagFleet[] = FLEET_BY_FLAG): number {
  const total = totalFlagGt(flags)
  if (total <= 0) return 0
  const open = flags.filter((f) => f.category === 'open').reduce((a, f) => a + f.gt_thousand, 0)
  return Math.round((open / total) * 1000) / 10
}

/** Pabellones ordenados por GT descendente (copia, no muta el original). */
export function flagsByGt(flags: FlagFleet[] = FLEET_BY_FLAG): FlagFleet[] {
  return [...flags].sort((a, b) => b.gt_thousand - a.gt_thousand)
}

/** Suma la capacidad TEU operada de todas las navieras. */
export function totalCarrierTeu(carriers: Carrier[] = CARRIERS): number {
  return carriers.reduce((acc, c) => acc + c.teu, 0)
}

/** Suma el nº de buques operados por todas las navieras. */
export function totalCarrierVessels(carriers: Carrier[] = CARRIERS): number {
  return carriers.reduce((acc, c) => acc + c.vessels, 0)
}

/** Suma la cuota de mercado (%) de las navieras listadas. */
export function totalCarrierSharePct(carriers: Carrier[] = CARRIERS): number {
  return Math.round(carriers.reduce((acc, c) => acc + c.share_pct, 0) * 10) / 10
}

/** Navieras ordenadas por capacidad TEU descendente (copia). */
export function carriersByTeu(carriers: Carrier[] = CARRIERS): Carrier[] {
  return [...carriers].sort((a, b) => b.teu - a.teu)
}

/** Agrupa la capacidad TEU operada por alianza. */
export function teuByAlliance(carriers: Carrier[] = CARRIERS): Record<CarrierAlliance, number> {
  const out: Record<CarrierAlliance, number> = {
    gemini: 0, ocean: 0, premier: 0, standalone: 0,
  }
  for (const c of carriers) out[c.alliance] += c.teu
  return out
}

/** Resumen agregado completo de la flota mundial (pabellones + navieras). */
export function fleetSummary(
  flags: FlagFleet[] = FLEET_BY_FLAG,
  carriers: Carrier[] = CARRIERS,
): FleetSummary {
  return {
    flags_count: flags.length,
    flag_gt_thousand_total: totalFlagGt(flags),
    flag_dwt_thousand_total: totalFlagDwt(flags),
    flag_vessels_total: totalFlagVessels(flags),
    open_registry_gt_share_pct: openRegistryGtSharePct(flags),
    carriers_count: carriers.length,
    carriers_teu_total: totalCarrierTeu(carriers),
    carriers_vessels_total: totalCarrierVessels(carriers),
    carriers_share_pct_total: totalCarrierSharePct(carriers),
    fleet_by_flag_as_of: FLEET_BY_FLAG_AS_OF,
    carriers_as_of: CARRIERS_AS_OF,
  }
}
