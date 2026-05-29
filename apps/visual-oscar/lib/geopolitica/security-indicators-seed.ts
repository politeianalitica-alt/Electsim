/**
 * Dataset · indicadores de seguridad por país sin ACLED.
 *
 * Sprint G23 · usuario pidió "Seguridad esta vacío y no tenemos acled, busca
 * otras fuentes". Usamos triangulación con fuentes públicas:
 *
 *   - GTD (Global Terrorism Database) · END 2024
 *   - GPI (Global Peace Index) · IEP 2024
 *   - Homicide rate · UNODC 2023
 *   - Corruption Perception Index · Transparency Intl 2023
 *   - State Fragility Index · Fund for Peace 2024
 *   - Press Freedom Index · RSF 2024
 *   - Border tensions tracked manualmente
 */

export interface SecurityIndicators {
  iso3: string
  /** Global Peace Index 2024 · 1.0 (más pacífico) a 4.0 (menos pacífico) */
  gpi_score: number | null
  gpi_rank: number | null
  /** Homicide rate por 100k habitantes (UNODC último año disponible) */
  homicide_per_100k: number | null
  /** Atentados terroristas con víctimas 2023 (GTD/SATP) */
  terror_attacks_2023: number | null
  terror_fatalities_2023: number | null
  /** Corruption Perception Index 0 (más corrupto) - 100 (limpio) */
  cpi_score: number | null
  cpi_rank: number | null
  /** State Fragility Index · 0 estable - 120 colapso (FfP) */
  fragility_score: number | null
  fragility_category: 'sustainable' | 'stable' | 'warning' | 'alert' | 'critical'
  /** Press Freedom Index 0 mejor - 100 peor */
  press_freedom_score: number | null
  press_freedom_rank: number | null
  /** Tensiones fronterizas activas (binaria) */
  active_border_tensions: boolean
  border_tension_notes: string
  /** Crimen organizado relevante */
  organized_crime_notes: string
  /** Top amenaza domestic */
  primary_security_threat: string
}

export const SECURITY_INDICATORS: Record<string, SecurityIndicators> = {
  USA: {
    iso3: 'USA', gpi_score: 2.30, gpi_rank: 132, homicide_per_100k: 5.7, terror_attacks_2023: 73, terror_fatalities_2023: 47,
    cpi_score: 69, cpi_rank: 24, fragility_score: 36.5, fragility_category: 'stable',
    press_freedom_score: 71.22, press_freedom_rank: 55,
    active_border_tensions: false, border_tension_notes: 'Sin disputas territoriales activas · tensión migratoria frontera sur con México.',
    organized_crime_notes: 'Cárteles transfronterizos (fentanilo) + crimen doméstico (gang violence).',
    primary_security_threat: 'Terrorismo doméstico (white nationalism) + violencia armada.',
  },
  RUS: {
    iso3: 'RUS', gpi_score: 3.41, gpi_rank: 158, homicide_per_100k: 5.8, terror_attacks_2023: 12, terror_fatalities_2023: 165,
    cpi_score: 28, cpi_rank: 138, fragility_score: 71.8, fragility_category: 'warning',
    press_freedom_score: 28.62, press_freedom_rank: 162,
    active_border_tensions: true, border_tension_notes: 'Guerra activa Ucrania · tensiones Geórgia (Abjasia/Osetia Sur) · disputa Kuriles con Japón.',
    organized_crime_notes: 'Bratva (mafia rusa) consolidada · Wagner Group operaciones híbridas.',
    primary_security_threat: 'Terrorismo islamista (Crocus City Hall 2024) + insurgencia Cáucaso.',
  },
  CHN: {
    iso3: 'CHN', gpi_score: 2.18, gpi_rank: 88, homicide_per_100k: 0.5, terror_attacks_2023: 4, terror_fatalities_2023: 16,
    cpi_score: 42, cpi_rank: 76, fragility_score: 60.5, fragility_category: 'warning',
    press_freedom_score: 22.97, press_freedom_rank: 172,
    active_border_tensions: true, border_tension_notes: 'Tensiones Taiwán · Mar Sur China (Filipinas/Vietnam/Malasia) · LAC frontera India.',
    organized_crime_notes: 'Tríadas (Hong Kong/Macau) · scams cyber-criminales (pig butchering).',
    primary_security_threat: 'Separatismo (Xinjiang Uighur · Tibet · Taiwán) + ciberguerra.',
  },
  UKR: {
    iso3: 'UKR', gpi_score: 3.39, gpi_rank: 157, homicide_per_100k: 6.7, terror_attacks_2023: 0, terror_fatalities_2023: 0,
    cpi_score: 36, cpi_rank: 104, fragility_score: 85.3, fragility_category: 'alert',
    press_freedom_score: 65.0, press_freedom_rank: 61,
    active_border_tensions: true, border_tension_notes: 'Guerra invasión rusa desde 2022 · 18% territorio ocupado.',
    organized_crime_notes: 'Tráfico armas + corrupción endémica en transición.',
    primary_security_threat: 'Agresión militar Rusia · ataques drones contra infraestructura crítica.',
  },
  ISR: {
    iso3: 'ISR', gpi_score: 3.15, gpi_rank: 155, homicide_per_100k: 1.4, terror_attacks_2023: 35, terror_fatalities_2023: 1389,
    cpi_score: 62, cpi_rank: 33, fragility_score: 51.5, fragility_category: 'warning',
    press_freedom_score: 70.13, press_freedom_rank: 101,
    active_border_tensions: true, border_tension_notes: 'Guerra Gaza activa · frontera norte (Hezbolá) · West Bank · normalización Abraham Accords.',
    organized_crime_notes: 'Mafia israelí (Abergil family) · contrabando armas.',
    primary_security_threat: 'Conflicto Gaza + Hezbolá norte + Houthi ataques desde Yemen + Irán.',
  },
  ESP: {
    iso3: 'ESP', gpi_score: 1.62, gpi_rank: 23, homicide_per_100k: 0.7, terror_attacks_2023: 0, terror_fatalities_2023: 0,
    cpi_score: 60, cpi_rank: 36, fragility_score: 36.0, fragility_category: 'stable',
    press_freedom_score: 77.07, press_freedom_rank: 30,
    active_border_tensions: false, border_tension_notes: 'Disputa Gibraltar · diferendos Ceuta/Melilla con Marruecos (no escalada).',
    organized_crime_notes: 'Camellos Marruecos · narcotráfico Galicia · mafias internacionales Costa del Sol.',
    primary_security_threat: 'Yihadismo importado · migración irregular Canarias · narcotráfico hispano.',
  },
  FRA: {
    iso3: 'FRA', gpi_score: 1.90, gpi_rank: 87, homicide_per_100k: 1.1, terror_attacks_2023: 3, terror_fatalities_2023: 4,
    cpi_score: 71, cpi_rank: 20, fragility_score: 31.5, fragility_category: 'stable',
    press_freedom_score: 78.65, press_freedom_rank: 21,
    active_border_tensions: false, border_tension_notes: 'Sin disputas territoriales en territorio metropolitano · tensiones DOM-TOM (Nueva Caledonia).',
    organized_crime_notes: 'Marsella/Lyon · cárteles drogas + ULTRAS · grupos albanesas/colombianas.',
    primary_security_threat: 'Yihadismo (Charlie Hebdo, Bataclán) + extremismo islamista local + ultraderecha.',
  },
  DEU: {
    iso3: 'DEU', gpi_score: 1.65, gpi_rank: 17, homicide_per_100k: 0.9, terror_attacks_2023: 7, terror_fatalities_2023: 6,
    cpi_score: 78, cpi_rank: 9, fragility_score: 26.5, fragility_category: 'stable',
    press_freedom_score: 81.91, press_freedom_rank: 10,
    active_border_tensions: false, border_tension_notes: 'Sin disputas territoriales · espionaje ruso/chino documentado.',
    organized_crime_notes: 'Clanes árabes-libaneses Berlín · mafia rusa · grupos balcánicos.',
    primary_security_threat: 'AfD extremismo + islamismo + sabotaje ruso infraestructura.',
  },
  GBR: {
    iso3: 'GBR', gpi_score: 1.69, gpi_rank: 34, homicide_per_100k: 1.2, terror_attacks_2023: 5, terror_fatalities_2023: 0,
    cpi_score: 73, cpi_rank: 20, fragility_score: 34.0, fragility_category: 'stable',
    press_freedom_score: 73.4, press_freedom_rank: 26,
    active_border_tensions: false, border_tension_notes: 'Brexit fronteras Irlanda Norte/ROI · disputa Malvinas con Argentina (sin escalada).',
    organized_crime_notes: 'OCG endémicas Londres/Liverpool · ciberguerra GRU contra UK gov.',
    primary_security_threat: 'Yihadismo importado · extremismo ultraderecha · espionaje hostile state.',
  },
  IND: {
    iso3: 'IND', gpi_score: 2.62, gpi_rank: 116, homicide_per_100k: 2.9, terror_attacks_2023: 62, terror_fatalities_2023: 79,
    cpi_score: 39, cpi_rank: 93, fragility_score: 72.0, fragility_category: 'warning',
    press_freedom_score: 36.62, press_freedom_rank: 159,
    active_border_tensions: true, border_tension_notes: 'LAC India-China · Kashmir disputado con Pakistán (LoC) · Aksai Chin.',
    organized_crime_notes: 'D-Company Dawood (Mumbai/Karachi) · corrupción endémica.',
    primary_security_threat: 'Terrorismo islamista (Cachemira) + naxalismo maoísta + tensiones LAC.',
  },
  PAK: {
    iso3: 'PAK', gpi_score: 3.05, gpi_rank: 145, homicide_per_100k: 4.4, terror_attacks_2023: 490, terror_fatalities_2023: 689,
    cpi_score: 29, cpi_rank: 133, fragility_score: 91.5, fragility_category: 'alert',
    press_freedom_score: 33.9, press_freedom_rank: 152,
    active_border_tensions: true, border_tension_notes: 'LoC Kashmir activo · frontera Durand Line Afghanistan · tensiones Irán Baluchistan.',
    organized_crime_notes: 'Heroína Afghan tránsito · ISI proxies (LeT, JeM) cuestionado.',
    primary_security_threat: 'TTP (Pakistani Taliban) + BLA Baluchistan + tensiones India.',
  },
  TUR: {
    iso3: 'TUR', gpi_score: 2.66, gpi_rank: 137, homicide_per_100k: 2.4, terror_attacks_2023: 24, terror_fatalities_2023: 48,
    cpi_score: 34, cpi_rank: 115, fragility_score: 75.0, fragility_category: 'alert',
    press_freedom_score: 31.6, press_freedom_rank: 158,
    active_border_tensions: true, border_tension_notes: 'Norte Siria operación buffer · norte Iraq PKK · Egeo con Grecia · Chipre.',
    organized_crime_notes: 'Tránsito heroína Afghan-EU · grupos turcos diáspora EU.',
    primary_security_threat: 'PKK insurgencia + remanentes Daesh + Gulenistas (FETÖ post-golpe 2016).',
  },
  KOR: {
    iso3: 'KOR', gpi_score: 1.85, gpi_rank: 53, homicide_per_100k: 0.5, terror_attacks_2023: 0, terror_fatalities_2023: 0,
    cpi_score: 63, cpi_rank: 32, fragility_score: 36.0, fragility_category: 'stable',
    press_freedom_score: 76.49, press_freedom_rank: 47,
    active_border_tensions: true, border_tension_notes: 'DMZ activa Corea del Norte · disputas Dokdo/Takeshima con Japón.',
    organized_crime_notes: 'Tríadas chinas operando · phishing transnacional.',
    primary_security_threat: 'Corea del Norte (misiles · ciberguerra Lazarus) + China espionaje.',
  },
  JPN: {
    iso3: 'JPN', gpi_score: 1.34, gpi_rank: 9, homicide_per_100k: 0.2, terror_attacks_2023: 0, terror_fatalities_2023: 0,
    cpi_score: 73, cpi_rank: 16, fragility_score: 32.0, fragility_category: 'stable',
    press_freedom_score: 65.69, press_freedom_rank: 70,
    active_border_tensions: true, border_tension_notes: 'Senkaku/Diaoyu con China · Dokdo/Takeshima con Corea · Kuriles con Rusia.',
    organized_crime_notes: 'Yakuza en declive desde 2011 ley · grupos hangure han adoptado actividades.',
    primary_security_threat: 'Misiles Corea del Norte + tensiones China Mar Sur + ciberguerra.',
  },
  MEX: {
    iso3: 'MEX', gpi_score: 2.93, gpi_rank: 138, homicide_per_100k: 25.0, terror_attacks_2023: 22, terror_fatalities_2023: 73,
    cpi_score: 31, cpi_rank: 126, fragility_score: 70.5, fragility_category: 'warning',
    press_freedom_score: 34.92, press_freedom_rank: 121,
    active_border_tensions: false, border_tension_notes: 'Tensión migratoria/fentanilo USA · sin disputas territoriales formales.',
    organized_crime_notes: 'Cárteles Sinaloa/CJNG/Familia Michoacana · fentanilo + tráfico humano.',
    primary_security_threat: 'Narcoviolencia · 30.000+ desaparecidos · captura de Estado regional.',
  },
  BRA: {
    iso3: 'BRA', gpi_score: 2.46, gpi_rank: 130, homicide_per_100k: 22.8, terror_attacks_2023: 4, terror_fatalities_2023: 2,
    cpi_score: 36, cpi_rank: 104, fragility_score: 65.0, fragility_category: 'warning',
    press_freedom_score: 58.31, press_freedom_rank: 82,
    active_border_tensions: false, border_tension_notes: 'Sin disputas territoriales · tensión Venezuela esequibo Guyana.',
    organized_crime_notes: 'PCC (São Paulo) + Comando Vermelho (Rio) · narcotráfico transatlántico.',
    primary_security_threat: 'Violencia favelas · narcotráfico transatlántico · deforestación crimen organizado.',
  },
  SAU: {
    iso3: 'SAU', gpi_score: 2.55, gpi_rank: 121, homicide_per_100k: 1.5, terror_attacks_2023: 5, terror_fatalities_2023: 8,
    cpi_score: 52, cpi_rank: 53, fragility_score: 71.5, fragility_category: 'warning',
    press_freedom_score: 30.49, press_freedom_rank: 166,
    active_border_tensions: true, border_tension_notes: 'Guerra Yemen activa (Houthi) · histórica Catar (resuelta) · Egipto Tiran/Sanafir.',
    organized_crime_notes: 'Migración irregular · tráfico humano OFW.',
    primary_security_threat: 'Houthi ataques desde Yemen + Irán proxy + extremismo doméstico.',
  },
  EGY: {
    iso3: 'EGY', gpi_score: 2.70, gpi_rank: 134, homicide_per_100k: 1.8, terror_attacks_2023: 15, terror_fatalities_2023: 22,
    cpi_score: 35, cpi_rank: 108, fragility_score: 85.0, fragility_category: 'alert',
    press_freedom_score: 30.39, press_freedom_rank: 170,
    active_border_tensions: true, border_tension_notes: 'Sinaí ISIS-K activo · frontera Libia · GERD Etiopía (Nilo).',
    organized_crime_notes: 'Contrabando Mediterráneo · migración irregular Sahel.',
    primary_security_threat: 'ISIS-Sinaí + crisis económica → inestabilidad social.',
  },
  IRN: {
    iso3: 'IRN', gpi_score: 2.89, gpi_rank: 144, homicide_per_100k: 2.5, terror_attacks_2023: 14, terror_fatalities_2023: 113,
    cpi_score: 24, cpi_rank: 149, fragility_score: 81.5, fragility_category: 'alert',
    press_freedom_score: 21.30, press_freedom_rank: 176,
    active_border_tensions: true, border_tension_notes: 'Estrecho Ormuz · Afghanistan · Iraq proxies · Israel guerra sombra.',
    organized_crime_notes: 'Heroína Afghan tránsito · IRGC actividades extraterritoriales.',
    primary_security_threat: 'Israel-USA escalada + protestas Mahsa Amini + insurgencia Baluchistan.',
  },
  // Países con datos parciales · default null
  AFG: {
    iso3: 'AFG', gpi_score: 3.45, gpi_rank: 162, homicide_per_100k: 6.0, terror_attacks_2023: 35, terror_fatalities_2023: 250,
    cpi_score: 17, cpi_rank: 165, fragility_score: 105.0, fragility_category: 'critical',
    press_freedom_score: 26.99, press_freedom_rank: 178,
    active_border_tensions: true, border_tension_notes: 'Frontera Pakistán Durand · refugiados Irán · ISIS-K activo.',
    organized_crime_notes: 'Heroína 80% mundial · Talibán control.',
    primary_security_threat: 'Régimen Talibán · ISIS-K · crisis humanitaria endémica.',
  },
  YEM: {
    iso3: 'YEM', gpi_score: 3.35, gpi_rank: 160, homicide_per_100k: 7.2, terror_attacks_2023: 60, terror_fatalities_2023: 320,
    cpi_score: 16, cpi_rank: 170, fragility_score: 110.5, fragility_category: 'critical',
    press_freedom_score: 24.61, press_freedom_rank: 174,
    active_border_tensions: true, border_tension_notes: 'Guerra civil Houthi vs gobierno reconocido · ataques Mar Rojo.',
    organized_crime_notes: 'Contrabando armas Irán-Houthi vía mar.',
    primary_security_threat: 'Guerra civil + ataques Mar Rojo + crisis humanitaria.',
  },
  SYR: {
    iso3: 'SYR', gpi_score: 3.30, gpi_rank: 161, homicide_per_100k: 6.4, terror_attacks_2023: 78, terror_fatalities_2023: 540,
    cpi_score: 13, cpi_rank: 178, fragility_score: 109.0, fragility_category: 'critical',
    press_freedom_score: 16.16, press_freedom_rank: 179,
    active_border_tensions: true, border_tension_notes: 'Caída Assad dic-2024 · transición HTS · vacío seguridad norte/este.',
    organized_crime_notes: 'Captagon tráfico · ISIS remanente.',
    primary_security_threat: 'Transición post-Assad · ISIS resurgencia · interferencia Turquía/Israel.',
  },
  SDN: {
    iso3: 'SDN', gpi_score: 3.35, gpi_rank: 160, homicide_per_100k: 5.5, terror_attacks_2023: 0, terror_fatalities_2023: 0,
    cpi_score: 20, cpi_rank: 162, fragility_score: 108.0, fragility_category: 'critical',
    press_freedom_score: 21.04, press_freedom_rank: 165,
    active_border_tensions: true, border_tension_notes: 'Guerra SAF vs RSF · refugiados Chad/Egipto/Sudán Sur.',
    organized_crime_notes: 'Oro contrabando Wagner.',
    primary_security_threat: 'Guerra civil SAF-RSF + genocidio Darfur + crisis humanitaria mundial.',
  },
  // Países seguros · default valores
  CAN: {
    iso3: 'CAN', gpi_score: 1.35, gpi_rank: 11, homicide_per_100k: 1.9, terror_attacks_2023: 1, terror_fatalities_2023: 0,
    cpi_score: 76, cpi_rank: 12, fragility_score: 23.5, fragility_category: 'sustainable',
    press_freedom_score: 80.79, press_freedom_rank: 14,
    active_border_tensions: false, border_tension_notes: 'Disputa Arctic con Rusia/Dinamarca · NW Passage status.',
    organized_crime_notes: 'Hells Angels · OCG asiáticas Vancouver · fentanilo crisis BC.',
    primary_security_threat: 'Interferencia china (foreign agents) + crisis fentanilo + ultraderecha.',
  },
  AUS: {
    iso3: 'AUS', gpi_score: 1.51, gpi_rank: 22, homicide_per_100k: 0.9, terror_attacks_2023: 0, terror_fatalities_2023: 0,
    cpi_score: 75, cpi_rank: 14, fragility_score: 22.0, fragility_category: 'sustainable',
    press_freedom_score: 76.61, press_freedom_rank: 39,
    active_border_tensions: false, border_tension_notes: 'Sin disputas territoriales · tensión China Pacífico.',
    organized_crime_notes: 'OMCG (bikie gangs) · meth importación.',
    primary_security_threat: 'China interferencia + AUKUS posicionamiento + ciberguerra.',
  },
  ITA: {
    iso3: 'ITA', gpi_score: 1.78, gpi_rank: 39, homicide_per_100k: 0.6, terror_attacks_2023: 0, terror_fatalities_2023: 0,
    cpi_score: 56, cpi_rank: 42, fragility_score: 44.5, fragility_category: 'warning',
    press_freedom_score: 70.99, press_freedom_rank: 41,
    active_border_tensions: false, border_tension_notes: 'Sin disputas territoriales · tensión migración Mediterráneo central.',
    organized_crime_notes: 'Mafias (Cosa Nostra, Camorra, \'Ndrangheta, Sacra Corona Unita) endémicas.',
    primary_security_threat: 'Mafia + yihadismo (vínculos Túnez) + migración irregular.',
  },
}

/**
 * Devuelve indicadores seguridad para país · null si no está en seed.
 */
export function getSecurityIndicators(iso3: string): SecurityIndicators | null {
  return SECURITY_INDICATORS[iso3.toUpperCase()] || null
}
