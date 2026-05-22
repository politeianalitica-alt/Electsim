/**
 * Catálogo de indicadores · subtab "Mercados & activos" v3.
 *
 * Foco: lectura macro-financiera, no trading. Indicadores con SERIE
 * temporal que ayudan a leer si los mercados descuentan crecimiento,
 * inflación, tipos, riesgo fiscal y geopolítico.
 *
 * Snapshots de mercado (IBEX puntual, EUR/USD spot) se quedan en el
 * subtab clásico /macro?tab=mercados-activos por ahora.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const MERCADOS_ACTIVOS_INDICATORS: PulsoIndicatorMeta[] = [
  // ─── Familia Exterior · REER (proxy FX broad) ────────────────────────
  {
    id: "ma-reer-bis",
    family: "exterior",
    label: "REER broad · BIS",
    shortLabel: "REER",
    unit: "",
    decimals: 1,
    source: "BIS Effective Exchange Rates",
    sourceCode: "REER_BROAD",
    frequency: "monthly",
    description:
      "Tipo de cambio real efectivo broad. >100 = apreciación real (pérdida competitividad-precio); <100 = depreciación. Núcleo del canal FX.",
    endpoint: "/api/bis/fx-effective",
    parser: "eurostat-simple",
    parserKey: "broad",
    accent: "#0891b2",
  },

  // ─── Familia PIB · contexto de crecimiento ────────────────────────────
  {
    id: "ma-pib-imf",
    family: "pib",
    label: "PIB real · IMF NGDP_RPCH",
    shortLabel: "PIB IMF",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "NGDP_RPCH",
    frequency: "annual",
    description:
      "Crecimiento PIB real anual. Driver fundamental de bolsas y multiplicadores. Mercados descuentan crecimiento esperado.",
    endpoint: "/api/imf/country?iso=ESP&indicator=NGDP_RPCH",
    parser: "imf-country",
    imfIndicator: "NGDP_RPCH",
    accent: "#0F766E",
  },

  // ─── Familia Precios · driver bonos ──────────────────────────────────
  {
    id: "ma-inflacion-imf",
    family: "precios",
    label: "Inflación · IMF PCPIPCH",
    shortLabel: "Inflación",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "PCPIPCH",
    frequency: "annual",
    description:
      "Inflación anual + forecast. Driver clave de yields y política BCE. Mercados de bonos descuentan trayectoria de inflación.",
    endpoint: "/api/imf/country?iso=ESP&indicator=PCPIPCH",
    parser: "imf-country",
    imfIndicator: "PCPIPCH",
    threshold: { amber: 2, red: 4, goodAbove: false },
    accent: "#dc2626",
  },

  // ─── Familia Empleo · driver consumo + bolsa cíclica ─────────────────
  {
    id: "ma-paro-imf",
    family: "empleo",
    label: "Tasa paro · IMF LUR",
    shortLabel: "Paro",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "LUR",
    frequency: "annual",
    description:
      "Tasa de paro. Driver de demanda y beneficios cíclicos (consumo, retail, banca). Mercados de equity cíclico la siguen.",
    endpoint: "/api/imf/country?iso=ESP&indicator=LUR",
    parser: "imf-country",
    imfIndicator: "LUR",
    threshold: { amber: 12, red: 18, goodAbove: false },
    accent: "#f59e0b",
  },

  // ─── Familia PIB · deuda/riesgo soberano ─────────────────────────────
  {
    id: "ma-deuda-imf",
    family: "pib",
    label: "Deuda pública %PIB · IMF GGXWDG_NGDP",
    shortLabel: "Deuda %PIB",
    unit: "%",
    decimals: 1,
    source: "IMF DataMapper · WEO",
    sourceCode: "GGXWDG_NGDP",
    frequency: "annual",
    description:
      "Stock deuda %PIB. Driver del coste financiero soberano y del spread vs Bund. Determina espacio fiscal para sostener crecimiento.",
    endpoint: "/api/imf/country?iso=ESP&indicator=GGXWDG_NGDP",
    parser: "imf-country",
    imfIndicator: "GGXWDG_NGDP",
    threshold: { amber: 100, red: 120, goodAbove: false },
    accent: "#7c3aed",
  },

  // ─── Familia Exterior · cuenta corriente (riesgo balanza) ────────────
  {
    id: "ma-cuenta-corriente",
    family: "exterior",
    label: "Cuenta corriente %PIB · IMF BCA_NGDPD",
    shortLabel: "CC %PIB",
    unit: "%",
    decimals: 2,
    source: "IMF DataMapper · WEO",
    sourceCode: "BCA_NGDPD",
    frequency: "annual",
    description:
      "Saldo cuenta corriente sobre PIB. Indica si España financia o se financia exterior. Driver de FX y atractivo para flujos de cartera.",
    endpoint: "/api/imf/country?iso=ESP&indicator=BCA_NGDPD",
    parser: "imf-country",
    imfIndicator: "BCA_NGDPD",
    threshold: { amber: -2, red: -4, goodAbove: true },
    accent: "#0891b2",
  },
];

export const MERCADOS_ACTIVOS_META = {
  slug: "mercados-activos",
  label: "Mercados & activos",
  shortLabel: "Mercados",
  accent: "#7c3aed",
  description:
    "Lectura macro-financiera: cómo los activos descuentan crecimiento, inflación, tipos, riesgo fiscal y geopolítico. No es trading.",
};
