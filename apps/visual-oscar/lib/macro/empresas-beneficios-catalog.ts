/**
 * Catálogo de indicadores · subtab "Empresas & beneficios" v3.
 *
 * Foco: ¿cómo se traslada la coyuntura macro al tejido empresarial?
 * Beneficios, márgenes, inversión, creación/destrucción, sectores.
 *
 * Para v3 v1 uso indicadores macro que afectan el entorno empresarial:
 * crecimiento (demanda), inflación (poder fijación precios), salarios
 * (presión costes), inversión bruta. Indicadores DIRCE y Registro
 * Mercantil específicos quedan para integraciones futuras.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const EMPRESAS_BENEFICIOS_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Familia PIB · entorno de demanda ─────────────────────────────────
  {
    id: "eb-pib-imf",
    family: "pib",
    label: "PIB real · IMF NGDP_RPCH",
    shortLabel: "PIB",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "NGDP_RPCH",
    frequency: "annual",
    description:
      "Crecimiento PIB real. Driver más directo de ventas agregadas y beneficios empresariales. Mercados de equity cíclicos lo siguen.",
    endpoint: "/api/imf/country?iso=ESP&indicator=NGDP_RPCH",
    parser: "imf-country",
    imfIndicator: "NGDP_RPCH",
    accent: "#0F766E",
  },

  // ─── Familia Precios · poder de fijación de precios ──────────────────
  {
    id: "eb-ipc-anual",
    family: "precios",
    label: "IPC anual · INE 290750",
    shortLabel: "IPC YoY",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · IPC",
    sourceCode: "IPC290750",
    frequency: "monthly",
    description:
      "Inflación general. Si las empresas pueden trasladar costes a precios mantienen márgenes; si no, los márgenes se comprimen.",
    endpoint: "/api/ine/ipc?n=36",
    parser: "ine-ipc",
    parserKey: "anual",
    threshold: { amber: 2, red: 4, goodAbove: false },
    accent: "#dc2626",
  },

  // ─── Familia Empleo · presión costes laborales ───────────────────────
  {
    id: "eb-etcl-coste-laboral",
    family: "empleo",
    label: "Coste laboral medio · INE ETCL",
    shortLabel: "Coste laboral",
    unit: "€/mes",
    decimals: 0,
    source: "INE WSTempus · ETCL",
    sourceCode: "ETCL",
    frequency: "quarterly",
    description:
      "Coste laboral medio por trabajador y mes (salarios + cotizaciones). Driver principal de presión sobre márgenes empresariales.",
    endpoint: "/api/ine/etcl?n=24",
    parser: "ine-ipc",
    parserKey: "total",
    accent: "#f59e0b",
  },

  // ─── Familia Demanda · inversión empresarial ─────────────────────────
  {
    id: "eb-inversion-bruta",
    family: "demanda",
    label: "Inversión bruta %PIB · IMF NID_NGDP",
    shortLabel: "Inversión",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "NID_NGDP",
    frequency: "annual",
    description:
      "Formación bruta de capital sobre PIB. Proxy de capacidad inversora empresarial agregada (incluye FBCF privado y público).",
    endpoint: "/api/imf/country?iso=ESP&indicator=NID_NGDP",
    parser: "imf-country",
    imfIndicator: "NID_NGDP",
    accent: "#f97316",
  },

  // ─── Familia Empleo · paro (proxy demanda interna) ───────────────────
  {
    id: "eb-paro-imf",
    family: "empleo",
    label: "Tasa paro · IMF LUR",
    shortLabel: "Paro",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "LUR",
    frequency: "annual",
    description:
      "Tasa de paro. Afecta consumo interno y por tanto ventas en sectores B2C (retail, turismo, restauración, banca minorista).",
    endpoint: "/api/imf/country?iso=ESP&indicator=LUR",
    parser: "imf-country",
    imfIndicator: "LUR",
    threshold: { amber: 12, red: 18, goodAbove: false },
    accent: "#f59e0b",
  },

  // ─── Familia Exterior · exportaciones (ingresos empresariales) ───────
  {
    id: "eb-exports-growth",
    family: "exterior",
    label: "Crecimiento exportaciones · IMF TX_RPCH",
    shortLabel: "Exports",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "TX_RPCH",
    frequency: "annual",
    description:
      "Variación volumen exportaciones. Ingresos extra para empresas exportadoras (Inditex, Acerinox, automoción, alimentación).",
    endpoint: "/api/imf/country?iso=ESP&indicator=TX_RPCH",
    parser: "imf-country",
    imfIndicator: "TX_RPCH",
    accent: "#0891b2",
  },
  // Sprint L F6 · +2 indicadores Eurostat
  {
    id: "eb-confianza-empresarial-eurostat",
    family: "sentimiento",
    label: "Confianza industrial · Eurostat ei_bsin_m",
    shortLabel: "Conf. ind.",
    unit: "",
    decimals: 1,
    source: "Eurostat · ei_bsin_m",
    sourceCode: "ei_bsin_m",
    frequency: "monthly",
    description:
      "Indicador de confianza empresarial industrial (balance opiniones, mensual). Lead indicator de inversión, producción y empleo en manufactura.",
    endpoint: "/api/eurostat/dataset?code=ei_bsin_m&filters=geo=ES;indic=BS-ICI;s_adj=SA;nace_r2=C",
    parser: "eurostat-simple",
    accent: "#7c3aed",
  },
  {
    id: "eb-demografia-empresas-eurostat",
    family: "demanda",
    label: "Demografía empresarial · Eurostat bd_size_r3",
    shortLabel: "Empresas",
    unit: "",
    decimals: 0,
    source: "Eurostat · bd_size_r3",
    sourceCode: "bd_size_r3:V11910",
    frequency: "annual",
    description:
      "Número total de empresas activas (NACE B-N). Stock comparable UE, mide la profundidad del tejido empresarial.",
    endpoint: "/api/eurostat/dataset?code=bd_size_r3&filters=geo=ES;indic_sb=V11910;nace_r2=B-N",
    parser: "eurostat-simple",
    accent: "#16a34a",
  },
];

export const EMPRESAS_BENEFICIOS_META = {
  slug: "empresas-beneficios",
  label: "Empresas & beneficios",
  shortLabel: "Empresas",
  accent: "#7c3aed",
  description:
    "Tejido empresarial · beneficios · márgenes · creación/destrucción · cotizadas · sectores · contratación pública · innovación · IED.",
};
