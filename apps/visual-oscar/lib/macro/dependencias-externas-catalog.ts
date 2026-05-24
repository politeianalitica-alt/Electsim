/**
 * Catálogo · Subtab "Dependencias externas" v4 (Sprint N6.2 + N17).
 *
 * REFUNDACIÓN. La versión anterior duplicaba cuenta corriente y deuda con
 * pulso-macro y flujos-capital. Esta versión se centra en LA ESTRUCTURA DEL
 * COMERCIO EXTERIOR ESPAÑOL: granularidad geográfica + sectorial.
 *
 * Foco: ¿de qué países, qué productos, cuánto pesan en PIB, qué dependencias
 * críticas (energía, tecnología), cómo evoluciona la apertura comercial?
 *
 * Sin solape con flujos-capital (BoP/IIP/IED) ni pulso-macro (CC agregada).
 * Sprint N17 · methodology + release + confidence + related ids.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const DEPENDENCIAS_EXTERNAS_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Apertura comercial · exports + imports %PIB ─────────────────────
  {
    id: "de-apertura-exports",
    family: "exterior",
    label: "Exportaciones bienes+servicios %PIB",
    shortLabel: "X %PIB",
    unit: "%",
    decimals: 1,
    source: "Eurostat · namq_10_gdp",
    sourceCode: "namq_10_gdp:P6:ES",
    frequency: "quarterly",
    description:
      "Exportaciones reales de bienes y servicios sobre PIB. España ~37% PIB, vs DEU 50%, FRA 32%. Mide la apertura externa estructural.",
    endpoint: "/api/eurostat/dataset?code=namq_10_gdp&filters=geo=ES;na_item=P6;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 35, red: 30, goodAbove: true },
    accent: "#0F766E",
    methodologyNote:
      "P6 = Exports of goods and services. Volumen real (no nominal). España ha pasado de ~25% pre-2008 a ~37% post-crisis — recomposición estructural hacia economía exportadora.",
    releaseSchedule: "Trimestral · T+90 días (mismas fechas CNT INE)",
    confidenceLevel: "high",
    relatedIndicatorIds: ["de-apertura-imports", "de-servicios-export", "exports-yoy"],
  },
  {
    id: "de-apertura-imports",
    family: "exterior",
    label: "Importaciones bienes+servicios %PIB",
    shortLabel: "M %PIB",
    unit: "%",
    decimals: 1,
    source: "Eurostat · namq_10_gdp",
    sourceCode: "namq_10_gdp:P7:ES",
    frequency: "quarterly",
    description:
      "Importaciones reales sobre PIB. Apertura por el lado de demanda. Su diferencia con exports = saldo exterior neto. Crecimiento >exports indica déficit exterior.",
    endpoint: "/api/eurostat/dataset?code=namq_10_gdp&filters=geo=ES;na_item=P7;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#f97316",
    methodologyNote:
      "P7 = Imports of goods and services. Co-evoluciona con la demanda interna. Componente energía importa ~25% — sensible a precio gas/petróleo.",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["de-apertura-exports", "de-import-petroleo", "de-import-gas"],
  },

  // ─── Comercio servicios · turismo y servicios no-turismo ──────────────
  {
    id: "de-servicios-export",
    family: "exterior",
    label: "Exportaciones servicios YoY",
    shortLabel: "Serv. exp",
    unit: "%",
    decimals: 1,
    source: "Eurostat · bop_its6_det",
    sourceCode: "bop_its6_det:S:ES",
    frequency: "quarterly",
    description:
      "Variación interanual exportaciones de servicios (turismo, transporte, tech). España es 2º exportador mundial servicios per cápita. Driver del superávit por cuenta corriente.",
    endpoint: "/api/eurostat/dataset?code=bop_its6_det&filters=geo=ES;bop_item=S",
    parser: "eurostat-simple",
    accent: "#16a34a",
    methodologyNote:
      "Item S = Services (BoP). Incluye turismo (~50%) + transporte + servicios empresariales/profesionales + ICT + royalties. Driver clave del superávit cuenta corriente post-2013.",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["de-turistas-anual", "de-apertura-exports", "cuenta-corriente"],
  },

  // ─── Comercio bienes · INE Aduanas mensual ────────────────────────────
  {
    id: "de-bienes-export-mensual",
    family: "exterior",
    label: "Exportaciones bienes mensual",
    shortLabel: "X bienes",
    unit: "M€",
    decimals: 0,
    source: "INE · Comercio Exterior",
    sourceCode: "COMERCIO_EXT_EXPORT",
    frequency: "monthly",
    description:
      "Valor mensual exportaciones bienes (Aduanas). Sigue de cerca el ciclo industrial y la demanda externa. Más fino que CNT trimestral.",
    endpoint: "/api/ine/cnt-extra?n=36",
    parser: "ine-cnt-extra",
    parserKey: "exports",
    accent: "#0891b2",
    methodologyNote:
      "Datos Aduanas (no balanza pagos). Valor nominal en miles de €. Sujeto a revisión 2-3 meses por reclasificación arancelaria. Mensualmente más volátil que trimestral CNT.",
    releaseSchedule: "Mensual · publicación T+50 días (INE Comercio Exterior)",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["de-apertura-exports", "exports-yoy"],
  },

  // ─── Dependencia energética ─────────────────────────────────────────
  {
    id: "de-energia-dependence",
    family: "exterior",
    label: "Dependencia energética neta",
    shortLabel: "Energía",
    unit: "%",
    decimals: 1,
    source: "Eurostat · nrg_ind_id",
    sourceCode: "nrg_ind_id:ES",
    frequency: "annual",
    description:
      "% del consumo bruto energético importado. España ~67% vs UE 58%. Vulnerabilidad clave: shock energético 2022 disparó la importación neta (gas natural, petróleo).",
    endpoint: "/api/eurostat/dataset?code=nrg_ind_id&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 60, red: 75, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "Net imports / gross inland energy consumption × 100. Captura dependencia agregada. España: petróleo 99%, gas ~99%, carbón en declive. Renovables crecientes reducen ratio gradualmente.",
    releaseSchedule: "Anual · publicación T+15 meses (datos 2023 publicados marzo 2025)",
    confidenceLevel: "high",
    relatedIndicatorIds: ["de-import-petroleo", "de-import-gas"],
  },

  // ─── Saldo turístico · key driver superávit ───────────────────────────
  {
    id: "de-turistas-anual",
    family: "exterior",
    label: "Turistas internacionales anual",
    shortLabel: "Turistas",
    unit: "M",
    decimals: 1,
    source: "INE · FRONTUR",
    sourceCode: "FRONTUR23988",
    frequency: "monthly",
    description:
      "Millones de turistas internacionales (FRONTUR). 2º país del mundo por llegadas (84M en 2023). Driver del superávit por cuenta corriente y ~12% PIB directo.",
    endpoint: "/api/ine/frontur?n=36",
    parser: "ine-frontur",
    accent: "#0F766E",
    methodologyNote:
      "FRONTUR = Encuesta Movimientos Turísticos en Fronteras. Cuenta llegadas (no pernoctaciones ni gastos). Para gasto medio + estancia ver EGATUR. Estacionalidad fuerte: julio-agosto ~30% del total anual.",
    releaseSchedule: "Mensual · publicación T+25 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["de-servicios-export", "ma-aena-mc"],
  },

  // Sprint N13.1 cleanup · de-reer-narrow removido · REER vive en mercados-activos.

  // ─── Sprint N13.2 · Comercio bilateral con partners clave ────────────
  {
    id: "de-bop-deu",
    family: "exterior",
    label: "Saldo bilateral con Alemania %PIB",
    shortLabel: "Saldo DEU",
    unit: "%",
    decimals: 2,
    source: "Eurostat · bop_c6_q",
    sourceCode: "bop_c6_q:CA:DEU",
    frequency: "quarterly",
    description:
      "Saldo balanza corriente bilateral con Alemania (1º socio comercial UE ES ~13% exports). Indica dependencia ciclo industrial alemán y automoción.",
    endpoint: "/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;partner=DE;sector10=S1;bop_item=CA;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#0F766E",
    methodologyNote:
      "Cuenta corriente bilateral (bienes + servicios + rentas + transferencias). España es tradicionalmente déficit bilateral con DEU (importa máquinas + automoción). Recesión industria DE en 2023-24 reduce exports ES.",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["de-bop-usa", "de-bop-chn"],
  },
  {
    id: "de-bop-usa",
    family: "exterior",
    label: "Saldo bilateral con EE.UU. %PIB",
    shortLabel: "Saldo USA",
    unit: "%",
    decimals: 2,
    source: "Eurostat · bop_c6_q",
    sourceCode: "bop_c6_q:CA:USA",
    frequency: "quarterly",
    description:
      "Saldo bilateral con Estados Unidos. Sensible a tariffs Trump · 8% exports + servicios tech/turismo. Driver de tensión geo-comercial.",
    endpoint: "/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;partner=US;sector10=S1;bop_item=CA;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#dc2626",
    methodologyNote:
      "Cuenta corriente bilateral. Vulnerabilidad: tarifas EU-US (2018-19 Trump, 2025+ Trump 2.0) afectan aceite, vino, lácteos, acero. España exporta US ~8% del total + servicios turismo.",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["de-bop-deu", "ma-eurusd"],
  },
  {
    id: "de-bop-chn",
    family: "exterior",
    label: "Saldo bilateral con China %PIB",
    shortLabel: "Saldo CHN",
    unit: "%",
    decimals: 2,
    source: "Eurostat · bop_c6_q",
    sourceCode: "bop_c6_q:CA:CHN",
    frequency: "quarterly",
    description:
      "Saldo bilateral con China · ES típicamente déficit estructural (importa más de lo que exporta). Mide dependencia bienes intermedios + ICT.",
    endpoint: "/api/eurostat/dataset?code=bop_c6_q&filters=geo=ES;partner=CN_X_HK;sector10=S1;bop_item=CA;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#a16207",
    methodologyNote:
      "CN_X_HK excluye Hong Kong. Déficit estructural ~2% PIB. Composición import: paneles solares + baterías + textil + maquinaria. Risk: dual-use tech + dependencia minerales críticos (litio, tierras raras).",
    releaseSchedule: "Trimestral · T+90 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["de-bop-deu", "de-bop-usa", "de-htec-trade"],
  },
  {
    id: "de-htec-trade",
    family: "exterior",
    label: "Exports alta tecnología %total",
    shortLabel: "X hi-tech",
    unit: "%",
    decimals: 1,
    source: "Eurostat · htec_si_exp4",
    sourceCode: "htec_si_exp4:ES",
    frequency: "annual",
    description:
      "Exportaciones productos alta tecnología sobre total exports. España ~6% vs UE 15% · gap estructural de complejidad económica. ECI rank ~33 mundial.",
    endpoint: "/api/eurostat/dataset?code=htec_si_exp4&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 8, red: 5, goodAbove: true },
    accent: "#7c3aed",
    methodologyNote:
      "Definición OCDE/Eurostat hi-tech: aerospace + pharma + computers + electronics + scientific instruments. España gap con UE explicado por baja participación pharma + electronics. Sintoma del modelo productivo.",
    releaseSchedule: "Anual · publicación T+12 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pc-id-empresarial", "pc-patentes-epo-eurostat"],
  },
  {
    id: "de-import-petroleo",
    family: "exterior",
    label: "Importaciones netas petróleo %consumo",
    shortLabel: "Petróleo M",
    unit: "%",
    decimals: 1,
    source: "Eurostat · nrg_te_oilm",
    sourceCode: "nrg_te_oilm:ES",
    frequency: "monthly",
    description:
      "Importaciones netas mensuales petróleo % consumo nacional. España ~99% dependencia · vulnerabilidad supply shock + precio Brent.",
    endpoint: "/api/eurostat/dataset?code=nrg_te_oilm&filters=geo=ES",
    parser: "eurostat-simple",
    threshold: { amber: 90, red: 98, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "Net imports / inland consumption (oil products). España no tiene producción nacional relevante. Fuentes: Arabia Saudí + Nigeria + México + USA. Sensibilidad refinerías Repsol/Cepsa.",
    releaseSchedule: "Mensual · T+60 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["de-energia-dependence", "de-import-gas"],
  },
  {
    id: "de-import-gas",
    family: "exterior",
    label: "Importaciones netas gas natural",
    shortLabel: "Gas M",
    unit: " TJ",
    decimals: 0,
    source: "Eurostat · nrg_cb_gasm",
    sourceCode: "nrg_cb_gasm:IMP_MAR_T:ES",
    frequency: "monthly",
    description:
      "Importaciones mensuales gas natural (terajulios). Tras Argelia conflict 2022, ES diversificó hacia USA LNG. Sensibilidad a precio TTF + invierno.",
    endpoint: "/api/eurostat/dataset?code=nrg_cb_gasm&filters=geo=ES;nrg_bal=IMP_MAR_T",
    parser: "eurostat-simple",
    accent: "#f59e0b",
    methodologyNote:
      "IMP_MAR_T = imports total (gaseoducto + LNG). España tiene 6 plantas LNG (Barcelona, Bilbao, Cartagena, Huelva, Sagunto, Mugardos) — única conectividad UE sur. Re-export a Europa central 2022-23 (gas hub strategy).",
    releaseSchedule: "Mensual · T+60 días",
    confidenceLevel: "high",
    relatedIndicatorIds: ["de-energia-dependence", "de-import-petroleo"],
  },

  // ─── Exports growth · IMF anual ───────────────────────────────────────
  {
    id: "de-exports-yoy",
    family: "exterior",
    label: "Exportaciones reales YoY (IMF)",
    shortLabel: "X YoY",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "TX_RPCH",
    frequency: "annual",
    description:
      "Crecimiento exportaciones reales anual + forecast IMF. Visión a medio plazo de la robustez exportadora vs ciclo de comercio mundial.",
    endpoint: "/api/imf/country?iso=ESP&indicator=TX_RPCH",
    parser: "imf-country",
    imfIndicator: "TX_RPCH",
    threshold: { amber: 3, red: 0, goodAbove: true },
    accent: "#0F766E",
    methodologyNote:
      "TX_RPCH = volume of exports of goods and services. Anual + 5y forecast. IMF suele sub-estimar el rebound exportador post-recesión (visto en 2010-13 y 2021-22).",
    releaseSchedule: "Anual · WEO abril+octubre",
    confidenceLevel: "high",
    relatedIndicatorIds: ["de-apertura-exports", "de-imports-yoy"],
  },

  // ─── Imports growth · IMF anual ───────────────────────────────────────
  {
    id: "de-imports-yoy",
    family: "exterior",
    label: "Importaciones reales YoY (IMF)",
    shortLabel: "M YoY",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "TM_RPCH",
    frequency: "annual",
    description:
      "Crecimiento importaciones reales. Procíclica con demanda interna. Su diferencia con exports indica contribución neta del sector exterior al PIB.",
    endpoint: "/api/imf/country?iso=ESP&indicator=TM_RPCH",
    parser: "imf-country",
    imfIndicator: "TM_RPCH",
    accent: "#f97316",
    methodologyNote:
      "TM_RPCH = volume of imports of goods and services. Driven by demanda interna y precios relativos. Multiplicador alto: cada +1pp consumo añade ~0.4pp imports.",
    releaseSchedule: "Anual · WEO abril+octubre",
    confidenceLevel: "high",
    relatedIndicatorIds: ["de-exports-yoy", "consumo-hogares-yoy"],
  },
];

export const DEPENDENCIAS_EXTERNAS_META = {
  slug: "dependencias-externas",
  label: "Dependencias externas",
  shortLabel: "Externo",
  accent: "#7c3aed",
  description:
    "Estructura del comercio exterior español: apertura X/M %PIB, servicios vs bienes, turismo (driver clave), dependencia energética crítica, REER narrow intra-EA, evolución X/M anual. Sin solape con flujos-capital (BoP/IIP) ni pulso-macro (CC agregada).",
};
