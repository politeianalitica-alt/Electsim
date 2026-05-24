/**
 * Catálogo · Subtab 13 "Medio rural & cohesión territorial" v3.
 * Foco: vulnerabilidad rural, agricultura, agua, PAC, servicios rurales.
 * v1 con indicadores macro relacionados; datasets FEGA/PAC/MAPA/MITECO
 * vendrán por /api/datos-gob/csv (parser ya disponible).
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

/**
 * Sprint N6.2 cleanup: removidos PIB pc, Paro IMF, Exports, Inversión bruta,
 * IPC general, Turistas FRONTUR (todos copiados de otros catálogos).
 * Esta versión se centra en lo realmente rural: empleo agrario, valor añadido
 * agro %PIB, animal stock, vulnerabilidad climática.
 */
export const MEDIO_RURAL_INDICATORS: PulsoIndicatorMeta[] = [
  {
    id: "mr-empleo-agrario",
    family: "empleo",
    label: "Empleo agrario (NACE A) %total",
    shortLabel: "Empleo agro",
    unit: "%",
    decimals: 1,
    source: "Eurostat · lfsq_egan2",
    sourceCode: "lfsq_egan2:A:ES",
    frequency: "quarterly",
    description:
      "% ocupados en agricultura/ganadería sobre total ocupados. España ~4% (vs UE 4%). Caída estructural histórica — desierto poblacional rural.",
    endpoint: "/api/eurostat/dataset?code=lfsq_egan2&filters=geo=ES;nace_r2=A",
    parser: "eurostat-simple",
    threshold: { amber: 3.5, red: 3, goodAbove: true },
    accent: "#16a34a",
  },
  {
    id: "mr-vab-agrario-pib",
    family: "pib",
    label: "VAB agrario %PIB",
    shortLabel: "VAB agro",
    unit: "%",
    decimals: 1,
    source: "Eurostat · nama_10_a10",
    sourceCode: "nama_10_a10:A:ES",
    frequency: "annual",
    description:
      "Valor añadido bruto agricultura+ganadería+silvicultura sobre PIB. España ~2.7% vs UE 1.7%. Reflejo del peso económico del sector primario.",
    endpoint: "/api/eurostat/dataset?code=nama_10_a10&filters=geo=ES;nace_r2=A",
    parser: "eurostat-simple",
    accent: "#84cc16",
  },
  {
    id: "mr-arrendamientos-agrarios",
    family: "precios",
    label: "Precios productor agrario (PPRI)",
    shortLabel: "PPRI agro",
    unit: "%",
    decimals: 1,
    source: "Eurostat · apri_pi20_outa",
    sourceCode: "apri_pi20_outa:ES",
    frequency: "annual",
    description:
      "Índice precios productor agrario. Driver clave de la renta rural (compraventa a mayoristas/industria). Shock 2022 con precios cereales y aceite.",
    endpoint: "/api/eurostat/dataset?code=apri_pi20_outa&filters=geo=ES",
    parser: "eurostat-simple",
    accent: "#f59e0b",
  },
  {
    id: "mr-energia-agro",
    family: "oferta",
    label: "Consumo final energía agricultura",
    shortLabel: "Energía agro",
    unit: " ktoe",
    decimals: 0,
    source: "Eurostat · nrg_bal_c",
    sourceCode: "nrg_bal_c:FC_OTH_AF_E:ES",
    frequency: "annual",
    description:
      "Consumo final de energía en agricultura+silvicultura. Sensibilidad al shock energético: precios gasóleo agrícola = movilización rural (2022).",
    endpoint: "/api/eurostat/dataset?code=nrg_bal_c&filters=geo=ES;nrg_bal=FC_OTH_AF_E",
    parser: "eurostat-simple",
    accent: "#dc2626",
  },
  {
    id: "mr-aei-eurostat",
    family: "oferta",
    label: "Renta empresarial agraria",
    shortLabel: "Renta agro",
    unit: "",
    decimals: 0,
    source: "Eurostat · aact_eaa04",
    sourceCode: "aact_eaa04:ENTREP_HOL_RY:ES",
    frequency: "annual",
    description:
      "Renta empresarial agraria por unidad de trabajo anual (índice). Rentabilidad efectiva del campo · vol·til por dependencia climatológica + PAC + precios energía.",
    endpoint: "/api/eurostat/dataset?code=aact_eaa04&filters=geo=ES;indic_ag=ENTREP_HOL_RY",
    parser: "eurostat-simple",
    accent: "#84cc16",
  },
  {
    id: "mr-aei-eurostat",
    family: "oferta",
    label: "Renta empresarial agraria · Eurostat aact_eaa04",
    shortLabel: "Renta agraria",
    unit: "",
    decimals: 0,
    source: "Eurostat · aact_eaa04",
    sourceCode: "aact_eaa04",
    frequency: "annual",
    description:
      "Renta empresarial agraria por unidad de trabajo anual (índice). Mide rentabilidad efectiva del campo español frente al ciclo y a la PAC. Volátil por dependencia climatológica.",
    endpoint: "/api/eurostat/dataset?code=aact_eaa04&filters=geo=ES;indic_ag=ENTREP_HOL_RY",
    parser: "eurostat-simple",
    accent: "#84cc16",
  },
  // Sprint L F6 · +1 superficie agraria utilizada (SAU)
  {
    id: "mr-sau-eurostat",
    family: "oferta",
    label: "Superficie agraria útil · Eurostat ef_lus_main",
    shortLabel: "SAU",
    unit: " ha",
    decimals: 0,
    source: "Eurostat · ef_lus_main",
    sourceCode: "ef_lus_main:UAA",
    frequency: "annual",
    description:
      "Superficie agraria útil (UAA) total. Mide cuánta tierra está realmente cultivada o usada para ganadería — proxy de presión territorial agraria y desertificación.",
    endpoint: "/api/eurostat/dataset?code=ef_lus_main&filters=geo=ES;crops=UAA;agrarea=TOTAL",
    parser: "eurostat-simple",
    accent: "#16a34a",
  },
];

export const MEDIO_RURAL_META = {
  slug: "medio-rural",
  label: "Medio rural & cohesión territorial",
  shortLabel: "Rural",
  accent: "#16a34a",
  description: "Vulnerabilidad rural, agricultura, ganadería, agua, PAC, servicios públicos rurales y cohesión territorial.",
};
