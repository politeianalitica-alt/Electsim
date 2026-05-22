/**
 * Catálogo de indicadores · subtab "Productividad & competitividad" v3.
 *
 * Foco: ¿España gana capacidad económica estructural o sólo crece por
 * ciclo? Productividad laboral, costes, inversión, comercio sofisticado
 * y capital humano.
 *
 * Indicadores con serie temporal. Patentes OEPM e índice ECI quedan para
 * fases futuras (requieren endpoints específicos).
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const PRODUCTIVIDAD_COMPETITIVIDAD_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Familia PIB · PIB per cápita (proxy productividad) ──────────────
  {
    id: "pc-pib-percapita",
    family: "pib",
    label: "PIB per cápita USD · IMF NGDPDPC",
    shortLabel: "PIB pc",
    unit: " USD",
    decimals: 0,
    source: "IMF DataMapper · WEO",
    sourceCode: "NGDPDPC",
    frequency: "annual",
    description:
      "PIB per cápita en dólares corrientes. Proxy macro de productividad agregada y nivel de renta. Comparable internacionalmente.",
    endpoint: "/api/imf/country?iso=ESP&indicator=NGDPDPC",
    parser: "imf-country",
    imfIndicator: "NGDPDPC",
    accent: "#0F766E",
  },

  // ─── Familia PIB · inversión bruta (capital deepening) ───────────────
  {
    id: "pc-inversion-bruta",
    family: "demanda",
    label: "Inversión bruta %PIB · IMF NID_NGDP",
    shortLabel: "Inversión",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "NID_NGDP",
    frequency: "annual",
    description:
      "Formación bruta de capital sobre PIB. Driver del aumento de productividad vía capital deepening (más capital por trabajador).",
    endpoint: "/api/imf/country?iso=ESP&indicator=NID_NGDP",
    parser: "imf-country",
    imfIndicator: "NID_NGDP",
    accent: "#f97316",
  },

  // ─── Familia Exterior · exportaciones reales (competitividad) ────────
  {
    id: "pc-exports-growth",
    family: "exterior",
    label: "Crecimiento exportaciones · IMF TX_RPCH",
    shortLabel: "Exports",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "TX_RPCH",
    frequency: "annual",
    description:
      "Variación anual del volumen de exportaciones. Indicador de competitividad exterior y ganancia de cuota.",
    endpoint: "/api/imf/country?iso=ESP&indicator=TX_RPCH",
    parser: "imf-country",
    imfIndicator: "TX_RPCH",
    accent: "#0891b2",
  },
  {
    id: "pc-imports-growth",
    family: "exterior",
    label: "Crecimiento importaciones · IMF TM_RPCH",
    shortLabel: "Imports",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "TM_RPCH",
    frequency: "annual",
    description:
      "Variación volumen importaciones. Cruzado con exports da una lectura de ganancia/pérdida de capacidad exportadora neta.",
    endpoint: "/api/imf/country?iso=ESP&indicator=TM_RPCH",
    parser: "imf-country",
    imfIndicator: "TM_RPCH",
    accent: "#f97316",
  },

  // ─── Familia Exterior · REER (competitividad-precio) ─────────────────
  {
    id: "pc-reer-bis",
    family: "exterior",
    label: "REER broad · BIS",
    shortLabel: "REER",
    unit: "",
    decimals: 1,
    source: "BIS Effective Exchange Rates",
    sourceCode: "REER_BROAD",
    frequency: "monthly",
    description:
      "Índice REER broad. Una apreciación real (>100) erosiona competitividad-precio frente a peers; depreciación la mejora.",
    endpoint: "/api/bis/fx-effective",
    parser: "eurostat-simple",
    parserKey: "broad",
    accent: "#0891b2",
  },

  // ─── Familia Empleo · ETCL coste laboral ─────────────────────────────
  {
    id: "pc-etcl-coste-laboral",
    family: "empleo",
    label: "Coste laboral medio · INE ETCL",
    shortLabel: "Coste laboral",
    unit: "€/mes",
    decimals: 0,
    source: "INE WSTempus · ETCL",
    sourceCode: "ETCL",
    frequency: "quarterly",
    description:
      "Coste laboral medio por trabajador y mes. Incluye salarios + cotizaciones. Mide presión salarial vs productividad.",
    endpoint: "/api/ine/etcl?n=24",
    parser: "ine-ipc",
    parserKey: "total",
    accent: "#7c3aed",
  },
  // Sprint L F6 · +2 indicadores Eurostat
  {
    id: "pc-id-pib-eurostat",
    family: "oferta",
    label: "Gasto I+D total %PIB · Eurostat rd_e_gerdtot",
    shortLabel: "I+D %PIB",
    unit: "%",
    decimals: 2,
    source: "Eurostat · rd_e_gerdtot",
    sourceCode: "rd_e_gerdtot:GERD",
    frequency: "annual",
    description:
      "Gasto total en investigación y desarrollo (público + empresas + universidades) sobre PIB. España persiste ~1.4% vs media UE-27 ~2.3% — gap estructural de competitividad.",
    endpoint: "/api/eurostat/dataset?code=rd_e_gerdtot&filters=geo=ES;sectperf=TOTAL;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 2, red: 1.5, goodAbove: true },
    accent: "#0891b2",
  },
  {
    id: "pc-patentes-epo-eurostat",
    family: "oferta",
    label: "Patentes EPO per cápita · Eurostat pat_ep_ntot",
    shortLabel: "Patentes",
    unit: "/M hab",
    decimals: 1,
    source: "Eurostat · pat_ep_ntot",
    sourceCode: "pat_ep_ntot",
    frequency: "annual",
    description:
      "Solicitudes anuales de patente ante la Oficina Europea de Patentes por millón de habitantes. Output directo de innovación. España ~30 vs Alemania ~250.",
    endpoint: "/api/eurostat/dataset?code=pat_ep_ntot&filters=geo=ES;unit=P_MHAB",
    parser: "eurostat-simple",
    accent: "#7c3aed",
  },
];

export const PRODUCTIVIDAD_COMPETITIVIDAD_META = {
  slug: "productividad-competitividad",
  label: "Productividad & competitividad",
  shortLabel: "Productividad",
  accent: "#0F766E",
  description:
    "Capacidad económica estructural · productividad laboral · costes · inversión · I+D · complejidad exportadora · territorio y empresas tractoras.",
};
