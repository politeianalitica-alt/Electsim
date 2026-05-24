/**
 * Catálogo · subtab "Mercados & activos" v4 (Sprint N6.2).
 *
 * REFUNDACIÓN COMPLETA. La versión anterior copiaba PIB/Paro/IPC del catálogo
 * pulso-macro (5 de 8 indicadores eran macro genérico). El usuario detectó
 * que NO HABÍA UN SOLO indicador de mercado real: ni IBEX, ni VIX, ni spread.
 *
 * Esta versión usa exclusivamente datasets Eurostat monetario-financieros
 * (irt_*, ert_*, bsi_*, namq_*) + BIS para tener identidad propia.
 * Foco: el cuadro de mando de un trader/analista de inversión soberana ES.
 *
 * No hay overlap con pulso-macro · margen-fiscal · regimen-monetario:
 *  - pulso-macro: PIB/Paro/IPC reales
 *  - regimen-monetario: HICP/REER eurozona + confianza consumidor
 *  - margen-fiscal: deuda/saldo/AIReF
 *  - mercados-activos (esta): yields ES + spreads + EUR/USD + money + crédito
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const MERCADOS_ACTIVOS_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Tipos largo plazo · benchmark del coste de capital soberano ──────
  {
    id: "ma-yield-10y-es",
    family: "forecast",
    label: "Yield 10Y bono España",
    shortLabel: "10Y ES",
    unit: "%",
    decimals: 2,
    source: "Eurostat · irt_lt_mcby_m",
    sourceCode: "irt_lt_mcby_m:ES",
    frequency: "monthly",
    description:
      "Yield mensual del bono soberano español a 10 años (Maastricht criteria). Benchmark del coste de capital local. Cualquier subida estructural reprice equity ES y deuda corporativa.",
    endpoint: "/api/eurostat/dataset?code=irt_lt_mcby_m&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 3.5, red: 5, goodAbove: false },
    accent: "#dc2626",
  },
  {
    id: "ma-yield-10y-de",
    family: "forecast",
    label: "Yield 10Y bono Alemania (Bund)",
    shortLabel: "10Y DE",
    unit: "%",
    decimals: 2,
    source: "Eurostat · irt_lt_mcby_m",
    sourceCode: "irt_lt_mcby_m:DE",
    frequency: "monthly",
    description:
      "Yield del Bund alemán. Risk-free de la eurozona. La diferencia ES-DE es el spread soberano (prima de riesgo país).",
    endpoint: "/api/eurostat/dataset?code=irt_lt_mcby_m&filters=geo=DE",
    parser: "eurostat-simple",
    threshold: { amber: 2.5, red: 4, goodAbove: false },
    accent: "#94a3b8",
  },

  // ─── Política monetaria BCE · tipo corto eurozona ─────────────────────
  {
    id: "ma-tipo-corto-ea",
    family: "forecast",
    label: "Tipo corto 3M eurozona",
    shortLabel: "EURIBOR-like 3M",
    unit: "%",
    decimals: 2,
    source: "Eurostat · irt_st_m",
    sourceCode: "irt_st_m:EA",
    frequency: "monthly",
    description:
      "Tipo interbancario eurozona a 3 meses (proxy EURIBOR). Refleja la postura del BCE y el coste de financiación a corto plazo de bancos y empresas.",
    endpoint: "/api/eurostat/dataset?code=irt_st_m&filters=geo=EA",
    parser: "eurostat-simple",
    accent: "#0F766E",
  },
  {
    id: "ma-yield-curve-slope",
    family: "forecast",
    label: "Pendiente curva ES (10Y-corto)",
    shortLabel: "Slope ES",
    unit: "%",
    decimals: 2,
    source: "Eurostat · derivado",
    sourceCode: "10Y_ES_minus_3M_EA",
    frequency: "monthly",
    description:
      "Pendiente curva tipos (10Y bono ES − 3M EA). Inversión sostenida = señal de recesión. Empinamiento = expectativas reflacionarias / fin tightening.",
    endpoint: "/api/eurostat/dataset?code=irt_lt_mcby_m&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 0.5, red: 0, goodAbove: true },
    accent: "#8b5cf6",
  },

  // ─── FX · EUR/USD spot mensual ────────────────────────────────────────
  {
    id: "ma-eurusd",
    family: "exterior",
    label: "EUR/USD spot mensual",
    shortLabel: "EUR/USD",
    unit: "",
    decimals: 4,
    source: "Eurostat · ert_bil_eur_m",
    sourceCode: "ert_bil_eur_m:USD",
    frequency: "monthly",
    description:
      "Tipo de cambio EUR/USD spot mensual (BCE reference rate). Driver clave para activos en dólares de inversores europeos (exportadores, materias primas).",
    endpoint: "/api/eurostat/dataset?code=ert_bil_eur_m&filters=currency=USD",
    parser: "eurostat-simple",
    accent: "#0891b2",
  },

  // ─── FX · REER broad España · BIS ─────────────────────────────────────
  {
    id: "ma-reer-bis",
    family: "exterior",
    label: "REER broad España · BIS",
    shortLabel: "REER ES",
    unit: "",
    decimals: 1,
    source: "BIS Effective Exchange Rates",
    sourceCode: "REER_BROAD:ES",
    frequency: "monthly",
    description:
      "Tipo de cambio real efectivo broad (61 socios comerciales). >100 = apreciación real ⇒ pérdida competitividad-precio relativa. Driver del relativo equity ES vs DE/FR.",
    endpoint: "/api/bis/fx-effective",
    parser: "eurostat-simple",
    parserKey: "broad",
    threshold: { amber: 105, red: 115, goodAbove: false },
    accent: "#0891b2",
  },

  // ─── Política monetaria · crecimiento M3 eurozona ─────────────────────
  {
    id: "ma-m3-growth-ea",
    family: "forecast",
    label: "M3 agregado monetario YoY · BCE",
    shortLabel: "M3 YoY",
    unit: "%",
    decimals: 1,
    source: "Eurostat · ei_mfm3_m",
    sourceCode: "ei_mfm3_m:EA",
    frequency: "monthly",
    description:
      "Crecimiento interanual M3 zona euro. Lead indicator de inflación a 2-3 años (Quantity Theory) y de momentum del crédito. Caída brusca = riesgo deflacionista.",
    endpoint: "/api/eurostat/dataset?code=ei_mfm3_m&filters=geo=EA",
    parser: "eurostat-simple",
    threshold: { amber: 3, red: 1, goodAbove: true },
    accent: "#7c3aed",
  },

  // ─── Crédito · préstamos al sector privado España ─────────────────────
  {
    id: "ma-credito-privado-es",
    family: "demanda",
    label: "Crédito MFI sector privado ES",
    shortLabel: "Crédito ES",
    unit: "%",
    decimals: 1,
    source: "Eurostat · ei_bsbo_m",
    sourceCode: "ei_bsbo_m:ES",
    frequency: "monthly",
    description:
      "Crecimiento crédito a sociedades no financieras + hogares en España. Termómetro del canal bancario · síntoma directo de tensión financiera (credit crunch <0%).",
    endpoint: "/api/eurostat/dataset?code=ei_bsbo_m&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 2, red: 0, goodAbove: true },
    accent: "#f97316",
  },

  // ─── Mercado inmobiliario como activo (House Price Index ES) ──────────
  {
    id: "ma-hpi-es",
    family: "precios",
    label: "House Price Index España",
    shortLabel: "HPI ES",
    unit: "%",
    decimals: 1,
    source: "Eurostat · prc_hpi_q",
    sourceCode: "prc_hpi_q:ES",
    frequency: "quarterly",
    description:
      "Índice de precios de vivienda España YoY · Eurostat armonizado. Activo dominante en hogares españoles (60% riqueza neta). Proxy del ciclo financiero amplio.",
    endpoint: "/api/eurostat/dataset?code=prc_hpi_q&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 5, red: 10, goodAbove: false },
    accent: "#f59e0b",
  },

  // ─── Acciones · índice de precios sector financiero eurozona ──────────
  {
    id: "ma-stocks-financial-ea",
    family: "forecast",
    label: "Índice precios acciones sector financiero EA",
    shortLabel: "Stocks fin.",
    unit: "",
    decimals: 1,
    source: "Eurostat · ei_bsfi_m",
    sourceCode: "ei_bsfi_m:EA",
    frequency: "monthly",
    description:
      "Índice mensual de precios de acciones del sector financiero eurozona. Proxy de stress bancario y momentum equity. Caídas precedan tensión soberana.",
    endpoint: "/api/eurostat/dataset?code=ei_bsfi_m&filters=geo=EA",
    parser: "eurostat-simple",
    accent: "#16a34a",
  },
];

export const MERCADOS_ACTIVOS_META = {
  slug: "mercados-activos",
  label: "Mercados & activos",
  shortLabel: "Mercados",
  accent: "#7c3aed",
  description:
    "Cuadro de mando del trader / analista de inversión soberana España: yields ES vs DE (spread), curva, EUR/USD, REER, agregados monetarios M3, crédito MFI, índice precios inmobiliario y equity financiero EA. Datasets exclusivamente monetario-financieros.",
};
