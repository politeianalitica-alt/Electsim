/**
 * Catálogo · Subtab "Dependencias externas" v4 (Sprint N6.2).
 *
 * REFUNDACIÓN. La versión anterior duplicaba cuenta corriente y deuda con
 * pulso-macro y flujos-capital. Esta versión se centra en LA ESTRUCTURA DEL
 * COMERCIO EXTERIOR ESPAÑOL: granularidad geográfica + sectorial.
 *
 * Foco: ¿de qué países, qué productos, cuánto pesan en PIB, qué dependencias
 * críticas (energía, tecnología), cómo evoluciona la apertura comercial?
 *
 * Sin solape con flujos-capital (BoP/IIP/IED) ni pulso-macro (CC agregada).
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
  },

  // ─── Concentración partners · proxy via REER broad ────────────────────
  {
    id: "de-reer-narrow",
    family: "exterior",
    label: "REER narrow (intra-EA) · BIS",
    shortLabel: "REER narrow",
    unit: "",
    decimals: 1,
    source: "BIS Effective Exchange Rates",
    sourceCode: "REER_NARROW:ES",
    frequency: "monthly",
    description:
      "REER narrow (27 socios principales, intra-EA pesa). Detecta pérdidas competitividad-precio frente al núcleo eurozona donde van 60% exports ES.",
    endpoint: "/api/bis/fx-effective",
    parser: "eurostat-simple",
    parserKey: "narrow",
    threshold: { amber: 105, red: 115, goodAbove: false },
    accent: "#7c3aed",
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
