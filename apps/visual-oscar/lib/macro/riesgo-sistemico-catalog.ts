/**
 * Catálogo · subtab "Riesgo sistémico" v4 (Sprint N6.2 + N16).
 *
 * REFUNDACIÓN. La versión anterior tenía PIB/Paro/IPC genéricos (5 de 8
 * indicadores eran macro estándar copiados de pulso-macro). Esta versión
 * se centra en VULNERABILIDADES FINANCIERAS Y SISTÉMICAS específicas:
 *  - estrés soberano (yield 10Y, spread implícito vs Bund)
 *  - estrés bancario (NPL, crédito, ratio crédito/PIB, tipos)
 *  - estrés inmobiliario (HPI, precios alquiler)
 *  - estrés energético (precios IPC energía)
 *  - estrés laboral estructural (paro larga duración LFD, no paro total)
 *
 * Sin solape con pulso-macro (que tiene paro general, IPC general, PIB).
 * Sprint N16: methodology + release + confidence + related ids por indicador.
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
    methodologyNote:
      "Yield secundario mensual bono benchmark 10Y (criterio convergencia Maastricht). NO es coste medio del stock — para eso usar mf-coste-medio-emisiones. La diferencia entre yield mercado y coste stock = ahorro futuro (si yield < stock) o coste creciente (si yield > stock).",
    releaseSchedule: "Mensual · publicación T+15 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rs-yield-10y-it", "mf-vida-media-deuda", "mf-coste-medio-emisiones", "rs-deuda-imf"],
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
    methodologyNote:
      "Mismo dataset Eurostat, geo=IT. Spread IT-ES suele invertirse en crisis (IT pasa por encima en estrés periférico). Para construir spread real, restar este valor al rs-yield-10y-es.",
    releaseSchedule: "Mensual · igual que ES",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rs-yield-10y-es"],
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
    methodologyNote:
      "Sociedades no financieras + hogares + ISFLSH. NO incluye AAPP. Variación m/m anualizada — más reactiva que YoY pero más ruidosa. Para tracking estructural usar Basel credit gap (no disponible vía API pública).",
    releaseSchedule: "Mensual · T+30 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rs-npl-banca", "rs-tipo-prestamo-empresas", "hev-deuda-hogares-pib"],
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
    methodologyNote:
      "Eurostat HPI armonizado. Coincide con el INE IPV pero con metodología comparable UE (encadenamiento Laspeyres modificado). Suele estar 5-10 pp por encima de los precios reportados por portales (que reflejan oferta, no transacción).",
    releaseSchedule: "Trimestral · publicación T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-ipv-general", "hev-tipo-hipoteca"],
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
    methodologyNote:
      "Coicop NRG = electricidad + gas + combustibles líquidos + carburantes. RCH_A = variación interanual mensual. Sensibilidad alta a precio mayorista gas (TTF) + tipo cambio EUR/USD para petróleo. España suaviza pico via Iberian exception 2022-23.",
    releaseSchedule: "Mensual · publicación T+15 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-ipc-anual", "rs-credito-pib-es"],
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
    methodologyNote:
      "CLG = Contingent Liabilities Government, sólo garantías explícitas (excluye PPP off-balance + pensiones futuras + deudas latentes). Materialización histórica España ~5-10% del valor avalado.",
    releaseSchedule: "Anual · publicación enero del año T+2 (datos 2022 publicados ene 2024)",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["mf-deuda-imf", "mf-deuda-bruta-eurostat"],
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
    methodologyNote:
      "Definición OIT: parado >12 meses continuos. Histéresis estructural: la probabilidad de salir cae al 5% mensual después de 12 meses sin empleo (vs 25% para LD<6 meses).",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-paro-largo-plazo", "hev-paro-epa-general"],
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
    methodologyNote:
      "Not in Education, Employment or Training. Cohorte 15-29 (más amplia que la definición clásica 16-24). Sub-componente clave de la 'generación perdida' post-2008. España duplica media OCDE en categoría 25-29.",
    releaseSchedule: "Anual · publicación abril del año T+1",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-paro-epa-jovenes"],
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
    methodologyNote:
      "Deuda bruta consolidada Maastricht según IMF WEO (alineado con notificación Eurostat PDE pero con proyecciones 5y). Si quieres últimas cifras oficiales, ver mf-deuda-bruta-eurostat en margen-fiscal.",
    releaseSchedule: "Anual · WEO publica abril+octubre · revisiones materiales en revisiones de octubre",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rs-yield-10y-es", "mf-deuda-bruta-eurostat", "mf-saldo-total"],
  },

  // ─── Sprint N16 · Estrés bancario fino · BdE webstat NPL/crédito ──────
  {
    id: "rs-npl-banca",
    family: "demanda",
    label: "Ratio dudosos (NPL) crédito sector privado",
    shortLabel: "NPL",
    unit: "%",
    decimals: 2,
    source: "BdE · webstat BE_4_18",
    sourceCode: "BE_4_18",
    frequency: "monthly",
    description:
      "Ratio créditos dudosos (NPL) sobre crédito total al sector privado residente. Termómetro de la calidad de cartera bancaria. Pico 2013: 13.6% (saneamiento Sareb). Hoy <4% pero subiendo con shock tipos 2022-24.",
    endpoint: "/api/bde/series/BE_4_18?n=36",
    parser: "bde-series",
    threshold: { amber: 5, red: 8, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "Ratio mensual sector OSR (Otros Sectores Residentes) BdE Boletín Estadístico cap.4.18. No incluye Sareb · refleja banca operativa. Salto Dic 2017 por reclasificación CCAA-DDA.",
    releaseSchedule: "Mensual · publicación T+45 días tras fin de mes",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rs-credito-pib-es", "rs-yield-10y-es", "rs-tipo-prestamo-empresas"],
  },
  {
    id: "rs-tipo-prestamo-empresas",
    family: "forecast",
    label: "Tipo medio préstamos empresas (<1M€)",
    shortLabel: "Tipo PYMEs",
    unit: "%",
    decimals: 2,
    source: "BdE · webstat TI_1_1245",
    sourceCode: "TI_1_1245",
    frequency: "monthly",
    description:
      "Tipo de interés medio aplicado a nuevas operaciones de préstamo a sociedades no financieras por importes <1M€ (PYMEs). Driver del estrés financiero corporativo · cada +100pb erosiona ~1.5 puntos de beneficio antes de impuestos.",
    endpoint: "/api/bde/series/TI_1_1245?n=36",
    parser: "bde-series",
    threshold: { amber: 4.5, red: 6, goodAbove: false },
    accent: "#f59e0b",
    methodologyNote:
      "MIR (Monetary Financial Institutions Interest Rate Statistics) Eurosistema · ponderado por nuevo volumen contratado en el mes. Diferencia con tipo BCE = prima riesgo + margen banca.",
    releaseSchedule: "Mensual · T+30 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rs-yield-10y-es", "rs-credito-pib-es", "rs-npl-banca"],
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
