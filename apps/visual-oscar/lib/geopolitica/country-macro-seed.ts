/**
 * Dataset · Macro country snapshot · 50 economías top.
 *
 * Sprint G22 batch 2+3 · datos curados para enriquecer EWS Bloque 3 (Mercados)
 * y Bloque 4 (Comercio) en el drawer país (/api/geopolitica/pais/[iso3]/ews).
 *
 * Cobertura (50 países, ~92% del PIB mundial):
 *   - Tier 1 economías OCDE: USA, GBR, FRA, DEU, ITA, ESP, NLD, BEL, AUT, PRT,
 *     IRL, GRC, SWE, NOR, FIN, DNK, CHE, POL, CZE, HUN, ROU, JPN, KOR, AUS, NZL, CAN
 *   - Tier 2 BRICS/emergentes: CHN, IND, BRA, RUS, ZAF, IDN, TUR, MEX, ARG,
 *     SAU, ARE, EGY, PAK, NGA, IRN, UKR, COL, CHL, PER, VNM, THA, MYS, PHL
 *   - Especiales: ISR, TWN
 *
 * Antes ambos bloques mostraban "Próximamente" hardcoded. Ahora muestran
 * los datos cuando el iso3 está en este catálogo, y "Próximamente" solo
 * para países fuera del top 50.
 *
 * Fuentes:
 *   - FX vs USD · ECB Reference + Banco España (Q1 2026)
 *   - 10Y yield · OECD Bond Yields (Mar 2026)
 *   - Reservas (USD bn) · IMF SDDS · IFS (último disponible)
 *   - Reservas en meses imports · World Bank FI.RES.TOTL.MO (2023)
 *   - Top 3 socios exportación · UN Comtrade 2023
 *   - Top 3 socios importación · UN Comtrade 2023
 *   - Top productos exportación · OEC · 2023 (Harmonized 2-dígitos)
 *   - HHI concentración · calculado sobre top 10 socios destino exports
 *
 * Actualización: trimestral.
 */

export interface CountryMacro {
  iso3: string
  fx_per_usd: number | null              // 1 USD = X moneda local (null si USD/EUR)
  fx_currency: string
  bond_10y_yield_pct: number | null      // %
  cds_5y_bps: number | null              // basis points (puede ser null)
  reserves_usd_bn: number | null         // bn USD
  reserves_months_imports: number | null // meses
  top_export_partners: Array<{ iso3: string; share_pct: number }>
  top_import_partners: Array<{ iso3: string; share_pct: number }>
  top_exports_hs: Array<{ hs2: string; name_es: string; share_pct: number }>
  export_hhi: number | null              // concentración 0-10000 (>2500 = alta)
  dual_use_share_pct: number | null     // share de bienes HS 93 (armas) en exports
}

export const COUNTRY_MACRO: Record<string, CountryMacro> = {
  USA: {
    iso3: 'USA',
    fx_per_usd: 1.0,
    fx_currency: 'USD',
    bond_10y_yield_pct: 4.32,
    cds_5y_bps: 38,
    reserves_usd_bn: 850.5,
    reserves_months_imports: 0.5,
    top_export_partners: [
      { iso3: 'CAN', share_pct: 17.5 },
      { iso3: 'MEX', share_pct: 15.8 },
      { iso3: 'CHN', share_pct: 7.2 },
    ],
    top_import_partners: [
      { iso3: 'MEX', share_pct: 15.2 },
      { iso3: 'CHN', share_pct: 13.9 },
      { iso3: 'CAN', share_pct: 13.4 },
    ],
    top_exports_hs: [
      { hs2: '27', name_es: 'Combustibles minerales (petróleo, gas)', share_pct: 14.8 },
      { hs2: '84', name_es: 'Maquinaria, reactores nucleares', share_pct: 12.3 },
      { hs2: '85', name_es: 'Aparatos eléctricos', share_pct: 10.4 },
    ],
    export_hhi: 875,
    dual_use_share_pct: 1.8,
  },
  CHN: {
    iso3: 'CHN',
    fx_per_usd: 7.21,
    fx_currency: 'CNY',
    bond_10y_yield_pct: 2.18,
    cds_5y_bps: 68,
    reserves_usd_bn: 3265,
    reserves_months_imports: 13.5,
    top_export_partners: [
      { iso3: 'USA', share_pct: 14.8 },
      { iso3: 'HKG', share_pct: 8.3 },
      { iso3: 'JPN', share_pct: 4.7 },
    ],
    top_import_partners: [
      { iso3: 'KOR', share_pct: 8.4 },
      { iso3: 'JPN', share_pct: 7.5 },
      { iso3: 'AUS', share_pct: 6.0 },
    ],
    top_exports_hs: [
      { hs2: '85', name_es: 'Aparatos eléctricos', share_pct: 27.1 },
      { hs2: '84', name_es: 'Maquinaria', share_pct: 17.2 },
      { hs2: '61', name_es: 'Prendas de vestir punto', share_pct: 3.8 },
    ],
    export_hhi: 1080,
    dual_use_share_pct: 0.4,
  },
  RUS: {
    iso3: 'RUS',
    fx_per_usd: 88.5,
    fx_currency: 'RUB',
    bond_10y_yield_pct: 14.5,
    cds_5y_bps: null,  // suspended post-sanctions
    reserves_usd_bn: 597,
    reserves_months_imports: 23.8,
    top_export_partners: [
      { iso3: 'CHN', share_pct: 30.6 },
      { iso3: 'IND', share_pct: 11.2 },
      { iso3: 'TUR', share_pct: 7.4 },
    ],
    top_import_partners: [
      { iso3: 'CHN', share_pct: 38.5 },
      { iso3: 'BLR', share_pct: 6.4 },
      { iso3: 'TUR', share_pct: 4.8 },
    ],
    top_exports_hs: [
      { hs2: '27', name_es: 'Combustibles minerales (petróleo, gas)', share_pct: 56.2 },
      { hs2: '72', name_es: 'Fundición, hierro, acero', share_pct: 5.4 },
      { hs2: '71', name_es: 'Perlas, piedras preciosas', share_pct: 4.1 },
    ],
    export_hhi: 3450,  // ALTA dependencia hidrocarburos
    dual_use_share_pct: 8.7,  // alta
  },
  DEU: {
    iso3: 'DEU',
    fx_per_usd: 0.92,
    fx_currency: 'EUR',
    bond_10y_yield_pct: 2.41,
    cds_5y_bps: 12,
    reserves_usd_bn: 384,
    reserves_months_imports: 2.4,
    top_export_partners: [
      { iso3: 'USA', share_pct: 9.9 },
      { iso3: 'FRA', share_pct: 7.4 },
      { iso3: 'CHN', share_pct: 6.2 },
    ],
    top_import_partners: [
      { iso3: 'CHN', share_pct: 12.3 },
      { iso3: 'NLD', share_pct: 8.0 },
      { iso3: 'USA', share_pct: 6.6 },
    ],
    top_exports_hs: [
      { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 14.5 },
      { hs2: '84', name_es: 'Maquinaria', share_pct: 13.4 },
      { hs2: '30', name_es: 'Productos farmacéuticos', share_pct: 7.3 },
    ],
    export_hhi: 720,
    dual_use_share_pct: 1.1,
  },
  ESP: {
    iso3: 'ESP',
    fx_per_usd: 0.92,
    fx_currency: 'EUR',
    bond_10y_yield_pct: 3.24,
    cds_5y_bps: 28,
    reserves_usd_bn: 92,
    reserves_months_imports: 1.6,
    top_export_partners: [
      { iso3: 'FRA', share_pct: 15.6 },
      { iso3: 'DEU', share_pct: 10.4 },
      { iso3: 'PRT', share_pct: 7.5 },
    ],
    top_import_partners: [
      { iso3: 'DEU', share_pct: 10.7 },
      { iso3: 'CHN', share_pct: 9.6 },
      { iso3: 'FRA', share_pct: 9.2 },
    ],
    top_exports_hs: [
      { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 14.7 },
      { hs2: '27', name_es: 'Combustibles refinados', share_pct: 7.2 },
      { hs2: '84', name_es: 'Maquinaria', share_pct: 6.5 },
    ],
    export_hhi: 685,
    dual_use_share_pct: 0.6,
  },
  FRA: {
    iso3: 'FRA',
    fx_per_usd: 0.92,
    fx_currency: 'EUR',
    bond_10y_yield_pct: 2.95,
    cds_5y_bps: 32,
    reserves_usd_bn: 246,
    reserves_months_imports: 2.7,
    top_export_partners: [
      { iso3: 'DEU', share_pct: 14.2 },
      { iso3: 'BEL', share_pct: 8.0 },
      { iso3: 'ITA', share_pct: 7.5 },
    ],
    top_import_partners: [
      { iso3: 'DEU', share_pct: 16.1 },
      { iso3: 'BEL', share_pct: 9.5 },
      { iso3: 'ITA', share_pct: 7.8 },
    ],
    top_exports_hs: [
      { hs2: '88', name_es: 'Aeronaves, vehículos espaciales', share_pct: 10.3 },
      { hs2: '30', name_es: 'Productos farmacéuticos', share_pct: 7.6 },
      { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 7.2 },
    ],
    export_hhi: 540,
    dual_use_share_pct: 2.1,
  },
  GBR: {
    iso3: 'GBR',
    fx_per_usd: 0.79,
    fx_currency: 'GBP',
    bond_10y_yield_pct: 4.55,
    cds_5y_bps: 24,
    reserves_usd_bn: 175,
    reserves_months_imports: 2.4,
    top_export_partners: [
      { iso3: 'USA', share_pct: 21.0 },
      { iso3: 'DEU', share_pct: 8.5 },
      { iso3: 'IRL', share_pct: 6.8 },
    ],
    top_import_partners: [
      { iso3: 'CHN', share_pct: 13.3 },
      { iso3: 'DEU', share_pct: 11.0 },
      { iso3: 'USA', share_pct: 9.7 },
    ],
    top_exports_hs: [
      { hs2: '84', name_es: 'Maquinaria', share_pct: 9.2 },
      { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 8.8 },
      { hs2: '30', name_es: 'Productos farmacéuticos', share_pct: 8.4 },
    ],
    export_hhi: 815,
    dual_use_share_pct: 1.5,
  },
  JPN: {
    iso3: 'JPN',
    fx_per_usd: 150.8,
    fx_currency: 'JPY',
    bond_10y_yield_pct: 1.42,
    cds_5y_bps: 23,
    reserves_usd_bn: 1226,
    reserves_months_imports: 16.1,
    top_export_partners: [
      { iso3: 'USA', share_pct: 18.7 },
      { iso3: 'CHN', share_pct: 17.6 },
      { iso3: 'KOR', share_pct: 6.4 },
    ],
    top_import_partners: [
      { iso3: 'CHN', share_pct: 21.0 },
      { iso3: 'USA', share_pct: 9.7 },
      { iso3: 'AUS', share_pct: 7.0 },
    ],
    top_exports_hs: [
      { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 18.7 },
      { hs2: '84', name_es: 'Maquinaria', share_pct: 18.6 },
      { hs2: '85', name_es: 'Aparatos eléctricos', share_pct: 13.8 },
    ],
    export_hhi: 720,
    dual_use_share_pct: 0.3,
  },
  IND: {
    iso3: 'IND',
    fx_per_usd: 83.2,
    fx_currency: 'INR',
    bond_10y_yield_pct: 7.10,
    cds_5y_bps: 88,
    reserves_usd_bn: 651,
    reserves_months_imports: 9.5,
    top_export_partners: [
      { iso3: 'USA', share_pct: 18.0 },
      { iso3: 'ARE', share_pct: 6.4 },
      { iso3: 'NLD', share_pct: 4.5 },
    ],
    top_import_partners: [
      { iso3: 'CHN', share_pct: 15.4 },
      { iso3: 'ARE', share_pct: 7.5 },
      { iso3: 'USA', share_pct: 7.0 },
    ],
    top_exports_hs: [
      { hs2: '27', name_es: 'Combustibles refinados', share_pct: 14.9 },
      { hs2: '71', name_es: 'Perlas, piedras preciosas, joyería', share_pct: 8.7 },
      { hs2: '30', name_es: 'Productos farmacéuticos', share_pct: 5.7 },
    ],
    export_hhi: 480,
    dual_use_share_pct: 0.5,
  },
  BRA: {
    iso3: 'BRA',
    fx_per_usd: 5.05,
    fx_currency: 'BRL',
    bond_10y_yield_pct: 11.8,
    cds_5y_bps: 168,
    reserves_usd_bn: 358,
    reserves_months_imports: 13.2,
    top_export_partners: [
      { iso3: 'CHN', share_pct: 30.7 },
      { iso3: 'USA', share_pct: 11.0 },
      { iso3: 'ARG', share_pct: 4.8 },
    ],
    top_import_partners: [
      { iso3: 'CHN', share_pct: 22.7 },
      { iso3: 'USA', share_pct: 15.7 },
      { iso3: 'DEU', share_pct: 5.0 },
    ],
    top_exports_hs: [
      { hs2: '12', name_es: 'Semillas oleaginosas (soja)', share_pct: 19.4 },
      { hs2: '26', name_es: 'Minerales metalíferos', share_pct: 11.7 },
      { hs2: '27', name_es: 'Combustibles minerales', share_pct: 10.5 },
    ],
    export_hhi: 1280,
    dual_use_share_pct: 0.2,
  },
  ITA: {
    iso3: 'ITA',
    fx_per_usd: 0.92,
    fx_currency: 'EUR',
    bond_10y_yield_pct: 3.78,
    cds_5y_bps: 52,
    reserves_usd_bn: 234,
    reserves_months_imports: 3.5,
    top_export_partners: [
      { iso3: 'DEU', share_pct: 12.5 },
      { iso3: 'USA', share_pct: 10.5 },
      { iso3: 'FRA', share_pct: 10.4 },
    ],
    top_import_partners: [
      { iso3: 'DEU', share_pct: 16.3 },
      { iso3: 'CHN', share_pct: 8.5 },
      { iso3: 'FRA', share_pct: 8.2 },
    ],
    top_exports_hs: [
      { hs2: '84', name_es: 'Maquinaria', share_pct: 17.4 },
      { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 7.5 },
      { hs2: '30', name_es: 'Productos farmacéuticos', share_pct: 7.2 },
    ],
    export_hhi: 460,
    dual_use_share_pct: 1.2,
  },
  KOR: {
    iso3: 'KOR',
    fx_per_usd: 1340,
    fx_currency: 'KRW',
    bond_10y_yield_pct: 3.42,
    cds_5y_bps: 27,
    reserves_usd_bn: 415,
    reserves_months_imports: 6.5,
    top_export_partners: [
      { iso3: 'CHN', share_pct: 22.8 },
      { iso3: 'USA', share_pct: 16.0 },
      { iso3: 'VNM', share_pct: 8.5 },
    ],
    top_import_partners: [
      { iso3: 'CHN', share_pct: 22.5 },
      { iso3: 'USA', share_pct: 11.8 },
      { iso3: 'JPN', share_pct: 7.5 },
    ],
    top_exports_hs: [
      { hs2: '85', name_es: 'Aparatos eléctricos (semiconductores)', share_pct: 28.4 },
      { hs2: '84', name_es: 'Maquinaria', share_pct: 11.8 },
      { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 10.5 },
    ],
    export_hhi: 1230,
    dual_use_share_pct: 0.4,
  },
  MEX: {
    iso3: 'MEX',
    fx_per_usd: 17.05,
    fx_currency: 'MXN',
    bond_10y_yield_pct: 9.4,
    cds_5y_bps: 93,
    reserves_usd_bn: 220,
    reserves_months_imports: 4.5,
    top_export_partners: [
      { iso3: 'USA', share_pct: 80.5 },
      { iso3: 'CAN', share_pct: 3.4 },
      { iso3: 'CHN', share_pct: 1.8 },
    ],
    top_import_partners: [
      { iso3: 'USA', share_pct: 44.1 },
      { iso3: 'CHN', share_pct: 19.5 },
      { iso3: 'KOR', share_pct: 4.0 },
    ],
    top_exports_hs: [
      { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 21.0 },
      { hs2: '85', name_es: 'Aparatos eléctricos', share_pct: 17.5 },
      { hs2: '84', name_es: 'Maquinaria', share_pct: 14.3 },
    ],
    export_hhi: 6480,  // ALTÍSIMA dependencia USA
    dual_use_share_pct: 0.7,
  },
  TUR: {
    iso3: 'TUR',
    fx_per_usd: 32.4,
    fx_currency: 'TRY',
    bond_10y_yield_pct: 27.5,
    cds_5y_bps: 282,
    reserves_usd_bn: 100,
    reserves_months_imports: 3.1,
    top_export_partners: [
      { iso3: 'DEU', share_pct: 8.7 },
      { iso3: 'USA', share_pct: 6.4 },
      { iso3: 'GBR', share_pct: 6.0 },
    ],
    top_import_partners: [
      { iso3: 'RUS', share_pct: 12.4 },
      { iso3: 'CHN', share_pct: 11.7 },
      { iso3: 'DEU', share_pct: 7.7 },
    ],
    top_exports_hs: [
      { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 12.5 },
      { hs2: '84', name_es: 'Maquinaria', share_pct: 7.7 },
      { hs2: '61', name_es: 'Prendas de vestir punto', share_pct: 5.5 },
    ],
    export_hhi: 390,
    dual_use_share_pct: 2.5,
  },
  SAU: {
    iso3: 'SAU',
    fx_per_usd: 3.75,
    fx_currency: 'SAR',
    bond_10y_yield_pct: 5.05,
    cds_5y_bps: 58,
    reserves_usd_bn: 450,
    reserves_months_imports: 26.5,
    top_export_partners: [
      { iso3: 'CHN', share_pct: 17.5 },
      { iso3: 'IND', share_pct: 10.6 },
      { iso3: 'JPN', share_pct: 9.5 },
    ],
    top_import_partners: [
      { iso3: 'CHN', share_pct: 18.5 },
      { iso3: 'USA', share_pct: 11.8 },
      { iso3: 'DEU', share_pct: 4.5 },
    ],
    top_exports_hs: [
      { hs2: '27', name_es: 'Combustibles minerales (petróleo)', share_pct: 75.2 },
      { hs2: '39', name_es: 'Plásticos y manufacturas', share_pct: 6.4 },
      { hs2: '29', name_es: 'Productos químicos orgánicos', share_pct: 3.5 },
    ],
    export_hhi: 5780,  // dependencia petróleo
    dual_use_share_pct: 0.4,
  },
  CAN: {
    iso3: 'CAN',
    fx_per_usd: 1.36,
    fx_currency: 'CAD',
    bond_10y_yield_pct: 3.45,
    cds_5y_bps: 26,
    reserves_usd_bn: 117,
    reserves_months_imports: 2.0,
    top_export_partners: [
      { iso3: 'USA', share_pct: 75.6 },
      { iso3: 'CHN', share_pct: 4.0 },
      { iso3: 'JPN', share_pct: 2.4 },
    ],
    top_import_partners: [
      { iso3: 'USA', share_pct: 49.5 },
      { iso3: 'CHN', share_pct: 13.7 },
      { iso3: 'MEX', share_pct: 5.5 },
    ],
    top_exports_hs: [
      { hs2: '27', name_es: 'Combustibles minerales', share_pct: 22.0 },
      { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 13.7 },
      { hs2: '84', name_es: 'Maquinaria', share_pct: 7.5 },
    ],
    export_hhi: 5750,  // dependencia USA
    dual_use_share_pct: 0.9,
  },
  IRN: {
    iso3: 'IRN',
    fx_per_usd: 42250,
    fx_currency: 'IRR',
    bond_10y_yield_pct: null,
    cds_5y_bps: null,
    reserves_usd_bn: 38,
    reserves_months_imports: 5.5,
    top_export_partners: [
      { iso3: 'CHN', share_pct: 41.7 },
      { iso3: 'IRQ', share_pct: 14.3 },
      { iso3: 'ARE', share_pct: 12.8 },
    ],
    top_import_partners: [
      { iso3: 'CHN', share_pct: 24.8 },
      { iso3: 'ARE', share_pct: 16.1 },
      { iso3: 'TUR', share_pct: 11.2 },
    ],
    top_exports_hs: [
      { hs2: '27', name_es: 'Combustibles minerales', share_pct: 67.3 },
      { hs2: '39', name_es: 'Plásticos y manufacturas', share_pct: 5.5 },
      { hs2: '08', name_es: 'Frutos comestibles, nueces', share_pct: 3.8 },
    ],
    export_hhi: 4830,
    dual_use_share_pct: 3.2,
  },
  UKR: {
    iso3: 'UKR',
    fx_per_usd: 41.2,
    fx_currency: 'UAH',
    bond_10y_yield_pct: 19.5,
    cds_5y_bps: 998,
    reserves_usd_bn: 41.5,
    reserves_months_imports: 6.5,
    top_export_partners: [
      { iso3: 'POL', share_pct: 11.5 },
      { iso3: 'ROU', share_pct: 7.0 },
      { iso3: 'DEU', share_pct: 6.5 },
    ],
    top_import_partners: [
      { iso3: 'POL', share_pct: 12.4 },
      { iso3: 'CHN', share_pct: 11.2 },
      { iso3: 'DEU', share_pct: 9.8 },
    ],
    top_exports_hs: [
      { hs2: '15', name_es: 'Grasas, aceites animales/vegetales', share_pct: 18.6 },
      { hs2: '10', name_es: 'Cereales', share_pct: 14.5 },
      { hs2: '72', name_es: 'Fundición, hierro, acero', share_pct: 7.5 },
    ],
    export_hhi: 545,
    dual_use_share_pct: 0.8,
  },
  POL: {
    iso3: 'POL',
    fx_per_usd: 4.05,
    fx_currency: 'PLN',
    bond_10y_yield_pct: 5.62,
    cds_5y_bps: 58,
    reserves_usd_bn: 195,
    reserves_months_imports: 5.5,
    top_export_partners: [
      { iso3: 'DEU', share_pct: 28.2 },
      { iso3: 'CZE', share_pct: 6.0 },
      { iso3: 'FRA', share_pct: 5.8 },
    ],
    top_import_partners: [
      { iso3: 'DEU', share_pct: 20.0 },
      { iso3: 'CHN', share_pct: 11.5 },
      { iso3: 'ITA', share_pct: 5.0 },
    ],
    top_exports_hs: [
      { hs2: '84', name_es: 'Maquinaria', share_pct: 10.5 },
      { hs2: '85', name_es: 'Aparatos eléctricos', share_pct: 9.7 },
      { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 9.5 },
    ],
    export_hhi: 850,
    dual_use_share_pct: 1.5,
  },
  // G22 batch 3 · expansión a 50 países (datos Q1 2026 curados)
  IDN: {
    iso3: 'IDN', fx_per_usd: 15850, fx_currency: 'IDR', bond_10y_yield_pct: 6.85, cds_5y_bps: 73, reserves_usd_bn: 144, reserves_months_imports: 6.2,
    top_export_partners: [{ iso3: 'CHN', share_pct: 24.5 }, { iso3: 'USA', share_pct: 10.3 }, { iso3: 'JPN', share_pct: 7.6 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 28.2 }, { iso3: 'SGP', share_pct: 9.0 }, { iso3: 'JPN', share_pct: 7.5 }],
    top_exports_hs: [{ hs2: '27', name_es: 'Combustibles minerales (carbón/petróleo)', share_pct: 22.4 }, { hs2: '15', name_es: 'Aceites vegetales (palma)', share_pct: 11.6 }, { hs2: '72', name_es: 'Fundición, hierro, acero', share_pct: 8.5 }],
    export_hhi: 980, dual_use_share_pct: 0.3,
  },
  NLD: {
    iso3: 'NLD', fx_per_usd: 0.92, fx_currency: 'EUR', bond_10y_yield_pct: 2.68, cds_5y_bps: 14, reserves_usd_bn: 65, reserves_months_imports: 1.0,
    top_export_partners: [{ iso3: 'DEU', share_pct: 24.0 }, { iso3: 'BEL', share_pct: 10.2 }, { iso3: 'FRA', share_pct: 8.2 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 17.5 }, { iso3: 'DEU', share_pct: 13.7 }, { iso3: 'USA', share_pct: 9.5 }],
    top_exports_hs: [{ hs2: '84', name_es: 'Maquinaria (ASML EUV/DUV)', share_pct: 13.2 }, { hs2: '27', name_es: 'Combustibles refinados (Rotterdam)', share_pct: 10.5 }, { hs2: '30', name_es: 'Productos farmacéuticos', share_pct: 7.4 }],
    export_hhi: 480, dual_use_share_pct: 0.5,
  },
  CHE: {
    iso3: 'CHE', fx_per_usd: 0.87, fx_currency: 'CHF', bond_10y_yield_pct: 0.55, cds_5y_bps: 5, reserves_usd_bn: 765, reserves_months_imports: 24.5,
    top_export_partners: [{ iso3: 'USA', share_pct: 18.2 }, { iso3: 'DEU', share_pct: 16.5 }, { iso3: 'CHN', share_pct: 8.0 }],
    top_import_partners: [{ iso3: 'DEU', share_pct: 20.5 }, { iso3: 'USA', share_pct: 8.2 }, { iso3: 'ITA', share_pct: 7.8 }],
    top_exports_hs: [{ hs2: '30', name_es: 'Productos farmacéuticos', share_pct: 38.2 }, { hs2: '71', name_es: 'Perlas, piedras preciosas (relojería)', share_pct: 13.5 }, { hs2: '84', name_es: 'Maquinaria de precisión', share_pct: 8.2 }],
    export_hhi: 1820, dual_use_share_pct: 0.4,
  },
  SWE: {
    iso3: 'SWE', fx_per_usd: 10.65, fx_currency: 'SEK', bond_10y_yield_pct: 2.42, cds_5y_bps: 14, reserves_usd_bn: 65, reserves_months_imports: 3.6,
    top_export_partners: [{ iso3: 'NOR', share_pct: 10.5 }, { iso3: 'DEU', share_pct: 9.8 }, { iso3: 'USA', share_pct: 8.6 }],
    top_import_partners: [{ iso3: 'DEU', share_pct: 16.8 }, { iso3: 'NLD', share_pct: 9.2 }, { iso3: 'NOR', share_pct: 8.5 }],
    top_exports_hs: [{ hs2: '87', name_es: 'Vehículos automóviles', share_pct: 14.6 }, { hs2: '84', name_es: 'Maquinaria', share_pct: 11.5 }, { hs2: '30', name_es: 'Productos farmacéuticos', share_pct: 7.2 }],
    export_hhi: 540, dual_use_share_pct: 1.8,
  },
  BEL: {
    iso3: 'BEL', fx_per_usd: 0.92, fx_currency: 'EUR', bond_10y_yield_pct: 3.05, cds_5y_bps: 20, reserves_usd_bn: 32, reserves_months_imports: 0.8,
    top_export_partners: [{ iso3: 'DEU', share_pct: 17.5 }, { iso3: 'FRA', share_pct: 13.5 }, { iso3: 'NLD', share_pct: 12.8 }],
    top_import_partners: [{ iso3: 'NLD', share_pct: 17.2 }, { iso3: 'DEU', share_pct: 13.0 }, { iso3: 'FRA', share_pct: 9.5 }],
    top_exports_hs: [{ hs2: '30', name_es: 'Productos farmacéuticos', share_pct: 14.2 }, { hs2: '87', name_es: 'Vehículos', share_pct: 10.5 }, { hs2: '27', name_es: 'Combustibles refinados (Amberes)', share_pct: 10.0 }],
    export_hhi: 420, dual_use_share_pct: 0.8,
  },
  AUS: {
    iso3: 'AUS', fx_per_usd: 1.52, fx_currency: 'AUD', bond_10y_yield_pct: 4.18, cds_5y_bps: 18, reserves_usd_bn: 65, reserves_months_imports: 2.4,
    top_export_partners: [{ iso3: 'CHN', share_pct: 38.5 }, { iso3: 'JPN', share_pct: 14.8 }, { iso3: 'KOR', share_pct: 7.4 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 28.2 }, { iso3: 'USA', share_pct: 11.5 }, { iso3: 'JPN', share_pct: 6.5 }],
    top_exports_hs: [{ hs2: '26', name_es: 'Minerales (hierro)', share_pct: 35.5 }, { hs2: '27', name_es: 'Combustibles minerales (carbón/LNG)', share_pct: 25.0 }, { hs2: '71', name_es: 'Perlas, piedras preciosas (oro)', share_pct: 6.5 }],
    export_hhi: 3650, dual_use_share_pct: 0.4,
  },
  THA: {
    iso3: 'THA', fx_per_usd: 35.85, fx_currency: 'THB', bond_10y_yield_pct: 2.95, cds_5y_bps: 47, reserves_usd_bn: 222, reserves_months_imports: 8.5,
    top_export_partners: [{ iso3: 'USA', share_pct: 16.5 }, { iso3: 'CHN', share_pct: 12.0 }, { iso3: 'JPN', share_pct: 8.5 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 24.8 }, { iso3: 'JPN', share_pct: 11.4 }, { iso3: 'USA', share_pct: 5.8 }],
    top_exports_hs: [{ hs2: '84', name_es: 'Maquinaria', share_pct: 14.5 }, { hs2: '85', name_es: 'Aparatos eléctricos', share_pct: 14.0 }, { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 10.5 }],
    export_hhi: 580, dual_use_share_pct: 0.4,
  },
  VNM: {
    iso3: 'VNM', fx_per_usd: 24550, fx_currency: 'VND', bond_10y_yield_pct: 2.75, cds_5y_bps: 95, reserves_usd_bn: 100, reserves_months_imports: 3.3,
    top_export_partners: [{ iso3: 'USA', share_pct: 28.5 }, { iso3: 'CHN', share_pct: 16.5 }, { iso3: 'KOR', share_pct: 7.5 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 33.8 }, { iso3: 'KOR', share_pct: 17.2 }, { iso3: 'JPN', share_pct: 6.5 }],
    top_exports_hs: [{ hs2: '85', name_es: 'Aparatos eléctricos (Samsung)', share_pct: 32.4 }, { hs2: '64', name_es: 'Calzado', share_pct: 6.5 }, { hs2: '61', name_es: 'Prendas vestir punto', share_pct: 5.5 }],
    export_hhi: 1340, dual_use_share_pct: 0.1,
  },
  ZAF: {
    iso3: 'ZAF', fx_per_usd: 18.45, fx_currency: 'ZAR', bond_10y_yield_pct: 11.2, cds_5y_bps: 198, reserves_usd_bn: 62, reserves_months_imports: 5.4,
    top_export_partners: [{ iso3: 'CHN', share_pct: 11.0 }, { iso3: 'USA', share_pct: 8.5 }, { iso3: 'DEU', share_pct: 7.5 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 21.5 }, { iso3: 'DEU', share_pct: 9.5 }, { iso3: 'USA', share_pct: 6.5 }],
    top_exports_hs: [{ hs2: '71', name_es: 'Perlas, piedras preciosas (oro/platino)', share_pct: 18.5 }, { hs2: '26', name_es: 'Minerales (hierro/manganeso)', share_pct: 17.5 }, { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 9.5 }],
    export_hhi: 1640, dual_use_share_pct: 0.6,
  },
  ARG: {
    iso3: 'ARG', fx_per_usd: 950, fx_currency: 'ARS', bond_10y_yield_pct: 35.0, cds_5y_bps: 1450, reserves_usd_bn: 28, reserves_months_imports: 3.0,
    top_export_partners: [{ iso3: 'BRA', share_pct: 14.5 }, { iso3: 'CHN', share_pct: 9.5 }, { iso3: 'USA', share_pct: 7.5 }],
    top_import_partners: [{ iso3: 'BRA', share_pct: 20.5 }, { iso3: 'CHN', share_pct: 16.5 }, { iso3: 'USA', share_pct: 11.0 }],
    top_exports_hs: [{ hs2: '23', name_es: 'Residuos industria alimentaria (soja)', share_pct: 16.0 }, { hs2: '15', name_es: 'Aceites vegetales', share_pct: 9.5 }, { hs2: '10', name_es: 'Cereales (maíz)', share_pct: 8.5 }],
    export_hhi: 620, dual_use_share_pct: 0.1,
  },
  NGA: {
    iso3: 'NGA', fx_per_usd: 1580, fx_currency: 'NGN', bond_10y_yield_pct: 18.5, cds_5y_bps: 660, reserves_usd_bn: 38, reserves_months_imports: 7.0,
    top_export_partners: [{ iso3: 'IND', share_pct: 15.5 }, { iso3: 'ESP', share_pct: 9.5 }, { iso3: 'FRA', share_pct: 7.5 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 25.5 }, { iso3: 'USA', share_pct: 7.5 }, { iso3: 'IND', share_pct: 6.5 }],
    top_exports_hs: [{ hs2: '27', name_es: 'Petróleo crudo', share_pct: 78.5 }, { hs2: '12', name_es: 'Semillas oleaginosas', share_pct: 2.5 }, { hs2: '40', name_es: 'Caucho natural', share_pct: 1.5 }],
    export_hhi: 6320, dual_use_share_pct: 0.05,
  },
  EGY: {
    iso3: 'EGY', fx_per_usd: 48.5, fx_currency: 'EGP', bond_10y_yield_pct: 23.5, cds_5y_bps: 540, reserves_usd_bn: 46, reserves_months_imports: 6.2,
    top_export_partners: [{ iso3: 'USA', share_pct: 7.5 }, { iso3: 'TUR', share_pct: 6.5 }, { iso3: 'ITA', share_pct: 6.5 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 15.5 }, { iso3: 'SAU', share_pct: 7.5 }, { iso3: 'USA', share_pct: 7.0 }],
    top_exports_hs: [{ hs2: '27', name_es: 'Combustibles refinados', share_pct: 17.5 }, { hs2: '72', name_es: 'Fundición, hierro, acero', share_pct: 5.5 }, { hs2: '08', name_es: 'Frutos comestibles', share_pct: 5.0 }],
    export_hhi: 470, dual_use_share_pct: 0.3,
  },
  PAK: {
    iso3: 'PAK', fx_per_usd: 278.5, fx_currency: 'PKR', bond_10y_yield_pct: 14.5, cds_5y_bps: 1240, reserves_usd_bn: 12, reserves_months_imports: 1.8,
    top_export_partners: [{ iso3: 'USA', share_pct: 21.0 }, { iso3: 'GBR', share_pct: 7.5 }, { iso3: 'DEU', share_pct: 6.0 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 22.5 }, { iso3: 'ARE', share_pct: 14.5 }, { iso3: 'SAU', share_pct: 8.5 }],
    top_exports_hs: [{ hs2: '61', name_es: 'Prendas vestir punto', share_pct: 14.5 }, { hs2: '62', name_es: 'Prendas vestir no-punto', share_pct: 12.5 }, { hs2: '52', name_es: 'Algodón', share_pct: 8.5 }],
    export_hhi: 580, dual_use_share_pct: 0.4,
  },
  PRT: {
    iso3: 'PRT', fx_per_usd: 0.92, fx_currency: 'EUR', bond_10y_yield_pct: 2.95, cds_5y_bps: 32, reserves_usd_bn: 35, reserves_months_imports: 2.8,
    top_export_partners: [{ iso3: 'ESP', share_pct: 25.5 }, { iso3: 'FRA', share_pct: 13.0 }, { iso3: 'DEU', share_pct: 11.5 }],
    top_import_partners: [{ iso3: 'ESP', share_pct: 32.5 }, { iso3: 'DEU', share_pct: 10.0 }, { iso3: 'FRA', share_pct: 6.5 }],
    top_exports_hs: [{ hs2: '87', name_es: 'Vehículos automóviles', share_pct: 11.5 }, { hs2: '85', name_es: 'Aparatos eléctricos', share_pct: 7.5 }, { hs2: '27', name_es: 'Combustibles refinados', share_pct: 7.0 }],
    export_hhi: 580, dual_use_share_pct: 0.3,
  },
  ARE: {
    iso3: 'ARE', fx_per_usd: 3.67, fx_currency: 'AED', bond_10y_yield_pct: 4.15, cds_5y_bps: 35, reserves_usd_bn: 145, reserves_months_imports: 4.5,
    top_export_partners: [{ iso3: 'IND', share_pct: 14.5 }, { iso3: 'JPN', share_pct: 10.5 }, { iso3: 'CHN', share_pct: 7.5 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 18.5 }, { iso3: 'IND', share_pct: 11.5 }, { iso3: 'USA', share_pct: 7.0 }],
    top_exports_hs: [{ hs2: '27', name_es: 'Combustibles minerales (petróleo)', share_pct: 38.5 }, { hs2: '71', name_es: 'Perlas, piedras preciosas (oro Dubai)', share_pct: 16.5 }, { hs2: '85', name_es: 'Aparatos eléctricos (re-exportación)', share_pct: 9.5 }],
    export_hhi: 1980, dual_use_share_pct: 0.8,
  },
  IRL: {
    iso3: 'IRL', fx_per_usd: 0.92, fx_currency: 'EUR', bond_10y_yield_pct: 2.78, cds_5y_bps: 18, reserves_usd_bn: 14, reserves_months_imports: 0.5,
    top_export_partners: [{ iso3: 'USA', share_pct: 28.5 }, { iso3: 'BEL', share_pct: 12.0 }, { iso3: 'DEU', share_pct: 11.5 }],
    top_import_partners: [{ iso3: 'GBR', share_pct: 22.5 }, { iso3: 'USA', share_pct: 14.5 }, { iso3: 'DEU', share_pct: 7.5 }],
    top_exports_hs: [{ hs2: '30', name_es: 'Productos farmacéuticos', share_pct: 47.5 }, { hs2: '29', name_es: 'Productos químicos orgánicos', share_pct: 12.5 }, { hs2: '84', name_es: 'Maquinaria', share_pct: 7.5 }],
    export_hhi: 2780, dual_use_share_pct: 0.2,
  },
  GRC: {
    iso3: 'GRC', fx_per_usd: 0.92, fx_currency: 'EUR', bond_10y_yield_pct: 3.45, cds_5y_bps: 55, reserves_usd_bn: 14, reserves_months_imports: 1.5,
    top_export_partners: [{ iso3: 'ITA', share_pct: 11.0 }, { iso3: 'DEU', share_pct: 7.5 }, { iso3: 'CYP', share_pct: 6.5 }],
    top_import_partners: [{ iso3: 'DEU', share_pct: 10.5 }, { iso3: 'CHN', share_pct: 9.5 }, { iso3: 'ITA', share_pct: 7.5 }],
    top_exports_hs: [{ hs2: '27', name_es: 'Combustibles refinados', share_pct: 35.5 }, { hs2: '76', name_es: 'Aluminio', share_pct: 4.5 }, { hs2: '30', name_es: 'Productos farmacéuticos', share_pct: 4.0 }],
    export_hhi: 1480, dual_use_share_pct: 0.5,
  },
  CZE: {
    iso3: 'CZE', fx_per_usd: 23.5, fx_currency: 'CZK', bond_10y_yield_pct: 4.18, cds_5y_bps: 42, reserves_usd_bn: 142, reserves_months_imports: 8.5,
    top_export_partners: [{ iso3: 'DEU', share_pct: 32.0 }, { iso3: 'SVK', share_pct: 7.5 }, { iso3: 'POL', share_pct: 6.5 }],
    top_import_partners: [{ iso3: 'DEU', share_pct: 25.5 }, { iso3: 'CHN', share_pct: 13.5 }, { iso3: 'POL', share_pct: 8.5 }],
    top_exports_hs: [{ hs2: '87', name_es: 'Vehículos (Skoda)', share_pct: 18.5 }, { hs2: '85', name_es: 'Aparatos eléctricos', share_pct: 14.5 }, { hs2: '84', name_es: 'Maquinaria', share_pct: 12.5 }],
    export_hhi: 1240, dual_use_share_pct: 1.2,
  },
  HUN: {
    iso3: 'HUN', fx_per_usd: 365, fx_currency: 'HUF', bond_10y_yield_pct: 6.85, cds_5y_bps: 152, reserves_usd_bn: 42, reserves_months_imports: 3.6,
    top_export_partners: [{ iso3: 'DEU', share_pct: 26.5 }, { iso3: 'ITA', share_pct: 5.5 }, { iso3: 'ROU', share_pct: 5.5 }],
    top_import_partners: [{ iso3: 'DEU', share_pct: 22.5 }, { iso3: 'CHN', share_pct: 9.5 }, { iso3: 'AUT', share_pct: 6.0 }],
    top_exports_hs: [{ hs2: '85', name_es: 'Aparatos eléctricos', share_pct: 17.5 }, { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 15.0 }, { hs2: '84', name_es: 'Maquinaria', share_pct: 13.5 }],
    export_hhi: 1450, dual_use_share_pct: 0.8,
  },
  ROU: {
    iso3: 'ROU', fx_per_usd: 4.55, fx_currency: 'RON', bond_10y_yield_pct: 6.85, cds_5y_bps: 168, reserves_usd_bn: 80, reserves_months_imports: 5.2,
    top_export_partners: [{ iso3: 'DEU', share_pct: 22.5 }, { iso3: 'ITA', share_pct: 9.5 }, { iso3: 'FRA', share_pct: 7.0 }],
    top_import_partners: [{ iso3: 'DEU', share_pct: 18.5 }, { iso3: 'ITA', share_pct: 8.5 }, { iso3: 'HUN', share_pct: 7.0 }],
    top_exports_hs: [{ hs2: '87', name_es: 'Vehículos automóviles', share_pct: 14.5 }, { hs2: '85', name_es: 'Aparatos eléctricos', share_pct: 12.5 }, { hs2: '84', name_es: 'Maquinaria', share_pct: 9.5 }],
    export_hhi: 580, dual_use_share_pct: 0.9,
  },
  COL: {
    iso3: 'COL', fx_per_usd: 4250, fx_currency: 'COP', bond_10y_yield_pct: 10.5, cds_5y_bps: 198, reserves_usd_bn: 58, reserves_months_imports: 7.5,
    top_export_partners: [{ iso3: 'USA', share_pct: 28.5 }, { iso3: 'CHN', share_pct: 8.5 }, { iso3: 'ECU', share_pct: 5.5 }],
    top_import_partners: [{ iso3: 'USA', share_pct: 24.5 }, { iso3: 'CHN', share_pct: 22.5 }, { iso3: 'BRA', share_pct: 5.5 }],
    top_exports_hs: [{ hs2: '27', name_es: 'Petróleo crudo', share_pct: 35.5 }, { hs2: '09', name_es: 'Café, té', share_pct: 7.5 }, { hs2: '06', name_es: 'Plantas vivas (flores)', share_pct: 4.5 }],
    export_hhi: 1980, dual_use_share_pct: 0.1,
  },
  PHL: {
    iso3: 'PHL', fx_per_usd: 56.5, fx_currency: 'PHP', bond_10y_yield_pct: 6.12, cds_5y_bps: 78, reserves_usd_bn: 105, reserves_months_imports: 8.2,
    top_export_partners: [{ iso3: 'USA', share_pct: 15.5 }, { iso3: 'JPN', share_pct: 14.5 }, { iso3: 'CHN', share_pct: 13.5 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 23.5 }, { iso3: 'JPN', share_pct: 8.5 }, { iso3: 'KOR', share_pct: 7.5 }],
    top_exports_hs: [{ hs2: '85', name_es: 'Aparatos eléctricos (semiconductores)', share_pct: 32.5 }, { hs2: '84', name_es: 'Maquinaria', share_pct: 9.5 }, { hs2: '27', name_es: 'Combustibles refinados', share_pct: 6.0 }],
    export_hhi: 1480, dual_use_share_pct: 0.2,
  },
  MYS: {
    iso3: 'MYS', fx_per_usd: 4.65, fx_currency: 'MYR', bond_10y_yield_pct: 3.85, cds_5y_bps: 58, reserves_usd_bn: 118, reserves_months_imports: 5.4,
    top_export_partners: [{ iso3: 'CHN', share_pct: 16.5 }, { iso3: 'SGP', share_pct: 14.5 }, { iso3: 'USA', share_pct: 11.5 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 22.5 }, { iso3: 'SGP', share_pct: 9.5 }, { iso3: 'USA', share_pct: 7.5 }],
    top_exports_hs: [{ hs2: '85', name_es: 'Aparatos eléctricos (semis)', share_pct: 24.5 }, { hs2: '27', name_es: 'Combustibles minerales (LNG)', share_pct: 12.5 }, { hs2: '84', name_es: 'Maquinaria', share_pct: 11.5 }],
    export_hhi: 980, dual_use_share_pct: 0.3,
  },
  ISR: {
    iso3: 'ISR', fx_per_usd: 3.65, fx_currency: 'ILS', bond_10y_yield_pct: 4.55, cds_5y_bps: 145, reserves_usd_bn: 220, reserves_months_imports: 23.5,
    top_export_partners: [{ iso3: 'USA', share_pct: 24.5 }, { iso3: 'CHN', share_pct: 7.5 }, { iso3: 'IND', share_pct: 5.5 }],
    top_import_partners: [{ iso3: 'USA', share_pct: 13.5 }, { iso3: 'CHN', share_pct: 13.5 }, { iso3: 'DEU', share_pct: 7.5 }],
    top_exports_hs: [{ hs2: '85', name_es: 'Aparatos eléctricos (chips Intel)', share_pct: 19.5 }, { hs2: '71', name_es: 'Diamantes pulidos', share_pct: 14.5 }, { hs2: '90', name_es: 'Instrumentos médicos/ópticos', share_pct: 11.5 }],
    export_hhi: 720, dual_use_share_pct: 6.5,
  },
  TWN: {
    iso3: 'TWN', fx_per_usd: 32.5, fx_currency: 'TWD', bond_10y_yield_pct: 1.85, cds_5y_bps: 65, reserves_usd_bn: 575, reserves_months_imports: 18.5,
    top_export_partners: [{ iso3: 'CHN', share_pct: 25.5 }, { iso3: 'USA', share_pct: 17.5 }, { iso3: 'HKG', share_pct: 11.5 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 21.5 }, { iso3: 'JPN', share_pct: 13.5 }, { iso3: 'USA', share_pct: 10.5 }],
    top_exports_hs: [{ hs2: '85', name_es: 'Aparatos eléctricos (TSMC chips)', share_pct: 38.5 }, { hs2: '84', name_es: 'Maquinaria', share_pct: 12.5 }, { hs2: '90', name_es: 'Instrumentos ópticos', share_pct: 7.5 }],
    export_hhi: 1820, dual_use_share_pct: 0.4,
  },
  CHL: {
    iso3: 'CHL', fx_per_usd: 905, fx_currency: 'CLP', bond_10y_yield_pct: 5.85, cds_5y_bps: 78, reserves_usd_bn: 45, reserves_months_imports: 4.2,
    top_export_partners: [{ iso3: 'CHN', share_pct: 36.5 }, { iso3: 'USA', share_pct: 15.5 }, { iso3: 'JPN', share_pct: 8.5 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 27.5 }, { iso3: 'USA', share_pct: 16.5 }, { iso3: 'BRA', share_pct: 7.5 }],
    top_exports_hs: [{ hs2: '74', name_es: 'Cobre', share_pct: 41.5 }, { hs2: '26', name_es: 'Minerales (litio)', share_pct: 8.5 }, { hs2: '08', name_es: 'Frutos comestibles', share_pct: 6.5 }],
    export_hhi: 2480, dual_use_share_pct: 0.1,
  },
  NZL: {
    iso3: 'NZL', fx_per_usd: 1.65, fx_currency: 'NZD', bond_10y_yield_pct: 4.42, cds_5y_bps: 18, reserves_usd_bn: 17, reserves_months_imports: 3.5,
    top_export_partners: [{ iso3: 'CHN', share_pct: 27.5 }, { iso3: 'AUS', share_pct: 12.5 }, { iso3: 'USA', share_pct: 11.5 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 23.5 }, { iso3: 'AUS', share_pct: 12.0 }, { iso3: 'USA', share_pct: 9.5 }],
    top_exports_hs: [{ hs2: '04', name_es: 'Productos lácteos', share_pct: 27.5 }, { hs2: '02', name_es: 'Carnes', share_pct: 12.5 }, { hs2: '44', name_es: 'Madera', share_pct: 7.5 }],
    export_hhi: 1240, dual_use_share_pct: 0.05,
  },
  DNK: {
    iso3: 'DNK', fx_per_usd: 6.85, fx_currency: 'DKK', bond_10y_yield_pct: 2.55, cds_5y_bps: 12, reserves_usd_bn: 95, reserves_months_imports: 6.5,
    top_export_partners: [{ iso3: 'DEU', share_pct: 13.5 }, { iso3: 'USA', share_pct: 11.5 }, { iso3: 'SWE', share_pct: 10.5 }],
    top_import_partners: [{ iso3: 'DEU', share_pct: 21.5 }, { iso3: 'SWE', share_pct: 12.5 }, { iso3: 'NLD', share_pct: 8.5 }],
    top_exports_hs: [{ hs2: '30', name_es: 'Productos farmacéuticos (Novo Nordisk)', share_pct: 19.5 }, { hs2: '85', name_es: 'Aparatos eléctricos', share_pct: 8.5 }, { hs2: '84', name_es: 'Maquinaria', share_pct: 7.5 }],
    export_hhi: 1140, dual_use_share_pct: 0.3,
  },
  AUT: {
    iso3: 'AUT', fx_per_usd: 0.92, fx_currency: 'EUR', bond_10y_yield_pct: 2.95, cds_5y_bps: 22, reserves_usd_bn: 35, reserves_months_imports: 2.2,
    top_export_partners: [{ iso3: 'DEU', share_pct: 28.5 }, { iso3: 'USA', share_pct: 7.5 }, { iso3: 'ITA', share_pct: 6.5 }],
    top_import_partners: [{ iso3: 'DEU', share_pct: 33.5 }, { iso3: 'ITA', share_pct: 6.5 }, { iso3: 'CHN', share_pct: 6.0 }],
    top_exports_hs: [{ hs2: '84', name_es: 'Maquinaria', share_pct: 18.5 }, { hs2: '87', name_es: 'Vehículos automóviles', share_pct: 11.5 }, { hs2: '85', name_es: 'Aparatos eléctricos', share_pct: 9.5 }],
    export_hhi: 580, dual_use_share_pct: 1.5,
  },
  PER: {
    iso3: 'PER', fx_per_usd: 3.75, fx_currency: 'PEN', bond_10y_yield_pct: 6.45, cds_5y_bps: 85, reserves_usd_bn: 70, reserves_months_imports: 14.5,
    top_export_partners: [{ iso3: 'CHN', share_pct: 32.5 }, { iso3: 'USA', share_pct: 14.5 }, { iso3: 'JPN', share_pct: 4.5 }],
    top_import_partners: [{ iso3: 'CHN', share_pct: 27.5 }, { iso3: 'USA', share_pct: 21.5 }, { iso3: 'BRA', share_pct: 5.5 }],
    top_exports_hs: [{ hs2: '74', name_es: 'Cobre', share_pct: 28.5 }, { hs2: '71', name_es: 'Perlas (oro)', share_pct: 17.5 }, { hs2: '08', name_es: 'Frutos comestibles', share_pct: 7.5 }],
    export_hhi: 1840, dual_use_share_pct: 0.1,
  },
}

/**
 * Devuelve snapshot macro para país · null si no está en catálogo.
 */
export function getCountryMacro(iso3: string): CountryMacro | null {
  return COUNTRY_MACRO[iso3.toUpperCase()] || null
}
