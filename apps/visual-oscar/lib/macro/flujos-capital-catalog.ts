/**
 * Catálogo · subtab "Flujos de capital" v4 (Sprint N6.2 + N17).
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
 * Sprint N17 · methodology + release + confidence + related ids.
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
    methodologyNote:
      "NIIP = Net International Investment Position. Stock acumulado activos extranjeros menos pasivos. Si crece negativamente = país endeudándose con exterior. España: -75% PIB (mejor que Grecia -150%, peor que Alemania +75%).",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["fc-cuenta-financiera", "fc-portfolio-net", "cuenta-corriente"],
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
    methodologyNote:
      "FA = Financial Account. Por identidad contable, debe ser ~espejo de cuenta corriente (CA + KA = FA). Diferencias residuales = errores u omisiones (E&O). Lectura ES post-2013: superávit CC → exporta capital neto.",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["fc-iip-neta", "cuenta-corriente"],
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
    methodologyNote:
      "LE = Liabilities (entrante desde perspectiva ES). Incluye reinversión beneficios (no caja real). Para greenfield real ver Datainvex Ministerio Comercio. Concentrado: financiero + energía + auto + hospitality.",
    releaseSchedule: "Trimestral · T+100 días",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["fc-ied-outbound", "fc-cuenta-financiera"],
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
    methodologyNote:
      "Outbound desde perspectiva ES. Concentrado pocos players: Santander + BBVA (LatAm), Iberdrola (UK/US/MX), Telefónica (LatAm), ACS/Ferrovial (infraestructura global). Sensible a ciclo destino.",
    releaseSchedule: "Trimestral · T+100 días",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["fc-ied-inbound"],
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
    methodologyNote:
      "PI = Portfolio Investment. Capital fugaz (vs IED estable). Sensible a yield differential ES-DE. Salidas brutas en momentos stress (2010-12, mini-2018 Italia) son lead indicator de presión spread.",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["fc-cuenta-financiera", "rs-yield-10y-es"],
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
    methodologyNote:
      "OI = Other Investment. Captura préstamos interbancarios + depósitos + repos + créditos comerciales. Componente que más sangró ES en 2010-12 (TARGET2 imbalance -440 bn€ pico). Hoy ~estable.",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["fc-portfolio-net", "fc-bis-claims"],
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
    methodologyNote:
      "LBS = Locational Banking Statistics BIS. Captura claims de bancos extranjeros (countries reporting BIS) sobre residentes ES. Refleja dependencia financiación mayorista cross-border. Reportado en USD nominales.",
    releaseSchedule: "Trimestral · BIS publica T+90 días",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["fc-other-investment", "rs-npl-banca"],
  },

  // Sprint N13.1 cleanup · fc-reer-broad removido · vive en mercados-activos.

  // ─── Sprint N13.2 · Tipo cambio efectivo nominal NEER + Remesas ──────
  {
    id: "fc-neer",
    family: "exterior",
    label: "Tipo cambio efectivo nominal (NEER)",
    shortLabel: "NEER",
    unit: "",
    decimals: 1,
    source: "Eurostat · ert_eff_ic_m",
    sourceCode: "ert_eff_ic_m:ES",
    frequency: "monthly",
    description:
      "Tipo cambio efectivo nominal (sin deflactar). Complemento al REER · captura solo movimiento divisas, no inflación diferencial. Útil para ver apreciación pura euro.",
    endpoint: "/api/eurostat/dataset?code=ert_eff_ic_m&filters=geo=ES",
    parser: "eurostat-simple",
    accent: "#0891b2",
    methodologyNote:
      "NEER = Nominal Effective Exchange Rate. Diferencia con REER (real) es el deflactor IPC. NEER aísla el movimiento divisas — útil para BCE estance. Base 2010=100.",
    releaseSchedule: "Mensual · T+30 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ma-reer-bis", "ma-eurusd"],
  },
  {
    id: "fc-remesas",
    family: "exterior",
    label: "Remesas emigrantes neto %PIB",
    shortLabel: "Remesas",
    unit: "%",
    decimals: 2,
    source: "Eurostat · bop_rem6",
    sourceCode: "bop_rem6:ES",
    frequency: "annual",
    description:
      "Saldo neto remesas (envíos por trabajadores extranjeros en ES vs recibidos de emigrantes ES). ES estructuralmente saldo negativo · ~1% PIB de salida bruta hacia LatAm, Marruecos, Europa Este.",
    endpoint: "/api/eurostat/dataset?code=bop_rem6&filters=geo=ES",
    parser: "eurostat-simple",
    accent: "#dc2626",
    methodologyNote:
      "BoP item D721 'Personal transfers'. ES emisor neto ~1% PIB. Receptor histórico: LatAm + Marruecos. Sensibilidad a ciclo empleo extranjeros en ES.",
    releaseSchedule: "Anual · publicación T+12 meses",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["fc-cuenta-financiera"],
  },
  {
    id: "fc-rentas-primarias",
    family: "exterior",
    label: "Rentas primarias %PIB",
    shortLabel: "Rentas prim.",
    unit: "%",
    decimals: 2,
    source: "Eurostat · bop_c6_q",
    sourceCode: "bop_c6_q:IN:ES",
    frequency: "quarterly",
    description:
      "Rentas primarias BoP (dividendos + intereses + salarios). Componente CC clave: refleja repatriación beneficios multinacionales y carga financiera deuda externa.",
    endpoint: "/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;sector10=S1;bop_item=IN;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#7c3aed",
    methodologyNote:
      "IN = Primary Income (dividendos + intereses + remuneración trabajo cross-border). Saldo ES tradicionalmente negativo (paga más intereses al exterior que recibe). Mejora con desapalancamiento externo post-2013.",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["cuenta-corriente", "fc-ied-outbound"],
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
    methodologyNote:
      "NID = Total Investment (FBCF + cambios inventarios). Identidad clásica: S - I = CA. Si S > I, el país exporta capital (CA positiva); si S < I, importa capital.",
    releaseSchedule: "Anual · WEO abril+octubre",
    confidenceLevel: "high",
    relatedIndicatorIds: ["inversion-fbcf-yoy", "cuenta-corriente"],
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
