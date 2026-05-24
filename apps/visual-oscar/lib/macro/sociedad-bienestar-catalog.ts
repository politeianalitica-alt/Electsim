/**
 * Catálogo · Subtab 12 "Sociedad, bienestar & desigualdad" v3.
 * Foco: cómo se distribuye el bienestar — pobreza, desigualdad, renta
 * real, educación, salud, prestaciones, malestar percibido.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

/**
 * Sprint N6.2 cleanup: removidos PIB pc, IPC, Paro general, Paro juvenil,
 * Gasto AAPP, IPV, ETCL (todos duplicados de pulso-macro / margen-fiscal /
 * hogares-empleo-vivienda). Conservado AROPE + Gini (estructurales únicos)
 * y añadidos indicadores específicos de bienestar: pobreza monetaria,
 * carencia material severa, abandono escolar, S80/S20 (desigualdad extremos).
 */
export const SOCIEDAD_BIENESTAR_INDICATORS: PulsoIndicatorMeta[] = [
  {
    id: "sb-pobreza-monetaria",
    family: "demanda",
    label: "Pobreza monetaria (riesgo) · Eurostat",
    shortLabel: "Pobreza",
    unit: "%",
    decimals: 1,
    source: "Eurostat · ilc_li02",
    sourceCode: "ilc_li02:ES",
    frequency: "annual",
    description:
      "% población con renta disponible <60% mediana nacional. Métrica europea estándar de pobreza relativa. España persistente ~20% vs UE 17%.",
    endpoint: "/api/eurostat/dataset?code=ilc_li02&filters=geo=ES;sex=T;age=TOTAL",
    parser: "eurostat-simple",
    threshold: { amber: 18, red: 22, goodAbove: false },
    accent: "#dc2626",
  },
  {
    id: "sb-carencia-material-severa",
    family: "demanda",
    label: "Carencia material severa",
    shortLabel: "CMS",
    unit: "%",
    decimals: 1,
    source: "Eurostat · ilc_mdsd07",
    sourceCode: "ilc_mdsd07:ES",
    frequency: "annual",
    description:
      "% hogares con privación severa (no pagar facturas, comer carne 2/sem, calefacción, vacaciones, lavadora/coche/tv/teléfono). Pobreza absoluta operativa.",
    endpoint: "/api/eurostat/dataset?code=ilc_mdsd07&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 7, red: 10, goodAbove: false },
    accent: "#dc2626",
  },
  {
    id: "sb-s80-s20",
    family: "demanda",
    label: "Ratio S80/S20 (desigualdad)",
    shortLabel: "S80/S20",
    unit: "",
    decimals: 1,
    source: "Eurostat · ilc_di11",
    sourceCode: "ilc_di11:ES",
    frequency: "annual",
    description:
      "Ratio renta total quintil superior / quintil inferior. Mide desigualdad entre extremos. España ~6.0 vs UE 4.7. Sensible a impacto de prestaciones.",
    endpoint: "/api/eurostat/dataset?code=ilc_di11&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 5.5, red: 6.5, goodAbove: false },
    accent: "#8b5cf6",
  },
  {
    id: "sb-abandono-escolar",
    family: "empleo",
    label: "Abandono escolar temprano 18-24",
    shortLabel: "Abandono",
    unit: "%",
    decimals: 1,
    source: "Eurostat · edat_lfse_14",
    sourceCode: "edat_lfse_14:ES",
    frequency: "annual",
    description:
      "% personas 18-24 años solo ESO sin estudios posteriores. España ~13% vs UE 9%. Indicador estructural del fallo educativo y reproducción de pobreza.",
    endpoint: "/api/eurostat/dataset?code=edat_lfse_14&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 10, red: 14, goodAbove: false },
    accent: "#f59e0b",
  },
  {
    id: "sb-gasto-social-pib",
    family: "demanda",
    label: "Gasto en protección social %PIB",
    shortLabel: "Gasto social",
    unit: "%",
    decimals: 1,
    source: "Eurostat · spr_exp_sum",
    sourceCode: "spr_exp_sum:ES",
    frequency: "annual",
    description:
      "Gasto total protección social como % PIB (pensiones, sanidad, desempleo, familia, vivienda, exclusión). España ~25% vs UE 28%. Mide compromiso con welfare.",
    endpoint: "/api/eurostat/dataset?code=spr_exp_sum&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 24, red: 22, goodAbove: true },
    accent: "#0891b2",
  },
  {
    id: "sb-arope-eurostat",
    family: "demanda",
    label: "AROPE · Eurostat ilc_peps01n",
    shortLabel: "AROPE",
    unit: "%",
    decimals: 1,
    source: "Eurostat · ilc_peps01n",
    sourceCode: "ilc_peps01n",
    frequency: "annual",
    description:
      "People at risk of poverty or social exclusion (AROPE). Indicador EU oficial que combina pobreza monetaria + carencia material severa + baja intensidad laboral en el hogar.",
    endpoint: "/api/eurostat/dataset?code=ilc_peps01n&filters=geo=ES;sex=T;age=TOTAL;unit=PC",
    parser: "eurostat-simple",
    threshold: { amber: 22, red: 28, goodAbove: false },
    accent: "#dc2626",
  },
  {
    id: "sb-gini-eurostat",
    family: "demanda",
    label: "Coeficiente Gini · Eurostat ilc_di12",
    shortLabel: "Gini",
    unit: "",
    decimals: 1,
    source: "Eurostat · ilc_di12",
    sourceCode: "ilc_di12",
    frequency: "annual",
    description:
      "Índice de Gini de la renta disponible equivalente. 0=igualdad perfecta, 100=desigualdad máxima. Métrica estándar internacional de desigualdad.",
    endpoint: "/api/eurostat/dataset?code=ilc_di12&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 32, red: 36, goodAbove: false },
    accent: "#8b5cf6",
  },
];

export const SOCIEDAD_BIENESTAR_META = {
  slug: "sociedad-bienestar",
  label: "Sociedad, bienestar & desigualdad",
  shortLabel: "Bienestar",
  accent: "#dc2626",
  description: "Distribución del bienestar: pobreza, desigualdad, renta real, vivienda, educación, sanidad, prestaciones y malestar social.",
};
