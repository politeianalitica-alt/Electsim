/**
 * Catálogo de empresas cotizadas españolas tractoras (IBEX 35 core).
 *
 * Usado por:
 *   - /macro/empresas-beneficios/company/[id]
 *   - GET /api/macro/empresas-beneficios/company/[id]
 *   - POST /api/macro/ai/analyze-company
 *
 * Para v1 los snapshots se obtienen del agregador finnhub/dashboard
 * (spain_adrs). Históricos OHLC requieren candles Finnhub (futuro).
 */

export interface SpanishCompany {
  id: string;
  legalName: string;
  shortName: string;
  ticker: string;
  finnhubSymbol: string; // ADR US típicamente
  isin?: string;
  sector: string;
  region: string;
  geography: string;
  description: string;
  macroExposure: {
    interestRates: "high" | "medium" | "low";
    energy: "high" | "medium" | "low";
    fx: "high" | "medium" | "low";
    regulation: "high" | "medium" | "low";
    consumer: "high" | "medium" | "low";
  };
  /** Subtabs donde la empresa tiene relevancia analítica. */
  relatedSubtabs: string[];
}

export const COMPANY_CATALOG: SpanishCompany[] = [
  {
    id: "santander",
    legalName: "Banco Santander, S.A.",
    shortName: "Santander",
    ticker: "SAN.MC",
    finnhubSymbol: "SAN",
    isin: "ES0113900J37",
    sector: "banca",
    region: "madrid",
    geography: "Madrid · global",
    description:
      "Banco global con fuerte presencia en LatAm (Brasil, México, Chile), Europa (España, Reino Unido, Portugal, Polonia) y EEUU. Termómetro del ciclo crediticio internacional.",
    macroExposure: { interestRates: "high", energy: "low", fx: "high", regulation: "high", consumer: "high" },
    relatedSubtabs: ["empresas-beneficios", "regimen-monetario", "riesgo-sistemico", "flujos-capital"],
  },
  {
    id: "bbva",
    legalName: "Banco Bilbao Vizcaya Argentaria, S.A.",
    shortName: "BBVA",
    ticker: "BBVA.MC",
    finnhubSymbol: "BBVA",
    isin: "ES0113211835",
    sector: "banca",
    region: "pais-vasco",
    geography: "Bilbao · LatAm + Turquía",
    description:
      "Banco con exposición elevada a México, Turquía y España. Sensible a divisas emergentes y volatilidad EM.",
    macroExposure: { interestRates: "high", energy: "low", fx: "high", regulation: "high", consumer: "high" },
    relatedSubtabs: ["empresas-beneficios", "regimen-monetario", "flujos-capital"],
  },
  {
    id: "caixabank",
    legalName: "CaixaBank, S.A.",
    shortName: "CaixaBank",
    ticker: "CABK.MC",
    finnhubSymbol: "CABK",
    isin: "ES0140609019",
    sector: "banca",
    region: "valencia",
    geography: "Valencia · doméstico + Portugal",
    description:
      "Banco más doméstico de los tres grandes españoles. Proxy puro del ciclo de crédito hogares y pymes en España.",
    macroExposure: { interestRates: "high", energy: "low", fx: "low", regulation: "high", consumer: "high" },
    relatedSubtabs: ["empresas-beneficios", "regimen-monetario", "hogares-empleo-vivienda"],
  },
  {
    id: "iberdrola",
    legalName: "Iberdrola, S.A.",
    shortName: "Iberdrola",
    ticker: "IBE.MC",
    finnhubSymbol: "IBDRY",
    isin: "ES0144580Y14",
    sector: "energia",
    region: "pais-vasco",
    geography: "Bilbao · global",
    description:
      "Utility integrada con liderazgo en renovables, redes y generación. Exposición regulatoria alta y ciclo de tipos.",
    macroExposure: { interestRates: "high", energy: "high", fx: "medium", regulation: "high", consumer: "medium" },
    relatedSubtabs: ["empresas-beneficios", "regimen-monetario", "productividad-competitividad"],
  },
  {
    id: "endesa",
    legalName: "Endesa, S.A.",
    shortName: "Endesa",
    ticker: "ELE.MC",
    finnhubSymbol: "ELEZY",
    isin: "ES0130670112",
    sector: "energia",
    region: "madrid",
    geography: "Madrid · España + Portugal",
    description:
      "Filial española de Enel. Generación eléctrica y comercialización mayoritariamente doméstica. Sensible a precios mayoristas.",
    macroExposure: { interestRates: "high", energy: "high", fx: "low", regulation: "high", consumer: "medium" },
    relatedSubtabs: ["empresas-beneficios", "hogares-empleo-vivienda"],
  },
  {
    id: "repsol",
    legalName: "Repsol, S.A.",
    shortName: "Repsol",
    ticker: "REP.MC",
    finnhubSymbol: "REPYY",
    isin: "ES0173516115",
    sector: "energia",
    region: "madrid",
    geography: "Madrid · global",
    description:
      "Integrada de petróleo y gas con apuesta multienergía. Sensibilidad alta a precio Brent, márgenes refino y transición.",
    macroExposure: { interestRates: "medium", energy: "high", fx: "high", regulation: "high", consumer: "low" },
    relatedSubtabs: ["empresas-beneficios", "mercados-activos", "dependencias-externas"],
  },
  {
    id: "naturgy",
    legalName: "Naturgy Energy Group, S.A.",
    shortName: "Naturgy",
    ticker: "NTGY.MC",
    finnhubSymbol: "GASNF",
    isin: "ES0116870314",
    sector: "energia",
    region: "madrid",
    geography: "Madrid · global gas + redes",
    description:
      "Gasista con activos de distribución, generación y comercialización. Sensible a TTF y regulación.",
    macroExposure: { interestRates: "high", energy: "high", fx: "medium", regulation: "high", consumer: "low" },
    relatedSubtabs: ["empresas-beneficios", "dependencias-externas"],
  },
  {
    id: "inditex",
    legalName: "Industria de Diseño Textil, S.A.",
    shortName: "Inditex",
    ticker: "ITX.MC",
    finnhubSymbol: "IDEXY",
    isin: "ES0148396007",
    sector: "consumo",
    region: "galicia",
    geography: "Arteixo (A Coruña) · global",
    description:
      "Mayor minorista textil mundial (Zara, Bershka, Massimo Dutti…). Beneficios apalancados a consumo global, FX (USD/CNY) y costes logísticos.",
    macroExposure: { interestRates: "low", energy: "medium", fx: "high", regulation: "low", consumer: "high" },
    relatedSubtabs: ["empresas-beneficios", "productividad-competitividad", "mercados-activos"],
  },
  {
    id: "telefonica",
    legalName: "Telefónica, S.A.",
    shortName: "Telefónica",
    ticker: "TEF.MC",
    finnhubSymbol: "TEF",
    isin: "ES0178430E18",
    sector: "telecom",
    region: "madrid",
    geography: "Madrid · global LatAm",
    description:
      "Operadora telecom con presencia España, UK, Alemania, Brasil, Hispam. Apalancada (deuda alta), sensible a tipos.",
    macroExposure: { interestRates: "high", energy: "low", fx: "high", regulation: "high", consumer: "medium" },
    relatedSubtabs: ["empresas-beneficios", "regimen-monetario"],
  },
  {
    id: "aena",
    legalName: "Aena S.M.E., S.A.",
    shortName: "Aena",
    ticker: "AENA.MC",
    finnhubSymbol: "ANYYY",
    isin: "ES0105046009",
    sector: "infraestructuras",
    region: "madrid",
    geography: "Madrid · España + UK + LatAm",
    description:
      "Operador aeroportuario líder mundial por tráfico. Sensible a turismo, capacidad aérea y precios combustible.",
    macroExposure: { interestRates: "medium", energy: "medium", fx: "low", regulation: "high", consumer: "high" },
    relatedSubtabs: ["empresas-beneficios", "dependencias-externas"],
  },
  {
    id: "ferrovial",
    legalName: "Ferrovial SE",
    shortName: "Ferrovial",
    ticker: "FER.MC",
    finnhubSymbol: "FRRVF",
    isin: "NL0015001FS8",
    sector: "infraestructuras",
    region: "madrid",
    geography: "Países Bajos · global",
    description:
      "Concesionaria de autopistas, aeropuertos y construcción. Trasladó sede a Países Bajos en 2023. Activos USA (Heathrow, 407 ETR Canada).",
    macroExposure: { interestRates: "high", energy: "low", fx: "high", regulation: "high", consumer: "medium" },
    relatedSubtabs: ["empresas-beneficios", "flujos-capital"],
  },
  {
    id: "cellnex",
    legalName: "Cellnex Telecom, S.A.",
    shortName: "Cellnex",
    ticker: "CLNX.MC",
    finnhubSymbol: "CLLNY",
    isin: "ES0105066007",
    sector: "telecom",
    region: "cataluna",
    geography: "Barcelona · pan-europeo",
    description:
      "Mayor operador europeo de torres de telecomunicaciones. Negocio infraestructura, ingresos contractuales largos. Muy apalancado.",
    macroExposure: { interestRates: "high", energy: "low", fx: "low", regulation: "medium", consumer: "low" },
    relatedSubtabs: ["empresas-beneficios", "regimen-monetario"],
  },
];

export function getCompany(id: string): SpanishCompany | undefined {
  return COMPANY_CATALOG.find((c) => c.id === id);
}

export function listCompanies(): SpanishCompany[] {
  return COMPANY_CATALOG;
}

export function listCompaniesBySector(sector: string): SpanishCompany[] {
  return COMPANY_CATALOG.filter((c) => c.sector === sector);
}
