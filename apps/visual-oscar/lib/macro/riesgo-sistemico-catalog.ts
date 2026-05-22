/**
 * Catálogo de indicadores · subtab "Riesgo sistémico" v3.
 *
 * Foco: vulnerabilidades agregadas (deuda, déficit, inflación gap, paro
 * estructural). Indicadores que se "encienden" cuando hay tensión macro.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const RIESGO_SISTEMICO_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Familia PIB (estresores fiscales) ───────────────────────────────
  {
    id: "rs-deuda-imf",
    family: "pib",
    label: "Deuda pública %PIB",
    shortLabel: "Deuda",
    unit: "%",
    decimals: 1,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGXWDG_NGDP",
    frequency: "annual",
    description:
      "Stock deuda %PIB. Vulnerabilidad estructural a shocks de tipos: a más alto, mayor sensibilidad del servicio.",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGXWDG_NGDP",
    parser: "imf-country",
    imfIndicator: "GGXWDG_NGDP",
    threshold: { amber: 100, red: 120, goodAbove: false },
    accent: "#dc2626",
  },
  {
    id: "rs-deficit-imf",
    family: "pib",
    label: "Saldo fiscal %PIB",
    shortLabel: "Saldo fiscal",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGXCNL_NGDP",
    frequency: "annual",
    description:
      "Saldo total AAPP %PIB. Métrica clave del Procedimiento de Déficit Excesivo UE (umbral −3%).",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGXCNL_NGDP",
    parser: "imf-country",
    imfIndicator: "GGXCNL_NGDP",
    threshold: { amber: -3, red: -6, goodAbove: true },
    accent: "#f59e0b",
  },

  // ─── Familia Precios (riesgo inflacionario) ──────────────────────────
  {
    id: "rs-ipc-anual",
    family: "precios",
    label: "IPC anual (gap vs 2%)",
    shortLabel: "IPC YoY",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · IPC",
    sourceCode: "IPC290750",
    frequency: "monthly",
    description:
      "Distancia respecto al target BCE 2%. Inflación alta erosiona competitividad, baja indica riesgo deflacionario.",
    endpoint: "/api/ine/ipc?n=36",
    parser: "ine-ipc",
    parserKey: "anual",
    threshold: { amber: 2, red: 4, goodAbove: false },
    accent: "#dc2626",
  },
  {
    id: "rs-ipc-imf-20y",
    family: "forecast",
    label: "Inflación IMF 20y + forecast",
    shortLabel: "Infl IMF",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "PCPIPCH",
    frequency: "annual",
    description:
      "Histórica + proyección IMF. Permite contextualizar shocks 2022-23 frente a convergencia esperada.",
    endpoint: "/api/imf/country?iso=ESP&indicator=PCPIPCH",
    parser: "imf-country",
    imfIndicator: "PCPIPCH",
    threshold: { amber: 2, red: 4, goodAbove: false },
    accent: "#dc2626",
  },

  // ─── Familia Empleo (vulnerabilidad social) ──────────────────────────
  {
    id: "rs-paro-imf",
    family: "empleo",
    label: "Tasa paro IMF (LUR)",
    shortLabel: "Paro",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "LUR",
    frequency: "annual",
    description:
      "Tasa paro WEO con proyección. Vulnerabilidad social/electoral y proxy de holgura del mercado laboral.",
    endpoint: "/api/imf/country?iso=ESP&indicator=LUR",
    parser: "imf-country",
    imfIndicator: "LUR",
    threshold: { amber: 12, red: 18, goodAbove: false },
    accent: "#f59e0b",
  },
  {
    id: "rs-paro-epa",
    family: "empleo",
    label: "Tasa paro EPA",
    shortLabel: "Paro EPA",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · EPA",
    sourceCode: "EPA86913",
    frequency: "quarterly",
    description:
      "Frecuencia más alta que IMF (trimestral). Lead indicator del paro estructural anual.",
    endpoint: "/api/ine/epa?n=24",
    parser: "ine-epa",
    parserKey: "general",
    threshold: { amber: 12, red: 18, goodAbove: false },
    accent: "#f59e0b",
  },

  // ─── Familia Exterior (riesgo externo) ───────────────────────────────
  {
    id: "rs-cuenta-corriente",
    family: "exterior",
    label: "Cuenta corriente %PIB (IMF)",
    shortLabel: "CC",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "BCA_NGDPD",
    frequency: "annual",
    description:
      "Vulnerabilidad externa. Déficit persistente requiere financiación neta exterior; crítica si supera −4%.",
    endpoint: "/api/imf/country?iso=ESP&indicator=BCA_NGDPD",
    parser: "imf-country",
    imfIndicator: "BCA_NGDPD",
    threshold: { amber: -2, red: -4, goodAbove: true },
    accent: "#7c3aed",
  },
];

export const RIESGO_SISTEMICO_META = {
  slug: "riesgo-sistemico",
  label: "Riesgo sistémico",
  shortLabel: "Riesgo",
  accent: "#dc2626",
  description:
    "Vulnerabilidades agregadas con umbrales académicos. Termómetro compuesto del estrés macro-financiero.",
};
