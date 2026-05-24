/**
 * Catálogo de indicadores · subtab "Margen fiscal" v3.
 *
 * Foco: stock deuda, déficit total/primario, intereses, ingresos y gasto
 * AAPP. Todo IMF WEO anual con histórica + forecast + Eurostat oficiales
 * + Tesoro snapshot mensual.
 *
 * Sprint N16: cada indicador lleva methodologyNote + releaseSchedule +
 * confidenceLevel + relatedIndicatorIds para que el analista entienda
 * lo que está mirando (revisiones, definición, contraindicaciones).
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const MARGEN_FISCAL_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Familia PIB (referente para ratios) ─────────────────────────────
  {
    id: "mf-deuda-imf",
    family: "pib",
    label: "Deuda pública %PIB (Maastricht)",
    shortLabel: "Deuda %PIB",
    unit: "%",
    decimals: 1,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGXWDG_NGDP",
    frequency: "annual",
    description:
      "Stock de deuda pública (Maastricht definition) sobre PIB. Regla UE: límite 60%. Crítico para sostenibilidad fiscal.",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGXWDG_NGDP",
    parser: "imf-country",
    imfIndicator: "GGXWDG_NGDP",
    threshold: { amber: 100, red: 120, goodAbove: false },
    accent: "#0F766E",
    methodologyNote:
      "Stock deuda bruta consolidada de las AAPP (S13) según definición Maastricht (sectorizada SEC2010, valor nominal). Coincide con Eurostat gov_10dd_ggdebt a cierre fiscal, pero IMF añade proyecciones 5y revisadas cada abril/octubre.",
    releaseSchedule: "Anual · WEO abril (preliminar) + octubre (revisado) · datos hasta T-1",
    confidenceLevel: "high",
    relatedIndicatorIds: ["mf-saldo-total", "mf-intereses-pib", "mf-deuda-trim", "rs-yield-10y-es"],
  },
  // Sprint N14: GGXWDN_NGDP IMF no devuelve datos en endpoint público.
  // La métrica de deuda neta requiere balance financiero AAPP que España no
  // publica de forma sistemática. Sustituido por carga intereses como proxy
  // del servicio de deuda neta (Eurostat gov_10a_main D41PAY).
  {
    id: "mf-intereses-pib",
    family: "pib",
    label: "Carga intereses deuda %PIB",
    shortLabel: "Intereses",
    unit: "%",
    decimals: 2,
    source: "Eurostat · gov_10a_main",
    sourceCode: "gov_10a_main:D41PAY:ES",
    frequency: "annual",
    description:
      "Pagos por intereses de la deuda pública %PIB. Proxy de servicio neto deuda · España ~2.3% (cada +50pb del 10Y se traslada en 3-5 años).",
    endpoint: "/api/eurostat/dataset?code=gov_10a_main&filters=geo=ES;na_item=D41PAY;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 2.5, red: 4, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "Intereses devengados (na_item=D41PAY) sector AAPP (S13) en PC_GDP. La transmisión de tipos al stock es gradual: cada año vence ~12% de la deuda, así un shock +100pb sostenido tarda 8-9 años en reflejarse plenamente.",
    releaseSchedule: "Anual · notificación PDE abril + octubre · revisiones materiales en t+2 años",
    confidenceLevel: "high",
    relatedIndicatorIds: ["mf-vida-media-deuda", "mf-coste-medio-emisiones", "rs-yield-10y-es"],
  },

  // ─── Familia Saldos ───────────────────────────────────────────────────
  {
    id: "mf-saldo-total",
    family: "forecast",
    label: "Saldo fiscal total %PIB",
    shortLabel: "Saldo total",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGXCNL_NGDP",
    frequency: "annual",
    description:
      "Saldo de las AAPP en %PIB. Regla Maastricht: −3% PIB como umbral de Procedimiento de Déficit Excesivo.",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGXCNL_NGDP",
    parser: "imf-country",
    imfIndicator: "GGXCNL_NGDP",
    threshold: { amber: -3, red: -6, goodAbove: true },
    accent: "#f59e0b",
    methodologyNote:
      "Capacidad/Necesidad financiación AAPP. Incluye one-offs (rescates, contingencias). Para visión limpia ciclo, usar el saldo estructural primario.",
    releaseSchedule: "Anual · WEO abril+octubre · primera estimación T+90 días por IGAE",
    confidenceLevel: "high",
    relatedIndicatorIds: ["mf-saldo-primario", "mf-saldo-estructural", "mf-saldo-trim-edp"],
  },
  // Sprint N14 fix: IMF GGXONLB_NGDP no devuelve datos en endpoint público.
  // Migrado a Eurostat gov_10dd_edpt1:B9P:ES que es el saldo primario PDE oficial.
  {
    id: "mf-saldo-primario",
    family: "forecast",
    label: "Saldo primario %PIB",
    shortLabel: "Primario",
    unit: "%",
    decimals: 2,
    source: "Eurostat · gov_10dd_edpt1",
    sourceCode: "gov_10dd_edpt1:B9P:ES",
    frequency: "annual",
    description:
      "Saldo público excluyendo intereses. Diferencia con saldo total = carga intereses %PIB. Eurostat oficial PDE.",
    endpoint: "/api/eurostat/dataset?code=gov_10dd_edpt1&filters=geo=ES;na_item=B9P;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 0, red: -2, goodAbove: true },
    accent: "#10b981",
    methodologyNote:
      "B9P = capacidad financiación primaria (sin intereses) según notificación PDE. Es el indicador clave de sostenibilidad: si supera g-r (crecimiento - tipo medio), la deuda/PIB baja.",
    releaseSchedule: "Anual · notificación PDE abril+octubre · cierre cuasi-definitivo en T+2 años",
    confidenceLevel: "high",
    relatedIndicatorIds: ["mf-saldo-total", "mf-intereses-pib", "mf-saldo-estructural"],
  },
  // Sprint N14 fix: GGSB_NGDP IMF no público. Sustituido por saldo estructural
  // AMECO (vía Eurostat ei_isfb_n) que sí está accesible.
  {
    id: "mf-saldo-estructural",
    family: "forecast",
    label: "Saldo estructural primario %PIB",
    shortLabel: "Estructural",
    unit: "%",
    decimals: 2,
    source: "Eurostat · ei_isfb_n",
    sourceCode: "ei_isfb_n:STA_PRIM:ES",
    frequency: "annual",
    description:
      "Saldo estructural primario (cíclicamente ajustado, sin intereses ni one-offs). Métrica AMECO/AIReF/Pacto Estabilidad para evaluar política fiscal subyacente.",
    endpoint: "/api/eurostat/dataset?code=ei_isfb_n&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: -1, red: -3, goodAbove: true },
    accent: "#7c3aed",
    methodologyNote:
      "STA_PRIM = saldo estructural primario AMECO/COMM. Ajustado por output gap (modelo Hodrick-Prescott) y one-offs identificados. Sujeto a revisiones materiales cuando se revisa el output gap potencial.",
    releaseSchedule: "Anual + actualización semestral con ECFIN forecasts",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["mf-saldo-primario", "mf-saldo-total"],
  },

  // ─── Familia Ingresos/Gasto · Eurostat gov_10a_main (más fiable que IMF) ──
  // Sprint N14 fix: GGR_NGDP IMF devuelve null en endpoint público
  {
    id: "mf-ingresos-aapp",
    family: "demanda",
    label: "Ingresos AAPP %PIB",
    shortLabel: "Ingresos",
    unit: "%",
    decimals: 2,
    source: "Eurostat · gov_10a_main",
    sourceCode: "gov_10a_main:TR:ES",
    frequency: "annual",
    description:
      "Total revenue (TR) AAPP %PIB. Capacidad recaudatoria global · comparable con DE (~46%), FR (~52%), IT (~47%), PT (~43%).",
    endpoint: "/api/eurostat/dataset?code=gov_10a_main&filters=geo=ES;na_item=TR;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#16a34a",
    methodologyNote:
      "TR = Total Revenue (impuestos + cotizaciones + ventas + transferencias recibidas). España estructuralmente ~5 puntos por debajo media UE — gap explicado por economía sumergida + bases imponibles reducidas + tipos efectivos bajos en IS.",
    releaseSchedule: "Anual · notificación PDE abril+octubre",
    confidenceLevel: "high",
    relatedIndicatorIds: ["mf-gasto-aapp", "mf-recaudacion-d5", "mf-recaudacion-d2"],
  },
  {
    id: "mf-gasto-aapp",
    family: "demanda",
    label: "Gasto AAPP %PIB",
    shortLabel: "Gasto",
    unit: "%",
    decimals: 2,
    source: "Eurostat · gov_10a_main",
    sourceCode: "gov_10a_main:TE",
    frequency: "annual",
    description:
      "Total expenditure (TE) AAPP en %PIB. Sprint L F3/F6: migrado de IMF GGX_NGDP (no devolvía datos) a Eurostat gov_10a_main que sí los publica.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_main&filters=geo=ES;na_item=TE;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#dc2626",
    methodologyNote:
      "TE = Total Expenditure (consumo + transferencias + intereses + inversión). Diferencia con TR = saldo total. España estructuralmente más austera en gasto público / PIB vs media UE, pero más rígida (pensiones+intereses+desempleo ~55%).",
    releaseSchedule: "Anual · notificación PDE abril+octubre",
    confidenceLevel: "high",
    relatedIndicatorIds: ["mf-ingresos-aapp", "mf-prestaciones-d62", "mf-saldo-total"],
  },
  {
    id: "mf-deuda-bruta-eurostat",
    family: "pib",
    label: "Deuda bruta consolidada Eurostat %PIB",
    shortLabel: "Deuda Eurostat",
    unit: "%",
    decimals: 1,
    source: "Eurostat · gov_10dd_ggdebt",
    sourceCode: "gov_10dd_ggdebt:GD:ES",
    frequency: "annual",
    description:
      "Deuda pública bruta consolidada Maastricht %PIB · Sprint N13.1 fix: label corregido (era 'neta' pero filtra GD=bruta). Datos Eurostat oficiales notificación PDE.",
    endpoint: "/api/eurostat/dataset?code=gov_10dd_ggdebt&filters=geo=ES;sector=S13;unit=PC_GDP;na_item=GD",
    parser: "eurostat-simple",
    threshold: { amber: 100, red: 120, goodAbove: false },
    accent: "#0F766E",
    methodologyNote:
      "Cifra oficial UE Maastricht (notificación PDE). Coincide con IMF GGXWDG_NGDP pero sin proyecciones — para forecast usar mf-deuda-imf.",
    releaseSchedule: "Anual · notificación PDE 30 marzo + 30 septiembre",
    confidenceLevel: "high",
    relatedIndicatorIds: ["mf-deuda-imf", "mf-deuda-trim"],
  },

  // ─── Sprint N13.2 · Granularidad fiscal · saldo trimestral + subsectores ─
  {
    id: "mf-saldo-trim-edp",
    family: "forecast",
    label: "Saldo EDP trimestral",
    shortLabel: "Saldo trim.",
    unit: "%",
    decimals: 2,
    source: "Eurostat · gov_10dd_edpt1",
    sourceCode: "gov_10dd_edpt1:B9:ES",
    frequency: "quarterly",
    description:
      "Saldo público según definición EDP (Procedimiento Déficit Excesivo). Notificación cuatrimestral por la Comisión Europea · más fino que IMF anual.",
    endpoint: "/api/eurostat/dataset?code=gov_10dd_edpt1&filters=geo=ES;na_item=B9;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: -3, red: -6, goodAbove: true },
    accent: "#f59e0b",
    methodologyNote:
      "B9 = capacidad/necesidad financiación trimestral. Permite tracking intra-año del cumplimiento del objetivo de déficit anual. Lectura aislada del trimestre engañosa por estacionalidad fuerte (Q4 ingresos > gastos).",
    releaseSchedule: "Trimestral · publicación T+90 días",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["mf-saldo-total", "mf-deuda-trim"],
  },
  {
    id: "mf-deuda-trim",
    family: "pib",
    label: "Deuda trimestral %PIB",
    shortLabel: "Deuda trim.",
    unit: "%",
    decimals: 1,
    source: "Eurostat · gov_10q_ggdebt",
    sourceCode: "gov_10q_ggdebt:GD:ES",
    frequency: "quarterly",
    description:
      "Stock deuda trimestral consolidada Maastricht. Granularidad alta vs anual · permite detectar tendencias en T+90 días.",
    endpoint: "/api/eurostat/dataset?code=gov_10q_ggdebt&filters=geo=ES;sector=S13;unit=PC_GDP;na_item=GD",
    parser: "eurostat-simple",
    threshold: { amber: 100, red: 120, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "Stock fin trimestre Maastricht. Variaciones intra-año reflejan principalmente calendario emisiones Tesoro · no cambios estructurales.",
    releaseSchedule: "Trimestral · publicación T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["mf-deuda-bruta-eurostat", "mf-deuda-imf"],
  },
  {
    id: "mf-recaudacion-d5",
    family: "demanda",
    label: "Impuestos renta D5 %PIB",
    shortLabel: "IRPF+IS",
    unit: "%",
    decimals: 1,
    source: "Eurostat · gov_10a_taxag",
    sourceCode: "gov_10a_taxag:D5:ES",
    frequency: "annual",
    description:
      "Impuestos directos sobre renta y patrimonio (IRPF + IS + Patrimonio + ITP). Capacidad recaudatoria estructural · refleja productividad de la base imponible.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_taxag&filters=geo=ES;na_item=D5;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#16a34a",
    methodologyNote:
      "D5 incluye IRPF (~7% PIB) + IS (~2.5%) + Patrimonio + ITP + IAJD. Sensible al ciclo (beneficios + plusvalías). Reforma fiscal 2014-15 redujo bases tipos máximos.",
    releaseSchedule: "Anual · publicación octubre del año T+1",
    confidenceLevel: "high",
    relatedIndicatorIds: ["mf-recaudacion-d2", "mf-ingresos-aapp"],
  },
  {
    id: "mf-recaudacion-d2",
    family: "demanda",
    label: "Impuestos producción D2 %PIB",
    shortLabel: "IVA+ind.",
    unit: "%",
    decimals: 1,
    source: "Eurostat · gov_10a_taxag",
    sourceCode: "gov_10a_taxag:D2:ES",
    frequency: "annual",
    description:
      "Impuestos sobre producción e importaciones (IVA, II.EE., aranceles). Más estable que renta · refleja ciclo de consumo.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_taxag&filters=geo=ES;na_item=D2;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#0EA5E9",
    methodologyNote:
      "D2 = IVA (~6.5% PIB) + II.EE. (~2%) + aranceles + cotizaciones a la producción. Más estable cíclicamente que D5 porque la base es consumo (lectura procíclica suave).",
    releaseSchedule: "Anual · publicación octubre del año T+1",
    confidenceLevel: "high",
    relatedIndicatorIds: ["mf-recaudacion-d5", "mf-ingresos-aapp"],
  },
  // ─── Sprint N15 · Tesoro Público snapshot · vida media + tenedores ──
  {
    id: "mf-vida-media-deuda",
    family: "forecast",
    label: "Vida media deuda Tesoro (años)",
    shortLabel: "Vida media",
    unit: " a",
    decimals: 2,
    source: "Tesoro Público · boletín mensual",
    sourceCode: "vida_media_deuda_anios",
    frequency: "monthly",
    description:
      "Duración media residual del stock de deuda pública en circulación. España ~7.9 años · cuanto mayor, menor exposición refinanciación corto plazo.",
    endpoint: "/api/tesoro/snapshot",
    parser: "tesoro-snapshot",
    parserKey: "vida_media_deuda_anios",
    threshold: { amber: 7, red: 5, goodAbove: true },
    accent: "#7c3aed",
    methodologyNote:
      "Snapshot estático del último boletín mensual del Tesoro Público. Datos hardcoded sin auto-update (parser PDF pendiente N17). Vida media > coste medio sale tipos = blindaje contra subidas de tipos.",
    releaseSchedule: "Mensual · boletín Tesoro Público sobre día 25 (datos cierre mes anterior)",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["mf-coste-medio-emisiones", "mf-no-residentes-deuda", "rs-yield-10y-es"],
  },
  {
    id: "mf-no-residentes-deuda",
    family: "exterior",
    label: "% deuda en manos no-residentes",
    shortLabel: "No residentes",
    unit: "%",
    decimals: 1,
    source: "Tesoro Público · boletín mensual",
    sourceCode: "pct_no_residentes",
    frequency: "monthly",
    description:
      "Porcentaje de la deuda pública en manos de inversores no residentes (excluye BCE/Eurosistema). ~42% España. Mayor = más vulnerabilidad a sentimiento exterior.",
    endpoint: "/api/tesoro/snapshot",
    parser: "tesoro-snapshot",
    parserKey: "pct_no_residentes",
    threshold: { amber: 45, red: 55, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "Tenedores no-residentes excluyendo BCE/Eurosistema (que se contabiliza aparte ~31%). Sumando ambos, exposición exterior real ~73%. Importante distinguir: BCE = comprador estructural; no-residente = capital fugaz.",
    releaseSchedule: "Mensual · boletín Tesoro Público día 25",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["mf-vida-media-deuda", "rs-yield-10y-es"],
  },
  {
    id: "mf-coste-medio-emisiones",
    family: "forecast",
    label: "Coste medio emisiones nuevas (%)",
    shortLabel: "Coste emisiones",
    unit: "%",
    decimals: 2,
    source: "Tesoro Público · boletín mensual",
    sourceCode: "coste_medio_emisiones_pct",
    frequency: "monthly",
    description:
      "Coste medio ponderado de las emisiones brutas del año. Lead indicator del coste financiero futuro: cada subida BCE se transmite gradualmente al stock vía nuevas emisiones.",
    endpoint: "/api/tesoro/snapshot",
    parser: "tesoro-snapshot",
    parserKey: "coste_medio_emisiones_pct",
    threshold: { amber: 3.5, red: 5, goodAbove: false },
    accent: "#f59e0b",
    methodologyNote:
      "Coste anualizado ponderado por importe nominal. Lead indicator del coste medio del stock — cuando coste_emisiones > coste_stock, el coste medio del stock empieza a subir gradualmente vía vencimientos.",
    releaseSchedule: "Mensual · boletín Tesoro Público día 25",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["mf-vida-media-deuda", "mf-intereses-pib", "rs-yield-10y-es"],
  },

  {
    id: "mf-prestaciones-d62",
    family: "demanda",
    label: "Prestaciones sociales D62 %PIB",
    shortLabel: "Prest. sociales",
    unit: "%",
    decimals: 1,
    source: "Eurostat · gov_10a_main",
    sourceCode: "gov_10a_main:D62PAY:ES",
    frequency: "annual",
    description:
      "Prestaciones sociales (pensiones contributivas + desempleo + IT + viudedad). ~17% PIB ES · partida más grande del gasto AAPP · driver sostenibilidad fiscal envejecimiento.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_main&filters=geo=ES;na_item=D62PAY;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#7c3aed",
    methodologyNote:
      "D62PAY = prestaciones sociales en efectivo distintas de transferencias en especie. Incluye pensiones (Seguridad Social + Clases Pasivas), desempleo, IT, viudedad. Crecimiento tendencial +0.3 pp PIB/año por envejecimiento.",
    releaseSchedule: "Anual · publicación octubre del año T+1",
    confidenceLevel: "high",
    relatedIndicatorIds: ["mf-gasto-aapp", "mf-ingresos-aapp"],
  },
];

export const MARGEN_FISCAL_META = {
  slug: "margen-fiscal",
  label: "Margen fiscal",
  shortLabel: "Fiscal",
  accent: "#f59e0b",
  description:
    "Deuda, déficit, intereses, ingresos y gasto AAPP. Indicadores que determinan el espacio fiscal disponible.",
};
