/**
 * Catálogo de indicadores · subtab "Margen fiscal" v3.
 *
 * Foco: stock deuda, déficit total/primario, intereses, ingresos y gasto
 * AAPP. Todo IMF WEO anual con histórica + forecast.
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
