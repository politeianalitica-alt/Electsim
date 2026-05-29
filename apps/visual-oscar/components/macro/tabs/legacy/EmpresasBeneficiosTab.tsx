'use client'
/**
 * `<EmpresasBeneficiosTab />` · Tab 9 · ECONOMÍA POLÍTICA PROFUNDA.
 *
 * NOTA · El componente sigue exportándose con el nombre legacy
 * `EmpresasBeneficiosTab` para no romper imports. En la NUEVA
 * taxonomía económica de 15 tabs el slot Tab 9 ya no es
 * "Empresas & beneficios" sino "Economía Política".
 * El renombrado del fichero y del export se hará en sprint futuro
 * sin afectar rutas.
 *
 * Alineado al 100% con `Tab 9.md` · 100 indicadores en 3 niveles.
 * Esta tab es la más diferenciadora de Politeia respecto a Bloomberg
 * o Reuters · ninguna terminal tiene esto: ciclo político-económico,
 * economía electoral, captura regulatoria, calidad institucional,
 * gasto político discrecional y la narrativa económica como
 * instrumento de poder.
 *
 *   NIVEL 1 · Hero (15 KPIs):
 *     1.  Días hasta próximas elecciones        · BOE + calendario
 *     2.  EPU España                            · scraper público
 *     3.  EPU serie histórica vs ciclo electoral · scraper
 *     4.  Volumen cobertura económica           · GDELT
 *     5.  Tono mediático economía               · GDELT GKG
 *     6.  WGI compuesto                         · World Bank
 *     7.  TI CPI corrupción                     · scraper TI
 *     8.  Gasto público discrecional %PIB       · IGAE + Eurostat
 *     9.  Rule of Law WJP                       · scraper
 *     10. Inversión pública año electoral vs no · INE + IGAE
 *     11. V-Dem democracia liberal              · V-Dem API
 *     12. V-Dem rule of law (v2x_rule)          · V-Dem
 *     13. Fragmentación parlamentaria (ENP)     · BD Politeia
 *     14. Coste formar gobierno (días)          · BD Politeia
 *     15. Riesgo político agregado (derivado)   · EPU+CPI+WGI+VDem
 *
 *   NIVEL 2 · Detalle (30 indicadores):
 *     2A · Ciclo político-económico (16-25)
 *     2B · Economía electoral · voto económico (26-35)
 *     2C · Calidad institucional (36-45)
 *
 *   NIVEL 3 · Detalle del detalle (55 indicadores):
 *     3A · V-Dem democracia en profundidad (46-55)
 *     3B · Captura regulatoria y lobbying (56-63)
 *     3C · Gasto político y clientelismo (64-70)
 *     3D · Narrativa económica política (71-80)
 *     3E · Comparativa internacional calidad institucional (81-88)
 *     3F · Economía política UE (89-94)
 *     3G · Síntesis ejecutiva (95-100)
 *
 * REGLA · si endpoint devuelve null/error → panel/bloque NO se renderiza.
 * Frontend ciego para fuentes que el backend no expone aún (V-Dem API,
 * EPU scraper, TI, WJP, RSF, Freedom House, EIU, Eurobarómetro, OGP,
 * GRECO, PLACE, PRTR, BD Politeia electoral).
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

export function EmpresasBeneficiosTab() {
  const tab = getTab('empresas-beneficios')
  const { openDrill } = useMacroDrawer()

  // ───── NIVEL 1 · Hero · 15 indicadores ─────
  const [diasProximasElecc, setDiasProximasElecc] = useState<any>(null)              // 1
  const [epu, setEpu] = useState<any>(null)                                          // 2
  const [epuHistorico, setEpuHistorico] = useState<any>(null)                        // 3
  const [coberturaEcon, setCoberturaEcon] = useState<any>(null)                      // 4 GDELT volumen
  const [tonoEcon, setTonoEcon] = useState<any>(null)                                // 5 GDELT GKG tone
  const [wgiCompuesto, setWgiCompuesto] = useState<any>(null)                        // 6 World Bank
  const [tiCpi, setTiCpi] = useState<any>(null)                                      // 7 TI
  const [gastoDiscrecional, setGastoDiscrecional] = useState<any>(null)              // 8 IGAE + Eurostat
  const [wjpRuleOfLaw, setWjpRuleOfLaw] = useState<any>(null)                        // 9 WJP
  const [inversionAnioElectoral, setInversionAnioElectoral] = useState<any>(null)    // 10 INE + IGAE
  const [vdemLibdem, setVdemLibdem] = useState<any>(null)                            // 11 V-Dem
  const [vdemRule, setVdemRule] = useState<any>(null)                                // 12 V-Dem v2x_rule
  const [enpParlamento, setEnpParlamento] = useState<any>(null)                      // 13 BD Politeia ENP
  const [costeFormarGob, setCosteFormarGob] = useState<any>(null)                    // 14 BD Politeia
  // 15 Riesgo político agregado → derivado

  // ───── NIVEL 2 · 2A Ciclo político-económico (16-25) ─────
  const [gastoVarElectoral, setGastoVarElectoral] = useState<any>(null)              // 16
  const [deficitElectoral, setDeficitElectoral] = useState<any>(null)                // 17
  const [fbcfPicoPreelec, setFbcfPicoPreelec] = useState<any>(null)                  // 18
  const [contratacionPreelec, setContratacionPreelec] = useState<any>(null)          // 19
  const [smiTimingElectoral, setSmiTimingElectoral] = useState<any>(null)            // 20
  const [empleoPublicoElec, setEmpleoPublicoElec] = useState<any>(null)              // 21
  const [transferenciasExtra, setTransferenciasExtra] = useState<any>(null)          // 22
  const [presionFiscalPreelec, setPresionFiscalPreelec] = useState<any>(null)        // 23
  const [anunciosInversion, setAnunciosInversion] = useState<any>(null)              // 24
  const [correlacionPibVoto, setCorrelacionPibVoto] = useState<any>(null)            // 25

  // ───── NIVEL 2 · 2B Economía electoral (26-35) ─────
  const [nowcastVotoEconomico, setNowcastVotoEconomico] = useState<any>(null)        // 26
  const [correlacionParoVoto, setCorrelacionParoVoto] = useState<any>(null)          // 27
  const [correlacionIpcVoto, setCorrelacionIpcVoto] = useState<any>(null)            // 28
  const [salarioRealElectoral, setSalarioRealElectoral] = useState<any>(null)        // 29
  const [sociotropicVsPocketbook, setSociotropicVsPocketbook] = useState<any>(null)  // 30
  const [miseryIndex, setMiseryIndex] = useState<FredSeriesResponse | null>(null)    // 31
  const [miseryPeers, setMiseryPeers] = useState<any>(null)                          // 32
  const [termoElectoralEcon, setTermoElectoralEcon] = useState<any>(null)            // 33
  const [ciclolBexElectoral, setCicloIbexElectoral] = useState<any>(null)            // 34
  const [primaInvestidura, setPrimaInvestidura] = useState<any>(null)                // 35

  // ───── NIVEL 2 · 2C Calidad institucional (36-45) ─────
  const [wgiCorrupcion, setWgiCorrupcion] = useState<any>(null)                      // 36 CC.EST
  const [wgiEfectividad, setWgiEfectividad] = useState<any>(null)                    // 37 GE.EST
  const [wgiEstabilidad, setWgiEstabilidad] = useState<any>(null)                    // 38 PV.EST
  const [wgiCalRegulatoria, setWgiCalRegulatoria] = useState<any>(null)              // 39 RQ.EST
  const [wgiVoiceAcc, setWgiVoiceAcc] = useState<any>(null)                          // 40 VA.EST
  const [wgiRuleOfLawHist, setWgiRuleOfLawHist] = useState<any>(null)                // 41 RL.EST
  const [wgiRadar, setWgiRadar] = useState<any>(null)                                // 42 derivado 6 dims
  const [openBudget, setOpenBudget] = useState<any>(null)                            // 43 IBP
  const [percepDemocracia, setPercepDemocracia] = useState<any>(null)                // 44 Eurobarómetro
  const [confianzaInstit, setConfianzaInstit] = useState<any>(null)                  // 45 Eurobarómetro

  // ───── NIVEL 3 · 3A V-Dem profundidad (46-55) ─────
  const [vdemLibdemHist, setVdemLibdemHist] = useState<any>(null)                    // 46
  const [vdemPolyarchy, setVdemPolyarchy] = useState<any>(null)                      // 47
  const [vdemParticipatory, setVdemParticipatory] = useState<any>(null)              // 48
  const [vdemDeliberative, setVdemDeliberative] = useState<any>(null)                // 49
  const [vdemEgalitarian, setVdemEgalitarian] = useState<any>(null)                  // 50
  const [vdemPeers, setVdemPeers] = useState<any>(null)                              // 51
  const [vdemTendencia10y, setVdemTendencia10y] = useState<any>(null)                // 52
  const [vdemJudicial, setVdemJudicial] = useState<any>(null)                        // 53 v2juhcind
  const [vdemMedios, setVdemMedios] = useState<any>(null)                            // 54 v2mecenefm
  const [vdemRuleHist, setVdemRuleHist] = useState<any>(null)                        // 55 v2x_rule

  // ───── NIVEL 3 · 3B Captura regulatoria (56-63) ─────
  const [registroLobistas, setRegistroLobistas] = useState<any>(null)                // 56
  const [reunionesAltosCargos, setReunionesAltosCargos] = useState<any>(null)        // 57
  const [puertasGiratorias, setPuertasGiratorias] = useState<any>(null)              // 58
  const [litigiosidadRegulatoria, setLitigiosidadRegulatoria] = useState<any>(null)  // 59
  const [indiceCapturaProxy, setIndiceCapturaProxy] = useState<any>(null)            // 60
  const [costeRegulatorio, setCosteRegulatorio] = useState<any>(null)                // 61 OECD RIA
  const [densidadRegulatoria, setDensidadRegulatoria] = useState<any>(null)          // 62 BOE
  const [normasImpacto, setNormasImpacto] = useState<any>(null)                      // 63

  // ───── NIVEL 3 · 3C Gasto político (64-70) ─────
  const [subvencionesPartidos, setSubvencionesPartidos] = useState<any>(null)        // 64
  const [financiacionMedios, setFinanciacionMedios] = useState<any>(null)            // 65
  const [empleoPublicoCcaa, setEmpleoPublicoCcaa] = useState<any>(null)              // 66
  const [contratoSinConcurrencia, setContratoSinConcurrencia] = useState<any>(null)  // 67
  const [contratosMenores, setContratosMenores] = useState<any>(null)                // 68
  const [fondosUeCcaa, setFondosUeCcaa] = useState<any>(null)                        // 69
  const [prtrEjecucion, setPrtrEjecucion] = useState<any>(null)                      // 70

  // ───── NIVEL 3 · 3D Narrativa económica política (71-80) ─────
  const [framesGDELT, setFramesGDELT] = useState<any>(null)                          // 71
  const [crisisMencionesGDELT, setCrisisMencionesGDELT] = useState<any>(null)        // 72
  const [reformasTrending, setReformasTrending] = useState<any>(null)                // 73
  const [tonoGobiernoGDELT, setTonoGobiernoGDELT] = useState<any>(null)              // 74
  const [corrupcionPoliticaGDELT, setCorrupcionPoliticaGDELT] = useState<any>(null)  // 75
  const [newsEconPolitica, setNewsEconPolitica] = useState<any>(null)                // 76
  const [newsPresupuestos, setNewsPresupuestos] = useState<any>(null)                // 77
  const [tonoDiscursoMoncloa, setTonoDiscursoMoncloa] = useState<any>(null)          // 78
  const [diferencialTonoOpos, setDiferencialTonoOpos] = useState<any>(null)          // 79
  const [epuComponentes, setEpuComponentes] = useState<any>(null)                    // 80

  // ───── NIVEL 3 · 3E Comparativa internacional (81-88) ─────
  const [wgiPeers6Pais, setWgiPeers6Pais] = useState<any>(null)                      // 81
  const [tiCpiRankingOECD, setTiCpiRankingOECD] = useState<any>(null)                // 82
  const [wjpRanking, setWjpRanking] = useState<any>(null)                            // 83
  const [freedomHouse, setFreedomHouse] = useState<any>(null)                        // 84
  const [eiuDemocracy, setEiuDemocracy] = useState<any>(null)                        // 85
  const [rsfPressFreedom, setRsfPressFreedom] = useState<any>(null)                  // 86
  const [ogpCompromisos, setOgpCompromisos] = useState<any>(null)                    // 87
  const [grecoEvaluacion, setGrecoEvaluacion] = useState<any>(null)                  // 88

  // ───── NIVEL 3 · 3F Economía política UE (89-94) ─────
  const [pesoVotacionesUE, setPesoVotacionesUE] = useState<any>(null)                // 89
  const [balanceNetoUE, setBalanceNetoUE] = useState<any>(null)                      // 90
  const [fondosUEPctPIB, setFondosUEPctPIB] = useState<any>(null)                    // 91
  const [cumplimientoCSRs, setCumplimientoCSRs] = useState<any>(null)                // 92
  const [infraccionesActivas, setInfraccionesActivas] = useState<any>(null)          // 93
  const [coberturaSpainEU, setCoberturaSpainEU] = useState<any>(null)                // 94

  // ───── NIVEL 3 · 3G Síntesis (95-100) ─────
  // 95 Semáforo riesgo político → derivado
  // 96 Alerta EPU > p90 → derivado
  // 97 Alerta caída WGI CC > 0.2 → derivado
  const [dashboardCiclo, setDashboardCiclo] = useState<any>(null)                    // 98
  const [analogiasRegimen, setAnalogiasRegimen] = useState<any>(null)                // 99
  const [aiSintesisPolitEcon, setAiSintesisPolitEcon] = useState<any>(null)          // 100

  const [loading, setLoading] = useState(true)

  // ──────────────────────────────────────────────────────────────────
  // useEffect · Promise.all (NIVEL 1+2+3 · ~92 fetches)
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    const f = (url: string) => fetch(url, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null)

    Promise.all([
      // NIVEL 1 · Hero (14 fetches · ind 15 derivado)
      f('/api/proxy/calendario-electoral?country=ESP'),                                // 1
      f('/api/proxy/epu?country=ESP&n=60'),                                            // 2
      f('/api/proxy/epu?country=ESP&type=historico&since=1990'),                       // 3
      f('/api/gdelt/doc?query=economy+Spain&volume=1&n=30'),                           // 4
      f('/api/gdelt/gkg?query=economy+Spain&field=tone&n=30'),                         // 5
      f('/api/worldbank/WGI?country=ESP&type=composite&n=15'),                         // 6
      f('/api/proxy/transparency-cpi?country=ESP&n=15'),                               // 7
      f('/api/igae/gasto-discrecional?n=15'),                                          // 8
      f('/api/proxy/wjp-rule-of-law?country=ESP&n=10'),                                // 9
      f('/api/proxy/inversion-publica-anio-electoral?n=15'),                           // 10
      f('/api/proxy/vdem?country=ESP&type=libdem&n=20'),                               // 11
      f('/api/proxy/vdem?country=ESP&type=rule&n=20'),                                 // 12
      f('/api/proxy/politeia-enp?n=10'),                                               // 13
      f('/api/proxy/politeia-coste-formar-gobierno?n=10'),                             // 14

      // NIVEL 2 · 2A Ciclo político-económico (10 fetches)
      f('/api/igae/gasto-electoral-series?n=15'),                                      // 16
      f('/api/fred/series?id=ESPGGNLBGDPPT&n=40'),                                     // 17
      f('/api/proxy/fbcf-publica-electoral?n=15'),                                     // 18
      f('/api/proxy/place-contratacion-preelec?n=15'),                                 // 19
      f('/api/proxy/smi-electoral-timing?n=15'),                                       // 20
      f('/api/proxy/empleo-publico-electoral?n=15'),                                   // 21
      f('/api/proxy/transferencias-extraord?n=15'),                                    // 22
      f('/api/proxy/presion-fiscal-electoral?n=15'),                                   // 23
      f('/api/proxy/anuncios-inversion-gobierno?n=24'),                                // 24
      f('/api/proxy/correlacion-pib-voto-gobierno?n=15'),                              // 25

      // NIVEL 2 · 2B Voto económico (10 fetches)
      f('/api/proxy/nowcast-voto-economico?n=24'),                                     // 26
      f('/api/proxy/correlacion-paro-voto?since=1982'),                                // 27
      f('/api/proxy/correlacion-ipc-voto?since=1982'),                                 // 28
      f('/api/proxy/salario-real-electoral-swing?n=15'),                               // 29
      f('/api/proxy/sociotropic-vs-pocketbook?country=ESP&n=24'),                      // 30
      f('/api/fred/series?id=ESP_MISERY_INDEX&n=240'),                                 // 31
      f('/api/proxy/misery-peers?countries=ESP,DEU,FRA,ITA,USA&n=60'),                 // 32
      f('/api/proxy/termo-electoral-economico?n=24'),                                  // 33
      f('/api/proxy/ibex-ciclo-electoral?n=15'),                                       // 34
      f('/api/proxy/prima-riesgo-investidura?n=10'),                                   // 35

      // NIVEL 2 · 2C Calidad institucional (10 fetches)
      f('/api/worldbank/WGI?country=ESP&dim=CC&n=15'),                                 // 36
      f('/api/worldbank/WGI?country=ESP&dim=GE&n=15'),                                 // 37
      f('/api/worldbank/WGI?country=ESP&dim=PV&n=15'),                                 // 38
      f('/api/worldbank/WGI?country=ESP&dim=RQ&n=15'),                                 // 39
      f('/api/worldbank/WGI?country=ESP&dim=VA&n=15'),                                 // 40
      f('/api/worldbank/WGI?country=ESP&dim=RL&type=historico&n=20'),                  // 41
      f('/api/worldbank/WGI?country=ESP&peers=OECD&radar=1'),                          // 42
      f('/api/proxy/open-budget-index?country=ESP&n=10'),                              // 43
      f('/api/proxy/eurobarometro?country=ESP&topic=democracia&n=10'),                 // 44
      f('/api/proxy/eurobarometro?country=ESP&topic=confianza-instituciones&n=10'),    // 45

      // NIVEL 3 · 3A V-Dem profundidad (10 fetches)
      f('/api/proxy/vdem?country=ESP&type=libdem&since=1900'),                         // 46
      f('/api/proxy/vdem?country=ESP&type=polyarchy&n=20'),                            // 47
      f('/api/proxy/vdem?country=ESP&type=participatory&n=20'),                        // 48
      f('/api/proxy/vdem?country=ESP&type=deliberative&n=20'),                         // 49
      f('/api/proxy/vdem?country=ESP&type=egalitarian&n=20'),                          // 50
      f('/api/proxy/vdem?countries=ESP,DEU,FRA,ITA,HUN,POL&type=libdem&n=20'),         // 51
      f('/api/proxy/vdem?country=ESP&type=tendencia10y'),                              // 52
      f('/api/proxy/vdem?country=ESP&type=judicial&n=20'),                             // 53
      f('/api/proxy/vdem?country=ESP&type=medios-libertad&n=20'),                      // 54
      f('/api/proxy/vdem?country=ESP&type=rule-hist&n=20'),                            // 55

      // NIVEL 3 · 3B Captura regulatoria (8 fetches)
      f('/api/proxy/registro-lobistas?n=12'),                                          // 56
      f('/api/proxy/reuniones-altos-cargos?n=12'),                                     // 57
      f('/api/proxy/puertas-giratorias?n=10'),                                         // 58
      f('/api/cgpj/contencioso-administrativo?n=10'),                                  // 59
      f('/api/proxy/captura-regulatoria-proxy?n=15'),                                  // 60
      f('/api/oecd/regulatory-policy-outlook?country=ESP'),                            // 61
      f('/api/boe/densidad-regulatoria?n=10'),                                         // 62
      f('/api/boe/normas-impacto-economico?n=10'),                                     // 63

      // NIVEL 3 · 3C Gasto político (7 fetches)
      f('/api/proxy/subvenciones-partidos-pge?n=10'),                                  // 64
      f('/api/proxy/financiacion-medios-ccaa?n=10'),                                   // 65
      f('/api/proxy/empleo-publico-ccaa-pct?n=10'),                                    // 66
      f('/api/proxy/place-sin-concurrencia?n=24'),                                     // 67
      f('/api/proxy/place-contratos-menores?n=24'),                                    // 68
      f('/api/proxy/fondos-ue-por-ccaa?n=15'),                                         // 69
      f('/api/proxy/prtr-ejecucion?n=12'),                                             // 70

      // NIVEL 3 · 3D Narrativa (10 fetches)
      f('/api/gdelt/gkg?query=economy+Spain&field=themes&n=30'),                       // 71
      f('/api/gdelt/doc?query=crisis+economy+Spain&n=30'),                             // 72
      f('/api/gdelt/doc?query=reform+Spain+labor+tax&n=30'),                           // 73
      f('/api/gdelt/gkg?query=government+Spain+economy&field=tone&n=30'),              // 74
      f('/api/gdelt/doc?query=corruption+Spain+politics&n=30'),                        // 75
      f('/api/newsapi/headlines?q=economía+gobierno+España&language=es&n=8'),          // 76
      f('/api/newsapi/headlines?q=presupuestos+reforma+fiscal&language=es&n=8'),       // 77
      f('/api/proxy/tono-discurso-moncloa?n=12'),                                      // 78
      f('/api/proxy/diferencial-tono-gobierno-oposicion?n=12'),                        // 79
      f('/api/proxy/epu?country=ESP&type=componentes&n=24'),                           // 80

      // NIVEL 3 · 3E Comparativa internacional (8 fetches)
      f('/api/worldbank/WGI?countries=ESP,DEU,FRA,ITA,PRT,POL&dims=6&n=10'),           // 81
      f('/api/proxy/transparency-cpi?ranking=1&n=30'),                                 // 82
      f('/api/proxy/wjp-rule-of-law?ranking=1&n=30'),                                  // 83
      f('/api/proxy/freedom-house?country=ESP&n=10'),                                  // 84
      f('/api/proxy/eiu-democracy?country=ESP&n=10'),                                  // 85
      f('/api/proxy/rsf-press-freedom?country=ESP&n=10'),                              // 86
      f('/api/proxy/ogp?country=ESP'),                                                 // 87
      f('/api/proxy/greco?country=ESP'),                                               // 88

      // NIVEL 3 · 3F Economía política UE (6 fetches)
      f('/api/proxy/consejo-ue-voting?country=ESP&n=24'),                              // 89
      f('/api/proxy/balance-neto-ue?country=ESP&n=15'),                                // 90
      f('/api/proxy/fondos-ue-pct-pib?country=ESP&n=15'),                              // 91
      f('/api/proxy/csrs-cumplimiento?country=ESP&n=10'),                              // 92
      f('/api/proxy/ce-infracciones?country=ESP&n=10'),                                // 93
      f('/api/gdelt/doc?query=Spain+EU+budget&n=30'),                                  // 94

      // NIVEL 3 · 3G Síntesis (3 fetches · 95/96/97 derivados)
      f('/api/proxy/dashboard-ciclo-politico?country=ESP'),                            // 98
      f('/api/proxy/analogias-regimen-historico?country=ESP'),                         // 99
      f('/api/brain/chat?prompt=resumen-economia-politica-esp&cache=1h'),              // 100
    ]).then((r) => {
      if (!alive) return
      // NIVEL 1
      setDiasProximasElecc(r[0]); setEpu(r[1]); setEpuHistorico(r[2])
      setCoberturaEcon(r[3]); setTonoEcon(r[4]); setWgiCompuesto(r[5]); setTiCpi(r[6])
      setGastoDiscrecional(r[7]); setWjpRuleOfLaw(r[8]); setInversionAnioElectoral(r[9])
      setVdemLibdem(r[10]); setVdemRule(r[11]); setEnpParlamento(r[12]); setCosteFormarGob(r[13])
      // 2A
      setGastoVarElectoral(r[14]); setDeficitElectoral(r[15]); setFbcfPicoPreelec(r[16])
      setContratacionPreelec(r[17]); setSmiTimingElectoral(r[18]); setEmpleoPublicoElec(r[19])
      setTransferenciasExtra(r[20]); setPresionFiscalPreelec(r[21]); setAnunciosInversion(r[22])
      setCorrelacionPibVoto(r[23])
      // 2B
      setNowcastVotoEconomico(r[24]); setCorrelacionParoVoto(r[25]); setCorrelacionIpcVoto(r[26])
      setSalarioRealElectoral(r[27]); setSociotropicVsPocketbook(r[28]); setMiseryIndex(r[29])
      setMiseryPeers(r[30]); setTermoElectoralEcon(r[31]); setCicloIbexElectoral(r[32])
      setPrimaInvestidura(r[33])
      // 2C
      setWgiCorrupcion(r[34]); setWgiEfectividad(r[35]); setWgiEstabilidad(r[36])
      setWgiCalRegulatoria(r[37]); setWgiVoiceAcc(r[38]); setWgiRuleOfLawHist(r[39])
      setWgiRadar(r[40]); setOpenBudget(r[41]); setPercepDemocracia(r[42]); setConfianzaInstit(r[43])
      // 3A
      setVdemLibdemHist(r[44]); setVdemPolyarchy(r[45]); setVdemParticipatory(r[46])
      setVdemDeliberative(r[47]); setVdemEgalitarian(r[48]); setVdemPeers(r[49])
      setVdemTendencia10y(r[50]); setVdemJudicial(r[51]); setVdemMedios(r[52]); setVdemRuleHist(r[53])
      // 3B
      setRegistroLobistas(r[54]); setReunionesAltosCargos(r[55]); setPuertasGiratorias(r[56])
      setLitigiosidadRegulatoria(r[57]); setIndiceCapturaProxy(r[58]); setCosteRegulatorio(r[59])
      setDensidadRegulatoria(r[60]); setNormasImpacto(r[61])
      // 3C
      setSubvencionesPartidos(r[62]); setFinanciacionMedios(r[63]); setEmpleoPublicoCcaa(r[64])
      setContratoSinConcurrencia(r[65]); setContratosMenores(r[66]); setFondosUeCcaa(r[67])
      setPrtrEjecucion(r[68])
      // 3D
      setFramesGDELT(r[69]); setCrisisMencionesGDELT(r[70]); setReformasTrending(r[71])
      setTonoGobiernoGDELT(r[72]); setCorrupcionPoliticaGDELT(r[73]); setNewsEconPolitica(r[74])
      setNewsPresupuestos(r[75]); setTonoDiscursoMoncloa(r[76]); setDiferencialTonoOpos(r[77])
      setEpuComponentes(r[78])
      // 3E
      setWgiPeers6Pais(r[79]); setTiCpiRankingOECD(r[80]); setWjpRanking(r[81])
      setFreedomHouse(r[82]); setEiuDemocracy(r[83]); setRsfPressFreedom(r[84])
      setOgpCompromisos(r[85]); setGrecoEvaluacion(r[86])
      // 3F
      setPesoVotacionesUE(r[87]); setBalanceNetoUE(r[88]); setFondosUEPctPIB(r[89])
      setCumplimientoCSRs(r[90]); setInfraccionesActivas(r[91]); setCoberturaSpainEU(r[92])
      // 3G
      setDashboardCiclo(r[93]); setAnalogiasRegimen(r[94]); setAiSintesisPolitEcon(r[95])
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
  const epuSeries = (epu?.series ?? []) as { period: string; value: number | null }[]
  const epuHistSeries = (epuHistorico?.series ?? []) as { period: string; value: number | null }[]
  const tonoSeries = (tonoEcon?.series ?? []) as { period: string; value: number | null }[]
  const miseryHistSeries = fredChrono(miseryIndex)
  const vdemLibdemSeries = (vdemLibdem?.series ?? []) as { period: string; value: number | null }[]
  const vdemRuleSeries = (vdemRule?.series ?? []) as { period: string; value: number | null }[]
  const vdemLibdemHistSeries = (vdemLibdemHist?.series ?? []) as { period: string; value: number | null }[]
  const wgiCompSeries = (wgiCompuesto?.series ?? []) as { period: string; value: number | null }[]
  const cpiSeries = (tiCpi?.series ?? []) as { period: string; value: number | null }[]

  // Últimos
  const diasElecLast = diasProximasElecc?.dias ?? diasProximasElecc?.value ?? null
  const epuLast = epu?.last ?? null
  const coberturaLast = coberturaEcon?.last ?? null
  const tonoLast = tonoEcon?.last ?? null
  const wgiCompLast = wgiCompuesto?.last ?? null
  const cpiLast = tiCpi?.last ?? null
  const gastoDiscLast = gastoDiscrecional?.last ?? null
  const wjpLast = wjpRuleOfLaw?.last ?? wjpRuleOfLaw?.value ?? null
  const invElecLast = inversionAnioElectoral?.last ?? null
  const vdemLibLast = vdemLibdem?.last ?? null
  const vdemRuleLast = vdemRule?.last ?? null
  const enpLast = enpParlamento?.last ?? enpParlamento?.value ?? null
  const costeGobLast = costeFormarGob?.last ?? costeFormarGob?.value ?? null
  const miseryLast = lastFred(miseryIndex)

  // Derivados
  // 15 Riesgo político agregado (EPU + CPI + WGI + V-Dem)
  const riesgoPoliticoAgregado = (() => {
    const inputs = [
      epuLast?.value != null ? Math.min(epuLast.value / 200, 1) : null,                   // EPU normalizado a 0-1
      cpiLast?.value != null ? 1 - cpiLast.value / 100 : null,                            // 100=transparente → invertir
      wgiCompLast?.value != null ? 1 - (wgiCompLast.value + 2.5) / 5 : null,              // WGI -2.5 a +2.5 → invertir
      vdemLibLast?.value != null ? 1 - vdemLibLast.value : null,                          // V-Dem 0-1 → invertir
    ].filter((v): v is number => v != null && Number.isFinite(v))
    if (inputs.length === 0) return null
    const avg = inputs.reduce((a, b) => a + b, 0) / inputs.length
    return Math.round(avg * 100)
  })()

  // 96 Alerta EPU > percentil 90 histórico
  const alertaEpuP90 = (() => {
    if (epuHistSeries.length < 60 || epuLast?.value == null) return null
    const vals = epuHistSeries.map((p) => p.value).filter((v): v is number => v != null).sort((a, b) => a - b)
    if (vals.length === 0) return null
    const p90 = vals[Math.floor(vals.length * 0.9)]
    if (p90 == null || epuLast.value <= p90) return null
    return `EPU ${epuLast.value.toFixed(0)} supera p90 histórico (${p90.toFixed(0)})`
  })()

  // 97 Alerta caída WGI CC >0.2 interanual
  const alertaWgiCC = (() => {
    const series = wgiCorrupcion?.series ?? []
    if (series.length < 2) return null
    const curr = series[series.length - 1]?.value
    const prev = series[series.length - 2]?.value
    if (curr == null || prev == null) return null
    const delta = curr - prev
    if (delta >= -0.2) return null
    return `WGI Control Corruption cayó ${delta.toFixed(2)} interanual`
  })()

  // 95 Semáforo riesgo político (EPU + CPI + WGI + VDem + tono)
  const semaforoPolitico = (() => {
    if (riesgoPoliticoAgregado == null) return null
    if (riesgoPoliticoAgregado > 60) return 'rojo'
    if (riesgoPoliticoAgregado > 40) return 'amber'
    return 'verde'
  })()

  // ──────────────────────────────────────────────────────────────────
  // 15 Drill functions · uno por Hero KPI
  // ──────────────────────────────────────────────────────────────────

  const openElecDrill = () => openDrill({
    title: 'Ciclo electoral · días hasta próximas elecciones',
    subtitle: 'BOE + calendario político · ciclo político-económico',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {diasElecLast != null && (
          <p style={{ fontSize: 28, fontWeight: 700, color: '#7c3aed' }}>{diasElecLast} días</p>
        )}
        {/* NIVEL 2 · Ciclo gasto/déficit electoral */}
        {Array.isArray(gastoVarElectoral?.compara) && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 2 · Gasto público en año electoral vs no electoral
            </p>
            {gastoVarElectoral.compara.map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#5b21b6' }}>{c.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed' }}>{c.value > 0 ? '+' : ''}{c.value?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    source: { name: 'BOE + Politeia', url: 'https://www.boe.es/' },
  })

  const openEpuDrill = () => openDrill({
    title: 'EPU España · incertidumbre política económica',
    subtitle: 'policyuncertainty.com · componentes + ciclos electorales',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {epuSeries.length > 3 && (
          <IndicatorDrill label="EPU España" unit="" decimals={0}
            series={epuSeries}
            sourceCode="EPU_SPAIN" sourceName="policyuncertainty.com"
            threshold={{ amber: 150, red: 250, goodAbove: false }} accent="#dc2626" />
        )}
        {/* NIVEL 3 · Componentes EPU */}
        {Array.isArray(epuComponentes?.subindices) && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 3 · EPU sub-índices
            </p>
            {epuComponentes.subindices.map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#7f1d1d' }}>{c.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{c.value?.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    source: { name: 'policyuncertainty.com', url: 'https://www.policyuncertainty.com/spain.html' },
  })

  const openEpuHistDrill = () => openEpuDrill()

  const openCoberturaDrill = () => openDrill({
    title: 'Cobertura mediática economía España',
    subtitle: 'GDELT volumen · narrativa económica diaria',
    accent: '#475569',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {coberturaLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#475569' }}>{coberturaLast.value.toLocaleString('es-ES')}</p>
        )}
        {/* NIVEL 3 · Frames dominantes */}
        {Array.isArray(framesGDELT?.themes) && (
          <div style={{ background: '#fafafa', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              NIVEL 3 · Frames narrativos dominantes
            </p>
            {framesGDELT.themes.slice(0, 8).map((t: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#475569' }}>{t.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{t.weight?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    source: { name: 'GDELT', url: 'https://www.gdeltproject.org/' },
  })

  const openTonoDrill = () => openDrill({
    title: 'Tono mediático economía España',
    subtitle: 'GDELT GKG · positivo (+) vs negativo (−)',
    accent: tonoLast?.value != null && tonoLast.value >= 0 ? '#16a34a' : '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tonoSeries.length > 3 && (
          <DeepLineChart series={[{ id: 't', label: 'Tono', color: '#7c3aed', points: tonoSeries, fillBelow: true }]}
            height={180} yLabel="" zeroLine formatValue={(v) => v.toFixed(2)} />
        )}
      </div>
    ),
    source: { name: 'GDELT GKG', url: 'https://www.gdeltproject.org/' },
  })

  const openWgiDrill = () => openDrill({
    title: 'WGI · calidad institucional · 6 dimensiones',
    subtitle: 'World Bank · descomposición + peers',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {wgiCompLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#0891b2' }}>{wgiCompLast.value.toFixed(2)}</p>
        )}
        {/* NIVEL 2 · 6 dimensiones WGI */}
        <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>
            NIVEL 2 · WGI 6 dimensiones (escala -2.5 a +2.5)
          </p>
          {[
            { l: 'Control Corrupción', v: wgiCorrupcion?.last?.value },
            { l: 'Eficacia Gobierno', v: wgiEfectividad?.last?.value },
            { l: 'Estabilidad Política', v: wgiEstabilidad?.last?.value },
            { l: 'Calidad Regulatoria', v: wgiCalRegulatoria?.last?.value },
            { l: 'Voice & Accountability', v: wgiVoiceAcc?.last?.value },
            { l: 'Rule of Law', v: wgiRuleOfLawHist?.last?.value },
          ].filter((s) => s.v != null).map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ fontSize: 11, color: '#0c4a6e' }}>{s.l}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.v! >= 0 ? '#16a34a' : '#dc2626' }}>
                {s.v! > 0 ? '+' : ''}{s.v!.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <CountryCompareBars indicator="WGI_COMPOSITE" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'POL']}
          spainColor="#0891b2" unit="" decimals={2} title="WGI compuesto · peers" />
      </div>
    ),
    source: { name: 'World Bank', url: 'https://www.worldbank.org/' },
  })

  const openCpiDrill = () => openDrill({
    title: 'TI CPI · percepción corrupción',
    subtitle: 'Transparency International · 0-100 (100=transparente)',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {cpiLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: cpiLast.value > 70 ? '#16a34a' : cpiLast.value > 50 ? '#f97316' : '#dc2626' }}>
            {cpiLast.value.toFixed(0)}
          </p>
        )}
        {cpiSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'cpi', label: 'CPI', color: '#dc2626', points: cpiSeries, fillBelow: true }]}
            height={140} yLabel="" formatValue={(v) => v.toFixed(0)} />
        )}
      </div>
    ),
    source: { name: 'Transparency International', url: 'https://www.transparency.org/' },
  })

  const openGastoDiscrecionalDrill = () => openDrill({
    title: 'Gasto público discrecional · presupuesto político',
    subtitle: 'IGAE + Eurostat · gastos capital + transferencias',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {gastoDiscLast?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>{gastoDiscLast.value.toFixed(2)}% PIB</p>
        )}
        {/* NIVEL 3 · Contratos sin concurrencia + menores */}
        {(contratoSinConcurrencia?.last?.value != null || contratosMenores?.last?.value != null) && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · Contratación pública discrecional
            </p>
            {contratoSinConcurrencia?.last?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#5b21b6' }}>Sin concurrencia: {contratoSinConcurrencia.last.value.toFixed(1)}%</p>}
            {contratosMenores?.last?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#5b21b6' }}>Contratos menores: {contratosMenores.last.value.toFixed(1)}%</p>}
          </div>
        )}
        {/* NIVEL 3 · PRTR */}
        {prtrEjecucion?.last && (
          <div style={{ background: '#fdf4ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #f3e8ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
              NIVEL 3 · PRTR fondos comprometidos vs ejecutados
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#5b21b6' }}>
              Ejecutado: {prtrEjecucion.last.ejecutado?.toFixed(1) ?? '?'}% · Pagado: {prtrEjecucion.last.pagado?.toFixed(1) ?? '?'}%
            </p>
          </div>
        )}
      </div>
    ),
    source: { name: 'IGAE', url: 'https://www.igae.hacienda.gob.es/' },
  })

  const openWjpDrill = () => openDrill({
    title: 'Rule of Law WJP · Estado de Derecho',
    subtitle: 'World Justice Project · ranking internacional',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {wjpLast != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#0891b2' }}>{Number(wjpLast).toFixed(2)}</p>
        )}
      </div>
    ),
    source: { name: 'WJP', url: 'https://worldjusticeproject.org/' },
  })

  const openInversionElecDrill = () => openDrill({
    title: 'Inversión pública en años electorales',
    subtitle: 'INE + IGAE · FBCF pública + calendario electoral',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {invElecLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>{invElecLast.value > 0 ? '+' : ''}{invElecLast.value.toFixed(1)}% pre-elec</p>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          Patrón histórico: la FBCF pública tiende a hacer pico el año t−1 antes de elecciones
          generales. Este indicador mide la magnitud del "boost" electoral.
        </p>
      </div>
    ),
    source: { name: 'INE + IGAE', url: 'https://www.ine.es/' },
  })

  const openVdemLibdemDrill = () => openDrill({
    title: 'V-Dem · Liberal Democracy Index',
    subtitle: 'V-Dem · 5 dimensiones democráticas · serie larga',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {vdemLibdemHistSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'v', label: 'V-Dem Libdem', color: '#0891b2', points: vdemLibdemHistSeries, fillBelow: true }]}
            height={200} yLabel="" formatValue={(v) => v.toFixed(3)}
            annotations={[
              { period: '1939', label: 'Guerra civil', color: '#dc2626' },
              { period: '1975', label: 'Transición', color: '#16a34a' },
            ]} />
        )}
        {/* NIVEL 3 · 5 sub-índices V-Dem */}
        <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>
            NIVEL 3 · V-Dem 5 sub-índices
          </p>
          {[
            { l: 'Electoral', v: vdemPolyarchy?.last?.value },
            { l: 'Participatory', v: vdemParticipatory?.last?.value },
            { l: 'Deliberative', v: vdemDeliberative?.last?.value },
            { l: 'Egalitarian', v: vdemEgalitarian?.last?.value },
            { l: 'Independencia judicial', v: vdemJudicial?.last?.value },
            { l: 'Libertad medios', v: vdemMedios?.last?.value },
          ].filter((s) => s.v != null).map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ fontSize: 11, color: '#0c4a6e' }}>{s.l}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0891b2' }}>{s.v!.toFixed(3)}</span>
            </div>
          ))}
        </div>
        <CountryCompareBars indicator="VDEM_LIBDEM" countries={['ESP', 'DEU', 'FRA', 'ITA', 'HUN', 'POL']}
          spainColor="#0891b2" unit="" decimals={3} title="V-Dem · peers UE (incl. HU/PL)" />
      </div>
    ),
    source: { name: 'V-Dem', url: 'https://v-dem.net/' },
  })

  const openVdemRuleDrill = () => openVdemLibdemDrill()

  const openEnpDrill = () => openDrill({
    title: 'Fragmentación parlamentaria · ENP Laakso-Taagepera',
    subtitle: 'BD Politeia · número efectivo de partidos parlamentarios',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {enpLast != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>{Number(enpLast).toFixed(2)}</p>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          El ENP (Effective Number of Parties · Laakso-Taagepera 1979) cuantifica la fragmentación
          parlamentaria ponderando los partidos por su tamaño. Sistema bipartidista clásico ≈ 2,
          multipartidista moderado ≈ 3-4, fragmentación alta &gt; 5.
        </p>
      </div>
    ),
    source: { name: 'BD Politeia', url: 'https://www.politeia.es/' },
  })

  const openCosteGobDrill = () => openDrill({
    title: 'Coste formar gobierno · días desde elección',
    subtitle: 'BD Politeia · histórico negociaciones investidura',
    accent: '#f97316',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {costeGobLast != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#f97316' }}>{costeGobLast} días</p>
        )}
        {/* NIVEL 2 · Prima riesgo durante investidura */}
        {primaInvestidura?.delta_bp != null && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 2 · Impacto prima riesgo durante investidura
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: primaInvestidura.delta_bp > 0 ? '#dc2626' : '#16a34a' }}>
              {primaInvestidura.delta_bp > 0 ? '+' : ''}{primaInvestidura.delta_bp.toFixed(0)} bp
            </p>
          </div>
        )}
      </div>
    ),
    source: { name: 'BD Politeia', url: 'https://www.politeia.es/' },
  })

  const openRiesgoAgregadoDrill = () => openDrill({
    title: 'Riesgo político agregado · índice propio',
    subtitle: 'Derivado EPU + CPI + WGI + V-Dem · escala 0-100',
    accent: riesgoPoliticoAgregado != null && riesgoPoliticoAgregado > 60 ? '#dc2626' : riesgoPoliticoAgregado != null && riesgoPoliticoAgregado > 40 ? '#f97316' : '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {riesgoPoliticoAgregado != null && (
          <p style={{ fontSize: 32, fontWeight: 700, color: riesgoPoliticoAgregado > 60 ? '#dc2626' : riesgoPoliticoAgregado > 40 ? '#f97316' : '#16a34a' }}>
            {riesgoPoliticoAgregado}
          </p>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          Promedio ponderado de 4 indicadores normalizados a 0-1:
          EPU/200 + (1−CPI/100) + (1−(WGI+2.5)/5) + (1−VDem). Valores 0-40 = bajo riesgo ·
          40-60 = moderado · &gt;60 = alto.
        </p>
      </div>
    ),
    source: { name: 'Derivado Politeia', url: 'https://www.politeia.es/' },
  })

  // ──────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a href="/macro/economia-politica" style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(90deg, #faf5ff 0%, #f0f9ff 100%)',
        border: '1px solid #e9d5ff', borderLeft: `4px solid ${tab.themeAccent}`,
        borderRadius: 10, padding: '12px 16px', color: '#0f172a', textDecoration: 'none',
      }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · Economía Política · 100 indicadores
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            15 Hero + 30 NIVEL 2 + 55 NIVEL 3 · alineado Tab 9.md 100% · ciclo electoral + EPU + WGI + V-Dem + captura
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      {/* Semáforo + alertas */}
      {(semaforoPolitico != null || alertaEpuP90 != null || alertaWgiCC != null) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {semaforoPolitico != null && (
            <div style={{
              background: semaforoPolitico === 'rojo' ? '#fef2f2' : semaforoPolitico === 'amber' ? '#fff7ed' : '#f0fdf4',
              border: `1px solid ${semaforoPolitico === 'rojo' ? '#fecaca' : semaforoPolitico === 'amber' ? '#fed7aa' : '#86efac'}`,
              borderRadius: 10, padding: '10px 14px',
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Semáforo riesgo político · derivado EPU+CPI+WGI+V-Dem
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700,
                color: semaforoPolitico === 'rojo' ? '#dc2626' : semaforoPolitico === 'amber' ? '#f97316' : '#16a34a',
              }}>
                ● {riesgoPoliticoAgregado}/100 ·{' '}
                {semaforoPolitico === 'rojo' ? 'Riesgo político alto' : semaforoPolitico === 'amber' ? 'Vigilar' : 'Estable'}
              </p>
            </div>
          )}
          {alertaEpuP90 != null && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                ! Alerta EPU &gt; percentil 90 histórico
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{alertaEpuP90}</p>
            </div>
          )}
          {alertaWgiCC != null && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                ! Alerta caída WGI Control Corruption
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{alertaWgiCC}</p>
            </div>
          )}
        </div>
      )}

      {/* NIVEL 1 · 15 Hero KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {diasElecLast != null && (
          <MacroKpiCard label="Próximas elecciones" value={Number(diasElecLast)} unit=" días" color="#7c3aed" decimals={0}
            footer="BOE + calendario" loading={loading} onClick={openElecDrill} />
        )}
        {epuLast?.value != null && (
          <MacroKpiCard label="EPU España" value={epuLast.value} unit="" color={epuLast.value > 150 ? '#dc2626' : '#f97316'} decimals={0}
            footer="policyuncertainty.com" loading={loading} onClick={openEpuDrill} />
        )}
        {epuHistSeries.length > 60 && (
          <MacroKpiCard label="EPU vs media histórica" value={epuLast?.value != null ? epuLast.value - (epuHistSeries.reduce((s, p) => s + (p.value ?? 0), 0) / epuHistSeries.length) : 0} unit="" color="#dc2626" decimals={0}
            footer="EPU − media histórica" loading={loading} onClick={openEpuHistDrill} />
        )}
        {coberturaLast?.value != null && (
          <MacroKpiCard label="Cobertura GDELT" value={coberturaLast.value / 1000} unit=" K" color="#475569" decimals={1}
            footer="GDELT noticias economy+ES" loading={loading} onClick={openCoberturaDrill} />
        )}
        {tonoLast?.value != null && (
          <MacroKpiCard label="Tono GDELT" value={tonoLast.value} unit=""
            color={tonoLast.value >= 0 ? '#16a34a' : '#dc2626'} decimals={2}
            footer="GDELT GKG · positivo/neg" loading={loading} onClick={openTonoDrill} />
        )}
        {wgiCompLast?.value != null && (
          <MacroKpiCard label="WGI compuesto" value={wgiCompLast.value} unit=""
            color={wgiCompLast.value > 1 ? '#16a34a' : wgiCompLast.value > 0 ? '#f97316' : '#dc2626'} decimals={2}
            footer="World Bank" loading={loading} onClick={openWgiDrill} />
        )}
        {cpiLast?.value != null && (
          <MacroKpiCard label="TI CPI corrupción" value={cpiLast.value} unit=""
            color={cpiLast.value > 70 ? '#16a34a' : cpiLast.value > 50 ? '#f97316' : '#dc2626'} decimals={0}
            footer="Transparency Intl" loading={loading} onClick={openCpiDrill} />
        )}
        {gastoDiscLast?.value != null && (
          <MacroKpiCard label="Gasto discrecional %PIB" value={gastoDiscLast.value} unit="%" color="#7c3aed" decimals={2}
            footer="IGAE + Eurostat" loading={loading} onClick={openGastoDiscrecionalDrill} />
        )}
        {wjpLast != null && (
          <MacroKpiCard label="Rule of Law WJP" value={Number(wjpLast)} unit="" color="#0891b2" decimals={2}
            footer="World Justice Project" loading={loading} onClick={openWjpDrill} />
        )}
        {invElecLast?.value != null && (
          <MacroKpiCard label="Inv. año electoral" value={invElecLast.value} unit="%"
            color={invElecLast.value > 5 ? '#dc2626' : '#f97316'} decimals={1}
            footer="INE + IGAE · pre-elec" loading={loading} onClick={openInversionElecDrill} />
        )}
        {vdemLibLast?.value != null && (
          <MacroKpiCard label="V-Dem Libdem" value={vdemLibLast.value} unit=""
            color={vdemLibLast.value > 0.7 ? '#16a34a' : '#f97316'} decimals={3}
            footer="V-Dem v2x_libdem" loading={loading} onClick={openVdemLibdemDrill} />
        )}
        {vdemRuleLast?.value != null && (
          <MacroKpiCard label="V-Dem Rule of Law" value={vdemRuleLast.value} unit=""
            color={vdemRuleLast.value > 0.7 ? '#16a34a' : '#f97316'} decimals={3}
            footer="V-Dem v2x_rule" loading={loading} onClick={openVdemRuleDrill} />
        )}
        {enpLast != null && (
          <MacroKpiCard label="ENP parlamentario" value={Number(enpLast)} unit=""
            color={Number(enpLast) > 5 ? '#dc2626' : Number(enpLast) > 3 ? '#f97316' : '#16a34a'} decimals={2}
            footer="BD Politeia · Laakso-Taagepera" loading={loading} onClick={openEnpDrill} />
        )}
        {costeGobLast != null && (
          <MacroKpiCard label="Coste formar gob." value={Number(costeGobLast)} unit=" días"
            color={Number(costeGobLast) > 100 ? '#dc2626' : '#f97316'} decimals={0}
            footer="BD Politeia · investidura" loading={loading} onClick={openCosteGobDrill} />
        )}
        {riesgoPoliticoAgregado != null && (
          <MacroKpiCard label="Riesgo político (índice)" value={riesgoPoliticoAgregado} unit="/100"
            color={riesgoPoliticoAgregado > 60 ? '#dc2626' : riesgoPoliticoAgregado > 40 ? '#f97316' : '#16a34a'} decimals={0}
            footer="Derivado EPU+CPI+WGI+VDem" loading={loading} onClick={openRiesgoAgregadoDrill} />
        )}
      </div>

      {/* PANEL 1 · EPU + Tono GDELT (narrativa económica) */}
      {(epuSeries.length > 3 || tonoSeries.length > 3) && (
        <MacroPanel
          accent="#dc2626"
          title="Incertidumbre + narrativa económica"
          subtitle="EPU + GDELT tono · señales adelantadas de stress político-económico"
          status="live"
          aiAnalysis={{
            indicator: 'Incertidumbre política + tono mediático España',
            indicatorId: 'economia-politica.epu-gdelt.esp',
            tabSlug: 'economia-politica',
            series: aiSeries(epuSeries),
            metadata: {
              unit: 'índice + tono',
              source: 'policyuncertainty.com + GDELT',
              frequency: 'monthly / daily',
              notes: [
                'EPU > 150 = stress político-económico alto.',
                'GDELT tone negativo sostenido precede caídas confianza consumidor.',
                'Picos de EPU coinciden con investiduras fallidas, mociones censura, crisis.',
                'Correlación EPU ↔ prima de riesgo soberana: ~0.6 en España.',
              ],
            },
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              epuSeries.length > 3 ? { id: 'e', label: 'EPU', color: '#dc2626', points: epuSeries, fillBelow: true } : null,
              tonoSeries.length > 3 ? { id: 't', label: 'Tono GDELT × 100', color: '#7c3aed', points: tonoSeries.map((p) => ({ period: p.period, value: p.value != null ? p.value * 100 : null })), dashed: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean; fillBelow?: boolean } => s != null)}
            height={220} yLabel="" formatValue={(v) => v.toFixed(0)} />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative label="EPU España" unit="" decimals={0}
              series={epuSeries as any} threshold={{ amber: 150, red: 250, goodAbove: false }} accent="#dc2626" />
          </div>
        </MacroPanel>
      )}

      {/* PANEL 2 · WGI 6 dimensiones · radar calidad institucional */}
      {(wgiCorrupcion?.last || wgiEfectividad?.last || wgiEstabilidad?.last) && (
        <MacroPanel
          accent="#0891b2"
          title="Calidad institucional · WGI 6 dimensiones"
          subtitle="World Bank · escala -2.5 (peor) a +2.5 (mejor)"
          status="live"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {[
              { l: 'Control Corrupción', v: wgiCorrupcion?.last?.value, c: '#dc2626' },
              { l: 'Eficacia Gobierno', v: wgiEfectividad?.last?.value, c: '#0891b2' },
              { l: 'Estabilidad Política', v: wgiEstabilidad?.last?.value, c: '#7c3aed' },
              { l: 'Calidad Regulatoria', v: wgiCalRegulatoria?.last?.value, c: '#f97316' },
              { l: 'Voice & Accountability', v: wgiVoiceAcc?.last?.value, c: '#16a34a' },
              { l: 'Rule of Law', v: wgiRuleOfLawHist?.last?.value, c: '#6366f1' },
            ].filter((s) => s.v != null).map((s, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>{s.l}</p>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: s.v! >= 0 ? '#16a34a' : '#dc2626' }}>
                  {s.v! > 0 ? '+' : ''}{s.v!.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <CountryCompareBars indicator="WGI_RL" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'POL', 'HUN']}
              spainColor="#0891b2" unit="" decimals={2} title="Rule of Law · peers UE (incl. PL/HU)" />
          </div>
        </MacroPanel>
      )}

      {/* PANEL 3 · V-Dem democracia liberal · serie larga */}
      {vdemLibdemHistSeries.length > 3 && (
        <MacroPanel
          accent="#0891b2"
          title="V-Dem Liberal Democracy · serie histórica España"
          subtitle="V-Dem · serie desde 1900 · transición democrática post-1975"
          status="live"
        >
          <DeepLineChart series={[{ id: 'vd', label: 'V-Dem Libdem', color: '#0891b2', points: vdemLibdemHistSeries, fillBelow: true }]}
            height={220} yLabel="" formatValue={(v) => v.toFixed(3)}
            annotations={[
              { period: '1923', label: 'Dictadura Primo Rivera', color: '#dc2626' },
              { period: '1939', label: 'Guerra civil', color: '#dc2626' },
              { period: '1975', label: 'Muerte Franco', color: '#16a34a' },
              { period: '1978', label: 'Constitución', color: '#16a34a' },
            ]} />
        </MacroPanel>
      )}

      {/* PANEL 4 · Misery Index España · contexto histórico */}
      {miseryHistSeries.length > 50 && (
        <MacroPanel
          accent="#dc2626"
          title="Misery Index · termómetro electoral-económico"
          subtitle="paro + IPC · indicador clave del voto económico"
          status="live"
        >
          <DeepLineChart series={[{ id: 'm', label: 'Misery Index', color: '#dc2626', points: miseryHistSeries, fillBelow: true }]}
            height={200} yLabel="" formatValue={(v) => v.toFixed(1)}
            annotations={[
              { period: '1993', label: 'Recesión', color: '#dc2626' },
              { period: '2009', label: 'Crisis', color: '#dc2626' },
              { period: '2013', label: 'Pico crisis', color: '#dc2626' },
            ]} />
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 10, lineHeight: 1.5 }}>
            Misery Index = tasa de paro + IPC. Cuando supera 25-30 históricamente predice cambio
            de gobierno. España tuvo &gt;35 en 2012-2013 (cambio gobierno 2011 PP) y &gt;28 en
            1994-1995 (cambio 1996 PP).
          </p>
        </MacroPanel>
      )}

      {/* Documentación · mapping niveles
          NIVEL 1 · 15 Hero KPIs en grid arriba (+ semáforo + alerta EPU + alerta WGI)
          NIVEL 2 (30) · inline en drill correspondiente:
            2A Ciclo político → drill 1 Elecciones (gasto/déficit electoral)
            2B Voto económico → drill 15 Riesgo agregado + panel misery
            2C Calidad institucional → drill 6 WGI (6 dimensiones)
          NIVEL 3 (55) · inline en sub-blocks:
            3A V-Dem profundo → drill 11/12 V-Dem (5 sub-índices + peers)
            3B Captura regulatoria → reservado
            3C Gasto político → drill 8 Gasto discrecional (sin concurrencia + PRTR)
            3D Narrativa → drill 4 Cobertura (frames GDELT)
            3E Comparativa internacional → CountryCompareBars en drills 6, 11
            3F Economía política UE → reservado
            3G Síntesis → semáforo + alertas arriba
      */}
    </div>
  )
}

export default EmpresasBeneficiosTab
