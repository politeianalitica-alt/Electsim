/**
 * Catálogo · subtab "Productividad & competitividad" v4 (Sprint N6.3 + N17).
 *
 * REFUNDACIÓN. La versión anterior tenía PIB pc, Inversión, Exports, Imports
 * (todos macro genéricos). Esta versión se centra en LOS DRIVERS REALES DE
 * PRODUCTIVIDAD: productividad por hora, costes laborales unitarios (ULC),
 * I+D, patentes, capital humano, complejidad exportadora.
 *
 * Sin solape con pulso-macro / mercados-activos / dependencias-externas.
 * Sprint N17 · methodology + release + confidence + related ids.
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
    methodologyNote:
      "RLPR_HW = real labour productivity per hour worked. Índice base UE-27=100. España 92% — gap explicado por composición sectorial (más servicios baja productividad), tamaño pyme + baja I+D privada.",
    releaseSchedule: "Anual · publicación T+10-12 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pc-ulc", "pc-id-empresarial", "pc-stem-graduates"],
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
    methodologyNote:
      "NULC_HW = Nominal Unit Labour Costs per hour. Cociente compensación trabajador / productividad. Devaluación interna 2010-13 logró bajar ULC ES ~10% vs UE — pieza clave del rebound exportador.",
    releaseSchedule: "Anual · T+10-12 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pc-productividad-hora", "ma-reer-bis", "hev-etcl-coste-laboral"],
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
    methodologyNote:
      "GERD = Gross Expenditure on R&D. Pacto Lisboa 2000 target 3% (no cumplido ningún año). Gap ES vs UE explicado por baja BERD (sector privado).",
    releaseSchedule: "Anual · publicación T+24 meses (datos 2023 → diciembre 2024)",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pc-id-empresarial", "pc-patentes-epo-eurostat"],
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
    methodologyNote:
      "BES = Business Enterprise Sector. España estructuralmente baja: poca pharma + electronics + aerospace. Concentrado en Madrid + Cataluña + Euskadi. Bonus fiscal I+D infrautilizado por PYMES.",
    releaseSchedule: "Anual · T+24 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pc-id-pib-eurostat", "pc-patentes-epo-eurostat", "de-htec-trade"],
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
    methodologyNote:
      "EPO Office European Patent. Solicitudes (no concesiones). Per cápita normalizado. España ~30/Mhab — gap brutal con líderes EU (CH 1100, SE 400, DE 250). Refleja BERD baja + escala empresarial.",
    releaseSchedule: "Anual · T+18 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pc-id-empresarial", "pc-stem-graduates", "de-htec-trade"],
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
    methodologyNote:
      "ISCED 5-8 (terciaria corta + universitaria + máster + doctorado). Paradoja ES: buen stock terciaria pero baja productividad — gap por mismatch educación-mercado (sobre-cualificación) + baja BERD.",
    releaseSchedule: "Anual · LFS · T+6 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pc-stem-graduates", "pc-empleo-knowledge"],
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
    sourceCode: "htec_emp_nat2:KIS:ES",
    frequency: "annual",
    description:
      "% empleo en Knowledge-Intensive Services (servicios intensivos en conocimiento). España ~38% vs UE 36%. Refleja estructura productiva orientada a servicios cualificados.",
    endpoint: "/api/eurostat/dataset?code=htec_emp_nat2&filters=geo=ES;nace_r2=KIS;unit=PC_EMP;sex=T",
    parser: "eurostat-simple",
    threshold: { amber: 32, red: 28, goodAbove: true },
    accent: "#8b5cf6",
    methodologyNote:
      "KIS = Knowledge-Intensive Services (Eurostat definition: NACE H50-53+J58-63+K64-66+M+P+Q+R). Captura empleo en sectores de alto valor añadido. Sprint W.3.1c: cambio KIA → KIS (Eurostat no expone KIA agregado, KIS es el más cercano · datos verificados ~38% ES).",
    releaseSchedule: "Anual · T+12 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pc-educacion-terciaria", "pc-stem-graduates"],
  },

  // Sprint N13.1 cleanup · pc-reer-bis removido · vive en mercados-activos.

  // ─── Sprint N13.2 · Drivers estructurales adicionales productividad ──
  {
    id: "pc-vab-nace-manuf",
    family: "oferta",
    label: "VAB manufacturas %PIB",
    shortLabel: "VAB manuf",
    unit: "%",
    decimals: 1,
    source: "Eurostat · nama_10_a10",
    sourceCode: "nama_10_a10:C:ES",
    frequency: "annual",
    description:
      "Valor añadido bruto sector manufacturas sobre PIB. España ~11% vs UE 15% y DEU 19%. Indicador de profundidad industrial · clave para competitividad estructural.",
    endpoint: "/api/eurostat/dataset?code=nama_10_a10&filters=geo=ES;nace_r2=C",
    parser: "eurostat-simple",
    threshold: { amber: 12, red: 10, goodAbove: true },
    accent: "#0F766E",
    methodologyNote:
      "NACE C = Manufacturing. Caída secular: 17% (1990) → 11% (2024). Causas: deslocalización + cambio modelo productivo hacia servicios. Estrategia 're-industrialización' UE: target 20% PIB para 2030.",
    releaseSchedule: "Anual · T+12 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pulso-ipi-manufactura", "pc-id-empresarial"],
  },
  {
    id: "pc-stem-graduates",
    family: "oferta",
    label: "Graduados STEM por 1000 hab. 20-29",
    shortLabel: "STEM grads",
    unit: "/1000",
    decimals: 1,
    source: "Eurostat · educ_uoe_grad04",
    sourceCode: "educ_uoe_grad04:STEM:ES",
    frequency: "annual",
    description:
      "Graduados STEM (ciencias, tecnología, ingeniería, matemáticas) por 1000 habitantes 20-29 años. Pipeline talento técnico · driver capacidad innovadora.",
    endpoint: "/api/eurostat/dataset?code=educ_uoe_grad04&filters=geo=ES",
    parser: "eurostat-simple",
    accent: "#0EA5E9",
    methodologyNote:
      "ISCED 5-8 + áreas STEM. España ~22/1000 vs UE 24, líderes Finlandia 35 + Irlanda 30. Pipeline correcto pero brain drain (emigración post-grado a UK/DE/US).",
    releaseSchedule: "Anual · T+24 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pc-educacion-terciaria", "pc-id-empresarial"],
  },
  {
    id: "pc-desi-digital",
    family: "oferta",
    label: "Intensidad digital empresas DESI",
    shortLabel: "Digital intensity",
    unit: "%",
    decimals: 1,
    source: "Eurostat · isoc_e_dii",
    sourceCode: "isoc_e_dii:E_DI4_VHI:ES",
    frequency: "annual",
    description:
      "% empresas con muy alta intensidad digital (DII v4). España ~7% vs UE ~10% · gap especialmente en PYMES manufactura. Driver productividad TFP digital.",
    endpoint: "/api/eurostat/dataset?code=isoc_e_dii&filters=geo=ES;indic_is=E_DI4_VHI;unit=PC_ENT;size_emp=GE10",
    parser: "eurostat-simple",
    threshold: { amber: 30, red: 25, goodAbove: true },
    accent: "#8b5cf6",
    methodologyNote:
      "DII v4 = Digital Intensity Index version 4. VHI = ≥10/12 tech adoptados. size_emp=GE10 = empresas 10+ empleados (excluye micro). Sprint W.3.1c: filtro DII_VHIGH (deprecated) → E_DI4_VHI (versión 4 vigente).",
    releaseSchedule: "Anual · publicación T+15 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pc-ict-invest", "pc-empleo-knowledge"],
  },
  {
    id: "pc-ict-invest",
    family: "oferta",
    label: "Inversión ICT %PIB",
    shortLabel: "ICT investment",
    unit: "%",
    decimals: 2,
    source: "Eurostat · nama_10_nfa_st",
    sourceCode: "nama_10_nfa_st:N111G:ES",
    frequency: "annual",
    description:
      "Inversión en software + bases datos + equipos ICT sobre PIB. Capital intangible clave para productividad TFP. Gap estructural ES vs líderes UE (NLD, SWE, FIN).",
    endpoint: "/api/eurostat/dataset?code=nama_10_nfa_st&filters=geo=ES;asset10=N111G",
    parser: "eurostat-simple",
    accent: "#16a34a",
    methodologyNote:
      "N111G = software + databases (intangible). España ~1.5% PIB vs líderes 3-4%. Driver clave TFP digital. Capital intangible no se mide bien en estadísticas tradicionales — underestimates.",
    releaseSchedule: "Anual · T+18 meses",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["pc-desi-digital", "pc-id-empresarial"],
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
