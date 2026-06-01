/**
 * Catálogo de indicadores · subtab "Régimen monetario" v3 (Sprint N17).
 *
 * Foco: inflación (general + componentes), tipos BCE (snapshot via tabs),
 * tipo de cambio real efectivo, expectativas IMF.
 *
 * Sólo se incluyen indicadores con SERIE temporal (≥4 puntos). Métricas
 * snapshot (curva soberana actual, depo rate puntual) se quedan en el
 * subtab clásico /macro?tab=regimen-monetario.
 *
 * Sprint N17 · methodology + release + confidence + related ids por indicador.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const REGIMEN_MONETARIO_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Familia Precios (INE IPC) ────────────────────────────────────────
  {
    id: "rm-ipc-anual",
    family: "precios",
    label: "IPC general · variación anual",
    shortLabel: "IPC YoY",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · IPC",
    sourceCode: "IPC290750",
    frequency: "monthly",
    description:
      "Tasa de inflación general anual del IPC. Comparable BCE target 2% medio plazo. Núcleo del régimen monetario.",
    endpoint: "/api/ine/ipc?n=36",
    parser: "ine-ipc",
    parserKey: "anual",
    threshold: { amber: 2, red: 4, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "IPC nacional INE (no armonizado). Para política monetaria BCE usar HICP (rm-hicp-eurostat). Diferencia ES vs HICP típica ~0.1-0.3 pp por diferencia metodológica (cesta + ponderaciones).",
    releaseSchedule: "Mensual · publicación 13-14 día siguiente al mes de referencia",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rm-hicp-eurostat", "rm-hicp-core", "rm-ipc-mensual"],
  },
  {
    id: "rm-ipc-mensual",
    family: "precios",
    label: "IPC general · variación mensual",
    shortLabel: "IPC m/m",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · IPC",
    sourceCode: "IPC290752",
    frequency: "monthly",
    description:
      "Variación intermensual del IPC. Mejor lector de inflexiones inflacionarias intra-año (no arrastra base year).",
    endpoint: "/api/ine/ipc?n=36",
    parser: "ine-ipc",
    parserKey: "mensual",
    accent: "#8b5cf6",
    methodologyNote:
      "Variación m/m sin desestacionalizar. Picos típicos julio (rebajas) + enero (precios públicos). Para tendencia limpia anualizar el dato desestacionalizado HICP m/m.",
    releaseSchedule: "Mensual · igual IPC anual",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rm-ipc-anual", "rm-hicp-mom"],
  },
  {
    id: "rm-ipc-acumulada",
    family: "precios",
    label: "IPC general · acumulada YTD",
    shortLabel: "IPC YTD",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · IPC",
    sourceCode: "IPC290753",
    frequency: "monthly",
    description:
      "Inflación acumulada desde enero del año en curso. Útil para anclar expectativas de cierre de año.",
    endpoint: "/api/ine/ipc?n=36",
    parser: "ine-ipc",
    parserKey: "acumulada",
    accent: "#a855f7",
    methodologyNote:
      "Variación encadenada enero → mes actual. Útil para escenarios de cierre anual (extrapolar resto del año). Atención: efectos base hacen que YoY y YTD diverjan mucho a partir del Q4.",
    releaseSchedule: "Mensual · igual IPC anual",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rm-ipc-anual"],
  },

  // Sprint N6.3 cleanup: rm-ipc-imf-20y removido · HICP Eurostat lo cubre
  // mejor (mensual + armonizada UE + comparable con peers). PCPIPCH IMF anual
  // queda solo en pulso-macro como ancla forecast.

  // ─── Inflación subyacente (core HICP) · driver de decisión BCE ────────
  {
    id: "rm-hicp-core",
    family: "precios",
    label: "HICP core (sin energía/alimentos)",
    shortLabel: "HICP core",
    unit: "%",
    decimals: 2,
    source: "Eurostat · prc_hicp_manr",
    sourceCode: "prc_hicp_manr:TOT_X_NRG_FOOD:ES",
    frequency: "monthly",
    description:
      "Inflación subyacente (HICP all-items excluding energy and food). Variable que sigue BCE para política monetaria · más persistente que headline, menos ruido.",
    endpoint: "/api/eurostat/dataset?code=prc_hicp_manr&filters=geo=ES;coicop=TOT_X_NRG_FOOD;unit=RCH_A",
    parser: "eurostat-simple",
    threshold: { amber: 2.5, red: 4, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "Excluye 'energy + unprocessed food'. Variable preferida BCE por menor ruido. Sticky: para volver a target 2% suele requerir 18-24 meses tras pico shock.",
    releaseSchedule: "Mensual · publicación T+15-20 días (Eurostat flash T+1)",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rm-hicp-eurostat", "rm-hicp-energia", "rm-hicp-alimentos"],
  },

  // Sprint N13.1 cleanup · rm-reer-bis removido · vive en mercados-activos
  // (su tab natural · ancla FX para activos). Cross-link en lugar de duplicar.

  // ─── Sprint N13.2 · EURIBOR 3M (transmisión BCE → hipotecas) ──────────
  {
    id: "rm-euribor-3m",
    family: "forecast",
    label: "EURIBOR 3M mensual",
    shortLabel: "EURIBOR 3M",
    unit: "%",
    decimals: 2,
    source: "Eurostat · irt_st_m",
    sourceCode: "irt_st_m:EUR_RT_M3",
    frequency: "monthly",
    description:
      "Tipo interbancario eurozona a 3 meses. Benchmark del corto plazo del crédito · transmisión inmediata de cambios MRO/DFR del BCE.",
    endpoint: "/api/eurostat/dataset?code=irt_st_m&filters=geo=EA",
    parser: "eurostat-simple",
    accent: "#7c3aed",
    methodologyNote:
      "Tipo interbancario EA 3 meses publicado por EMMI. Refleja casi puro tipo BCE depo + risk premium banca. Para versión 12M (referencia hipotecaria) usar hev-euribor-12m.",
    releaseSchedule: "Mensual · T+15 días (datos diarios disponibles vía EMMI directo)",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ma-tipo-corto-ea", "hev-euribor-12m"],
  },
  // Sprint L F6 · +3 indicadores Eurostat para enriquecer régimen monetario
  {
    id: "rm-hicp-eurostat",
    family: "precios",
    label: "HICP zona euro España · Eurostat prc_hicp_manr",
    shortLabel: "HICP YoY",
    unit: "%",
    decimals: 2,
    source: "Eurostat · prc_hicp_manr",
    sourceCode: "prc_hicp_manr:CP00",
    frequency: "monthly",
    description:
      "Inflación armonizada (HICP) anual mensual · armonizada UE. Métrica que sigue el BCE para decisiones de política monetaria. Comparable con Alemania/Francia/Italia.",
    endpoint: "/api/eurostat/dataset?code=prc_hicp_manr&filters=geo=ES;coicop=CP00;unit=RCH_A",
    parser: "eurostat-simple",
    threshold: { amber: 2, red: 4, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "HICP CP00 = all items, RCH_A = % change annual. Metodología armonizada UE (cesta cuasi-idéntica + tratamiento housing 'rental equivalence'). Variable target BCE: 2% medio plazo simétrico.",
    releaseSchedule: "Mensual · Eurostat flash T+1 · cifra definitiva T+15",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rm-ipc-anual", "rm-hicp-core", "rm-hicp-mom"],
  },
  // Sprint N13.1 cleanup · rm-tipos-largo-eurostat removido · duplica el
  // ma-yield-10y-es de mercados-activos (mismo dataset + filtro).

  // ─── Sprint N13.2 · HICP componentes (driver headline vs core) ───────
  {
    id: "rm-hicp-energia",
    family: "precios",
    label: "HICP componente energía",
    shortLabel: "HICP energía",
    unit: "%",
    decimals: 1,
    source: "Eurostat · prc_hicp_manr",
    sourceCode: "prc_hicp_manr:NRG:ES",
    frequency: "monthly",
    description:
      "Variación interanual del componente energético del HICP. Driver volátil del headline · pico 2022 (+44%). Crítico para análisis BCE 'mira through' transitorio vs persistente.",
    endpoint: "/api/eurostat/dataset?code=prc_hicp_manr&filters=geo=ES;coicop=NRG;unit=RCH_A",
    parser: "eurostat-simple",
    threshold: { amber: 5, red: 15, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "NRG = electricidad + gas + combustibles líquidos + carburantes. Sensibilidad alta a precio mayorista gas (TTF) + tipo cambio EUR/USD petróleo. Iberian exception 2022-23 contuvo el spike español vs media EA.",
    releaseSchedule: "Mensual · T+15",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rs-hicp-energia", "rm-hicp-eurostat"],
  },
  {
    id: "rm-hicp-alimentos",
    family: "precios",
    label: "HICP componente alimentos",
    shortLabel: "HICP food",
    unit: "%",
    decimals: 1,
    source: "Eurostat · prc_hicp_manr",
    sourceCode: "prc_hicp_manr:FOOD:ES",
    frequency: "monthly",
    description:
      "Inflación alimentaria · pesa más en cesta de hogares bajos quintiles. Sticky vs energía · refleja shock transmisión a precios consumidor.",
    endpoint: "/api/eurostat/dataset?code=prc_hicp_manr&filters=geo=ES;coicop=FOOD;unit=RCH_A",
    parser: "eurostat-simple",
    threshold: { amber: 3, red: 6, goodAbove: false },
    accent: "#f97316",
    methodologyNote:
      "Coicop FOOD incluye alimentos elaborados + sin elaborar + bebidas. Sticky downward — sube rápido pero baja despacio (sticky inflation). Sensible a shock cereales, energía agraria, cambio climático cosechas.",
    releaseSchedule: "Mensual · T+15",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rm-hicp-eurostat", "rm-hicp-core"],
  },
  {
    id: "rm-hicp-mom",
    family: "precios",
    label: "HICP m/m momentum",
    shortLabel: "HICP m/m",
    unit: "%",
    decimals: 2,
    source: "Eurostat · prc_hicp_mmor",
    sourceCode: "prc_hicp_mmor:CP00:ES",
    frequency: "monthly",
    description:
      "Variación mensual HICP (no anualizada). Captura momentum intra-año sin base effect. Lectura más limpia para anticipar ritmo subyacente.",
    endpoint: "/api/eurostat/dataset?code=prc_hicp_mmor&filters=geo=ES;coicop=CP00",
    parser: "eurostat-simple",
    accent: "#8b5cf6",
    methodologyNote:
      "Variación m/m sin desestacionalizar. Para tendencia limpia mirar promedio anualizado de últimos 3-6 meses (suaviza ruido + base year drift). Usado por BCE staff para 'inflation impetus'.",
    releaseSchedule: "Mensual · T+15",
    confidenceLevel: "high",
    relatedIndicatorIds: ["rm-hicp-eurostat", "rm-ipc-mensual"],
  },
  {
    id: "rm-confianza-consumidor-eurostat",
    family: "sentimiento",
    label: "Confianza consumidor · Eurostat ei_bsco_m",
    shortLabel: "Conf. cons.",
    unit: "",
    decimals: 1,
    source: "Eurostat · ei_bsco_m",
    sourceCode: "ei_bsco_m",
    frequency: "monthly",
    description:
      "Indicador de confianza del consumidor (mensual, balance de opiniones). Lead indicator de demanda agregada — caídas anticipan menor consumo y menor inflación de servicios.",
    endpoint: "/api/eurostat/dataset?code=ei_bsco_m&filters=geo=ES;indic=BS-CSMCI;s_adj=SA",
    parser: "eurostat-simple",
    accent: "#8b5cf6",
    methodologyNote:
      "Balance opiniones consumidores (DG ECFIN). Escala -100 a +100. Caídas sostenidas anticipan menor consumo discrecional (servicios + bienes duraderos). Sirve como lead indicator del IPC subyacente servicios.",
    releaseSchedule: "Mensual · publicación T+30 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pulso-esi-sentiment", "pulso-ventas-retail"],
  },
];

export const REGIMEN_MONETARIO_META = {
  slug: "regimen-monetario",
  label: "Régimen monetario",
  shortLabel: "Monetario",
  accent: "#7c3aed",
  description:
    "Inflación, transmisión monetaria del BCE, divisas y competitividad-precio. Núcleo del marco macroeconómico de medio plazo.",
};
