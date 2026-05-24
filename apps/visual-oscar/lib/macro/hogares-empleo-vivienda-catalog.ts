/**
 * Catálogo de indicadores · subtab "Hogares, empleo & vivienda" v3.
 *
 * Foco: ¿cómo se traduce la macroeconomía en la vida material? Empleo,
 * salarios, vivienda, hipotecas, renta y deuda hogares.
 *
 * Este catálogo se beneficia de las fuentes INE más maduras (EPA, IPC,
 * IPV, ETCL) + IMF LUR. EPF queda como bloque especial en el tab v1.
 *
 * Sprint N16: methodology + release schedule + confidence + related ids.
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
    methodologyNote:
      "Encuesta Población Activa (~65k hogares, 180k personas) muestra rotatoria 1/6 cada trimestre. Definición OIT: parado = activo sin empleo + busca activamente. Lectura mensual SEPE NO comparable (sólo demandantes inscritos).",
    releaseSchedule: "Trimestral · publicación INE 4 viernes posterior a fin de trimestre",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-paro-epa-jovenes", "hev-paro-imf-lur", "hev-paro-largo-plazo"],
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
    methodologyNote:
      "Activos 16-24. Sesgo importante: muchos jóvenes 16-19 no están en la fuerza de trabajo (estudios), por lo que la 'base activa' es pequeña — la ratio se mueve mucho con cambios marginales de empleo.",
    releaseSchedule: "Trimestral · igual que paro general",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-paro-epa-general", "hev-tiempo-parcial-involunt"],
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
    methodologyNote:
      "Promedio anual de la tasa EPA. Proyección IMF basada en su modelo macro España — útil para benchmark pero ojo: revisiones de los pronósticos suelen ser optimistas en expansión y conservadoras en recesión.",
    releaseSchedule: "Anual · WEO abril+octubre",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["hev-paro-epa-general"],
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
    methodologyNote:
      "IPC base 2021. Cesta de 939 artículos ponderados por gasto medio. Lectura adelantada (IPCA) sale 2-3 días antes del IPC nacional. Para análisis ciclo monetario usar IPCA armonizado, no nacional.",
    releaseSchedule: "Mensual · publicación 13-14 día siguiente mes",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-ipc-mensual", "hev-etcl-coste-laboral"],
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
    methodologyNote:
      "Variación m/m sin desestacionalizar. España tiene picos típicos en julio (rebajas) y enero (precios públicos). Para tendencia subyacente mirar la versión core (sin alimentos+energía) o IPC subyacente trimestral.",
    releaseSchedule: "Mensual · igual que IPC anual",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-ipc-anual"],
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
    methodologyNote:
      "Índice base 2015=100. Construido a partir de las transacciones registradas en notarías (no precios de oferta). Sujeto a revisiones materiales por late-reporting + cambios composición territorial.",
    releaseSchedule: "Trimestral · publicación día 8-10 del 3er mes siguiente al trimestre",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["hev-ipv-nueva", "hev-ipv-segunda", "hev-tipo-hipoteca", "hev-sobrecarga-vivienda"],
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
    methodologyNote:
      "Sólo viviendas con primera transmisión. Volumen <15% del total transacciones → serie más volátil. Cambios composición geográfica (mucho rural vs urbano un trimestre) distorsionan.",
    releaseSchedule: "Trimestral · igual IPV general",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["hev-ipv-general", "hev-ipv-segunda"],
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
    methodologyNote:
      "85% de las transacciones residenciales. Mejor referencia de presión real sobre comprador típico. Cuidado: precios medianos por CCAA varían 4x entre Soria y Madrid — el agregado nacional puede ser engañoso.",
    releaseSchedule: "Trimestral · igual IPV general",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["hev-ipv-general", "hev-ipv-nueva", "hev-tipo-hipoteca"],
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
    methodologyNote:
      "Encuesta Trimestral Coste Laboral (ETCL). Incluye salario base + complementos + Seguridad Social a cargo empresa. NO incluye autónomos. Para salario neto trabajador real, restar SS empleado (~6.5%) + IRPF.",
    releaseSchedule: "Trimestral · publicación T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-ipc-anual", "hev-paro-epa-general"],
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
    methodologyNote:
      "Definición Eurostat housing cost overburden: hogares cuyo gasto en vivienda (alquiler + suministros + hipoteca interés + comunidad - subsidios) supera 40% renta disponible bruta. Encuesta SILC anual. Inquilinos urbanos: tasa real ~25-30%.",
    releaseSchedule: "Anual · publicación T+12 meses (datos 2023 publicados en 2024)",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-ipv-general", "hev-tipo-hipoteca"],
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
    methodologyNote:
      "F4 = préstamos (no incluye otros pasivos como comerciales). Sectores S14 (hogares) + S15 (ISFLSH instituciones sin fines de lucro). 75% es deuda hipotecaria, el resto consumo + autónomos.",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-tipo-hipoteca", "hev-euribor-12m", "rs-npl-banca"],
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
    methodologyNote:
      "SRG = ahorro bruto (incluye depreciación). Numerador = renta - consumo final. PC_HHGDIB = % renta disponible bruta hogares. Lectura ajustada estacionalmente — el dato sin desestacionalizar oscila ~3-5 pp por trimestre.",
    releaseSchedule: "Trimestral · T+100 días",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["hev-deuda-hogares-pib", "hev-ipc-anual"],
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
    methodologyNote:
      "Eurostat LFS trimestral · PC_ACT = % población activa. Aproximadamente 40-50% del total parados en España son LD (mucho más alto que media UE ~30%). Histéresis post-crisis: salir de paro LD requiere reciclaje activo.",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-paro-epa-general", "rs-paro-larga-duracion"],
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
    methodologyNote:
      "Subempleo: trabajan part-time pero querrían full-time. Más relevante que tasa paro para medir holgura del mercado laboral. España estructuralmente alta vs UE (~50%) por estacionalidad turismo + comercio.",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-paro-epa-general", "hev-paro-epa-jovenes"],
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
    methodologyNote:
      "Promedio mensual del tipo EURIBOR 12M publicado por EMMI. Es el tipo al que los bancos europeos se prestan dinero a 12 meses. Las hipotecas variables se revisan típicamente cada 6 o 12 meses contra esta referencia + diferencial fijo.",
    releaseSchedule: "Mensual · publicado primer día hábil del mes siguiente",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-tipo-hipoteca", "hev-deuda-hogares-pib", "rs-yield-10y-es"],
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
    methodologyNote:
      "MIR (Monetary Financial Institutions Interest Rate Statistics). TAE ponderada por volumen nuevo contratado en el mes. Diferencia con EURIBOR = margen comercial banca (típicamente 50-100 pb).",
    releaseSchedule: "Mensual · BdE Boletín Estadístico · T+30 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["hev-euribor-12m", "hev-deuda-hogares-pib", "hev-ipv-general"],
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
    methodologyNote:
      "Catálogo CKAN datos.gob.es: NO contiene valores agregados (% por respuesta) sino sólo metadata. Para series de % CIS por problema usar scraper PDF del Avance Resultados (pendiente Sprint N17).",
    releaseSchedule: "Mensual · CIS publica primer día hábil mes siguiente",
    confidenceLevel: "low",
    relatedIndicatorIds: ["hev-paro-epa-general", "hev-ipc-anual"],
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
