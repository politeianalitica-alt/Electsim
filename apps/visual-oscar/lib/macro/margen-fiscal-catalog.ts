/**
 * Catálogo de indicadores · subtab "Margen fiscal" v3.
 *
 * Foco: stock deuda, déficit total/primario, intereses, ingresos y gasto
 * AAPP. Todo IMF WEO anual con histórica + forecast.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const MARGEN_FISCAL_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Familia PIB (referente para ratios) ─────────────────────────────
  {
    id: "mf-deuda-imf",
    family: "pib",
    label: "Deuda pública %PIB (Maastricht)",
    shortLabel: "Deuda %PIB",
    unit: "%",
    decimals: 1,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGXWDG_NGDP",
    frequency: "annual",
    description:
      "Stock de deuda pública (Maastricht definition) sobre PIB. Regla UE: límite 60%. Crítico para sostenibilidad fiscal.",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGXWDG_NGDP",
    parser: "imf-country",
    imfIndicator: "GGXWDG_NGDP",
    threshold: { amber: 100, red: 120, goodAbove: false },
    accent: "#0F766E",
  },
  {
    id: "mf-deuda-neta-imf",
    family: "pib",
    label: "Deuda neta %PIB",
    shortLabel: "Deuda neta",
    unit: "%",
    decimals: 1,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGXWDN_NGDP",
    frequency: "annual",
    description:
      "Deuda pública neta (bruta menos activos financieros líquidos). Métrica complementaria al ratio Maastricht.",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGXWDN_NGDP",
    parser: "imf-country",
    imfIndicator: "GGXWDN_NGDP",
    threshold: { amber: 80, red: 100, goodAbove: false },
    accent: "#0F766E",
  },

  // ─── Familia Saldos ───────────────────────────────────────────────────
  {
    id: "mf-saldo-total",
    family: "forecast",
    label: "Saldo fiscal total %PIB",
    shortLabel: "Saldo total",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGXCNL_NGDP",
    frequency: "annual",
    description:
      "Saldo de las AAPP en %PIB. Regla Maastricht: −3% PIB como umbral de Procedimiento de Déficit Excesivo.",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGXCNL_NGDP",
    parser: "imf-country",
    imfIndicator: "GGXCNL_NGDP",
    threshold: { amber: -3, red: -6, goodAbove: true },
    accent: "#f59e0b",
  },
  {
    id: "mf-saldo-primario",
    family: "forecast",
    label: "Saldo primario %PIB",
    shortLabel: "Primario",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGXONLB_NGDP",
    frequency: "annual",
    description:
      "Saldo excluyendo intereses. Diferencia (total − primario) = carga de intereses sobre PIB.",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGXONLB_NGDP",
    parser: "imf-country",
    imfIndicator: "GGXONLB_NGDP",
    threshold: { amber: 0, red: -2, goodAbove: true },
    accent: "#10b981",
  },
  {
    id: "mf-saldo-estructural",
    family: "forecast",
    label: "Saldo estructural %PIB",
    shortLabel: "Estructural",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGSB_NGDP",
    frequency: "annual",
    description:
      "Saldo cíclicamente ajustado (sin componente cíclico ni one-offs). Métrica de la AIReF / Pacto de Estabilidad.",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGSB_NGDP",
    parser: "imf-country",
    imfIndicator: "GGSB_NGDP",
    threshold: { amber: -1, red: -3, goodAbove: true },
    accent: "#7c3aed",
  },

  // ─── Familia Ingresos/Gasto ──────────────────────────────────────────
  {
    id: "mf-ingresos-aapp",
    family: "demanda",
    label: "Ingresos AAPP %PIB",
    shortLabel: "Ingresos",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGR_NGDP",
    frequency: "annual",
    description:
      "Recursos totales de las AAPP en %PIB (presión fiscal agregada). Comparable con peers UE (Alemania ~46%, Francia ~52%).",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGR_NGDP",
    parser: "imf-country",
    imfIndicator: "GGR_NGDP",
    accent: "#16a34a",
  },
  {
    id: "mf-gasto-aapp",
    family: "demanda",
    label: "Gasto AAPP %PIB",
    shortLabel: "Gasto",
    unit: "%",
    decimals: 2,
    source: "Eurostat · gov_10a_main",
    sourceCode: "gov_10a_main:TE",
    frequency: "annual",
    description:
      "Total expenditure (TE) AAPP en %PIB. Sprint L F3/F6: migrado de IMF GGX_NGDP (no devolvía datos) a Eurostat gov_10a_main que sí los publica.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_main&filters=geo=ES;na_item=TE;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#dc2626",
  },
  {
    id: "mf-deuda-neta-eurostat",
    family: "pib",
    label: "Deuda pública neta %PIB · Eurostat gov_10dd_ggdebt",
    shortLabel: "Deuda neta",
    unit: "%",
    decimals: 1,
    source: "Eurostat · gov_10dd_ggdebt",
    sourceCode: "gov_10dd_ggdebt",
    frequency: "annual",
    description:
      "Deuda pública bruta consolidada Maastricht %PIB. Complementa la deuda bruta IMF GGXWDG_NGDP con datos Eurostat oficiales trimestrales.",
    endpoint: "/api/eurostat/dataset?code=gov_10dd_ggdebt&filters=geo=ES;sector=S13;unit=PC_GDP;na_item=GD",
    parser: "eurostat-simple",
    threshold: { amber: 100, red: 120, goodAbove: false },
    accent: "#0F766E",
  },
];

export const MARGEN_FISCAL_META = {
  slug: "margen-fiscal",
  label: "Margen fiscal",
  shortLabel: "Fiscal",
  accent: "#f59e0b",
  description:
    "Deuda, déficit, intereses, ingresos y gasto AAPP. Indicadores que determinan el espacio fiscal disponible.",
};
