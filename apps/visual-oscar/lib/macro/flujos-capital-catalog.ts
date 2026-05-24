/**
 * Catálogo · subtab "Flujos de capital" v4 (Sprint N6.2).
 *
 * REFUNDACIÓN. La versión anterior tenía PIB pc, saldo fiscal y deuda
 * (todos solapan con margen-fiscal). Esta versión se centra en LA BALANZA
 * DE PAGOS POR COMPONENTE: IED inbound/outbound, portfolio investment,
 * other investment (banca cross-border), reservas.
 *
 * Foco BoP: ¿qué tipo de capital fluye, en qué dirección, con qué
 * estabilidad (IED long-term vs portfolio hot money)?
 *
 * Sin solape con dependencias-externas (comercio) ni margen-fiscal (deuda).
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const FLUJOS_CAPITAL_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Stock IIP neta · vulnerabilidad acumulada ────────────────────────
  {
    id: "fc-iip-neta",
    family: "exterior",
    label: "Posición Inversión Internacional Neta %PIB",
    shortLabel: "IIP neta",
    unit: "%",
    decimals: 1,
    source: "Eurostat · bop_iip6_q",
    sourceCode: "bop_iip6_q:NIIP:ES",
    frequency: "quarterly",
    description:
      "Stock acumulado activos exteriores - pasivos. España -70/-80% PIB (deudor neto estructural). Vulnerabilidad estructural de la balanza.",
    endpoint: "/api/eurostat/dataset?code=bop_iip6_q&filters=geo=ES;sector=S1;stk_flow=NIIP;bop_item=FA;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: -50, red: -80, goodAbove: true },
    accent: "#8b5cf6",
  },

  // ─── Cuenta financiera total %PIB ────────────────────────────────────
  {
    id: "fc-cuenta-financiera",
    family: "exterior",
    label: "Cuenta financiera %PIB",
    shortLabel: "Cta financ.",
    unit: "%",
    decimals: 2,
    source: "Eurostat · bop_c6_q",
    sourceCode: "bop_c6_q:FA:ES",
    frequency: "quarterly",
    description:
      "Saldo cuenta financiera BoP %PIB. Flujos netos entrada/salida (IED+cartera+otros). Positivo=España exporta capital · negativo=importa capital.",
    endpoint: "/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;sector10=S1;bop_item=FA;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#0EA5E9",
  },

  // ─── IED entrante (Foreign Direct Investment inbound) ────────────────
  {
    id: "fc-ied-inbound",
    family: "exterior",
    label: "IED entrante neta %PIB",
    shortLabel: "IED in",
    unit: "%",
    decimals: 2,
    source: "Eurostat · bop_fdi6_q",
    sourceCode: "bop_fdi6_q:FDI:LE:ES",
    frequency: "quarterly",
    description:
      "Inversión Extranjera Directa entrante: nuevos proyectos + ampliaciones de capital + reinversión beneficios por no-residentes. Capital long-term, estable. Driver clave de empleo y transferencia tecnológica.",
    endpoint: "/api/eurostat/dataset?code=bop_fdi6_q&filters=geo=ES;bop_item=FDI;stk_flow=LE;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 1, red: 0, goodAbove: true },
    accent: "#0F766E",
  },

  // ─── IED saliente (Foreign Direct Investment outbound) ───────────────
  {
    id: "fc-ied-outbound",
    family: "exterior",
    label: "IED saliente neta %PIB",
    shortLabel: "IED out",
    unit: "%",
    decimals: 2,
    source: "Eurostat · bop_fdi6_q",
    sourceCode: "bop_fdi6_q:FDI:LIAB:ES",
    frequency: "quarterly",
    description:
      "Inversión Extranjera Directa que sale: multinacionales españolas (Iberdrola, Santander, Telefónica) invierten en el extranjero. >IED in = España exporta capital productivo.",
    endpoint: "/api/eurostat/dataset?code=bop_fdi6_q&filters=geo=ES;bop_item=FDI;stk_flow=LIAB;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#f59e0b",
  },

  // ─── Portfolio investment (acciones + deuda) ─────────────────────────
  {
    id: "fc-portfolio-net",
    family: "exterior",
    label: "Portfolio investment neto %PIB",
    shortLabel: "Portfolio",
    unit: "%",
    decimals: 2,
    source: "Eurostat · bop_c6_q",
    sourceCode: "bop_c6_q:PI:ES",
    frequency: "quarterly",
    description:
      "Inversión de cartera (bonos + acciones cotizadas). Hot money: muy sensible a yields y prima riesgo. Negativo = salida de capital extranjero de cartera (presión sobre yields).",
    endpoint: "/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;sector10=S1;bop_item=PI;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#dc2626",
  },

  // ─── Other investment (banca cross-border, TARGET2 proxy) ────────────
  {
    id: "fc-other-investment",
    family: "exterior",
    label: "Other investment %PIB (banca cross-border)",
    shortLabel: "Otros",
    unit: "%",
    decimals: 2,
    source: "Eurostat · bop_c6_q",
    sourceCode: "bop_c6_q:OI:ES",
    frequency: "quarterly",
    description:
      "Otras inversiones: préstamos bancarios cross-border, depósitos no-residentes, créditos comerciales. Componente más volátil de la BoP. Caídas señalan fragmentación financiera intra-eurozona (TARGET2 stress).",
    endpoint: "/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;sector10=S1;bop_item=OI;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#7c3aed",
  },

  // ─── BIS cross-border claims · banca internacional sobre España ──────
  {
    id: "fc-bis-claims",
    family: "exterior",
    label: "Pasivos bancarios cross-border (BIS)",
    shortLabel: "BIS LBS",
    unit: "USD bn",
    decimals: 0,
    source: "BIS Locational Banking Statistics",
    sourceCode: "BIS_LBS_ES",
    frequency: "quarterly",
    description:
      "Reclamaciones de bancos extranjeros sobre España (deuda + préstamos). Indicador de la dependencia del sector bancario español de financiación mayorista internacional.",
    endpoint: "/api/bis/bis-exposures?country=ES",
    parser: "eurostat-simple",
    accent: "#0891b2",
  },

  // ─── REER · driver atractivo capital extranjero ──────────────────────
  {
    id: "fc-reer-broad",
    family: "exterior",
    label: "REER broad España",
    shortLabel: "REER",
    unit: "",
    decimals: 1,
    source: "BIS Effective Exchange Rates",
    sourceCode: "REER_BROAD:ES",
    frequency: "monthly",
    description:
      "Tipo de cambio real efectivo. >100 = apreciación real, abarata activos extranjeros para inversores ES. <100 = activos ES más atractivos para capital exterior.",
    endpoint: "/api/bis/fx-effective",
    parser: "eurostat-simple",
    parserKey: "broad",
    threshold: { amber: 105, red: 115, goodAbove: false },
    accent: "#0EA5E9",
  },

  // ─── Inversión bruta %PIB (IMF, contexto agregado) ───────────────────
  {
    id: "fc-inversion-bruta",
    family: "pib",
    label: "Inversión bruta %PIB",
    shortLabel: "FBCF",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "NID_NGDP",
    frequency: "annual",
    description:
      "FBCF total sobre PIB. Si la inversión doméstica cae, el ahorro nacional excede inversión y España tiende a exportar capital (cuenta corriente positiva).",
    endpoint: "/api/imf/country?iso=ESP&indicator=NID_NGDP",
    parser: "imf-country",
    imfIndicator: "NID_NGDP",
    accent: "#16a34a",
  },
];

export const FLUJOS_CAPITAL_META = {
  slug: "flujos-capital",
  label: "Flujos de capital",
  shortLabel: "Capital",
  accent: "#7c3aed",
  description:
    "Balanza de pagos por componente: IED inbound/outbound (capital estable), portfolio investment (hot money), other investment (banca cross-border / TARGET2 proxy), IIP neta acumulada, claims BIS, REER. Sin solape con margen-fiscal (deuda) ni dependencias-externas (comercio).",
};
