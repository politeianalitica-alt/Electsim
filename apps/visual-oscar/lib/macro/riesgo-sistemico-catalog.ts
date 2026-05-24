/**
 * Catálogo · subtab "Riesgo sistémico" v4 (Sprint N6.2).
 *
 * REFUNDACIÓN. La versión anterior tenía PIB/Paro/IPC genéricos (5 de 8
 * indicadores eran macro estándar copiados de pulso-macro). Esta versión
 * se centra en VULNERABILIDADES FINANCIERAS Y SISTÉMICAS específicas:
 *  - estrés soberano (yield 10Y, spread implícito vs Bund)
 *  - estrés bancario (NPL, crédito, ratio crédito/PIB)
 *  - estrés inmobiliario (HPI, precios alquiler)
 *  - estrés energético (precios IPC energía)
 *  - estrés laboral estructural (paro larga duración LFD, no paro total)
 *
 * Sin solape con pulso-macro (que tiene paro general, IPC general, PIB).
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const RIESGO_SISTEMICO_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Estrés soberano · yield 10Y ES ────────────────────────────────────
  {
    id: "rs-yield-10y-es",
    family: "forecast",
    label: "Yield 10Y soberano España",
    shortLabel: "10Y ES",
    unit: "%",
    decimals: 2,
    source: "Eurostat · irt_lt_mcby_m",
    sourceCode: "irt_lt_mcby_m:ES",
    frequency: "monthly",
    description:
      "Yield 10Y bono español. Termómetro principal del estrés soberano. Subidas estructurales preceden episodios de prima de riesgo (2010-12, mini-2018, 2022).",
    endpoint: "/api/eurostat/dataset?code=irt_lt_mcby_m&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 3.5, red: 5, goodAbove: false },
    accent: "#dc2626",
  },

  // ─── Estrés soberano · spread Italia (proxy contagio) ─────────────────
  {
    id: "rs-yield-10y-it",
    family: "forecast",
    label: "Yield 10Y soberano Italia",
    shortLabel: "10Y IT",
    unit: "%",
    decimals: 2,
    source: "Eurostat · irt_lt_mcby_m",
    sourceCode: "irt_lt_mcby_m:IT",
    frequency: "monthly",
    description:
      "Yield italiano. Italia es la 'canary in the coal mine' de la eurozona periférica. Convergencia con yields ES señala contagio sistémico.",
    endpoint: "/api/eurostat/dataset?code=irt_lt_mcby_m&filters=geo=IT",
    parser: "eurostat-simple",
    threshold: { amber: 4, red: 6, goodAbove: false },
    accent: "#dc2626",
  },

  // ─── Estrés bancario · ratio crédito/PIB (Basel gap proxy) ────────────
  {
    id: "rs-credito-pib-es",
    family: "demanda",
    label: "Crédito MFI sector privado YoY",
    shortLabel: "Crédito YoY",
    unit: "%",
    decimals: 1,
    source: "Eurostat · ei_bsbo_m",
    sourceCode: "ei_bsbo_m:ES",
    frequency: "monthly",
    description:
      "Crecimiento crédito MFI a sociedades no financieras + hogares. Caídas sostenidas <0% = credit crunch. Crecimientos >15% YoY = burbuja crediticia.",
    endpoint: "/api/eurostat/dataset?code=ei_bsbo_m&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 2, red: 0, goodAbove: true },
    accent: "#f97316",
  },

  // ─── Estrés inmobiliario · HPI YoY ────────────────────────────────────
  {
    id: "rs-hpi-es",
    family: "precios",
    label: "House Price Index YoY",
    shortLabel: "HPI YoY",
    unit: "%",
    decimals: 1,
    source: "Eurostat · prc_hpi_q",
    sourceCode: "prc_hpi_q:ES",
    frequency: "quarterly",
    description:
      "Variación interanual del Índice Precios Vivienda. >10% sostenido = sobrecalentamiento (riesgo de corrección). <-5% = crisis inmobiliaria activa (replay 2008).",
    endpoint: "/api/eurostat/dataset?code=prc_hpi_q&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 7, red: 12, goodAbove: false },
    accent: "#f59e0b",
  },

  // ─── Estrés energético · HICP energía Eurostat (componente real) ────
  // Sprint N13.1 fix · el dataset INE IPC290750 filtrado por parserKey=anual
  // devuelve IPC GENERAL, no energía. Cambiamos a HICP componente NRG Eurostat
  // que sí filtra correctamente energía con coicop=NRG.
  {
    id: "rs-hicp-energia",
    family: "precios",
    label: "HICP energía hogares YoY",
    shortLabel: "HICP energía",
    unit: "%",
    decimals: 1,
    source: "Eurostat · prc_hicp_manr",
    sourceCode: "prc_hicp_manr:NRG:ES",
    frequency: "monthly",
    description:
      "Componente energético del HICP armonizado. Pico 2022 +44%. Crisis energéticas elevan riesgo sistémico vía pérdida poder adquisitivo + presión política · refleja shock supply-side.",
    endpoint: "/api/eurostat/dataset?code=prc_hicp_manr&filters=geo=ES;coicop=NRG;unit=RCH_A",
    parser: "eurostat-simple",
    threshold: { amber: 10, red: 25, goodAbove: false },
    accent: "#dc2626",
  },
  // ─── Sprint N13.2 · Pasivos contingentes AAPP (avales explícitos) ───
  {
    id: "rs-pasivos-contingentes",
    family: "pib",
    label: "Pasivos contingentes AAPP %PIB",
    shortLabel: "Avales AAPP",
    unit: "%",
    decimals: 1,
    source: "Eurostat · gov_cl_liab",
    sourceCode: "gov_cl_liab:CLG:ES",
    frequency: "annual",
    description:
      "Avales y garantías explícitas otorgadas por las AAPP. Pueden materializarse como deuda en escenarios de stress. ICO covid (~140k M€), Sareb (~50k M€), Reactiva, etc.",
    endpoint: "/api/eurostat/dataset?code=gov_cl_liab&filters=geo=ES;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 12, red: 20, goodAbove: false },
    accent: "#7c3aed",
  },

  // ─── Estrés laboral estructural · paro larga duración ─────────────────
  {
    id: "rs-paro-larga-duracion",
    family: "empleo",
    label: "Paro larga duración (>1 año)",
    shortLabel: "Paro LD",
    unit: "%",
    decimals: 1,
    source: "Eurostat · lfsq_upgan",
    sourceCode: "lfsq_upgan:ES",
    frequency: "quarterly",
    description:
      "% parados de larga duración (>12 meses) sobre activos. Driver de pobreza estructural y desafección política. España persiste por encima de la media UE.",
    endpoint: "/api/eurostat/dataset?code=lfsq_upgan&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 5, red: 8, goodAbove: false },
    accent: "#f59e0b",
  },

  // ─── Estrés vulnerabilidad social · NEET ─────────────────────────────
  {
    id: "rs-neet",
    family: "empleo",
    label: "NEET 15-29 años",
    shortLabel: "NEET",
    unit: "%",
    decimals: 1,
    source: "Eurostat · edat_lfse_20",
    sourceCode: "edat_lfse_20:ES",
    frequency: "annual",
    description:
      "Jóvenes 15-29 ni estudian ni trabajan. Indicador estructural de desperdicio de capital humano y vulnerabilidad social/electoral.",
    endpoint: "/api/eurostat/dataset?code=edat_lfse_20&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 12, red: 16, goodAbove: false },
    accent: "#7c3aed",
  },

  // ─── Estrés soberano · vida media deuda Tesoro (alongamiento) ─────────
  {
    id: "rs-deuda-imf",
    family: "pib",
    label: "Deuda pública %PIB (referencia)",
    shortLabel: "Deuda%",
    unit: "%",
    decimals: 1,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGXWDG_NGDP",
    frequency: "annual",
    description:
      "Stock deuda. Sigue siendo input al riesgo sistémico aunque el detalle vive en margen-fiscal. Aquí se usa como ancla del estresor fiscal sobre el resto del sistema.",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGXWDG_NGDP",
    parser: "imf-country",
    imfIndicator: "GGXWDG_NGDP",
    threshold: { amber: 100, red: 120, goodAbove: false },
    accent: "#dc2626",
  },
];

export const RIESGO_SISTEMICO_META = {
  slug: "riesgo-sistemico",
  label: "Riesgo sistémico",
  shortLabel: "Riesgo",
  accent: "#dc2626",
  description:
    "Vulnerabilidades financieras y sistémicas específicas: yields ES vs IT (contagio), crédito MFI, HPI inmobiliario, shock energético en IPC, paro larga duración y NEET, deuda %PIB como ancla fiscal. Sin solape con pulso-macro.",
};
