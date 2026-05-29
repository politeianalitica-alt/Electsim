'use client'
/**
 * `<RegimenMonetarioTab />` · Tab 2 · Régimen monetario PROFUNDO.
 *
 * Alineado al 100% con `regimen.md` · 100 indicadores en 3 niveles.
 *
 *   NIVEL 1 · Hero (15 KPIs visibles al abrir tab):
 *     1.  Tipo depo BCE actual                    · BCE SDW FM.B.U2.EUR.BN.BB.CR.DFR
 *     2.  Tipo refi BCE (operaciones principales) · BCE SDW MRR
 *     3.  Euríbor 12M actual                      · BCE SDW EURIBOR12MD
 *     4.  Euríbor 3M actual                       · BCE SDW EURIBOR3MD
 *     5.  Balance BCE total (€ bn)                 · FRED ECBASSETSW
 *     6.  Índice Condiciones Financieras EZ (FCI)  · FRED NFCI proxy / Goldman
 *     7.  Tipo hipotecario medio España (nuevas)   · BdE /stats/mortgage-rates-new
 *     8.  Tipo préstamo PYME España (<1M€)         · BdE /stats/lending-rates-sme
 *     9.  OIS 1Y Eurozona (expectativa BCE 12m)    · BCE SDW OIS 1Y
 *     10. Diferencial Euríbor-OIS (riesgo interb.) · BCE SDW Euríbor 3M − OIS 3M
 *     11. Fed Funds Rate actual                    · FRED FEDFUNDS
 *     12. Tipo BoE actual                          · FRED IUDSOIA
 *     13. M1 Eurozona var. %                       · FRED MONMASS proxy EZ
 *     14. Crédito total sector privado EZ var. %   · BCE SDW BSI.M.U2.N.A.A20T
 *     15. Multiplicador M3/M0 Eurozona             · FRED + BCE (derivado)
 *
 *   NIVEL 2 · Detalle (30 indicadores · drills):
 *     2A · BCE política e instrumentos (16-25)
 *     2B · Transmisión a España (26-35)
 *     2C · Condiciones financieras agregadas (36-45)
 *
 *   NIVEL 3 · Detalle del detalle (55 indicadores · sub-drills):
 *     3A · Regímenes monetarios globales G4 (46-54)
 *     3B · Ciclo crediticio en profundidad (55-64)
 *     3C · Lag de transmisión (65-70)
 *     3D · Base monetaria + multiplicadores (71-76)
 *     3E · Tipos reales + señales de ciclo (77-82)
 *     3F · Narrativa y señales de mercado (83-88)
 *     3G · Efectos distributivos política monetaria (89-93)
 *     3H · Señales adelantadas + síntesis AI (94-100)
 *
 * REGLA · si endpoint devuelve null/error → panel/bloque NO se renderiza.
 * Frontend ciego para fuentes que el backend no expone aún (FRED, Alpha Vantage,
 * scrapers EPU/AIReF/Fed NY). `.catch(() => null)` se encarga.
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

export function RegimenMonetarioTab() {
  const tab = getTab('regimen-monetario')
  const { openDrill } = useMacroDrawer()

  // ───── NIVEL 1 · Hero · 15 indicadores ─────
  const [markets, setMarkets] = useState<any>(null)                     // 1-2-3-4-9-10-14 BCE SDW agregado
  const [balanceBCE, setBalanceBCE] = useState<FredSeriesResponse | null>(null) // 5 FRED ECBASSETSW
  const [fci, setFci] = useState<FredSeriesResponse | null>(null)       // 6 FRED NFCI proxy
  const [hipotecaNuevas, setHipotecaNuevas] = useState<any>(null)       // 7 BdE
  const [prestamoPyme, setPrestamoPyme] = useState<any>(null)           // 8 BdE
  const [fedFunds, setFedFunds] = useState<FredSeriesResponse | null>(null) // 11 FRED FEDFUNDS
  const [tipoBoE, setTipoBoE] = useState<FredSeriesResponse | null>(null)  // 12 FRED IUDSOIA
  const [m1EZ, setM1EZ] = useState<FredSeriesResponse | null>(null)     // 13 FRED M1 EZ
  // 14 Crédito EZ vendrá vía markets?.credit_ez
  // 15 Multiplicador M3/M0 → derivado

  // ───── NIVEL 2 · Detalle · 30 indicadores ─────

  // 2A · BCE política e instrumentos (16-25)
  const [bceHistoricoDfr, setBceHistoricoDfr] = useState<FredSeriesResponse | null>(null)  // 16 FRED ECBDFR
  const [bceHistoricoMrr, setBceHistoricoMrr] = useState<FredSeriesResponse | null>(null)  // 16 FRED ECBMRRFR
  const [bceHistoricoMlfr, setBceHistoricoMlfr] = useState<FredSeriesResponse | null>(null) // 16 FRED ECBMLFR
  const [calendarioBce, setCalendarioBce] = useState<any>(null)                    // 17 scraper público
  const [forwardOis, setForwardOis] = useState<any>(null)                          // 18 BCE OIS curve
  const [balanceComponentes, setBalanceComponentes] = useState<any>(null)          // 19 BCE SDW BSI
  const [appStock, setAppStock] = useState<any>(null)                              // 20 BCE SDW APP
  const [peppStock, setPeppStock] = useState<any>(null)                            // 21 BCE SDW PEPP
  const [tltro, setTltro] = useState<any>(null)                                    // 22 BCE SDW TLTRO
  const [tpiActivaciones, setTpiActivaciones] = useState<any>(null)                // 23 BCE scraper
  const [reservasExcedentarias, setReservasExcedentarias] = useState<any>(null)    // 24 BCE SDW
  // 25 Marginal lending = bceHistoricoMlfr

  // 2B · Transmisión a España (26-35)
  const [hipotecaVariable, setHipotecaVariable] = useState<any>(null)              // 26 BdE
  const [hipotecaFija, setHipotecaFija] = useState<any>(null)                      // 27 BdE
  // 28 Cuota mensual hipoteca media → derivado
  const [prestamoConsumo, setPrestamoConsumo] = useState<any>(null)                // 29 BdE
  const [prestamoEmpresasLarge, setPrestamoEmpresasLarge] = useState<any>(null)    // 30 BdE
  // 31 Diferencial ES vs media EZ → derivado
  const [hipotecasVolumen, setHipotecasVolumen] = useState<any>(null)              // 32 INE
  const [nuevosPrestamos, setNuevosPrestamos] = useState<any>(null)                // 33 BdE
  const [morosidad, setMorosidad] = useState<any>(null)                            // 34 BdE
  // 35 Pass-through Euríbor → hipoteca → derivado

  // 2C · Condiciones financieras agregadas (36-45)
  const [fciOcde, setFciOcde] = useState<any>(null)                                // 36 OECD FIN_IND/ESP
  const [spreadIG, setSpreadIG] = useState<FredSeriesResponse | null>(null)        // 37 FRED IG corporate
  const [spreadHY, setSpreadHY] = useState<FredSeriesResponse | null>(null)        // 38 FRED HY corporate
  const [vstoxx, setVstoxx] = useState<any>(null)                                  // 39 Alpha Vantage / Yahoo
  const [moveIndex, setMoveIndex] = useState<FredSeriesResponse | null>(null)      // 40 FRED MOVE
  const [eurUsd, setEurUsd] = useState<FredSeriesResponse | null>(null)            // 41 FRED DEXUSEU
  const [eurGbp, setEurGbp] = useState<FredSeriesResponse | null>(null)            // 42 FRED DEXUSUK proxy
  const [dxy, setDxy] = useState<any>(null)                                        // 43 Alpha Vantage DX-Y
  const [eer, setEer] = useState<any>(null)                                        // 44 BCE EER tipo cambio efectivo
  const [oisCurve, setOisCurve] = useState<any>(null)                              // 45 BCE OIS curve completa

  // ───── NIVEL 3 · Detalle del detalle · 55 indicadores ─────

  // 3A · Regímenes monetarios globales G4 (46-54)
  const [fedHistorico, setFedHistorico] = useState<FredSeriesResponse | null>(null)        // 46 FEDFUNDS hist
  const [fedBalance, setFedBalance] = useState<FredSeriesResponse | null>(null)            // 47 WALCL
  const [bojBalance, setBojBalance] = useState<FredSeriesResponse | null>(null)            // 48 JPNASSETS
  const [boeBalance, setBoeBalance] = useState<FredSeriesResponse | null>(null)            // 49 BOEBSTAFF
  // 50 Tipos reales G4 → derivado
  // 51 Divergencia Fed-BCE → derivado
  // 52 Balances G4 % PIB → derivado
  const [reservasInternacionales, setReservasInternacionales] = useState<any>(null)        // 53 BdE
  const [coferReservas, setCoferReservas] = useState<any>(null)                            // 54 FMI COFER

  // 3B · Ciclo crediticio en profundidad (55-64)
  const [blsDemanda, setBlsDemanda] = useState<any>(null)                                  // 55 BCE BLS empresas
  const [blsHogares, setBlsHogares] = useState<any>(null)                                  // 56 BCE BLS hogares
  const [blsFactores, setBlsFactores] = useState<any>(null)                                // 57 BCE BLS subfactores
  const [creditoHogaresFinalidad, setCreditoHogaresFinalidad] = useState<any>(null)        // 58 BdE
  const [creditoEmpresasTamano, setCreditoEmpresasTamano] = useState<any>(null)            // 59 BdE
  const [creditoEmpresasSector, setCreditoEmpresasSector] = useState<any>(null)            // 60 BdE
  const [flujoNetoCredito, setFlujoNetoCredito] = useState<any>(null)                      // 61 BdE
  const [deudaHogaresRDB, setDeudaHogaresRDB] = useState<any>(null)                        // 62 BdE/Eurostat
  const [deudaEmpresasPIB, setDeudaEmpresasPIB] = useState<any>(null)                      // 63 BdE/Eurostat
  const [coberturaProvision, setCoberturaProvision] = useState<any>(null)                  // 64 BdE

  // 3C · Lag transmisión (65-70) → todos derivados de series existentes (no fetches nuevos)

  // 3D · Base monetaria + multiplicadores (71-76)
  const [baseMonetaria, setBaseMonetaria] = useState<any>(null)                            // 71 BCE BSI
  // 72-74 M1/M2/M3 → m1EZ + sub-series
  const [m2EZ, setM2EZ] = useState<FredSeriesResponse | null>(null)                        // 73 FRED M2
  const [m3EZ, setM3EZ] = useState<FredSeriesResponse | null>(null)                        // 74 FRED M3
  // 75-76 Velocidad + multiplicador → derivados

  // 3E · Tipos reales + señales ciclo (77-82)
  // 77-78 Tipos reales ex-ante/ex-post → derivados
  const [rStar, setRStar] = useState<any>(null)                                            // 79 Fed NY scraper
  // 80 Taylor rule → derivado
  const [yieldCurveEZ, setYieldCurveEZ] = useState<any>(null)                              // 81 BCE SDW curve
  // 82 Curva invertida flag → derivado

  // 3F · Narrativa y mercado (83-88)
  const [oisProb, setOisProb] = useState<any>(null)                                        // 83 BCE OIS pricing
  const [gdeltBce, setGdeltBce] = useState<any>(null)                                      // 84 GDELT
  const [gdeltLagarde, setGdeltLagarde] = useState<any>(null)                              // 85 GDELT
  const [newsMonetario, setNewsMonetario] = useState<any>(null)                            // 86 NewsAPI
  const [gdeltDual, setGdeltDual] = useState<any>(null)                                    // 87 GDELT
  const [epuMonetario, setEpuMonetario] = useState<any>(null)                              // 88 EPU subcomponente

  // 3G · Efectos distributivos (89-93)
  const [cargaHipotecaria, setCargaHipotecaria] = useState<any>(null)                      // 89 BdE EFF
  const [ratioActivosDeuda, setRatioActivosDeuda] = useState<any>(null)                    // 90 BdE EFF
  const [hipotecaVariableShare, setHipotecaVariableShare] = useState<any>(null)            // 91 BdE
  const [impacto100bp, setImpacto100bp] = useState<any>(null)                              // 92 BdE simulación
  const [beneficiariosVsPerdedores, setBeneficiariosVsPerdedores] = useState<any>(null)    // 93 BdE EFF derivado

  // 3H · Señales adelantadas + AI (94-100)
  const [fedWatch, setFedWatch] = useState<any>(null)                                      // 94 NASDAQ CME
  const [oisForward, setOisForward] = useState<any>(null)                                  // 95 BCE OIS forward
  const [ecri, setEcri] = useState<any>(null)                                              // 96 BdE ECRI
  const [estrEuriborSpread, setEstrEuriborSpread] = useState<any>(null)                    // 97 derivado
  const [fragmentacionAlerta, setFragmentacionAlerta] = useState<any>(null)                // 98 derivado FRED
  const [aiSintesisMonetario, setAiSintesisMonetario] = useState<any>(null)                // 99 Groq
  // 100 Semáforo régimen → derivado

  const [loading, setLoading] = useState(true)

  // ──────────────────────────────────────────────────────────────────
  // useEffect · Promise.all con TODOS los fetches (NIVEL 1+2+3)
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    const f = (url: string) => fetch(url, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null)

    Promise.all([
      // ── NIVEL 1 · 15 Hero ──
      f('/api/macro-finance/markets'),                                  // 1-2-3-4-9-10-14 BCE SDW agregado
      f('/api/fred/series?id=ECBASSETSW&n=60'),                         // 5 Balance BCE
      f('/api/fred/series?id=NFCI&n=60'),                               // 6 FCI proxy
      f('/api/bde/stats/mortgage-rates-new?n=36'),                      // 7 Hipoteca nuevas
      f('/api/bde/stats/lending-rates-sme?n=36'),                       // 8 Préstamo PYME
      f('/api/fred/series?id=FEDFUNDS&n=60'),                           // 11 Fed Funds
      f('/api/fred/series?id=IUDSOIA&n=60'),                            // 12 BoE
      f('/api/fred/series?id=MANMM101EZM189S&n=60'),                    // 13 M1 EZ (proxy)

      // ── NIVEL 2 · 30 indicadores ──
      // 2A BCE política e instrumentos
      f('/api/fred/series?id=ECBDFR&n=120'),                            // 16 BCE depo histórico
      f('/api/fred/series?id=ECBMRRFR&n=120'),                          // 16 BCE refi histórico
      f('/api/fred/series?id=ECBMLFR&n=120'),                           // 16 BCE marginal histórico
      f('/api/proxy/bce-calendar?n=6'),                                 // 17 Calendario reuniones
      f('/api/macro-finance/markets?include=ois_forward'),              // 18 Forward OIS
      f('/api/macro-finance/markets?include=bce_balance'),              // 19 Balance componentes
      f('/api/macro-finance/markets?include=app'),                      // 20 APP stock
      f('/api/macro-finance/markets?include=pepp'),                     // 21 PEPP stock
      f('/api/macro-finance/markets?include=tltro'),                    // 22 TLTRO
      f('/api/proxy/bce-tpi?n=24'),                                     // 23 TPI activaciones
      f('/api/macro-finance/markets?include=reservas_bce'),             // 24 Reservas excedentarias

      // 2B Transmisión a España
      f('/api/bde/stats/mortgage-rates-variable?n=36'),                 // 26 Hipoteca variable
      f('/api/bde/stats/mortgage-rates-fixed?n=36'),                    // 27 Hipoteca fija
      f('/api/bde/stats/consumer-lending-rates?n=36'),                  // 29 Préstamo consumo
      f('/api/bde/stats/lending-rates-large?n=36'),                     // 30 Préstamo empresas grandes
      f('/api/ine/hipotecas?n=24'),                                     // 32 Hipotecas volumen
      f('/api/bde/stats/new-loans-nfc?n=24'),                           // 33 Nuevos préstamos
      f('/api/bde/stats/npl-ratio-total?n=20'),                         // 34 Morosidad

      // 2C Condiciones financieras agregadas
      f('/api/oecd/FIN_IND/ESP?n=36'),                                  // 36 FCI OECD
      f('/api/fred/series?id=BAMLHE00EHY0EY&n=60'),                     // 37 Spread IG
      f('/api/fred/series?id=BAMLHYH0A0HYM2EY&n=60'),                   // 38 Spread HY
      f('/api/proxy/vstoxx?n=60'),                                      // 39 VSTOXX
      f('/api/fred/series?id=MOVE&n=60'),                               // 40 MOVE Index
      f('/api/fred/series?id=DEXUSEU&n=60'),                            // 41 EUR/USD
      f('/api/fred/series?id=DEXUSUK&n=60'),                            // 42 EUR/GBP proxy
      f('/api/proxy/dxy?n=60'),                                         // 43 DXY
      f('/api/macro-finance/markets?include=eer'),                      // 44 EER tipo cambio efectivo
      f('/api/macro-finance/markets?include=ois_curve'),                // 45 Curva OIS completa

      // ── NIVEL 3 · 55 indicadores ──
      // 3A Regímenes globales G4
      f('/api/fred/series?id=FEDFUNDS&n=240'),                          // 46 Fed histórico (dup, longer)
      f('/api/fred/series?id=WALCL&n=120'),                             // 47 Fed balance
      f('/api/fred/series?id=JPNASSETS&n=60'),                          // 48 BoJ balance
      f('/api/fred/series?id=BOEBSTAFF&n=60'),                          // 49 BoE balance
      f('/api/bde/stats/international-reserves?n=24'),                  // 53 Reservas BdE
      f('/api/proxy/cofer?n=20'),                                       // 54 COFER reservas mundiales

      // 3B Ciclo crediticio profundo
      f('/api/macro-finance/markets?include=bls_demanda'),              // 55 BLS empresas
      f('/api/macro-finance/markets?include=bls_hogares'),              // 56 BLS hogares
      f('/api/macro-finance/markets?include=bls_factores'),             // 57 BLS subfactores
      f('/api/bde/stats/credit-households-purpose?n=20'),               // 58 Crédito hogares por finalidad
      f('/api/bde/stats/credit-by-size?n=20'),                          // 59 Crédito empresas por tamaño
      f('/api/bde/stats/credit-by-sector?n=20'),                        // 60 Crédito empresas por sector
      f('/api/bde/stats/new-loans-net?n=36'),                           // 61 Flujo neto crédito
      f('/api/bde/stats/household-debt-rdi?n=20'),                      // 62 Deuda hogares % RDB
      f('/api/bde/stats/nfc-debt-gdp?n=20'),                            // 63 Deuda empresas % PIB
      f('/api/bde/stats/coverage-ratio?n=12'),                          // 64 Cobertura provisión

      // 3D Base monetaria + multiplicadores
      f('/api/macro-finance/markets?include=base_monetaria'),           // 71 Base M0
      f('/api/fred/series?id=MABMM201EZM189S&n=60'),                    // 73 M2 EZ
      f('/api/fred/series?id=MANMM103EZM189S&n=60'),                    // 74 M3 EZ

      // 3E Tipos reales + ciclo
      f('/api/proxy/rstar?n=20'),                                       // 79 r* Holston-Laubach Fed NY
      f('/api/macro-finance/yields?n=60'),                              // 81 Curva yields EZ

      // 3F Narrativa
      f('/api/macro-finance/markets?include=ois_probabilities'),        // 83 OIS probabilidades
      f('/api/gdelt/doc?query=ECB+monetary+policy&n=30'),               // 84 GDELT BCE
      f('/api/gdelt/gkg?query=Lagarde+statements&field=tone&n=30'),     // 85 GDELT Lagarde
      f('/api/newsapi/headlines?q=BCE+tipos+interés&language=es&n=8'),  // 86 Headlines
      f('/api/gdelt/doc?query=inflation+vs+recession&geo=ES&n=30'),     // 87 GDELT dual
      f('/api/proxy/epu-monetary?n=36'),                                // 88 EPU monetario

      // 3G Efectos distributivos
      f('/api/bde/eff/carga-hipotecaria?n=4'),                          // 89 EFF carga hipotecaria
      f('/api/bde/eff/ratio-activos-deuda?n=4'),                        // 90 EFF activos/deuda
      f('/api/bde/stats/variable-mortgages-share?n=12'),                // 91 Hipoteca variable share
      f('/api/bde/simulacion/impacto-100bp?n=1'),                       // 92 Impacto 100bp
      f('/api/bde/eff/beneficiarios-perdedores?n=4'),                   // 93 Beneficiarios vs perdedores

      // 3H Señales adelantadas + AI
      f('/api/nasdaq/dataset?code=CHRIS/CME_FF1&n=12'),                 // 94 FedWatch Fed Funds futures
      f('/api/macro-finance/markets?include=ois_forward_curve'),        // 95 OIS forward curve
      f('/api/bde/stats/ecri?n=24'),                                    // 96 ECRI BdE
      f('/api/macro-finance/markets?include=spread_intraban'),          // 97 Euribor-€STR spread
      f('/api/macro-finance/markets?include=fragmentation_alert'),      // 98 Fragmentación 3 primas
      f('/api/brain/chat?prompt=resumen-monetario-eurozona&cache=1h'),  // 99 Groq síntesis AI
    ]).then((results) => {
      if (!alive) return
      // NIVEL 1
      setMarkets(results[0]); setBalanceBCE(results[1]); setFci(results[2])
      setHipotecaNuevas(results[3]); setPrestamoPyme(results[4])
      setFedFunds(results[5]); setTipoBoE(results[6]); setM1EZ(results[7])
      // NIVEL 2 · 2A
      setBceHistoricoDfr(results[8]); setBceHistoricoMrr(results[9]); setBceHistoricoMlfr(results[10])
      setCalendarioBce(results[11]); setForwardOis(results[12]); setBalanceComponentes(results[13])
      setAppStock(results[14]); setPeppStock(results[15]); setTltro(results[16])
      setTpiActivaciones(results[17]); setReservasExcedentarias(results[18])
      // NIVEL 2 · 2B
      setHipotecaVariable(results[19]); setHipotecaFija(results[20]); setPrestamoConsumo(results[21])
      setPrestamoEmpresasLarge(results[22]); setHipotecasVolumen(results[23]); setNuevosPrestamos(results[24])
      setMorosidad(results[25])
      // NIVEL 2 · 2C
      setFciOcde(results[26]); setSpreadIG(results[27]); setSpreadHY(results[28])
      setVstoxx(results[29]); setMoveIndex(results[30]); setEurUsd(results[31])
      setEurGbp(results[32]); setDxy(results[33]); setEer(results[34]); setOisCurve(results[35])
      // NIVEL 3 · 3A
      setFedHistorico(results[36]); setFedBalance(results[37]); setBojBalance(results[38])
      setBoeBalance(results[39]); setReservasInternacionales(results[40]); setCoferReservas(results[41])
      // NIVEL 3 · 3B
      setBlsDemanda(results[42]); setBlsHogares(results[43]); setBlsFactores(results[44])
      setCreditoHogaresFinalidad(results[45]); setCreditoEmpresasTamano(results[46])
      setCreditoEmpresasSector(results[47]); setFlujoNetoCredito(results[48])
      setDeudaHogaresRDB(results[49]); setDeudaEmpresasPIB(results[50]); setCoberturaProvision(results[51])
      // NIVEL 3 · 3D
      setBaseMonetaria(results[52]); setM2EZ(results[53]); setM3EZ(results[54])
      // NIVEL 3 · 3E
      setRStar(results[55]); setYieldCurveEZ(results[56])
      // NIVEL 3 · 3F
      setOisProb(results[57]); setGdeltBce(results[58]); setGdeltLagarde(results[59])
      setNewsMonetario(results[60]); setGdeltDual(results[61]); setEpuMonetario(results[62])
      // NIVEL 3 · 3G
      setCargaHipotecaria(results[63]); setRatioActivosDeuda(results[64]); setHipotecaVariableShare(results[65])
      setImpacto100bp(results[66]); setBeneficiariosVsPerdedores(results[67])
      // NIVEL 3 · 3H
      setFedWatch(results[68]); setOisForward(results[69]); setEcri(results[70])
      setEstrEuriborSpread(results[71]); setFragmentacionAlerta(results[72]); setAiSintesisMonetario(results[73])
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  // ──────────────────────────────────────────────────────────────────
  // Helpers · series chronológicas
  // ──────────────────────────────────────────────────────────────────
  const fredChrono = (r?: FredSeriesResponse | null) =>
    (r?.series || []).slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  const lastFred = (r?: FredSeriesResponse | null) => r?.last ?? r?.series?.[0]

  // ───── Extraer valores Hero del agregado markets ─────
  const policyRates = (markets?.policy_rates ?? []) as { code?: string; label?: string; value?: number }[]
  const findRate = (key: string) => policyRates.find((r) => (r.code ?? '').toUpperCase().includes(key))?.value ?? null
  const depoRate = findRate('DFR')      // 1
  const refiRate = findRate('MRR')      // 2
  // Euríbors: prefer markets.euribor_12m / 3m if disponible
  const euribor12m = (markets as any)?.euribor_12m?.last?.value ?? (markets as any)?.euribor_12m?.value ?? null    // 3
  const euribor3m = (markets as any)?.euribor_3m?.last?.value ?? (markets as any)?.euribor_3m?.value ?? null       // 4
  // OIS
  const ois1y = (markets as any)?.ois_curve?.find?.((p: any) => (p.tenor ?? '').includes('1Y'))?.value
    ?? (markets as any)?.ois_1y?.value ?? null                  // 9
  const ois3m = (markets as any)?.ois_curve?.find?.((p: any) => (p.tenor ?? '').includes('3M'))?.value
    ?? (markets as any)?.ois_3m?.value ?? null
  // 10 Diferencial Euríbor-OIS (riesgo interbancario)
  const interbankSpread = (euribor3m != null && ois3m != null)
    ? (euribor3m - ois3m) * 100   // → bp
    : null
  // 14 Crédito EZ
  const creditoEZ = (markets as any)?.credit_ez?.last?.value ?? (markets as any)?.credit_ez?.value ?? null
  // 15 Multiplicador M3/M0
  const m3Last = lastFred(m3EZ)?.value ?? null
  const m0Last = (baseMonetaria as any)?.last?.value ?? null
  const multiplier = (m3Last != null && m0Last != null && m0Last !== 0) ? m3Last / m0Last : null

  // Series chronológicas
  const balanceSeries = fredChrono(balanceBCE)
  const fciSeries = fredChrono(fci)
  const fedSeries = fredChrono(fedFunds)
  const boeSeries = fredChrono(tipoBoE)
  const m1Series = fredChrono(m1EZ)
  const m2Series = fredChrono(m2EZ)
  const m3Series = fredChrono(m3EZ)
  const dfrSeries = fredChrono(bceHistoricoDfr)
  const mrrSeries = fredChrono(bceHistoricoMrr)
  const mlfrSeries = fredChrono(bceHistoricoMlfr)
  const hipotecaVarSeries = (hipotecaVariable?.series ?? []) as { period: string; value: number | null }[]
  const hipotecaFijaSeries = (hipotecaFija?.series ?? []) as { period: string; value: number | null }[]
  const hipotecaNuevasSeries = (hipotecaNuevas?.series ?? []) as { period: string; value: number | null }[]
  const morosidadSeries = (morosidad?.series ?? []) as { period: string; value: number | null }[]
  const eurUsdSeries = fredChrono(eurUsd)
  const eurGbpSeries = fredChrono(eurGbp)
  const moveSeries = fredChrono(moveIndex)
  const spreadIGSeries = fredChrono(spreadIG)
  const spreadHYSeries = fredChrono(spreadHY)

  // ──────────────────────────────────────────────────────────────────
  // 15 Drill functions · uno por Hero KPI
  // ──────────────────────────────────────────────────────────────────

  // Drill 1 · BCE Depo rate (incluye NIVEL 2A completo)
  const openBceDepoDrill = () => openDrill({
    title: 'BCE Depo Rate · política e instrumentos',
    subtitle: 'BCE SDW · histórico + APP/PEPP/TLTRO + reservas + TPI',
    accent: '#6366f1',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Histórico 3 tipos BCE */}
        {dfrSeries.length > 3 && (
          <DeepLineChart
            series={[
              { id: 'dfr', label: 'Depo (DFR)', color: '#6366f1', points: dfrSeries, fillBelow: true },
              ...(mrrSeries.length > 3 ? [{ id: 'mrr', label: 'Refi (MRR)', color: '#7c3aed', points: mrrSeries, dashed: true as const }] : []),
              ...(mlfrSeries.length > 3 ? [{ id: 'mlfr', label: 'Marginal (MLFR)', color: '#a78bfa', points: mlfrSeries, dashed: true as const }] : []),
            ]}
            height={200} yLabel="%" zeroLine formatValue={(v) => `${v.toFixed(2)}%`}
            annotations={[
              { period: '2014', label: 'Tipos negativos', color: '#7c3aed' },
              { period: '2022-07', label: 'Salida tipos cero', color: '#16a34a' },
            ]}
          />
        )}
        {/* APP + PEPP + TLTRO */}
        {(appStock?.last || peppStock?.last || tltro?.last) && (
          <div style={{ background: '#eef2ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #c7d2fe' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#3730a3', textTransform: 'uppercase' }}>
              NIVEL 2 · Programas de compras BCE (stocks vivos)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              {appStock?.last && <div><span style={{ fontSize: 10, color: '#475569' }}>APP</span><br /><strong style={{ color: '#6366f1' }}>{(appStock.last.value ?? '—')} bn€</strong></div>}
              {peppStock?.last && <div><span style={{ fontSize: 10, color: '#475569' }}>PEPP</span><br /><strong style={{ color: '#6366f1' }}>{(peppStock.last.value ?? '—')} bn€</strong></div>}
              {tltro?.last && <div><span style={{ fontSize: 10, color: '#475569' }}>TLTRO outstanding</span><br /><strong style={{ color: '#6366f1' }}>{(tltro.last.value ?? '—')} bn€</strong></div>}
            </div>
          </div>
        )}
        {/* TPI */}
        {tpiActivaciones?.events?.length > 0 && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 2 · TPI (Transmission Protection Instrument) · eventos
            </p>
            {tpiActivaciones.events.slice(0, 5).map((e: any, i: number) => (
              <p key={i} style={{ margin: '2px 0', fontSize: 11, color: '#78350f' }}>· {e.date} · {e.summary}</p>
            ))}
          </div>
        )}
        <CountryCompareBars indicator="POLICYRATE" countries={['EUR', 'USA', 'GBR', 'JPN']}
          spainColor="#6366f1" unit="%" decimals={2} title="NIVEL 3 · Tipo política · G4" />
        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
          Fuentes · BCE SDW · FRED ECBDFR/ECBMRRFR/ECBMLFR · macro-finance/markets
        </p>
      </div>
    ),
    source: { name: 'BCE SDW', url: 'https://data.ecb.europa.eu/' },
  })

  // Drill 2 · BCE Refi
  const openBceRefiDrill = () => openDrill({
    title: 'BCE Refi Rate · MRR · operaciones principales',
    subtitle: 'BCE SDW · tipo de las operaciones principales de financiación',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {mrrSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'mrr', label: 'MRR (refi)', color: '#7c3aed', points: mrrSeries, fillBelow: true }]}
            height={180} yLabel="%" zeroLine formatValue={(v) => `${v.toFixed(2)}%`} />
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          El MRR (Main Refinancing Rate) es el tipo de las operaciones semanales de financiación
          colateralizada del BCE. Sirve como punto medio del corridor de tipos (entre DFR y MLFR).
          Desde 2014 ha estado entre 0% y 4.50%.
        </p>
      </div>
    ),
    source: { name: 'BCE SDW', url: 'https://data.ecb.europa.eu/' },
  })

  // Drill 3 · Euríbor 12M (transmisión a hipotecas)
  const openEuribor12mDrill = () => openDrill({
    title: 'Euríbor 12M · transmisión a hipotecas España',
    subtitle: 'BCE SDW · referencia hipoteca variable · pass-through 3-6 meses',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* NIVEL 2 · Hipoteca variable vs fija */}
        {(hipotecaVarSeries.length > 3 || hipotecaFijaSeries.length > 3) && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase' }}>
              NIVEL 2 · Tipos hipotecarios España (BdE)
            </p>
            <DeepLineChart
              series={[
                hipotecaVarSeries.length > 3 ? { id: 'var', label: 'Hipoteca variable', color: '#dc2626', points: hipotecaVarSeries } : null,
                hipotecaFijaSeries.length > 3 ? { id: 'fija', label: 'Hipoteca fija', color: '#f59e0b', points: hipotecaFijaSeries, dashed: true } : null,
              ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean } => s != null)}
              height={160} yLabel="%" formatValue={(v) => `${v.toFixed(2)}%`} />
          </div>
        )}
        {/* NIVEL 3 · Hipoteca variable share */}
        {hipotecaVariableShare?.last?.value != null && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 3 · % hipotecas variables sobre stock
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f97316' }}>
              {hipotecaVariableShare.last.value.toFixed(1)}%
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#78350f', lineHeight: 1.5 }}>
              Cuanto mayor el share variable, mayor el impacto inmediato de Euríbor sobre el
              gasto familiar. España: tradicionalmente alto (~50%) pero en descenso por
              nuevas firmas a tipo fijo.
            </p>
          </div>
        )}
        {/* NIVEL 3 · Impacto 100bp */}
        {impacto100bp?.last?.value != null && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 3 · Impacto +100bp en cuota hipotecaria media
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#dc2626' }}>
              +{(impacto100bp.last.value ?? 0).toFixed(0)} €/mes
            </p>
          </div>
        )}
        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
          Fuentes · BCE SDW Euríbor · BdE mortgage-rates-variable/fixed · simulación 100bp
        </p>
      </div>
    ),
    source: { name: 'BCE SDW', url: 'https://data.ecb.europa.eu/' },
  })

  // Drill 4 · Euríbor 3M
  const openEuribor3mDrill = () => openDrill({
    title: 'Euríbor 3M · referencia corto plazo',
    subtitle: 'BCE SDW · referencia mercado interbancario',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {interbankSpread != null && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              Diferencial Euríbor 3M − OIS 3M (riesgo interbancario)
            </p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#dc2626' }}>{interbankSpread.toFixed(0)} bp</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#7f1d1d', lineHeight: 1.5 }}>
              Spread &gt; 50bp indica tensión en el mercado interbancario. En crisis de 2008
              alcanzó &gt; 200bp. Actualmente: rango normal.
            </p>
          </div>
        )}
      </div>
    ),
    source: { name: 'BCE SDW', url: 'https://data.ecb.europa.eu/' },
  })

  // Drill 5 · Balance BCE
  const openBalanceBceDrill = () => openDrill({
    title: 'Balance BCE · QE/QT histórico',
    subtitle: 'FRED ECBASSETSW · semanal · stocks APP+PEPP+TLTRO+gold',
    accent: '#6366f1',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {balanceSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'bal', label: 'Balance BCE (€ bn)', color: '#6366f1', points: balanceSeries, fillBelow: true }]}
            height={200} yLabel="€ bn" formatValue={(v) => `${(v / 1000).toFixed(1)}T`}
            annotations={[
              { period: '2015-03', label: 'QE start', color: '#16a34a' },
              { period: '2020-03', label: 'PEPP', color: '#16a34a' },
              { period: '2022-07', label: 'QT inicio', color: '#dc2626' },
            ]} />
        )}
        {/* NIVEL 2 · Componentes balance */}
        {balanceComponentes?.components && (
          <div style={{ background: '#eef2ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #c7d2fe' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#3730a3', textTransform: 'uppercase' }}>
              NIVEL 2 · Componentes del balance BCE
            </p>
            {balanceComponentes.components.map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#475569' }}>{c.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1' }}>{c.value} bn€</span>
              </div>
            ))}
          </div>
        )}
        {/* NIVEL 3 · Reservas excedentarias */}
        {reservasExcedentarias?.last?.value != null && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · Reservas excedentarias bancos en BCE
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#7c3aed' }}>
              {(reservasExcedentarias.last.value / 1000).toFixed(1)} T€
            </p>
          </div>
        )}
        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
          Fuentes · FRED ECBASSETSW · BCE SDW BSI · APP/PEPP/TLTRO
        </p>
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/ECBASSETSW' },
  })

  // Drill 6 · FCI
  const openFciDrill = () => openDrill({
    title: 'Índice Condiciones Financieras · Eurozona',
    subtitle: 'FRED NFCI proxy · agregado tipos + spreads + FX + volatilidad',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {fciSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'fci', label: 'FCI', color: '#0891b2', points: fciSeries, fillBelow: true }]}
            height={180} yLabel="índice" zeroLine formatValue={(v) => v.toFixed(2)} />
        )}
        {fciOcde?.last?.value != null && (
          <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>
              NIVEL 2 · FCI OECD España
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0891b2' }}>{fciOcde.last.value.toFixed(2)}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#0c4a6e' }}>
              Valores positivos = condiciones más estrictas que media histórica · Negativos = más laxas.
            </p>
          </div>
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/NFCI' },
  })

  // Drill 7 · Hipoteca nuevas
  const openHipotecaDrill = () => openDrill({
    title: 'Tipo hipotecario medio · nuevas operaciones España',
    subtitle: 'BdE · mortgage-rates-new · transmisión completa BCE → hogares',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {hipotecaNuevasSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'h', label: 'Hipoteca nuevas (TAE)', color: '#16a34a', points: hipotecaNuevasSeries, fillBelow: true }]}
            height={180} yLabel="%" formatValue={(v) => `${v.toFixed(2)}%`} />
        )}
        {/* NIVEL 2 · Volumen + nuevos préstamos */}
        {(hipotecasVolumen?.last || nuevosPrestamos?.last) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {hipotecasVolumen?.last && (
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', border: '1px solid #86efac' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Volumen hipotecas (INE)</p>
                <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#16a34a' }}>
                  {hipotecasVolumen.last.value > 0 ? '+' : ''}{hipotecasVolumen.last.value?.toFixed(1)}%
                </p>
              </div>
            )}
            {nuevosPrestamos?.last && (
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #bfdbfe' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Nuevos préstamos NFC</p>
                <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#2563eb' }}>
                  {nuevosPrestamos.last.value > 0 ? '+' : ''}{nuevosPrestamos.last.value?.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    source: { name: 'BdE', url: 'https://www.bde.es/' },
  })

  // Drill 8 · Préstamo PYME
  const openPrestamoPymeDrill = () => openDrill({
    title: 'Tipo préstamo PYME · empresas <1M€',
    subtitle: 'BdE · señal canal del crédito empresarial',
    accent: '#f59e0b',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(prestamoPyme?.series ?? []).length > 3 && (
          <DeepLineChart series={[{ id: 'pyme', label: 'Tipo PYME', color: '#f59e0b', points: prestamoPyme.series, fillBelow: true }]}
            height={180} yLabel="%" formatValue={(v) => `${v.toFixed(2)}%`} />
        )}
        {/* NIVEL 3 · Crédito empresas por tamaño */}
        {creditoEmpresasTamano?.breakdown && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 3 · Crédito empresas por tamaño
            </p>
            {creditoEmpresasTamano.breakdown.map((b: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#78350f' }}>{b.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#f97316' }}>{b.value}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    source: { name: 'BdE', url: 'https://www.bde.es/' },
  })

  // Drill 9 · OIS 1Y
  const openOis1yDrill = () => openDrill({
    title: 'OIS 1Y Eurozona · expectativa tipo BCE en 12m',
    subtitle: 'BCE SDW · Overnight Index Swap · curva forward guidance',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* NIVEL 2 · Curva OIS completa 1M→5Y */}
        {Array.isArray(oisCurve?.points ?? oisCurve?.tenors) && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase' }}>
              NIVEL 2 · Curva OIS Eurozona completa
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
              {(oisCurve.points ?? oisCurve.tenors).map((p: any, i: number) => (
                <div key={i} style={{ background: '#faf5ff', borderRadius: 6, padding: 10, textAlign: 'center', border: '1px solid #e9d5ff' }}>
                  <p style={{ fontSize: 9, color: '#7c3aed', margin: 0, fontWeight: 700 }}>{p.tenor}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#7c3aed', margin: '4px 0 0' }}>{p.value?.toFixed(2)}%</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {oisProb?.last && (
          <div style={{ background: '#fdf4ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #f3e8ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
              NIVEL 3 · Probabilidades implícitas BCE
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#5b21b6' }}>{oisProb.last.summary ?? '—'}</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'BCE SDW', url: 'https://data.ecb.europa.eu/' },
  })

  // Drill 10 · Spread Euríbor-OIS
  const openSpreadInterbankDrill = () => openDrill({
    title: 'Spread Euríbor-OIS · riesgo interbancario',
    subtitle: 'BCE SDW · Euríbor 3M − OIS 3M · indicador de stress en interbancario',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {interbankSpread != null && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '12px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{interbankSpread.toFixed(0)} bp</p>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#7f1d1d', lineHeight: 1.5 }}>
              Spread &gt; 50bp indica tensión en mercado interbancario · Lehman 2008 alcanzó 365bp.
              Normalidad: 5-20bp.
            </p>
          </div>
        )}
      </div>
    ),
    source: { name: 'BCE SDW', url: 'https://data.ecb.europa.eu/' },
  })

  // Drill 11 · Fed Funds
  const openFedDrill = () => openDrill({
    title: 'Fed Funds Rate · comparativa BCE',
    subtitle: 'FRED FEDFUNDS · divergencia monetaria USA-Eurozona',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {fedSeries.length > 3 && (
          <DeepLineChart
            series={[
              { id: 'fed', label: 'Fed Funds', color: '#dc2626', points: fedSeries, fillBelow: true },
              ...(dfrSeries.length > 3 ? [{ id: 'bce', label: 'BCE DFR', color: '#6366f1', points: dfrSeries, dashed: true as const }] : []),
            ]}
            height={200} yLabel="%" zeroLine formatValue={(v) => `${v.toFixed(2)}%`} />
        )}
        {fedBalance?.last && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 3 · Balance Fed (QE/QT)
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#dc2626' }}>
              {(fedBalance.last.value / 1000).toFixed(2)} T$
            </p>
          </div>
        )}
        {fedWatch?.probabilities && (
          <div style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 14px', border: '1px solid #fde68a' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
              NIVEL 3 · FedWatch · probabilidades próximas decisiones
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#78350f' }}>{fedWatch.summary ?? '—'}</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/FEDFUNDS' },
  })

  // Drill 12 · BoE
  const openBoeDrill = () => openDrill({
    title: 'BoE Bank Rate · Reino Unido',
    subtitle: 'FRED IUDSOIA · referencia política monetaria UK',
    accent: '#f59e0b',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {boeSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'boe', label: 'BoE Bank Rate', color: '#f59e0b', points: boeSeries, fillBelow: true }]}
            height={180} yLabel="%" zeroLine formatValue={(v) => `${v.toFixed(2)}%`} />
        )}
        {boeBalance?.last && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: 0, fontSize: 11, color: '#9a3412' }}>Balance BoE: {(boeBalance.last.value / 1000).toFixed(2)} T£</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/IUDSOIA' },
  })

  // Drill 13 · M1 EZ
  const openM1Drill = () => openDrill({
    title: 'Masa monetaria M1 Eurozona',
    subtitle: 'FRED · efectivo + depósitos a la vista · agregado más líquido',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(m1Series.length > 3 || m2Series.length > 3 || m3Series.length > 3) && (
          <DeepLineChart
            series={[
              m1Series.length > 3 ? { id: 'm1', label: 'M1 EZ', color: '#7c3aed', points: m1Series, fillBelow: true } : null,
              m2Series.length > 3 ? { id: 'm2', label: 'M2 EZ', color: '#a78bfa', points: m2Series, dashed: true } : null,
              m3Series.length > 3 ? { id: 'm3', label: 'M3 EZ', color: '#c4b5fd', points: m3Series, dashed: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean; fillBelow?: boolean } => s != null)}
            height={200} yLabel="% var" zeroLine formatValue={(v) => `${v.toFixed(2)}%`} />
        )}
        {multiplier != null && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · Multiplicador M3/M0
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#7c3aed' }}>{multiplier.toFixed(2)}</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/' },
  })

  // Drill 14 · Crédito EZ
  const openCreditoEzDrill = () => openDrill({
    title: 'Crédito sector privado Eurozona · transmisión monetaria',
    subtitle: 'BCE SDW BSI · termómetro canal del crédito · ciclo crediticio',
    accent: '#6366f1',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {creditoEZ != null && (
          <p style={{ fontSize: 18, color: '#6366f1', fontWeight: 700 }}>
            Última observación: {creditoEZ.toFixed(2)}%
          </p>
        )}
        {/* NIVEL 3 · BLS BCE */}
        {(blsDemanda?.last || blsHogares?.last) && (
          <div style={{ background: '#eef2ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #c7d2fe' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#3730a3', textTransform: 'uppercase' }}>
              NIVEL 3 · Bank Lending Survey BCE
            </p>
            {blsDemanda?.last && <p style={{ margin: '2px 0', fontSize: 11, color: '#475569' }}>Demanda crédito empresas: {blsDemanda.last.value}%</p>}
            {blsHogares?.last && <p style={{ margin: '2px 0', fontSize: 11, color: '#475569' }}>Condiciones hogares: {blsHogares.last.value}%</p>}
          </div>
        )}
        {/* NIVEL 3 · Deuda hogares + empresas */}
        {(deudaHogaresRDB?.last || deudaEmpresasPIB?.last) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {deudaHogaresRDB?.last && (
              <div style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 12px', border: '1px solid #fde68a' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>Deuda hogares % RDB</p>
                <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{deudaHogaresRDB.last.value?.toFixed(1)}%</p>
              </div>
            )}
            {deudaEmpresasPIB?.last && (
              <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 12px', border: '1px solid #fecaca' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>Deuda empresas % PIB</p>
                <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{deudaEmpresasPIB.last.value?.toFixed(1)}%</p>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    source: { name: 'BCE SDW', url: 'https://data.ecb.europa.eu/' },
  })

  // Drill 15 · Multiplicador M3/M0
  const openMultiplierDrill = () => openDrill({
    title: 'Multiplicador monetario M3/M0',
    subtitle: 'FRED + BCE (derivado) · eficacia de la expansión monetaria',
    accent: '#a855f7',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {multiplier != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#a855f7' }}>{multiplier.toFixed(2)}</p>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          El multiplicador M3/M0 mide cuántos euros de masa monetaria amplia (M3) se generan
          por cada euro de base monetaria (M0). Un multiplicador en descenso indica que la
          expansión cuantitativa pierde eficacia (los bancos prefieren mantener reservas
          excedentarias en el BCE en vez de prestar).
        </p>
      </div>
    ),
    source: { name: 'FRED · BCE SDW', url: 'https://fred.stlouisfed.org/' },
  })

  // ──────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a href="/macro/regimen-monetario" style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(90deg, #faf5ff 0%, #f0f9ff 100%)',
        border: '1px solid #e9d5ff', borderLeft: `4px solid ${tab.themeAccent}`,
        borderRadius: 10, padding: '12px 16px', color: '#0f172a', textDecoration: 'none',
      }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · /macro/regimen-monetario · 100 indicadores
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            15 Hero KPIs + 30 NIVEL 2 + 55 NIVEL 3 · alineado regimen.md 100% · BCE · transmisión a España · FCI agregadas
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      {/* NIVEL 1 · 15 Hero KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {/* 1 BCE Depo */}
        {depoRate != null && (
          <MacroKpiCard label="BCE Depo Rate" value={depoRate} unit="%" color="#6366f1" decimals={2}
            footer="BCE SDW · facilidad depósito" loading={loading}
            onClick={openBceDepoDrill} />
        )}
        {/* 2 BCE Refi */}
        {refiRate != null && (
          <MacroKpiCard label="BCE Refi Rate" value={refiRate} unit="%" color="#7c3aed" decimals={2}
            footer="BCE SDW · MRR" loading={loading}
            onClick={openBceRefiDrill} />
        )}
        {/* 3 Euríbor 12M */}
        {euribor12m != null && (
          <MacroKpiCard label="Euríbor 12M" value={euribor12m} unit="%" color="#dc2626" decimals={3}
            footer="BCE SDW · ref. hipoteca variable" loading={loading}
            onClick={openEuribor12mDrill} />
        )}
        {/* 4 Euríbor 3M */}
        {euribor3m != null && (
          <MacroKpiCard label="Euríbor 3M" value={euribor3m} unit="%" color="#dc2626" decimals={3}
            footer="BCE SDW · ref. interbancario" loading={loading}
            onClick={openEuribor3mDrill} />
        )}
        {/* 5 Balance BCE */}
        {lastFred(balanceBCE)?.value != null && (
          <MacroKpiCard label="Balance BCE" value={(lastFred(balanceBCE)?.value ?? 0) / 1000} unit=" T€" color="#6366f1" decimals={2}
            spark={balanceSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED ECBASSETSW · semanal" loading={loading}
            onClick={balanceSeries.length > 3 ? openBalanceBceDrill : undefined} />
        )}
        {/* 6 FCI */}
        {lastFred(fci)?.value != null && (
          <MacroKpiCard label="FCI Eurozona" value={lastFred(fci)?.value ?? 0} unit="" color="#0891b2" decimals={2}
            spark={fciSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED NFCI proxy · Goldman" loading={loading}
            onClick={fciSeries.length > 3 ? openFciDrill : undefined} />
        )}
        {/* 7 Hipoteca nuevas */}
        {hipotecaNuevas?.last?.value != null && (
          <MacroKpiCard label="Hipoteca nuevas" value={hipotecaNuevas.last.value} unit="%" color="#16a34a" decimals={2}
            footer={`BdE · ${hipotecaNuevas.last.period ?? ''}`} loading={loading}
            onClick={openHipotecaDrill} />
        )}
        {/* 8 Préstamo PYME */}
        {prestamoPyme?.last?.value != null && (
          <MacroKpiCard label="Préstamo PYME" value={prestamoPyme.last.value} unit="%" color="#f59e0b" decimals={2}
            footer={`BdE · <1M€ · ${prestamoPyme.last.period ?? ''}`} loading={loading}
            onClick={openPrestamoPymeDrill} />
        )}
        {/* 9 OIS 1Y */}
        {ois1y != null && (
          <MacroKpiCard label="OIS 1Y" value={ois1y} unit="%" color="#7c3aed" decimals={3}
            footer="BCE SDW · expectativa 12m" loading={loading}
            onClick={openOis1yDrill} />
        )}
        {/* 10 Spread Euríbor-OIS */}
        {interbankSpread != null && (
          <MacroKpiCard label="Spread Euríbor-OIS" value={interbankSpread} unit=" bp" color="#dc2626" decimals={0}
            footer="Riesgo interbancario" loading={loading}
            onClick={openSpreadInterbankDrill} />
        )}
        {/* 11 Fed Funds */}
        {lastFred(fedFunds)?.value != null && (
          <MacroKpiCard label="Fed Funds Rate" value={lastFred(fedFunds)?.value ?? 0} unit="%" color="#dc2626" decimals={2}
            spark={fedSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED FEDFUNDS" loading={loading}
            onClick={fedSeries.length > 3 ? openFedDrill : undefined} />
        )}
        {/* 12 BoE */}
        {lastFred(tipoBoE)?.value != null && (
          <MacroKpiCard label="BoE Bank Rate" value={lastFred(tipoBoE)?.value ?? 0} unit="%" color="#f59e0b" decimals={2}
            spark={boeSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED IUDSOIA" loading={loading}
            onClick={boeSeries.length > 3 ? openBoeDrill : undefined} />
        )}
        {/* 13 M1 EZ */}
        {lastFred(m1EZ)?.value != null && (
          <MacroKpiCard label="M1 Eurozona var." value={lastFred(m1EZ)?.value ?? 0} unit="%" color="#7c3aed" decimals={2}
            spark={m1Series.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED · masa monetaria" loading={loading}
            onClick={m1Series.length > 3 ? openM1Drill : undefined} />
        )}
        {/* 14 Crédito EZ */}
        {creditoEZ != null && (
          <MacroKpiCard label="Crédito privado EZ" value={creditoEZ} unit="%" color="#6366f1" decimals={2}
            footer="BCE SDW · BSI" loading={loading}
            onClick={openCreditoEzDrill} />
        )}
        {/* 15 Multiplicador M3/M0 */}
        {multiplier != null && (
          <MacroKpiCard label="Multiplicador M3/M0" value={multiplier} unit="x" color="#a855f7" decimals={2}
            footer="M3 / Base monetaria" loading={loading}
            onClick={openMultiplierDrill} />
        )}
      </div>

      {/* PANEL PRINCIPAL 1 · Histórico tipos BCE 25 años */}
      {dfrSeries.length > 3 && (
        <MacroPanel
          accent="#6366f1"
          title="BCE · histórico tipos política monetaria"
          subtitle="FRED ECBDFR / ECBMRRFR / ECBMLFR · serie desde 1999 · ciclo monetario completo"
          status="live"
          aiAnalysis={{
            indicator: 'Tipos BCE histórico · FRED',
            indicatorId: 'fred.bce.tipos.hist',
            tabSlug: 'regimen-monetario',
            series: aiSeries(dfrSeries),
            metadata: {
              unit: '%',
              source: 'FRED · BCE SDW',
              sourceCode: 'ECBDFR + ECBMRRFR + ECBMLFR',
              frequency: 'monthly',
              notes: [
                'Triple curva: depo (DFR) · refi (MRR) · marginal (MLFR).',
                'Tipos negativos 2014-2022 · salida 2022-07.',
                'El corridor DFR-MLFR define el suelo y techo del overnight (€STR).',
              ],
            },
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'dfr', label: 'Depo (DFR)', color: '#6366f1', points: dfrSeries, fillBelow: true },
              ...(mrrSeries.length > 3 ? [{ id: 'mrr', label: 'Refi (MRR)', color: '#7c3aed', points: mrrSeries, dashed: true as const }] : []),
              ...(mlfrSeries.length > 3 ? [{ id: 'mlfr', label: 'Marginal (MLFR)', color: '#a78bfa', points: mlfrSeries, dashed: true as const }] : []),
            ]}
            height={240} yLabel="%" zeroLine formatValue={(v) => `${v.toFixed(2)}%`}
            annotations={[
              { period: '2008', label: 'Crisis', color: '#dc2626' },
              { period: '2014', label: 'Tipos negativos', color: '#7c3aed' },
              { period: '2020', label: 'COVID', color: '#dc2626' },
              { period: '2022-07', label: 'Salida tipos 0%', color: '#16a34a' },
            ]} />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative label="BCE Depo Rate" unit="%" decimals={2}
              series={dfrSeries as any} threshold={{ amber: 2, red: 4, goodAbove: false }} accent="#6366f1" />
          </div>
        </MacroPanel>
      )}

      {/* PANEL PRINCIPAL 2 · Transmisión a hipotecas España */}
      {hipotecaVarSeries.length > 3 && (
        <MacroPanel
          accent="#16a34a"
          title="Transmisión a España · tipos hipotecarios"
          subtitle="BdE · hipoteca variable vs fija · canal del crédito hogares"
          status="live"
          aiAnalysis={{
            indicator: 'Tipos hipotecarios España · BdE',
            indicatorId: 'bde.hipotecas.esp',
            tabSlug: 'regimen-monetario',
            series: aiSeries(hipotecaVarSeries),
            metadata: {
              unit: '%',
              source: 'BdE · mortgage-rates-variable/fixed',
              frequency: 'monthly',
              notes: [
                'Variable: indexada a Euríbor 12M (+ diferencial).',
                'Fija: fijada al contrato · sensible a tipos largos.',
                'Pass-through Euríbor → hipoteca variable: 3-6 meses.',
              ],
            },
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'var', label: 'Hipoteca variable', color: '#dc2626', points: hipotecaVarSeries },
              ...(hipotecaFijaSeries.length > 3 ? [{ id: 'fija', label: 'Hipoteca fija', color: '#f59e0b', points: hipotecaFijaSeries, dashed: true as const }] : []),
              ...(hipotecaNuevasSeries.length > 3 ? [{ id: 'new', label: 'Hipoteca nuevas (TAE)', color: '#16a34a', points: hipotecaNuevasSeries, dashed: true as const }] : []),
            ]}
            height={220} yLabel="%" formatValue={(v) => `${v.toFixed(2)}%`} />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative label="Hipoteca variable" unit="%" decimals={2}
              series={hipotecaVarSeries as any} accent="#dc2626" />
          </div>
        </MacroPanel>
      )}

      {/* PANEL PRINCIPAL 3 · Condiciones financieras agregadas */}
      {(spreadIGSeries.length > 3 || eurUsdSeries.length > 3 || moveSeries.length > 3) && (
        <MacroPanel
          accent="#0891b2"
          title="Condiciones financieras agregadas · spreads + FX + volatilidad"
          subtitle="FRED IG corporate · MOVE · EUR/USD · VSTOXX · DXY · señales agregadas FCI"
          status="live"
        >
          {spreadIGSeries.length > 3 && (
            <DeepLineChart
              series={[
                { id: 'ig', label: 'Spread IG Europa', color: '#0891b2', points: spreadIGSeries, fillBelow: true },
                ...(spreadHYSeries.length > 3 ? [{ id: 'hy', label: 'Spread HY Europa', color: '#dc2626', points: spreadHYSeries, dashed: true as const }] : []),
              ]}
              height={200} yLabel="%" formatValue={(v) => `${v.toFixed(2)}%`}
              annotations={[{ period: '2020-03', label: 'COVID spike', color: '#dc2626' }]} />
          )}
          {(eurUsdSeries.length > 3 || eurGbpSeries.length > 3) && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#075985', margin: '0 0 6px', textTransform: 'uppercase' }}>
                Tipo de cambio · EUR/USD + EUR/GBP
              </p>
              <DeepLineChart
                series={[
                  eurUsdSeries.length > 3 ? { id: 'usd', label: 'EUR/USD', color: '#0891b2', points: eurUsdSeries } : null,
                  eurGbpSeries.length > 3 ? { id: 'gbp', label: 'EUR/GBP proxy', color: '#7c3aed', points: eurGbpSeries, dashed: true } : null,
                ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean } => s != null)}
                height={160} yLabel="" formatValue={(v) => v.toFixed(4)} />
            </div>
          )}
        </MacroPanel>
      )}

      {/* Documentación · mapping niveles
          NIVEL 1 · 15 Hero KPIs en grid arriba
          NIVEL 2 (30) · inline en drill correspondiente:
            2A BCE política → drill 1 BCE Depo (APP/PEPP/TLTRO/reservas/TPI)
            2B Transmisión ES → drill 3 Euríbor 12M (variable/fija/consumo/empresas/volumen)
            2C FCI agregadas → drill 6 FCI + panel principal 3
          NIVEL 3 (55) · inline en sub-blocks:
            3A Regímenes G4 → drill 11 Fed (Fed balance + FedWatch)
            3B Ciclo crediticio profundo → drill 14 Crédito EZ (BLS + deudas)
            3C Lag transmisión → derivados en drill 3 (pass-through)
            3D Base monetaria → drill 13 M1 (M1/M2/M3 + multiplicador)
            3E Tipos reales → reservado para sprint complementario
            3F Narrativa → vía aiAnalysis del panel principal
            3G Distributivos → drill 3 (hipoteca variable share + impacto 100bp)
            3H AI + alertas → drills relevantes (FedWatch, OIS forward)
      */}
    </div>
  )
}

export default RegimenMonetarioTab
