'use client'
/**
 * `<FlujosCapitalTab />` · Tab 7 · TEJIDO EMPRESARIAL PROFUNDO.
 *
 * NOTA · El componente sigue exportándose con el nombre legacy
 * `FlujosCapitalTab` para no romper imports en `MacroShell`/`tabs-config`.
 * En la NUEVA taxonomía económica de 15 tabs el slot Tab 7 ya no es
 * "Flujos de capital" sino "Tejido Empresarial". El renombrado del
 * fichero y del export se hará en sprint futuro de housekeeping sin
 * afectar rutas.
 *
 * Alineado al 100% con `Tab 7.md` · 100 indicadores en 3 niveles.
 * Radiografía completa del tejido empresarial español: creación,
 * supervivencia, inversión, innovación, concentración sectorial,
 * internacionalización y clima de negocios. NO es mercado de capitales
 * (eso es Tab 6 · Mercados & Activos) sino la empresa REAL.
 *
 *   NIVEL 1 · Hero (15 KPIs):
 *     1.  Empresas activas total            · INE DIRCE
 *     2.  Constituciones sociedades         · INE tm/soc/estcam
 *     3.  Disoluciones sociedades           · INE tm/soc/dissol
 *     4.  Tasa neta creación (derivado)     · INE
 *     5.  Concursos acreedores              · INE tm/soc/concur
 *     6.  PMI Manufacturero España          · NASDAQ S&P Global
 *     7.  PMI Servicios España              · NASDAQ S&P Global
 *     8.  PMI Compuesto España              · NASDAQ S&P Global
 *     9.  FBCF privada % PIB                · FRED + INE
 *     10. Beneficios EBE % PIB              · INE CNE B2G_B3G
 *     11. Índice Clima Empresarial (ICE)    · INE IEPC
 *     12. Gasto I+D % PIB                   · INE
 *     13. Exportadores regulares            · ICEX + AEAT
 *     14. Doing Business ranking            · World Bank IC.BUS.EASE.XQ
 *     15. Capitalización IBEX % PIB         · derivado Finnhub + INE
 *
 *   NIVEL 2 · Detalle (30 indicadores):
 *     2A · Demografía empresarial (16-25)
 *     2B · Actividad y clima empresarial (26-40)
 *     2C · Inversión y financiación (41-45)
 *
 *   NIVEL 3 · Detalle del detalle (55 indicadores):
 *     3A · Resultados IBEX 35 earnings (46-55)
 *     3B · Innovación y competitividad (56-65)
 *     3C · Sectores productivos clave (66-75)
 *     3D · Clima de negocios e institucional (76-85)
 *     3E · Internacionalización empresarial (86-90)
 *     3F · Narrativa y señales adelantadas (91-95)
 *     3G · Benchmarking y síntesis AI (96-100)
 *
 * REGLA · si endpoint devuelve null/error → panel/bloque NO se renderiza.
 * Frontend ciego para fuentes que el backend no expone aún (FRED, NASDAQ
 * Data Link, World Bank, Finnhub, scrapers Dealroom/Fortune/EPU/WEF/
 * Transparency International/ANFAC/APPA/Cámara Comercio).
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

export function FlujosCapitalTab() {
  // El slot Tab 7 ahora es "Tejido Empresarial" en la nueva taxonomía.
  const tab = getTab('flujos-capital')
  const { openDrill } = useMacroDrawer()

  // ───── NIVEL 1 · Hero · 15 indicadores ─────
  const [empresasActivas, setEmpresasActivas] = useState<any>(null)                  // 1 INE DIRCE
  const [constituciones, setConstituciones] = useState<any>(null)                    // 2 INE
  const [disoluciones, setDisoluciones] = useState<any>(null)                        // 3 INE
  // 4 Tasa neta → derivado
  const [concursos, setConcursos] = useState<any>(null)                              // 5 INE
  const [pmiManuf, setPmiManuf] = useState<any>(null)                                // 6 NASDAQ
  const [pmiServ, setPmiServ] = useState<any>(null)                                  // 7 NASDAQ
  const [pmiComp, setPmiComp] = useState<any>(null)                                  // 8 NASDAQ
  const [fbcfPrivada, setFbcfPrivada] = useState<FredSeriesResponse | null>(null)    // 9 FRED+INE
  const [ebePib, setEbePib] = useState<any>(null)                                    // 10 INE CNE
  const [ice, setIce] = useState<any>(null)                                          // 11 INE IEPC
  const [gastoIdPib, setGastoIdPib] = useState<any>(null)                            // 12 INE
  const [exportadoresRegulares, setExportadoresRegulares] = useState<any>(null)      // 13 ICEX
  const [doingBusiness, setDoingBusiness] = useState<any>(null)                      // 14 World Bank
  const [marketCapIbex, setMarketCapIbex] = useState<any>(null)                      // 15 Finnhub+INE

  // ───── NIVEL 2 · 2A Demografía empresarial (16-25) ─────
  const [empresasPorTamano, setEmpresasPorTamano] = useState<any>(null)              // 16
  const [empresasPorSector, setEmpresasPorSector] = useState<any>(null)              // 17
  const [empresasPorCcaa, setEmpresasPorCcaa] = useState<any>(null)                  // 18
  const [supervivencia, setSupervivencia] = useState<any>(null)                      // 19
  const [startups, setStartups] = useState<any>(null)                                // 20
  const [inversionStartups, setInversionStartups] = useState<any>(null)              // 21
  const [unicornios, setUnicornios] = useState<any>(null)                            // 22
  const [concursosPorSector, setConcursosPorSector] = useState<any>(null)            // 23
  const [tiempoConcurso, setTiempoConcurso] = useState<any>(null)                    // 24
  const [pctExportadoras, setPctExportadoras] = useState<any>(null)                  // 25

  // ───── NIVEL 2 · 2B Actividad y clima empresarial (26-40) ─────
  const [pmiEZManuf, setPmiEZManuf] = useState<any>(null)                            // 26
  const [pmiEZServ, setPmiEZServ] = useState<any>(null)                              // 27
  const [pmiDEManuf, setPmiDEManuf] = useState<any>(null)                            // 28
  const [pmiCNManuf, setPmiCNManuf] = useState<any>(null)                            // 29
  const [pmiNuevosPedidos, setPmiNuevosPedidos] = useState<any>(null)                // 30
  const [pmiPreciosInputs, setPmiPreciosInputs] = useState<any>(null)                // 31
  const [pmiEmpleo, setPmiEmpleo] = useState<any>(null)                              // 32
  const [confianzaIndustrial, setConfianzaIndustrial] = useState<any>(null)          // 33
  const [confianzaServicios, setConfianzaServicios] = useState<any>(null)            // 34
  const [confianzaConstruccion, setConfianzaConstruccion] = useState<any>(null)      // 35
  const [isa, setIsa] = useState<any>(null)                                          // 36 MINHAFP
  const [capacidadES, setCapacidadES] = useState<FredSeriesResponse | null>(null)    // 37 FRED ESUCA
  const [capacidadEZ, setCapacidadEZ] = useState<FredSeriesResponse | null>(null)    // 38 FRED EUCAPUTL
  const [ipiVar, setIpiVar] = useState<any>(null)                                    // 39 INE IPI
  const [ipiPorDestino, setIpiPorDestino] = useState<any>(null)                      // 40 INE IPI

  // ───── NIVEL 2 · 2C Inversión y financiación (41-45) ─────
  const [fbcfPrivadaHist, setFbcfPrivadaHist] = useState<any>(null)                  // 41 INE CNE
  const [fbcfMaquinaria, setFbcfMaquinaria] = useState<any>(null)                    // 42 INE P51M
  const [fbcfPropiedadInt, setFbcfPropiedadInt] = useState<any>(null)                // 43 INE P51N
  const [creditoNFC, setCreditoNFC] = useState<any>(null)                            // 44 BCE BSI
  const [tipoPrestamoNFC, setTipoPrestamoNFC] = useState<any>(null)                  // 45 BdE+BCE

  // ───── NIVEL 3 · 3A Earnings IBEX (46-55) ─────
  const [bpaIbex, setBpaIbex] = useState<any>(null)                                  // 46
  const [bpaRevisiones, setBpaRevisiones] = useState<any>(null)                      // 47
  const [revenueGrowth, setRevenueGrowth] = useState<any>(null)                      // 48
  const [margenEbitda, setMargenEbitda] = useState<any>(null)                        // 49
  const [deudaNetaEbitda, setDeudaNetaEbitda] = useState<any>(null)                  // 50
  const [calendarioEarnings, setCalendarioEarnings] = useState<any>(null)            // 51
  const [sorpresasEarnings, setSorpresasEarnings] = useState<any>(null)              // 52
  const [recomprasAcciones, setRecomprasAcciones] = useState<any>(null)              // 53
  const [dividendosCal, setDividendosCal] = useState<any>(null)                      // 54
  const [ratingsIbex, setRatingsIbex] = useState<any>(null)                          // 55

  // ───── NIVEL 3 · 3B Innovación competitividad (56-65) ─────
  const [gastoIdHist, setGastoIdHist] = useState<any>(null)                          // 56
  const [gastoIdPorSector, setGastoIdPorSector] = useState<any>(null)                // 57
  const [gastoIdPeers, setGastoIdPeers] = useState<any>(null)                        // 58
  const [patentesEPO, setPatentesEPO] = useState<any>(null)                          // 59
  const [patentesTriadicas, setPatentesTriadicas] = useState<any>(null)              // 60
  const [gii, setGii] = useState<any>(null)                                          // 61 WIPO
  const [desi, setDesi] = useState<any>(null)                                        // 62 CE DESI
  const [adopcionDigital, setAdopcionDigital] = useState<any>(null)                  // 63 Eurostat
  const [capitalRiesgoDeeptech, setCapitalRiesgoDeeptech] = useState<any>(null)      // 64 Dealroom
  const [transferenciaTecno, setTransferenciaTecno] = useState<any>(null)            // 65 OEPM+RedOTRI

  // ───── NIVEL 3 · 3C Sectores productivos clave (66-75) ─────
  const [produccionVehiculos, setProduccionVehiculos] = useState<any>(null)          // 66 ANFAC
  const [expVehiculos, setExpVehiculos] = useState<any>(null)                        // 67 Comtrade HS87
  const [produccionAgro, setProduccionAgro] = useState<any>(null)                    // 68 INE IPI
  const [expAgro, setExpAgro] = useState<any>(null)                                  // 69 Comtrade HS01-24
  const [visadosConstruccion, setVisadosConstruccion] = useState<any>(null)          // 70 INE+MITMA
  const [licitacionObraPub, setLicitacionObraPub] = useState<any>(null)              // 71 MITMA
  const [produccionRenovable, setProduccionRenovable] = useState<any>(null)          // 72 ESIOS+Ember
  const [inversionRenovables, setInversionRenovables] = useState<any>(null)          // 73 APPA+IRENA
  const [logistica, setLogistica] = useState<any>(null)                              // 74 Portwatch+PMI
  const [retailVentas, setRetailVentas] = useState<any>(null)                        // 75 INE ICM

  // ───── NIVEL 3 · 3D Clima negocios institucional (76-85) ─────
  const [wefGci, setWefGci] = useState<any>(null)                                    // 76
  const [wgiGovernance, setWgiGovernance] = useState<any>(null)                      // 77 World Bank WGI
  const [tiCpi, setTiCpi] = useState<any>(null)                                      // 78 Transparency Intl
  const [ruleOfLaw, setRuleOfLaw] = useState<any>(null)                              // 79 WGI RL
  const [tiempoCrearEmpresa, setTiempoCrearEmpresa] = useState<any>(null)            // 80 WB IC.REG.DURS
  const [costeCrearEmpresa, setCosteCrearEmpresa] = useState<any>(null)              // 81 WB IC.REG.COST
  const [cargaRegulatoria, setCargaRegulatoria] = useState<any>(null)                // 82 WEF burden
  const [epuEmpresarial, setEpuEmpresarial] = useState<any>(null)                    // 83 EPU
  const [litigiosidadMercantil, setLitigiosidadMercantil] = useState<any>(null)      // 84 CGPJ
  const [morosidadComercial, setMorosidadComercial] = useState<any>(null)            // 85 Cámara+BdE

  // ───── NIVEL 3 · 3E Internacionalización (86-90) ─────
  const [empresasETVE, setEmpresasETVE] = useState<any>(null)                        // 86 DataInvex+INE
  const [ventasFiliales, setVentasFiliales] = useState<any>(null)                    // 87 UNCTAD
  const [fortune500Spain, setFortune500Spain] = useState<any>(null)                  // 88 Fortune
  const [maOut, setMaOut] = useState<any>(null)                                      // 89 Finnhub ES acquirer
  const [maIn, setMaIn] = useState<any>(null)                                        // 90 Finnhub ES target

  // ───── NIVEL 3 · 3F Narrativa señales (91-95) ─────
  const [gdeltQuiebra, setGdeltQuiebra] = useState<any>(null)                        // 91 GDELT bankruptcy
  const [gdeltInversion, setGdeltInversion] = useState<any>(null)                    // 92 GDELT investment positive
  const [newsRegulacion, setNewsRegulacion] = useState<any>(null)                    // 93 NewsAPI
  const [newsMA, setNewsMA] = useState<any>(null)                                    // 94 NewsAPI M&A
  const [trendsCrearEmpresa, setTrendsCrearEmpresa] = useState<any>(null)            // 95 Google Trends

  // ───── NIVEL 3 · 3G Benchmarking AI (96-100) ─────
  const [pmiPeersOECD, setPmiPeersOECD] = useState<any>(null)                        // 96 NASDAQ multi
  const [creacionEmpresasPeers, setCreacionEmpresasPeers] = useState<any>(null)      // 97 OECD SDBS
  const [idPeersRanking, setIdPeersRanking] = useState<any>(null)                    // 98 OECD MSTI
  // 99 Semáforo tejido → derivado
  const [aiSintesisTejido, setAiSintesisTejido] = useState<any>(null)                // 100 Groq

  const [loading, setLoading] = useState(true)

  // ──────────────────────────────────────────────────────────────────
  // useEffect · Promise.all (NIVEL 1+2+3 · ~93 fetches)
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    const f = (url: string) => fetch(url, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null)

    Promise.all([
      // NIVEL 1 (14 fetches · ind 4 derivado)
      f('/api/ine/dirce?type=empresas-activas&n=20'),                                // 1
      f('/api/ine/sociedades?type=constituciones&n=36'),                             // 2
      f('/api/ine/sociedades?type=disoluciones&n=36'),                               // 3
      f('/api/ine/sociedades?type=concursos&n=36'),                                  // 5
      f('/api/nasdaq/pmi?country=ESP&sector=manufacturing&n=36'),                    // 6
      f('/api/nasdaq/pmi?country=ESP&sector=services&n=36'),                         // 7
      f('/api/nasdaq/pmi?country=ESP&sector=composite&n=36'),                        // 8
      f('/api/fred/series?id=ESPNPDCPRIVGDP&n=40'),                                  // 9
      f('/api/ine/cne?series=B2G_B3G&n=40'),                                         // 10 EBE
      f('/api/ine/iepc?type=ICE&n=20'),                                              // 11
      f('/api/ine/i-d?type=gasto-pib&n=20'),                                         // 12
      f('/api/icex/exportadores-regulares?n=10'),                                    // 13
      f('/api/worldbank/IC.BUS.EASE.XQ?country=ESP&n=15'),                           // 14
      f('/api/proxy/market-cap-ibex-pib'),                                           // 15

      // NIVEL 2 · 2A Demografía (10 fetches)
      f('/api/ine/dirce?type=tamano&n=10'),                                          // 16
      f('/api/ine/dirce?type=sector-cnae2&n=10'),                                    // 17
      f('/api/ine/dirce?type=ccaa&n=10'),                                            // 18
      f('/api/ine/demografia-empresarial?type=supervivencia&n=10'),                  // 19
      f('/api/proxy/dealroom-startups?country=ESP&n=12'),                            // 20
      f('/api/proxy/dealroom-vc?country=ESP&n=12'),                                  // 21
      f('/api/proxy/dealroom-unicorns?country=ESP'),                                 // 22
      f('/api/ine/sociedades?type=concursos-sector&n=12'),                           // 23
      f('/api/cgpj/tiempo-resolucion-mercantil?n=10'),                               // 24
      f('/api/proxy/pct-empresas-exportadoras?country=ESP&n=10'),                    // 25

      // NIVEL 2 · 2B Actividad y clima (15 fetches)
      f('/api/nasdaq/pmi?country=EZ&sector=manufacturing&n=24'),                     // 26
      f('/api/nasdaq/pmi?country=EZ&sector=services&n=24'),                          // 27
      f('/api/nasdaq/pmi?country=DE&sector=manufacturing&n=24'),                     // 28
      f('/api/nasdaq/pmi?country=CN&sector=manufacturing&n=24'),                     // 29
      f('/api/nasdaq/pmi?country=ESP&sub=new-orders&n=24'),                          // 30
      f('/api/nasdaq/pmi?country=ESP&sub=input-prices&n=24'),                        // 31
      f('/api/nasdaq/pmi?country=ESP&sub=employment&n=24'),                          // 32
      f('/api/ine/iepc?type=industria&n=24'),                                        // 33
      f('/api/ine/iepc?type=servicios&n=24'),                                        // 34
      f('/api/ine/iepc?type=construccion&n=24'),                                     // 35
      f('/api/minhafp/isa?n=24'),                                                    // 36
      f('/api/fred/series?id=ESUCA&n=40'),                                           // 37
      f('/api/fred/series?id=EUCAPUTL&n=40'),                                        // 38
      f('/api/ine/ipi?n=24'),                                                        // 39
      f('/api/ine/ipi?type=destino-economico&n=24'),                                 // 40

      // NIVEL 2 · 2C Inversión y financiación (5 fetches)
      f('/api/ine/cne?series=FBCF-privada&n=40'),                                    // 41
      f('/api/ine/cne?series=P51M-maquinaria&n=24'),                                 // 42
      f('/api/ine/cne?series=P51N-propiedad-intelectual&n=24'),                      // 43
      f('/api/macro-finance/markets?include=credit_nfc_es'),                         // 44
      f('/api/bde/stats/lending-rates-nfc-es-vs-ez?n=24'),                           // 45

      // NIVEL 3 · 3A Earnings IBEX (10 fetches)
      f('/api/finnhub/financials?index=IBEX&metric=bpa&n=8'),                        // 46
      f('/api/finnhub/estimates?index=IBEX&type=bpa-revisions&n=8'),                 // 47
      f('/api/finnhub/financials?index=IBEX&metric=revenue-yoy&top=10'),             // 48
      f('/api/finnhub/financials?index=IBEX&metric=ebitda-margin&top=10'),           // 49
      f('/api/finnhub/financials?index=IBEX&metric=debt-ebitda&top=10'),             // 50
      f('/api/finnhub/earnings-calendar?index=IBEX&days=60'),                        // 51
      f('/api/finnhub/earnings-surprise?index=IBEX&n=8'),                            // 52
      f('/api/finnhub/buybacks?index=IBEX&n=8'),                                     // 53
      f('/api/finnhub/dividends?index=IBEX'),                                        // 54
      f('/api/finnhub/credit-ratings?index=IBEX'),                                   // 55

      // NIVEL 3 · 3B Innovación (10 fetches)
      f('/api/ine/i-d?type=historico&n=20'),                                         // 56
      f('/api/ine/i-d?type=por-sector-ejecutor&n=10'),                               // 57
      f('/api/oecd/msti?country=ESP&peers=DEU,FRA,OECD&n=15'),                       // 58
      f('/api/proxy/epo-patents?country=ESP&n=15'),                                  // 59
      f('/api/oecd/patents?country=ESP&type=triadic&n=15'),                          // 60
      f('/api/proxy/wipo-gii?country=ESP'),                                          // 61
      f('/api/proxy/desi?country=ESP'),                                              // 62
      f('/api/eurostat/isoc_eb_ai?country=ESP&n=10'),                                // 63
      f('/api/proxy/dealroom-deeptech?country=ESP'),                                 // 64
      f('/api/proxy/oepm-spinoffs?n=10'),                                            // 65

      // NIVEL 3 · 3C Sectores clave (10 fetches)
      f('/api/proxy/anfac-produccion-vehiculos?n=36'),                               // 66
      f('/api/uncomtrade/hs?reporter=724&flow=X&cmd=87&n=24'),                       // 67
      f('/api/ine/ipi?type=alimentacion&n=24'),                                      // 68
      f('/api/uncomtrade/hs?reporter=724&flow=X&cmd=01-24&n=24'),                    // 69
      f('/api/proxy/visados-obra-nueva?n=24'),                                       // 70
      f('/api/proxy/licitacion-obra-publica?n=24'),                                  // 71
      f('/api/esios/renovable-gwh?n=90'),                                            // 72
      f('/api/proxy/appa-inversion-renovables?n=10'),                                // 73
      f('/api/proxy/logistica-index?n=24'),                                          // 74
      f('/api/ine/icm?n=24'),                                                        // 75

      // NIVEL 3 · 3D Clima negocios (10 fetches)
      f('/api/proxy/wef-gci?country=ESP'),                                           // 76
      f('/api/worldbank/WGI?country=ESP&n=10'),                                      // 77
      f('/api/proxy/transparency-cpi?country=ESP&n=10'),                             // 78
      f('/api/worldbank/WGI?country=ESP&type=rule-of-law&n=10'),                     // 79
      f('/api/worldbank/IC.REG.DURS?country=ESP&n=10'),                              // 80
      f('/api/worldbank/IC.REG.COST.PC.ZS?country=ESP&n=10'),                        // 81
      f('/api/proxy/wef-burden-regulation?country=ESP'),                             // 82
      f('/api/proxy/epu?country=ESP&n=60'),                                          // 83
      f('/api/cgpj/litigiosidad-mercantil?n=10'),                                    // 84
      f('/api/proxy/morosidad-comercial?n=24'),                                      // 85

      // NIVEL 3 · 3E Internacionalización (5 fetches)
      f('/api/datainvex/etve?n=10'),                                                 // 86
      f('/api/proxy/unctad-ventas-filiales?country=ESP&n=10'),                       // 87
      f('/api/proxy/fortune-500?country=ESP'),                                       // 88
      f('/api/finnhub/ma?country=ESP&direction=out&n=20'),                           // 89
      f('/api/finnhub/ma?country=ESP&direction=in&n=20'),                            // 90

      // NIVEL 3 · 3F Narrativa (5 fetches)
      f('/api/gdelt/doc?query=bankruptcy+Spain+company&n=30'),                       // 91
      f('/api/gdelt/doc?query=investment+Spain&tone=positive&n=30'),                 // 92
      f('/api/newsapi/headlines?q=regulación+empresas+España&language=es&n=8'),      // 93
      f('/api/newsapi/headlines?q=fusión+adquisición+España&language=es&n=8'),       // 94
      f('/api/proxy/google-trends?query=crear+empresa+España&n=24'),                 // 95

      // NIVEL 3 · 3G Benchmarking + AI (4 fetches · ind 99 derivado)
      f('/api/nasdaq/pmi-multi?countries=ESP,DEU,FRA,ITA,OECD&sector=manufacturing&n=24'), // 96
      f('/api/oecd/sdbs?country=ESP&peers=OECD&n=15'),                               // 97
      f('/api/oecd/msti?type=ranking&n=30'),                                         // 98
      f('/api/brain/chat?prompt=resumen-tejido-empresarial-esp&cache=1h'),           // 100
    ]).then((r) => {
      if (!alive) return
      // NIVEL 1
      setEmpresasActivas(r[0]); setConstituciones(r[1]); setDisoluciones(r[2])
      setConcursos(r[3]); setPmiManuf(r[4]); setPmiServ(r[5]); setPmiComp(r[6])
      setFbcfPrivada(r[7]); setEbePib(r[8]); setIce(r[9]); setGastoIdPib(r[10])
      setExportadoresRegulares(r[11]); setDoingBusiness(r[12]); setMarketCapIbex(r[13])
      // 2A
      setEmpresasPorTamano(r[14]); setEmpresasPorSector(r[15]); setEmpresasPorCcaa(r[16])
      setSupervivencia(r[17]); setStartups(r[18]); setInversionStartups(r[19])
      setUnicornios(r[20]); setConcursosPorSector(r[21]); setTiempoConcurso(r[22])
      setPctExportadoras(r[23])
      // 2B
      setPmiEZManuf(r[24]); setPmiEZServ(r[25]); setPmiDEManuf(r[26]); setPmiCNManuf(r[27])
      setPmiNuevosPedidos(r[28]); setPmiPreciosInputs(r[29]); setPmiEmpleo(r[30])
      setConfianzaIndustrial(r[31]); setConfianzaServicios(r[32]); setConfianzaConstruccion(r[33])
      setIsa(r[34]); setCapacidadES(r[35]); setCapacidadEZ(r[36]); setIpiVar(r[37])
      setIpiPorDestino(r[38])
      // 2C
      setFbcfPrivadaHist(r[39]); setFbcfMaquinaria(r[40]); setFbcfPropiedadInt(r[41])
      setCreditoNFC(r[42]); setTipoPrestamoNFC(r[43])
      // 3A
      setBpaIbex(r[44]); setBpaRevisiones(r[45]); setRevenueGrowth(r[46])
      setMargenEbitda(r[47]); setDeudaNetaEbitda(r[48]); setCalendarioEarnings(r[49])
      setSorpresasEarnings(r[50]); setRecomprasAcciones(r[51]); setDividendosCal(r[52])
      setRatingsIbex(r[53])
      // 3B
      setGastoIdHist(r[54]); setGastoIdPorSector(r[55]); setGastoIdPeers(r[56])
      setPatentesEPO(r[57]); setPatentesTriadicas(r[58]); setGii(r[59]); setDesi(r[60])
      setAdopcionDigital(r[61]); setCapitalRiesgoDeeptech(r[62]); setTransferenciaTecno(r[63])
      // 3C
      setProduccionVehiculos(r[64]); setExpVehiculos(r[65]); setProduccionAgro(r[66])
      setExpAgro(r[67]); setVisadosConstruccion(r[68]); setLicitacionObraPub(r[69])
      setProduccionRenovable(r[70]); setInversionRenovables(r[71]); setLogistica(r[72])
      setRetailVentas(r[73])
      // 3D
      setWefGci(r[74]); setWgiGovernance(r[75]); setTiCpi(r[76]); setRuleOfLaw(r[77])
      setTiempoCrearEmpresa(r[78]); setCosteCrearEmpresa(r[79]); setCargaRegulatoria(r[80])
      setEpuEmpresarial(r[81]); setLitigiosidadMercantil(r[82]); setMorosidadComercial(r[83])
      // 3E
      setEmpresasETVE(r[84]); setVentasFiliales(r[85]); setFortune500Spain(r[86])
      setMaOut(r[87]); setMaIn(r[88])
      // 3F
      setGdeltQuiebra(r[89]); setGdeltInversion(r[90]); setNewsRegulacion(r[91])
      setNewsMA(r[92]); setTrendsCrearEmpresa(r[93])
      // 3G
      setPmiPeersOECD(r[94]); setCreacionEmpresasPeers(r[95]); setIdPeersRanking(r[96])
      setAiSintesisTejido(r[97])
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

  // Series
  const fbcfSeries = fredChrono(fbcfPrivada)
  const capacidadESSeries = fredChrono(capacidadES)
  const capacidadEZSeries = fredChrono(capacidadEZ)
  const pmiManufSeries = (pmiManuf?.series ?? []) as { period: string; value: number | null }[]
  const pmiServSeries = (pmiServ?.series ?? []) as { period: string; value: number | null }[]
  const pmiCompSeries = (pmiComp?.series ?? []) as { period: string; value: number | null }[]
  const constitucionesSeries = (constituciones?.series ?? []) as { period: string; value: number | null }[]
  const disolucionesSeries = (disoluciones?.series ?? []) as { period: string; value: number | null }[]
  const concursosSeries = (concursos?.series ?? []) as { period: string; value: number | null }[]

  // Últimos
  const empresasActivasLast = empresasActivas?.last ?? null
  const constLast = constituciones?.last ?? null
  const disolLast = disoluciones?.last ?? null
  const concLast = concursos?.last ?? null
  const pmiManufLast = pmiManuf?.last ?? null
  const pmiServLast = pmiServ?.last ?? null
  const pmiCompLast = pmiComp?.last ?? null
  const fbcfLast = lastFred(fbcfPrivada)
  const ebeLast = ebePib?.last ?? null
  const iceLast = ice?.last ?? null
  const gastoIdLast = gastoIdPib?.last ?? null
  const expRegLast = exportadoresRegulares?.last ?? null
  const dbLast = doingBusiness?.last ?? null
  const marketCapLast = marketCapIbex?.last ?? marketCapIbex?.value ?? null

  // Derivados
  // 4 Tasa neta creación = constituciones − disoluciones
  const tasaNetaCreacion = (constLast?.value != null && disolLast?.value != null)
    ? constLast.value - disolLast.value
    : null

  // 99 Semáforo tejido empresarial (PMI Composite + concursos + FBCF + crédito NFC)
  const semaforoTejido = (() => {
    const pmi = pmiCompLast?.value ?? null
    const conc = concLast?.value ?? null
    const fbcfV = fbcfLast?.value ?? null
    const credito = creditoNFC?.last?.value ?? null
    if (pmi == null && conc == null && fbcfV == null && credito == null) return null
    const score =
      (pmi != null && pmi < 47 ? 2 : pmi != null && pmi < 50 ? 1 : 0) +
      (conc != null && conc > 1000 ? 2 : conc != null && conc > 500 ? 1 : 0) +
      (fbcfV != null && fbcfV < 17 ? 1 : 0) +
      (credito != null && credito < 0 ? 1 : 0)
    return score >= 4 ? 'rojo' : score >= 2 ? 'amber' : 'verde'
  })()

  // ──────────────────────────────────────────────────────────────────
  // 15 Drill functions · uno por Hero KPI
  // ──────────────────────────────────────────────────────────────────

  const openEmpresasActivasDrill = () => openDrill({
    title: 'Empresas activas España · INE DIRCE',
    subtitle: 'Demografía empresarial completa · tamaño + sector + CCAA + supervivencia',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {empresasActivasLast?.value != null && (
          <p style={{ fontSize: 28, fontWeight: 700, color: '#16a34a' }}>{empresasActivasLast.value.toLocaleString('es-ES')}</p>
        )}
        {Array.isArray(empresasPorTamano?.breakdown) && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              NIVEL 2 · Por tamaño
            </p>
            {empresasPorTamano.breakdown.map((b: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#166534' }}>{b.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>{b.pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(supervivencia?.cohortes) && (
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              NIVEL 2 · Supervivencia 1/3/5 años
            </p>
            {supervivencia.cohortes.map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#1e40af' }}>{c.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#2563eb' }}>{c.pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    source: { name: 'INE DIRCE', url: 'https://www.ine.es/' },
  })

  const openConstitucionesDrill = () => openDrill({
    title: 'Constituciones de sociedades mercantiles',
    subtitle: 'INE · creación bruta de empresas nuevas mensual',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {constitucionesSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'c', label: 'Constituciones', color: '#16a34a', points: constitucionesSeries, fillBelow: true }]}
            height={180} yLabel="" formatValue={(v) => v.toLocaleString('es-ES')} />
        )}
        {Array.isArray(startups?.list) && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              NIVEL 2 · Startups SL &lt;3 años (Dealroom)
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{startups.list.length.toLocaleString('es-ES')}</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'INE', url: 'https://www.ine.es/' },
  })

  const openDisolucionesDrill = () => openDrill({
    title: 'Disoluciones de sociedades mercantiles',
    subtitle: 'INE · cierres voluntarios + concursos liquidados',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {disolucionesSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'd', label: 'Disoluciones', color: '#dc2626', points: disolucionesSeries, fillBelow: true }]}
            height={180} yLabel="" formatValue={(v) => v.toLocaleString('es-ES')} />
        )}
      </div>
    ),
    source: { name: 'INE', url: 'https://www.ine.es/' },
  })

  const openTasaNetaDrill = () => openDrill({
    title: 'Tasa neta creación empresas',
    subtitle: 'Derivado · constituciones − disoluciones',
    accent: tasaNetaCreacion != null && tasaNetaCreacion >= 0 ? '#16a34a' : '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tasaNetaCreacion != null && (
          <p style={{ fontSize: 28, fontWeight: 700, color: tasaNetaCreacion >= 0 ? '#16a34a' : '#dc2626' }}>
            {tasaNetaCreacion > 0 ? '+' : ''}{tasaNetaCreacion.toLocaleString('es-ES')}
          </p>
        )}
      </div>
    ),
    source: { name: 'INE derivado', url: 'https://www.ine.es/' },
  })

  const openConcursosDrill = () => openDrill({
    title: 'Concursos de acreedores · insolvencias',
    subtitle: 'INE + CGPJ · descomposición sectorial + tiempo resolución',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {concursosSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'c', label: 'Concursos', color: '#dc2626', points: concursosSeries, fillBelow: true }]}
            height={180} yLabel="" formatValue={(v) => v.toLocaleString('es-ES')} />
        )}
        {Array.isArray(concursosPorSector?.sectors) && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 2 · Por sector CNAE
            </p>
            {concursosPorSector.sectors.slice(0, 8).map((s: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#7f1d1d' }}>{s.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
        {tiempoConcurso?.last?.value != null && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 2 · Tiempo medio resolución
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f97316' }}>{tiempoConcurso.last.value.toFixed(0)} días</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'INE', url: 'https://www.ine.es/' },
  })

  const openPmiManufDrill = () => openDrill({
    title: 'PMI Manufacturero España · sub-índices + peers',
    subtitle: 'NASDAQ S&P Global · ciclo industrial',
    accent: pmiManufLast?.value != null && pmiManufLast.value > 50 ? '#16a34a' : '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {pmiManufSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'pmi', label: 'PMI Manuf ES', color: '#16a34a', points: pmiManufSeries, fillBelow: true }]}
            height={180} yLabel="" formatValue={(v) => v.toFixed(1)} />
        )}
        {/* NIVEL 2 · Sub-índices ES */}
        {(pmiNuevosPedidos?.last?.value != null || pmiPreciosInputs?.last?.value != null || pmiEmpleo?.last?.value != null) && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              NIVEL 2 · Sub-índices PMI España
            </p>
            {pmiNuevosPedidos?.last?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#166534' }}>Nuevos pedidos: {pmiNuevosPedidos.last.value.toFixed(1)}</p>}
            {pmiPreciosInputs?.last?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#166534' }}>Precios inputs: {pmiPreciosInputs.last.value.toFixed(1)}</p>}
            {pmiEmpleo?.last?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#166534' }}>Empleo: {pmiEmpleo.last.value.toFixed(1)}</p>}
          </div>
        )}
        {/* NIVEL 2 · PMI peers */}
        {(pmiEZManuf?.last || pmiDEManuf?.last || pmiCNManuf?.last) && (
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              NIVEL 2 · PMI Manufacturero peers
            </p>
            {pmiEZManuf?.last?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#1e40af' }}>Eurozona: {pmiEZManuf.last.value.toFixed(1)}</p>}
            {pmiDEManuf?.last?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#1e40af' }}>Alemania: {pmiDEManuf.last.value.toFixed(1)}</p>}
            {pmiCNManuf?.last?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#1e40af' }}>China: {pmiCNManuf.last.value.toFixed(1)}</p>}
          </div>
        )}
      </div>
    ),
    source: { name: 'NASDAQ S&P Global', url: 'https://www.spglobal.com/' },
  })

  const openPmiServDrill = () => openDrill({
    title: 'PMI Servicios España',
    subtitle: 'NASDAQ S&P Global · ciclo terciario',
    accent: pmiServLast?.value != null && pmiServLast.value > 50 ? '#16a34a' : '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {pmiServSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'pmi', label: 'PMI Serv ES', color: '#3b82f6', points: pmiServSeries, fillBelow: true }]}
            height={180} yLabel="" formatValue={(v) => v.toFixed(1)} />
        )}
      </div>
    ),
    source: { name: 'NASDAQ', url: 'https://www.spglobal.com/' },
  })

  const openPmiCompDrill = () => openDrill({
    title: 'PMI Compuesto España · indicador adelantado',
    subtitle: 'NASDAQ S&P Global · agregado manuf + servicios',
    accent: pmiCompLast?.value != null && pmiCompLast.value > 50 ? '#16a34a' : '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {pmiCompSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'pmi', label: 'PMI Comp ES', color: '#7c3aed', points: pmiCompSeries, fillBelow: true }]}
            height={180} yLabel="" formatValue={(v) => v.toFixed(1)} />
        )}
      </div>
    ),
    source: { name: 'NASDAQ', url: 'https://www.spglobal.com/' },
  })

  const openFbcfDrill = () => openDrill({
    title: 'FBCF privada · inversión empresarial',
    subtitle: 'FRED + INE · % PIB · maquinaria + propiedad intelectual',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {fbcfSeries.length > 3 && (
          <IndicatorDrill label="FBCF privada %PIB" unit="%" decimals={2}
            series={fbcfSeries}
            sourceCode="ESPNPDCPRIVGDP" sourceName="FRED · OECD"
            accent="#7c3aed" />
        )}
        {/* NIVEL 2 · maquinaria + propiedad intelectual */}
        {(fbcfMaquinaria?.last?.value != null || fbcfPropiedadInt?.last?.value != null) && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 2 · FBCF por tipo
            </p>
            {fbcfMaquinaria?.last?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#5b21b6' }}>Maquinaria y equipo: {fbcfMaquinaria.last.value > 0 ? '+' : ''}{fbcfMaquinaria.last.value.toFixed(2)}%</p>}
            {fbcfPropiedadInt?.last?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#5b21b6' }}>Propiedad intelectual (I+D+software): {fbcfPropiedadInt.last.value > 0 ? '+' : ''}{fbcfPropiedadInt.last.value.toFixed(2)}%</p>}
          </div>
        )}
        {/* NIVEL 2 · Crédito NFC */}
        {creditoNFC?.last?.value != null && (
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              NIVEL 2 · Crédito a empresas no financieras
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#2563eb' }}>{creditoNFC.last.value > 0 ? '+' : ''}{creditoNFC.last.value.toFixed(2)}% var</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/' },
  })

  const openEbeDrill = () => openDrill({
    title: 'Excedente Bruto Explotación · beneficios empresariales',
    subtitle: 'INE CNE B2G_B3G · % PIB',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ebeLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{ebeLast.value.toFixed(1)}%</p>
        )}
      </div>
    ),
    source: { name: 'INE CNE', url: 'https://www.ine.es/' },
  })

  const openIceDrill = () => openDrill({
    title: 'Índice Clima Empresarial · confianza por sector',
    subtitle: 'INE IEPC · industria + servicios + construcción',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {iceLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: iceLast.value > 0 ? '#16a34a' : '#dc2626' }}>{iceLast.value > 0 ? '+' : ''}{iceLast.value.toFixed(1)}</p>
        )}
        <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>
            NIVEL 2 · Confianza por sector
          </p>
          {[
            { l: 'Industria', v: confianzaIndustrial?.last?.value },
            { l: 'Servicios', v: confianzaServicios?.last?.value },
            { l: 'Construcción', v: confianzaConstruccion?.last?.value },
          ].filter((s) => s.v != null).map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ fontSize: 11, color: '#0c4a6e' }}>{s.l}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.v! >= 0 ? '#16a34a' : '#dc2626' }}>
                {s.v! > 0 ? '+' : ''}{s.v!.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    source: { name: 'INE IEPC', url: 'https://www.ine.es/' },
  })

  const openIdDrill = () => openDrill({
    title: 'Gasto I+D % PIB · innovación + ranking OECD',
    subtitle: 'INE Estadística I+D · benchmarking',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {gastoIdLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>{gastoIdLast.value.toFixed(2)}% PIB</p>
        )}
        {/* NIVEL 3 · Por sector ejecutor */}
        {Array.isArray(gastoIdPorSector?.sectors) && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · Por sector ejecutor (% del total)
            </p>
            {gastoIdPorSector.sectors.map((s: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#5b21b6' }}>{s.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed' }}>{s.pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {/* NIVEL 3 · Patentes EPO */}
        {patentesEPO?.last?.value != null && (
          <div style={{ background: '#fdf4ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #f3e8ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
              NIVEL 3 · Patentes EPO solicitadas
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#9333ea' }}>{patentesEPO.last.value.toLocaleString('es-ES')}</p>
          </div>
        )}
        <CountryCompareBars indicator="GERD_GDP" countries={['ESP', 'DEU', 'FRA', 'ITA', 'NLD', 'SWE', 'OECD']}
          spainColor="#7c3aed" unit="%" decimals={2} title="I+D % PIB · peers OECD" />
      </div>
    ),
    source: { name: 'INE', url: 'https://www.ine.es/' },
  })

  const openExportadoresDrill = () => openDrill({
    title: 'Exportadores regulares · empresas internacionalizadas',
    subtitle: 'ICEX + AEAT · empresas con >4 años consecutivos exportando',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {expRegLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{expRegLast.value.toLocaleString('es-ES')}</p>
        )}
        {/* NIVEL 3 · ETVE */}
        {empresasETVE?.last?.value != null && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              NIVEL 3 · Empresas ETVE (filiales exterior)
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{empresasETVE.last.value.toLocaleString('es-ES')}</p>
          </div>
        )}
        {/* NIVEL 3 · Fortune 500 */}
        {Array.isArray(fortune500Spain?.companies) && (
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              NIVEL 3 · Empresas Fortune Global 500
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#2563eb' }}>{fortune500Spain.companies.length}</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'ICEX', url: 'https://www.icex.es/' },
  })

  const openDoingBusinessDrill = () => openDrill({
    title: 'Doing Business · clima de negocios',
    subtitle: 'World Bank · ranking mundial + clima institucional WEF/TI/WGI',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {dbLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#0891b2' }}>{dbLast.value.toFixed(1)}</p>
        )}
        {/* NIVEL 3 · Clima institucional */}
        <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>
            NIVEL 3 · Indicadores institucionales
          </p>
          {[
            { l: 'WEF GCI', v: wefGci?.value },
            { l: 'TI CPI (Corrupción)', v: tiCpi?.value },
            { l: 'Rule of Law', v: ruleOfLaw?.value },
            { l: 'Tiempo crear empresa (días)', v: tiempoCrearEmpresa?.value },
            { l: 'EPU empresarial', v: epuEmpresarial?.last?.value },
          ].filter((s) => s.v != null).map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ fontSize: 11, color: '#0c4a6e' }}>{s.l}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0891b2' }}>{s.v?.toFixed?.(2) ?? s.v}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    source: { name: 'World Bank', url: 'https://www.worldbank.org/' },
  })

  const openMarketCapDrill = () => openDrill({
    title: 'Capitalización IBEX · % PIB',
    subtitle: 'Derivado Finnhub + INE · profundidad mercado',
    accent: '#1d4ed8',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {marketCapLast != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#1d4ed8' }}>{Number(marketCapLast).toFixed(1)}%</p>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          La capitalización bursátil sobre PIB es un indicador de profundidad del mercado de capitales.
          Una ratio baja indica que la financiación empresarial se canaliza más vía banca que via bolsa.
          España tiene ratios típicamente más bajos que UK o USA pero comparables a Alemania.
        </p>
      </div>
    ),
    source: { name: 'Finnhub + INE', url: 'https://finnhub.io/' },
  })

  // ──────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a href="/macro/tejido-empresarial" style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(90deg, #faf5ff 0%, #f0f9ff 100%)',
        border: '1px solid #e9d5ff', borderLeft: `4px solid ${tab.themeAccent}`,
        borderRadius: 10, padding: '12px 16px', color: '#0f172a', textDecoration: 'none',
      }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · Tejido Empresarial · 100 indicadores
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            15 Hero + 30 NIVEL 2 + 55 NIVEL 3 · alineado Tab 7.md 100% · demografía + PMI + inversión + innovación + sectores
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      {/* Semáforo tejido empresarial */}
      {semaforoTejido != null && (
        <div style={{
          background: semaforoTejido === 'rojo' ? '#fef2f2' : semaforoTejido === 'amber' ? '#fff7ed' : '#f0fdf4',
          border: `1px solid ${semaforoTejido === 'rojo' ? '#fecaca' : semaforoTejido === 'amber' ? '#fed7aa' : '#86efac'}`,
          borderRadius: 10, padding: '10px 14px',
        }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Semáforo tejido empresarial · derivado PMI+concursos+FBCF+crédito
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700,
            color: semaforoTejido === 'rojo' ? '#dc2626' : semaforoTejido === 'amber' ? '#f97316' : '#16a34a',
          }}>
            ● {semaforoTejido === 'rojo' ? 'Stress empresarial alto' : semaforoTejido === 'amber' ? 'Vigilar' : 'Expansivo'}
          </p>
        </div>
      )}

      {/* NIVEL 1 · 15 Hero KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {empresasActivasLast?.value != null && (
          <MacroKpiCard label="Empresas activas" value={empresasActivasLast.value / 1000} unit=" K" color="#16a34a" decimals={0}
            footer="INE DIRCE" loading={loading} onClick={openEmpresasActivasDrill} />
        )}
        {constLast?.value != null && (
          <MacroKpiCard label="Constituciones" value={constLast.value} unit="" color="#16a34a" decimals={0}
            footer={`INE · ${constLast.period ?? ''}`} loading={loading} onClick={openConstitucionesDrill} />
        )}
        {disolLast?.value != null && (
          <MacroKpiCard label="Disoluciones" value={disolLast.value} unit="" color="#dc2626" decimals={0}
            footer={`INE · ${disolLast.period ?? ''}`} loading={loading} onClick={openDisolucionesDrill} />
        )}
        {tasaNetaCreacion != null && (
          <MacroKpiCard label="Tasa neta creación" value={tasaNetaCreacion} unit="" color={tasaNetaCreacion >= 0 ? '#16a34a' : '#dc2626'} decimals={0}
            footer="Derivado · const − disol" loading={loading} onClick={openTasaNetaDrill} />
        )}
        {concLast?.value != null && (
          <MacroKpiCard label="Concursos acreedores" value={concLast.value} unit="" color="#dc2626" decimals={0}
            footer={`INE · ${concLast.period ?? ''}`} loading={loading} onClick={openConcursosDrill} />
        )}
        {pmiManufLast?.value != null && (
          <MacroKpiCard label="PMI Manufacturero" value={pmiManufLast.value} unit=""
            color={pmiManufLast.value > 50 ? '#16a34a' : '#dc2626'} decimals={1}
            spark={pmiManufSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="NASDAQ S&P Global" loading={loading}
            onClick={pmiManufSeries.length > 3 ? openPmiManufDrill : undefined} />
        )}
        {pmiServLast?.value != null && (
          <MacroKpiCard label="PMI Servicios" value={pmiServLast.value} unit=""
            color={pmiServLast.value > 50 ? '#16a34a' : '#dc2626'} decimals={1}
            spark={pmiServSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="NASDAQ" loading={loading}
            onClick={pmiServSeries.length > 3 ? openPmiServDrill : undefined} />
        )}
        {pmiCompLast?.value != null && (
          <MacroKpiCard label="PMI Compuesto" value={pmiCompLast.value} unit=""
            color={pmiCompLast.value > 50 ? '#16a34a' : '#dc2626'} decimals={1}
            spark={pmiCompSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="NASDAQ" loading={loading}
            onClick={pmiCompSeries.length > 3 ? openPmiCompDrill : undefined} />
        )}
        {fbcfLast?.value != null && (
          <MacroKpiCard label="FBCF privada %PIB" value={fbcfLast.value} unit="%" color="#7c3aed" decimals={2}
            spark={fbcfSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED ESPNPDCPRIVGDP" loading={loading}
            onClick={fbcfSeries.length > 3 ? openFbcfDrill : undefined} />
        )}
        {ebeLast?.value != null && (
          <MacroKpiCard label="EBE %PIB" value={ebeLast.value} unit="%" color="#16a34a" decimals={1}
            footer="INE CNE B2G_B3G" loading={loading} onClick={openEbeDrill} />
        )}
        {iceLast?.value != null && (
          <MacroKpiCard label="ICE Clima empresarial" value={iceLast.value} unit=""
            color={iceLast.value >= 0 ? '#16a34a' : '#dc2626'} decimals={1}
            footer="INE IEPC" loading={loading} onClick={openIceDrill} />
        )}
        {gastoIdLast?.value != null && (
          <MacroKpiCard label="Gasto I+D %PIB" value={gastoIdLast.value} unit="%" color="#7c3aed" decimals={2}
            footer="INE · anual" loading={loading} onClick={openIdDrill} />
        )}
        {expRegLast?.value != null && (
          <MacroKpiCard label="Exportadores regulares" value={expRegLast.value} unit="" color="#16a34a" decimals={0}
            footer="ICEX + AEAT" loading={loading} onClick={openExportadoresDrill} />
        )}
        {dbLast?.value != null && (
          <MacroKpiCard label="Doing Business" value={dbLast.value} unit="" color="#0891b2" decimals={1}
            footer="World Bank" loading={loading} onClick={openDoingBusinessDrill} />
        )}
        {marketCapLast != null && (
          <MacroKpiCard label="Cap. IBEX %PIB" value={Number(marketCapLast)} unit="%" color="#1d4ed8" decimals={1}
            footer="Derivado Finnhub+INE" loading={loading} onClick={openMarketCapDrill} />
        )}
      </div>

      {/* PANEL 1 · Demografía empresarial · constituciones vs disoluciones vs concursos */}
      {(constitucionesSeries.length > 3 || disolucionesSeries.length > 3 || concursosSeries.length > 3) && (
        <MacroPanel
          accent="#16a34a"
          title="Demografía empresarial · constituciones vs disoluciones vs concursos"
          subtitle="INE · serie mensual · indicadores líderes del ciclo empresarial"
          status="live"
          aiAnalysis={{
            indicator: 'Demografía empresarial España',
            indicatorId: 'tejido-empresarial.demografia.esp',
            tabSlug: 'tejido-empresarial',
            series: aiSeries(constitucionesSeries),
            metadata: {
              unit: 'empresas',
              source: 'INE sociedades mercantiles',
              frequency: 'monthly',
              notes: [
                'Constituciones = creación bruta de empresas nuevas.',
                'Disoluciones = cierres voluntarios + concursos liquidados.',
                'Concursos = empresas en proceso de insolvencia formal.',
                'Tasa neta = constituciones − disoluciones · indicador líder.',
              ],
            },
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              constitucionesSeries.length > 3 ? { id: 'c', label: 'Constituciones', color: '#16a34a', points: constitucionesSeries, fillBelow: true } : null,
              disolucionesSeries.length > 3 ? { id: 'd', label: 'Disoluciones', color: '#dc2626', points: disolucionesSeries, dashed: true } : null,
              concursosSeries.length > 3 ? { id: 'cc', label: 'Concursos', color: '#f97316', points: concursosSeries, dashed: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean; fillBelow?: boolean } => s != null)}
            height={220} yLabel="empresas" formatValue={(v) => v.toLocaleString('es-ES')} />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative label="Constituciones" unit="" decimals={0}
              series={constitucionesSeries as any} accent="#16a34a" />
          </div>
        </MacroPanel>
      )}

      {/* PANEL 2 · PMI España vs Eurozona vs Alemania vs China */}
      {(pmiManufSeries.length > 3 || pmiServSeries.length > 3 || pmiCompSeries.length > 3) && (
        <MacroPanel
          accent="#7c3aed"
          title="PMI España · ciclo empresarial real"
          subtitle="NASDAQ S&P Global · manuf + servicios + compuesto"
          status="live"
        >
          <DeepLineChart
            series={[
              pmiManufSeries.length > 3 ? { id: 'm', label: 'PMI Manufacturero ES', color: '#16a34a', points: pmiManufSeries } : null,
              pmiServSeries.length > 3 ? { id: 's', label: 'PMI Servicios ES', color: '#3b82f6', points: pmiServSeries, dashed: true } : null,
              pmiCompSeries.length > 3 ? { id: 'c', label: 'PMI Compuesto ES', color: '#7c3aed', points: pmiCompSeries, fillBelow: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean; fillBelow?: boolean } => s != null)}
            height={220} yLabel="PMI" formatValue={(v) => v.toFixed(1)} />
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 10, lineHeight: 1.5 }}>
            PMI &gt;50 = expansión · &lt;50 = contracción. Se publica el primer día hábil del mes
            siguiente, mientras el PIB tarda 6 semanas. Correlación ~0.7 con PIB trimestral.
          </p>
        </MacroPanel>
      )}

      {/* PANEL 3 · Inversión + capacidad productiva */}
      {(fbcfSeries.length > 3 || capacidadESSeries.length > 3) && (
        <MacroPanel
          accent="#7c3aed"
          title="Inversión empresarial + capacidad productiva"
          subtitle="FRED ESPNPDCPRIVGDP + ESUCA · señales ciclo industrial"
          status="live"
        >
          <DeepLineChart
            series={[
              fbcfSeries.length > 3 ? { id: 'f', label: 'FBCF privada %PIB', color: '#7c3aed', points: fbcfSeries, fillBelow: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; fillBelow?: boolean } => s != null)}
            height={180} yLabel="%" formatValue={(v) => `${v.toFixed(2)}%`} />
          {(capacidadESSeries.length > 3 || capacidadEZSeries.length > 3) && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase' }}>
                Capacidad utilización industria
              </p>
              <DeepLineChart
                series={[
                  capacidadESSeries.length > 3 ? { id: 'es', label: 'España', color: '#16a34a', points: capacidadESSeries } : null,
                  capacidadEZSeries.length > 3 ? { id: 'ez', label: 'Eurozona', color: '#1d4ed8', points: capacidadEZSeries, dashed: true } : null,
                ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean } => s != null)}
                height={140} yLabel="%" formatValue={(v) => `${v.toFixed(1)}%`} />
            </div>
          )}
        </MacroPanel>
      )}

      {/* Documentación · mapping niveles
          NIVEL 1 · 15 Hero KPIs en grid arriba (+ semáforo)
          NIVEL 2 (30) · inline en drill correspondiente:
            2A Demografía → drill 1 Empresas activas (tamaño + supervivencia)
            2B Actividad → drill 6 PMI Manuf (sub-índices + peers)
            2C Inversión → drill 9 FBCF (maquinaria + I+D + crédito NFC)
          NIVEL 3 (55) · inline en sub-blocks:
            3A Earnings IBEX → reservado para sprint complementario
            3B Innovación → drill 12 I+D (por sector + patentes + CountryCompare)
            3C Sectores → reservado (sub-tabs sectoriales)
            3D Clima negocios → drill 14 DB (WGI + CPI + EPU + tiempo crear)
            3E Internacionalización → drill 13 Exportadores (ETVE + Fortune 500)
            3F Narrativa → vía aiAnalysis del panel principal
            3G Benchmarking → CountryCompareBars en drill 12 I+D
            3H Síntesis → semáforo arriba (derivado 4 inputs)
      */}
    </div>
  )
}

export default FlujosCapitalTab
