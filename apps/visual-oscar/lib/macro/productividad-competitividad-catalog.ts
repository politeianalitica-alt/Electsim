/**
 * Catálogo · subtab "Productividad & competitividad" v4 (Sprint N6.3).
 *
 * REFUNDACIÓN. La versión anterior tenía PIB pc, Inversión, Exports, Imports
 * (todos macro genéricos). Esta versión se centra en LOS DRIVERS REALES DE
 * PRODUCTIVIDAD: productividad por hora, costes laborales unitarios (ULC),
 * I+D, patentes, capital humano, complejidad exportadora.
 *
 * Sin solape con pulso-macro / mercados-activos / dependencias-externas.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const PRODUCTIVIDAD_COMPETITIVIDAD_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Productividad laboral por hora ────────────────────────────────────
  {
    id: "pc-productividad-hora",
    family: "oferta",
    label: "Productividad laboral por hora trabajada",
    shortLabel: "Prod/hora",
    unit: "",
    decimals: 1,
    source: "Eurostat · nama_10_lp_ulc",
    sourceCode: "nama_10_lp_ulc:RLPR_HW:ES",
    frequency: "annual",
    description:
      "PIB real por hora trabajada (índice, UE-27=100). España ~92% media UE. Métrica fundamental de eficiencia económica · driver del crecimiento sostenible.",
    endpoint: "/api/eurostat/dataset?code=nama_10_lp_ulc&filters=geo=ES;na_item=RLPR_HW;unit=I20",
    parser: "eurostat-simple",
    threshold: { amber: 100, red: 90, goodAbove: true },
    accent: "#0F766E",
  },

  // ─── Costes Laborales Unitarios (ULC) ──────────────────────────────────
  {
    id: "pc-ulc",
    family: "oferta",
    label: "Costes laborales unitarios (ULC)",
    shortLabel: "ULC YoY",
    unit: "%",
    decimals: 1,
    source: "Eurostat · nama_10_lp_ulc",
    sourceCode: "nama_10_lp_ulc:NULC_HW:ES",
    frequency: "annual",
    description:
      "Costes laborales por unidad producida (variación interanual). Si suben más rápido que peers UE = pérdida competitividad-coste. Crítico para exportadores.",
    endpoint: "/api/eurostat/dataset?code=nama_10_lp_ulc&filters=geo=ES;na_item=NULC_HW",
    parser: "eurostat-simple",
    threshold: { amber: 2, red: 4, goodAbove: false },
    accent: "#dc2626",
  },

  // ─── I+D total %PIB ────────────────────────────────────────────────────
  {
    id: "pc-id-pib-eurostat",
    family: "oferta",
    label: "Gasto I+D total %PIB",
    shortLabel: "I+D %PIB",
    unit: "%",
    decimals: 2,
    source: "Eurostat · rd_e_gerdtot",
    sourceCode: "rd_e_gerdtot:GERD:ES",
    frequency: "annual",
    description:
      "Gasto total en investigación y desarrollo (público + empresas + universidades) sobre PIB. España persiste ~1.4% vs media UE-27 ~2.3% — gap estructural de competitividad.",
    endpoint: "/api/eurostat/dataset?code=rd_e_gerdtot&filters=geo=ES;sectperf=TOTAL;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 2, red: 1.5, goodAbove: true },
    accent: "#0891b2",
  },

  // ─── I+D empresarial (BERD) ────────────────────────────────────────────
  {
    id: "pc-id-empresarial",
    family: "oferta",
    label: "I+D empresarial (BERD) %PIB",
    shortLabel: "BERD %PIB",
    unit: "%",
    decimals: 2,
    source: "Eurostat · rd_e_gerdtot",
    sourceCode: "rd_e_gerdtot:BES:ES",
    frequency: "annual",
    description:
      "Gasto I+D del sector empresarial (BES) sobre PIB. España ~0.8% vs UE ~1.5%. El gap esencial NO está en lo público sino en la baja I+D privada · refleja modelo productivo poco intensivo en tecnología.",
    endpoint: "/api/eurostat/dataset?code=rd_e_gerdtot&filters=geo=ES;sectperf=BES;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 1.2, red: 0.8, goodAbove: true },
    accent: "#7c3aed",
  },

  // ─── Patentes EPO per cápita ───────────────────────────────────────────
  {
    id: "pc-patentes-epo-eurostat",
    family: "oferta",
    label: "Patentes EPO per cápita",
    shortLabel: "Patentes/Mhab",
    unit: "/M hab",
    decimals: 1,
    source: "Eurostat · pat_ep_ntot",
    sourceCode: "pat_ep_ntot:ES",
    frequency: "annual",
    description:
      "Solicitudes anuales de patente ante la Oficina Europea de Patentes por millón de habitantes. Output directo de innovación. España ~30 vs Alemania ~250 vs Suecia ~400.",
    endpoint: "/api/eurostat/dataset?code=pat_ep_ntot&filters=geo=ES;unit=P_MHAB",
    parser: "eurostat-simple",
    threshold: { amber: 40, red: 25, goodAbove: true },
    accent: "#16a34a",
  },

  // ─── Capital humano · tertiary attainment ──────────────────────────────
  {
    id: "pc-educacion-terciaria",
    family: "oferta",
    label: "Educación terciaria 25-34",
    shortLabel: "Terciaria",
    unit: "%",
    decimals: 1,
    source: "Eurostat · edat_lfse_03",
    sourceCode: "edat_lfse_03:ED5-8:ES",
    frequency: "annual",
    description:
      "% personas 25-34 con educación terciaria (universidad o equivalente). España ~50% vs UE 43%. Indicador de stock de capital humano joven.",
    endpoint: "/api/eurostat/dataset?code=edat_lfse_03&filters=geo=ES;sex=T;age=Y25-34;isced11=ED5-8",
    parser: "eurostat-simple",
    threshold: { amber: 45, red: 40, goodAbove: true },
    accent: "#0EA5E9",
  },

  // ─── Empleo intensivo en conocimiento (KIA) ────────────────────────────
  {
    id: "pc-empleo-knowledge",
    family: "empleo",
    label: "Empleo en sectores intensivos conocimiento (KIA)",
    shortLabel: "KIA empleo",
    unit: "%",
    decimals: 1,
    source: "Eurostat · htec_emp_nat2",
    sourceCode: "htec_emp_nat2:KIA:ES",
    frequency: "annual",
    description:
      "% empleo en Knowledge-Intensive Activities (alta tecnología + servicios intensivos en conocimiento). España ~30% vs UE 36%. Refleja estructura productiva.",
    endpoint: "/api/eurostat/dataset?code=htec_emp_nat2&filters=geo=ES;nace_r2=KIA;unit=PC_EMP",
    parser: "eurostat-simple",
    threshold: { amber: 32, red: 28, goodAbove: true },
    accent: "#8b5cf6",
  },

  // ─── REER ancla competitividad-precio ─────────────────────────────────
  {
    id: "pc-reer-bis",
    family: "exterior",
    label: "REER broad España · BIS",
    shortLabel: "REER",
    unit: "",
    decimals: 1,
    source: "BIS Effective Exchange Rates",
    sourceCode: "REER_BROAD:ES",
    frequency: "monthly",
    description:
      "Tipo de cambio real efectivo broad. >100 = apreciación real (pérdida competitividad-precio); <100 = depreciación. Ancla del análisis competitivo precio.",
    endpoint: "/api/bis/fx-effective",
    parser: "eurostat-simple",
    parserKey: "broad",
    threshold: { amber: 105, red: 115, goodAbove: false },
    accent: "#0891b2",
  },
];

export const PRODUCTIVIDAD_COMPETITIVIDAD_META = {
  slug: "productividad-competitividad",
  label: "Productividad & competitividad",
  shortLabel: "Productividad",
  accent: "#0F766E",
  description:
    "Drivers estructurales de competitividad: productividad por hora, ULC (costes laborales unitarios), I+D total y empresarial (BERD), patentes EPO, educación terciaria, empleo KIA, REER. Sin solape con pulso-macro / mercados-activos / dependencias-externas.",
};
