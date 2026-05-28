/**
 * UCDP-PRIO Top 30 Active Armed Conflicts · Sprint GEO-NEXT FIX-A3
 *
 * Seed estructural de los 30 conflictos armados activos más relevantes del mundo,
 * tipificados según la metodología UCDP (Uppsala Conflict Data Program) + PRIO:
 *
 *   - state-based: gobierno estatal vs. actor armado (incluido state vs state)
 *   - non-state:   grupo armado vs. grupo armado (sin estado parte)
 *   - one-sided:   violencia organizada contra civiles
 *
 * Intensidad UCDP/PRIO:
 *   5 = guerra mayor      >10.000 muertos/año o impacto global crítico
 *   4 = guerra            1.000-10.000 muertos/año
 *   3 = conflicto medio   200-1.000 muertos/año
 *   2 = conflicto menor   25-200 muertos/año
 *   1 = baja intensidad   <25 muertos/año pero violencia organizada activa
 *
 * Datos baseline (corte 2025-Q4) construidos cruzando:
 *   - UCDP Conflict Encyclopedia (https://ucdp.uu.se)
 *   - IISS Armed Conflict Survey 2024
 *   - SIPRI Yearbook 2024
 *   - ReliefWeb crisis profiles
 *   - Global Conflict Tracker (CFR)
 *
 * Este seed garantiza que el mapa de conflictos nunca esté vacío aunque
 * GDELT esté rate-limited o caído. Se enriquece luego con eventos GDELT,
 * tono, themes, fuentes cuando estén disponibles.
 *
 * NOTA: este es un seed estructural — no sustituye a datos UCDP REST
 * en tiempo real. Capa B integrará pulls programáticos de UCDP API.
 */

export type UcdpConflictType = 'state-based' | 'non-state' | 'one-sided'
export type UcdpIntensity = 1 | 2 | 3 | 4 | 5

export interface UcdpActiveConflict {
  /** ISO 3166-1 alpha-3 del país principal donde se desarrolla */
  iso3: string
  /** Nombre humano del conflicto en español (ej: "Guerra de Ucrania") */
  conflict_label: string
  /** Tipología UCDP */
  conflict_type: UcdpConflictType
  /** Intensidad UCDP/PRIO (1-5) */
  intensity_baseline: UcdpIntensity
  /** Año de inicio o reactivación del conflicto actual */
  start_year: number
  /** Actores armados principales (gobierno + insurgentes/grupos) */
  actors: string[]
  /** Categoría temática para iconos UI */
  themes: string[]
  /** Estimación muertes/año (orden de magnitud ACLED+UCDP) */
  fatalities_year_est: number
  /** Notas críticas para drawer país */
  notes: string
}

/**
 * Top 30 conflictos armados activos · cierre 2025-Q4
 *
 * Orden = severidad (intensidad × fatalities × impacto global).
 * Editar este array si UCDP/IISS reporta nueva entrada/escalada.
 */
export const UCDP_ACTIVE_CONFLICTS: UcdpActiveConflict[] = [
  // ─── Intensidad 5 · guerras mayores ──────────────────────────────────
  {
    iso3: 'UKR',
    conflict_label: 'Guerra de Ucrania',
    conflict_type: 'state-based',
    intensity_baseline: 5,
    start_year: 2022,
    actors: ['Rusia', 'Ucrania', 'OTAN (apoyo)'],
    themes: ['WAR_CONFLICT', 'MILITARY', 'SANCTIONS'],
    fatalities_year_est: 35000,
    notes: 'Conflicto interestatal de mayor escala desde 1945 en territorio europeo. Línea de frente Donbass + Zaporiyia. Bombardeos sobre infraestructura energética.',
  },
  {
    iso3: 'SDN',
    conflict_label: 'Guerra civil de Sudán (SAF vs RSF)',
    conflict_type: 'state-based',
    intensity_baseline: 5,
    start_year: 2023,
    actors: ['Fuerzas Armadas Sudanesas (SAF)', 'Fuerzas de Apoyo Rápido (RSF)'],
    themes: ['WAR_CONFLICT', 'HUMANITARIAN', 'DISPLACEMENT'],
    fatalities_year_est: 25000,
    notes: 'Mayor crisis humanitaria del mundo. >10M desplazados internos, hambruna en Darfur y Kordofán. RSF controla Jartum oeste y Darfur.',
  },
  {
    iso3: 'MMR',
    conflict_label: 'Guerra civil de Myanmar (junta vs PDF + EAOs)',
    conflict_type: 'state-based',
    intensity_baseline: 5,
    start_year: 2021,
    actors: ['Junta militar (Tatmadaw)', 'Fuerzas de Defensa del Pueblo (PDF)', 'EAOs (KIA, AA, TNLA, MNDAA)'],
    themes: ['WAR_CONFLICT', 'HUMAN_RIGHTS', 'INSURGENCY'],
    fatalities_year_est: 18000,
    notes: 'Tras el golpe 2021 la junta ha perdido >60% del territorio. Operación 1027 (Alianza Hermandad) reconfiguró el norte. Bombardeos indiscriminados.',
  },
  {
    iso3: 'PSE',
    conflict_label: 'Guerra Israel-Hamas en Gaza + Cisjordania',
    conflict_type: 'state-based',
    intensity_baseline: 5,
    start_year: 2023,
    actors: ['Israel (FDI)', 'Hamas', 'Yihad Islámica Palestina', 'Hezbolá (vinculado)'],
    themes: ['WAR_CONFLICT', 'HUMANITARIAN', 'TERRORISM'],
    fatalities_year_est: 45000,
    notes: 'Tras 7-O 2023. Devastación de Gaza, >2M desplazados, riesgo de genocidio (CIJ). Escalada con Hezbolá en frontera norte. CPI emitió órdenes contra Netanyahu y Sinwar.',
  },

  // ─── Intensidad 4 · guerras ──────────────────────────────────────────
  {
    iso3: 'YEM',
    conflict_label: 'Guerra civil de Yemen',
    conflict_type: 'state-based',
    intensity_baseline: 4,
    start_year: 2014,
    actors: ['Gobierno reconocido', 'Hutíes (Ansar Allah)', 'STC', 'Coalición Arabia Saudí'],
    themes: ['WAR_CONFLICT', 'HUMANITARIAN', 'MARITIME_SECURITY'],
    fatalities_year_est: 8500,
    notes: 'Tras tregua 2022-23 los Hutíes atacan navegación en el Mar Rojo (Op. Prosperity Guardian). Crisis humanitaria con 21M en necesidad de ayuda.',
  },
  {
    iso3: 'COD',
    conflict_label: 'Conflicto del este de RDC (M23 + ADF)',
    conflict_type: 'state-based',
    intensity_baseline: 4,
    start_year: 2022,
    actors: ['FARDC', 'M23 (apoyo Ruanda)', 'ADF (vinculado EI)', 'CODECO', 'Wazalendo'],
    themes: ['WAR_CONFLICT', 'INSURGENCY', 'CRITICAL_MINERALS'],
    fatalities_year_est: 7800,
    notes: 'M23 tomó Goma y Bukavu (ene-feb 2025). >7M desplazados internos en Kivu Norte/Sur. Control sobre minas de coltán/cobalto críticos.',
  },
  {
    iso3: 'SYR',
    conflict_label: 'Transición siria post-Asad',
    conflict_type: 'state-based',
    intensity_baseline: 4,
    start_year: 2011,
    actors: ['Gobierno HTS (al-Sharaa)', 'SDF (Kurdos)', 'EI remanentes', 'Israel', 'Turquía'],
    themes: ['WAR_CONFLICT', 'INSURGENCY', 'TERRORISM'],
    fatalities_year_est: 5200,
    notes: 'Tras caída de Asad (dic 2024) HTS gobierna. Operaciones turcas contra SDF, israelíes contra reductos pro-Irán. EI activo en desierto central.',
  },
  {
    iso3: 'SOM',
    conflict_label: 'Insurgencia Al-Shabaab',
    conflict_type: 'state-based',
    intensity_baseline: 4,
    start_year: 2006,
    actors: ['Gobierno federal', 'Al-Shabaab', 'ATMIS (UA)', 'EE.UU. (AFRICOM)'],
    themes: ['TERRORISM', 'WAR_CONFLICT', 'AFRICOM'],
    fatalities_year_est: 4800,
    notes: 'Al-Shabaab controla zonas rurales del centro-sur. Ataques regulares en Mogadiscio. Operaciones aéreas AFRICOM + Macawisley.',
  },
  {
    iso3: 'MEX',
    conflict_label: 'Guerra contra el narco (cárteles)',
    conflict_type: 'non-state',
    intensity_baseline: 4,
    start_year: 2006,
    actors: ['CJNG', 'Cártel de Sinaloa', 'CDN', 'Familia Michoacana', 'Gobierno mexicano (Sedena/GN)'],
    themes: ['ORGANIZED_CRIME', 'DRUG_TRAFFICKING', 'HOMICIDE'],
    fatalities_year_est: 30000,
    notes: 'Tasa homicidios >24/100k. Disputas Sinaloa vs CJNG en Sinaloa, Zacatecas, Michoacán. Cárteles designados FTOs por EE.UU. (ene 2025).',
  },
  {
    iso3: 'MLI',
    conflict_label: 'Insurgencia Sahel central · Mali',
    conflict_type: 'state-based',
    intensity_baseline: 4,
    start_year: 2012,
    actors: ['Junta militar', 'JNIM (Al-Qaeda)', 'EIGS', 'Wagner/Africa Corps', 'CSP-PSD (tuareg)'],
    themes: ['TERRORISM', 'WAR_CONFLICT', 'AFRICOM'],
    fatalities_year_est: 4500,
    notes: 'Salida MINUSMA (dic 2023) y CEDEAO (ene 2024). Ofensivas yihadistas en centro y norte. Wagner/Africa Corps operando con junta.',
  },
  {
    iso3: 'ETH',
    conflict_label: 'Conflictos Amhara + Oromía',
    conflict_type: 'state-based',
    intensity_baseline: 4,
    start_year: 2023,
    actors: ['ENDF', 'Fano (Amhara)', 'OLA (Oromía)', 'Tigray (TPLF remanente)'],
    themes: ['WAR_CONFLICT', 'ETHNIC_CONFLICT', 'INSURGENCY'],
    fatalities_year_est: 4200,
    notes: 'Tras Pretoria (2022) el conflicto se reactivó en Amhara (estado de emergencia) y Oromía. Tensiones por Tigray pendientes.',
  },
  {
    iso3: 'NGA',
    conflict_label: 'Insurgencia Boko Haram/ISWAP + bandidaje',
    conflict_type: 'state-based',
    intensity_baseline: 4,
    start_year: 2009,
    actors: ['NAF', 'Boko Haram', 'ISWAP', 'Bandidos noroeste', 'IPOB'],
    themes: ['TERRORISM', 'WAR_CONFLICT', 'KIDNAPPING'],
    fatalities_year_est: 5800,
    notes: 'NE Lago Chad: Boko Haram + ISWAP activos. NO: bandidaje masivo (secuestros). SE: IPOB/ESN. Crisis pastoralista en Middle Belt.',
  },
  {
    iso3: 'BFA',
    conflict_label: 'Insurgencia yihadista Burkina Faso',
    conflict_type: 'state-based',
    intensity_baseline: 4,
    start_year: 2015,
    actors: ['Junta militar', 'JNIM', 'EIGS', 'VDP (milicias)'],
    themes: ['TERRORISM', 'WAR_CONFLICT', 'AFRICOM'],
    fatalities_year_est: 4800,
    notes: 'Junta controla solo ~60% del territorio. JNIM domina norte y este. Reclutamiento masivo VDP (milicia voluntaria) con abusos contra civiles.',
  },

  // ─── Intensidad 3 · conflictos medios ────────────────────────────────
  {
    iso3: 'NER',
    conflict_label: 'Insurgencia Sahel · Níger',
    conflict_type: 'state-based',
    intensity_baseline: 3,
    start_year: 2015,
    actors: ['Junta CNSP', 'JNIM', 'EIGS', 'Boko Haram'],
    themes: ['TERRORISM', 'WAR_CONFLICT'],
    fatalities_year_est: 1800,
    notes: 'Tras golpe jul-2023. Salida tropas francesas y EE.UU. Triple frontera Liptako-Gourma activa. Refuerzo de Wagner/Africa Corps.',
  },
  {
    iso3: 'MOZ',
    conflict_label: 'Insurgencia Cabo Delgado (ISCAP)',
    conflict_type: 'state-based',
    intensity_baseline: 3,
    start_year: 2017,
    actors: ['FADM', 'ISCAP (Ahlu Sunnah)', 'SAMIM (SADC)', 'Ruanda (RDF)'],
    themes: ['TERRORISM', 'WAR_CONFLICT', 'LNG'],
    fatalities_year_est: 1200,
    notes: 'Tropas ruandesas y SADC contienen pero no derrotan. Proyecto LNG TotalEnergies paralizado. Desplazados ~700k.',
  },
  {
    iso3: 'AFG',
    conflict_label: 'Insurgencia ISKP vs talibanes',
    conflict_type: 'state-based',
    intensity_baseline: 3,
    start_year: 2021,
    actors: ['Emirato Islámico (talibanes)', 'ISKP (Estado Islámico-Khorasan)', 'NRF (Panshir)'],
    themes: ['TERRORISM', 'WAR_CONFLICT', 'HUMANITARIAN'],
    fatalities_year_est: 2100,
    notes: 'ISKP ejecuta atentados regulares en Kabul. Crisis humanitaria + colapso económico + apartheid de género. Atentado Moscú (mar 2024) atribuido.',
  },
  {
    iso3: 'PAK',
    conflict_label: 'Insurgencia TTP + Balochistán',
    conflict_type: 'state-based',
    intensity_baseline: 3,
    start_year: 2007,
    actors: ['Ejército paquistaní (ISI)', 'TTP', 'BLA', 'Talibán afgano (refugio)'],
    themes: ['TERRORISM', 'WAR_CONFLICT', 'INSURGENCY'],
    fatalities_year_est: 2400,
    notes: 'TTP reactivado tras toma talibán Afganistán (2021). BLA escala ataques contra inversiones chinas (CPEC) en Gwadar y Quetta.',
  },
  {
    iso3: 'IRQ',
    conflict_label: 'EI remanente + tensión Irán-EE.UU.',
    conflict_type: 'state-based',
    intensity_baseline: 3,
    start_year: 2014,
    actors: ['ISF', 'PMF (Hashd)', 'EI remanente', 'EE.UU. (Inherent Resolve)', 'Kataib Hezbolá'],
    themes: ['TERRORISM', 'WAR_CONFLICT', 'OIL'],
    fatalities_year_est: 900,
    notes: 'EI conserva células en Anbar/Kirkuk. Milicias pro-Irán atacan bases EE.UU. esporádicamente. Tensión por extracción tropas EE.UU. (2026).',
  },
  {
    iso3: 'LBN',
    conflict_label: 'Conflicto Israel-Hezbolá + crisis política',
    conflict_type: 'state-based',
    intensity_baseline: 3,
    start_year: 2023,
    actors: ['Hezbolá', 'FDI (Israel)', 'Estado libanés (débil)', 'UNIFIL'],
    themes: ['WAR_CONFLICT', 'TERRORISM', 'MARITIME_SECURITY'],
    fatalities_year_est: 3800,
    notes: 'Tras escalada sep-2024 (busca-personas + asesinato Nasrallah). Tregua nov-2024 frágil. Crisis económica + sin presidente desde 2022.',
  },
  {
    iso3: 'CMR',
    conflict_label: 'Crisis Ambazonia + Boko Haram',
    conflict_type: 'state-based',
    intensity_baseline: 3,
    start_year: 2017,
    actors: ['Ejército camerunés', 'ADF Ambazonia', 'Boko Haram (Far North)'],
    themes: ['WAR_CONFLICT', 'TERRORISM', 'ETHNIC_CONFLICT'],
    fatalities_year_est: 1100,
    notes: 'Regiones anglófonas NW/SW en conflicto separatista. Far North con incursiones Boko Haram desde Nigeria/Chad.',
  },
  {
    iso3: 'SSD',
    conflict_label: 'Violencia intercomunal + crisis política',
    conflict_type: 'state-based',
    intensity_baseline: 3,
    start_year: 2013,
    actors: ['SSPDF', 'SPLA-IO', 'NAS', 'Milicias étnicas (nuer, dinka, murle)'],
    themes: ['WAR_CONFLICT', 'ETHNIC_CONFLICT', 'HUMANITARIAN'],
    fatalities_year_est: 1500,
    notes: 'Acuerdo paz R-ARCSS (2018) mal implementado. Elecciones postergadas hasta dic 2026. Refugiados sudaneses presionando recursos.',
  },
  {
    iso3: 'CAF',
    conflict_label: 'Conflicto FACA vs CPC',
    conflict_type: 'state-based',
    intensity_baseline: 3,
    start_year: 2013,
    actors: ['FACA', 'CPC (coalición rebeldes)', 'Wagner/Africa Corps', 'MINUSCA'],
    themes: ['WAR_CONFLICT', 'INSURGENCY', 'CRITICAL_MINERALS'],
    fatalities_year_est: 800,
    notes: 'Gobierno Touadéra controla Bangui + corredores. Wagner/Africa Corps presente. Tensiones con diamantes/oro.',
  },
  {
    iso3: 'COL',
    conflict_label: 'Insurgencia ELN + disidencias FARC',
    conflict_type: 'state-based',
    intensity_baseline: 3,
    start_year: 1964,
    actors: ['Fuerzas Armadas', 'ELN', 'FARC disidencias (EMC, Segunda Marquetalia)', 'Clan del Golfo'],
    themes: ['INSURGENCY', 'DRUG_TRAFFICKING', 'WAR_CONFLICT'],
    fatalities_year_est: 900,
    notes: '"Paz total" Petro estancada. ELN suspendió diálogo (sep 2024). Disidencias controlan corredores cocaleros Cauca/Catatumbo.',
  },
  {
    iso3: 'HTI',
    conflict_label: 'Colapso estatal · bandas armadas',
    conflict_type: 'non-state',
    intensity_baseline: 3,
    start_year: 2021,
    actors: ['Bandas (Viv Ansanm, G-Pèp)', 'PNH', 'MSS (misión Kenia)', 'Gobierno transición'],
    themes: ['ORGANIZED_CRIME', 'GANG_VIOLENCE', 'HUMANITARIAN'],
    fatalities_year_est: 5800,
    notes: 'Bandas controlan ~85% Puerto Príncipe. MSS (misión multinacional liderada por Kenia) desplegándose. Sin elecciones desde 2016.',
  },
  {
    iso3: 'LBY',
    conflict_label: 'División Este-Oeste (GNU vs Haftar)',
    conflict_type: 'state-based',
    intensity_baseline: 3,
    start_year: 2014,
    actors: ['GNU (Trípoli)', 'LNA-Haftar (Tobruk)', 'Milicias varias', 'Wagner'],
    themes: ['WAR_CONFLICT', 'OIL', 'MIGRATION'],
    fatalities_year_est: 600,
    notes: 'Alto el fuego 2020 sostenido pero territorialmente dividido. Elecciones imposibles. Punto crítico migración hacia UE.',
  },

  // ─── Intensidad 2 · conflictos menores ───────────────────────────────
  {
    iso3: 'PHL',
    conflict_label: 'Insurgencia NPA + ASG/BIFF',
    conflict_type: 'state-based',
    intensity_baseline: 2,
    start_year: 1969,
    actors: ['AFP', 'NPA (CPP)', 'ASG', 'BIFF', 'MILF'],
    themes: ['INSURGENCY', 'TERRORISM', 'WAR_CONFLICT'],
    fatalities_year_est: 400,
    notes: 'NPA en declive estructural. Bangsamoro autonomía implementándose (BARMM). Tensiones SCS con China son foco principal de FAS.',
  },
  {
    iso3: 'IRN',
    conflict_label: 'Tensiones internas + ataques Israel',
    conflict_type: 'one-sided',
    intensity_baseline: 2,
    start_year: 2022,
    actors: ['Estado iraní (IRGC, Basij)', 'Protestas Mahsa Amini', 'Insurgencia kurda (PJAK)', 'Israel'],
    themes: ['HUMAN_RIGHTS', 'CIVIL_UNREST', 'WAR_CONFLICT'],
    fatalities_year_est: 600,
    notes: 'Ataques israelíes contra instalaciones nucleares + IRGC (abr-oct 2024). Régimen Pezeshkian busca equilibrio. Insurgencia kurda noroeste activa.',
  },
  {
    iso3: 'TCD',
    conflict_label: 'Insurgencia FACT + refugiados Sudán',
    conflict_type: 'state-based',
    intensity_baseline: 2,
    start_year: 2021,
    actors: ['Ejército chadiano', 'FACT', 'CCMSR', 'Refugiados Sudán'],
    themes: ['WAR_CONFLICT', 'HUMANITARIAN', 'DISPLACEMENT'],
    fatalities_year_est: 350,
    notes: 'Tras muerte Idriss Déby (abr-2021). Hijo Mahamat consolidó poder. >1.1M refugiados sudaneses presionan este país. JNIM amenaza desde Níger.',
  },
  {
    iso3: 'IND',
    conflict_label: 'Naxalitas + Cachemira + Manipur',
    conflict_type: 'state-based',
    intensity_baseline: 2,
    start_year: 1967,
    actors: ['Fuerzas Armadas India', 'CPI-Maoist (Naxalitas)', 'HM/LeT (Cachemira)', 'Milicias étnicas (Manipur)'],
    themes: ['INSURGENCY', 'TERRORISM', 'ETHNIC_CONFLICT'],
    fatalities_year_est: 450,
    notes: 'Operaciones contranaxalitas intensas (Chhattisgarh). Cachemira con baja intensidad post-revocación 370. Manipur en conflicto étnico Meitei-Kuki desde 2023.',
  },
  {
    iso3: 'TUR',
    conflict_label: 'Conflicto Turquía-PKK',
    conflict_type: 'state-based',
    intensity_baseline: 2,
    start_year: 1984,
    actors: ['Fuerzas Armadas Turcas', 'PKK', 'YPG/SDF (Siria, blanco)'],
    themes: ['INSURGENCY', 'TERRORISM', 'WAR_CONFLICT'],
    fatalities_year_est: 350,
    notes: 'PKK anunció disolución (mayo 2025) tras llamada de Öcalan. Operaciones turcas contra YPG/SDF en Siria continúan. Atentado Ankara TUSAS (oct 2024).',
  },
]

/**
 * Devuelve mapa iso3 → entrada UCDP para enriquecimiento rápido.
 */
export function getUcdpConflictByIso(iso3: string): UcdpActiveConflict | null {
  return UCDP_ACTIVE_CONFLICTS.find((c) => c.iso3 === iso3) ?? null
}

/**
 * Devuelve solo iso3 de países con conflicto activo (para detección
 * "este país sale en UCDP" en drawer/radar).
 */
export function getActiveConflictIso3Set(): Set<string> {
  return new Set(UCDP_ACTIVE_CONFLICTS.map((c) => c.iso3))
}

/**
 * Filtra por intensidad mínima.
 */
export function getConflictsByMinIntensity(
  min: UcdpIntensity
): UcdpActiveConflict[] {
  return UCDP_ACTIVE_CONFLICTS.filter((c) => c.intensity_baseline >= min)
}
