/**
 * Datos USDA WASDE / FAOSTAT consolidados (público). Estos valores son
 * aproximaciones para visualización mientras no se monta el ETL completo.
 * Toneladas métricas, salvo indicación.
 */

export interface SDYearRecord {
  year: number
  produccion: number
  consumo: number
  stocks_finales: number
  exportaciones: number
}

export interface SDBalance {
  commodity_slug: string
  unit: string
  years: SDYearRecord[]
  top_productores: { country: string; share_pct: number }[]
}

export const SUPPLY_DEMAND_FIXTURE: Record<string, SDBalance> = {
  wheat_milling_euronext: {
    commodity_slug: 'wheat_milling_euronext',
    unit: 'M ton',
    years: [
      { year: 2020, produccion: 762, consumo: 754, stocks_finales: 290, exportaciones: 200 },
      { year: 2021, produccion: 778, consumo: 772, stocks_finales: 296, exportaciones: 207 },
      { year: 2022, produccion: 783, consumo: 786, stocks_finales: 293, exportaciones: 212 },
      { year: 2023, produccion: 790, consumo: 796, stocks_finales: 287, exportaciones: 218 },
      { year: 2024, produccion: 798, consumo: 802, stocks_finales: 283, exportaciones: 215 },
      { year: 2025, produccion: 805, consumo: 810, stocks_finales: 278, exportaciones: 217 },
    ],
    top_productores: [
      { country: 'China', share_pct: 17.5 },
      { country: 'India', share_pct: 13.6 },
      { country: 'UE-27', share_pct: 16.2 },
      { country: 'Rusia', share_pct: 11.2 },
      { country: 'EE.UU.', share_pct: 5.9 },
      { country: 'Australia', share_pct: 4.0 },
      { country: 'Argentina', share_pct: 2.4 },
      { country: 'Pakistán', share_pct: 3.4 },
      { country: 'Canadá', share_pct: 4.1 },
      { country: 'Turquía', share_pct: 2.5 },
    ],
  },
  corn_cbot: {
    commodity_slug: 'corn_cbot',
    unit: 'M ton',
    years: [
      { year: 2020, produccion: 1124, consumo: 1133, stocks_finales: 290, exportaciones: 184 },
      { year: 2021, produccion: 1217, consumo: 1175, stocks_finales: 310, exportaciones: 207 },
      { year: 2022, produccion: 1163, consumo: 1166, stocks_finales: 297, exportaciones: 185 },
      { year: 2023, produccion: 1234, consumo: 1196, stocks_finales: 318, exportaciones: 200 },
      { year: 2024, produccion: 1216, consumo: 1227, stocks_finales: 306, exportaciones: 196 },
      { year: 2025, produccion: 1250, consumo: 1235, stocks_finales: 313, exportaciones: 202 },
    ],
    top_productores: [
      { country: 'EE.UU.', share_pct: 30.5 },
      { country: 'China', share_pct: 22.3 },
      { country: 'Brasil', share_pct: 11.0 },
      { country: 'Argentina', share_pct: 4.8 },
      { country: 'UE-27', share_pct: 5.4 },
      { country: 'México', share_pct: 2.4 },
      { country: 'India', share_pct: 2.6 },
      { country: 'Ucrania', share_pct: 2.2 },
      { country: 'Sudáfrica', share_pct: 1.6 },
      { country: 'Indonesia', share_pct: 1.5 },
    ],
  },
  soybeans_cbot: {
    commodity_slug: 'soybeans_cbot',
    unit: 'M ton',
    years: [
      { year: 2020, produccion: 360, consumo: 365, stocks_finales: 95, exportaciones: 165 },
      { year: 2021, produccion: 365, consumo: 369, stocks_finales: 92, exportaciones: 154 },
      { year: 2022, produccion: 370, consumo: 373, stocks_finales: 91, exportaciones: 167 },
      { year: 2023, produccion: 395, consumo: 380, stocks_finales: 110, exportaciones: 172 },
      { year: 2024, produccion: 421, consumo: 401, stocks_finales: 132, exportaciones: 181 },
      { year: 2025, produccion: 430, consumo: 410, stocks_finales: 148, exportaciones: 185 },
    ],
    top_productores: [
      { country: 'Brasil', share_pct: 39.5 },
      { country: 'EE.UU.', share_pct: 28.0 },
      { country: 'Argentina', share_pct: 11.5 },
      { country: 'China', share_pct: 4.5 },
      { country: 'India', share_pct: 2.7 },
      { country: 'Paraguay', share_pct: 2.5 },
      { country: 'Canadá', share_pct: 1.6 },
      { country: 'Rusia', share_pct: 1.4 },
      { country: 'Ucrania', share_pct: 1.0 },
      { country: 'Bolivia', share_pct: 0.7 },
    ],
  },
  olive_oil_es: {
    commodity_slug: 'olive_oil_es',
    unit: 'k ton',
    years: [
      { year: 2020, produccion: 3010, consumo: 2890, stocks_finales: 680, exportaciones: 1180 },
      { year: 2021, produccion: 2725, consumo: 2800, stocks_finales: 605, exportaciones: 1050 },
      { year: 2022, produccion: 2410, consumo: 2750, stocks_finales: 265, exportaciones: 990 },
      { year: 2023, produccion: 2010, consumo: 2410, stocks_finales: 90, exportaciones: 870 },
      { year: 2024, produccion: 2540, consumo: 2580, stocks_finales: 145, exportaciones: 1010 },
      { year: 2025, produccion: 2900, consumo: 2720, stocks_finales: 325, exportaciones: 1150 },
    ],
    top_productores: [
      { country: 'España', share_pct: 45.0 },
      { country: 'Italia', share_pct: 12.5 },
      { country: 'Grecia', share_pct: 7.8 },
      { country: 'Turquía', share_pct: 6.5 },
      { country: 'Túnez', share_pct: 6.0 },
      { country: 'Marruecos', share_pct: 4.5 },
      { country: 'Siria', share_pct: 3.5 },
      { country: 'Portugal', share_pct: 3.0 },
      { country: 'Argelia', share_pct: 2.5 },
      { country: 'Egipto', share_pct: 1.4 },
    ],
  },
}

export function getSupplyDemand(slug: string): SDBalance | null {
  return SUPPLY_DEMAND_FIXTURE[slug] ?? null
}

export function listSupplyDemandCommodities(): string[] {
  return Object.keys(SUPPLY_DEMAND_FIXTURE)
}
