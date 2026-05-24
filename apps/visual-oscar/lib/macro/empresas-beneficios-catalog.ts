/**
 * Catálogo · subtab "Empresas & beneficios" v4 (Sprint N6.3 + N17).
 *
 * REFUNDACIÓN. La versión anterior tenía PIB, IPC, Paro, Inversión, Exports
 * (todos macro genéricos de pulso-macro). Esta versión se centra en LA SALUD
 * DEL TEJIDO EMPRESARIAL ESPAÑOL: producción industrial, ventas, demografía
 * de empresas, expectativas, márgenes proxy.
 *
 * Sin solape con pulso-macro / margen-fiscal / mercados-activos.
 * Sprint N17 · methodology + release + confidence + related ids.
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
    methodologyNote:
      "Cobertura B-D NACE (minería + manufactura + energía). Base 2015 desestacionalizado. Lead indicator del PIB industria. Para volumen real (no índice) usar IPI INE.",
    releaseSchedule: "Mensual · T+45 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["eb-volumen-negocios", "eb-capacidad-utilizada", "pulso-ipi-manufactura"],
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
    methodologyNote:
      "Cifra de negocios = ventas netas industria. Diferencia con IPI: producción vs ventas. Si IPI > Negocios → acumulación inventario (señal débil). Si Negocios > IPI → vaciado inventario.",
    releaseSchedule: "Mensual · T+50 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["eb-prod-industrial", "eb-inventarios-industria"],
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
    methodologyNote:
      "Industrial Confidence Indicator (DG ECFIN). Balance ±100 entre respuestas optimistas y pesimistas sobre pedidos, producción, stocks. Lead indicator del IPI: anticipa cambios 2-3 meses.",
    releaseSchedule: "Mensual · publicación T+25 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["eb-prod-industrial", "eb-confianza-servicios", "pulso-esi-sentiment"],
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
    methodologyNote:
      "Services Confidence Indicator (DG ECFIN). Cubre comercio, transporte, hostelería, profesionales. Más representativo que industrial por peso PIB servicios (~70%).",
    releaseSchedule: "Mensual · T+25 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["eb-confianza-empresarial-eurostat", "pulso-esi-sentiment"],
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
    methodologyNote:
      "V11910 = Number of active enterprises. Cobertura B-N (excluye administración pública + actividades inmobiliarias residenciales). Stock anual fin de año. Para serie mensual usar DIRCE INE.",
    releaseSchedule: "Anual · publicación T+24 meses",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["eb-tasa-creacion-empresas", "eb-supervivencia-empresas"],
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
    methodologyNote:
      "Business birth rate. Sesgo: incluye autónomos (alta rotación) y micros — sobre-pondera entrada de baja productividad. Para visión 'genuina' cruzar con eb-supervivencia-empresas.",
    releaseSchedule: "Anual · T+24 meses",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["eb-demografia-empresas-eurostat", "eb-supervivencia-empresas"],
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
    methodologyNote:
      "LFS asalariados (employees, no self-employed). Cruzar con eb-etcl-coste-laboral para inferir masa salarial total. Diferencia con afiliados SS por economía sumergida (~10%).",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["eb-etcl-coste-laboral", "hev-paro-epa-general"],
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
    methodologyNote:
      "Encuesta Trimestral Coste Laboral. Salario base + complementos + SS empresa. NO autónomos. Comparado con productividad (pc-productividad-hora) determina ULC (pc-ulc).",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-etcl-coste-laboral", "pc-ulc", "eb-empleo-asalariado"],
  },

  // ─── Sprint N13.2 · Métricas nicho empresariales ────────────────────
  {
    id: "eb-capacidad-utilizada",
    family: "oferta",
    label: "Capacidad utilizada industria",
    shortLabel: "Cap. utilizada",
    unit: "%",
    decimals: 1,
    source: "Eurostat · ei_bsbu_q",
    sourceCode: "ei_bsbu_q:ES",
    frequency: "quarterly",
    description:
      "% utilización capacidad productiva industrial (encuesta). Niveles <75% indican holgura, >82% sugieren tensión y presión a inversión nueva. Lead indicator capex industrial.",
    endpoint: "/api/eurostat/dataset?code=ei_bsbu_q&filters=geo=ES;indic=BS-CFTC;s_adj=NSA;nace_r2=C",
    parser: "eurostat-simple",
    threshold: { amber: 75, red: 70, goodAbove: true },
    accent: "#0F766E",
    methodologyNote:
      "Encuesta empresarial DG ECFIN. >82% sostenido suele anticipar pico de capex industrial. <70% durante recesión. Para ES media 77%.",
    releaseSchedule: "Trimestral · publicación enero/abril/julio/octubre",
    confidenceLevel: "high",
    relatedIndicatorIds: ["eb-prod-industrial", "inversion-fbcf-yoy"],
  },
  {
    id: "eb-inventarios-industria",
    family: "oferta",
    label: "Saldo inventarios industria",
    shortLabel: "Inventarios",
    unit: "",
    decimals: 1,
    source: "Eurostat · ei_bsin_m",
    sourceCode: "ei_bsin_m:STK:ES",
    frequency: "monthly",
    description:
      "Balance opinión empresarios sobre nivel de stocks. Positivo = stocks por encima normal (señal posible desaceleración demanda). Negativo = pedidos firmes, capex próximo.",
    endpoint: "/api/eurostat/dataset?code=ei_bsin_m&filters=geo=ES;indic=BS-IS;s_adj=SA;nace_r2=C",
    parser: "eurostat-simple",
    accent: "#f97316",
    methodologyNote:
      "BS-IS (Industry Stocks balance). Encuesta DG ECFIN. Lectura contrarian: stocks altos = empresa NO confía en demanda futura.",
    releaseSchedule: "Mensual · T+25 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["eb-volumen-negocios", "eb-confianza-empresarial-eurostat"],
  },
  {
    id: "eb-exports-hitech",
    family: "exterior",
    label: "Exports productos alta tecnología",
    shortLabel: "X hi-tech",
    unit: " M€",
    decimals: 0,
    source: "Eurostat · htec_si_exp4",
    sourceCode: "htec_si_exp4:ES",
    frequency: "annual",
    description:
      "Exportaciones productos manufactureros alta tecnología (aerospace, farma, electrónica, optical). Termómetro de competitividad estructural exportadora.",
    endpoint: "/api/eurostat/dataset?code=htec_si_exp4&filters=geo=ES",
    parser: "eurostat-simple",
    accent: "#7c3aed",
    methodologyNote:
      "Cobertura OCDE hi-tech: aerospace + pharma + computers + electronics + scientific instruments. España ~6% del total exports vs UE ~15% — refleja modelo productivo poco intensivo en tech.",
    releaseSchedule: "Anual · T+12 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["de-htec-trade", "pc-id-empresarial"],
  },
  {
    id: "eb-supervivencia-empresas",
    family: "demanda",
    label: "Tasa supervivencia 5 años",
    shortLabel: "Survival 5y",
    unit: "%",
    decimals: 1,
    source: "Eurostat · bd_size_r3",
    sourceCode: "bd_size_r3:V97400:ES",
    frequency: "annual",
    description:
      "% empresas creadas hace 5 años aún activas. Calidad del emprendimiento. España ~50% (mediana UE) · sectores intensivos en capital mayor mortalidad.",
    endpoint: "/api/eurostat/dataset?code=bd_size_r3&filters=geo=ES;indic_sb=V97400;nace_r2=B-N",
    parser: "eurostat-simple",
    threshold: { amber: 45, red: 40, goodAbove: true },
    accent: "#0EA5E9",
    methodologyNote:
      "% empresas nacidas hace 5 años aún activas. Indicador calidad emprendimiento. ES varía mucho por sector: pharma/tech ~70%, comercio/restauración ~35%.",
    releaseSchedule: "Anual · T+30 meses (datos cohorte 2019 → publicados 2024)",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["eb-tasa-creacion-empresas", "eb-demografia-empresas-eurostat"],
  },
  {
    id: "eb-stock-capital",
    family: "oferta",
    label: "Stock neto capital fijo %PIB",
    shortLabel: "Stock K",
    unit: "%",
    decimals: 0,
    source: "Eurostat · nama_10_nfa_st",
    sourceCode: "nama_10_nfa_st:N11G_TOTAL:ES",
    frequency: "annual",
    description:
      "Stock neto capital fijo (no residencial + residencial) sobre PIB. Capital instalado · base de capacidad productiva. Tras crisis 2008-13, ES sufrió subinversión sostenida.",
    endpoint: "/api/eurostat/dataset?code=nama_10_nfa_st&filters=geo=ES;asset10=N11G;sector=TOTAL",
    parser: "eurostat-simple",
    accent: "#16a34a",
    methodologyNote:
      "N11G = Gross fixed assets, todos sectores. Stock acumulado neto depreciación. Subinversión 2009-15 generó gap estructural vs DEU ~15 pp PIB que aún se está cerrando.",
    releaseSchedule: "Anual · T+18 meses",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["inversion-fbcf-yoy", "fc-inversion-bruta"],
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
