/**
 * Catálogo · subtab "Empresas & beneficios" v4 (Sprint N6.3).
 *
 * REFUNDACIÓN. La versión anterior tenía PIB, IPC, Paro, Inversión, Exports
 * (todos macro genéricos de pulso-macro). Esta versión se centra en LA SALUD
 * DEL TEJIDO EMPRESARIAL ESPAÑOL: producción industrial, ventas, demografía
 * de empresas, expectativas, márgenes proxy.
 *
 * Sin solape con pulso-macro / margen-fiscal / mercados-activos.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const EMPRESAS_BENEFICIOS_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Producción industrial · cíclico líder ─────────────────────────────
  {
    id: "eb-prod-industrial",
    family: "oferta",
    label: "Producción industrial · IPI",
    shortLabel: "IPI YoY",
    unit: "%",
    decimals: 1,
    source: "Eurostat · sts_inpr_m",
    sourceCode: "sts_inpr_m:ES",
    frequency: "monthly",
    description:
      "Índice de Producción Industrial (IPI) variación interanual. Mide la actividad fabril real. Lead indicator del PIB industria (~20% PIB ES). Caídas <0% YoY = recesión sector.",
    endpoint: "/api/eurostat/dataset?code=sts_inpr_m&filters=geo=ES;nace_r2=B-D;unit=I15_A",
    parser: "eurostat-simple",
    threshold: { amber: 0, red: -3, goodAbove: true },
    accent: "#0F766E",
  },

  // ─── Cifra de negocios industria ────────────────────────────────────────
  {
    id: "eb-volumen-negocios",
    family: "demanda",
    label: "Volumen negocios industria YoY",
    shortLabel: "Negocios YoY",
    unit: "%",
    decimals: 1,
    source: "Eurostat · sts_intvi_m",
    sourceCode: "sts_intvi_m:ES",
    frequency: "monthly",
    description:
      "Variación interanual del volumen de negocio industrial. Reflejo directo de ventas reales (no producción). Caídas precoces señalan deterioro demanda final.",
    endpoint: "/api/eurostat/dataset?code=sts_intvi_m&filters=geo=ES;nace_r2=B-E",
    parser: "eurostat-simple",
    accent: "#16a34a",
  },

  // ─── Confianza empresarial industrial ──────────────────────────────────
  {
    id: "eb-confianza-empresarial-eurostat",
    family: "sentimiento",
    label: "Confianza industrial",
    shortLabel: "Conf. ind.",
    unit: "",
    decimals: 1,
    source: "Eurostat · ei_bsin_m",
    sourceCode: "ei_bsin_m:ES",
    frequency: "monthly",
    description:
      "Balance opiniones empresarios industriales sobre pedidos + producción + stocks. Lead indicator del IPI · valor <0 = pesimismo dominante.",
    endpoint: "/api/eurostat/dataset?code=ei_bsin_m&filters=geo=ES;indic=BS-ICI;s_adj=SA;nace_r2=C",
    parser: "eurostat-simple",
    threshold: { amber: -5, red: -15, goodAbove: true },
    accent: "#7c3aed",
  },

  // ─── Confianza sector servicios (~70% PIB) ─────────────────────────────
  {
    id: "eb-confianza-servicios",
    family: "sentimiento",
    label: "Confianza servicios",
    shortLabel: "Conf. serv.",
    unit: "",
    decimals: 1,
    source: "Eurostat · ei_bssi_m",
    sourceCode: "ei_bssi_m:ES",
    frequency: "monthly",
    description:
      "Balance opiniones sector servicios (que pesa ~70% PIB ES). Más representativo del ciclo empresarial agregado que la confianza industrial.",
    endpoint: "/api/eurostat/dataset?code=ei_bssi_m&filters=geo=ES;indic=BS-SCI;s_adj=SA",
    parser: "eurostat-simple",
    threshold: { amber: -5, red: -15, goodAbove: true },
    accent: "#8b5cf6",
  },

  // ─── Stock empresas activas ────────────────────────────────────────────
  {
    id: "eb-demografia-empresas-eurostat",
    family: "demanda",
    label: "Stock empresas activas",
    shortLabel: "Stock empresas",
    unit: "",
    decimals: 0,
    source: "Eurostat · bd_size_r3",
    sourceCode: "bd_size_r3:V11910:ES",
    frequency: "annual",
    description:
      "Número total de empresas activas (NACE B-N). Stock comparable UE. Caídas absolutas = destrucción neta tejido (raras: solo 2009-13).",
    endpoint: "/api/eurostat/dataset?code=bd_size_r3&filters=geo=ES;indic_sb=V11910;nace_r2=B-N",
    parser: "eurostat-simple",
    accent: "#16a34a",
  },

  // ─── Tasa creación de empresas ─────────────────────────────────────────
  {
    id: "eb-tasa-creacion-empresas",
    family: "demanda",
    label: "Tasa creación empresas",
    shortLabel: "Altas %",
    unit: "%",
    decimals: 1,
    source: "Eurostat · bd_size_r3",
    sourceCode: "bd_size_r3:BUSI_CR:ES",
    frequency: "annual",
    description:
      "% empresas creadas en el año sobre stock total. España ~9% (vs UE 8%). Métrica de dinamismo · caídas anticipan destrucción neta.",
    endpoint: "/api/eurostat/dataset?code=bd_size_r3&filters=geo=ES;indic_sb=BUSI_CR;nace_r2=B-N",
    parser: "eurostat-simple",
    threshold: { amber: 7, red: 5, goodAbove: true },
    accent: "#0891b2",
  },

  // ─── Empleo asalariado total (Eurostat LFS) ────────────────────────────
  {
    id: "eb-empleo-asalariado",
    family: "empleo",
    label: "Empleo asalariado total",
    shortLabel: "Asalariados",
    unit: " mil",
    decimals: 0,
    source: "Eurostat · lfsq_egais",
    sourceCode: "lfsq_egais:ES",
    frequency: "quarterly",
    description:
      "Número total de asalariados (LFS, miles). Cruzar con ETCL para inferir masa salarial agregada — proxy de costes laborales empresariales totales.",
    endpoint: "/api/eurostat/dataset?code=lfsq_egais&filters=geo=ES;sex=T;age=Y15-74",
    parser: "eurostat-simple",
    accent: "#0F766E",
  },

  // ─── Coste laboral ETCL (presión sobre márgenes) ──────────────────────
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
      "Coste laboral medio por trabajador y mes (salarios + cotizaciones). Driver principal de presión sobre márgenes empresariales. Su comparación con productividad determina competitividad.",
    endpoint: "/api/ine/etcl?n=24",
    parser: "ine-ipc",
    parserKey: "total",
    accent: "#f59e0b",
  },
];

export const EMPRESAS_BENEFICIOS_META = {
  slug: "empresas-beneficios",
  label: "Empresas & beneficios",
  shortLabel: "Empresas",
  accent: "#7c3aed",
  description:
    "Salud del tejido empresarial: producción industrial IPI, volumen negocios, confianza industrial y servicios, stock empresas y tasa creación, empleo asalariado, coste laboral. Sin solape con pulso-macro / margen-fiscal / mercados-activos.",
};
