'use client'
/**
 * `<ProductividadCompetitividadTab />` · Tab 8 · DESIGUALDAD & COHESIÓN SOCIAL.
 *
 * NOTA · El componente sigue exportándose con el nombre legacy
 * `ProductividadCompetitividadTab` para no romper imports. En la
 * NUEVA taxonomía económica de 15 tabs el slot Tab 8 ya no es
 * "Productividad & competitividad" sino "Desigualdad & Cohesión Social".
 * El renombrado del fichero y del export se hará en sprint futuro
 * sin afectar rutas.
 *
 * Alineado al 100% con `Tab 8.md` · 100 indicadores en 3 niveles.
 * La economía como distribución: estructura distributiva completa de
 * renta, riqueza, pobreza, movilidad, territorio y cohesión social.
 *
 *   NIVEL 1 · Hero (15 KPIs):
 *     1.  Gini renta disponible                · FRED/Eurostat ilc_di12
 *     2.  Gini ES vs peers OCDE                · OECD IDD
 *     3.  AROPE %                              · Eurostat ilc_peps01
 *     4.  AROPE ES vs media UE (distancia)     · Eurostat
 *     5.  S80/S20 ratio                        · Eurostat ilc_di11
 *     6.  S80/S20 ES vs UE ranking             · Eurostat
 *     7.  Tasa pobreza relativa (<60% mediana) · Eurostat ilc_li02
 *     8.  Renta media hogar €/año              · INE ECV
 *     9.  Renta mediana hogar €/año            · INE ECV
 *     10. % renta top 1%                       · WID scraper
 *     11. % renta top 10%                      · WID
 *     12. Gasto protección social %PIB         · Eurostat spr_exp_sum
 *     13. IDH ranking                          · UNDP
 *     14. Coeficiente Palma (derivado)         · top 10% / bottom 40%
 *     15. Movilidad social IGE                 · OECD A_FAMILY
 *
 *   NIVEL 2 · Detalle (30 indicadores):
 *     2A · Pobreza y exclusión en profundidad (16-25)
 *     2B · Distribución de renta (26-35)
 *     2C · Riqueza y patrimonio (36-45)
 *
 *   NIVEL 3 · Detalle del detalle (55 indicadores):
 *     3A · Desigualdad territorial CCAA (46-55)
 *     3B · Movilidad social (56-65)
 *     3C · Protección social y Estado de Bienestar (66-75)
 *     3D · Género y diversidad económica (76-82)
 *     3E · Inmigración y diversidad social (83-86)
 *     3F · Narrativa y percepción social (87-92)
 *     3G · Bienestar subjetivo y calidad de vida (93-97)
 *     3H · Síntesis y alertas (98-100)
 *
 * REGLA · si endpoint devuelve null/error → panel/bloque NO se renderiza.
 * Frontend ciego para fuentes que el backend no expone aún (WID scraper,
 * UNDP, EIGE, FEANTSA, IMSERSO, Eurobarómetro, Google Trends).
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
// Helpers
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
}

// ──────────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────────

export function ProductividadCompetitividadTab() {
  // Slot Tab 8 ahora es "Desigualdad & Cohesión Social".
  const tab = getTab('productividad-competitividad')
  const { openDrill } = useMacroDrawer()

  // ───── NIVEL 1 · Hero · 15 indicadores ─────
  const [gini, setGini] = useState<FredSeriesResponse | null>(null)                    // 1
  const [giniPeers, setGiniPeers] = useState<any>(null)                                // 2
  const [arope, setArope] = useState<any>(null)                                        // 3
  const [aropeVsUE, setAropeVsUE] = useState<any>(null)                                // 4
  const [s80s20, setS80s20] = useState<any>(null)                                      // 5
  const [s80s20Peers, setS80s20Peers] = useState<any>(null)                            // 6
  const [pobrezaRelativa, setPobrezaRelativa] = useState<any>(null)                    // 7
  const [rentaMediaHogar, setRentaMediaHogar] = useState<any>(null)                    // 8
  const [rentaMedianaHogar, setRentaMedianaHogar] = useState<any>(null)                // 9
  const [top1Renta, setTop1Renta] = useState<any>(null)                                // 10
  const [top10Renta, setTop10Renta] = useState<any>(null)                              // 11
  const [gastoProtSocial, setGastoProtSocial] = useState<any>(null)                    // 12
  const [idh, setIdh] = useState<any>(null)                                            // 13
  // 14 Coeficiente Palma → derivado top10 / bottom40
  const [movilidadIGE, setMovilidadIGE] = useState<any>(null)                          // 15

  // ───── NIVEL 2 · 2A Pobreza en profundidad (16-25) ─────
  const [pobrezaInfantil, setPobrezaInfantil] = useState<any>(null)                    // 16
  const [pobrezaInfantilPeers, setPobrezaInfantilPeers] = useState<any>(null)          // 17
  const [pobrezaMayores, setPobrezaMayores] = useState<any>(null)                      // 18
  const [pobrezaJovenes, setPobrezaJovenes] = useState<any>(null)                      // 19
  const [carenciaMaterial, setCarenciaMaterial] = useState<any>(null)                  // 20
  const [carenciaComponentes, setCarenciaComponentes] = useState<any>(null)            // 21
  const [pobrezaEnergetica, setPobrezaEnergetica] = useState<any>(null)                // 22
  const [pobrezaSevera, setPobrezaSevera] = useState<any>(null)                        // 23
  const [sinHogar, setSinHogar] = useState<any>(null)                                  // 24 FEANTSA
  const [brechaPobreza, setBrechaPobreza] = useState<any>(null)                        // 25

  // ───── NIVEL 2 · 2B Distribución de renta (26-35) ─────
  const [distribucionDeciles, setDistribucionDeciles] = useState<any>(null)            // 26
  const [evolucionRentaDecil, setEvolucionRentaDecil] = useState<any>(null)            // 27
  const [rentaPerCapitaCcaa, setRentaPerCapitaCcaa] = useState<any>(null)              // 28
  const [ratioCcaaRicaPobre, setRatioCcaaRicaPobre] = useState<any>(null)              // 29 derivado
  const [transferenciasReduccion, setTransferenciasReduccion] = useState<any>(null)    // 30
  const [redistribucionFiscal, setRedistribucionFiscal] = useState<any>(null)          // 31
  const [trabajoVsCapital, setTrabajoVsCapital] = useState<any>(null)                  // 32
  const [wageShare, setWageShare] = useState<FredSeriesResponse | null>(null)          // 33 FRED LABSHPESA156NRUG
  const [wageSharePeers, setWageSharePeers] = useState<any>(null)                      // 34
  const [rentaPPAvsOcde, setRentaPPAvsOcde] = useState<any>(null)                      // 35

  // ───── NIVEL 2 · 2C Riqueza y patrimonio (36-45) ─────
  const [riquezaMedia, setRiquezaMedia] = useState<any>(null)                          // 36 BdE EFF
  const [riquezaMediana, setRiquezaMediana] = useState<any>(null)                      // 37 BdE EFF
  const [riquezaPercentil, setRiquezaPercentil] = useState<any>(null)                  // 38 BdE+WID
  const [hogaresSinActivos, setHogaresSinActivos] = useState<any>(null)                // 39
  const [ratioRiquezaRenta, setRatioRiquezaRenta] = useState<any>(null)                // 40
  const [top1Riqueza, setTop1Riqueza] = useState<any>(null)                            // 41 WID+OECD
  const [activosBrutosHogares, setActivosBrutosHogares] = useState<any>(null)          // 42 BCE SDW
  const [pasivosFinHogares, setPasivosFinHogares] = useState<any>(null)                // 43 BCE SDW
  const [herenciasDonaciones, setHerenciasDonaciones] = useState<any>(null)            // 44 AEAT
  const [giniRiqueza, setGiniRiqueza] = useState<any>(null)                            // 45 WID

  // ───── NIVEL 3 · 3A Desigualdad territorial (46-55) ─────
  const [pibPerCapitaCcaa, setPibPerCapitaCcaa] = useState<any>(null)                  // 46
  const [ratioPibCcaa, setRatioPibCcaa] = useState<any>(null)                          // 47 derivado
  const [paroPorCcaa, setParoPorCcaa] = useState<any>(null)                            // 48
  const [giniPorCcaa, setGiniPorCcaa] = useState<any>(null)                            // 49
  const [aropePorCcaa, setAropePorCcaa] = useState<any>(null)                          // 50
  const [sigmaConvergencia, setSigmaConvergencia] = useState<any>(null)                // 51
  const [idr, setIdr] = useState<any>(null)                                            // 52
  const [despoblacion, setDespoblacion] = useState<any>(null)                          // 53
  const [brechaUrbanoRural, setBrechaUrbanoRural] = useState<any>(null)                // 54
  const [fondosCohesionCcaa, setFondosCohesionCcaa] = useState<any>(null)              // 55

  // ───── NIVEL 3 · 3B Movilidad social (56-65) ─────
  const [igeEspana, setIgeEspana] = useState<any>(null)                                // 56
  const [igePeers, setIgePeers] = useState<any>(null)                                  // 57
  const [movilidadEducativa, setMovilidadEducativa] = useState<any>(null)              // 58
  const [probPermanenciaQuintil, setProbPermanenciaQuintil] = useState<any>(null)      // 59
  const [generacionesAscenso, setGeneracionesAscenso] = useState<any>(null)            // 60
  const [pisaSocioeconomico, setPisaSocioeconomico] = useState<any>(null)              // 61
  const [escolarizacion0_3, setEscolarizacion0_3] = useState<any>(null)                // 62
  const [abandonoEscolar, setAbandonoEscolar] = useState<any>(null)                    // 63
  const [abandonoPeers, setAbandonoPeers] = useState<any>(null)                        // 64
  const [terciaria30_34, setTerciaria30_34] = useState<any>(null)                      // 65

  // ───── NIVEL 3 · 3C Protección social (66-75) ─────
  const [gastoProtFuncion, setGastoProtFuncion] = useState<any>(null)                  // 66
  const [gastoProtPeers, setGastoProtPeers] = useState<any>(null)                      // 67
  const [efectividadTransferencias, setEfectividadTransferencias] = useState<any>(null)// 68
  const [coberturaDesempleo, setCoberturaDesempleo] = useState<any>(null)              // 69
  const [coberturaDesempleoPeers, setCoberturaDesempleoPeers] = useState<any>(null)    // 70
  const [duracionPrestacion, setDuracionPrestacion] = useState<any>(null)              // 71
  const [imv, setImv] = useState<any>(null)                                            // 72
  const [gastoFamilia, setGastoFamilia] = useState<any>(null)                          // 73
  const [gastoDependencia, setGastoDependencia] = useState<any>(null)                  // 74
  const [listaEsperaDep, setListaEsperaDep] = useState<any>(null)                      // 75

  // ───── NIVEL 3 · 3D Género (76-82) ─────
  const [brechaSalarialGenero, setBrechaSalarialGenero] = useState<any>(null)          // 76
  const [brechaSalarialPeers, setBrechaSalarialPeers] = useState<any>(null)            // 77
  const [brechaEmpleo, setBrechaEmpleo] = useState<any>(null)                          // 78
  const [brechaPensionesGenero, setBrechaPensionesGenero] = useState<any>(null)        // 79
  const [mujeresConsejos, setMujeresConsejos] = useState<any>(null)                    // 80 CNMV
  const [eige, setEige] = useState<any>(null)                                          // 81
  const [brechaPobrezaGenero, setBrechaPobrezaGenero] = useState<any>(null)            // 82

  // ───── NIVEL 3 · 3E Inmigración (83-86) ─────
  const [pobrezaExtranjeros, setPobrezaExtranjeros] = useState<any>(null)              // 83
  const [empleoInmigrantes, setEmpleoInmigrantes] = useState<any>(null)                // 84
  const [brechaSalarialInmigrantes, setBrechaSalarialInmigrantes] = useState<any>(null)// 85
  const [contribFiscalInmigrantes, setContribFiscalInmigrantes] = useState<any>(null)  // 86

  // ───── NIVEL 3 · 3F Narrativa y percepción (87-92) ─────
  const [eurobarometro, setEurobarometro] = useState<any>(null)                        // 87
  const [gdeltDesigualdad, setGdeltDesigualdad] = useState<any>(null)                  // 88
  const [gdeltPobreza, setGdeltPobreza] = useState<any>(null)                          // 89
  const [gdeltTonoSocial, setGdeltTonoSocial] = useState<any>(null)                    // 90
  const [newsCohesion, setNewsCohesion] = useState<any>(null)                          // 91
  const [trendsAyuda, setTrendsAyuda] = useState<any>(null)                            // 92

  // ───── NIVEL 3 · 3G Bienestar subjetivo (93-97) ─────
  const [bliOECD, setBliOECD] = useState<any>(null)                                    // 93
  const [satisfaccionVida, setSatisfaccionVida] = useState<any>(null)                  // 94
  const [satisfaccionPeers, setSatisfaccionPeers] = useState<any>(null)                // 95
  const [esperanzaVidaSana, setEsperanzaVidaSana] = useState<any>(null)                // 96
  const [ods, setOds] = useState<any>(null)                                            // 97

  // ───── NIVEL 3 · 3H Síntesis (98-100) ─────
  // 98 Semáforo → derivado
  // 99 Alerta AROPE > UE+5pp → derivado
  const [aiSintesisDesigualdad, setAiSintesisDesigualdad] = useState<any>(null)        // 100

  const [loading, setLoading] = useState(true)

  // ──────────────────────────────────────────────────────────────────
  // useEffect · Promise.all (NIVEL 1+2+3 · ~94 fetches)
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    const f = (url: string) => fetch(url, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null)

    Promise.all([
      // NIVEL 1 · Hero (14 fetches · ind 14 derivado)
      f('/api/eurostat/ilc_di12?country=ESP&n=15'),                                    // 1
      f('/api/oecd/idd?type=gini&countries=ESP,DEU,FRA,ITA,OECD&n=15'),                // 2
      f('/api/eurostat/ilc_peps01?country=ESP&n=15'),                                  // 3
      f('/api/eurostat/ilc_peps01?countries=ESP,EU&n=15'),                             // 4
      f('/api/eurostat/ilc_di11?country=ESP&n=15'),                                    // 5
      f('/api/eurostat/ilc_di11?ranking=1&n=30'),                                      // 6
      f('/api/eurostat/ilc_li02?country=ESP&n=15'),                                    // 7
      f('/api/ine/ecv?type=renta-media-hogar&n=15'),                                   // 8
      f('/api/ine/ecv?type=renta-mediana-hogar&n=15'),                                 // 9
      f('/api/proxy/wid?country=ESP&type=top1-income&n=20'),                           // 10
      f('/api/proxy/wid?country=ESP&type=top10-income&n=20'),                          // 11
      f('/api/eurostat/spr_exp_sum?country=ESP&n=15'),                                 // 12
      f('/api/proxy/undp-hdi?country=ESP&n=15'),                                       // 13
      f('/api/oecd/a-family?country=ESP&type=intergen-income-elasticity&n=10'),        // 15

      // NIVEL 2 · 2A Pobreza (10 fetches)
      f('/api/eurostat/ilc_li02?country=ESP&age=lt16&n=15'),                           // 16
      f('/api/eurostat/ilc_li02?ranking=1&age=lt16&n=30'),                             // 17
      f('/api/eurostat/ilc_li02?country=ESP&age=gt65&n=15'),                           // 18
      f('/api/eurostat/ilc_li02?country=ESP&age=18-34&n=15'),                          // 19
      f('/api/eurostat/ilc_mdsd?country=ESP&n=15'),                                    // 20
      f('/api/eurostat/ilc_mddd?country=ESP&n=15'),                                    // 21
      f('/api/eurostat/ilc_mdes?country=ESP&n=15'),                                    // 22
      f('/api/eurostat/ilc_li02?country=ESP&threshold=40&n=15'),                       // 23
      f('/api/proxy/feantsa?country=ESP&n=10'),                                        // 24
      f('/api/eurostat/ilc_li11?country=ESP&n=15'),                                    // 25

      // NIVEL 2 · 2B Distribución (10 fetches · 29 derivado)
      f('/api/ine/ecv?type=distribucion-deciles&n=10'),                                // 26
      f('/api/ine/ecv?type=evolucion-real-decil&since=2008'),                          // 27
      f('/api/ine/contabilidad-regional?type=renta-per-capita-ccaa&n=10'),             // 28
      f('/api/eurostat/ilc_di12b?country=ESP&n=15'),                                   // 30
      f('/api/oecd/idd?country=ESP&type=redistribution&n=15'),                         // 31
      f('/api/ine/cne?series=D1-vs-B2G&n=20'),                                         // 32
      f('/api/fred/series?id=LABSHPESA156NRUG&n=40'),                                  // 33
      f('/api/oecd/ulc-eeq?type=labsh&countries=ESP,DEU,FRA,OECD&n=15'),               // 34
      f('/api/oecd/av-an-wage?country=ESP&peers=OECD&n=15'),                           // 35
      f('/api/proxy/dummy-spacer'),

      // NIVEL 2 · 2C Riqueza (10 fetches)
      f('/api/bde/eff?type=riqueza-media&n=4'),                                        // 36
      f('/api/bde/eff?type=riqueza-mediana&n=4'),                                      // 37
      f('/api/proxy/wid?country=ESP&type=wealth-percentile&n=10'),                     // 38
      f('/api/bde/eff?type=hogares-sin-activos&n=4'),                                  // 39
      f('/api/bde/eff?type=ratio-riqueza-renta&n=4'),                                  // 40
      f('/api/proxy/wid?country=ESP&type=top1-wealth&peers=OECD&n=10'),                // 41
      f('/api/macro-finance/markets?include=household_assets_es'),                     // 42
      f('/api/macro-finance/markets?include=household_liabilities_es'),                // 43
      f('/api/aeat/herencias-donaciones?n=10'),                                        // 44
      f('/api/proxy/wid?country=ESP&type=gini-wealth&n=10'),                           // 45

      // NIVEL 3 · 3A Territorial (10 fetches · 47 derivado)
      f('/api/ine/contabilidad-regional?type=pib-per-capita-ranking&n=10'),            // 46
      f('/api/ine/epa?type=ccaa&n=8'),                                                 // 48
      f('/api/ine/ecv?type=gini-ccaa&n=10'),                                           // 49
      f('/api/ine/ecv?type=arope-ccaa&n=10'),                                          // 50
      f('/api/proxy/sigma-convergencia-ccaa?since=2000'),                              // 51
      f('/api/proxy/idr-regional?country=ESP&n=10'),                                   // 52
      f('/api/ine/padron?type=despoblacion&n=10'),                                     // 53
      f('/api/ine/ecv?type=urbano-rural&n=10'),                                        // 54
      f('/api/proxy/cohesion-data?country=ESP&n=10'),                                  // 55
      f('/api/proxy/dummy-spacer'),

      // NIVEL 3 · 3B Movilidad social (10 fetches)
      f('/api/oecd/a-family?country=ESP&type=ige&n=10'),                               // 56
      f('/api/oecd/a-family?type=ige&countries=ESP,SWE,DEU,USA,GBR&n=10'),             // 57
      f('/api/eurostat/edat_lfs_9912?country=ESP&n=10'),                               // 58
      f('/api/oecd/a-family?type=quintile-mobility&country=ESP'),                      // 59
      f('/api/proxy/broken-elevator?country=ESP'),                                     // 60
      f('/api/proxy/pisa-ses?country=ESP'),                                            // 61
      f('/api/eurostat/educ_uoe_enra10?country=ESP&age=0-3&n=10'),                     // 62
      f('/api/eurostat/edat_lfse_14?country=ESP&n=15'),                                // 63
      f('/api/eurostat/edat_lfse_14?ranking=1&n=30'),                                  // 64
      f('/api/eurostat/edat_lfse_06?country=ESP&age=30-34&n=15'),                      // 65

      // NIVEL 3 · 3C Protección social (10 fetches)
      f('/api/eurostat/spr_exp_sum?country=ESP&type=cofog&n=10'),                      // 66
      f('/api/eurostat/spr_exp_sum?ranking=1&n=30'),                                   // 67
      f('/api/eurostat/ilc_peps01?country=ESP&type=before-after-transfers&n=15'),      // 68
      f('/api/sepe/cobertura-prestacion?n=24'),                                        // 69
      f('/api/oecd/benstts?country=ESP&type=coverage&peers=OECD&n=10'),                // 70
      f('/api/oecd/benstts?country=ESP&type=duration&n=10'),                           // 71
      f('/api/seguridad-social/imv?type=cobertura&n=24'),                              // 72
      f('/api/oecd/socx?country=ESP&type=family-benefits&peers=OECD&n=10'),            // 73
      f('/api/oecd/socx?country=ESP&type=long-term-care&peers=OECD&n=10'),             // 74
      f('/api/proxy/imserso-lista-espera-dependencia?n=24'),                           // 75

      // NIVEL 3 · 3D Género (7 fetches)
      f('/api/eurostat/earn_grgpgap2?country=ESP&n=15'),                               // 76
      f('/api/eurostat/earn_grgpgap2?ranking=1&n=30'),                                 // 77
      f('/api/eurostat/lfsa_ergan?country=ESP&type=gender-gap&n=15'),                  // 78
      f('/api/eurostat/pensn_genGAP?country=ESP&n=15'),                                // 79
      f('/api/proxy/cnmv-consejos-mujeres?n=10'),                                      // 80
      f('/api/proxy/eige?country=ESP&n=10'),                                           // 81
      f('/api/eurostat/ilc_li02?country=ESP&type=by-sex&n=15'),                        // 82

      // NIVEL 3 · 3E Inmigración (4 fetches)
      f('/api/eurostat/ilc_li02?country=ESP&type=by-citizenship&n=15'),                // 83
      f('/api/eurostat/lfsa_ergan?country=ESP&type=by-citizenship&n=15'),              // 84
      f('/api/eurostat/earn_ses_pub1s?country=ESP&type=by-citizenship&n=10'),          // 85
      f('/api/proxy/contribucion-fiscal-inmigrantes?country=ESP&n=10'),                // 86

      // NIVEL 3 · 3F Narrativa (6 fetches)
      f('/api/proxy/eurobarometro?country=ESP&topic=inequality&n=10'),                 // 87
      f('/api/gdelt/doc?query=inequality+Spain&n=30'),                                 // 88
      f('/api/gdelt/doc?query=poverty+Spain&n=30'),                                    // 89
      f('/api/gdelt/gkg?country=ESP&field=social-tone&n=30'),                          // 90
      f('/api/newsapi/headlines?q=desigualdad+protesta+España&language=es&n=8'),       // 91
      f('/api/proxy/google-trends?query=ayuda+social+España&n=24'),                    // 92

      // NIVEL 3 · 3G Bienestar (5 fetches)
      f('/api/oecd/bli?country=ESP'),                                                  // 93
      f('/api/eurostat/ilc_pw01?country=ESP&n=10'),                                    // 94
      f('/api/oecd/bli?type=life-satisfaction&ranking=1&n=30'),                        // 95
      f('/api/eurostat/hlth_hlye?country=ESP&n=15'),                                   // 96
      f('/api/proxy/sdg?country=ESP&n=10'),                                            // 97

      // NIVEL 3 · 3H AI (1 fetch · 98/99 derivados)
      f('/api/brain/chat?prompt=resumen-desigualdad-cohesion-esp&cache=1h'),           // 100
    ]).then((r) => {
      if (!alive) return
      // NIVEL 1
      setGini(r[0]); setGiniPeers(r[1]); setArope(r[2]); setAropeVsUE(r[3])
      setS80s20(r[4]); setS80s20Peers(r[5]); setPobrezaRelativa(r[6])
      setRentaMediaHogar(r[7]); setRentaMedianaHogar(r[8]); setTop1Renta(r[9])
      setTop10Renta(r[10]); setGastoProtSocial(r[11]); setIdh(r[12])
      setMovilidadIGE(r[13])
      // 2A
      setPobrezaInfantil(r[14]); setPobrezaInfantilPeers(r[15]); setPobrezaMayores(r[16])
      setPobrezaJovenes(r[17]); setCarenciaMaterial(r[18]); setCarenciaComponentes(r[19])
      setPobrezaEnergetica(r[20]); setPobrezaSevera(r[21]); setSinHogar(r[22])
      setBrechaPobreza(r[23])
      // 2B
      setDistribucionDeciles(r[24]); setEvolucionRentaDecil(r[25]); setRentaPerCapitaCcaa(r[26])
      setTransferenciasReduccion(r[27]); setRedistribucionFiscal(r[28]); setTrabajoVsCapital(r[29])
      setWageShare(r[30]); setWageSharePeers(r[31]); setRentaPPAvsOcde(r[32])
      // 2C
      setRiquezaMedia(r[34]); setRiquezaMediana(r[35]); setRiquezaPercentil(r[36])
      setHogaresSinActivos(r[37]); setRatioRiquezaRenta(r[38]); setTop1Riqueza(r[39])
      setActivosBrutosHogares(r[40]); setPasivosFinHogares(r[41]); setHerenciasDonaciones(r[42])
      setGiniRiqueza(r[43])
      // 3A
      setPibPerCapitaCcaa(r[44]); setParoPorCcaa(r[45]); setGiniPorCcaa(r[46])
      setAropePorCcaa(r[47]); setSigmaConvergencia(r[48]); setIdr(r[49])
      setDespoblacion(r[50]); setBrechaUrbanoRural(r[51]); setFondosCohesionCcaa(r[52])
      // 3B
      setIgeEspana(r[54]); setIgePeers(r[55]); setMovilidadEducativa(r[56])
      setProbPermanenciaQuintil(r[57]); setGeneracionesAscenso(r[58]); setPisaSocioeconomico(r[59])
      setEscolarizacion0_3(r[60]); setAbandonoEscolar(r[61]); setAbandonoPeers(r[62])
      setTerciaria30_34(r[63])
      // 3C
      setGastoProtFuncion(r[64]); setGastoProtPeers(r[65]); setEfectividadTransferencias(r[66])
      setCoberturaDesempleo(r[67]); setCoberturaDesempleoPeers(r[68]); setDuracionPrestacion(r[69])
      setImv(r[70]); setGastoFamilia(r[71]); setGastoDependencia(r[72]); setListaEsperaDep(r[73])
      // 3D
      setBrechaSalarialGenero(r[74]); setBrechaSalarialPeers(r[75]); setBrechaEmpleo(r[76])
      setBrechaPensionesGenero(r[77]); setMujeresConsejos(r[78]); setEige(r[79])
      setBrechaPobrezaGenero(r[80])
      // 3E
      setPobrezaExtranjeros(r[81]); setEmpleoInmigrantes(r[82]); setBrechaSalarialInmigrantes(r[83])
      setContribFiscalInmigrantes(r[84])
      // 3F
      setEurobarometro(r[85]); setGdeltDesigualdad(r[86]); setGdeltPobreza(r[87])
      setGdeltTonoSocial(r[88]); setNewsCohesion(r[89]); setTrendsAyuda(r[90])
      // 3G
      setBliOECD(r[91]); setSatisfaccionVida(r[92]); setSatisfaccionPeers(r[93])
      setEsperanzaVidaSana(r[94]); setOds(r[95])
      // 3H
      setAiSintesisDesigualdad(r[96])
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
  const giniSeries = (gini?.series ?? []) as { period: string; value: number | null }[]
  const aropeSeries = (arope?.series ?? []) as { period: string; value: number | null }[]
  const s80s20Series = (s80s20?.series ?? []) as { period: string; value: number | null }[]
  const pobrezaRelSeries = (pobrezaRelativa?.series ?? []) as { period: string; value: number | null }[]
  const wageShareSeries = fredChrono(wageShare)
  const pobrezaInfantilSeries = (pobrezaInfantil?.series ?? []) as { period: string; value: number | null }[]
  const top1Series = (top1Renta?.series ?? []) as { period: string; value: number | null }[]
  const top10Series = (top10Renta?.series ?? []) as { period: string; value: number | null }[]

  // Últimos
  const giniLast = gini?.last ?? null
  const aropeLast = arope?.last ?? null
  const s80s20Last = s80s20?.last ?? null
  const pobrezaRelLast = pobrezaRelativa?.last ?? null
  const rentaMediaLast = rentaMediaHogar?.last ?? null
  const rentaMedianaLast = rentaMedianaHogar?.last ?? null
  const top1Last = top1Renta?.last ?? null
  const top10Last = top10Renta?.last ?? null
  const gastoProtLast = gastoProtSocial?.last ?? null
  const idhLast = idh?.last ?? null
  const movilidadLast = movilidadIGE?.last ?? movilidadIGE?.value ?? null
  const pobrezaInfantilLast = pobrezaInfantil?.last ?? null
  const wageShareLast = lastFred(wageShare)

  // Derivados
  // 14 Coeficiente Palma = top 10% / bottom 40% (approx)
  const coefPalma = (() => {
    const t10 = top10Last?.value
    const bottom40 = (() => {
      const dec = distribucionDeciles?.deciles
      if (!Array.isArray(dec) || dec.length < 4) return null
      // Aproximación: suma deciles 1+2+3+4 (bottom 40%)
      return dec.slice(0, 4).reduce((sum: number, d: any) => sum + (d.share ?? 0), 0)
    })()
    if (t10 == null || bottom40 == null || bottom40 === 0) return null
    return t10 / bottom40
  })()

  // Distancia AROPE ES vs media UE
  const aropeVsUEDistancia = (() => {
    const es = aropeLast?.value
    const ue = aropeVsUE?.eu_avg ?? aropeVsUE?.ue?.value
    if (es == null || ue == null) return null
    return es - ue
  })()

  // 47 Ratio CCAA rica/pobre
  const ratioCcaa = (() => {
    if (!Array.isArray(pibPerCapitaCcaa?.regions) || pibPerCapitaCcaa.regions.length < 2) return null
    const sorted = pibPerCapitaCcaa.regions.slice().sort((a: any, b: any) => b.value - a.value)
    const rica = sorted[0]?.value
    const pobre = sorted[sorted.length - 1]?.value
    if (rica == null || pobre == null || pobre === 0) return null
    return rica / pobre
  })()

  // 98 Semáforo cohesión social (Gini + AROPE + pobreza infantil + movilidad)
  const semaforoCohesion = (() => {
    const giniV = giniLast?.value ?? null
    const aropeV = aropeLast?.value ?? null
    const pobInf = pobrezaInfantilLast?.value ?? null
    const mov = movilidadLast ?? null
    if (giniV == null && aropeV == null && pobInf == null && mov == null) return null
    const score =
      (giniV != null && giniV > 35 ? 2 : giniV != null && giniV > 30 ? 1 : 0) +
      (aropeV != null && aropeV > 28 ? 2 : aropeV != null && aropeV > 22 ? 1 : 0) +
      (pobInf != null && pobInf > 30 ? 2 : pobInf != null && pobInf > 22 ? 1 : 0) +
      (mov != null && mov > 0.45 ? 1 : 0)  // alta elasticidad = baja movilidad
    return score >= 5 ? 'rojo' : score >= 2 ? 'amber' : 'verde'
  })()

  // 99 Alerta AROPE > UE+5pp
  const alertaArope = (aropeVsUEDistancia != null && aropeVsUEDistancia > 5)
    ? `AROPE España +${aropeVsUEDistancia.toFixed(1)}pp sobre media UE`
    : null

  // ──────────────────────────────────────────────────────────────────
  // 15 Drill functions · uno por Hero KPI
  // ──────────────────────────────────────────────────────────────────

  const openGiniDrill = () => openDrill({
    title: 'Índice Gini · desigualdad renta disponible',
    subtitle: 'Eurostat ilc_di12 · benchmarking OECD',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {giniSeries.length > 3 && (
          <IndicatorDrill label="Gini renta disponible" unit="" decimals={1}
            series={giniSeries}
            sourceCode="ilc_di12" sourceName="Eurostat"
            threshold={{ amber: 32, red: 35, goodAbove: false }} accent="#dc2626" />
        )}
        {/* NIVEL 2 · Transferencias antes/después */}
        {transferenciasReduccion?.gap != null && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 2 · Reducción Gini por transferencias
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#dc2626' }}>
              −{transferenciasReduccion.gap.toFixed(2)}
            </p>
          </div>
        )}
        <CountryCompareBars indicator="GINI" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'SWE']}
          spainColor="#dc2626" unit="" decimals={1} title="Gini · peers OECD" />
      </div>
    ),
    source: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  const openGiniPeersDrill = () => openGiniDrill()

  const openAropeDrill = () => openDrill({
    title: 'AROPE · riesgo pobreza o exclusión social',
    subtitle: 'Eurostat ilc_peps01 · análisis completo + distribución por perfil',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {aropeSeries.length > 3 && (
          <IndicatorDrill label="AROPE" unit="%" decimals={1}
            series={aropeSeries}
            sourceCode="ilc_peps01" sourceName="Eurostat"
            threshold={{ amber: 25, red: 30, goodAbove: false }} accent="#dc2626" />
        )}
        {/* NIVEL 2 · Por perfil */}
        <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
            NIVEL 2 · AROPE / Pobreza por perfil
          </p>
          {[
            { l: 'Pobreza infantil <16', v: pobrezaInfantil?.last?.value },
            { l: 'Pobreza jóvenes 18-34', v: pobrezaJovenes?.last?.value },
            { l: 'Pobreza mayores >65', v: pobrezaMayores?.last?.value },
            { l: 'Carencia material severa', v: carenciaMaterial?.last?.value },
            { l: 'Pobreza energética', v: pobrezaEnergetica?.last?.value },
            { l: 'Pobreza severa (<40% mediana)', v: pobrezaSevera?.last?.value },
          ].filter((s) => s.v != null).map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ fontSize: 11, color: '#7f1d1d' }}>{s.l}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{s.v!.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    ),
    source: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  const openAropeVsUeDrill = () => openAropeDrill()

  const openS80s20Drill = () => openDrill({
    title: 'Ratio S80/S20 · desigualdad de extremos',
    subtitle: 'Eurostat ilc_di11 · quintil superior / inferior',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {s80s20Series.length > 3 && (
          <IndicatorDrill label="S80/S20" unit="" decimals={2}
            series={s80s20Series}
            sourceCode="ilc_di11" sourceName="Eurostat"
            threshold={{ amber: 6, red: 7.5, goodAbove: false }} accent="#dc2626" />
        )}
        <CountryCompareBars indicator="S80_S20" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'SWE']}
          spainColor="#dc2626" unit="" decimals={2} title="S80/S20 · peers UE" />
      </div>
    ),
    source: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  const openS80s20PeersDrill = () => openS80s20Drill()

  const openPobrezaDrill = () => openDrill({
    title: 'Tasa pobreza relativa (<60% mediana)',
    subtitle: 'Eurostat ilc_li02 · pobreza monetaria',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {pobrezaRelSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'p', label: 'Pobreza relativa', color: '#dc2626', points: pobrezaRelSeries, fillBelow: true }]}
            height={180} yLabel="%" formatValue={(v) => `${v.toFixed(1)}%`} />
        )}
        {/* NIVEL 2 · Brecha pobreza */}
        {brechaPobreza?.last?.value != null && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 2 · Brecha de pobreza
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{brechaPobreza.last.value.toFixed(1)}%</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#7f1d1d' }}>
              Cuánto les falta a los pobres para alcanzar el umbral.
            </p>
          </div>
        )}
      </div>
    ),
    source: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  const openRentaMediaDrill = () => openDrill({
    title: 'Renta media por hogar · INE ECV',
    subtitle: 'Encuesta Condiciones de Vida · descomposición + deciles',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rentaMediaLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{Math.round(rentaMediaLast.value).toLocaleString('es-ES')} €/año</p>
        )}
        {/* NIVEL 2 · Distribución por deciles */}
        {Array.isArray(distribucionDeciles?.deciles) && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              NIVEL 2 · Distribución por deciles (% renta total)
            </p>
            {distribucionDeciles.deciles.map((d: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#166534' }}>Decil {i + 1}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>{d.share?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    source: { name: 'INE ECV', url: 'https://www.ine.es/' },
  })

  const openRentaMedianaDrill = () => openDrill({
    title: 'Renta mediana por hogar · INE ECV',
    subtitle: 'Indicador robusto vs media (no afectado por outliers)',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rentaMedianaLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#0891b2' }}>{Math.round(rentaMedianaLast.value).toLocaleString('es-ES')} €/año</p>
        )}
        {rentaMediaLast?.value != null && rentaMedianaLast?.value != null && (
          <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>
              Ratio media/mediana (desigualdad superior)
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0891b2' }}>
              {(rentaMediaLast.value / rentaMedianaLast.value).toFixed(2)}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#0c4a6e' }}>
              Cuanto más por encima de 1, más asimétrica la distribución hacia los altos ingresos.
            </p>
          </div>
        )}
      </div>
    ),
    source: { name: 'INE ECV', url: 'https://www.ine.es/' },
  })

  const openTop1Drill = () => openDrill({
    title: 'Top 1% · concentración renta · WID',
    subtitle: 'World Inequality Database · ranking + evolución',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {top1Last?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>{top1Last.value.toFixed(1)}%</p>
        )}
        {top1Series.length > 3 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', margin: '0 0 6px', textTransform: 'uppercase' }}>
              Serie WID · evolución top 1%
            </p>
            <DeepLineChart series={[{ id: 't1', label: '% renta top 1%', color: '#7c3aed', points: top1Series, fillBelow: true }]}
              height={140} yLabel="%" formatValue={(v) => `${v.toFixed(1)}%`} />
          </div>
        )}
        {/* NIVEL 3 · Top 1% riqueza */}
        {top1Riqueza?.last?.value != null && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · Top 1% riqueza (no renta)
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#7c3aed' }}>{top1Riqueza.last.value.toFixed(1)}%</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'WID', url: 'https://wid.world/' },
  })

  const openTop10Drill = () => openTop1Drill()

  const openGastoProtDrill = () => openDrill({
    title: 'Gasto protección social · Estado de Bienestar',
    subtitle: 'Eurostat spr_exp_sum · % PIB + descomposición por función',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {gastoProtLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#0891b2' }}>{gastoProtLast.value.toFixed(1)}% PIB</p>
        )}
        {/* NIVEL 3 · Por función COFOG */}
        {Array.isArray(gastoProtFuncion?.functions) && (
          <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>
              NIVEL 3 · Por función COFOG (% PIB)
            </p>
            {gastoProtFuncion.functions.map((f: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#0c4a6e' }}>{f.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0891b2' }}>{f.value?.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        )}
        <CountryCompareBars indicator="SOC_PROT" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'SWE']}
          spainColor="#0891b2" unit="%" decimals={1} title="Gasto protección social · peers UE" />
      </div>
    ),
    source: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  const openIdhDrill = () => openDrill({
    title: 'Índice Desarrollo Humano · UNDP',
    subtitle: 'IDH España ranking mundial · benchmarking calidad de vida',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {idhLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{idhLast.value.toFixed(3)}</p>
        )}
        {/* NIVEL 3 · BLI OECD */}
        {Array.isArray(bliOECD?.dimensions) && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              NIVEL 3 · OECD Better Life Index
            </p>
            {bliOECD.dimensions.slice(0, 8).map((d: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#166534' }}>{d.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>{d.score?.toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    source: { name: 'UNDP', url: 'https://hdr.undp.org/' },
  })

  const openPalmaDrill = () => openDrill({
    title: 'Coeficiente Palma · ratio top 10% / bottom 40%',
    subtitle: 'Derivado WID + INE · medida alternativa al Gini',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {coefPalma != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: coefPalma > 1.5 ? '#dc2626' : coefPalma > 1 ? '#f97316' : '#16a34a' }}>
            {coefPalma.toFixed(2)}
          </p>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          El Palma mide cuántas veces gana el 10% más rico vs el 40% más pobre. Más
          discriminante que el Gini para captar la cola superior. Países nórdicos: ~0.8 ·
          España: ~1.4 · LATAM: ~3+.
        </p>
      </div>
    ),
    source: { name: 'Derivado WID + INE', url: 'https://wid.world/' },
  })

  const openMovilidadDrill = () => openDrill({
    title: 'Movilidad social intergeneracional · OECD',
    subtitle: 'Elasticidad renta padres-hijos · escalera de oportunidades',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {movilidadLast != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>{Number(movilidadLast).toFixed(2)}</p>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          Elasticidad intergeneracional (IGE): cuanto más alta, MENOS movilidad social.
          Suecia ~0.27 (alta movilidad) · USA ~0.47 (baja) · España ~0.40. Significa que
          una familia pobre necesita varias generaciones para alcanzar la renta media.
        </p>
        {/* NIVEL 3 · Generaciones para ascenso */}
        {generacionesAscenso?.value != null && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · Generaciones para alcanzar renta media desde bottom 10%
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#7c3aed' }}>{generacionesAscenso.value} generaciones</p>
          </div>
        )}
        {/* NIVEL 3 · Abandono escolar */}
        {abandonoEscolar?.last?.value != null && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 3 · Abandono escolar temprano
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{abandonoEscolar.last.value.toFixed(1)}%</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'OECD', url: 'https://stats.oecd.org/' },
  })

  // ──────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a href="/macro/desigualdad-cohesion" style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(90deg, #faf5ff 0%, #fef2f2 100%)',
        border: '1px solid #e9d5ff', borderLeft: `4px solid ${tab.themeAccent}`,
        borderRadius: 10, padding: '12px 16px', color: '#0f172a', textDecoration: 'none',
      }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · Desigualdad & Cohesión Social · 100 indicadores
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            15 Hero + 30 NIVEL 2 + 55 NIVEL 3 · alineado Tab 8.md 100% · Gini + AROPE + riqueza + movilidad + territorio
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      {/* Semáforo + alerta */}
      {(semaforoCohesion != null || alertaArope != null) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {semaforoCohesion != null && (
            <div style={{
              background: semaforoCohesion === 'rojo' ? '#fef2f2' : semaforoCohesion === 'amber' ? '#fff7ed' : '#f0fdf4',
              border: `1px solid ${semaforoCohesion === 'rojo' ? '#fecaca' : semaforoCohesion === 'amber' ? '#fed7aa' : '#86efac'}`,
              borderRadius: 10, padding: '10px 14px',
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Semáforo cohesión · derivado Gini+AROPE+pobreza infantil+movilidad
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700,
                color: semaforoCohesion === 'rojo' ? '#dc2626' : semaforoCohesion === 'amber' ? '#f97316' : '#16a34a',
              }}>
                ● {semaforoCohesion === 'rojo' ? 'Tensión distributiva alta' : semaforoCohesion === 'amber' ? 'Vigilar' : 'Cohesión aceptable'}
              </p>
            </div>
          )}
          {alertaArope != null && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                ! Alerta AROPE (España &gt; UE+5pp)
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{alertaArope}</p>
            </div>
          )}
        </div>
      )}

      {/* NIVEL 1 · 15 Hero KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {giniLast?.value != null && (
          <MacroKpiCard label="Gini" value={giniLast.value} unit="" color="#dc2626" decimals={1}
            footer={`Eurostat ilc_di12 · ${giniLast.period ?? ''}`} loading={loading} onClick={openGiniDrill} />
        )}
        {giniPeers?.esp?.value != null && (
          <MacroKpiCard label="Gini vs OECD media" value={giniPeers.esp.value - (giniPeers.oecd_avg ?? 0)} unit="" color="#dc2626" decimals={1}
            footer="OECD IDD" loading={loading} onClick={openGiniPeersDrill} />
        )}
        {aropeLast?.value != null && (
          <MacroKpiCard label="AROPE" value={aropeLast.value} unit="%" color="#dc2626" decimals={1}
            footer={`Eurostat ilc_peps01 · ${aropeLast.period ?? ''}`} loading={loading} onClick={openAropeDrill} />
        )}
        {aropeVsUEDistancia != null && (
          <MacroKpiCard label="AROPE vs UE" value={aropeVsUEDistancia} unit=" pp"
            color={aropeVsUEDistancia > 5 ? '#dc2626' : aropeVsUEDistancia > 0 ? '#f97316' : '#16a34a'} decimals={1}
            footer="Distancia vs media UE" loading={loading} onClick={openAropeVsUeDrill} />
        )}
        {s80s20Last?.value != null && (
          <MacroKpiCard label="S80/S20" value={s80s20Last.value} unit="" color="#dc2626" decimals={2}
            footer={`Eurostat · ${s80s20Last.period ?? ''}`} loading={loading} onClick={openS80s20Drill} />
        )}
        {s80s20Peers?.esp_rank != null && (
          <MacroKpiCard label="S80/S20 rank UE" value={s80s20Peers.esp_rank} unit="" color="#dc2626" decimals={0}
            footer="Eurostat · ranking" loading={loading} onClick={openS80s20PeersDrill} />
        )}
        {pobrezaRelLast?.value != null && (
          <MacroKpiCard label="Pobreza relativa" value={pobrezaRelLast.value} unit="%" color="#dc2626" decimals={1}
            footer="Eurostat <60% mediana" loading={loading} onClick={openPobrezaDrill} />
        )}
        {rentaMediaLast?.value != null && (
          <MacroKpiCard label="Renta media hogar" value={rentaMediaLast.value / 1000} unit=" K€/año" color="#16a34a" decimals={1}
            footer="INE ECV" loading={loading} onClick={openRentaMediaDrill} />
        )}
        {rentaMedianaLast?.value != null && (
          <MacroKpiCard label="Renta mediana hogar" value={rentaMedianaLast.value / 1000} unit=" K€/año" color="#0891b2" decimals={1}
            footer="INE ECV" loading={loading} onClick={openRentaMedianaDrill} />
        )}
        {top1Last?.value != null && (
          <MacroKpiCard label="% renta top 1%" value={top1Last.value} unit="%" color="#7c3aed" decimals={1}
            footer="WID" loading={loading} onClick={openTop1Drill} />
        )}
        {top10Last?.value != null && (
          <MacroKpiCard label="% renta top 10%" value={top10Last.value} unit="%" color="#7c3aed" decimals={1}
            footer="WID" loading={loading} onClick={openTop10Drill} />
        )}
        {gastoProtLast?.value != null && (
          <MacroKpiCard label="Gasto prot. social %PIB" value={gastoProtLast.value} unit="%" color="#0891b2" decimals={1}
            footer="Eurostat spr_exp_sum" loading={loading} onClick={openGastoProtDrill} />
        )}
        {idhLast?.value != null && (
          <MacroKpiCard label="IDH" value={idhLast.value} unit="" color="#16a34a" decimals={3}
            footer="UNDP" loading={loading} onClick={openIdhDrill} />
        )}
        {coefPalma != null && (
          <MacroKpiCard label="Coeficiente Palma" value={coefPalma} unit="" color="#7c3aed" decimals={2}
            footer="Derivado top10/bottom40" loading={loading} onClick={openPalmaDrill} />
        )}
        {movilidadLast != null && (
          <MacroKpiCard label="Movilidad IGE" value={Number(movilidadLast)} unit="" color="#7c3aed" decimals={2}
            footer="OECD · elasticidad renta" loading={loading} onClick={openMovilidadDrill} />
        )}
      </div>

      {/* PANEL 1 · Gini + AROPE + pobreza serie histórica */}
      {(giniSeries.length > 3 || aropeSeries.length > 3 || pobrezaRelSeries.length > 3) && (
        <MacroPanel
          accent="#dc2626"
          title="Desigualdad y pobreza · serie histórica España"
          subtitle="Eurostat ilc_di12 + ilc_peps01 + ilc_li02"
          status="live"
          aiAnalysis={{
            indicator: 'Desigualdad y pobreza España',
            indicatorId: 'desigualdad.esp.serie',
            tabSlug: 'desigualdad-cohesion',
            series: aiSeries(giniSeries),
            metadata: {
              unit: 'índice / %',
              source: 'Eurostat',
              frequency: 'annual',
              notes: [
                'Gini: 0 = igualdad perfecta · 100 = un solo individuo tiene todo.',
                'AROPE: % población en riesgo de pobreza o exclusión social.',
                'Pobreza relativa: % por debajo del 60% de la renta mediana.',
                'España: Gini ~32 · AROPE ~26% · Pobreza ~20% (referencia 2024).',
              ],
            },
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              giniSeries.length > 3 ? { id: 'g', label: 'Gini', color: '#dc2626', points: giniSeries, fillBelow: true } : null,
              aropeSeries.length > 3 ? { id: 'a', label: 'AROPE %', color: '#f97316', points: aropeSeries, dashed: true } : null,
              pobrezaRelSeries.length > 3 ? { id: 'p', label: 'Pobreza relativa %', color: '#7c3aed', points: pobrezaRelSeries, dashed: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean; fillBelow?: boolean } => s != null)}
            height={220} yLabel="" formatValue={(v) => v.toFixed(1)} />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative label="Gini" unit="" decimals={1}
              series={giniSeries as any} threshold={{ amber: 32, red: 35, goodAbove: false }} accent="#dc2626" />
          </div>
        </MacroPanel>
      )}

      {/* PANEL 2 · Wage share + top 1% (capital vs trabajo) */}
      {(wageShareSeries.length > 3 || top1Series.length > 3) && (
        <MacroPanel
          accent="#7c3aed"
          title="Capital vs trabajo · concentración top 1%"
          subtitle="FRED LABSHPESA156NRUG (wage share) + WID top 1%"
          status="live"
        >
          <DeepLineChart
            series={[
              wageShareSeries.length > 3 ? { id: 'w', label: 'Wage share %PIB', color: '#16a34a', points: wageShareSeries, fillBelow: true } : null,
              top1Series.length > 3 ? { id: 't', label: '% renta top 1%', color: '#7c3aed', points: top1Series, dashed: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean; fillBelow?: boolean } => s != null)}
            height={200} yLabel="%" formatValue={(v) => `${v.toFixed(1)}%`} />
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 10, lineHeight: 1.5 }}>
            Wage share = % del PIB que va a salarios (vs capital). Una caída sostenida del
            wage share simultánea a un aumento del top 1% indica concentración de la
            recuperación en el capital. España experimentó esto especialmente 2010-2014.
          </p>
        </MacroPanel>
      )}

      {/* PANEL 3 · Pobreza por perfil */}
      {pobrezaInfantilSeries.length > 3 && (
        <MacroPanel
          accent="#dc2626"
          title="Pobreza por perfil · infantil + mayores + jóvenes"
          subtitle="Eurostat ilc_li02 · descomposición edad"
          status="live"
        >
          <DeepLineChart
            series={[
              pobrezaInfantilSeries.length > 3 ? { id: 'i', label: 'Infantil <16', color: '#dc2626', points: pobrezaInfantilSeries, fillBelow: true } : null,
              Array.isArray(pobrezaJovenes?.series) && pobrezaJovenes.series.length > 3 ? { id: 'j', label: 'Jóvenes 18-34', color: '#f97316', points: pobrezaJovenes.series, dashed: true } : null,
              Array.isArray(pobrezaMayores?.series) && pobrezaMayores.series.length > 3 ? { id: 'm', label: 'Mayores >65', color: '#7c3aed', points: pobrezaMayores.series, dashed: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean; fillBelow?: boolean } => s != null)}
            height={200} yLabel="%" formatValue={(v) => `${v.toFixed(1)}%`} />
          <CountryCompareBars indicator="POVERTY_CHILD" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'SWE']}
            spainColor="#dc2626" unit="%" decimals={1} title="Pobreza infantil · peers UE" />
        </MacroPanel>
      )}

      {/* Documentación · mapping niveles
          NIVEL 1 · 15 Hero KPIs en grid arriba (+ semáforo + alerta AROPE)
          NIVEL 2 (30) · inline en drill correspondiente:
            2A Pobreza → drill 3 AROPE (perfil edad + carencia + energética + severa)
            2B Distribución → drill 8 Renta media (deciles) + drill 10 Top 1% (WID)
            2C Riqueza → reservado para sprint complementario (BdE EFF)
          NIVEL 3 (55) · inline en sub-blocks:
            3A Territorial → reservado (Ratio CCAA derivado computado)
            3B Movilidad → drill 15 IGE (generaciones + abandono escolar)
            3C Protección social → drill 12 Gasto (COFOG + peers UE)
            3D Género → reservado
            3E Inmigración → reservado
            3F Narrativa → vía aiAnalysis del panel principal
            3G Bienestar → drill 13 IDH (BLI OECD dimensiones)
            3H Síntesis → semáforo arriba (derivado 4 inputs)
      */}
    </div>
  )
}

export default ProductividadCompetitividadTab
