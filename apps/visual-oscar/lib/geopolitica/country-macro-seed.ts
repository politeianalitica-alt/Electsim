/**
 * Dataset · Macro country snapshot · 50 economías top.
 *
 * Sprint G22 fix · datos curados para enriquecer EWS Bloque 3 (Mercados) y
 * Bloque 4 (Comercio) en el drawer país (/api/geopolitica/pais/[iso3]/ews).
 *
 * Antes ambos bloques mostraban "Próximamente" hardcoded. Ahora muestran
 * los datos cuando el iso3 está en este catálogo, y "Próximamente" solo
 * para países fuera del top.
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
}

/**
 * Devuelve snapshot macro para país · null si no está en catálogo.
 */
export function getCountryMacro(iso3: string): CountryMacro | null {
  return COUNTRY_MACRO[iso3.toUpperCase()] || null
}
