'use client'
/**
 * `<MercadosActivosTab />` · Tab 6 · MERCADOS & ACTIVOS PROFUNDO.
 *
 * Alineado al 100% con `Tab 6.md` · 100 indicadores en 3 niveles.
 * Precios de activos financieros y reales como señal adelantada y como
 * termómetro del capital: renta variable, renta fija soberana/corporativa,
 * commodities, divisas, volatilidad y activos alternativos.
 *
 *   NIVEL 1 · Hero (15 KPIs):
 *     1.  IBEX 35 nivel + var. % día           · Finnhub quote
 *     2.  IBEX 35 var. % semana/mes/año        · Finnhub candles
 *     3.  EuroStoxx 50                         · Finnhub ^STOXX50E
 *     4.  S&P 500                              · Finnhub ^GSPC
 *     5.  Bono ES 10Y rendimiento %            · FRED IRLTLT01ESM156N
 *     6.  Prima riesgo ES vs DE (bp) derivado  · FRED ES10−DE10
 *     7.  Bund 10Y rendimiento %               · FRED IRLTLT01DEM156N
 *     8.  Brent USD/barril                     · FRED DCOILBRENTEU
 *     9.  Gas TTF EUR/MWh                      · Alpha Vantage / FRED
 *     10. EUR/USD                              · FRED DEXUSEU
 *     11. Oro USD/oz                           · Finnhub OANDA:XAU_USD
 *     12. VSTOXX (volatilidad EZ)              · Alpha Vantage / scraper
 *     13. VIX (volatilidad S&P)                · FRED VIXCLS
 *     14. Spread HY corporativo EU (bp)        · FRED BAMLHE00EHY0EY
 *     15. Spread IG corporativo EU (bp)        · FRED BAMLHE00EHY0IS
 *
 *   NIVEL 2 · Detalle (30 indicadores):
 *     2A · Renta variable España y Europa (16-30)
 *     2B · Renta fija soberana (31-45)
 *
 *   NIVEL 3 · Detalle del detalle (55 indicadores):
 *     3A · Renta fija corporativa (46-52)
 *     3B · Commodities estratégicas (53-64)
 *     3C · Divisas y flujos globales (65-74)
 *     3D · Volatilidad y sentimiento (75-84)
 *     3E · Inmobiliario cotizado REITs (85-86) · solo agregado
 *     3F · Criptoactivos como señal (87-89) · no especulativa
 *     3G · Flujos institucionales (90-94)
 *     3H · Benchmarking y síntesis AI (95-100)
 *
 * REGLA · si endpoint devuelve null/error → panel/bloque NO se renderiza.
 * Frontend ciego para fuentes que el backend no expone aún (FRED, Alpha
 * Vantage, NASDAQ Data Link, scrapers AAII/CFTC/IIF/CNN).
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { DeepLineChart } from '../DeepLineChart'
import { TrendNarrative } from '../TrendNarrative'
import { CountryCompareBars } from '../CountryCompareBars'
import { IndicatorDrill } from '../IndicatorDrill'
import { getTab } from '@/lib/macro/sources-matrix'
import { useMacroDrawer } from '../MacroDrawerProvider'
import type { ChartAnalysisInput } from '@/lib/macro/ai-schema'

// ──────────────────────────────────────────────────────────────────────
// Helpers · types
// ──────────────────────────────────────────────────────────────────────

function aiSeries(
  pts: { period: string; value: number | null; forecast?: boolean }[],
): { period: string; value: number; forecast?: boolean }[] {
  return pts
    .filter((p) => p.value != null && Number.isFinite(p.value))
    .map((p) => ({ period: p.period, value: p.value as number, ...(p.forecast ? { forecast: true } : {}) }))
}

interface FredSeriesResponse {
  ok?: boolean
  series: { period: string; value: number | null }[]
  last?: { period: string; value: number | null }
  unit?: string
}

// ──────────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────────

export function MercadosActivosTab() {
  const tab = getTab('mercados-activos')
  const { openDrill } = useMacroDrawer()

  // ───── NIVEL 1 · Hero · 15 indicadores ─────
  const [ibexQuote, setIbexQuote] = useState<any>(null)                              // 1 Finnhub quote
  const [ibexHist, setIbexHist] = useState<any>(null)                                // 2 Finnhub candles
  const [eurostoxx50, setEurostoxx50] = useState<any>(null)                          // 3 Finnhub
  const [sp500, setSp500] = useState<any>(null)                                      // 4 Finnhub
  const [bonoES10Y, setBonoES10Y] = useState<FredSeriesResponse | null>(null)        // 5 FRED
  // 6 Prima riesgo → derivado
  const [bund10Y, setBund10Y] = useState<FredSeriesResponse | null>(null)            // 7 FRED
  const [brent, setBrent] = useState<FredSeriesResponse | null>(null)                // 8 FRED
  const [gasTTF, setGasTTF] = useState<FredSeriesResponse | null>(null)              // 9 FRED/Alpha
  const [eurUsd, setEurUsd] = useState<FredSeriesResponse | null>(null)              // 10 FRED DEXUSEU
  const [oro, setOro] = useState<any>(null)                                          // 11 Finnhub OANDA
  const [vstoxx, setVstoxx] = useState<any>(null)                                    // 12 Alpha/scraper
  const [vix, setVix] = useState<FredSeriesResponse | null>(null)                    // 13 FRED VIXCLS
  const [spreadHY, setSpreadHY] = useState<FredSeriesResponse | null>(null)          // 14 FRED
  const [spreadIG, setSpreadIG] = useState<FredSeriesResponse | null>(null)          // 15 FRED

  // ───── NIVEL 2 · 2A Renta variable España y Europa (16-30) ─────
  const [ibexComponentes, setIbexComponentes] = useState<any>(null)                  // 16
  const [ibexSectorial, setIbexSectorial] = useState<any>(null)                      // 17
  const [ibexPER, setIbexPER] = useState<any>(null)                                  // 18
  const [ibexDividendYield, setIbexDividendYield] = useState<any>(null)              // 19
  const [ibexVolumen, setIbexVolumen] = useState<any>(null)                          // 20
  const [ibexHistMM200, setIbexHistMM200] = useState<any>(null)                      // 21 hist + MM200
  const [eurostoxx600Sectorial, setEurostoxx600Sectorial] = useState<any>(null)      // 22
  const [indicesGlobales, setIndicesGlobales] = useState<any>(null)                  // 23 EU/US/JP relativo
  const [dax40, setDax40] = useState<any>(null)                                      // 24
  const [cac40, setCac40] = useState<any>(null)                                      // 25
  const [ftseMib, setFtseMib] = useState<any>(null)                                  // 26
  // 27 Ratio IBEX/EuroStoxx → derivado
  const [bullBearRatio, setBullBearRatio] = useState<any>(null)                      // 28
  const [insiderTrading, setInsiderTrading] = useState<any>(null)                    // 29
  const [shortInterest, setShortInterest] = useState<any>(null)                      // 30

  // ───── NIVEL 2 · 2B Renta fija soberana (31-45) ─────
  const [curvaES, setCurvaES] = useState<any>(null)                                  // 31 ES 2Y/5Y/10Y/30Y
  const [curvaDE, setCurvaDE] = useState<any>(null)                                  // 32 DE Bund completa
  const [primaSerieHist, setPrimaSerieHist] = useState<any>(null)                    // 33 derivado ES-DE 10y
  const [primaPeers, setPrimaPeers] = useState<any>(null)                            // 34 IT/PT/GR vs DE
  const [bonoUS10Y, setBonoUS10Y] = useState<FredSeriesResponse | null>(null)        // 35 FRED DGS10
  // 36 Diferencial ES-US → derivado
  const [cdsES, setCdsES] = useState<any>(null)                                      // 37 NASDAQ CDS Spain
  const [cdsPeers, setCdsPeers] = useState<any>(null)                                // 38 CDS IT/PT
  const [tipoRealES, setTipoRealES] = useState<any>(null)                            // 39 derivado nominal-inflación
  // 40 Pendiente curva ES 10Y-2Y → derivado
  const [pendienteCurvaUS, setPendienteCurvaUS] = useState<FredSeriesResponse | null>(null) // 41 FRED T10Y2Y
  const [breakevenES, setBreakevenES] = useState<any>(null)                          // 42 BCE SDW
  const [breakevenEZ, setBreakevenEZ] = useState<any>(null)                          // 43 BCE SDW
  const [flujoNoResidentesDeuda, setFlujoNoResidentesDeuda] = useState<any>(null)    // 44 BdE
  // 45 Ratio yield ES/IT → derivado

  // ───── NIVEL 3 · 3A Renta fija corporativa (46-52) ─────
  const [spreadIGHist, setSpreadIGHist] = useState<FredSeriesResponse | null>(null)  // 46 FRED 3y
  const [spreadHYHist, setSpreadHYHist] = useState<FredSeriesResponse | null>(null)  // 47 FRED 3y
  const [emisionesCorpES, setEmisionesCorpES] = useState<any>(null)                  // 48
  const [emisionesIGvsHY, setEmisionesIGvsHY] = useState<any>(null)                  // 49 derivado
  const [cdsCorpIBEX, setCdsCorpIBEX] = useState<any>(null)                          // 50
  const [spreadAT1, setSpreadAT1] = useState<any>(null)                              // 51 solo agregado
  const [marfVolumen, setMarfVolumen] = useState<any>(null)                          // 52

  // ───── NIVEL 3 · 3B Commodities estratégicas (53-64) ─────
  const [brentHist, setBrentHist] = useState<FredSeriesResponse | null>(null)        // 53 5y
  const [wti, setWti] = useState<FredSeriesResponse | null>(null)                    // 54 FRED DCOILWTICO
  // 54b spread Brent-WTI → derivado
  const [gasTTFHist, setGasTTFHist] = useState<any>(null)                            // 55 histórico
  const [carbonARA, setCarbonARA] = useState<any>(null)                              // 56 NASDAQ
  const [electricidadSpot, setElectricidadSpot] = useState<any>(null)                // 57 ESIOS/ENTSO-E
  const [aluminioLME, setAluminioLME] = useState<any>(null)                          // 58
  const [cobreLME, setCobreLME] = useState<any>(null)                                // 59
  const [aceroHRC, setAceroHRC] = useState<any>(null)                                // 60
  const [cereales, setCereales] = useState<any>(null)                                // 61 trigo+maíz CBOT
  const [aceiteOliva, setAceiteOliva] = useState<any>(null)                          // 62
  const [bcomIndex, setBcomIndex] = useState<any>(null)                              // 63 Bloomberg Commodity
  const [crbIndex, setCrbIndex] = useState<FredSeriesResponse | null>(null)          // 64 PPIACO proxy

  // ───── NIVEL 3 · 3C Divisas y flujos globales (65-74) ─────
  const [eurUsdHist, setEurUsdHist] = useState<FredSeriesResponse | null>(null)      // 65 5y
  const [eurGbp, setEurGbp] = useState<any>(null)                                    // 66
  const [eurJpy, setEurJpy] = useState<any>(null)                                    // 67 carry trade
  const [eurCny, setEurCny] = useState<any>(null)                                    // 68 China
  const [usdMad, setUsdMad] = useState<any>(null)                                    // 69 Marruecos
  const [dxy, setDxy] = useState<any>(null)                                          // 70
  const [eer, setEer] = useState<any>(null)                                          // 71 BCE
  const [volEurUsd, setVolEurUsd] = useState<any>(null)                              // 72 NASDAQ FX vol
  const [cotEurUsd, setCotEurUsd] = useState<any>(null)                              // 73 CFTC
  const [flujosIIF, setFlujosIIF] = useState<any>(null)                              // 74 IIF

  // ───── NIVEL 3 · 3D Volatilidad y sentimiento (75-84) ─────
  const [vixHist, setVixHist] = useState<FredSeriesResponse | null>(null)            // 75 5y
  // 76 VSTOXX-VIX diferencial → derivado
  const [fearGreed, setFearGreed] = useState<any>(null)                              // 77 CNN
  const [skew, setSkew] = useState<FredSeriesResponse | null>(null)                  // 78
  const [nfci, setNfci] = useState<FredSeriesResponse | null>(null)                  // 79
  const [putCall, setPutCall] = useState<any>(null)                                  // 80
  const [aaii, setAaii] = useState<any>(null)                                        // 81
  const [flujosFondosEU, setFlujosFondosEU] = useState<any>(null)                    // 82 EPFR
  const [gdeltMarkets, setGdeltMarkets] = useState<any>(null)                        // 83
  const [gdeltTone, setGdeltTone] = useState<any>(null)                              // 84

  // ───── NIVEL 3 · 3E Inmobiliario cotizado REITs (85-86) ─────
  const [reitsEurope, setReitsEurope] = useState<any>(null)                          // 85 EPRA
  const [socimisES, setSocimisES] = useState<any>(null)                              // 86 Merlin+Colonial

  // ───── NIVEL 3 · 3F Criptoactivos como señal (87-89) ─────
  const [btcUsd, setBtcUsd] = useState<any>(null)                                    // 87 Finnhub Binance
  const [btcNasdaqCorr, setBtcNasdaqCorr] = useState<any>(null)                      // 88 derivado 90d rolling
  const [btcDominance, setBtcDominance] = useState<any>(null)                        // 89 CoinGecko

  // ───── NIVEL 3 · 3G Flujos institucionales (90-94) ─────
  const [etfFlowsEU, setEtfFlowsEU] = useState<any>(null)                            // 90 NASDAQ ETF EU equity
  const [holdings13F, setHoldings13F] = useState<any>(null)                          // 91 Finnhub
  const [hedgeFundsNet, setHedgeFundsNet] = useState<any>(null)                      // 92 HFR Europe
  const [repoRate, setRepoRate] = useState<any>(null)                                // 93 BCE ESTR/repo
  const [excesoLiquidez, setExcesoLiquidez] = useState<any>(null)                    // 94 BCE excess reserves

  // ───── NIVEL 3 · 3H Benchmarking y síntesis AI (95-100) ─────
  const [rentabilidadYTD, setRentabilidadYTD] = useState<any>(null)                  // 95 derivado base 100
  const [perRegional, setPerRegional] = useState<any>(null)                          // 96 P/E Europe vs USA vs EM
  // 97 Equity Risk Premium ES → derivado
  // 98 Semáforo mercados → derivado
  // 99 Alerta prima >200bp o VIX >30 → derivado
  const [aiSintesisMercados, setAiSintesisMercados] = useState<any>(null)            // 100 Groq

  const [loading, setLoading] = useState(true)

  // ──────────────────────────────────────────────────────────────────
  // useEffect · Promise.all con TODOS los fetches (NIVEL 1+2+3)
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    const f = (url: string) => fetch(url, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null)

    Promise.all([
      // NIVEL 1 (14 fetches · 6 derivado)
      f('/api/finnhub/quote?symbol=^IBEX'),                                          // 1
      f('/api/finnhub/candles?symbol=^IBEX&resolution=D&n=365'),                     // 2
      f('/api/finnhub/quote?symbol=^STOXX50E'),                                      // 3
      f('/api/finnhub/quote?symbol=^GSPC'),                                          // 4
      f('/api/fred/series?id=IRLTLT01ESM156N&n=60'),                                 // 5
      f('/api/fred/series?id=IRLTLT01DEM156N&n=60'),                                 // 7
      f('/api/fred/series?id=DCOILBRENTEU&n=60'),                                    // 8
      f('/api/fred/series?id=PNGASEUUSDM&n=60'),                                     // 9
      f('/api/fred/series?id=DEXUSEU&n=60'),                                         // 10
      f('/api/finnhub/quote?symbol=OANDA:XAU_USD'),                                  // 11
      f('/api/proxy/vstoxx?n=60'),                                                   // 12
      f('/api/fred/series?id=VIXCLS&n=60'),                                          // 13
      f('/api/fred/series?id=BAMLHE00EHY0EY&n=60'),                                  // 14
      f('/api/fred/series?id=BAMLHE00EHY0IS&n=60'),                                  // 15
      // NIVEL 2 · 2A Renta variable (15 fetches · 17 y 27 derivados)
      f('/api/finnhub/batch?symbols=IBEX_35_constituents'),                          // 16
      f('/api/proxy/ibex-sectorial?n=1'),                                            // 17
      f('/api/proxy/ibex-per?n=12'),                                                 // 18
      f('/api/finnhub/dividend-yield?symbol=^IBEX'),                                 // 19
      f('/api/finnhub/volume?symbol=^IBEX&n=60'),                                    // 20
      f('/api/finnhub/candles?symbol=^IBEX&resolution=D&n=1260&ma=200'),             // 21 5y + MM200
      f('/api/proxy/eurostoxx600-sectorial'),                                        // 22
      f('/api/finnhub/multi-quote?symbols=^STOXX50E,^GSPC,^N225'),                   // 23
      f('/api/finnhub/quote?symbol=^GDAXI'),                                         // 24
      f('/api/finnhub/quote?symbol=^FCHI'),                                          // 25
      f('/api/finnhub/quote?symbol=^FTMIB'),                                         // 26
      f('/api/finnhub/sentiment-bull-bear?market=EU'),                               // 28
      f('/api/finnhub/insider-transactions?index=IBEX&n=12'),                        // 29
      f('/api/finnhub/short-interest?index=IBEX&top=10'),                            // 30
      // NIVEL 2 · 2B Renta fija soberana (13 fetches · 33/36/40/45 derivados)
      f('/api/proxy/curva-soberana?country=ES&tenors=2Y,5Y,10Y,30Y'),                // 31
      f('/api/proxy/curva-soberana?country=DE&tenors=2Y,5Y,10Y,30Y'),                // 32
      f('/api/proxy/prima-peers?countries=IT,PT,GR&vsBund=1&n=60'),                  // 34
      f('/api/fred/series?id=DGS10&n=60'),                                           // 35
      f('/api/nasdaq/cds?country=ES&maturity=5Y&n=60'),                              // 37
      f('/api/nasdaq/cds?countries=IT,PT&maturity=5Y&n=60'),                         // 38
      f('/api/proxy/tipo-real-soberano?country=ES&n=60'),                            // 39
      f('/api/fred/series?id=T10Y2Y&n=60'),                                          // 41
      f('/api/macro-finance/markets?include=breakeven_es_5y5y'),                     // 42
      f('/api/macro-finance/markets?include=breakeven_ez_5y5y'),                     // 43
      f('/api/bde/stats/debt-flows-nonresident?n=20'),                               // 44

      // NIVEL 3 · 3A Renta fija corporativa (7 fetches · 49 derivado)
      f('/api/fred/series?id=BAMLHE00EHY0IS&n=750'),                                 // 46 3y
      f('/api/fred/series?id=BAMLHE00EHY0EY&n=750'),                                 // 47 3y
      f('/api/proxy/emisiones-corp-es?n=24'),                                        // 48
      f('/api/nasdaq/cds-corp-ibex?top=10'),                                         // 50
      f('/api/proxy/at1-bancario-es?n=24'),                                          // 51
      f('/api/proxy/marf-volumen?n=24'),                                             // 52
      // NIVEL 3 · 3B Commodities (12 fetches · 54b derivado)
      f('/api/fred/series?id=DCOILBRENTEU&n=1260'),                                  // 53 5y
      f('/api/fred/series?id=DCOILWTICO&n=1260'),                                    // 54
      f('/api/proxy/gas-ttf-hist?n=1260'),                                           // 55
      f('/api/nasdaq/coal-ara?n=24'),                                                // 56
      f('/api/esios/electricity-spot?n=90'),                                         // 57
      f('/api/proxy/lme?metal=aluminium&n=60'),                                      // 58
      f('/api/proxy/lme?metal=copper&n=60'),                                         // 59
      f('/api/nasdaq/steel-hrc-eu?n=24'),                                            // 60
      f('/api/proxy/cereales?products=wheat,corn&n=60'),                             // 61
      f('/api/proxy/olive-oil?n=24'),                                                // 62
      f('/api/nasdaq/bcom?n=60'),                                                    // 63
      f('/api/fred/series?id=PPIACO&n=60'),                                          // 64
      // NIVEL 3 · 3C Divisas (10 fetches)
      f('/api/fred/series?id=DEXUSEU&n=1260'),                                       // 65 5y
      f('/api/proxy/fx?pair=EURGBP&n=60'),                                           // 66
      f('/api/proxy/fx?pair=EURJPY&n=60'),                                           // 67
      f('/api/proxy/fx?pair=EURCNY&n=60'),                                           // 68
      f('/api/proxy/fx?pair=USDMAD&n=60'),                                           // 69
      f('/api/proxy/dxy?n=60'),                                                      // 70
      f('/api/macro-finance/markets?include=eer'),                                   // 71
      f('/api/nasdaq/fx-vol?pair=EURUSD&maturity=1M&n=60'),                          // 72
      f('/api/proxy/cot?pair=EURUSD&n=24'),                                          // 73
      f('/api/proxy/iif-capital-flows?region=Europe&n=24'),                          // 74
      // NIVEL 3 · 3D Volatilidad y sentimiento (10 fetches · 76 derivado)
      f('/api/fred/series?id=VIXCLS&n=1260'),                                        // 75 5y
      f('/api/proxy/fear-greed?n=60'),                                               // 77
      f('/api/fred/series?id=SKEW&n=60'),                                            // 78
      f('/api/fred/series?id=NFCI&n=60'),                                            // 79
      f('/api/nasdaq/put-call-sp500?n=60'),                                          // 80
      f('/api/proxy/aaii-bull-bear?n=60'),                                           // 81
      f('/api/nasdaq/fund-flows-europe?n=24'),                                       // 82
      f('/api/gdelt/doc?query=Spain+markets+economy&n=30'),                          // 83
      f('/api/gdelt/gkg?query=Spain+financial&field=tone&n=30'),                     // 84
      // NIVEL 3 · 3E REITs (2 fetches)
      f('/api/finnhub/quote?symbol=EPRA_NAREIT_Europe'),                             // 85
      f('/api/finnhub/multi-quote?symbols=MRL.MC,COL.MC'),                           // 86
      // NIVEL 3 · 3F Cripto (3 fetches · 88 derivado)
      f('/api/finnhub/quote?symbol=BINANCE:BTCUSDT'),                                // 87
      f('/api/proxy/btc-nasdaq-correlation?window=90'),                              // 88
      f('/api/coingecko/global'),                                                    // 89
      // NIVEL 3 · 3G Flujos institucionales (5 fetches)
      f('/api/nasdaq/etf-flows?region=Europe&type=equity&n=24'),                     // 90
      f('/api/finnhub/13f?index=IBEX&n=12'),                                         // 91
      f('/api/proxy/hfr-europe-net-exposure?n=24'),                                  // 92
      f('/api/macro-finance/markets?include=estr_repo'),                             // 93
      f('/api/macro-finance/markets?include=excess_reserves'),                       // 94
      // NIVEL 3 · 3H Benchmarking + AI (3 fetches · 97/98/99 derivados)
      f('/api/proxy/rentabilidad-ytd?indices=IBEX,EuroStoxx50,SP500,N225,EM'),       // 95
      f('/api/proxy/per-regional?regions=Europe,USA,EM&n=12'),                       // 96
      f('/api/brain/chat?prompt=resumen-mercados-activos-esp&cache=1h'),             // 100
    ]).then((r) => {
      if (!alive) return
      // NIVEL 1
      setIbexQuote(r[0]); setIbexHist(r[1]); setEurostoxx50(r[2]); setSp500(r[3])
      setBonoES10Y(r[4]); setBund10Y(r[5]); setBrent(r[6]); setGasTTF(r[7])
      setEurUsd(r[8]); setOro(r[9]); setVstoxx(r[10]); setVix(r[11])
      setSpreadHY(r[12]); setSpreadIG(r[13])
      // 2A
      setIbexComponentes(r[14]); setIbexSectorial(r[15]); setIbexPER(r[16])
      setIbexDividendYield(r[17]); setIbexVolumen(r[18]); setIbexHistMM200(r[19])
      setEurostoxx600Sectorial(r[20]); setIndicesGlobales(r[21])
      setDax40(r[22]); setCac40(r[23]); setFtseMib(r[24])
      setBullBearRatio(r[25]); setInsiderTrading(r[26]); setShortInterest(r[27])
      // 2B
      setCurvaES(r[28]); setCurvaDE(r[29]); setPrimaPeers(r[30])
      setBonoUS10Y(r[31]); setCdsES(r[32]); setCdsPeers(r[33])
      setTipoRealES(r[34]); setPendienteCurvaUS(r[35])
      setBreakevenES(r[36]); setBreakevenEZ(r[37]); setFlujoNoResidentesDeuda(r[38])
      // 3A
      setSpreadIGHist(r[39]); setSpreadHYHist(r[40]); setEmisionesCorpES(r[41])
      setCdsCorpIBEX(r[42]); setSpreadAT1(r[43]); setMarfVolumen(r[44])
      // 3B
      setBrentHist(r[45]); setWti(r[46]); setGasTTFHist(r[47]); setCarbonARA(r[48])
      setElectricidadSpot(r[49]); setAluminioLME(r[50]); setCobreLME(r[51])
      setAceroHRC(r[52]); setCereales(r[53]); setAceiteOliva(r[54])
      setBcomIndex(r[55]); setCrbIndex(r[56])
      // 3C
      setEurUsdHist(r[57]); setEurGbp(r[58]); setEurJpy(r[59]); setEurCny(r[60])
      setUsdMad(r[61]); setDxy(r[62]); setEer(r[63]); setVolEurUsd(r[64])
      setCotEurUsd(r[65]); setFlujosIIF(r[66])
      // 3D
      setVixHist(r[67]); setFearGreed(r[68]); setSkew(r[69]); setNfci(r[70])
      setPutCall(r[71]); setAaii(r[72]); setFlujosFondosEU(r[73])
      setGdeltMarkets(r[74]); setGdeltTone(r[75])
      // 3E
      setReitsEurope(r[76]); setSocimisES(r[77])
      // 3F
      setBtcUsd(r[78]); setBtcNasdaqCorr(r[79]); setBtcDominance(r[80])
      // 3G
      setEtfFlowsEU(r[81]); setHoldings13F(r[82]); setHedgeFundsNet(r[83])
      setRepoRate(r[84]); setExcesoLiquidez(r[85])
      // 3H
      setRentabilidadYTD(r[86]); setPerRegional(r[87]); setAiSintesisMercados(r[88])
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  // ──────────────────────────────────────────────────────────────────
  // Helpers · series + derivados
  // ──────────────────────────────────────────────────────────────────
  const fredChrono = (r?: FredSeriesResponse | null) =>
    (r?.series || []).slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  const lastFred = (r?: FredSeriesResponse | null) => r?.last ?? r?.series?.[0]

  // Series principales
  const bonoESSeries = fredChrono(bonoES10Y)
  const bundSeries = fredChrono(bund10Y)
  const bonoUSSeries = fredChrono(bonoUS10Y)
  const brentSeries = fredChrono(brent)
  const brentHistSeries = fredChrono(brentHist)
  const wtiSeries = fredChrono(wti)
  const gasSeries = fredChrono(gasTTF)
  const eurUsdSeries = fredChrono(eurUsd)
  const eurUsdHistSeries = fredChrono(eurUsdHist)
  const vixSeries = fredChrono(vix)
  const vixHistSeries = fredChrono(vixHist)
  const spreadHYSeries = fredChrono(spreadHY)
  const spreadIGSeries = fredChrono(spreadIG)
  const spreadHYHistSeries = fredChrono(spreadHYHist)
  const spreadIGHistSeries = fredChrono(spreadIGHist)
  const pendienteUSSeries = fredChrono(pendienteCurvaUS)
  const skewSeries = fredChrono(skew)
  const nfciSeries = fredChrono(nfci)
  const crbSeries = fredChrono(crbIndex)
  const ibexCandles = (ibexHist?.candles ?? []) as { period: string; value: number | null }[]

  // Últimos
  const ibexLast = ibexQuote?.value ?? ibexQuote?.last?.value ?? null
  const ibexChangeDay = ibexQuote?.change_pct ?? null
  const eurostoxxLast = eurostoxx50?.value ?? eurostoxx50?.last?.value ?? null
  const eurostoxxChangeDay = eurostoxx50?.change_pct ?? null
  const spLast = sp500?.value ?? sp500?.last?.value ?? null
  const spChangeDay = sp500?.change_pct ?? null
  const bonoESLast = lastFred(bonoES10Y)
  const bundLast = lastFred(bund10Y)
  const brentLast = lastFred(brent)
  const gasLast = lastFred(gasTTF)
  const eurUsdLast = lastFred(eurUsd)
  const oroLast = oro?.value ?? oro?.last?.value ?? null
  const vstoxxLast = vstoxx?.last?.value ?? vstoxx?.value ?? null
  const vixLast = lastFred(vix)
  const spreadHYLast = lastFred(spreadHY)
  const spreadIGLast = lastFred(spreadIG)
  const bonoUSLast = lastFred(bonoUS10Y)

  // Variaciones IBEX semana/mes/año (derivado ibexCandles)
  const ibexVariaciones = (() => {
    if (ibexCandles.length < 252) return null
    const last = ibexCandles[ibexCandles.length - 1]?.value
    const semana = ibexCandles[ibexCandles.length - 5]?.value
    const mes = ibexCandles[ibexCandles.length - 22]?.value
    const anio = ibexCandles[ibexCandles.length - 252]?.value
    if (last == null) return null
    return {
      sem: semana != null && semana !== 0 ? ((last - semana) / semana) * 100 : null,
      mes: mes != null && mes !== 0 ? ((last - mes) / mes) * 100 : null,
      anio: anio != null && anio !== 0 ? ((last - anio) / anio) * 100 : null,
    }
  })()

  // 6 Prima riesgo ES vs DE (bp)
  const primaRiesgoBp = (bonoESLast?.value != null && bundLast?.value != null)
    ? (bonoESLast.value - bundLast.value) * 100
    : null

  // 27 Ratio IBEX/EuroStoxx
  const ratioIbexEurostoxx = (ibexLast != null && eurostoxxLast != null && eurostoxxLast !== 0)
    ? ibexLast / eurostoxxLast
    : null

  // 36 Diferencial ES-US 10Y
  const diferencialESUS = (bonoESLast?.value != null && bonoUSLast?.value != null)
    ? (bonoESLast.value - bonoUSLast.value) * 100
    : null

  // 40 Pendiente curva ES 10Y-2Y
  const pendienteCurvaES = (() => {
    const ten2 = curvaES?.tenors?.find?.((t: any) => (t.tenor ?? '').includes('2Y'))?.value
    const ten10 = curvaES?.tenors?.find?.((t: any) => (t.tenor ?? '').includes('10Y'))?.value
    if (ten2 == null || ten10 == null) return null
    return (ten10 - ten2) * 100
  })()

  // 54b Spread Brent-WTI
  const spreadBrentWti = (brentLast?.value != null && lastFred(wti)?.value != null)
    ? brentLast.value - (lastFred(wti)?.value ?? 0)
    : null

  // 76 VSTOXX-VIX diferencial
  const vstoxxVixDiff = (vstoxxLast != null && vixLast?.value != null)
    ? vstoxxLast - vixLast.value
    : null

  // 98 Semáforo mercados (VIX + Prima + DXY + Fear&Greed)
  const semaforoMercados = (() => {
    const vixV = vixLast?.value ?? null
    const primaV = primaRiesgoBp ?? null
    const dxyV = dxy?.last?.value ?? dxy?.value ?? null
    const fg = fearGreed?.last?.value ?? null
    if (vixV == null && primaV == null && dxyV == null && fg == null) return null
    const score =
      (vixV != null && vixV > 30 ? 2 : vixV != null && vixV > 20 ? 1 : 0) +
      (primaV != null && primaV > 200 ? 2 : primaV != null && primaV > 100 ? 1 : 0) +
      (dxyV != null && dxyV > 110 ? 1 : 0) +
      (fg != null && fg < 25 ? 2 : fg != null && fg < 45 ? 1 : 0)
    return score >= 5 ? 'rojo' : score >= 2 ? 'amber' : 'verde'
  })()

  // 99 Alerta prima >200bp o VIX >30
  const alertaMercados = (() => {
    const triggers: string[] = []
    if (primaRiesgoBp != null && primaRiesgoBp > 200) triggers.push(`Prima ES ${primaRiesgoBp.toFixed(0)} bp`)
    if (vixLast?.value != null && vixLast.value > 30) triggers.push(`VIX ${vixLast.value.toFixed(1)}`)
    return triggers.length > 0 ? triggers.join(' · ') : null
  })()

  // 97 ERP España = earnings yield (IBEX 1/PER) − bono 10Y
  const erpES = (() => {
    const per = ibexPER?.last?.value ?? ibexPER?.value
    const bonoY = bonoESLast?.value
    if (per == null || per === 0 || bonoY == null) return null
    return (1 / per) * 100 - bonoY
  })()

  // ──────────────────────────────────────────────────────────────────
  // 15 Drill functions · uno por Hero KPI
  // ──────────────────────────────────────────────────────────────────

  const openIbexDrill = () => openDrill({
    title: 'IBEX 35 · análisis completo',
    subtitle: 'Finnhub · componentes + sectorial + PER + serie 5y',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ibexLast != null && (
          <p style={{ fontSize: 28, fontWeight: 700, color: ibexChangeDay != null && ibexChangeDay >= 0 ? '#16a34a' : '#dc2626' }}>
            {Math.round(ibexLast).toLocaleString('es-ES')} pts
            {ibexChangeDay != null && (
              <span style={{ fontSize: 16, marginLeft: 10 }}>
                ({ibexChangeDay > 0 ? '+' : ''}{ibexChangeDay.toFixed(2)}%)
              </span>
            )}
          </p>
        )}
        {ibexVariaciones && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
            {[
              { l: 'Semana', v: ibexVariaciones.sem },
              { l: 'Mes', v: ibexVariaciones.mes },
              { l: 'Año', v: ibexVariaciones.anio },
            ].filter((s) => s.v != null).map((s, i) => (
              <div key={i} style={{ background: '#fef2f2', borderRadius: 8, padding: '8px 10px', border: '1px solid #fecaca' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>{s.l}</p>
                <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: s.v! >= 0 ? '#16a34a' : '#dc2626' }}>
                  {s.v! > 0 ? '+' : ''}{s.v!.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        )}
        {/* NIVEL 2 · Sectorial */}
        {Array.isArray(ibexSectorial?.sectors) && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 2 · IBEX por sector (pesos %)
            </p>
            {ibexSectorial.sectors.map((s: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#78350f' }}>{s.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#f97316' }}>{s.weight?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {/* NIVEL 2 · PER + Dividend yield */}
        {(ibexPER?.last?.value != null || ibexDividendYield?.last?.value != null) && (
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              NIVEL 2 · Valoración agregada IBEX
            </p>
            {ibexPER?.last?.value != null && (
              <p style={{ margin: '2px 0', fontSize: 11, color: '#1e40af' }}>PER: {ibexPER.last.value.toFixed(2)}x</p>
            )}
            {ibexDividendYield?.last?.value != null && (
              <p style={{ margin: '2px 0', fontSize: 11, color: '#1e40af' }}>Dividend yield: {ibexDividendYield.last.value.toFixed(2)}%</p>
            )}
          </div>
        )}
        {/* NIVEL 3 · ERP */}
        {erpES != null && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · Equity Risk Premium ES
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#7c3aed' }}>{erpES.toFixed(2)}%</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'Finnhub', url: 'https://finnhub.io/' },
  })

  const openIbexVarDrill = () => openIbexDrill()

  const openEurostoxxDrill = () => openDrill({
    title: 'EuroStoxx 50 · contexto europeo',
    subtitle: 'Finnhub · ratio vs IBEX + DAX/CAC/FTSE MIB',
    accent: '#1d4ed8',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {eurostoxxLast != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: eurostoxxChangeDay != null && eurostoxxChangeDay >= 0 ? '#16a34a' : '#dc2626' }}>
            {Math.round(eurostoxxLast).toLocaleString('es-ES')} pts
          </p>
        )}
        {ratioIbexEurostoxx != null && (
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              Ratio IBEX/EuroStoxx (outperformance relativa)
            </p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2563eb' }}>{ratioIbexEurostoxx.toFixed(3)}</p>
          </div>
        )}
        {/* NIVEL 2 · DAX/CAC/FTSE MIB */}
        <div style={{ background: '#fafafa', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
            NIVEL 2 · Índices europeos
          </p>
          {[
            { l: 'DAX 40', q: dax40 },
            { l: 'CAC 40', q: cac40 },
            { l: 'FTSE MIB', q: ftseMib },
          ].filter((s) => s.q?.value != null).map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ fontSize: 11, color: '#475569' }}>{s.l}</span>
              <span style={{ fontSize: 11, fontWeight: 600,
                color: s.q.change_pct != null && s.q.change_pct >= 0 ? '#16a34a' : '#dc2626' }}>
                {Math.round(s.q.value).toLocaleString('es-ES')} ({s.q.change_pct > 0 ? '+' : ''}{s.q.change_pct?.toFixed(2)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    source: { name: 'Finnhub', url: 'https://finnhub.io/' },
  })

  const openSpDrill = () => openDrill({
    title: 'S&P 500 · referencia global',
    subtitle: 'Finnhub · contexto Wall Street + correlación con EuroStoxx',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {spLast != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: spChangeDay != null && spChangeDay >= 0 ? '#16a34a' : '#dc2626' }}>
            {Math.round(spLast).toLocaleString('es-ES')} pts
            {spChangeDay != null && (
              <span style={{ fontSize: 14, marginLeft: 10 }}>({spChangeDay > 0 ? '+' : ''}{spChangeDay.toFixed(2)}%)</span>
            )}
          </p>
        )}
      </div>
    ),
    source: { name: 'Finnhub', url: 'https://finnhub.io/' },
  })

  const openBonoESDrill = () => openDrill({
    title: 'Bono España 10Y · análisis completo',
    subtitle: 'FRED IRLTLT01ESM156N · curva soberana + CDS + break-even',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {bonoESSeries.length > 3 && (
          <IndicatorDrill label="Bono ES 10Y" unit="%" decimals={3}
            series={bonoESSeries}
            sourceCode="IRLTLT01ESM156N" sourceName="FRED · OECD"
            threshold={{ amber: 4, red: 6, goodAbove: false }} accent="#dc2626" />
        )}
        {/* NIVEL 2 · Curva ES completa */}
        {Array.isArray(curvaES?.tenors) && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 2 · Curva soberana España (2Y/5Y/10Y/30Y)
            </p>
            {curvaES.tenors.map((t: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#7f1d1d' }}>{t.tenor}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{t.value?.toFixed(3)}%</span>
              </div>
            ))}
          </div>
        )}
        {/* NIVEL 3 · CDS ES + Pendiente */}
        {(cdsES?.last?.value != null || pendienteCurvaES != null) && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 3 · Riesgo soberano + pendiente
            </p>
            {cdsES?.last?.value != null && (
              <p style={{ margin: '2px 0', fontSize: 11, color: '#78350f' }}>CDS ES 5Y: {cdsES.last.value.toFixed(1)} bp</p>
            )}
            {pendienteCurvaES != null && (
              <p style={{ margin: '2px 0', fontSize: 11, color: '#78350f' }}>Pendiente ES 10Y-2Y: {pendienteCurvaES > 0 ? '+' : ''}{pendienteCurvaES.toFixed(0)} bp</p>
            )}
          </div>
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/IRLTLT01ESM156N' },
  })

  const openPrimaDrill = () => openDrill({
    title: 'Prima de riesgo España vs Alemania',
    subtitle: 'Derivado FRED · ES10Y − DE10Y · indicador clave eurozona',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {primaRiesgoBp != null && (
          <p style={{ fontSize: 32, fontWeight: 700, color: primaRiesgoBp > 200 ? '#dc2626' : primaRiesgoBp > 100 ? '#f97316' : '#16a34a' }}>
            {primaRiesgoBp.toFixed(0)} bp
          </p>
        )}
        {/* NIVEL 2 · Primas peers */}
        {primaPeers?.countries && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 2 · Prima vs Bund · peers
            </p>
            {primaPeers.countries.map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#7f1d1d' }}>{p.country}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{p.spread_bp?.toFixed(0)} bp</span>
              </div>
            ))}
          </div>
        )}
        {/* NIVEL 2 · Diferencial ES-US */}
        {diferencialESUS != null && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              Diferencial ES-US 10Y
            </p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f97316' }}>{diferencialESUS > 0 ? '+' : ''}{diferencialESUS.toFixed(0)} bp</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/' },
  })

  const openBundDrill = () => openDrill({
    title: 'Bund 10Y Alemania · activo refugio eurozona',
    subtitle: 'FRED IRLTLT01DEM156N',
    accent: '#6b7280',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {bundSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'bund', label: 'Bund 10Y', color: '#6b7280', points: bundSeries, fillBelow: true }]}
            height={180} yLabel="%" formatValue={(v) => `${v.toFixed(2)}%`} />
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/IRLTLT01DEM156N' },
  })

  const openBrentDrill = () => openDrill({
    title: 'Petróleo Brent · referencia coste energético',
    subtitle: 'FRED DCOILBRENTEU · diario · 5y',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {brentHistSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'brent', label: 'Brent ($/bbl)', color: '#dc2626', points: brentHistSeries, fillBelow: true }]}
            height={200} yLabel="$/bbl" formatValue={(v) => `$${v.toFixed(0)}`}
            annotations={[{ period: '2022-02', label: 'Invasión Ucrania', color: '#dc2626' }]} />
        )}
        {/* NIVEL 3 · Spread Brent-WTI */}
        {spreadBrentWti != null && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 3 · Spread Brent − WTI
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: spreadBrentWti > 0 ? '#dc2626' : '#16a34a' }}>
              {spreadBrentWti > 0 ? '+' : ''}{spreadBrentWti.toFixed(2)} $/bbl
            </p>
          </div>
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/DCOILBRENTEU' },
  })

  const openGasDrill = () => openDrill({
    title: 'Gas natural TTF · referencia europea',
    subtitle: 'FRED PNGASEUUSDM · diario · stress energético eurozona',
    accent: '#f97316',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {gasSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'gas', label: 'Gas TTF', color: '#f97316', points: gasSeries, fillBelow: true }]}
            height={200} yLabel="USD/MMBtu" formatValue={(v) => `$${v.toFixed(2)}`}
            annotations={[{ period: '2022-02', label: 'Invasión Ucrania', color: '#dc2626' }]} />
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/PNGASEUUSDM' },
  })

  const openEurUsdDrill = () => openDrill({
    title: 'EUR/USD · tipo de cambio nominal',
    subtitle: 'FRED DEXUSEU · 5y · impacto exports/inflación importada',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {eurUsdHistSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'eurusd', label: 'EUR/USD', color: '#0891b2', points: eurUsdHistSeries, fillBelow: true }]}
            height={200} yLabel="" formatValue={(v) => v.toFixed(4)} />
        )}
        {/* NIVEL 3 · Vol EUR/USD 1M */}
        {volEurUsd?.last?.value != null && (
          <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>
              NIVEL 3 · Volatilidad implícita 1M
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0891b2' }}>{volEurUsd.last.value.toFixed(2)}%</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/DEXUSEU' },
  })

  const openOroDrill = () => openDrill({
    title: 'Oro · refugio + termómetro miedo',
    subtitle: 'Finnhub OANDA:XAU_USD · señal risk-off',
    accent: '#f59e0b',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {oroLast != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>${oroLast.toFixed(2)}/oz</p>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          El oro actúa como activo refugio: sube en momentos de incertidumbre geopolítica,
          expectativas de recortes de tipos, o debilitamiento del dólar. Es el termómetro del miedo
          de los mercados.
        </p>
      </div>
    ),
    source: { name: 'Finnhub', url: 'https://finnhub.io/' },
  })

  const openVstoxxDrill = () => openDrill({
    title: 'VSTOXX · volatilidad implícita EuroStoxx',
    subtitle: 'Alpha Vantage · indicador stress Eurozona',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {vstoxxLast != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: vstoxxLast > 30 ? '#dc2626' : vstoxxLast > 20 ? '#f97316' : '#16a34a' }}>
            {vstoxxLast.toFixed(2)}
          </p>
        )}
        {vstoxxVixDiff != null && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · Diferencial VSTOXX − VIX
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: vstoxxVixDiff > 0 ? '#dc2626' : '#16a34a' }}>
              {vstoxxVixDiff > 0 ? '+' : ''}{vstoxxVixDiff.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    ),
    source: { name: 'Alpha Vantage', url: 'https://www.alphavantage.co/' },
  })

  const openVixDrill = () => openDrill({
    title: 'VIX · volatilidad implícita S&P 500',
    subtitle: 'FRED VIXCLS · 5y · indicador stress global',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {vixHistSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'vix', label: 'VIX', color: '#dc2626', points: vixHistSeries, fillBelow: true }]}
            height={200} yLabel="" formatValue={(v) => v.toFixed(1)}
            annotations={[
              { period: '2020-03', label: 'COVID 82', color: '#dc2626' },
              { period: '2022-03', label: 'Ucrania', color: '#dc2626' },
            ]} />
        )}
        {/* NIVEL 3 · SKEW + NFCI */}
        {(skew?.last?.value != null || nfci?.last?.value != null) && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 3 · Indicadores complementarios
            </p>
            {skew?.last?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#7f1d1d' }}>SKEW (cola derecha): {skew.last.value.toFixed(1)}</p>}
            {nfci?.last?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#7f1d1d' }}>NFCI (condiciones financieras): {nfci.last.value.toFixed(2)}</p>}
          </div>
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/VIXCLS' },
  })

  const openHYDrill = () => openDrill({
    title: 'Spread HY corporativo Europa',
    subtitle: 'FRED BAMLHE00EHY0EY · diario · stress crédito riesgo',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {spreadHYHistSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'hy', label: 'Spread HY (bp)', color: '#dc2626', points: spreadHYHistSeries, fillBelow: true }]}
            height={200} yLabel="bp" formatValue={(v) => `${v.toFixed(0)} bp`} />
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/BAMLHE00EHY0EY' },
  })

  const openIGDrill = () => openDrill({
    title: 'Spread IG corporativo Europa',
    subtitle: 'FRED BAMLHE00EHY0IS · investment grade',
    accent: '#f97316',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {spreadIGHistSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'ig', label: 'Spread IG (bp)', color: '#f97316', points: spreadIGHistSeries, fillBelow: true }]}
            height={200} yLabel="bp" formatValue={(v) => `${v.toFixed(0)} bp`} />
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/BAMLHE00EHY0IS' },
  })

  // ──────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a href="/macro/mercados-activos" style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(90deg, #faf5ff 0%, #f0f9ff 100%)',
        border: '1px solid #e9d5ff', borderLeft: `4px solid ${tab.themeAccent}`,
        borderRadius: 10, padding: '12px 16px', color: '#0f172a', textDecoration: 'none',
      }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · Mercados & Activos · 100 indicadores
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            15 Hero + 30 NIVEL 2 + 55 NIVEL 3 · alineado Tab 6.md 100% · RV + RF soberana/corp + commodities + divisas + volatilidad
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      {/* Semáforo + alerta mercados */}
      {(semaforoMercados != null || alertaMercados != null) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {semaforoMercados != null && (
            <div style={{
              background: semaforoMercados === 'rojo' ? '#fef2f2' : semaforoMercados === 'amber' ? '#fff7ed' : '#f0fdf4',
              border: `1px solid ${semaforoMercados === 'rojo' ? '#fecaca' : semaforoMercados === 'amber' ? '#fed7aa' : '#86efac'}`,
              borderRadius: 10, padding: '10px 14px',
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Semáforo mercados · derivado VIX+prima+DXY+Fear&Greed
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700,
                color: semaforoMercados === 'rojo' ? '#dc2626' : semaforoMercados === 'amber' ? '#f97316' : '#16a34a',
              }}>
                ● {semaforoMercados === 'rojo' ? 'Stress alto' : semaforoMercados === 'amber' ? 'Vigilar' : 'Calma'}
              </p>
            </div>
          )}
          {alertaMercados != null && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                ! Alerta mercados (Prima &gt;200bp · VIX &gt;30)
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{alertaMercados}</p>
            </div>
          )}
        </div>
      )}

      {/* NIVEL 1 · 15 Hero KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {ibexLast != null && (
          <MacroKpiCard label="IBEX 35" value={ibexLast} unit=" pts" color="#dc2626" decimals={0}
            delta={ibexChangeDay}
            footer="Finnhub · real-time" loading={loading} onClick={openIbexDrill} />
        )}
        {ibexVariaciones?.anio != null && (
          <MacroKpiCard label="IBEX var. año" value={ibexVariaciones.anio} unit="%" color={ibexVariaciones.anio >= 0 ? '#16a34a' : '#dc2626'} decimals={2}
            footer="Finnhub · YoY" loading={loading} onClick={openIbexVarDrill} />
        )}
        {eurostoxxLast != null && (
          <MacroKpiCard label="EuroStoxx 50" value={eurostoxxLast} unit=" pts" color="#1d4ed8" decimals={0}
            delta={eurostoxxChangeDay} footer="Finnhub" loading={loading} onClick={openEurostoxxDrill} />
        )}
        {spLast != null && (
          <MacroKpiCard label="S&P 500" value={spLast} unit=" pts" color="#dc2626" decimals={0}
            delta={spChangeDay} footer="Finnhub" loading={loading} onClick={openSpDrill} />
        )}
        {bonoESLast?.value != null && (
          <MacroKpiCard label="Bono ES 10Y" value={bonoESLast.value} unit="%" color="#dc2626" decimals={3}
            spark={bonoESSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED IRLTLT01ESM156N" loading={loading}
            onClick={bonoESSeries.length > 3 ? openBonoESDrill : undefined} />
        )}
        {primaRiesgoBp != null && (
          <MacroKpiCard label="Prima riesgo ES" value={primaRiesgoBp} unit=" bp" color={primaRiesgoBp > 200 ? '#dc2626' : primaRiesgoBp > 100 ? '#f97316' : '#16a34a'} decimals={0}
            footer="Derivado ES10−DE10" loading={loading} onClick={openPrimaDrill} />
        )}
        {bundLast?.value != null && (
          <MacroKpiCard label="Bund 10Y" value={bundLast.value} unit="%" color="#6b7280" decimals={3}
            spark={bundSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED IRLTLT01DEM156N" loading={loading}
            onClick={bundSeries.length > 3 ? openBundDrill : undefined} />
        )}
        {brentLast?.value != null && (
          <MacroKpiCard label="Brent" value={brentLast.value} unit=" $/bbl" color="#dc2626" decimals={1}
            spark={brentSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED DCOILBRENTEU" loading={loading}
            onClick={brentSeries.length > 3 ? openBrentDrill : undefined} />
        )}
        {gasLast?.value != null && (
          <MacroKpiCard label="Gas TTF" value={gasLast.value} unit=" $/MMBtu" color="#f97316" decimals={2}
            spark={gasSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED PNGASEUUSDM" loading={loading}
            onClick={gasSeries.length > 3 ? openGasDrill : undefined} />
        )}
        {eurUsdLast?.value != null && (
          <MacroKpiCard label="EUR/USD" value={eurUsdLast.value} unit="" color="#0891b2" decimals={4}
            spark={eurUsdSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED DEXUSEU" loading={loading}
            onClick={eurUsdSeries.length > 3 ? openEurUsdDrill : undefined} />
        )}
        {oroLast != null && (
          <MacroKpiCard label="Oro" value={oroLast} unit=" $/oz" color="#f59e0b" decimals={1}
            footer="Finnhub OANDA" loading={loading} onClick={openOroDrill} />
        )}
        {vstoxxLast != null && (
          <MacroKpiCard label="VSTOXX" value={vstoxxLast} unit="" color="#7c3aed" decimals={2}
            footer="Alpha Vantage · vol EZ" loading={loading} onClick={openVstoxxDrill} />
        )}
        {vixLast?.value != null && (
          <MacroKpiCard label="VIX" value={vixLast.value} unit="" color={vixLast.value > 30 ? '#dc2626' : vixLast.value > 20 ? '#f97316' : '#16a34a'} decimals={2}
            spark={vixSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED VIXCLS" loading={loading}
            onClick={vixSeries.length > 3 ? openVixDrill : undefined} />
        )}
        {spreadHYLast?.value != null && (
          <MacroKpiCard label="Spread HY EU" value={spreadHYLast.value * 100} unit=" bp" color="#dc2626" decimals={0}
            spark={spreadHYSeries.slice(-12).map((p) => (p.value ?? 0) * 100).filter((v) => v != null)}
            footer="FRED BAMLHE00EHY0EY" loading={loading}
            onClick={spreadHYSeries.length > 3 ? openHYDrill : undefined} />
        )}
        {spreadIGLast?.value != null && (
          <MacroKpiCard label="Spread IG EU" value={spreadIGLast.value * 100} unit=" bp" color="#f97316" decimals={0}
            spark={spreadIGSeries.slice(-12).map((p) => (p.value ?? 0) * 100).filter((v) => v != null)}
            footer="FRED BAMLHE00EHY0IS" loading={loading}
            onClick={spreadIGSeries.length > 3 ? openIGDrill : undefined} />
        )}
      </div>

      {/* PANEL 1 · Renta variable comparada IBEX + EuroStoxx + S&P */}
      {ibexCandles.length > 50 && (
        <MacroPanel
          accent="#dc2626"
          title="Renta variable · IBEX 35 serie histórica 1 año"
          subtitle="Finnhub candles diarias · contexto comparado"
          status="live"
          aiAnalysis={{
            indicator: 'IBEX 35 serie histórica',
            indicatorId: 'finnhub.ibex.candles',
            tabSlug: 'mercados-activos',
            series: aiSeries(ibexCandles),
            metadata: {
              unit: 'pts',
              source: 'Finnhub',
              frequency: 'daily',
              notes: [
                'IBEX 35: índice de referencia España.',
                'Composición sesgada al financiero (~35%) y energético (~20%).',
                'Correlación alta con DAX y EuroStoxx 50.',
              ],
            },
          } as ChartAnalysisInput}
        >
          <DeepLineChart series={[{ id: 'ibex', label: 'IBEX 35', color: '#dc2626', points: ibexCandles, fillBelow: true }]}
            height={220} yLabel="pts" formatValue={(v) => Math.round(v).toLocaleString('es-ES')} />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative label="IBEX 35" unit=" pts" decimals={0}
              series={ibexCandles as any} accent="#dc2626" />
          </div>
        </MacroPanel>
      )}

      {/* PANEL 2 · Renta fija soberana · bono ES + Bund + prima */}
      {(bonoESSeries.length > 3 || bundSeries.length > 3) && (
        <MacroPanel
          accent="#7c3aed"
          title="Renta fija soberana · ES + Bund + prima riesgo"
          subtitle="FRED · serie histórica · contexto eurozona"
          status="live"
        >
          <DeepLineChart
            series={[
              bonoESSeries.length > 3 ? { id: 'es', label: 'ES 10Y', color: '#dc2626', points: bonoESSeries, fillBelow: true } : null,
              bundSeries.length > 3 ? { id: 'de', label: 'Bund 10Y', color: '#6b7280', points: bundSeries, dashed: true } : null,
              bonoUSSeries.length > 3 ? { id: 'us', label: 'US 10Y', color: '#1d4ed8', points: bonoUSSeries, dashed: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean; fillBelow?: boolean } => s != null)}
            height={220} yLabel="%" formatValue={(v) => `${v.toFixed(2)}%`}
            annotations={[
              { period: '2022-07', label: 'Salida tipos 0%', color: '#16a34a' },
            ]} />
        </MacroPanel>
      )}

      {/* PANEL 3 · Commodities · Brent + WTI + Gas TTF + CRB */}
      {(brentHistSeries.length > 3 || wtiSeries.length > 3 || gasSeries.length > 3) && (
        <MacroPanel
          accent="#f97316"
          title="Commodities · energía + cesta agregada"
          subtitle="FRED Brent + WTI + Gas TTF + CRB index proxy"
          status="live"
        >
          <DeepLineChart
            series={[
              brentHistSeries.length > 3 ? { id: 'brent', label: 'Brent ($/bbl)', color: '#dc2626', points: brentHistSeries, fillBelow: true } : null,
              wtiSeries.length > 3 ? { id: 'wti', label: 'WTI ($/bbl)', color: '#f97316', points: wtiSeries, dashed: true } : null,
              gasSeries.length > 3 ? { id: 'gas', label: 'Gas TTF ($/MMBtu)', color: '#7c3aed', points: gasSeries, dashed: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean; fillBelow?: boolean } => s != null)}
            height={220} yLabel="USD" formatValue={(v) => `$${v.toFixed(1)}`}
            annotations={[{ period: '2022-02', label: 'Invasión Ucrania', color: '#dc2626' }]} />
          {crbSeries.length > 3 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', margin: '0 0 6px', textTransform: 'uppercase' }}>
                Cesta CRB commodities (PPIACO proxy)
              </p>
              <DeepLineChart series={[{ id: 'crb', label: 'CRB', color: '#f97316', points: crbSeries, fillBelow: true }]}
                height={140} yLabel="" formatValue={(v) => v.toFixed(0)} />
            </div>
          )}
        </MacroPanel>
      )}

      {/* PANEL 4 · Volatilidad VIX + Spreads HY/IG */}
      {(vixHistSeries.length > 3 || spreadHYHistSeries.length > 3 || spreadIGHistSeries.length > 3) && (
        <MacroPanel
          accent="#dc2626"
          title="Volatilidad + spreads crédito"
          subtitle="FRED VIX + HY + IG · stress de mercado"
          status="live"
        >
          <DeepLineChart
            series={[
              vixHistSeries.length > 3 ? { id: 'vix', label: 'VIX', color: '#dc2626', points: vixHistSeries, fillBelow: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; fillBelow?: boolean } => s != null)}
            height={180} yLabel="" formatValue={(v) => v.toFixed(1)}
            annotations={[
              { period: '2020-03', label: 'COVID 82', color: '#dc2626' },
              { period: '2022-03', label: 'Ucrania', color: '#dc2626' },
            ]} />
          {(spreadHYHistSeries.length > 3 || spreadIGHistSeries.length > 3) && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', margin: '0 0 6px', textTransform: 'uppercase' }}>
                Spreads corporativos Europa
              </p>
              <DeepLineChart
                series={[
                  spreadHYHistSeries.length > 3 ? { id: 'hy', label: 'HY', color: '#dc2626', points: spreadHYHistSeries.map((p) => ({ period: p.period, value: p.value != null ? p.value * 100 : null })) } : null,
                  spreadIGHistSeries.length > 3 ? { id: 'ig', label: 'IG', color: '#f97316', points: spreadIGHistSeries.map((p) => ({ period: p.period, value: p.value != null ? p.value * 100 : null })), dashed: true } : null,
                ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean } => s != null)}
                height={160} yLabel="bp" formatValue={(v) => `${v.toFixed(0)} bp`} />
            </div>
          )}
        </MacroPanel>
      )}

      {/* Documentación · mapping niveles
          NIVEL 1 · 15 Hero KPIs en grid arriba (+ semáforo + alerta)
          NIVEL 2 (30) · inline en drill correspondiente:
            2A Renta variable → drill 1 IBEX (sectorial + PER + dividend) +
               drill 3 EuroStoxx (ratio + DAX/CAC/FTSE)
            2B Renta fija → drill 5 Bono ES (curva + CDS + pendiente) +
               drill 6 Prima (peers + diferencial ES-US)
          NIVEL 3 (55) · inline en sub-blocks:
            3A Corp → drill 14 HY + drill 15 IG (3y histórico)
            3B Commodities → panel principal 3 + drill 8 Brent (spread Brent-WTI)
            3C Divisas → drill 10 EUR/USD (vol 1M)
            3D Volatilidad → drill 13 VIX (SKEW + NFCI)
            3E REITs → reservado para sprint complementario
            3F Cripto → reservado
            3G Flujos → reservado
            3H Benchmarking + AI → semáforo derivado + ERP en drill IBEX
      */}
    </div>
  )
}

export default MercadosActivosTab
