/**
 * Catálogo · Subtab 11 "Demografía & territorio" v3 (Sprint N17).
 * Foco: crecimiento, envejecimiento, despoblación, migración, hogares.
 * Para v1 usamos los indicadores macro disponibles que tienen relación
 * con el área demográfica. Datasets específicos de padrón/censo INE
 * via /api/datos-gob/csv quedan para alimentar bloques especializados.
 *
 * Sprint N6.2 cleanup: removidos PIB pc, Paro IMF, Paro EPA general, IPV, ETCL
 * (todos copiados de pulso-macro u otros catálogos). Conservado solo
 * indicadores realmente demográficos: edad media, fertilidad, paro juvenil.
 * Añadidos: esperanza de vida, ratio dependencia, densidad media, % >65.
 *
 * Sprint N17 · methodology + release + confidence + related ids.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const DEMOGRAFIA_TERRITORIO_INDICATORS: PulsoIndicatorMeta[] = [
  {
    id: "dt-paro-epa-jovenes",
    family: "empleo",
    label: "Paro juvenil <25 EPA",
    shortLabel: "Paro <25",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · EPA",
    sourceCode: "EPA86912",
    frequency: "quarterly",
    description:
      "Tasa de paro en menores de 25 años. Driver clave de emancipación juvenil y motor de migración interregional España→UE.",
    endpoint: "/api/ine/epa?n=24",
    parser: "ine-epa",
    parserKey: "menores_25",
    threshold: { amber: 25, red: 35, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "Activos 16-24. Sesgo: base activa pequeña (mayoría estudia) → ratio volátil. Driver migración interna (vaciado interior) + externa (movilidad UE post-Erasmus).",
    releaseSchedule: "Trimestral · INE 4º viernes posterior a fin trimestre",
    confidenceLevel: "high",
    relatedIndicatorIds: ["paro-epa-jovenes", "dt-migracion-saldo"],
  },
  {
    id: "dt-esperanza-vida",
    family: "demanda",
    label: "Esperanza de vida al nacer",
    shortLabel: "EV nacer",
    unit: " años",
    decimals: 1,
    source: "Eurostat · demo_mlexpec",
    sourceCode: "demo_mlexpec:ES",
    frequency: "annual",
    description:
      "Esperanza de vida al nacer (ambos sexos). España ~83 años, top-3 mundial. Driver del envejecimiento, pensiones y gasto sanitario.",
    endpoint: "/api/eurostat/dataset?code=demo_mlexpec&filters=geo=ES;sex=T;age=Y_LT1",
    parser: "eurostat-simple",
    accent: "#16a34a",
    methodologyNote:
      "Promedio años esperados al nacer dadas tasas mortalidad actuales por edad. España top-3 mundial (Japón, Suiza). Driver pensiones: cada +1 año esperanza vida ~+1.5% gasto pensiones medio plazo.",
    releaseSchedule: "Anual · publicación primavera del año T+1",
    confidenceLevel: "high",
    relatedIndicatorIds: ["dt-poblacion-mayores", "dt-ratio-dependencia", "sb-pension-pib"],
  },
  {
    id: "dt-ratio-dependencia",
    family: "demanda",
    label: "Ratio dependencia vejez",
    shortLabel: "Dep. vejez",
    unit: "%",
    decimals: 1,
    source: "Eurostat · demo_pjanind",
    sourceCode: "demo_pjanind:OLDDEP:ES",
    frequency: "annual",
    description:
      "Población ≥65 / población activa (15-64) · %. España ~32% y subiendo. Determina sostenibilidad pensiones y presión fiscal estructural.",
    endpoint: "/api/eurostat/dataset?code=demo_pjanind&filters=geo=ES;indic_de=OLDDEP",
    parser: "eurostat-simple",
    threshold: { amber: 30, red: 40, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "OLDDEP = old-age dependency ratio. España subirá de 32% (2024) a ~60% (2050) según proyecciones Eurostat. Driver insostenibilidad pensiones sin reforma estructural.",
    releaseSchedule: "Anual · publicación T+6 meses (datos padrón)",
    confidenceLevel: "high",
    relatedIndicatorIds: ["dt-esperanza-vida", "dt-poblacion-mayores", "dt-fertilidad-eurostat"],
  },
  {
    id: "dt-migracion-saldo",
    family: "demanda",
    label: "Tasa migración neta · Eurostat demo_gind",
    shortLabel: "Migr. neta",
    unit: " ‰",
    decimals: 1,
    source: "Eurostat · demo_gind",
    sourceCode: "demo_gind:CNMIGRAT:ES",
    frequency: "annual",
    description:
      "Saldo migratorio neto por 1000 habitantes. Único motor de crecimiento poblacional ES (saldo natural negativo desde 2015). Pico 2022-23 por desplazados Ucrania + retorno post-COVID.",
    endpoint: "/api/eurostat/dataset?code=demo_gind&filters=geo=ES;indic_de=CNMIGRAT",
    parser: "eurostat-simple",
    accent: "#0EA5E9",
    methodologyNote:
      "Crude rate of net migration. Cifra residual: variación población - (nacimientos - defunciones). Incluye correcciones censales. Único motor crecimiento poblacional ES tras 2015.",
    releaseSchedule: "Anual · publicación T+10 meses",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["dt-poblacion-eurostat", "dt-fertilidad-eurostat"],
  },
  {
    id: "dt-poblacion-eurostat",
    family: "demanda",
    label: "Edad media población · Eurostat demo_pjanind",
    shortLabel: "Edad media",
    unit: " años",
    decimals: 1,
    source: "Eurostat · demo_pjanind",
    sourceCode: "demo_pjanind",
    frequency: "annual",
    description:
      "Edad media de la población residente. Indicador de envejecimiento estructural — España es uno de los países más envejecidos de la UE.",
    endpoint: "/api/eurostat/dataset?code=demo_pjanind&filters=geo=ES;indic_de=AGEMEDPOP",
    parser: "eurostat-simple",
    threshold: { amber: 45, red: 50, goodAbove: false },
    accent: "#0EA5E9",
    methodologyNote:
      "Mediana edad población residente. España ~45 años (top-5 UE envejecidas). Sube +0.2 años/año. Para distribución completa por cohortes ver Padrón INE.",
    releaseSchedule: "Anual · padrón cierre año (publicación junio T+1)",
    confidenceLevel: "high",
    relatedIndicatorIds: ["dt-esperanza-vida", "dt-fertilidad-eurostat", "dt-poblacion-mayores"],
  },
  // ─── Sprint N13.2 · Granularidad territorial NUTS3 + estructura edad ──
  {
    id: "dt-densidad-nuts3",
    family: "demanda",
    label: "Densidad media municipios (Provincial avg)",
    shortLabel: "Densidad",
    unit: " hab/km²",
    decimals: 1,
    source: "Eurostat · demo_r_d3dens",
    sourceCode: "demo_r_d3dens:ES",
    frequency: "annual",
    description:
      "Densidad poblacional media a nivel NUTS3 (provincial). Detecta el contraste entre área metropolitanas (Madrid 800+ hab/km²) y España vaciada (Soria 9 hab/km²).",
    endpoint: "/api/eurostat/dataset?code=demo_r_d3dens&filters=geo=ES",
    parser: "eurostat-simple",
    accent: "#7c3aed",
    methodologyNote:
      "Densidad NUTS3 (provincial). Media nacional engaña por concentración extrema: 80% población en 30% territorio. Mejor visualizar mapa CCAA para 'España vaciada'.",
    releaseSchedule: "Anual · publicación T+10 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["dt-poblacion-rural"],
  },
  {
    id: "dt-poblacion-mayores",
    family: "demanda",
    label: "% Población ≥65 años",
    shortLabel: "+65",
    unit: "%",
    decimals: 1,
    source: "Eurostat · demo_pjanind",
    sourceCode: "demo_pjanind:PC_Y_GE65:ES",
    frequency: "annual",
    description:
      "% personas ≥65 años sobre total. España ~20% · sube +0.3pp/año. Driver del gasto pensiones+sanidad. UE 2050 proyecta 30%.",
    endpoint: "/api/eurostat/dataset?code=demo_pjanind&filters=geo=ES;indic_de=PC_Y_GE65",
    parser: "eurostat-simple",
    threshold: { amber: 22, red: 28, goodAbove: false },
    accent: "#f59e0b",
    methodologyNote:
      "Cohorte ≥65. España 20% (2024) → 30% (2050) según proyecciones Eurostat. Driver: gasto pensiones (mf-prestaciones-d62) + sanidad (ie-gasto-sanitario).",
    releaseSchedule: "Anual · padrón T+6 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["dt-ratio-dependencia", "dt-esperanza-vida", "sb-pension-pib"],
  },
  {
    id: "dt-poblacion-rural",
    family: "demanda",
    label: "% Población rural (DEGURBA 3)",
    shortLabel: "% Rural",
    unit: "%",
    decimals: 1,
    source: "Eurostat · urt_pjanaggr3",
    sourceCode: "urt_pjanaggr3:RUR:ES",
    frequency: "annual",
    description:
      "% población en áreas rurales DEGURBA grado 3 (rural disperso). España ~17% · cae estructuralmente. Indicador clave de despoblación.",
    endpoint: "/api/eurostat/dataset?code=urt_pjanaggr3&filters=geo=ES;deg_urb=DEG3",
    parser: "eurostat-simple",
    accent: "#0F766E",
    methodologyNote:
      "DEGURBA 3 = thinly populated areas (<300 hab/km²). Caída estructural histórica: 25% (1980) → 17% (2024). 'España vaciada' concentrada en CYL, ARA, CLM, EXT, RIO.",
    releaseSchedule: "Anual · publicación T+12 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["dt-densidad-nuts3", "mr-empleo-agrario"],
  },
  {
    id: "dt-paro-nuts2",
    family: "empleo",
    label: "Paro regional NUTS2 (promedio CCAA)",
    shortLabel: "Paro NUTS2",
    unit: "%",
    decimals: 1,
    source: "Eurostat · lfst_r_lfu3rt",
    sourceCode: "lfst_r_lfu3rt:Y15-74:T:ES",
    frequency: "annual",
    description:
      "Tasa paro NUTS2 (CCAA) media simple. Refleja la brecha territorial: Extremadura/Andalucía vs Navarra/País Vasco.",
    endpoint: "/api/eurostat/dataset?code=lfst_r_lfu3rt&filters=geo=ES;age=Y15-74;sex=T",
    parser: "eurostat-simple",
    accent: "#dc2626",
    methodologyNote:
      "Paro EPA agregado NUTS2 (CCAA). Media simple (no ponderada por población). Brecha estructural ES: AND/EXT ~17-20% vs NAV/PV ~8-9%.",
    releaseSchedule: "Anual · LFS · T+9 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["paro-epa-general"],
  },

  // Sprint L F6 · +1 fertilidad
  {
    id: "dt-fertilidad-eurostat",
    family: "demanda",
    label: "Tasa de fertilidad · Eurostat demo_find",
    shortLabel: "Fertilidad",
    unit: " h/m",
    decimals: 2,
    source: "Eurostat · demo_find",
    sourceCode: "demo_find:TOTFERRT",
    frequency: "annual",
    description:
      "Tasa global de fecundidad (hijos por mujer). España ~1.2 es de las más bajas UE-27 (media ~1.5). Driver estructural del problema demográfico y de la pirámide poblacional.",
    endpoint: "/api/eurostat/dataset?code=demo_find&filters=geo=ES;indic_de=TOTFERRT",
    parser: "eurostat-simple",
    threshold: { amber: 1.5, red: 1.2, goodAbove: true },
    accent: "#dc2626",
    methodologyNote:
      "Total Fertility Rate = hijos por mujer en edad fértil (15-49). Reemplazo poblacional requiere 2.1. España 1.2 — junto con Italia/Corea Sur en mínimos OCDE. Sin migración → colapso pirámide.",
    releaseSchedule: "Anual · publicación T+18 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["dt-ratio-dependencia", "dt-migracion-saldo"],
  },
];

export const DEMOGRAFIA_TERRITORIO_META = {
  slug: "demografia-territorio",
  label: "Demografía & territorio",
  shortLabel: "Demografía",
  accent: "#7c3aed",
  description: "Presiones demográficas y territoriales: crecimiento, envejecimiento, migración, hogares, despoblación y concentración urbana.",
};
