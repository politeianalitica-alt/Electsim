/**
 * Dataset · Cobertura formal por posición · APPRI + ADT + ICO + CESCE.
 *
 * Sprint G24 · usuario pidió "hagas la Cobertura formal por posición".
 *
 * 4 instrumentos jurídicos/financieros España para inversión exterior:
 *   - APPRI: Acuerdo Promoción y Protección Recíproca de Inversiones (BITs)
 *   - ADT: Acuerdo de Doble Tributación
 *   - ICO: Línea ICO Internacional (financiación)
 *   - CESCE: Compañía Española Seguros Crédito Exportación (riesgo país)
 *
 * Datos curados desde:
 *   - exteriores.gob.es/PoliticaExteriorCooperacion/comercioexterior/Paginas/inicio.aspx
 *   - cesce.es · informes país de riesgo
 *   - ico.es · línea ICO internacional
 */

export interface CoberturaFormal {
  iso3: string
  /** APPRI (Bilateral Investment Treaty) en vigor */
  appri: { in_force: boolean; signed_year: number | null; entered_force_year: number | null }
  /** Acuerdo Doble Tributación */
  adt: { in_force: boolean; signed_year: number | null }
  /** ICO Línea Internacional disponible */
  ico: { available: boolean; max_amount_eur_m: number | null }
  /** CESCE rating riesgo país */
  cesce: {
    rating: 'OECD-0' | 'OECD-1' | 'OECD-2' | 'OECD-3' | 'OECD-4' | 'OECD-5' | 'OECD-6' | 'OECD-7' | 'no-rating'
    open_for_coverage: boolean
    short_term: 'open' | 'restricted' | 'closed'
    medium_long_term: 'open' | 'restricted' | 'closed'
    notes: string
  }
}

export const COBERTURA_FORMAL: Record<string, CoberturaFormal> = {
  // Países desarrollados: cobertura total
  USA: {
    iso3: 'USA',
    appri: { in_force: false, signed_year: null, entered_force_year: null },
    adt: { in_force: true, signed_year: 1990 },
    ico: { available: true, max_amount_eur_m: 500 },
    cesce: { rating: 'OECD-0', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'OECD member · sin restricciones cobertura' },
  },
  GBR: {
    iso3: 'GBR',
    appri: { in_force: false, signed_year: null, entered_force_year: null },
    adt: { in_force: true, signed_year: 2013 },
    ico: { available: true, max_amount_eur_m: 500 },
    cesce: { rating: 'OECD-0', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'Post-Brexit · acuerdo facilitación comercial Reino Unido-UE.' },
  },
  FRA: {
    iso3: 'FRA',
    appri: { in_force: false, signed_year: null, entered_force_year: null },
    adt: { in_force: true, signed_year: 1995 },
    ico: { available: true, max_amount_eur_m: 500 },
    cesce: { rating: 'OECD-0', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'OECD/UE · sin restricciones.' },
  },
  DEU: {
    iso3: 'DEU',
    appri: { in_force: false, signed_year: null, entered_force_year: null },
    adt: { in_force: true, signed_year: 2011 },
    ico: { available: true, max_amount_eur_m: 500 },
    cesce: { rating: 'OECD-0', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'OECD/UE · principal socio comercial UE.' },
  },
  ITA: {
    iso3: 'ITA',
    appri: { in_force: false, signed_year: null, entered_force_year: null },
    adt: { in_force: true, signed_year: 1977 },
    ico: { available: true, max_amount_eur_m: 500 },
    cesce: { rating: 'OECD-0', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'OECD/UE.' },
  },
  PRT: {
    iso3: 'PRT',
    appri: { in_force: false, signed_year: null, entered_force_year: null },
    adt: { in_force: true, signed_year: 1993 },
    ico: { available: true, max_amount_eur_m: 500 },
    cesce: { rating: 'OECD-0', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'OECD/UE · vecino preferencial.' },
  },
  NLD: {
    iso3: 'NLD',
    appri: { in_force: false, signed_year: null, entered_force_year: null },
    adt: { in_force: true, signed_year: 1971 },
    ico: { available: true, max_amount_eur_m: 500 },
    cesce: { rating: 'OECD-0', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'OECD/UE · hub financiero/logístico ES.' },
  },
  // Países OECD con cobertura amplia
  USA2: {
    iso3: 'USA2',
    appri: { in_force: false, signed_year: null, entered_force_year: null },
    adt: { in_force: true, signed_year: 1990 },
    ico: { available: true, max_amount_eur_m: 500 },
    cesce: { rating: 'OECD-0', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: '' },
  },
  CAN: {
    iso3: 'CAN',
    appri: { in_force: false, signed_year: null, entered_force_year: null },
    adt: { in_force: true, signed_year: 1976 },
    ico: { available: true, max_amount_eur_m: 500 },
    cesce: { rating: 'OECD-0', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'OECD · CETA acuerdo comercial UE.' },
  },
  JPN: {
    iso3: 'JPN',
    appri: { in_force: false, signed_year: null, entered_force_year: null },
    adt: { in_force: true, signed_year: 1974 },
    ico: { available: true, max_amount_eur_m: 500 },
    cesce: { rating: 'OECD-0', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'OECD · acuerdo SPA UE-Japón.' },
  },
  KOR: {
    iso3: 'KOR',
    appri: { in_force: false, signed_year: null, entered_force_year: null },
    adt: { in_force: true, signed_year: 1994 },
    ico: { available: true, max_amount_eur_m: 250 },
    cesce: { rating: 'OECD-0', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'OECD · acuerdo FTA UE-Corea.' },
  },
  AUS: {
    iso3: 'AUS',
    appri: { in_force: false, signed_year: null, entered_force_year: null },
    adt: { in_force: true, signed_year: 1992 },
    ico: { available: true, max_amount_eur_m: 250 },
    cesce: { rating: 'OECD-0', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'OECD.' },
  },
  // Países BRICS con APPRI activo
  CHN: {
    iso3: 'CHN',
    appri: { in_force: true, signed_year: 1992, entered_force_year: 1993 },
    adt: { in_force: true, signed_year: 1990 },
    ico: { available: true, max_amount_eur_m: 250 },
    cesce: { rating: 'OECD-2', open_for_coverage: true, short_term: 'open', medium_long_term: 'restricted', notes: 'CESCE OECD-2 · cobertura restringida sector tecnológico · sin embargo tensiones UE-China.' },
  },
  IND: {
    iso3: 'IND',
    appri: { in_force: false, signed_year: 1997, entered_force_year: null },
    adt: { in_force: true, signed_year: 1993 },
    ico: { available: true, max_amount_eur_m: 250 },
    cesce: { rating: 'OECD-3', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'APPRI no en vigor desde 2017 (denuncia India) · ADT vigente · CESCE OECD-3.' },
  },
  BRA: {
    iso3: 'BRA',
    appri: { in_force: false, signed_year: null, entered_force_year: null },
    adt: { in_force: true, signed_year: 1974 },
    ico: { available: true, max_amount_eur_m: 250 },
    cesce: { rating: 'OECD-3', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'Sin APPRI bilateral · Mercosur-UE acuerdo en ratificación 2025.' },
  },
  MEX: {
    iso3: 'MEX',
    appri: { in_force: true, signed_year: 1995, entered_force_year: 1997 },
    adt: { in_force: true, signed_year: 1992 },
    ico: { available: true, max_amount_eur_m: 250 },
    cesce: { rating: 'OECD-3', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'APPRI + ADT vigentes · acuerdo modernización UE-México 2018.' },
  },
  ARG: {
    iso3: 'ARG',
    appri: { in_force: true, signed_year: 1991, entered_force_year: 1992 },
    adt: { in_force: false, signed_year: 1992, entered_force_year: null },
    ico: { available: true, max_amount_eur_m: 100 },
    cesce: { rating: 'OECD-7', open_for_coverage: true, short_term: 'restricted', medium_long_term: 'closed', notes: 'ADT denunciado 2012 · APPRI con arbitrajes activos · Milei reforma reactiva.' },
  },
  COL: {
    iso3: 'COL',
    appri: { in_force: true, signed_year: 2005, entered_force_year: 2007 },
    adt: { in_force: true, signed_year: 2005 },
    ico: { available: true, max_amount_eur_m: 250 },
    cesce: { rating: 'OECD-3', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'OECD member desde 2020 · APPRI + ADT vigentes.' },
  },
  CHL: {
    iso3: 'CHL',
    appri: { in_force: true, signed_year: 1991, entered_force_year: 1994 },
    adt: { in_force: true, signed_year: 2003 },
    ico: { available: true, max_amount_eur_m: 250 },
    cesce: { rating: 'OECD-0', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'OECD · acuerdo FTA Chile-UE.' },
  },
  PER: {
    iso3: 'PER',
    appri: { in_force: true, signed_year: 1994, entered_force_year: 1996 },
    adt: { in_force: true, signed_year: 2006 },
    ico: { available: true, max_amount_eur_m: 100 },
    cesce: { rating: 'OECD-3', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'Acuerdo multipartito UE.' },
  },
  // Países riesgo / cobertura restringida
  RUS: {
    iso3: 'RUS',
    appri: { in_force: false, signed_year: 1990, entered_force_year: null },
    adt: { in_force: false, signed_year: 1998, entered_force_year: 2000 },
    ico: { available: false, max_amount_eur_m: null },
    cesce: { rating: 'OECD-7', open_for_coverage: false, short_term: 'closed', medium_long_term: 'closed', notes: 'Sanciones UE post-invasión Ucrania · CESCE cierra cobertura · APPRI suspendido · ADT suspendido por España 2023.' },
  },
  TUR: {
    iso3: 'TUR',
    appri: { in_force: true, signed_year: 1995, entered_force_year: 1998 },
    adt: { in_force: true, signed_year: 2002 },
    ico: { available: true, max_amount_eur_m: 100 },
    cesce: { rating: 'OECD-5', open_for_coverage: true, short_term: 'restricted', medium_long_term: 'restricted', notes: 'OECD-5 · Lira riesgo + tensiones Turquía-UE.' },
  },
  EGY: {
    iso3: 'EGY',
    appri: { in_force: true, signed_year: 1992, entered_force_year: 1994 },
    adt: { in_force: true, signed_year: 2005 },
    ico: { available: true, max_amount_eur_m: 100 },
    cesce: { rating: 'OECD-5', open_for_coverage: true, short_term: 'restricted', medium_long_term: 'restricted', notes: 'Crisis económica + escasez divisas · CESCE restringido.' },
  },
  SAU: {
    iso3: 'SAU',
    appri: { in_force: true, signed_year: 2006, entered_force_year: 2007 },
    adt: { in_force: true, signed_year: 2007 },
    ico: { available: true, max_amount_eur_m: 250 },
    cesce: { rating: 'OECD-2', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'Vision 2030 · OECD-2 · open cobertura sectores estratégicos.' },
  },
  ARE: {
    iso3: 'ARE',
    appri: { in_force: true, signed_year: 2002, entered_force_year: 2004 },
    adt: { in_force: true, signed_year: 2006 },
    ico: { available: true, max_amount_eur_m: 250 },
    cesce: { rating: 'OECD-2', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'Hub regional · OECD-2.' },
  },
  ZAF: {
    iso3: 'ZAF',
    appri: { in_force: false, signed_year: 1998, entered_force_year: null },
    adt: { in_force: true, signed_year: 2006 },
    ico: { available: true, max_amount_eur_m: 100 },
    cesce: { rating: 'OECD-3', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'APPRI denunciado 2013 · gobierno BNG en transición.' },
  },
  MAR: {
    iso3: 'MAR',
    appri: { in_force: true, signed_year: 1989, entered_force_year: 1991 },
    adt: { in_force: true, signed_year: 1978 },
    ico: { available: true, max_amount_eur_m: 250 },
    cesce: { rating: 'OECD-3', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'Status avanzado UE · acuerdo agrícola pesca.' },
  },
  IDN: {
    iso3: 'IDN',
    appri: { in_force: false, signed_year: 1995, entered_force_year: null },
    adt: { in_force: true, signed_year: 1995 },
    ico: { available: true, max_amount_eur_m: 100 },
    cesce: { rating: 'OECD-3', open_for_coverage: true, short_term: 'open', medium_long_term: 'open', notes: 'APPRI denunciado 2016 · CEPA UE-ASEAN avanzando.' },
  },
  PAK: {
    iso3: 'PAK',
    appri: { in_force: true, signed_year: 2002, entered_force_year: 2003 },
    adt: { in_force: true, signed_year: 1993 },
    ico: { available: true, max_amount_eur_m: 50 },
    cesce: { rating: 'OECD-7', open_for_coverage: true, short_term: 'restricted', medium_long_term: 'closed', notes: 'Crisis económica · IMF deal · OECD-7.' },
  },
  IRN: {
    iso3: 'IRN',
    appri: { in_force: true, signed_year: 2002, entered_force_year: 2004 },
    adt: { in_force: true, signed_year: 2003 },
    ico: { available: false, max_amount_eur_m: null },
    cesce: { rating: 'OECD-7', open_for_coverage: false, short_term: 'closed', medium_long_term: 'closed', notes: 'Sanciones JCPOA + sanciones primarias EE.UU. · CESCE cerrado.' },
  },
  VEN: {
    iso3: 'VEN',
    appri: { in_force: true, signed_year: 1995, entered_force_year: 1997 },
    adt: { in_force: true, signed_year: 2003 },
    ico: { available: false, max_amount_eur_m: null },
    cesce: { rating: 'OECD-7', open_for_coverage: false, short_term: 'closed', medium_long_term: 'closed', notes: 'Sanciones · CESCE cerrado · arbitrajes pendientes Repsol/Telefónica.' },
  },
}

export function getCoberturaFormal(iso3: string): CoberturaFormal | null {
  return COBERTURA_FORMAL[iso3.toUpperCase()] || null
}
