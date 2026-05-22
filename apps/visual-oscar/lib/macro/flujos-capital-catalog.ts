/**
 * Catálogo de indicadores · subtab "Flujos de capital" v3.
 *
 * Foco: ¿entra o sale capital de España, hacia qué sectores, desde qué
 * países y con qué implicaciones?
 *
 * Para v3 v1 sólo se incluyen indicadores macro con SERIE: cuenta
 * corriente (proxy de financiación exterior), deuda pública (atractivo
 * para inversores extranjeros), inversión bruta y REER. DataInvex con
 * detalle por país/sector queda para integraciones futuras.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const FLUJOS_CAPITAL_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Familia Exterior · cuenta corriente (financiación neta) ─────────
  {
    id: "fc-cuenta-corriente",
    family: "exterior",
    label: "Cuenta corriente %PIB · IMF BCA_NGDPD",
    shortLabel: "CC",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "BCA_NGDPD",
    frequency: "annual",
    description:
      "Saldo de la cuenta corriente sobre PIB. Positivo = España exporta ahorro neto al exterior. Negativo = requiere financiación neta exterior.",
    endpoint: "/api/imf/country?iso=ESP&indicator=BCA_NGDPD",
    parser: "imf-country",
    imfIndicator: "BCA_NGDPD",
    threshold: { amber: -2, red: -4, goodAbove: true },
    accent: "#7c3aed",
  },

  // ─── Familia Exterior · REER (atractivo capital extranjero) ──────────
  {
    id: "fc-reer-bis",
    family: "exterior",
    label: "REER broad · BIS",
    shortLabel: "REER",
    unit: "",
    decimals: 1,
    source: "BIS Effective Exchange Rates",
    sourceCode: "REER_BROAD",
    frequency: "monthly",
    description:
      "Tipo de cambio real efectivo. Afecta atractivo relativo de activos españoles para inversores extranjeros vía valoración cambiaria.",
    endpoint: "/api/bis/fx-effective",
    parser: "eurostat-simple",
    parserKey: "broad",
    accent: "#0891b2",
  },

  // ─── Familia PIB · stock deuda (interés extranjero en bonos) ─────────
  {
    id: "fc-deuda-imf",
    family: "pib",
    label: "Deuda pública %PIB · IMF GGXWDG_NGDP",
    shortLabel: "Deuda",
    unit: "%",
    decimals: 1,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGXWDG_NGDP",
    frequency: "annual",
    description:
      "Stock deuda Maastricht %PIB. ~40% de la deuda pública española está en manos de inversores extranjeros — driver clave de cartera.",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGXWDG_NGDP",
    parser: "imf-country",
    imfIndicator: "GGXWDG_NGDP",
    threshold: { amber: 100, red: 120, goodAbove: false },
    accent: "#0F766E",
  },

  // ─── Familia PIB · PIB per cápita (atractivo inversor) ───────────────
  {
    id: "fc-pib-percapita",
    family: "pib",
    label: "PIB per cápita USD · IMF NGDPDPC",
    shortLabel: "PIB pc",
    unit: " USD",
    decimals: 0,
    source: "IMF DataMapper · WEO",
    sourceCode: "NGDPDPC",
    frequency: "annual",
    description:
      "PIB per cápita en USD corrientes. Proxy de tamaño/renta del mercado destino, factor de atractivo para IED.",
    endpoint: "/api/imf/country?iso=ESP&indicator=NGDPDPC",
    parser: "imf-country",
    imfIndicator: "NGDPDPC",
    accent: "#7c3aed",
  },

  // ─── Familia PIB · saldo fiscal (estabilidad para inversores) ────────
  {
    id: "fc-saldo-imf",
    family: "pib",
    label: "Saldo fiscal %PIB · IMF GGXCNL_NGDP",
    shortLabel: "Saldo fiscal",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGXCNL_NGDP",
    frequency: "annual",
    description:
      "Saldo fiscal total. Componente clave del riesgo soberano que perciben inversores de cartera (tenencia extranjera de bonos).",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGXCNL_NGDP",
    parser: "imf-country",
    imfIndicator: "GGXCNL_NGDP",
    threshold: { amber: -3, red: -6, goodAbove: true },
    accent: "#f59e0b",
  },
  // Sprint L F6 · +3 indicadores Eurostat
  {
    id: "fc-iip-eurostat",
    family: "exterior",
    label: "Posición Inversión Internacional Neta · Eurostat bop_iip6_q",
    shortLabel: "IIP neta",
    unit: "%",
    decimals: 1,
    source: "Eurostat · bop_iip6_q",
    sourceCode: "bop_iip6_q:NIIP",
    frequency: "quarterly",
    description:
      "Posición de Inversión Internacional Neta sobre PIB. Stock acumulado activos exteriores - pasivos. España estructuralmente -70/-80% PIB (deudor neto), métrica de vulnerabilidad financiera externa.",
    endpoint: "/api/eurostat/dataset?code=bop_iip6_q&filters=geo=ES;sector=S1;stk_flow=NIIP;bop_item=FA;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: -50, red: -80, goodAbove: true },
    accent: "#8b5cf6",
  },
  {
    id: "fc-tipos-largo-eurostat",
    family: "forecast",
    label: "Yield 10Y bono soberano · Eurostat irt_lt_mcby_m",
    shortLabel: "10Y yield",
    unit: "%",
    decimals: 2,
    source: "Eurostat · irt_lt_mcby_m",
    sourceCode: "irt_lt_mcby_m",
    frequency: "monthly",
    description:
      "Yield a 10 años del bono soberano español (Maastricht criteria). Coste de financiación exterior. Subidas indican deterioro de percepción de riesgo país por inversores externos.",
    endpoint: "/api/eurostat/dataset?code=irt_lt_mcby_m&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 3.5, red: 5, goodAbove: false },
    accent: "#dc2626",
  },
  {
    id: "fc-bop-cuenta-financiera-eurostat",
    family: "exterior",
    label: "Cuenta financiera %PIB · Eurostat bop_c6_q",
    shortLabel: "Cta financ.",
    unit: "%",
    decimals: 2,
    source: "Eurostat · bop_c6_q",
    sourceCode: "bop_c6_q:FA",
    frequency: "quarterly",
    description:
      "Saldo cuenta financiera Balanza de Pagos %PIB. Flujos netos entrada/salida de capital (IED + cartera + otros).",
    endpoint: "/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;sector10=S1;bop_item=FA;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#0EA5E9",
  },
];

export const FLUJOS_CAPITAL_META = {
  slug: "flujos-capital",
  label: "Flujos de capital",
  shortLabel: "Capital",
  accent: "#7c3aed",
  description:
    "Entrada y salida de capital · IED · cartera · posición de inversión internacional · deuda externa · dependencia y vulnerabilidad financiera exterior.",
};
