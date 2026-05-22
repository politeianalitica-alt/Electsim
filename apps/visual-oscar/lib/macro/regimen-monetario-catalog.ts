/**
 * Catálogo de indicadores · subtab "Régimen monetario" v3.
 *
 * Foco: inflación (general + componentes), tipos BCE (snapshot via tabs),
 * tipo de cambio real efectivo, expectativas IMF.
 *
 * Sólo se incluyen indicadores con SERIE temporal (≥4 puntos). Métricas
 * snapshot (curva soberana actual, depo rate puntual) se quedan en el
 * subtab clásico /macro?tab=regimen-monetario.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const REGIMEN_MONETARIO_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Familia Precios (INE IPC) ────────────────────────────────────────
  {
    id: "rm-ipc-anual",
    family: "precios",
    label: "IPC general · variación anual",
    shortLabel: "IPC YoY",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · IPC",
    sourceCode: "IPC290750",
    frequency: "monthly",
    description:
      "Tasa de inflación general anual del IPC. Comparable BCE target 2% medio plazo. Núcleo del régimen monetario.",
    endpoint: "/api/ine/ipc?n=36",
    parser: "ine-ipc",
    parserKey: "anual",
    threshold: { amber: 2, red: 4, goodAbove: false },
    accent: "#dc2626",
  },
  {
    id: "rm-ipc-mensual",
    family: "precios",
    label: "IPC general · variación mensual",
    shortLabel: "IPC m/m",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · IPC",
    sourceCode: "IPC290752",
    frequency: "monthly",
    description:
      "Variación intermensual del IPC. Mejor lector de inflexiones inflacionarias intra-año (no arrastra base year).",
    endpoint: "/api/ine/ipc?n=36",
    parser: "ine-ipc",
    parserKey: "mensual",
    accent: "#8b5cf6",
  },
  {
    id: "rm-ipc-acumulada",
    family: "precios",
    label: "IPC general · acumulada YTD",
    shortLabel: "IPC YTD",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · IPC",
    sourceCode: "IPC290753",
    frequency: "monthly",
    description:
      "Inflación acumulada desde enero del año en curso. Útil para anclar expectativas de cierre de año.",
    endpoint: "/api/ine/ipc?n=36",
    parser: "ine-ipc",
    parserKey: "acumulada",
    accent: "#a855f7",
  },

  // ─── Familia Forecast (IMF) ──────────────────────────────────────────
  {
    id: "rm-ipc-imf-20y",
    family: "forecast",
    label: "Inflación IMF · 20y histórica + forecast 5y",
    shortLabel: "Infl IMF 20y",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "PCPIPCH",
    frequency: "annual",
    description:
      "Serie larga del IMF WEO con proyección 5 años. Captura el shock 2022-23 y la convergencia esperada hacia el target del BCE.",
    endpoint: "/api/imf/country?iso=ESP&indicator=PCPIPCH",
    parser: "imf-country",
    imfIndicator: "PCPIPCH",
    threshold: { amber: 2, red: 4, goodAbove: false },
    accent: "#dc2626",
  },

  // ─── Familia Exterior (BIS REER) ─────────────────────────────────────
  {
    id: "rm-reer-bis",
    family: "exterior",
    label: "Tipo cambio real efectivo · BIS broad",
    shortLabel: "REER",
    unit: "",
    decimals: 1,
    source: "BIS Effective Exchange Rates",
    sourceCode: "REER_BROAD",
    frequency: "monthly",
    description:
      "Índice REER broad (base 2010=100) ponderado por cesta comercial. >100 = apreciación real frente a peers; pérdida de competitividad-precio.",
    endpoint: "/api/bis/fx-effective",
    parser: "eurostat-simple",
    parserKey: "broad",
    accent: "#0891b2",
  },
];

export const REGIMEN_MONETARIO_META = {
  slug: "regimen-monetario",
  label: "Régimen monetario",
  shortLabel: "Monetario",
  accent: "#7c3aed",
  description:
    "Inflación, transmisión monetaria del BCE, divisas y competitividad-precio. Núcleo del marco macroeconómico de medio plazo.",
};
