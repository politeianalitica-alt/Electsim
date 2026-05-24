/**
 * Catálogo · subtab "Mercados & activos" v4 (Sprint N6.2 + N16).
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
 *
 * Sprint N16 · methodology + release + confidence + related ids por indicador.
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
    methodologyNote:
      "Yield secundario mensual bono benchmark 10Y (criterio convergencia Maastricht). Para spread vs Bund, restar ma-yield-10y-de. Para coste medio del stock deuda Tesoro usar mf-coste-medio-emisiones.",
    releaseSchedule: "Mensual · T+15 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ma-yield-10y-de", "ma-yield-curve-slope", "rs-yield-10y-es", "mf-vida-media-deuda"],
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
    methodologyNote:
      "Bund 10Y mensual. Benchmark europeo de tipo libre de riesgo. Movimientos suelen liderar el resto de yields EA. Si Bund sube +50pb sin contagio periféricos = compresion de spreads (risk-on); si sube +50pb con widening periféricos = stress crediticio.",
    releaseSchedule: "Mensual · T+15 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ma-yield-10y-es", "ma-yield-greece-10y"],
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
    methodologyNote:
      "Media mensual del tipo interbancario 3M en operaciones no garantizadas eurozona. Refleja casi puro tipo BCE depo + risk premium banca. Para serie pura EURIBOR diaria usar hev-euribor-12m.",
    releaseSchedule: "Mensual · T+15 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ma-yield-curve-slope", "hev-euribor-12m"],
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
    methodologyNote:
      "Construido como ma-yield-10y-es − ma-tipo-corto-ea. Indicador derivado (no es dato directo Eurostat). Curva invertida sostenida 3+ meses precede recesión EA en histórico 1995-2024.",
    releaseSchedule: "Mensual · derivado",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["ma-yield-10y-es", "ma-tipo-corto-ea"],
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
    methodologyNote:
      "BCE reference rate publicado diariamente, agregado mensual por Eurostat. Cuántos USD por 1 EUR · valores >1 = euro fuerte. Para histórico intra-mes usar el feed BCE directamente (no cubierto aquí).",
    releaseSchedule: "Mensual · T+5 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ma-reer-bis", "ma-m3-growth-ea"],
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
    methodologyNote:
      "Tipo cambio efectivo broad BIS (cesta 61 socios) deflactado por IPC relativo. Base 2010=100. Solo apreciación REAL (no nominal) — recoge inflación diferencial. Si REER sube por inflación interna mayor, hay erosión competitiva aunque el nominal no se mueva.",
    releaseSchedule: "Mensual · T+30 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ma-eurusd"],
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
    methodologyNote:
      "M3 = M2 + repos + cuotas fondos monetarios + valores deuda <2y. Crecimiento <0% (raro) anticipa deflación. Crecimiento >10% sostenido anticipa inflación según marco BCE 'two pillar'.",
    releaseSchedule: "Mensual · T+30 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ma-tipo-corto-ea", "rs-credito-pib-es"],
  },

  // Sprint N13.1 cleanup · ma-credito-privado-es y ma-hpi-es removidos · viven
  // en riesgo-sistemico (su tab natural). Eliminar duplicación fetcher.

  // ─── Sprint N13.2 · Spread credit IG vs Bund + Yields panel UE ─────────
  {
    id: "ma-spread-credit-ig",
    family: "forecast",
    label: "Spread crédito IG corporativo vs Bund",
    shortLabel: "Spread IG",
    unit: "pb",
    decimals: 0,
    source: "Eurostat · irt_h_eurcrd_d",
    sourceCode: "irt_h_eurcrd_d:CORP_IG",
    frequency: "daily",
    description:
      "Spread daily entre yield medio corporativo Investment Grade EUR y bund alemán 10Y. Termómetro de risk-off · ensanchamiento = credit stress (2020, 2022, 2023 SVB).",
    endpoint: "/api/eurostat/dataset?code=irt_h_eurcrd_d&filters=fcat=CORP_IG",
    parser: "eurostat-simple",
    threshold: { amber: 150, red: 250, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "Spread medio Investment Grade EUR yield minus Bund 10Y. Eurostat publica diario pero con lag 2-3 días. Para spread por sector banca usar fuentes complementarias (no cubiertas aquí).",
    releaseSchedule: "Diario · T+3 días",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["ma-yield-10y-de", "rs-tipo-prestamo-empresas"],
  },
  {
    id: "ma-yield-greece-10y",
    family: "forecast",
    label: "Yield 10Y soberano Grecia",
    shortLabel: "10Y GR",
    unit: "%",
    decimals: 2,
    source: "Eurostat · irt_lt_mcby_m",
    sourceCode: "irt_lt_mcby_m:GR",
    frequency: "monthly",
    description:
      "Yield Grecia · históricamente outlier peripheral EA. Convergencia hacia ES = mercado normaliza. Divergencia = stress reaparece. Memoria 2010-12.",
    endpoint: "/api/eurostat/dataset?code=irt_lt_mcby_m&filters=geo=EL",
    parser: "eurostat-simple",
    accent: "#0891b2",
    methodologyNote:
      "Bono benchmark griego 10Y mensual. Tras crisis 2010-12, GR pasó de yields >25% (default) a converger por debajo de ES en 2024 (rating upgrade S&P). Histórico de extremos.",
    releaseSchedule: "Mensual · T+15 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ma-yield-10y-es", "rs-yield-10y-it"],
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
    methodologyNote:
      "Subíndice EuroStoxx Financials. Sector banca + seguros + servicios financieros. Refleja sentimiento sobre solvencia + márgenes + regulación. Lead indicator de stress crediticio.",
    releaseSchedule: "Mensual · T+15 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ma-santander-adr", "ma-bbva-adr", "rs-npl-banca"],
  },

  // ─── Live equity ES · Finnhub snapshots (Sprint N12) ─────────────────
  // Finnhub free no expone candles históricas, solo quote actual + previous_close.
  // Devolvemos serie de 2 puntos (ayer/hoy) para mostrar nivel + variación
  // diaria. El analista ve nivel real intradía del IBEX vía cotizadas tractoras.
  {
    id: "ma-santander-adr",
    family: "forecast",
    label: "Santander ADR · NYSE",
    shortLabel: "SAN",
    unit: " USD",
    decimals: 2,
    source: "Finnhub · NYSE",
    sourceCode: "SAN",
    frequency: "daily",
    description:
      "Cotización Santander ADR (NYSE). Proxy live del banco español más capitalizado. Movimiento intradía indica appetite del mercado por banca ES.",
    endpoint: "/api/finnhub/quote/SAN",
    parser: "finnhub-quote",
    accent: "#dc2626",
    methodologyNote:
      "ADR = American Depositary Receipt sobre 1 acción Santander. Cotiza NYSE en USD. Para precio EUR multiplicar por EUR/USD inverso. Finnhub free tier solo snapshot (no candles).",
    releaseSchedule: "Intradía · refresh manual",
    confidenceLevel: "low",
    relatedIndicatorIds: ["ma-bbva-adr", "ma-stocks-financial-ea", "rs-npl-banca"],
  },
  {
    id: "ma-bbva-adr",
    family: "forecast",
    label: "BBVA ADR · NYSE",
    shortLabel: "BBVA",
    unit: " USD",
    decimals: 2,
    source: "Finnhub · NYSE",
    sourceCode: "BBVA",
    frequency: "daily",
    description:
      "Cotización BBVA ADR (NYSE). Segundo banco ES. Exposición LatAm + Turquía añade beta vs SAN puramente eurozona.",
    endpoint: "/api/finnhub/quote/BBVA",
    parser: "finnhub-quote",
    accent: "#0891b2",
    methodologyNote:
      "ADR sobre 1 acción BBVA. Beta más alta que SAN por exposición Garanti Turquía (lira) + México. Tracking error vs banca eurozona pura.",
    releaseSchedule: "Intradía · refresh manual",
    confidenceLevel: "low",
    relatedIndicatorIds: ["ma-santander-adr", "ma-stocks-financial-ea"],
  },
  {
    id: "ma-telefonica-adr",
    family: "forecast",
    label: "Telefónica ADR · NYSE",
    shortLabel: "TEF",
    unit: " USD",
    decimals: 2,
    source: "Finnhub · NYSE",
    sourceCode: "TEF",
    frequency: "daily",
    description:
      "Cotización Telefónica ADR (NYSE). Proxy del sector telecom ES + exposición Brasil/UK. Tradicionalmente high-yield (dividendo).",
    endpoint: "/api/finnhub/quote/TEF",
    parser: "finnhub-quote",
    accent: "#0F766E",
    methodologyNote:
      "ADR sobre 1 acción TEF. Histórico high-dividend yield 5-7%. Sensibilidad alta a tipos (proxy bond-like) y a real brasileño.",
    releaseSchedule: "Intradía · refresh manual",
    confidenceLevel: "low",
  },
  {
    id: "ma-aena-mc",
    family: "forecast",
    label: "Aena · BME (.MC)",
    shortLabel: "AENA",
    unit: " €",
    decimals: 2,
    source: "Finnhub · BME",
    sourceCode: "AENA.MC",
    frequency: "daily",
    description:
      "Cotización Aena (BME). Gestor aeroportuario nacional · proxy directo del ciclo turístico ES (record histórico turistas 2024). Earnings ligados a pax + duty-free.",
    endpoint: "/api/finnhub/quote/AENA.MC",
    parser: "finnhub-quote",
    accent: "#8b5cf6",
    methodologyNote:
      "Acción Aena cotizando BME en EUR. Gestor aeroportuario monopolio España. 51% capital Estado · float libre 49%. Ingresos = pax × tarifa + comercial. Driver: tráfico aéreo + capacidad fee.",
    releaseSchedule: "Intradía · refresh manual",
    confidenceLevel: "low",
  },
  {
    id: "ma-iberdrola-adr",
    family: "forecast",
    label: "Iberdrola ADR · OTC",
    shortLabel: "IBDRY",
    unit: " USD",
    decimals: 2,
    source: "Finnhub · OTC",
    sourceCode: "IBDRY",
    frequency: "daily",
    description:
      "Cotización Iberdrola ADR (OTC). Utility líder en renovables · proxy del sector energía limpia ES + exposición global (US, UK, Brasil, México).",
    endpoint: "/api/finnhub/quote/IBDRY",
    parser: "finnhub-quote",
    accent: "#16a34a",
    methodologyNote:
      "ADR Iberdrola en USD. Spread vs ADR puede no convergir intradía por arbitraje limitado. Para precio EUR usar IBE.MC en BME (preferido).",
    releaseSchedule: "Intradía · refresh manual",
    confidenceLevel: "low",
  },
  {
    id: "ma-inditex-adr",
    family: "forecast",
    label: "Inditex ADR · OTC",
    shortLabel: "IBKRY",
    unit: " USD",
    decimals: 2,
    source: "Finnhub · OTC",
    sourceCode: "IBKRY",
    frequency: "daily",
    description:
      "Cotización Inditex ADR (OTC). Top valor IBEX35 por capitalización · global retail con presencia 90+ países. Indicador del consumer cyclical ES + global.",
    endpoint: "/api/finnhub/quote/IBKRY",
    parser: "finnhub-quote",
    accent: "#f59e0b",
    methodologyNote:
      "ADR Inditex en USD (OTC). El primer valor del IBEX35 por capitalización. Sensibilidad alta al consumo discrecional + tipo cambio (40% ventas fuera EA). Inventario lean = beta operativa baja.",
    releaseSchedule: "Intradía · refresh manual",
    confidenceLevel: "low",
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
