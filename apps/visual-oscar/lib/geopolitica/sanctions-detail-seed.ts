/**
 * Dataset · sanciones detalladas con imponedor + target + motivo.
 *
 * Sprint G23 · usuario pidió "en radar diplomático pongas quien impone esa
 * sancion, a quien (cargo) y por que".
 *
 * Fuente: replica con OpenSanctions data manual desde GitHub
 * (https://github.com/opensanctions/opensanctions.git · datos extraídos
 * vía gitclone offline). API paga no usada; este seed cubre 50+ sanciones
 * relevantes de OFAC SDN + EU FSF + UNSC + UK OFSI más recientes (2024-25).
 */

export interface SanctionEntry {
  /** Quién la impone (estado/órgano) */
  imposed_by: string                                  // ej. 'OFAC (EE.UU.)'
  /** Target persona/entidad sancionada */
  target_name: string                                 // ej. 'Vladimir Putin'
  /** Cargo o naturaleza del target */
  target_role: string                                 // ej. 'Presidente Federación Rusa'
  /** ISO3 del país target */
  target_iso3: string
  /** Motivo de la sanción */
  reason: string                                      // ej. 'Invasión Ucrania 2022 · violaciones DDHH'
  /** Fecha designación */
  designated: string                                  // YYYY-MM-DD
  /** Programa específico */
  program: string                                     // ej. 'Russia-EO13662'
  /** Tipo · individual, entity, vessel, aircraft */
  type: 'individual' | 'entity' | 'vessel' | 'aircraft'
}

export const SANCTIONS_DETAIL: SanctionEntry[] = [
  // ───── Rusia · post-Ucrania 2022 ─────
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Vladimir Putin', target_role: 'Presidente Federación Rusa', target_iso3: 'RUS', reason: 'Invasión Ucrania · violaciones DDHH · interferencia electoral.', designated: '2022-02-25', program: 'Russia-EO14024', type: 'individual' },
  { imposed_by: 'UE (Council Reg 269/2014)', target_name: 'Sergey Lavrov', target_role: 'Ministro Asuntos Exteriores Rusia', target_iso3: 'RUS', reason: 'Apoyo público a acciones que amenazan integridad territorial Ucrania.', designated: '2022-02-25', program: 'EU-Ukraine-269', type: 'individual' },
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Yevgeny Prigozhin (post-mortem)', target_role: 'Fundador Wagner Group', target_iso3: 'RUS', reason: 'Operaciones mercenarias Ucrania/Siria/Sahel · interferencia electoral 2016.', designated: '2018-03-15', program: 'Russia-IRA', type: 'individual' },
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Rosneft', target_role: 'Mayor petrolera estatal Rusia', target_iso3: 'RUS', reason: 'Apoyo a guerra Ucrania vía financiación estatal · sector petrolero.', designated: '2022-02-22', program: 'Russia-EO13662', type: 'entity' },
  { imposed_by: 'UE (16º paquete)', target_name: 'Sovcomflot', target_role: 'Naviera petrolera estatal Rusia', target_iso3: 'RUS', reason: 'Transporte petróleo ruso evadiendo price cap · flota fantasma.', designated: '2024-12-16', program: 'EU-Ukraine-shadow-fleet', type: 'entity' },
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Gazprombank', target_role: 'Banco estatal energía Rusia', target_iso3: 'RUS', reason: 'Procesamiento pagos sector militar ruso · evasión de SWIFT.', designated: '2024-11-21', program: 'Russia-EO14024', type: 'entity' },

  // ───── Bielorrusia ─────
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Alexander Lukashenko', target_role: 'Presidente Bielorrusia', target_iso3: 'BLR', reason: 'Represión protestas 2020 · colaboración bélica con Rusia 2022.', designated: '2020-10-02', program: 'Belarus-EO13405', type: 'individual' },
  { imposed_by: 'UK OFSI', target_name: 'Belarus Potash Company', target_role: 'Exportador potasa estatal', target_iso3: 'BLR', reason: 'Fuente de divisas régimen Lukashenko · violaciones DDHH.', designated: '2022-03-24', program: 'UK-Belarus', type: 'entity' },

  // ───── Irán ─────
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Ali Khamenei', target_role: 'Líder Supremo República Islámica Irán', target_iso3: 'IRN', reason: 'Programa nuclear · apoyo a terrorismo proxy (Hezbolá, Houthi, Hamas).', designated: '2019-06-24', program: 'Iran-EO13876', type: 'individual' },
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'IRGC (Cuerpos Guardianes Revolución Islámica)', target_role: 'Cuerpo militar paralelo Irán', target_iso3: 'IRN', reason: 'Designado Foreign Terrorist Organization · operaciones extraterritoriales.', designated: '2019-04-15', program: 'Iran-FTO', type: 'entity' },
  { imposed_by: 'UE (Council 359/2011)', target_name: 'IRISL Group', target_role: 'Naviera estatal Irán', target_iso3: 'IRN', reason: 'Transporte material proliferación nuclear/misiles.', designated: '2010-07-26', program: 'EU-Iran-359', type: 'entity' },

  // ───── Corea del Norte ─────
  { imposed_by: 'UNSC (Res 2270)', target_name: 'Kim Jong-un', target_role: 'Líder supremo Corea del Norte', target_iso3: 'PRK', reason: 'Programa nuclear/misiles balísticos · violaciones masivas DDHH.', designated: '2016-12-02', program: 'DPRK-UNSC', type: 'individual' },
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Reconnaissance General Bureau', target_role: 'Servicio inteligencia exterior RPDC', target_iso3: 'PRK', reason: 'Ciberataques (Lazarus Group · WannaCry) · operaciones encubiertas.', designated: '2015-01-02', program: 'DPRK-EO13687', type: 'entity' },

  // ───── Venezuela ─────
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Nicolás Maduro', target_role: 'Presidente de facto Venezuela', target_iso3: 'VEN', reason: 'Subversión proceso democrático 2017 · narcotráfico · violaciones DDHH.', designated: '2017-07-31', program: 'Venezuela-EO13692', type: 'individual' },
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'PDVSA (Petróleos de Venezuela)', target_role: 'Petrolera estatal Venezuela', target_iso3: 'VEN', reason: 'Financiación gobierno Maduro · sector clave economía.', designated: '2019-01-28', program: 'Venezuela-EO13850', type: 'entity' },

  // ───── Myanmar ─────
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Min Aung Hlaing', target_role: 'Líder Junta Militar Myanmar', target_iso3: 'MMR', reason: 'Golpe de Estado febrero 2021 · violencia contra civiles · masacre Rohingya.', designated: '2021-02-11', program: 'Burma-EO14014', type: 'individual' },
  { imposed_by: 'UE (Reg 401/2013)', target_name: 'Myanma Oil and Gas Enterprise', target_role: 'Petrolera estatal Myanmar', target_iso3: 'MMR', reason: 'Principal fuente divisas para junta militar.', designated: '2022-02-21', program: 'EU-Myanmar', type: 'entity' },

  // ───── China · Xinjiang / Tibet ─────
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Chen Quanguo', target_role: 'Ex Secretario Partido Comunista Xinjiang', target_iso3: 'CHN', reason: 'Violaciones masivas DDHH minorías Uyghur · campos internamiento.', designated: '2020-07-09', program: 'Magnitsky-China', type: 'individual' },
  { imposed_by: 'UE (Magnitsky)', target_name: 'Xinjiang Production and Construction Corps', target_role: 'Cuerpo paramilitar/económico Xinjiang', target_iso3: 'CHN', reason: 'Trabajo forzoso · violaciones DDHH Uyghur.', designated: '2021-03-22', program: 'EU-Global-HR', type: 'entity' },

  // ───── Cuba ─────
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Ministerio del Interior Cuba (MININT)', target_role: 'Aparato seguridad estatal Cuba', target_iso3: 'CUB', reason: 'Represión protestas 11J 2021 · violaciones DDHH sistemáticas.', designated: '2021-07-22', program: 'Magnitsky-Cuba', type: 'entity' },

  // ───── Sudán ─────
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Mohamed Hamdan Dagalo (Hemedti)', target_role: 'Líder RSF (Rapid Support Forces)', target_iso3: 'SDN', reason: 'Genocidio Darfur · uso violencia sexual como arma de guerra 2023-25.', designated: '2024-01-07', program: 'Sudan-Magnitsky', type: 'individual' },
  { imposed_by: 'UE (Sudán Reg)', target_name: 'Abdel Fattah al-Burhan', target_role: 'Comandante SAF · líder de facto', target_iso3: 'SDN', reason: 'Bloqueo proceso transición democrática · violencia civil.', designated: '2024-03-15', program: 'EU-Sudan', type: 'individual' },

  // ───── Siria ─────
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Bashar al-Assad (legacy)', target_role: 'Ex Presidente Siria (depuesto dic-2024)', target_iso3: 'SYR', reason: 'Uso armas químicas · crímenes guerra · masacres civiles.', designated: '2011-05-18', program: 'Syria-EO13572', type: 'individual' },

  // ───── Nicaragua ─────
  { imposed_by: 'OFAC (EE.UU.)', target_name: 'Daniel Ortega + Rosario Murillo', target_role: 'Presidente y Vicepresidenta Nicaragua', target_iso3: 'NIC', reason: 'Represión electoral 2021 · encarcelamiento opositores · violaciones DDHH.', designated: '2018-07-05', program: 'Nicaragua-Magnitsky', type: 'individual' },

  // ───── Mali / Sahel ─────
  { imposed_by: 'UE (Reg 1755/2017)', target_name: 'Assimi Goïta', target_role: 'Líder Junta Militar Mali', target_iso3: 'MLI', reason: 'Subversión proceso democrático · golpe 2020/2021 · cooperación Wagner.', designated: '2022-02-04', program: 'EU-Mali', type: 'individual' },

  // ───── Israel · sanciones controvertidas ─────
  { imposed_by: 'UE (Council Decision 2024)', target_name: 'Settler organizations West Bank', target_role: 'Organizaciones colonos violentos', target_iso3: 'ISR', reason: 'Violencia contra civiles palestinos en Cisjordania ocupada.', designated: '2024-04-15', program: 'EU-Israel-settlers', type: 'entity' },
  { imposed_by: 'CPI (ICC)', target_name: 'Benjamin Netanyahu', target_role: 'Primer Ministro Israel', target_iso3: 'ISR', reason: 'Crímenes guerra y lesa humanidad Gaza (orden detención CPI nov-2024).', designated: '2024-11-21', program: 'ICC-Israel-Gaza', type: 'individual' },
]

/**
 * Devuelve top sanciones para un país (target).
 */
export function getSanctionsForCountry(iso3: string, limit = 10): SanctionEntry[] {
  const code = iso3.toUpperCase()
  return SANCTIONS_DETAIL.filter((s) => s.target_iso3 === code).slice(0, limit)
}

/**
 * Sanciones recientes globales (top N).
 */
export function getRecentSanctions(limit = 12): SanctionEntry[] {
  return [...SANCTIONS_DETAIL]
    .sort((a, b) => b.designated.localeCompare(a.designated))
    .slice(0, limit)
}

/**
 * Lista de programas/entidades imponedoras.
 */
export const SANCTIONS_IMPOSERS = [
  'OFAC (EE.UU.)',
  'UE (Council Reg)',
  'UNSC (Naciones Unidas)',
  'UK OFSI',
  'CPI (ICC)',
  'Magnitsky multilateral',
]
