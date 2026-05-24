/**
 * Catálogo de indicadores · subtab "Hogares, empleo & vivienda" v3.
 *
 * Foco: ¿cómo se traduce la macroeconomía en la vida material? Empleo,
 * salarios, vivienda, hipotecas, renta y deuda hogares.
 *
 * Este catálogo se beneficia de las fuentes INE más maduras (EPA, IPC,
 * IPV, ETCL) + IMF LUR. EPF queda como bloque especial en el tab v1.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const HOGARES_EMPLEO_VIVIENDA_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Familia Empleo ───────────────────────────────────────────────────
  {
    id: "hev-paro-epa-general",
    family: "empleo",
    label: "Tasa paro EPA general · INE 86913",
    shortLabel: "Paro EPA",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · EPA",
    sourceCode: "EPA86913",
    frequency: "quarterly",
    description:
      "Tasa de desempleo sobre población activa 16+. EPA es la métrica estándar de Eurostat y AIReF.",
    endpoint: "/api/ine/epa?n=24",
    parser: "ine-epa",
    parserKey: "general",
    threshold: { amber: 12, red: 18, goodAbove: false },
    accent: "#f59e0b",
  },
  {
    id: "hev-paro-epa-jovenes",
    family: "empleo",
    label: "Paro juvenil <25 EPA · INE 86912",
    shortLabel: "Paro <25",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · EPA",
    sourceCode: "EPA86912",
    frequency: "quarterly",
    description:
      "Tasa de paro en activos menores de 25 años. Indicador social clave; típicamente 2× la tasa general.",
    endpoint: "/api/ine/epa?n=24",
    parser: "ine-epa",
    parserKey: "menores_25",
    threshold: { amber: 25, red: 35, goodAbove: false },
    accent: "#dc2626",
  },
  {
    id: "hev-paro-imf-lur",
    family: "forecast",
    label: "Tasa paro IMF · 20y + forecast",
    shortLabel: "Paro IMF",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "LUR",
    frequency: "annual",
    description:
      "Tasa de paro anual con proyección 5y. Útil para anclar expectativas (NAIRU España ~13%, pico 2013: 26.1%).",
    endpoint: "/api/imf/country?iso=ESP&indicator=LUR",
    parser: "imf-country",
    imfIndicator: "LUR",
    threshold: { amber: 12, red: 18, goodAbove: false },
    accent: "#f59e0b",
  },

  // ─── Familia Precios · poder adquisitivo ─────────────────────────────
  {
    id: "hev-ipc-anual",
    family: "precios",
    label: "IPC anual · INE 290750",
    shortLabel: "IPC YoY",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · IPC",
    sourceCode: "IPC290750",
    frequency: "monthly",
    description:
      "Inflación general anual. Erosiona poder adquisitivo de salarios y pensiones. Driver clave del malestar económico.",
    endpoint: "/api/ine/ipc?n=36",
    parser: "ine-ipc",
    parserKey: "anual",
    threshold: { amber: 2, red: 4, goodAbove: false },
    accent: "#dc2626",
  },
  {
    id: "hev-ipc-mensual",
    family: "precios",
    label: "IPC mensual · INE 290752",
    shortLabel: "IPC m/m",
    unit: "%",
    decimals: 2,
    source: "INE WSTempus · IPC",
    sourceCode: "IPC290752",
    frequency: "monthly",
    description:
      "Variación intermensual del IPC. Lector más sensible de inflexiones inflacionarias que la tasa anual.",
    endpoint: "/api/ine/ipc?n=36",
    parser: "ine-ipc",
    parserKey: "mensual",
    accent: "#8b5cf6",
  },

  // ─── Familia Vivienda · IPV ─────────────────────────────────────────
  {
    id: "hev-ipv-general",
    family: "pib",
    label: "IPV general · INE 76201",
    shortLabel: "IPV",
    unit: "",
    decimals: 1,
    source: "INE WSTempus · IPV",
    sourceCode: "IPV76201",
    frequency: "quarterly",
    description:
      "Índice de Precios de Vivienda general. Mide precio de transacciones. Driver de la presión sobre hogares jóvenes e hipotecados.",
    endpoint: "/api/ine/ipv?n=24",
    parser: "ine-ipc",
    parserKey: "general",
    accent: "#16a34a",
  },
  {
    id: "hev-ipv-nueva",
    family: "pib",
    label: "IPV vivienda nueva · INE 76201",
    shortLabel: "IPV nueva",
    unit: "",
    decimals: 1,
    source: "INE WSTempus · IPV",
    sourceCode: "IPV76201-N",
    frequency: "quarterly",
    description:
      "IPV vivienda nueva. Suele moverse en paralelo a costes de construcción (materiales, mano de obra, suelo).",
    endpoint: "/api/ine/ipv?n=24",
    parser: "ine-ipc",
    parserKey: "nueva",
    accent: "#10b981",
  },
  {
    id: "hev-ipv-segunda",
    family: "pib",
    label: "IPV segunda mano · INE 76201",
    shortLabel: "IPV 2nd",
    unit: "",
    decimals: 1,
    source: "INE WSTempus · IPV",
    sourceCode: "IPV76201-S",
    frequency: "quarterly",
    description:
      "IPV segunda mano. Más representativa del mercado real (la mayoría de compraventas son de segunda mano).",
    endpoint: "/api/ine/ipv?n=24",
    parser: "ine-ipc",
    parserKey: "segunda",
    accent: "#0d9488",
  },

  // ─── Familia Empleo · coste laboral ───────────────────────────────────
  {
    id: "hev-etcl-coste-laboral",
    family: "empleo",
    label: "Coste laboral medio · INE ETCL",
    shortLabel: "Coste laboral",
    unit: "€/mes",
    decimals: 0,
    source: "INE WSTempus · ETCL",
    sourceCode: "ETCL",
    frequency: "quarterly",
    description:
      "Coste laboral medio por trabajador y mes. Proxy de salario bruto + cotizaciones. Cruzado con IPC mide poder adquisitivo real.",
    endpoint: "/api/ine/etcl?n=24",
    parser: "ine-ipc",
    parserKey: "total",
    accent: "#7c3aed",
  },

  // ─── Sprint N13.2 · Métricas vivienda + deuda hogares + alquiler ───
  {
    id: "hev-sobrecarga-vivienda",
    family: "precios",
    label: "Sobrecarga gasto vivienda (>40% renta)",
    shortLabel: "Sobrecarga",
    unit: "%",
    decimals: 1,
    source: "Eurostat · ilc_mded01",
    sourceCode: "ilc_mded01:OWN+RENT:ES",
    frequency: "annual",
    description:
      "% hogares con gasto vivienda >40% renta disponible (housing cost overburden). España ~9% pero >25% para inquilinos en grandes urbes. Indicador crítico de pobreza housing.",
    endpoint: "/api/eurostat/dataset?code=ilc_mded01&filters=geo=ES;hhtyp=TOTAL;incgrp=TOTAL",
    parser: "eurostat-simple",
    threshold: { amber: 10, red: 15, goodAbove: false },
    accent: "#dc2626",
  },
  {
    id: "hev-deuda-hogares-pib",
    family: "pib",
    label: "Deuda hogares %PIB",
    shortLabel: "Deuda hogares",
    unit: "%",
    decimals: 1,
    source: "Eurostat · nasq_10_f_bs",
    sourceCode: "nasq_10_f_bs:S14_S15:F4:LIAB:ES",
    frequency: "quarterly",
    description:
      "Préstamos hogares (S14+S15) %PIB. España bajó de 86% (2010) a 55% (2024) tras desapalancamiento post-2008. Aún vulnerable a shocks tipos · sobre todo hipotecario.",
    endpoint: "/api/eurostat/dataset?code=nasq_10_f_bs&filters=geo=ES;sector=S14_S15;finpos=LIAB;na_item=F4;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 60, red: 75, goodAbove: false },
    accent: "#7c3aed",
  },
  {
    id: "hev-ahorro-hogares",
    family: "demanda",
    label: "Tasa ahorro hogares %",
    shortLabel: "Ahorro",
    unit: "%",
    decimals: 1,
    source: "Eurostat · nasq_10_ki",
    sourceCode: "nasq_10_ki:SRG_S14:ES",
    frequency: "quarterly",
    description:
      "Tasa ahorro bruto hogares (S14) % renta disponible. Buffer ante shocks · capacidad consumo futuro. Pico 25% en covid 2020, normalizado ~7%.",
    endpoint: "/api/eurostat/dataset?code=nasq_10_ki&filters=geo=ES;sector=S14;na_item=SRG;unit=PC_HHGDIB",
    parser: "eurostat-simple",
    threshold: { amber: 5, red: 3, goodAbove: true },
    accent: "#16a34a",
  },
  {
    id: "hev-paro-largo-plazo",
    family: "empleo",
    label: "Paro larga duración (>12m)",
    shortLabel: "Paro LD",
    unit: "%",
    decimals: 1,
    source: "Eurostat · lfsi_long_q",
    sourceCode: "lfsi_long_q:ES",
    frequency: "quarterly",
    description:
      "% parados >12 meses sobre activos. Hysteresis del mercado laboral · driver pobreza estructural y desafección política.",
    endpoint: "/api/eurostat/dataset?code=lfsi_long_q&filters=geo=ES;sex=T;age=Y15-74;unit=PC_ACT",
    parser: "eurostat-simple",
    threshold: { amber: 5, red: 8, goodAbove: false },
    accent: "#f97316",
  },
  {
    id: "hev-tiempo-parcial-involunt",
    family: "empleo",
    label: "Empleo parcial involuntario",
    shortLabel: "Parcial inv.",
    unit: "%",
    decimals: 1,
    source: "Eurostat · lfsq_eppga",
    sourceCode: "lfsq_eppga:ES",
    frequency: "quarterly",
    description:
      "% trabajadores tiempo parcial que querrían jornada completa. Indicador de subempleo · más alto España vs UE.",
    endpoint: "/api/eurostat/dataset?code=lfsq_eppga&filters=geo=ES;sex=T;age=Y15-64",
    parser: "eurostat-simple",
    threshold: { amber: 30, red: 45, goodAbove: false },
    accent: "#dc2626",
  },

  // ─── Sprint N15 · BdE webstat · EURIBOR + tipos hipoteca ───────────
  {
    id: "hev-euribor-12m",
    family: "forecast",
    label: "EURIBOR 12M (referencia hipoteca variable)",
    shortLabel: "EURIBOR 12M",
    unit: "%",
    decimals: 3,
    source: "BdE · webstat TI_1_1.6",
    sourceCode: "TI_1_1.6",
    frequency: "monthly",
    description:
      "EURIBOR 12 meses mensual · referencia mayoritaria de hipotecas variables en España. Cada +25pb se traslada en 6-12m a cuota efectiva.",
    endpoint: "/api/bde/series/TI_1_1.6?n=36",
    parser: "bde-series",
    threshold: { amber: 3.5, red: 5, goodAbove: false },
    accent: "#dc2626",
  },
  {
    id: "hev-tipo-hipoteca",
    family: "forecast",
    label: "Tipo medio hipoteca vivienda nueva",
    shortLabel: "Hipoteca media",
    unit: "%",
    decimals: 2,
    source: "BdE · webstat TI_1_1240",
    sourceCode: "TI_1_1240",
    frequency: "monthly",
    description:
      "Tipo de interés medio de nuevas operaciones hipotecarias para vivienda · BdE Boletín Estadístico cap.19. Determina cuota mensual real.",
    endpoint: "/api/bde/series/TI_1_1240?n=24",
    parser: "bde-series",
    threshold: { amber: 4, red: 5.5, goodAbove: false },
    accent: "#f59e0b",
  },

  // ─── CIS · cadencia barómetros publicados (Sprint N12) ──────────────────
  // Importante: CIS NO expone valores agregados de % problemas (vivienda, paro,
  // precios) vía API · los publica en PDF de avance + microdato CSV/SPSS por
  // descarga manual. Lo que SÍ exponemos via CKAN datos.gob.es es metadata de
  // barómetros publicados (cadencia mensual ~). El parser cis-catalogo devuelve
  // 1 punto por barómetro publicado · útil para verificar regularidad del
  // operador estadístico (CIS publica ~12 estudios/año).
  {
    id: "hev-cis-cadencia",
    family: "sentimiento",
    label: "Cadencia barómetros CIS publicados",
    shortLabel: "CIS publica",
    unit: " (1=evento)",
    decimals: 0,
    source: "CKAN datos.gob.es · CIS",
    sourceCode: "CIS_BAROMETRO_TIMESTAMPS",
    frequency: "monthly",
    description:
      "Timeline de barómetros CIS publicados (vía CKAN datos.gob.es). 1 punto = 1 barómetro publicado en su fecha de release. Para datos numéricos reales (% vivienda como problema, % paro como problema, valoraciones), los cruces CIS dedicados muestran link al PDF + microdato porque CIS no expone series agregadas vía API pública.",
    endpoint: "/api/cis/catalogo",
    parser: "cis-catalogo",
    accent: "#dc2626",
  },
];

export const HOGARES_EMPLEO_VIVIENDA_META = {
  slug: "hogares-empleo-vivienda",
  label: "Hogares, empleo & vivienda",
  shortLabel: "Hogares",
  accent: "#dc2626",
  description:
    "Vida material de los hogares · empleo · salarios reales · vivienda · alquiler · hipotecas · deuda · brechas territoriales y generacionales.",
};
