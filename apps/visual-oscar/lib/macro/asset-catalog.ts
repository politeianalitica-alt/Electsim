/**
 * Catálogo de activos financieros para `/macro/mercados-activos/asset/[id]`.
 *
 * Cubre índices bursátiles, bonos, divisas y commodities con sus
 * fuentes y endpoints. Para v1 los precios se obtienen del agregador
 * Finnhub dashboard o commodities snapshot — históricos requieren
 * candles Finnhub (futuro).
 */

export type AssetClass = "equity_index" | "bond" | "fx" | "commodity" | "volatility";

export interface MarketAsset {
  id: string;
  label: string;
  shortLabel: string;
  assetClass: AssetClass;
  ticker?: string;
  geography?: string;
  currency: string;
  unit: string;
  primarySource: "finnhub" | "commodities" | "macro-finance" | "bis";
  finnhubSymbol?: string;
  commodityKey?: string;
  marketsKey?: string;
  description: string;
  macroSignal: string;
  relatedSubtabs: string[];
}

export const ASSET_CATALOG: MarketAsset[] = [
  // ── Índices bursátiles ───────────────────────────────────────────
  {
    id: "ibex35",
    label: "IBEX 35",
    shortLabel: "IBEX",
    assetClass: "equity_index",
    ticker: "^IBEX",
    geography: "España",
    currency: "EUR",
    unit: "puntos",
    primarySource: "finnhub",
    finnhubSymbol: "^IBEX",
    description: "Índice de las 35 mayores cotizadas españolas ponderado por capitalización ajustada por free-float.",
    macroSignal: "Termómetro de expectativas sobre beneficios empresariales españoles + spread soberano + tipos.",
    relatedSubtabs: ["mercados-activos", "empresas-beneficios", "riesgo-sistemico"],
  },
  {
    id: "sp500",
    label: "S&P 500",
    shortLabel: "S&P 500",
    assetClass: "equity_index",
    ticker: "^GSPC",
    geography: "Estados Unidos",
    currency: "USD",
    unit: "puntos",
    primarySource: "finnhub",
    finnhubSymbol: "^GSPC",
    description: "Índice de las 500 mayores cotizadas estadounidenses. Referencia global de equity risk-on.",
    macroSignal: "Risk appetite global · expectativas Fed · ciclo USA. Driver indirecto del IBEX vía correlación.",
    relatedSubtabs: ["mercados-activos"],
  },
  {
    id: "nasdaq100",
    label: "Nasdaq 100",
    shortLabel: "Nasdaq",
    assetClass: "equity_index",
    ticker: "^NDX",
    geography: "Estados Unidos",
    currency: "USD",
    unit: "puntos",
    primarySource: "finnhub",
    finnhubSymbol: "^NDX",
    description: "100 mayores cotizadas no financieras del Nasdaq. Proxy del sector tech global.",
    macroSignal: "Sensibilidad a tipos USA · momento growth/AI · vehiculo expectativas tecnológicas.",
    relatedSubtabs: ["mercados-activos"],
  },
  {
    id: "eurostoxx50",
    label: "EuroStoxx 50",
    shortLabel: "EuroStoxx",
    assetClass: "equity_index",
    ticker: "^STOXX50E",
    geography: "Eurozona",
    currency: "EUR",
    unit: "puntos",
    primarySource: "finnhub",
    finnhubSymbol: "^STOXX50E",
    description: "50 mayores blue chips de la eurozona. Referencia bursátil agregada eurozona.",
    macroSignal: "Visión BCE + ciclo europeo + competitividad cambiaria + márgenes europeos.",
    relatedSubtabs: ["mercados-activos", "regimen-monetario"],
  },

  // ── Commodities ───────────────────────────────────────────────────
  {
    id: "brent",
    label: "Petróleo Brent",
    shortLabel: "Brent",
    assetClass: "commodity",
    ticker: "BZ=F",
    currency: "USD",
    unit: "USD/barril",
    primarySource: "commodities",
    commodityKey: "brent",
    description: "Benchmark global del crudo. Driver clave de inflación energética y márgenes en transporte e industria.",
    macroSignal: "Inflación importada · márgenes industriales · saldo energético · riesgo geopolítico.",
    relatedSubtabs: ["mercados-activos", "regimen-monetario", "hogares-empleo-vivienda"],
  },
  {
    id: "gold",
    label: "Oro",
    shortLabel: "Oro",
    assetClass: "commodity",
    ticker: "GC=F",
    currency: "USD",
    unit: "USD/onza",
    primarySource: "commodities",
    commodityKey: "gold",
    description: "Activo refugio histórico. Sube en risk-off, inflación persistente o deterioro confianza institucional.",
    macroSignal: "Risk-off · expectativas inflación · debilidad USD · demanda banco central emergente.",
    relatedSubtabs: ["mercados-activos", "riesgo-sistemico"],
  },
  {
    id: "copper",
    label: "Cobre",
    shortLabel: "Cobre",
    assetClass: "commodity",
    ticker: "HG=F",
    currency: "USD",
    unit: "USD/libra",
    primarySource: "commodities",
    commodityKey: "copper",
    description: "Indicador adelantado de actividad industrial global (\"Dr. Copper\"). Sube con expansión, cae en contracción.",
    macroSignal: "Ciclo industrial global · demanda china · transición eléctrica · construcción.",
    relatedSubtabs: ["mercados-activos", "productividad-competitividad"],
  },
  {
    id: "bdi",
    label: "Baltic Dry Index",
    shortLabel: "BDI",
    assetClass: "commodity",
    ticker: "^BDI",
    currency: "USD",
    unit: "índice",
    primarySource: "commodities",
    commodityKey: "bdi",
    description: "Coste de fletes marítimos de graneles secos. Lead indicator de comercio internacional físico.",
    macroSignal: "Demanda comercio global · cuellos de botella logísticos · ciclo manufacturero.",
    relatedSubtabs: ["mercados-activos", "dependencias-externas"],
  },
];

export function getAsset(id: string): MarketAsset | undefined {
  return ASSET_CATALOG.find((a) => a.id === id);
}

export function listAssets(): MarketAsset[] {
  return ASSET_CATALOG;
}

export function listAssetsByClass(assetClass: AssetClass): MarketAsset[] {
  return ASSET_CATALOG.filter((a) => a.assetClass === assetClass);
}
