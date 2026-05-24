/**
 * Catálogo · Subtab 11 "Demografía & territorio" v3.
 * Foco: crecimiento, envejecimiento, despoblación, migración, hogares.
 * Para v1 usamos los indicadores macro disponibles que tienen relación
 * con el área demográfica. Datasets específicos de padrón/censo INE
 * via /api/datos-gob/csv quedan para alimentar bloques especializados.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

/**
 * Sprint N6.2 cleanup: removidos PIB pc, Paro IMF, Paro EPA general, IPV, ETCL
 * (todos copiados de pulso-macro u otros catálogos). Conservado solo
 * indicadores realmente demográficos: edad media, fertilidad, paro juvenil.
 * Añadidos: esperanza de vida, ratio dependencia, densidad media, % >65.
 */
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
  },
];

export const DEMOGRAFIA_TERRITORIO_META = {
  slug: "demografia-territorio",
  label: "Demografía & territorio",
  shortLabel: "Demografía",
  accent: "#7c3aed",
  description: "Presiones demográficas y territoriales: crecimiento, envejecimiento, migración, hogares, despoblación y concentración urbana.",
};
