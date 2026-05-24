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

  // Sprint N6.3 cleanup: rm-ipc-imf-20y removido · HICP Eurostat lo cubre
  // mejor (mensual + armonizada UE + comparable con peers). PCPIPCH IMF anual
  // queda solo en pulso-macro como ancla forecast.

  // ─── Inflación subyacente (core HICP) · driver de decisión BCE ────────
  {
    id: "rm-hicp-core",
    family: "precios",
    label: "HICP core (sin energía/alimentos)",
    shortLabel: "HICP core",
    unit: "%",
    decimals: 2,
    source: "Eurostat · prc_hicp_manr",
    sourceCode: "prc_hicp_manr:CP00X:ES",
    frequency: "monthly",
    description:
      "Inflación subyacente (HICP all-items excluding energy and food). Variable que sigue BCE para política monetaria · más persistente que headline, menos ruido.",
    endpoint: "/api/eurostat/dataset?code=prc_hicp_manr&filters=geo=ES;coicop=CP00X;unit=RCH_A",
    parser: "eurostat-simple",
    threshold: { amber: 2.5, red: 4, goodAbove: false },
    accent: "#dc2626",
  },

  // Sprint N13.1 cleanup · rm-reer-bis removido · vive en mercados-activos
  // (su tab natural · ancla FX para activos). Cross-link en lugar de duplicar.

  // ─── Sprint N13.2 · EURIBOR 3M (transmisión BCE → hipotecas) ──────────
  {
    id: "rm-euribor-3m",
    family: "forecast",
    label: "EURIBOR 3M mensual",
    shortLabel: "EURIBOR 3M",
    unit: "%",
    decimals: 2,
    source: "Eurostat · irt_st_m",
    sourceCode: "irt_st_m:EUR_RT_M3",
    frequency: "monthly",
    description:
      "Tipo interbancario eurozona a 3 meses. Benchmark del corto plazo del crédito · transmisión inmediata de cambios MRO/DFR del BCE.",
    endpoint: "/api/eurostat/dataset?code=irt_st_m&filters=geo=EA",
    parser: "eurostat-simple",
    accent: "#7c3aed",
  },
  // Sprint L F6 · +3 indicadores Eurostat para enriquecer régimen monetario
  {
    id: "rm-hicp-eurostat",
    family: "precios",
    label: "HICP zona euro España · Eurostat prc_hicp_manr",
    shortLabel: "HICP YoY",
    unit: "%",
    decimals: 2,
    source: "Eurostat · prc_hicp_manr",
    sourceCode: "prc_hicp_manr:CP00",
    frequency: "monthly",
    description:
      "Inflación armonizada (HICP) anual mensual · armonizada UE. Métrica que sigue el BCE para decisiones de política monetaria. Comparable con Alemania/Francia/Italia.",
    endpoint: "/api/eurostat/dataset?code=prc_hicp_manr&filters=geo=ES;coicop=CP00;unit=RCH_A",
    parser: "eurostat-simple",
    threshold: { amber: 2, red: 4, goodAbove: false },
    accent: "#dc2626",
  },
  // Sprint N13.1 cleanup · rm-tipos-largo-eurostat removido · duplica el
  // ma-yield-10y-es de mercados-activos (mismo dataset + filtro).

  // ─── Sprint N13.2 · HICP componentes (driver headline vs core) ───────
  {
    id: "rm-hicp-energia",
    family: "precios",
    label: "HICP componente energía",
    shortLabel: "HICP energía",
    unit: "%",
    decimals: 1,
    source: "Eurostat · prc_hicp_manr",
    sourceCode: "prc_hicp_manr:NRG:ES",
    frequency: "monthly",
    description:
      "Variación interanual del componente energético del HICP. Driver volátil del headline · pico 2022 (+44%). Crítico para análisis BCE 'mira through' transitorio vs persistente.",
    endpoint: "/api/eurostat/dataset?code=prc_hicp_manr&filters=geo=ES;coicop=NRG;unit=RCH_A",
    parser: "eurostat-simple",
    threshold: { amber: 5, red: 15, goodAbove: false },
    accent: "#dc2626",
  },
  {
    id: "rm-hicp-alimentos",
    family: "precios",
    label: "HICP componente alimentos",
    shortLabel: "HICP food",
    unit: "%",
    decimals: 1,
    source: "Eurostat · prc_hicp_manr",
    sourceCode: "prc_hicp_manr:FOOD:ES",
    frequency: "monthly",
    description:
      "Inflación alimentaria · pesa más en cesta de hogares bajos quintiles. Sticky vs energía · refleja shock transmisión a precios consumidor.",
    endpoint: "/api/eurostat/dataset?code=prc_hicp_manr&filters=geo=ES;coicop=FOOD;unit=RCH_A",
    parser: "eurostat-simple",
    threshold: { amber: 3, red: 6, goodAbove: false },
    accent: "#f97316",
  },
  {
    id: "rm-hicp-mom",
    family: "precios",
    label: "HICP m/m momentum",
    shortLabel: "HICP m/m",
    unit: "%",
    decimals: 2,
    source: "Eurostat · prc_hicp_mmor",
    sourceCode: "prc_hicp_mmor:CP00:ES",
    frequency: "monthly",
    description:
      "Variación mensual HICP (no anualizada). Captura momentum intra-año sin base effect. Lectura más limpia para anticipar ritmo subyacente.",
    endpoint: "/api/eurostat/dataset?code=prc_hicp_mmor&filters=geo=ES;coicop=CP00",
    parser: "eurostat-simple",
    accent: "#8b5cf6",
  },
  {
    id: "rm-confianza-consumidor-eurostat",
    family: "sentimiento",
    label: "Confianza consumidor · Eurostat ei_bsco_m",
    shortLabel: "Conf. cons.",
    unit: "",
    decimals: 1,
    source: "Eurostat · ei_bsco_m",
    sourceCode: "ei_bsco_m",
    frequency: "monthly",
    description:
      "Indicador de confianza del consumidor (mensual, balance de opiniones). Lead indicator de demanda agregada — caídas anticipan menor consumo y menor inflación de servicios.",
    endpoint: "/api/eurostat/dataset?code=ei_bsco_m&filters=geo=ES;indic=BS-CSMCI;s_adj=SA",
    parser: "eurostat-simple",
    accent: "#8b5cf6",
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
