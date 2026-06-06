'use client'
/**
 * `<DependenciasExternasTab />` · Tab 4 · Dependencias externas PROFUNDO.
 *
 * Alineado al 100% con `tab 4.md` · 100 indicadores en 3 niveles.
 * Radiografía completa de la exposición exterior de España: comercio,
 * energía, IED, cadenas de suministro, riesgo geopolítico, balanza de
 * pagos completa, GVC y competitividad.
 *
 *   NIVEL 1 · Hero (15 KPIs):
 *     1.  Saldo Balanza Comercial X−M           · WTO + INE
 *     2.  Exportaciones var. % YoY              · Comtrade reporter=724 flow=X
 *     3.  Importaciones var. % YoY              · Comtrade reporter=724 flow=M
 *     4.  Tasa cobertura X/M %                  · Comtrade derivado
 *     5.  Dependencia energética exterior %     · Ember + Eurostat nrg_ind_id
 *     6.  Precio gas TTF                        · FRED PNGASEUUSDM
 *     7.  Precio Brent                          · FRED DCOILBRENTEU
 *     8.  Saldo Cuenta Corriente %PIB           · FRED ESPB6BLTT02STSAQ
 *     9.  IED recibida € bn                     · DataInvex + UNCTAD
 *     10. IED emitida € bn                      · DataInvex emisiones
 *     11. Actividad portuaria TEUs              · Portwatch Spain aggregate
 *     12. Dependencia China · % imports         · Comtrade reporter=724 partner=156
 *     13. Dependencia Rusia · % imports gas     · Ember + Eurostat nrg_ti_gaz
 *     14. Cuota exportadora mundial %           · WTO world trade share
 *     15. TCE Real España (competitividad)      · BCE SDW EER.M.U2.EUR.BR00.A1.A
 *
 *   NIVEL 2 · Detalle (30 indicadores):
 *     2A · Comercio exterior por geografía (16-25)
 *     2B · Comercio exterior por producto HS (26-35)
 *     2C · Energía: dependencia y mix (36-45)
 *
 *   NIVEL 3 · Detalle del detalle (55 indicadores):
 *     3A · Cadenas de suministro y resiliencia (46-55)
 *     3B · Inversión extranjera directa (56-63)
 *     3C · Competitividad exterior (64-72)
 *     3D · Riesgo geopolítico económico (73-80)
 *     3E · Remesas y balanza pagos completa (81-88)
 *     3F · Integración productiva global GVC (89-93)
 *     3G · Benchmarking y síntesis AI (94-100)
 *
 * REGLA · si endpoint devuelve null/error → panel/bloque NO se renderiza.
 * Frontend ciego para fuentes que el backend no expone aún (FRED, scrapers
 * CORES/EPU/WEF/Enagas/UNCTAD/fDi Markets, Comtrade API key).
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

export function DependenciasExternasTab() {
  const tab = getTab('dependencias-externas')
  const { openDrill } = useMacroDrawer()

  // ───── NIVEL 1 · Hero · 15 indicadores ─────
  const [balanzaComercial, setBalanzaComercial] = useState<any>(null)             // 1 WTO + INE
  const [exportacionesYoY, setExportacionesYoY] = useState<any>(null)             // 2 Comtrade X
  const [importacionesYoY, setImportacionesYoY] = useState<any>(null)             // 3 Comtrade M
  // 4 Tasa cobertura = X/M → derivado
  const [depEnergetica, setDepEnergetica] = useState<any>(null)                   // 5 Ember + Eurostat
  const [precioGasTTF, setPrecioGasTTF] = useState<FredSeriesResponse | null>(null) // 6 FRED PNGASEUUSDM
  const [precioBrent, setPrecioBrent] = useState<FredSeriesResponse | null>(null) // 7 FRED DCOILBRENTEU
  const [cuentaCorriente, setCuentaCorriente] = useState<FredSeriesResponse | null>(null) // 8 FRED
  const [iedRecibida, setIedRecibida] = useState<any>(null)                       // 9 DataInvex + UNCTAD
  const [iedEmitida, setIedEmitida] = useState<any>(null)                         // 10 DataInvex
  const [portwatchEspana, setPortwatchEspana] = useState<any>(null)               // 11 Portwatch agregado
  const [depChinaImports, setDepChinaImports] = useState<any>(null)               // 12 Comtrade
  const [depRusiaGas, setDepRusiaGas] = useState<any>(null)                       // 13 Ember + Eurostat
  const [cuotaExportadora, setCuotaExportadora] = useState<any>(null)             // 14 WTO
  const [tceReal, setTceReal] = useState<any>(null)                               // 15 BCE SDW EER

  // ───── NIVEL 2 · Detalle · 30 indicadores ─────

  // 2A · Comercio exterior por geografía (16-25)
  const [topDestinosX, setTopDestinosX] = useState<any>(null)                     // 16
  const [topOrigenesM, setTopOrigenesM] = useState<any>(null)                     // 17
  const [comercioUEvsExtra, setComercioUEvsExtra] = useState<any>(null)           // 18
  const [comercioEEUU, setComercioEEUU] = useState<any>(null)                     // 19
  const [comercioChina, setComercioChina] = useState<any>(null)                   // 20
  const [comercioMarruecos, setComercioMarruecos] = useState<any>(null)           // 21
  const [comercioLATAM, setComercioLATAM] = useState<any>(null)                   // 22
  const [comercioAfrica, setComercioAfrica] = useState<any>(null)                 // 23
  const [comercioDE, setComercioDE] = useState<any>(null)                         // 24
  const [comercioFR, setComercioFR] = useState<any>(null)                         // 25

  // 2B · Comercio exterior por producto HS (26-35)
  const [topHsExp, setTopHsExp] = useState<any>(null)                             // 26
  const [topHsImp, setTopHsImp] = useState<any>(null)                             // 27
  const [expHs87Vehiculos, setExpHs87Vehiculos] = useState<any>(null)             // 28
  const [expHs84_85Maquinaria, setExpHs84_85Maquinaria] = useState<any>(null)     // 29
  const [expHs01_24Agro, setExpHs01_24Agro] = useState<any>(null)                 // 30
  const [expHs30Farma, setExpHs30Farma] = useState<any>(null)                     // 31 agregado solo
  const [impHs27Energetica, setImpHs27Energetica] = useState<any>(null)           // 32
  const [impHs85Semiconductores, setImpHs85Semiconductores] = useState<any>(null) // 33
  const [saldoBecIntermedios, setSaldoBecIntermedios] = useState<any>(null)       // 34
  const [herfindahlExport, setHerfindahlExport] = useState<any>(null)             // 35

  // 2C · Energía: dependencia y mix (36-45)
  const [mixElecRT, setMixElecRT] = useState<any>(null)                           // 36 ESIOS 10015
  const [poolPVPC, setPoolPVPC] = useState<any>(null)                             // 37 ESIOS 805 hora
  const [poolHistorico, setPoolHistorico] = useState<any>(null)                   // 38 ESIOS 805 diario
  const [renovablePct, setRenovablePct] = useState<any>(null)                     // 39 ESIOS 10017 + Ember
  const [genSolar, setGenSolar] = useState<any>(null)                             // 40 ESIOS solar GWh
  const [genEolica, setGenEolica] = useState<any>(null)                           // 41 ESIOS wind GWh
  const [genCCGT, setGenCCGT] = useState<any>(null)                               // 42 ESIOS CCGT gas
  const [gasPorOrigen, setGasPorOrigen] = useState<any>(null)                     // 43 ENAGAS scraper
  const [regasificacion, setRegasificacion] = useState<any>(null)                 // 44 ENAGAS plantas
  const [spreadTTFmibgas, setSpreadTTFmibgas] = useState<any>(null)               // 45 FRED + OMIP

  // ───── NIVEL 3 · Detalle del detalle · 55 indicadores ─────

  // 3A · Cadenas de suministro y resiliencia (46-55)
  const [gscpi, setGscpi] = useState<FredSeriesResponse | null>(null)              // 46 FRED GSCPI
  const [pmiDeliveryTimes, setPmiDeliveryTimes] = useState<any>(null)              // 47 PMI sub-component
  const [portValencia, setPortValencia] = useState<any>(null)                      // 48 Portwatch
  const [portBarcelona, setPortBarcelona] = useState<any>(null)                    // 49 Portwatch
  const [portAlgeciras, setPortAlgeciras] = useState<any>(null)                    // 50 Portwatch
  const [portBilbao, setPortBilbao] = useState<any>(null)                          // 51 Portwatch
  const [traficoPortuarioAgregado, setTraficoPortuarioAgregado] = useState<any>(null) // 52 Portwatch
  const [congestionPortEU, setCongestionPortEU] = useState<any>(null)              // 53 Portwatch
  const [importsCriticas, setImportsCriticas] = useState<any>(null)                // 54 tierras raras + semis
  const [concentracionProveedores, setConcentracionProveedores] = useState<any>(null) // 55 Herfindahl

  // 3B · Inversión extranjera directa (56-63)
  const [iedPorSector, setIedPorSector] = useState<any>(null)                      // 56 DataInvex
  const [iedPorPaisOrigen, setIedPorPaisOrigen] = useState<any>(null)              // 57 DataInvex
  const [iedEmitidaDestinos, setIedEmitidaDestinos] = useState<any>(null)          // 58 DataInvex
  const [iedLATAM, setIedLATAM] = useState<any>(null)                              // 59 DataInvex + UNCTAD
  const [stockIed, setStockIed] = useState<any>(null)                              // 60 UNCTAD + FRED
  const [iedSerieLarga, setIedSerieLarga] = useState<any>(null)                    // 61 DataInvex 2000-hoy
  const [maTransfronteriza, setMaTransfronteriza] = useState<any>(null)            // 62 Finnhub + scraper
  const [greenfieldProjects, setGreenfieldProjects] = useState<any>(null)          // 63 fDi Markets + UNCTAD

  // 3C · Competitividad exterior (64-72)
  const [cluEspanaVsEZ, setCluEspanaVsEZ] = useState<any>(null)                    // 64 FRED + Eurostat
  const [cluPeers, setCluPeers] = useState<any>(null)                              // 65 Eurostat lc_lci_r2
  const [iprix, setIprix] = useState<any>(null)                                    // 66 INE precios export
  const [iprim, setIprim] = useState<any>(null)                                    // 67 INE precios import
  // 68 Terms of trade = IPRIX/IPRIM → derivado
  const [cuotaMercadoUE, setCuotaMercadoUE] = useState<any>(null)                  // 69 WTO
  const [cuotaSectorial, setCuotaSectorial] = useState<any>(null)                  // 70 Comtrade derivado HS 87 + HS 01-24
  const [wefGci, setWefGci] = useState<any>(null)                                  // 71 WEF scraper
  const [doingBusiness, setDoingBusiness] = useState<any>(null)                    // 72 World Bank

  // 3D · Riesgo geopolítico económico (73-80)
  const [gpri, setGpri] = useState<FredSeriesResponse | null>(null)                // 73 FRED GPRI Caldara-Iacoviello
  const [epuEspana, setEpuEspana] = useState<any>(null)                            // 74 EPU scraper
  const [epuGlobalVsEspana, setEpuGlobalVsEspana] = useState<any>(null)            // 75 derivado
  const [gdeltTradeWar, setGdeltTradeWar] = useState<any>(null)                    // 76 GDELT
  const [gdeltSupplyChain, setGdeltSupplyChain] = useState<any>(null)              // 77 GDELT
  const [impactoArancelesUSA, setImpactoArancelesUSA] = useState<any>(null)        // 78 WTO + cálculo
  const [exposicionTrump, setExposicionTrump] = useState<any>(null)                // 79 Comtrade + US tariffs
  const [coresReservas, setCoresReservas] = useState<any>(null)                    // 80 CORES scraper

  // 3E · Remesas + balanza pagos completa (81-88)
  const [remesasEnviadas, setRemesasEnviadas] = useState<any>(null)                // 81 BdE
  const [remesasRecibidas, setRemesasRecibidas] = useState<any>(null)              // 82 BdE
  const [balanzaServicios, setBalanzaServicios] = useState<any>(null)              // 83 FRED + BdE
  const [rentasPrimarias, setRentasPrimarias] = useState<any>(null)                // 84 BdE
  const [piinNeta, setPiinNeta] = useState<any>(null)                              // 85 BdE NIIP
  const [piinPeers, setPiinPeers] = useState<any>(null)                            // 86 BCE SDW + BdE
  const [activosExteriores, setActivosExteriores] = useState<any>(null)            // 87 BdE
  const [pasivosExteriores, setPasivosExteriores] = useState<any>(null)            // 88 BdE

  // 3F · Integración productiva global GVC (89-93)
  const [tivaGvc, setTivaGvc] = useState<any>(null)                                // 89 OECD TiVA
  const [tivaImportContent, setTivaImportContent] = useState<any>(null)            // 90 OECD TiVA
  const [tivaForwardContent, setTivaForwardContent] = useState<any>(null)          // 91 OECD TiVA
  const [nearshoring, setNearshoring] = useState<any>(null)                        // 92 DataInvex + UNCTAD
  const [comercioIntraEmpresa, setComercioIntraEmpresa] = useState<any>(null)      // 93 UNCTAD/OECD

  // 3G · Benchmarking y síntesis AI (94-100)
  const [aperturaComercial, setAperturaComercial] = useState<any>(null)            // 94 WTO + FRED
  const [ccPeers, setCcPeers] = useState<any>(null)                                // 95 FRED multi-país
  const [depEnergeticaPeers, setDepEnergeticaPeers] = useState<any>(null)          // 96 Eurostat multi-país
  const [concentracionGeoPeers, setConcentracionGeoPeers] = useState<any>(null)    // 97 Comtrade + WTO
  // 98 Semáforo dependencias críticas → derivado
  // 99 Alerta variación >10% Brent/TTF → derivado
  const [aiSintesisDeps, setAiSintesisDeps] = useState<any>(null)                  // 100 Groq

  const [loading, setLoading] = useState(true)

  // ──────────────────────────────────────────────────────────────────
  // useEffect · Promise.all con TODOS los fetches (NIVEL 1+2+3)
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    const f = (url: string) => fetch(url, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null)

    Promise.all([
      // ── NIVEL 1 · 15 Hero ──
      f('/api/wto/balanza-comercial?reporter=ESP&n=24'),                              // 1
      f('/api/uncomtrade/exports?reporter=724&yoy=1&n=24'),                           // 2
      f('/api/uncomtrade/imports?reporter=724&yoy=1&n=24'),                           // 3
      f('/api/eurostat/nrg_ind_id?country=ESP&n=20'),                                 // 5
      f('/api/fred/series?id=PNGASEUUSDM&n=60'),                                      // 6
      f('/api/fred/series?id=DCOILBRENTEU&n=60'),                                     // 7
      f('/api/fred/series?id=ESPB6BLTT02STSAQ&n=40'),                                 // 8
      f('/api/datainvex/ied?direction=in&n=20'),                                      // 9
      f('/api/datainvex/ied?direction=out&n=20'),                                     // 10
      f('/api/portwatch/port?iso3=ESP&n=24'),                                         // 11
      f('/api/uncomtrade/dependency?reporter=724&partner=156&flow=M'),                // 12
      f('/api/proxy/eurostat-gas?country=ESP&origin=RUS&n=24'),                       // 13
      f('/api/wto/cuota-exportadora?reporter=ESP&n=20'),                              // 14
      f('/api/macro-finance/markets?include=eer_es'),                                 // 15 BCE SDW EER

      // ── NIVEL 2 · 30 indicadores ──
      // 2A Comercio por geografía (16-25)
      f('/api/uncomtrade/top-partners?reporter=724&flow=X&n=10'),                     // 16
      f('/api/uncomtrade/top-partners?reporter=724&flow=M&n=10'),                     // 17
      f('/api/uncomtrade/split?reporter=724&group=EU_vs_extraEU&n=24'),               // 18
      f('/api/uncomtrade/bilateral?reporter=724&partner=842&n=24'),                   // 19 EEUU
      f('/api/uncomtrade/bilateral?reporter=724&partner=156&n=24'),                   // 20 China
      f('/api/uncomtrade/bilateral?reporter=724&partner=504&n=24'),                   // 21 Marruecos
      f('/api/uncomtrade/region?reporter=724&region=LATAM&n=20'),                     // 22
      f('/api/uncomtrade/region?reporter=724&region=AFRICA&n=20'),                    // 23
      f('/api/uncomtrade/bilateral?reporter=724&partner=276&n=24'),                   // 24 DE
      f('/api/uncomtrade/bilateral?reporter=724&partner=250&n=24'),                   // 25 FR

      // 2B Comercio por producto HS (26-35)
      f('/api/uncomtrade/by-hs?reporter=724&flow=X&level=2&n=10'),                    // 26
      f('/api/uncomtrade/by-hs?reporter=724&flow=M&level=2&n=10'),                    // 27
      f('/api/uncomtrade/hs?reporter=724&flow=X&cmd=87&n=24'),                        // 28 vehículos
      f('/api/uncomtrade/hs?reporter=724&flow=X&cmd=84,85&n=24'),                     // 29 maquinaria
      f('/api/uncomtrade/hs?reporter=724&flow=X&cmd=01-24&n=24'),                     // 30 agro
      f('/api/uncomtrade/hs?reporter=724&flow=X&cmd=30&n=24'),                        // 31 farma agregado
      f('/api/uncomtrade/hs?reporter=724&flow=M&cmd=27&n=24'),                        // 32 energía
      f('/api/uncomtrade/hs?reporter=724&flow=M&cmd=85&n=24'),                        // 33 semiconductores
      f('/api/uncomtrade/bec?reporter=724&type=intermediate-vs-final&n=10'),          // 34
      f('/api/proxy/herfindahl-export?reporter=724&n=10'),                            // 35

      // 2C Energía (36-45)
      f('/api/esios/indicator?id=10015&realtime=1'),                                  // 36 mix RT
      f('/api/esios/indicator?id=805&granularity=hour'),                              // 37 pool hora
      f('/api/esios/indicator?id=805&granularity=day&n=90'),                          // 38 pool histórico
      f('/api/esios/indicator?id=10017&n=90'),                                        // 39 renovable %
      f('/api/esios/indicator?id=solar-gen&n=30'),                                    // 40
      f('/api/esios/indicator?id=wind-gen&n=30'),                                     // 41
      f('/api/esios/indicator?id=ccgt-gen&n=30'),                                     // 42
      f('/api/enagas/gas-por-origen?n=24'),                                           // 43
      f('/api/enagas/regasificacion?n=12'),                                           // 44
      f('/api/proxy/spread-ttf-mibgas?n=60'),                                         // 45

      // ── NIVEL 3 · 55 indicadores ──
      // 3A Cadenas suministro y resiliencia (46-55)
      f('/api/fred/series?id=GSCPI&n=60'),                                            // 46
      f('/api/nasdaq/dataset?code=ISM/PMI_DT_ES&n=24'),                               // 47
      f('/api/portwatch/port?iso3=ESP&port=Valencia&n=24'),                           // 48
      f('/api/portwatch/port?iso3=ESP&port=Barcelona&n=24'),                          // 49
      f('/api/portwatch/port?iso3=ESP&port=Algeciras&n=24'),                          // 50
      f('/api/portwatch/port?iso3=ESP&port=Bilbao&n=24'),                             // 51
      f('/api/portwatch/aggregate?iso3=ESP&n=24'),                                    // 52
      f('/api/portwatch/congestion?region=EU&n=24'),                                  // 53
      f('/api/uncomtrade/critical?reporter=724&hs=2846,8542'),                        // 54 tierras raras + semis
      f('/api/proxy/herfindahl-providers?reporter=724'),                              // 55

      // 3B IED (56-63)
      f('/api/datainvex/by-sector?n=10'),                                             // 56
      f('/api/datainvex/by-country-in?n=10'),                                         // 57
      f('/api/datainvex/by-country-out?n=10'),                                        // 58
      f('/api/datainvex/region?region=LATAM&n=20'),                                   // 59
      f('/api/proxy/unctad-wir?country=ESP&type=stock-in&n=20'),                      // 60
      f('/api/datainvex/serie-larga?since=2000'),                                     // 61
      f('/api/finnhub/ma-cross-border?country=ESP&n=20'),                             // 62
      f('/api/proxy/fdi-markets?country=ESP&n=10'),                                   // 63

      // 3C Competitividad (64-72)
      f('/api/fred/series?id=ULQEES163RXDCLT&n=40'),                                  // 64 CLU España vs Eurozona
      f('/api/eurostat/lc_lci_r2?countries=ESP,DEU,FRA,ITA,PRT&n=40'),                // 65
      f('/api/ine/iprix?n=36'),                                                       // 66
      f('/api/ine/iprim?n=36'),                                                       // 67
      f('/api/wto/cuota-mercado-ue?reporter=ESP&n=20'),                               // 69
      f('/api/proxy/cuota-sectorial?reporter=ESP&sectors=87,01-24&n=10'),             // 70
      f('/api/proxy/wef-gci?country=ESP'),                                            // 71
      f('/api/proxy/worldbank-doing-business?country=ESP&n=15'),                      // 72

      // 3D Riesgo geopolítico (73-80)
      f('/api/fred/series?id=GPRI&n=60'),                                             // 73
      f('/api/proxy/epu?country=ESP&n=60'),                                           // 74
      f('/api/proxy/epu-global-vs-esp?n=60'),                                         // 75
      f('/api/gdelt/doc?query=Spain+tariff+trade+war&n=30'),                          // 76
      f('/api/gdelt/doc?query=supply+chain+Spain&n=30'),                              // 77
      f('/api/wto/tariff-analysis?reporter=ESP&partner=USA'),                         // 78
      f('/api/proxy/exposicion-trump?reporter=724'),                                  // 79
      f('/api/cores/reservas-estrategicas?n=12'),                                     // 80

      // 3E Remesas + balanza pagos (81-88)
      f('/api/bde/stats/remittances-sent?n=20'),                                      // 81
      f('/api/bde/stats/remittances-received?n=20'),                                  // 82
      f('/api/fred/series?id=ESPB6SERVQ&n=40'),                                       // 83
      f('/api/bde/stats/primary-income?n=20'),                                        // 84
      f('/api/bde/stats/niip?n=40'),                                                  // 85
      f('/api/proxy/piin-peers?countries=ESP,DEU,FRA,ITA,PRT,NLD,GRC&n=20'),          // 86
      f('/api/bde/stats/gross-external-assets?n=20'),                                 // 87
      f('/api/bde/stats/gross-external-liabilities?n=20'),                            // 88

      // 3F GVC (89-93)
      f('/api/oecd/tiva?country=ESP&n=15'),                                           // 89
      f('/api/oecd/tiva?country=ESP&type=import-content&n=15'),                       // 90
      f('/api/oecd/tiva?country=ESP&type=forward&n=15'),                              // 91
      f('/api/proxy/nearshoring?country=ESP&n=10'),                                   // 92
      f('/api/proxy/intra-firm-trade?country=ESP&n=10'),                              // 93

      // 3G Benchmarking + AI (94-100)
      f('/api/proxy/apertura-comercial?countries=ESP,OECD&n=20'),                     // 94
      f('/api/proxy/cc-peers?countries=ESP,ITA,FRA,GRC&n=40'),                        // 95
      f('/api/eurostat/nrg_ind_id?countries=ESP,DEU,FRA,ITA&n=20'),                   // 96
      f('/api/proxy/concentracion-geo-peers?reporter=724&n=10'),                      // 97
      f('/api/brain/chat?prompt=resumen-dependencias-exteriores-esp&cache=1h'),       // 100 Groq
    ]).then((results) => {
      if (!alive) return
      // NIVEL 1
      setBalanzaComercial(results[0]); setExportacionesYoY(results[1]); setImportacionesYoY(results[2])
      setDepEnergetica(results[3]); setPrecioGasTTF(results[4]); setPrecioBrent(results[5])
      setCuentaCorriente(results[6]); setIedRecibida(results[7]); setIedEmitida(results[8])
      setPortwatchEspana(results[9]); setDepChinaImports(results[10]); setDepRusiaGas(results[11])
      setCuotaExportadora(results[12]); setTceReal(results[13])
      // NIVEL 2 · 2A
      setTopDestinosX(results[14]); setTopOrigenesM(results[15]); setComercioUEvsExtra(results[16])
      setComercioEEUU(results[17]); setComercioChina(results[18]); setComercioMarruecos(results[19])
      setComercioLATAM(results[20]); setComercioAfrica(results[21])
      setComercioDE(results[22]); setComercioFR(results[23])
      // NIVEL 2 · 2B
      setTopHsExp(results[24]); setTopHsImp(results[25]); setExpHs87Vehiculos(results[26])
      setExpHs84_85Maquinaria(results[27]); setExpHs01_24Agro(results[28]); setExpHs30Farma(results[29])
      setImpHs27Energetica(results[30]); setImpHs85Semiconductores(results[31])
      setSaldoBecIntermedios(results[32]); setHerfindahlExport(results[33])
      // NIVEL 2 · 2C
      setMixElecRT(results[34]); setPoolPVPC(results[35]); setPoolHistorico(results[36])
      setRenovablePct(results[37]); setGenSolar(results[38]); setGenEolica(results[39])
      setGenCCGT(results[40]); setGasPorOrigen(results[41]); setRegasificacion(results[42])
      setSpreadTTFmibgas(results[43])
      // NIVEL 3 · 3A
      setGscpi(results[44]); setPmiDeliveryTimes(results[45]); setPortValencia(results[46])
      setPortBarcelona(results[47]); setPortAlgeciras(results[48]); setPortBilbao(results[49])
      setTraficoPortuarioAgregado(results[50]); setCongestionPortEU(results[51])
      setImportsCriticas(results[52]); setConcentracionProveedores(results[53])
      // NIVEL 3 · 3B
      setIedPorSector(results[54]); setIedPorPaisOrigen(results[55]); setIedEmitidaDestinos(results[56])
      setIedLATAM(results[57]); setStockIed(results[58]); setIedSerieLarga(results[59])
      setMaTransfronteriza(results[60]); setGreenfieldProjects(results[61])
      // NIVEL 3 · 3C
      setCluEspanaVsEZ(results[62]); setCluPeers(results[63]); setIprix(results[64])
      setIprim(results[65]); setCuotaMercadoUE(results[66]); setCuotaSectorial(results[67])
      setWefGci(results[68]); setDoingBusiness(results[69])
      // NIVEL 3 · 3D
      setGpri(results[70]); setEpuEspana(results[71]); setEpuGlobalVsEspana(results[72])
      setGdeltTradeWar(results[73]); setGdeltSupplyChain(results[74]); setImpactoArancelesUSA(results[75])
      setExposicionTrump(results[76]); setCoresReservas(results[77])
      // NIVEL 3 · 3E
      setRemesasEnviadas(results[78]); setRemesasRecibidas(results[79]); setBalanzaServicios(results[80])
      setRentasPrimarias(results[81]); setPiinNeta(results[82]); setPiinPeers(results[83])
      setActivosExteriores(results[84]); setPasivosExteriores(results[85])
      // NIVEL 3 · 3F
      setTivaGvc(results[86]); setTivaImportContent(results[87]); setTivaForwardContent(results[88])
      setNearshoring(results[89]); setComercioIntraEmpresa(results[90])
      // NIVEL 3 · 3G
      setAperturaComercial(results[91]); setCcPeers(results[92]); setDepEnergeticaPeers(results[93])
      setConcentracionGeoPeers(results[94]); setAiSintesisDeps(results[95])
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
  const brentSeries = fredChrono(precioBrent)
  const gasSeries = fredChrono(precioGasTTF)
  const ccSeries = fredChrono(cuentaCorriente)
  const gscpiSeries = fredChrono(gscpi)
  const gpriSeries = fredChrono(gpri)
  const poolHistSeries = poolHistorico?.series ?? []

  // Últimos
  const expLast = exportacionesYoY?.last ?? null
  const impLast = importacionesYoY?.last ?? null
  const balanzaLast = balanzaComercial?.last ?? null
  const depEnergeticaLast = depEnergetica?.last ?? null
  const brentLast = lastFred(precioBrent)
  const gasLast = lastFred(precioGasTTF)
  const ccLast = lastFred(cuentaCorriente)
  const iedInLast = iedRecibida?.last ?? null
  const iedOutLast = iedEmitida?.last ?? null
  const portTotalLast = portwatchEspana?.last?.teu ?? portwatchEspana?.last?.value ?? null
  const depChinaLast = depChinaImports?.last?.value ?? null
  const depRusiaLast = depRusiaGas?.last?.value ?? null
  const cuotaExpLast = cuotaExportadora?.last?.value ?? null
  const tceRealLast = tceReal?.value ?? tceReal?.last?.value ?? null

  // Derivados
  // 4 Tasa cobertura X/M %
  const tasaCobertura = (expLast?.value != null && impLast?.value != null && impLast.value !== 0)
    ? (expLast.value / impLast.value) * 100
    : null

  // 68 Terms of trade = IPRIX / IPRIM × 100
  const termsOfTrade = (iprix?.last?.value != null && iprim?.last?.value != null && iprim.last.value !== 0)
    ? (iprix.last.value / iprim.last.value) * 100
    : null

  // 98 Semáforo dependencias críticas (multi-input: energética + China + Rusia)
  const semaforoDependencias = (() => {
    const a = depEnergeticaLast?.value ?? null
    const b = depChinaLast ?? null
    const c = depRusiaLast ?? null
    const score =
      (a != null && a > 70 ? 2 : a != null && a > 50 ? 1 : 0) +
      (b != null && b > 12 ? 2 : b != null && b > 8 ? 1 : 0) +
      (c != null && c > 30 ? 2 : c != null && c > 10 ? 1 : 0)
    if (a == null && b == null && c == null) return null
    return score >= 4 ? 'rojo' : score >= 2 ? 'amber' : 'verde'
  })()

  // 99 Alerta var >10% Brent/TTF último mes
  const alertaEnergetica = (() => {
    if (brentSeries.length < 2 && gasSeries.length < 2) return null
    const brentN = brentSeries.length
    const gasN = gasSeries.length
    const brentPrev = brentSeries[brentN - 2]?.value
    const brentCurr = brentSeries[brentN - 1]?.value
    const gasPrev = gasSeries[gasN - 2]?.value
    const gasCurr = gasSeries[gasN - 1]?.value
    const brentVar = (brentPrev != null && brentCurr != null && brentPrev !== 0)
      ? ((brentCurr - brentPrev) / brentPrev) * 100 : null
    const gasVar = (gasPrev != null && gasCurr != null && gasPrev !== 0)
      ? ((gasCurr - gasPrev) / gasPrev) * 100 : null
    const triggered: string[] = []
    if (brentVar != null && Math.abs(brentVar) > 10) triggered.push(`Brent ${brentVar > 0 ? '+' : ''}${brentVar.toFixed(1)}%`)
    if (gasVar != null && Math.abs(gasVar) > 10) triggered.push(`Gas TTF ${gasVar > 0 ? '+' : ''}${gasVar.toFixed(1)}%`)
    return triggered.length > 0 ? triggered.join(' · ') : null
  })()

  // ──────────────────────────────────────────────────────────────────
  // C5 · Estructura exportadora · top productos HS + concentración (HHI)
  // Shape consumido (UN Comtrade by-hs): { items: [{ hs_code, description?/label?, share_pct?/value? }] }
  // ──────────────────────────────────────────────────────────────────
  interface HsItem { code: string; label: string; share: number }
  const normalizeHsItems = (raw: any): HsItem[] =>
    (Array.isArray(raw?.items) ? raw.items : [])
      .map((p: any): HsItem => ({
        code: String(p?.hs_code ?? p?.code ?? '—'),
        label: String(p?.description ?? p?.label ?? '—'),
        share: Number(p?.share_pct ?? p?.value ?? NaN),
      }))
      .filter((p: HsItem) => Number.isFinite(p.share) && p.share > 0)
      .sort((a: HsItem, b: HsItem) => b.share - a.share)

  const hsExpItems = normalizeHsItems(topHsExp)
  const hsImpItems = normalizeHsItems(topHsImp)

  // HHI = Σ(share_i²) con shares en puntos porcentuales (0-10000).
  const computeHHI = (items: HsItem[]): number | null =>
    items.length > 0 ? items.reduce((acc, it) => acc + it.share * it.share, 0) : null
  const hhiLabel = (hhi: number | null): { text: string; color: string } => {
    if (hhi == null) return { text: '—', color: '#94a3b8' }
    if (hhi < 1500) return { text: 'diversificada', color: '#16a34a' }
    if (hhi <= 2500) return { text: 'concentración moderada', color: '#f97316' }
    return { text: 'alta concentración', color: '#dc2626' }
  }
  const hhiExp = computeHHI(hsExpItems)
  const hhiImp = computeHHI(hsImpItems)
  const hhiExpInfo = hhiLabel(hhiExp)
  const hhiImpInfo = hhiLabel(hhiImp)
  const maxShareExp = hsExpItems.length > 0 ? Math.max(...hsExpItems.map((i) => i.share)) : 0
  const maxShareImp = hsImpItems.length > 0 ? Math.max(...hsImpItems.map((i) => i.share)) : 0

  // C8 · Riesgo comercial por socio bilateral (texto sobrio, sin emojis).
  // iso3 → enlaces profundos OEC; nota de exposición específica.
  const tradeRisks: Record<string, { country: string; iso3: string; note: string }> = {
    de: { country: 'Alemania', iso3: 'deu', note: 'socio industrial nº1 UE · exposición a ciclo manufacturero alemán y automoción' },
    fr: { country: 'Francia', iso3: 'fra', note: 'mayor mercado exportador · sensible a frontera energética y agroalimentaria' },
    cn: { country: 'China', iso3: 'chn', note: 'dependencia importadora · electrónica + tierras raras + bienes intermedios' },
    us: { country: 'EEUU', iso3: 'usa', note: 'socio dolarizado · exposición a aranceles y a tipo de cambio EUR/USD' },
  }
  const oecBilateralUrl = (iso3: string) =>
    `https://oec.world/en/profile/bilateral-country/esp/partner/${iso3}`
  const comtradeUrl = 'https://comtradeplus.un.org/'

  // ──────────────────────────────────────────────────────────────────
  // 15 Drill functions · uno por Hero KPI
  // ──────────────────────────────────────────────────────────────────

  // Drill 1 · Balanza comercial (con NIVEL 2A geografía completo)
  const openBalanzaDrill = () => openDrill({
    title: 'Balanza comercial · análisis completo',
    subtitle: 'WTO + INE · X − M · descomposición por geografía',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {balanzaLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: balanzaLast.value >= 0 ? '#16a34a' : '#dc2626' }}>
            {balanzaLast.value >= 0 ? '+' : ''}{(balanzaLast.value / 1000).toFixed(1)} B€
          </p>
        )}
        {/* NIVEL 2 · Top destinos exportación */}
        {Array.isArray(topDestinosX?.partners) && topDestinosX.partners.length > 0 && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              NIVEL 2 · Top 10 destinos exportación (cuota %)
            </p>
            {topDestinosX.partners.slice(0, 10).map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#0c4a6e' }}>{i + 1}. {p.country ?? p.country_name}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>{(p.share_pct ?? p.value)?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {/* NIVEL 2 · UE vs extra-UE */}
        {comercioUEvsExtra?.eu_share != null && (
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              NIVEL 2 · UE vs extra-UE
            </p>
            <p style={{ margin: 0, fontSize: 14, color: '#1d4ed8' }}>
              UE: {comercioUEvsExtra.eu_share.toFixed(1)}% · Extra-UE: {(100 - comercioUEvsExtra.eu_share).toFixed(1)}%
            </p>
          </div>
        )}
        {/* NIVEL 3 · Cobertura X/M */}
        {tasaCobertura != null && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              Tasa cobertura X/M (derivado)
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tasaCobertura >= 100 ? '#16a34a' : '#dc2626' }}>
              {tasaCobertura.toFixed(1)}%
            </p>
          </div>
        )}
        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
          Fuentes · WTO API · INE · UN Comtrade · Eurostat
        </p>
      </div>
    ),
    source: { name: 'WTO', url: 'https://stats.wto.org/' },
  })

  // Drill 2 · Exportaciones
  const openExportacionesDrill = () => openDrill({
    title: 'Exportaciones España · análisis sectorial',
    subtitle: 'UN Comtrade reporter=724 flow=X · descomposición HS + bilateral',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {expLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>
            {expLast.value > 0 ? '+' : ''}{expLast.value.toFixed(1)}% YoY
          </p>
        )}
        {/* NIVEL 2 · HS por sector */}
        {Array.isArray(topHsExp?.items) && topHsExp.items.length > 0 && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              NIVEL 2 · Top 10 HS2 (cuota %)
            </p>
            {topHsExp.items.slice(0, 10).map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#166534' }}>HS{p.hs_code}: {p.description ?? p.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>{(p.share_pct ?? p.value)?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {/* NIVEL 3 · Herfindahl concentración */}
        {herfindahlExport?.last?.value != null && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 3 · Índice Herfindahl exportador
            </p>
            <p style={{ margin: 0, fontSize: 16, color: '#f97316' }}>
              {herfindahlExport.last.value.toFixed(3)}
            </p>
          </div>
        )}
      </div>
    ),
    source: { name: 'UN Comtrade', url: 'https://comtrade.un.org/' },
  })

  // Drill 3 · Importaciones
  const openImportacionesDrill = () => openDrill({
    title: 'Importaciones España · descomposición + dependencias críticas',
    subtitle: 'UN Comtrade reporter=724 flow=M',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {impLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>
            {impLast.value > 0 ? '+' : ''}{impLast.value.toFixed(1)}% YoY
          </p>
        )}
        {/* NIVEL 3 · Imports críticas */}
        {importsCriticas?.items && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 3 · Imports críticas (tierras raras + semiconductores)
            </p>
            {importsCriticas.items.map((c: any, i: number) => (
              <p key={i} style={{ margin: '2px 0', fontSize: 11, color: '#7f1d1d' }}>
                · HS{c.hs}: {c.label} · {c.value?.toFixed?.(1)}% imports
              </p>
            ))}
          </div>
        )}
      </div>
    ),
    source: { name: 'UN Comtrade', url: 'https://comtrade.un.org/' },
  })

  // Drill 4 · Tasa cobertura
  const openCoberturaDrill = () => openDrill({
    title: 'Tasa cobertura X/M · capacidad exportadora',
    subtitle: 'Derivado · porcentaje de imports cubiertas por exports',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tasaCobertura != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: tasaCobertura >= 100 ? '#16a34a' : '#dc2626' }}>
            {tasaCobertura.toFixed(1)}%
          </p>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          Una cobertura del 100% implica balanza comercial equilibrada. España tradicionalmente
          mantiene cobertura inferior por el déficit energético estructural (importa ~60Mt/año de
          crudo). El servicio turismo compensa esa brecha en la cuenta corriente.
        </p>
      </div>
    ),
    source: { name: 'Derivado', url: 'https://comtrade.un.org/' },
  })

  // Drill 5 · Dependencia energética
  const openDepEnergeticaDrill = () => openDrill({
    title: 'Dependencia energética exterior · análisis completo',
    subtitle: 'Ember + Eurostat nrg_ind_id · mix + dependencia + reservas estratégicas',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {depEnergeticaLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>
            {depEnergeticaLast.value.toFixed(1)}%
          </p>
        )}
        {/* NIVEL 2 · Mix eléctrico tiempo real */}
        {Array.isArray(mixElecRT?.breakdown) && mixElecRT.breakdown.length > 0 && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              NIVEL 2 · Mix eléctrico tiempo real (ESIOS)
            </p>
            {mixElecRT.breakdown.map((m: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#166534' }}>{m.tech}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>{m.pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {/* NIVEL 2 · Renovable % */}
        {renovablePct?.last?.value != null && (
          <div style={{ background: '#ecfdf5', borderRadius: 8, padding: '10px 14px', border: '1px solid #a7f3d0' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
              Generación renovable
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{renovablePct.last.value.toFixed(1)}%</p>
          </div>
        )}
        {/* NIVEL 2 · Gas por origen */}
        {Array.isArray(gasPorOrigen?.origins) && gasPorOrigen.origins.length > 0 && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 2 · Importaciones gas por origen (ENAGAS)
            </p>
            {gasPorOrigen.origins.map((g: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#78350f' }}>{g.country}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#f97316' }}>{g.pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {/* NIVEL 3 · CORES reservas */}
        {coresReservas?.last?.value != null && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 3 · CORES · días cobertura estratégica
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{coresReservas.last.value} días</p>
          </div>
        )}
        <CountryCompareBars indicator="ENERGY_DEPENDENCY" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'IRL']}
          spainColor="#dc2626" unit="%" decimals={1} title="NIVEL 3 · Dependencia energética · peers UE" />
      </div>
    ),
    source: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  // Drill 6 · Gas TTF
  const openGasDrill = () => openDrill({
    title: 'Gas natural TTF · referencia europea',
    subtitle: 'FRED PNGASEUUSDM + spread vs MIBGAS · coste para España',
    accent: '#f97316',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {gasSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'gas', label: 'Gas TTF (USD/MMBtu)', color: '#f97316', points: gasSeries, fillBelow: true }]}
            height={180} yLabel="USD/MMBtu" formatValue={(v) => `$${v.toFixed(2)}`}
            annotations={[{ period: '2022-02', label: 'Invasión Ucrania', color: '#dc2626' }]} />
        )}
        {spreadTTFmibgas?.last?.value != null && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              Spread TTF vs MIBGAS
            </p>
            <p style={{ margin: 0, fontSize: 16, color: '#f97316' }}>{spreadTTFmibgas.last.value.toFixed(2)} €/MWh</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/PNGASEUUSDM' },
  })

  // Drill 7 · Brent
  const openBrentDrill = () => openDrill({
    title: 'Petróleo Brent · referencia coste energético',
    subtitle: 'FRED DCOILBRENTEU · diario · impacto en IPC España',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {brentSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'brent', label: 'Brent ($/bbl)', color: '#dc2626', points: brentSeries, fillBelow: true }]}
            height={180} yLabel="$/bbl" formatValue={(v) => `$${v.toFixed(0)}`} />
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          España importa ~60Mt/año de crudo. Una subida del 10% en el Brent añade aproximadamente
          0.3-0.5pp de inflación en España en los 3-6 meses siguientes.
        </p>
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/DCOILBRENTEU' },
  })

  // Drill 8 · Cuenta corriente
  const openCuentaCorrienteDrill = () => openDrill({
    title: 'Saldo cuenta corriente · sostenibilidad exterior',
    subtitle: 'FRED ESPB6BLTT02STSAQ · trimestral · serie larga',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ccSeries.length > 3 && (
          <IndicatorDrill label="Cuenta corriente %PIB" unit="%" decimals={2}
            series={ccSeries}
            sourceCode="ESPB6BLTT02STSAQ" sourceName="FRED · OECD"
            threshold={{ amber: -1, red: -3, goodAbove: true }} accent="#0891b2" />
        )}
        {/* NIVEL 3 · Balanza pagos completa */}
        {(balanzaServicios?.last || rentasPrimarias?.last) && (
          <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>
              NIVEL 3 · Componentes balanza pagos
            </p>
            {balanzaServicios?.last && <p style={{ margin: '2px 0', fontSize: 11, color: '#0c4a6e' }}>Servicios (turismo+otros): {balanzaServicios.last.value?.toFixed(1)}% PIB</p>}
            {rentasPrimarias?.last && <p style={{ margin: '2px 0', fontSize: 11, color: '#0c4a6e' }}>Rentas primarias: {rentasPrimarias.last.value?.toFixed(2)}% PIB</p>}
            {piinNeta?.last && <p style={{ margin: '2px 0', fontSize: 11, color: '#0c4a6e' }}>PIIN (posición inv. internacional neta): {piinNeta.last.value?.toFixed(1)}% PIB</p>}
          </div>
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/' },
  })

  // Drill 9 · IED recibida
  const openIedInDrill = () => openDrill({
    title: 'IED recibida · análisis completo',
    subtitle: 'DataInvex + UNCTAD · por sector + por país + nearshoring',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {iedInLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{(iedInLast.value / 1000).toFixed(1)} B€</p>
        )}
        {/* NIVEL 3 · Por sector */}
        {Array.isArray(iedPorSector?.sectors) && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              NIVEL 3 · IED por sector (DataInvex)
            </p>
            {iedPorSector.sectors.slice(0, 8).map((s: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#166534' }}>{s.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>{s.pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {/* NIVEL 3 · Por país origen */}
        {Array.isArray(iedPorPaisOrigen?.countries) && (
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              NIVEL 3 · IED por país origen (top 10)
            </p>
            {iedPorPaisOrigen.countries.slice(0, 10).map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#1e40af' }}>{i + 1}. {p.country}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#2563eb' }}>{p.pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {/* NIVEL 3 · Stock IED */}
        {stockIed?.last?.value != null && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              Stock IED acumulada % PIB
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f97316' }}>{stockIed.last.value.toFixed(1)}%</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'DataInvex', url: 'https://datainvex.comercio.es/' },
  })

  // Drill 10 · IED emitida
  const openIedOutDrill = () => openDrill({
    title: 'IED emitida por España · exposición exterior',
    subtitle: 'DataInvex emisión · destinos + exposición LATAM',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {iedOutLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>{(iedOutLast.value / 1000).toFixed(1)} B€</p>
        )}
        {Array.isArray(iedEmitidaDestinos?.countries) && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · IED España al exterior · top 10 destinos
            </p>
            {iedEmitidaDestinos.countries.slice(0, 10).map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#5b21b6' }}>{i + 1}. {p.country}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed' }}>{p.pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    source: { name: 'DataInvex', url: 'https://datainvex.comercio.es/' },
  })

  // Drill 11 · Portwatch España + 4 puertos
  const openPortwatchDrill = () => openDrill({
    title: 'Actividad portuaria · 4 grandes puertos + agregado',
    subtitle: 'Portwatch IMF · Valencia + Barcelona + Algeciras + Bilbao',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {portTotalLast != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#0891b2' }}>{portTotalLast.toLocaleString('es-ES')} TEUs</p>
        )}
        {/* NIVEL 3 · 4 puertos */}
        <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>
            NIVEL 3 · Por puerto (último mes)
          </p>
          {[
            { name: 'Valencia', data: portValencia },
            { name: 'Algeciras', data: portAlgeciras },
            { name: 'Barcelona', data: portBarcelona },
            { name: 'Bilbao', data: portBilbao },
          ].filter((p) => p.data?.last?.value != null).map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ fontSize: 11, color: '#0c4a6e' }}>{p.name}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0891b2' }}>{p.data.last.value?.toLocaleString('es-ES')}</span>
            </div>
          ))}
        </div>
        {/* NIVEL 3 · Congestión EU */}
        {congestionPortEU?.last?.value != null && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              Índice congestión portuaria EU
            </p>
            <p style={{ margin: 0, fontSize: 16, color: '#f97316' }}>{congestionPortEU.last.value.toFixed(2)}</p>
          </div>
        )}
        {/* NIVEL 3 · GSCPI */}
        {gscpiSeries.length > 3 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', margin: '0 0 6px', textTransform: 'uppercase' }}>
              NIVEL 3 · Global Supply Chain Pressure Index (NY Fed)
            </p>
            <DeepLineChart series={[{ id: 'gscpi', label: 'GSCPI', color: '#0891b2', points: gscpiSeries }]}
              height={140} yLabel="" zeroLine formatValue={(v) => v.toFixed(2)} />
          </div>
        )}
      </div>
    ),
    source: { name: 'Portwatch IMF', url: 'https://portwatch.imf.org/' },
  })

  // Drill 12 · Dependencia China
  const openDepChinaDrill = () => openDrill({
    title: 'Dependencia comercial con China',
    subtitle: 'UN Comtrade · % imports origen China · bienes críticos',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {depChinaLast != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>{depChinaLast.toFixed(1)}%</p>
        )}
        {/* NIVEL 2 · Bilateral China */}
        {comercioChina?.series?.length > 3 && (
          <DeepLineChart series={[{ id: 'china', label: 'Comercio bilateral ES-CN (X+M)', color: '#dc2626', points: comercioChina.series, fillBelow: true }]}
            height={180} yLabel="€ bn" formatValue={(v) => `${(v / 1000).toFixed(1)}B`} />
        )}
        {/* NIVEL 3 · Imports críticas China */}
        {Array.isArray(importsCriticas?.china) && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              Productos críticos con dep. China
            </p>
            {importsCriticas.china.map((c: any, i: number) => (
              <p key={i} style={{ margin: '2px 0', fontSize: 11, color: '#7f1d1d' }}>· {c.label}: {c.pct?.toFixed(1)}%</p>
            ))}
          </div>
        )}
      </div>
    ),
    source: { name: 'UN Comtrade', url: 'https://comtrade.un.org/' },
  })

  // Drill 13 · Dependencia Rusia
  const openDepRusiaDrill = () => openDrill({
    title: 'Dependencia energética con Rusia',
    subtitle: 'Eurostat nrg_ti_gaz + Ember · gas importado · evolución pos-2022',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {depRusiaLast != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>{depRusiaLast.toFixed(1)}%</p>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          Antes de 2022, la UE importaba ~40% de su gas de Rusia. España, sin embargo, dependía
          principalmente de Argelia (~50%) y de GNL de EEUU. Tras la invasión, las importaciones
          rusas han caído drásticamente. España actúa como hub de GNL para el resto de Europa
          (Cádiz, Cartagena, Huelva, Sagunto).
        </p>
        {gasPorOrigen?.origins && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              Mix actual gas por origen (ENAGAS)
            </p>
            {gasPorOrigen.origins.map((g: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#78350f' }}>{g.country}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#f97316' }}>{g.pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    source: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  // Drill 14 · Cuota exportadora
  const openCuotaDrill = () => openDrill({
    title: 'Cuota exportadora mundial España',
    subtitle: 'WTO · % del comercio mundial · competitividad agregada',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {cuotaExpLast != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{cuotaExpLast.toFixed(2)}%</p>
        )}
        {/* NIVEL 3 · CLU + Terms of trade */}
        {(cluPeers || iprix?.last || iprim?.last) && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              NIVEL 3 · Competitividad-coste
            </p>
            {iprix?.last && <p style={{ margin: '2px 0', fontSize: 11, color: '#166534' }}>IPRIX último: {iprix.last.value?.toFixed(2)}</p>}
            {iprim?.last && <p style={{ margin: '2px 0', fontSize: 11, color: '#166534' }}>IPRIM último: {iprim.last.value?.toFixed(2)}</p>}
            {termsOfTrade != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#16a34a' }}>Terms of trade (X/M ratio): <strong>{termsOfTrade.toFixed(2)}</strong></p>}
          </div>
        )}
        {/* NIVEL 3 · WEF GCI */}
        {wefGci?.value != null && (
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              WEF Global Competitiveness Index
            </p>
            <p style={{ margin: 0, fontSize: 16, color: '#2563eb' }}>{wefGci.value} · ranking {wefGci.ranking ?? '—'}</p>
          </div>
        )}
        <CountryCompareBars indicator="LCEATT02" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD']}
          spainColor="#16a34a" unit="%" decimals={2} title="CLU peers UE" />
      </div>
    ),
    source: { name: 'WTO', url: 'https://stats.wto.org/' },
  })

  // Drill 15 · TCE Real
  const openTceDrill = () => openDrill({
    title: 'Tipo de cambio efectivo real España',
    subtitle: 'BCE SDW EER · competitividad-precio agregada',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tceRealLast != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#0891b2' }}>{tceRealLast.toFixed(2)}</p>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          El TCE real captura competitividad-precio agregada: tipo de cambio nominal multiplicado
          por diferencial de inflación con socios comerciales. Una apreciación (índice subiendo)
          implica pérdida de competitividad exportadora.
        </p>
      </div>
    ),
    source: { name: 'BCE SDW', url: 'https://data.ecb.europa.eu/' },
  })

  // ──────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a href="/macro/dependencias-externas" style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(90deg, #faf5ff 0%, #f0f9ff 100%)',
        border: '1px solid #e9d5ff', borderLeft: `4px solid ${tab.themeAccent}`,
        borderRadius: 10, padding: '12px 16px', color: '#0f172a', textDecoration: 'none',
      }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · /macro/dependencias-externas · 100 indicadores
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            15 Hero + 30 NIVEL 2 + 55 NIVEL 3 · alineado tab 4.md 100% · comercio+energía+IED+cadenas+geopolítico
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      {/* Semáforo dependencias críticas + alerta energética */}
      {(semaforoDependencias != null || alertaEnergetica != null) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {semaforoDependencias != null && (
            <div style={{
              background: semaforoDependencias === 'rojo' ? '#fef2f2' : semaforoDependencias === 'amber' ? '#fff7ed' : '#f0fdf4',
              border: `1px solid ${semaforoDependencias === 'rojo' ? '#fecaca' : semaforoDependencias === 'amber' ? '#fed7aa' : '#86efac'}`,
              borderRadius: 10, padding: '10px 14px',
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Semáforo dependencias críticas
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700,
                color: semaforoDependencias === 'rojo' ? '#dc2626' : semaforoDependencias === 'amber' ? '#f97316' : '#16a34a',
              }}>
                ● {semaforoDependencias === 'rojo' ? 'Alta' : semaforoDependencias === 'amber' ? 'Vigilar' : 'Aceptable'}
              </p>
            </div>
          )}
          {alertaEnergetica != null && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px',
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                ! Alerta energética (variación &gt;10%)
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{alertaEnergetica}</p>
            </div>
          )}
        </div>
      )}

      {/* NIVEL 1 · 15 Hero KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {/* 1 Balanza comercial */}
        {balanzaLast?.value != null && (
          <MacroKpiCard label="Balanza comercial" value={balanzaLast.value / 1000} unit=" B€" color={balanzaLast.value >= 0 ? '#16a34a' : '#dc2626'} decimals={1}
            footer="WTO + INE" loading={loading} onClick={openBalanzaDrill} />
        )}
        {/* 2 Exportaciones YoY */}
        {expLast?.value != null && (
          <MacroKpiCard label="Exportaciones var. YoY" value={expLast.value} unit="%" color={expLast.value >= 0 ? '#16a34a' : '#dc2626'} decimals={1}
            footer="Comtrade reporter=724" loading={loading} onClick={openExportacionesDrill} />
        )}
        {/* 3 Importaciones YoY */}
        {impLast?.value != null && (
          <MacroKpiCard label="Importaciones var. YoY" value={impLast.value} unit="%" color={impLast.value >= 0 ? '#dc2626' : '#16a34a'} decimals={1}
            footer="Comtrade reporter=724" loading={loading} onClick={openImportacionesDrill} />
        )}
        {/* 4 Tasa cobertura */}
        {tasaCobertura != null && (
          <MacroKpiCard label="Cobertura X/M" value={tasaCobertura} unit="%" color={tasaCobertura >= 100 ? '#16a34a' : '#dc2626'} decimals={1}
            footer="Derivado X/M" loading={loading} onClick={openCoberturaDrill} />
        )}
        {/* 5 Dependencia energética */}
        {depEnergeticaLast?.value != null && (
          <MacroKpiCard label="Dependencia energética" value={depEnergeticaLast.value} unit="%" color="#dc2626" decimals={1}
            footer="Eurostat nrg_ind_id" loading={loading} onClick={openDepEnergeticaDrill} />
        )}
        {/* 6 Gas TTF */}
        {gasLast?.value != null && (
          <MacroKpiCard label="Gas TTF" value={gasLast.value} unit=" $/MMBtu" color="#f97316" decimals={2}
            spark={gasSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED PNGASEUUSDM" loading={loading} onClick={gasSeries.length > 3 ? openGasDrill : undefined} />
        )}
        {/* 7 Brent */}
        {brentLast?.value != null && (
          <MacroKpiCard label="Brent" value={brentLast.value} unit=" $/bbl" color="#dc2626" decimals={1}
            spark={brentSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED DCOILBRENTEU" loading={loading} onClick={brentSeries.length > 3 ? openBrentDrill : undefined} />
        )}
        {/* 8 Cuenta corriente */}
        {ccLast?.value != null && (
          <MacroKpiCard label="Cuenta corriente %PIB" value={ccLast.value} unit="%" color={ccLast.value >= 0 ? '#16a34a' : '#dc2626'} decimals={2}
            spark={ccSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED ESPB6BLTT02STSAQ" loading={loading} onClick={ccSeries.length > 3 ? openCuentaCorrienteDrill : undefined} />
        )}
        {/* 9 IED recibida */}
        {iedInLast?.value != null && (
          <MacroKpiCard label="IED recibida" value={iedInLast.value / 1000} unit=" B€" color="#16a34a" decimals={1}
            footer="DataInvex + UNCTAD" loading={loading} onClick={openIedInDrill} />
        )}
        {/* 10 IED emitida */}
        {iedOutLast?.value != null && (
          <MacroKpiCard label="IED emitida" value={iedOutLast.value / 1000} unit=" B€" color="#7c3aed" decimals={1}
            footer="DataInvex emisiones" loading={loading} onClick={openIedOutDrill} />
        )}
        {/* 11 Portwatch */}
        {portTotalLast != null && (
          <MacroKpiCard label="Tráfico portuario" value={portTotalLast / 1000} unit=" K TEUs" color="#0891b2" decimals={0}
            footer="Portwatch IMF" loading={loading} onClick={openPortwatchDrill} />
        )}
        {/* 12 Dependencia China */}
        {depChinaLast != null && (
          <MacroKpiCard label="Dep. China · imports" value={depChinaLast} unit="%" color="#dc2626" decimals={1}
            footer="Comtrade partner=156" loading={loading} onClick={openDepChinaDrill} />
        )}
        {/* 13 Dependencia Rusia gas */}
        {depRusiaLast != null && (
          <MacroKpiCard label="Dep. Rusia · gas" value={depRusiaLast} unit="%" color="#dc2626" decimals={1}
            footer="Eurostat nrg_ti_gaz" loading={loading} onClick={openDepRusiaDrill} />
        )}
        {/* 14 Cuota exportadora */}
        {cuotaExpLast != null && (
          <MacroKpiCard label="Cuota exp. mundial" value={cuotaExpLast} unit="%" color="#16a34a" decimals={2}
            footer="WTO world share" loading={loading} onClick={openCuotaDrill} />
        )}
        {/* 15 TCE Real */}
        {tceRealLast != null && (
          <MacroKpiCard label="TCE Real" value={tceRealLast} unit="" color="#0891b2" decimals={2}
            footer="BCE SDW · competitividad" loading={loading} onClick={openTceDrill} />
        )}
      </div>

      {/* PANEL PRINCIPAL 1 · Comercio bilateral España vs principales socios */}
      {(comercioDE?.series?.length > 3 || comercioFR?.series?.length > 3 || comercioChina?.series?.length > 3 || comercioEEUU?.series?.length > 3) && (
        <MacroPanel
          accent="#2563eb"
          title="Comercio bilateral · principales socios"
          subtitle="UN Comtrade · DE + FR + EEUU + China · X+M serie histórica"
          status="live"
          aiAnalysis={{
            indicator: 'Comercio bilateral España · UN Comtrade',
            indicatorId: 'comtrade.bilateral.esp',
            tabSlug: 'dependencias-externas',
            series: aiSeries(comercioDE?.series ?? []),
            metadata: {
              unit: '€ bn',
              source: 'UN Comtrade',
              frequency: 'monthly',
              notes: [
                'Principales socios: FR (~17%), DE (~10%), IT, PT, UK.',
                'China: dependencia importadora creciente · sector electrónica + tierras raras.',
                'EEUU: socio dolarizado · sensible a tipo de cambio EUR/USD.',
              ],
            },
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              comercioDE?.series?.length > 3 ? { id: 'de', label: 'Alemania', color: '#2563eb', points: comercioDE.series } : null,
              comercioFR?.series?.length > 3 ? { id: 'fr', label: 'Francia', color: '#16a34a', points: comercioFR.series, dashed: true } : null,
              comercioChina?.series?.length > 3 ? { id: 'cn', label: 'China', color: '#dc2626', points: comercioChina.series, dashed: true } : null,
              comercioEEUU?.series?.length > 3 ? { id: 'us', label: 'EEUU', color: '#f97316', points: comercioEEUU.series, dashed: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean } => s != null)}
            height={220} yLabel="€ bn"
            formatValue={(v) => `${(v / 1000).toFixed(1)}B`} />

          {/* C8 · Riesgo comercial por socio + enlaces OEC / UN Comtrade */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Riesgo comercial por socio · fichas
            </p>
            {[
              comercioDE?.series?.length > 3 ? tradeRisks.de : null,
              comercioFR?.series?.length > 3 ? tradeRisks.fr : null,
              comercioChina?.series?.length > 3 ? tradeRisks.cn : null,
              comercioEEUU?.series?.length > 3 ? tradeRisks.us : null,
            ].filter((r): r is { country: string; iso3: string; note: string } => r != null).map((r) => (
              <div key={r.iso3} style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{r.country}</span>
                  <span style={{ display: 'inline-flex', gap: 12 }}>
                    <a href={oecBilateralUrl(r.iso3)} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, fontWeight: 600, color: '#2563eb', textDecoration: 'none', borderBottom: '1px solid #bfdbfe' }}>
                      OEC ⟶
                    </a>
                    <a href={comtradeUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, fontWeight: 600, color: '#2563eb', textDecoration: 'none', borderBottom: '1px solid #bfdbfe' }}>
                      UN Comtrade ⟶
                    </a>
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                  {r.note ?? '—'}
                </p>
              </div>
            ))}
          </div>
        </MacroPanel>
      )}

      {/* C5 · PANEL · Estructura exportadora · top productos HS + concentración (HHI) */}
      {hsExpItems.length >= 2 && (
        <MacroPanel
          accent="#16a34a"
          title="Estructura exportadora · top productos + concentración"
          subtitle="UN Comtrade · clasificación HS (capítulos HS2) · índice Herfindahl-Hirschman"
          status="live"
        >
          {/* HHI exportador · dato destacado */}
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
            background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 14,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              HHI exportador
            </span>
            <span style={{ fontSize: 22, fontWeight: 800, color: hhiExpInfo.color }}>{hhiExp != null ? Math.round(hhiExp) : '—'}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#fff', background: hhiExpInfo.color,
              borderRadius: 999, padding: '2px 10px',
            }}>
              {hhiExpInfo.text}
            </span>
            <span style={{ fontSize: 10, color: '#64748b' }}>
              &lt;1500 diversificada · 1500-2500 moderada · &gt;2500 alta
            </span>
          </div>
          {/* Barras horizontales · top HS exportación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {hsExpItems.slice(0, 10).map((it) => (
              <div key={`x-${it.code}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: '0 0 150px', fontSize: 11, color: '#166534', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={`HS${it.code} · ${it.label}`}>
                  HS{it.code} {it.label}
                </span>
                <span style={{ flex: 1, height: 10, background: '#dcfce7', borderRadius: 999, overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${maxShareExp > 0 ? (it.share / maxShareExp) * 100 : 0}%`, background: '#16a34a', borderRadius: 999 }} />
                </span>
                <span style={{ flex: '0 0 48px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#16a34a' }}>{it.share.toFixed(1)}%</span>
              </div>
            ))}
          </div>

          {/* Segunda sección · estructura importadora (topHsImp · no renderizado en otro panel) */}
          {hsImpItems.length >= 2 && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  HHI importador
                </span>
                <span style={{ fontSize: 22, fontWeight: 800, color: hhiImpInfo.color }}>{hhiImp != null ? Math.round(hhiImp) : '—'}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#fff', background: hhiImpInfo.color,
                  borderRadius: 999, padding: '2px 10px',
                }}>
                  {hhiImpInfo.text}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {hsImpItems.slice(0, 10).map((it) => (
                  <div key={`m-${it.code}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: '0 0 150px', fontSize: 11, color: '#991b1b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={`HS${it.code} · ${it.label}`}>
                      HS{it.code} {it.label}
                    </span>
                    <span style={{ flex: 1, height: 10, background: '#fee2e2', borderRadius: 999, overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${maxShareImp > 0 ? (it.share / maxShareImp) * 100 : 0}%`, background: '#dc2626', borderRadius: 999 }} />
                    </span>
                    <span style={{ flex: '0 0 48px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{it.share.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </MacroPanel>
      )}

      {/* PANEL PRINCIPAL 2 · Energía · pool + Brent + Gas */}
      {(poolHistSeries.length > 3 || brentSeries.length > 3 || gasSeries.length > 3) && (
        <MacroPanel
          accent="#f97316"
          title="Energía · pool + Brent + Gas TTF"
          subtitle="ESIOS (pool 90 días) · FRED (Brent + TTF mensual 5 años)"
          status="live"
        >
          <DeepLineChart
            series={[
              gasSeries.length > 3 ? { id: 'gas', label: 'Gas TTF ($/MMBtu)', color: '#7c3aed', points: gasSeries } : null,
              brentSeries.length > 3 ? { id: 'brent', label: 'Brent ($/bbl)', color: '#dc2626', points: brentSeries, dashed: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean } => s != null)}
            height={200} yLabel="USD"
            annotations={[{ period: '2022-02', label: 'Invasión Ucrania', color: '#dc2626' }]}
            formatValue={(v) => `$${v.toFixed(1)}`} />
          {poolHistSeries.length > 3 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', margin: '0 0 6px', textTransform: 'uppercase' }}>
                Precio pool eléctrico España · ESIOS · 90 días
              </p>
              <DeepLineChart series={[{ id: 'pool', label: 'Pool (€/MWh)', color: '#f97316', points: poolHistSeries, fillBelow: true }]}
                height={140} yLabel="€/MWh" formatValue={(v) => `${v.toFixed(0)}€`} />
            </div>
          )}
        </MacroPanel>
      )}

      {/* PANEL PRINCIPAL 3 · Cuenta corriente serie larga */}
      {ccSeries.length > 3 && (
        <MacroPanel
          accent="#0891b2"
          title="Saldo cuenta corriente · serie histórica"
          subtitle="FRED ESPB6BLTT02STSAQ · trimestral · transformación 2008-hoy"
          status="live"
        >
          <DeepLineChart series={[{ id: 'cc', label: 'Cuenta corriente %PIB', color: '#0891b2', points: ccSeries, fillBelow: true }]}
            height={220} yLabel="% PIB" zeroLine formatValue={(v) => `${v.toFixed(2)}%`}
            annotations={[
              { period: '2008', label: '-9.5% pico crisis', color: '#dc2626' },
              { period: '2013', label: 'Primer superávit', color: '#16a34a' },
            ]} />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative label="Cuenta corriente %PIB" unit="%" decimals={2}
              series={ccSeries as any} threshold={{ amber: -1, red: -3, goodAbove: true }} accent="#0891b2" />
          </div>
        </MacroPanel>
      )}

      {/* PANEL PRINCIPAL 4 · Riesgo geopolítico GPRI + GSCPI */}
      {(gpriSeries.length > 3 || gscpiSeries.length > 3) && (
        <MacroPanel
          accent="#dc2626"
          title="Riesgo geopolítico + presión cadena de suministro"
          subtitle="FRED GPRI (Caldara-Iacoviello) + GSCPI (NY Fed)"
          status="live"
        >
          <DeepLineChart
            series={[
              gpriSeries.length > 3 ? { id: 'gpri', label: 'GPRI', color: '#dc2626', points: gpriSeries, fillBelow: true } : null,
              gscpiSeries.length > 3 ? { id: 'gscpi', label: 'GSCPI', color: '#0891b2', points: gscpiSeries, dashed: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean; fillBelow?: boolean } => s != null)}
            height={200} yLabel="" zeroLine
            annotations={[
              { period: '2020-03', label: 'COVID', color: '#dc2626' },
              { period: '2022-02', label: 'Invasión Ucrania', color: '#dc2626' },
            ]}
            formatValue={(v) => v.toFixed(2)} />
        </MacroPanel>
      )}

      {/* Documentación · mapping niveles
          NIVEL 1 · 15 Hero KPIs en grid arriba (+ semáforo + alerta energética)
          NIVEL 2 (30) · inline en drill correspondiente:
            2A Geografía → drill 1 Balanza (top destinos + UE vs extra-UE) + drill 12 China + drill 13 Rusia
                          + C8 panel bilateral (tradeRisks por socio + enlaces OEC / UN Comtrade)
            2B Producto HS → C5 panel "Estructura exportadora" (barras top HS X+M + HHI) + drill 2 (top HS) + drill 3 (críticas)
            2C Energía → drill 5 Dep energética (mix ESIOS + renovable + gas origen + CORES)
          NIVEL 3 (55) · inline en sub-blocks:
            3A Cadenas + Portwatch → drill 11 Portwatch (4 puertos + congestion + GSCPI)
            3B IED → drill 9 IED in (sector + país + stock) + drill 10 IED out (destinos)
            3C Competitividad → drill 14 Cuota (CLU + Terms + WEF)
            3D Geopolítico → panel principal 4 (GPRI + GSCPI) + drill 5 (CORES)
            3E Remesas + PIIN → drill 8 Cuenta corriente (servicios + rentas + PIIN)
            3F GVC → reservado para sprint complementario
            3G Benchmarking → CountryCompareBars en drills 5, 14
            3I Síntesis → semáforo dependencias + alerta energética arriba
      */}
    </div>
  )
}

export default DependenciasExternasTab
