/**
 * Dataset · Top empresas industria defensa por país.
 *
 * Sprint G22 batch 3 · reemplaza el placeholder "Próximamente" en el drawer
 * militar de país (sub-tab Industria defensa).
 *
 * Fuente: SIPRI Arms Industry Database (AIDB) 2023 · ranking 100 empresas
 * defensa por arms sales. Datos 2022 (publicado dic 2023).
 *
 * Para refrescar: sipri.org/databases/armsindustry (anual diciembre).
 */

export interface DefenseCompany {
  /** Nombre comercial */
  name: string
  /** Ticker bolsa (null si privada/estatal) */
  ticker: string | null
  /** Ranking SIPRI AIDB · global */
  sipri_rank: number | null
  /** Ventas armas 2022 (USD millones) */
  arms_sales_usd_m: number
  /** Share % ventas totales de la empresa que son armas */
  arms_share_pct: number
  /** Empleados totales (estimación) */
  employees: number | null
  /** Categorías producto principal */
  segments: string[]
  /** Notas estratégicas */
  notes: string
}

export interface CountryDefenseIndustry {
  iso3: string
  companies: DefenseCompany[]
  total_arms_sales_2022_usd_bn: number
  share_top100_global: number
  notes: string
}

export const DEFENSE_INDUSTRY: Record<string, CountryDefenseIndustry> = {
  USA: {
    iso3: 'USA',
    total_arms_sales_2022_usd_bn: 302,
    share_top100_global: 51.0,
    notes: 'Domina top-10 mundial · 51% ventas armas SIPRI top 100. Boom Ucrania + reposición stocks aliados.',
    companies: [
      { name: 'Lockheed Martin', ticker: 'LMT', sipri_rank: 1, arms_sales_usd_m: 59390, arms_share_pct: 89, employees: 116000, segments: ['Aircraft (F-35)', 'Missiles (Patriot, JASSM)', 'Space (SDA)'], notes: 'Líder mundial · F-35 backbone NATO · Patriot demanda récord' },
      { name: 'Raytheon Technologies (RTX)', ticker: 'RTX', sipri_rank: 2, arms_sales_usd_m: 39570, arms_share_pct: 53, employees: 182000, segments: ['Missiles', 'Radar', 'Aircraft engines (Pratt&Whitney)'], notes: 'Stinger + Tomahawk + AMRAAM · stocks agotados post-Ucrania' },
      { name: 'Northrop Grumman', ticker: 'NOC', sipri_rank: 3, arms_sales_usd_m: 32400, arms_share_pct: 87, employees: 95000, segments: ['Bombers (B-21 Raider)', 'Space', 'Cyber'], notes: 'B-21 next-gen + GBSD ICBM Sentinel · futuro 30y triada nuclear' },
      { name: 'Boeing Defense', ticker: 'BA', sipri_rank: 4, arms_sales_usd_m: 23410, arms_share_pct: 36, employees: 156000, segments: ['Aircraft (F-15, F/A-18, P-8)', 'Tanker (KC-46)', 'Space'], notes: 'Problemas KC-46 + Starliner. Pierde share vs LMT' },
      { name: 'General Dynamics', ticker: 'GD', sipri_rank: 5, arms_sales_usd_m: 28780, arms_share_pct: 74, employees: 106500, segments: ['Submarines (Virginia/Columbia)', 'Tanks (Abrams)', 'IT services'], notes: 'AUKUS submarinos boost · Abrams Polonia/Ucrania' },
    ],
  },
  CHN: {
    iso3: 'CHN',
    total_arms_sales_2022_usd_bn: 108,
    share_top100_global: 18.0,
    notes: 'Segundo bloque mundial · 8 empresas en top 100 · estatales/state-owned. Crecimiento sostenido modernización PLA.',
    companies: [
      { name: 'AVIC', ticker: null, sipri_rank: 6, arms_sales_usd_m: 27130, arms_share_pct: 35, employees: 460000, segments: ['Aircraft (J-20, J-10C, H-6)', 'Helicopters', 'UAVs'], notes: 'Aviation Industry Corp. China · J-20 producción serial · J-35 portaaviones' },
      { name: 'NORINCO', ticker: null, sipri_rank: 7, arms_sales_usd_m: 22090, arms_share_pct: 23, employees: 213000, segments: ['Armor (Type 99)', 'Artillery', 'Small arms'], notes: 'Land warfare líder · exporta tanques VT-4 a Pakistán/Tailandia' },
      { name: 'CSGC', ticker: null, sipri_rank: 8, arms_sales_usd_m: 20620, arms_share_pct: 17, employees: 175000, segments: ['Naval ships', 'Submarines', 'Land vehicles'], notes: 'China South Industries · vehículos blindados, autocañones' },
      { name: 'CSSC', ticker: null, sipri_rank: 12, arms_sales_usd_m: 11900, arms_share_pct: 13, employees: 220000, segments: ['Naval ships (Type 055)', 'Submarines (Type 094/096)', 'Carriers'], notes: 'Astilleros estatales · destructor Type 055 nivel Arleigh Burke' },
      { name: 'CETC', ticker: null, sipri_rank: 14, arms_sales_usd_m: 10100, arms_share_pct: 27, employees: 170000, segments: ['Radar', 'Electronic warfare', 'Cyber'], notes: 'China Electronics Tech · líder EW + ciberguerra' },
    ],
  },
  GBR: {
    iso3: 'GBR',
    total_arms_sales_2022_usd_bn: 41,
    share_top100_global: 7.0,
    notes: 'BAE Systems #7 mundial · concentración alta. AUKUS submarinos pipeline >$50bn.',
    companies: [
      { name: 'BAE Systems', ticker: 'BAES.L', sipri_rank: 7, arms_sales_usd_m: 26910, arms_share_pct: 97, employees: 99000, segments: ['Aircraft (Eurofighter Typhoon)', 'Submarines (Astute)', 'Land combat'], notes: 'Eurofighter + Astute SSN + Hawk · core NATO industrial Europa' },
      { name: 'Rolls-Royce Defense', ticker: 'RR.L', sipri_rank: 25, arms_sales_usd_m: 6280, arms_share_pct: 23, employees: 50000, segments: ['Aircraft engines', 'Naval propulsion', 'Nuclear submarines'], notes: 'Motores Typhoon EJ200 + reactores SSN · clave AUKUS' },
      { name: 'Babcock International', ticker: 'BAB.L', sipri_rank: 38, arms_sales_usd_m: 4290, arms_share_pct: 47, employees: 26000, segments: ['Naval services', 'Submarine support', 'Training'], notes: 'Mantenimiento flota Royal Navy · Devonport submarine docking' },
    ],
  },
  FRA: {
    iso3: 'FRA',
    total_arms_sales_2022_usd_bn: 34,
    share_top100_global: 6.0,
    notes: 'Boom Rafale post-2022 · Dassault, Thales, Naval Group complementarios. Defensa estratégica europea EU.',
    companies: [
      { name: 'Airbus Defence & Space', ticker: 'AIR.PA', sipri_rank: 10, arms_sales_usd_m: 12080, arms_share_pct: 18, employees: 130000, segments: ['Aircraft (A400M, C295)', 'Helicopters', 'Space (Eurodrone)'], notes: 'Líder transporte militar Europa · A400M Atlas · futuro FCAS' },
      { name: 'Thales', ticker: 'HO.PA', sipri_rank: 11, arms_sales_usd_m: 9700, arms_share_pct: 49, employees: 81000, segments: ['Radar', 'Electronics', 'Cybersecurity', 'Naval'], notes: 'Líder sensores Europa · radar SAMP/T + SCALP missiles' },
      { name: 'Dassault Aviation', ticker: 'AM.PA', sipri_rank: 26, arms_sales_usd_m: 6160, arms_share_pct: 71, employees: 12500, segments: ['Aircraft (Rafale)', 'Business jets (Falcon)'], notes: 'Rafale boom export histórico · Egipto 30, Croacia 12, EAU 80, Indonesia 42, India 36' },
      { name: 'Naval Group', ticker: null, sipri_rank: 41, arms_sales_usd_m: 4080, arms_share_pct: 100, employees: 16000, segments: ['Submarines (Suffren)', 'Frigates (FDI/FREMM)'], notes: 'Estatal · golpe AUKUS pero recupera con Indonesia/Brasil submarinos' },
      { name: 'Safran Defense', ticker: 'SAF.PA', sipri_rank: 48, arms_sales_usd_m: 3760, arms_share_pct: 13, employees: 92000, segments: ['Aircraft engines (M88)', 'Inertial systems', 'Optronics'], notes: 'M88 Rafale + sistemas guiado · core French aerospace' },
    ],
  },
  RUS: {
    iso3: 'RUS',
    total_arms_sales_2022_usd_bn: 21,
    share_top100_global: 3.5,
    notes: 'Caída por sanciones + guerra · sólo 2 empresas en top 100 (antes 8). Producción canibalizada para Ucrania.',
    companies: [
      { name: 'Rostec', ticker: null, sipri_rank: 18, arms_sales_usd_m: 8240, arms_share_pct: 38, employees: 600000, segments: ['Helicopters (Mi/Ka)', 'Avionics', 'Munitions'], notes: 'Holding estatal · concentra industria armas Rusia post-sanciones' },
      { name: 'Almaz-Antey', ticker: null, sipri_rank: 49, arms_sales_usd_m: 3560, arms_share_pct: 100, employees: 110000, segments: ['Air defense (S-400)', 'Radar'], notes: 'S-400 export India/Turquía · sanciones limitan componentes' },
    ],
  },
  DEU: {
    iso3: 'DEU',
    total_arms_sales_2022_usd_bn: 14,
    share_top100_global: 2.3,
    notes: 'Zeitenwende €100bn fondo especial post-2022 · Rheinmetall acelera Leopard + munición. ThyssenKrupp submarinos export.',
    companies: [
      { name: 'Rheinmetall', ticker: 'RHM.DE', sipri_rank: 22, arms_sales_usd_m: 6510, arms_share_pct: 67, employees: 30000, segments: ['Tanks (Leopard 2/Panther)', 'Artillery (RCH 155)', 'Munitions (155mm)'], notes: 'Estrella mercado Zeitenwende · acciones +300% post-2022 · munición Ucrania' },
      { name: 'ThyssenKrupp Marine Systems', ticker: 'TKA.DE', sipri_rank: 73, arms_sales_usd_m: 2070, arms_share_pct: 5, employees: 6500, segments: ['Submarines (Type 212/214)', 'Frigates'], notes: 'Submarinos export · Israel/Egipto/Singapur · futuro Polonia Orka' },
      { name: 'Hensoldt', ticker: 'HAG.DE', sipri_rank: 88, arms_sales_usd_m: 1860, arms_share_pct: 78, employees: 6200, segments: ['Sensors', 'Radar', 'Electronic warfare'], notes: 'Spin-off Airbus · radar TRML + IRST Eurofighter' },
    ],
  },
  ITA: {
    iso3: 'ITA',
    total_arms_sales_2022_usd_bn: 12,
    share_top100_global: 2.0,
    notes: 'Leonardo + Fincantieri líderes Mediterráneo · helicópteros AW + fragatas FREMM · NH90.',
    companies: [
      { name: 'Leonardo', ticker: 'LDO.MI', sipri_rank: 14, arms_sales_usd_m: 9620, arms_share_pct: 71, employees: 51000, segments: ['Helicopters (AW101/139/149)', 'Aircraft (M-346)', 'Electronics (DRS)'], notes: 'Líder helicópteros Europa · joint venture Eurofighter/A400M/NH90' },
      { name: 'Fincantieri', ticker: 'FCT.MI', sipri_rank: 30, arms_sales_usd_m: 5350, arms_share_pct: 22, employees: 21000, segments: ['Frigates (FREMM/PPA)', 'Aircraft carriers', 'OPV'], notes: 'Astillero #1 Europa · USS Constellation frigates para US Navy' },
    ],
  },
  ISR: {
    iso3: 'ISR',
    total_arms_sales_2022_usd_bn: 13,
    share_top100_global: 2.2,
    notes: 'Líder mundial UAVs + sensores + ciberguerra. Boom export India + Filipinas + sustitución Rusia.',
    companies: [
      { name: 'Elbit Systems', ticker: 'ESLT', sipri_rank: 27, arms_sales_usd_m: 5460, arms_share_pct: 96, employees: 19000, segments: ['UAVs (Hermes 900)', 'Electronics', 'Land systems'], notes: 'Líder UAVs MALE/HALE · Hermes en >20 países' },
      { name: 'Israel Aerospace Industries (IAI)', ticker: null, sipri_rank: 28, arms_sales_usd_m: 4520, arms_share_pct: 78, employees: 14500, segments: ['UAVs (Heron)', 'Missiles (Barak)', 'Radar', 'Satellites'], notes: 'Estatal · líder defensa antiaérea + ISR. Heron operado por 25+ países' },
      { name: 'Rafael Advanced Defense Systems', ticker: null, sipri_rank: 35, arms_sales_usd_m: 3300, arms_share_pct: 100, employees: 8000, segments: ['Missiles (Spike, Iron Dome)', 'Air defense'], notes: 'Iron Dome + David Sling + Spike anti-tanque · exporta Polonia/Alemania' },
    ],
  },
  ESP: {
    iso3: 'ESP',
    total_arms_sales_2022_usd_bn: 7,
    share_top100_global: 1.2,
    notes: 'Indra + Navantia + Airbus DS España. Programa F-110 + S-80 submarinos. Eurofighter Tranche 4.',
    companies: [
      { name: 'Navantia', ticker: null, sipri_rank: 53, arms_sales_usd_m: 3220, arms_share_pct: 99, employees: 4200, segments: ['Frigates (F-100/F-110)', 'Submarines (S-80)', 'LHD'], notes: 'Estatal · LHD Australia/Turquía/España · S-80 AIP submarinos' },
      { name: 'Indra', ticker: 'IDR.MC', sipri_rank: 64, arms_sales_usd_m: 2470, arms_share_pct: 67, employees: 57000, segments: ['Radar', 'C4ISR', 'EW', 'Simulation'], notes: 'Líder C4ISR España · Eurofighter + NATO Lince' },
      { name: 'Airbus DS España', ticker: null, sipri_rank: null, arms_sales_usd_m: 2100, arms_share_pct: 60, employees: 7000, segments: ['Aircraft (A400M, C295, NH90)', 'Space'], notes: 'Planta Sevilla A400M + C295. Lidera FCAS junto Francia/Alemania' },
    ],
  },
  KOR: {
    iso3: 'KOR',
    total_arms_sales_2022_usd_bn: 10,
    share_top100_global: 1.7,
    notes: 'K-Defense boom export · KAI, Hanwha, LIG líderes. Polonia + Filipinas + India clientes 2022-2024.',
    companies: [
      { name: 'Hanwha Aerospace', ticker: '012450.KS', sipri_rank: 24, arms_sales_usd_m: 5380, arms_share_pct: 76, employees: 9500, segments: ['Aircraft engines', 'Artillery (K9)', 'Missiles', 'Space'], notes: 'K9 Thunder obuses · Polonia 672 unid contrato $5bn · líder mundial export artillería SP' },
      { name: 'Korea Aerospace Industries (KAI)', ticker: '047810.KS', sipri_rank: 58, arms_sales_usd_m: 2790, arms_share_pct: 73, employees: 5800, segments: ['Aircraft (FA-50, KF-21)', 'Helicopters (Surion)'], notes: 'FA-50 Light Fighter · Polonia 48 unid, Filipinas, Malasia · KF-21 next-gen' },
      { name: 'LIG Nex1', ticker: '079550.KS', sipri_rank: 76, arms_sales_usd_m: 2050, arms_share_pct: 100, employees: 4000, segments: ['Missiles (Cheongung KM-SAM)', 'Sensors', 'EW'], notes: 'KM-SAM Cheongung II SAM medio · Hyunmoo missiles. Cliente top Polonia' },
    ],
  },
  JPN: {
    iso3: 'JPN',
    total_arms_sales_2022_usd_bn: 9,
    share_top100_global: 1.5,
    notes: 'Pivot post-2022 · Mitsubishi Heavy líder. Revisión doctrina permite export armas · primer destino EE.UU. + Filipinas.',
    companies: [
      { name: 'Mitsubishi Heavy Industries', ticker: '7011.T', sipri_rank: 36, arms_sales_usd_m: 4760, arms_share_pct: 13, employees: 79000, segments: ['Aircraft (F-15J)', 'Submarines (Soryu)', 'Tanks (Type 10)'], notes: 'Líder industria defensa Japón · F-X next-gen con UK/Italia (GCAP)' },
      { name: 'Kawasaki Heavy Industries', ticker: '7012.T', sipri_rank: 71, arms_sales_usd_m: 2240, arms_share_pct: 14, employees: 36000, segments: ['Aircraft (P-1, C-2)', 'Submarines (Taigei)', 'Helicopters'], notes: 'P-1 maritime patrol + C-2 transport · pivot export' },
    ],
  },
  IND: {
    iso3: 'IND',
    total_arms_sales_2022_usd_bn: 7,
    share_top100_global: 1.2,
    notes: 'Make in India boost · HAL + BEL + Bharat Dynamics. Tejas Mk-2 + Rafale local production pipeline.',
    companies: [
      { name: 'Hindustan Aeronautics (HAL)', ticker: 'HAL.NS', sipri_rank: 39, arms_sales_usd_m: 4220, arms_share_pct: 100, employees: 28000, segments: ['Aircraft (Tejas LCA)', 'Helicopters (LCH)', 'MRO'], notes: 'Estatal · Tejas Mk-1A 83 unid IAF · MRO Rafale + Sukhoi · LCA-2 next-gen' },
      { name: 'Bharat Electronics (BEL)', ticker: 'BEL.NS', sipri_rank: 74, arms_sales_usd_m: 2050, arms_share_pct: 73, employees: 9500, segments: ['Radar', 'EW', 'Communications'], notes: 'C4ISR Indian Armed Forces · ofrece Akash SAM export' },
    ],
  },
  TUR: {
    iso3: 'TUR',
    total_arms_sales_2022_usd_bn: 6,
    share_top100_global: 1.0,
    notes: 'Boom export drones · TB2 Baykar + Aselsan + Roketsan + TUSAS. Strategy "armas asequibles" 30+ países clientes.',
    companies: [
      { name: 'Aselsan', ticker: 'ASELS.IS', sipri_rank: 47, arms_sales_usd_m: 3680, arms_share_pct: 89, employees: 9500, segments: ['Electronics', 'EW', 'C4ISR', 'Radar'], notes: 'Estatal · radar KORAL + sistemas comunicación · 87 países' },
      { name: 'TAI / TUSAS', ticker: null, sipri_rank: 87, arms_sales_usd_m: 1900, arms_share_pct: 100, employees: 4500, segments: ['Aircraft (Hürjet, KAAN)', 'Helicopters (T625)', 'UAVs (Anka)'], notes: 'Estatal · KAAN 5th-gen fighter rollout 2024 · Hürjet entrenador export' },
      { name: 'Baykar Technology', ticker: null, sipri_rank: null, arms_sales_usd_m: 1800, arms_share_pct: 100, employees: 5000, segments: ['UAVs (TB2, TB3, Akinci, Kizilelma)'], notes: 'Privado · familia Bayraktar · 30+ países (Polonia, Ucrania, Azerbaiyán, Etiopía...)' },
    ],
  },
}

/**
 * Devuelve industria defensa para país · null si no está en catálogo.
 */
export function getDefenseIndustry(iso3: string): CountryDefenseIndustry | null {
  return DEFENSE_INDUSTRY[iso3.toUpperCase()] || null
}
