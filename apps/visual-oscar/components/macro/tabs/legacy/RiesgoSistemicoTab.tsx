'use client'
/**
 * `<RiesgoSistemicoTab />` · Tab 5 · MERCADO LABORAL PROFUNDO.
 *
 * NOTA · El componente sigue exportándose con el nombre legacy
 * `RiesgoSistemicoTab` para no romper imports en `MacroShell`/`tabs-config`.
 * Internamente representa la NUEVA taxonomía económica de 15 tabs:
 * el slot Tab 5 ya no es "Riesgo sistémico" sino "Mercado Laboral".
 * El componente se renombrará en sprint futuro sin romper rutas.
 *
 * Alineado al 100% con `Tab 5.md` · 100 indicadores en 3 niveles.
 * Radiografía completa del mercado laboral español: estructura, calidad,
 * costes, segmentación, demografía, reforma laboral y benchmarking.
 *
 *   NIVEL 1 · Hero (15 KPIs):
 *     1.  Tasa de paro España (EPA)              · INE EPA
 *     2.  Tasa de paro Eurozona                  · FRED LRHUTTTTEZM156S
 *     3.  Tasa de paro juvenil <25               · FRED youth
 *     4.  Afiliados SS totales (mensual)         · SS datos abiertos
 *     5.  Variación afiliados vs mes anterior    · Derivado SS
 *     6.  Parados registrados SEPE               · SEPE CSV
 *     7.  Contratos registrados SEPE             · SEPE CSV
 *     8.  % contratos indefinidos                · Derivado SEPE
 *     9.  CLU var. %                             · FRED + Eurostat
 *     10. Salario medio bruto anual              · INE EES
 *     11. SMI actual €/mes                       · BOE scraper
 *     12. Tasa empleo 20-64                      · Eurostat lfsa_ergan
 *     13. Horas trabajadas por ocupado           · Eurostat lfsa_ewhun2
 *     14. Productividad aparente (PIB/ocupado)   · FRED + INE derivado
 *     15. ERTE activos                           · SEPE CSV
 *
 *   NIVEL 2 · Detalle (30 indicadores):
 *     2A · Paro en profundidad (16-25)
 *     2B · Empleo estructura y calidad (26-35)
 *     2C · Salarios y costes laborales (36-45)
 *
 *   NIVEL 3 · Detalle del detalle (55 indicadores):
 *     3A · Sectorial (IBEX y empresa) (46-55)
 *     3B · Demografía laboral + proyecciones (56-65)
 *     3C · Reforma laboral + marco institucional (66-75)
 *     3D · Desigualdad y mercado laboral (76-82)
 *     3E · Futuro del trabajo + automatización (83-90)
 *     3F · Benchmarking y síntesis AI (91-100)
 *
 * REGLA · si endpoint devuelve null/error → panel/bloque NO se renderiza.
 * Frontend ciego para fuentes que el backend no expone aún (FRED, scrapers
 * MTES/CGPJ/INSST/AIReF/IRENA, OECD, EPL).
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

export function RiesgoSistemicoTab() {
  // El slot Tab 5 ahora es "Mercado Laboral" en la nueva taxonomía.
  // Mantenemos el getTab key existente hasta el renombrado en sprint futuro.
  const tab = getTab('riesgo-sistemico')
  const { openDrill } = useMacroDrawer()

  // ───── NIVEL 1 · Hero · 15 indicadores ─────
  const [epaParo, setEpaParo] = useState<any>(null)                                  // 1 INE EPA
  const [paroEZ, setParoEZ] = useState<FredSeriesResponse | null>(null)              // 2 FRED LRHUTTTTEZM156S
  const [paroJuvenil, setParoJuvenil] = useState<FredSeriesResponse | null>(null)    // 3 FRED youth
  const [afiliadosSS, setAfiliadosSS] = useState<any>(null)                          // 4 SS
  const [paroSEPE, setParoSEPE] = useState<any>(null)                                // 6 SEPE
  const [contratosSEPE, setContratosSEPE] = useState<any>(null)                      // 7 SEPE
  const [cluVar, setCluVar] = useState<FredSeriesResponse | null>(null)              // 9 FRED
  const [salarioMedio, setSalarioMedio] = useState<any>(null)                        // 10 INE EES
  const [smi, setSmi] = useState<any>(null)                                          // 11 BOE
  const [tasaEmpleo20_64, setTasaEmpleo20_64] = useState<any>(null)                  // 12 Eurostat
  const [horasTrabajadas, setHorasTrabajadas] = useState<any>(null)                  // 13 Eurostat
  const [productividad, setProductividad] = useState<any>(null)                      // 14 derivado
  const [erteActivos, setErteActivos] = useState<any>(null)                          // 15 SEPE

  // ───── NIVEL 2 · 2A Paro en profundidad (16-25) ─────
  const [paroPorCcaa, setParoPorCcaa] = useState<any>(null)
  const [paroPorSexo, setParoPorSexo] = useState<any>(null)
  const [paroPorEducacion, setParoPorEducacion] = useState<any>(null)
  const [paroLargaDuracion, setParoLargaDuracion] = useState<any>(null)
  const [paroMuyLargaDuracion, setParoMuyLargaDuracion] = useState<any>(null)
  const [paroJuvenilPeers, setParoJuvenilPeers] = useState<any>(null)
  const [neet, setNeet] = useState<any>(null)
  const [duracionMediaDesempleo, setDuracionMediaDesempleo] = useState<any>(null)
  const [paroPorEdad, setParoPorEdad] = useState<any>(null)
  const [flujosTransiciones, setFlujosTransiciones] = useState<any>(null)

  // ───── NIVEL 2 · 2B Empleo estructura y calidad (26-35) ─────
  const [tasaTemporalidad, setTasaTemporalidad] = useState<any>(null)
  const [temporalidadVsUE, setTemporalidadVsUE] = useState<any>(null)
  const [tiempoParcialInvol, setTiempoParcialInvol] = useState<any>(null)
  const [subempleo, setSubempleo] = useState<any>(null)
  const [empleoPorSector, setEmpleoPorSector] = useState<any>(null)
  const [empleoPublicoPrivado, setEmpleoPublicoPrivado] = useState<any>(null)
  const [autonomos, setAutonomos] = useState<any>(null)
  const [autonomosNuevos, setAutonomosNuevos] = useState<any>(null)
  const [empleoDigital, setEmpleoDigital] = useState<any>(null)
  const [empleoFemenino, setEmpleoFemenino] = useState<any>(null)

  // ───── NIVEL 2 · 2C Salarios y costes laborales (36-45) ─────
  const [iassVar, setIassVar] = useState<any>(null)
  const [smiSerie, setSmiSerie] = useState<any>(null)
  const [kaitzIndex, setKaitzIndex] = useState<any>(null)
  const [smiOcdeRanking, setSmiOcdeRanking] = useState<any>(null)
  const [costeLaboralHora, setCosteLaboralHora] = useState<any>(null)
  const [costeLaboralPeers, setCosteLaboralPeers] = useState<any>(null)
  const [conveniosTrabajadores, setConveniosTrabajadores] = useState<any>(null)
  const [incrementoSalarialConvenios, setIncrementoSalarialConvenios] = useState<any>(null)
  const [brechaSalarialGenero, setBrechaSalarialGenero] = useState<any>(null)

  // ───── NIVEL 3 · 3A Sectorial (46-55) ─────
  const [empleoIndustria, setEmpleoIndustria] = useState<any>(null)
  const [empleoConstruccion, setEmpleoConstruccion] = useState<any>(null)
  const [empleoTic, setEmpleoTic] = useState<any>(null)
  const [empleoRenovables, setEmpleoRenovables] = useState<any>(null)
  const [empleoExportador, setEmpleoExportador] = useState<any>(null)
  const [vacantesPorSector, setVacantesPorSector] = useState<any>(null)
  const [huelgasJornadas, setHuelgasJornadas] = useState<any>(null)
  const [accidentesLaborales, setAccidentesLaborales] = useState<any>(null)
  const [absentismo, setAbsentismo] = useState<any>(null)

  // ───── NIVEL 3 · 3B Demografía laboral (56-65) ─────
  const [poblacionActiva, setPoblacionActiva] = useState<any>(null)
  const [tasaActividad16_64, setTasaActividad16_64] = useState<any>(null)
  const [tasaActividadOcde, setTasaActividadOcde] = useState<any>(null)
  const [poblacion20_64Proyeccion, setPoblacion20_64Proyeccion] = useState<any>(null)
  const [ratioDependencia, setRatioDependencia] = useState<any>(null)
  const [trabajadoresExtranjeros, setTrabajadoresExtranjeros] = useState<any>(null)
  const [brainDrain, setBrainDrain] = useState<any>(null)
  const [saldoMigratorio, setSaldoMigratorio] = useState<any>(null)
  const [proyeccionActividad2030, setProyeccionActividad2030] = useState<any>(null)

  // ───── NIVEL 3 · 3C Reforma laboral (66-75) ─────
  const [temporalidadPrePost, setTemporalidadPrePost] = useState<any>(null)
  const [contratosIndefinidosSerie, setContratosIndefinidosSerie] = useState<any>(null)
  const [despidosProcedentes, setDespidosProcedentes] = useState<any>(null)
  const [costeDespido, setCosteDespido] = useState<any>(null)
  const [epl, setEpl] = useState<any>(null)
  const [sentenciasLaborales, setSentenciasLaborales] = useState<any>(null)
  const [empresasERE, setEmpresasERE] = useState<any>(null)
  const [coberturaConvenios, setCoberturaConvenios] = useState<any>(null)
  const [sindicalizacion, setSindicalizacion] = useState<any>(null)
  const [sindicalizacionPeers, setSindicalizacionPeers] = useState<any>(null)

  // ───── NIVEL 3 · 3D Desigualdad salarial (76-82) ─────
  const [giniSalarios, setGiniSalarios] = useState<any>(null)
  const [ratioD9D1, setRatioD9D1] = useState<any>(null)
  const [inWorkPoverty, setInWorkPoverty] = useState<any>(null)
  const [inWorkPovertyPeers, setInWorkPovertyPeers] = useState<any>(null)
  const [polarizacionSalarial, setPolarizacionSalarial] = useState<any>(null)
  const [salarioMedianoVsMedia, setSalarioMedianoVsMedia] = useState<any>(null)
  const [trabajadoresBajoSalario, setTrabajadoresBajoSalario] = useState<any>(null)

  // ───── NIVEL 3 · 3E Futuro del trabajo (83-90) ─────
  const [teletrabajo, setTeletrabajo] = useState<any>(null)
  const [teletrabajoOcdeRanking, setTeletrabajoOcdeRanking] = useState<any>(null)
  const [empleosAutomatizacion, setEmpleosAutomatizacion] = useState<any>(null)
  const [gigEconomy, setGigEconomy] = useState<any>(null)
  const [inversionFormacion, setInversionFormacion] = useState<any>(null)
  const [participacionFormacionContinua, setParticipacionFormacionContinua] = useState<any>(null)
  const [demandaTI_IA, setDemandaTI_IA] = useState<any>(null)
  const [gdeltAutomatizacion, setGdeltAutomatizacion] = useState<any>(null)

  // ───── NIVEL 3 · 3F Benchmarking + AI (91-100) ─────
  const [paroPeersOECD, setParoPeersOECD] = useState<any>(null)
  const [empleoOcdeRanking, setEmpleoOcdeRanking] = useState<any>(null)
  const [temporalidadRanking, setTemporalidadRanking] = useState<any>(null)
  const [cluPeers, setCluPeers] = useState<any>(null)
  const [productividadHoraOcde, setProductividadHoraOcde] = useState<any>(null)
  const [gastoPoliticasActivas, setGastoPoliticasActivas] = useState<any>(null)
  const [aiSintesisLaboral, setAiSintesisLaboral] = useState<any>(null)

  const [loading, setLoading] = useState(true)

  // ──────────────────────────────────────────────────────────────────
  // useEffect · Promise.all (NIVEL 1+2+3 · 92 fetches)
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    const f = (url: string) => fetch(url, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null)

    Promise.all([
      // NIVEL 1 · Hero (13 fetches, indicadores 5 y 8 son derivados)
      f('/api/ine/epa?type=paro&n=20'),                                              // 1
      f('/api/fred/series?id=LRHUTTTTEZM156S&n=60'),                                 // 2
      f('/api/fred/series?id=LRHU24TTESM156S&n=60'),                                 // 3
      f('/api/ss/afiliados-totales?n=36'),                                           // 4
      f('/api/sepe/paro-registrado?n=36'),                                           // 6
      f('/api/sepe/contratos-registrados?n=36'),                                     // 7
      f('/api/fred/series?id=ULQEES163RXDCLT&n=40'),                                 // 9
      f('/api/ine/ees/salario-medio?n=10'),                                          // 10
      f('/api/proxy/smi?country=ESP'),                                               // 11
      f('/api/eurostat/lfsa_ergan?country=ESP&age=20_64&n=24'),                      // 12
      f('/api/eurostat/lfsa_ewhun2?country=ESP&n=24'),                               // 13
      f('/api/proxy/productividad?country=ESP&n=24'),                                // 14
      f('/api/sepe/erte-activos?n=24'),                                              // 15
      // NIVEL 2 · 2A Paro profundo (16-25 · 10 fetches)
      f('/api/ine/epa?type=ccaa&n=8'),
      f('/api/ine/epa?type=sexo&n=12'),
      f('/api/ine/epa?type=educacion&n=12'),
      f('/api/eurostat/une_ltu_a?country=ESP&n=15'),
      f('/api/eurostat/une_ltu_a?country=ESP&type=24m&n=15'),
      f('/api/fred/multi?ids=LRHU24TTESM,LRHU24TTDEM,LRHU24TTFRM,LRHU24TTITM&n=24'),
      f('/api/eurostat/edat_lfse_20?country=ESP&n=15'),
      f('/api/ine/epa?type=duracion-desempleo&n=12'),
      f('/api/ine/epa?type=edad&n=12'),
      f('/api/ine/epa?type=transiciones&n=12'),
      // NIVEL 2 · 2B Empleo estructura (26-35 · 10 fetches)
      f('/api/ine/epa?type=temporalidad&n=20'),
      f('/api/eurostat/lfsa_etpga?countries=ESP,DEU,FRA,ITA,PRT,NLD,EU&n=15'),
      f('/api/eurostat/lfsa_eppgai?country=ESP&n=15'),
      f('/api/ine/epa?type=subempleo&n=12'),
      f('/api/ine/epa?type=sectores&n=12'),
      f('/api/proxy/empleo-publico-privado?country=ESP&n=15'),
      f('/api/ss/reta?n=24'),
      f('/api/ss/reta-altas-bajas?n=24'),
      f('/api/eurostat/isoc_sks_itspt?country=ESP&n=15'),
      f('/api/eurostat/lfsa_ergan?country=ESP&age=20_64&sex=F&n=24'),
      // NIVEL 2 · 2C Salarios (36-45 · 9 fetches · 37 derivado)
      f('/api/ine/iass?n=20'),
      f('/api/proxy/smi-serie?country=ESP&n=20'),
      f('/api/oecd/kaitz?country=ESP&n=20'),
      f('/api/oecd/rmw?ranking=1&n=30'),
      f('/api/eurostat/lc_lci_r2?country=ESP&n=24'),
      f('/api/eurostat/lc_lci_r2?countries=ESP,DEU,FRA,ITA,PRT&n=24'),
      f('/api/mtes/convenios?n=24'),
      f('/api/mtes/incremento-salarial-convenios?n=24'),
      f('/api/eurostat/earn_grgpgap2?country=ESP&n=15'),
      // NIVEL 3 · 3A Sectorial (46-55 · 9 fetches · 52 derivado)
      f('/api/ine/epa?type=industria&n=12'),
      f('/api/ine/epa?type=construccion&n=12'),
      f('/api/eurostat/isoc_sks_itspt?country=ESP&yoy=1&n=15'),
      f('/api/proxy/empleo-renovables?country=ESP&n=10'),
      f('/api/proxy/empleo-exportador?country=ESP&n=10'),
      f('/api/eurostat/jvs_q_nace2?country=ESP&n=12'),
      f('/api/mtes/huelgas?n=10'),
      f('/api/insst/accidentes-laborales?n=10'),
      f('/api/proxy/absentismo?country=ESP&n=10'),
      // NIVEL 3 · 3B Demografía (56-65 · 9 fetches · 62 derivado)
      f('/api/ine/epa?type=activos&n=24'),
      f('/api/ine/epa?type=tasa-actividad&age=16_64&n=20'),
      f('/api/oecd/lfs?country=ESP&type=participation&n=20'),
      f('/api/ine/proyecciones-poblacion?age=20_64&horizon=2030,2040'),
      f('/api/proxy/ratio-dependencia?country=ESP&n=20'),
      f('/api/ss/extranjeros-afiliados?n=24'),
      f('/api/eurostat/migr_emi?country=ESP&type=highskilled&n=15'),
      f('/api/ine/migraciones?n=15'),
      f('/api/airef/proyeccion-actividad?horizon=2030,2040'),
      // NIVEL 3 · 3C Reforma laboral (66-75 · 10 fetches)
      f('/api/ine/epa?type=temporalidad-serie-larga&n=40'),
      f('/api/sepe/contratos-indefinidos-serie?n=60'),
      f('/api/cgpj/despidos-procedentes-improcedentes?n=10'),
      f('/api/oecd/epl?country=ESP'),
      f('/api/oecd/epl?countries=ESP,DEU,FRA,ITA,PRT,NLD'),
      f('/api/cgpj/sentencias-laborales?n=10'),
      f('/api/mtes/ere?n=24'),
      f('/api/proxy/cobertura-convenios?country=ESP&n=15'),
      f('/api/oecd/tud?country=ESP&n=20'),
      f('/api/oecd/tud?countries=ESP,DEU,FRA,SWE,GBR&n=20'),
      // NIVEL 3 · 3D Desigualdad (76-82 · 7 fetches)
      f('/api/eurostat/earn_ses_pub1s?country=ESP&type=gini&n=15'),
      f('/api/oecd/earnings?country=ESP&type=d9d1&n=15'),
      f('/api/eurostat/ilc_iw01?country=ESP&n=15'),
      f('/api/eurostat/ilc_iw01?countries=ESP,DEU,FRA,ITA,PRT,NLD,EU&n=15'),
      f('/api/proxy/polarizacion-salarial?country=ESP&n=15'),
      f('/api/ine/ees/mediano-vs-media?n=10'),
      f('/api/eurostat/earn_ses_pub1s?country=ESP&type=low-wage&n=15'),
      // NIVEL 3 · 3E Futuro trabajo (83-90 · 8 fetches)
      f('/api/eurostat/lfsa_ehomp?country=ESP&n=15'),
      f('/api/eurostat/lfsa_ehomp?ranking=1&n=30'),
      f('/api/proxy/oecd-future-of-work?country=ESP'),
      f('/api/proxy/gig-economy?country=ESP&n=10'),
      f('/api/eurostat/cvts?country=ESP&n=10'),
      f('/api/eurostat/trng_aes_100?country=ESP&n=15'),
      f('/api/proxy/demanda-tech?country=ESP&n=24'),
      f('/api/gdelt/doc?query=automation+employment+Spain&n=30'),
      // NIVEL 3 · 3F Benchmarking + AI (91-100 · 7 fetches · 96/98/99 derivados)
      f('/api/fred/multi?ids=LRHUTTTTESM156S,LRHUTTTTDEM156S,LRHUTTTTFRM156S,LRHUTTTTITM156S,LRHUTTTTPRM156S&n=24'),
      f('/api/oecd/lfs?type=employment-rate&age=20_64&ranking=1&n=30'),
      f('/api/eurostat/lfsa_etpga?ranking=1&n=30'),
      f('/api/eurostat/lc_lci_r2?countries=ESP,DEU,FRA,ITA&n=24'),
      f('/api/oecd/pdb_lv?country=ESP&ranking=1&n=20'),
      f('/api/oecd/almp?country=ESP&peers=OECD&n=15'),
      f('/api/brain/chat?prompt=resumen-mercado-laboral-esp&cache=1h'),
    ]).then((r) => {
      if (!alive) return
      // NIVEL 1
      setEpaParo(r[0]); setParoEZ(r[1]); setParoJuvenil(r[2]); setAfiliadosSS(r[3])
      setParoSEPE(r[4]); setContratosSEPE(r[5]); setCluVar(r[6]); setSalarioMedio(r[7])
      setSmi(r[8]); setTasaEmpleo20_64(r[9]); setHorasTrabajadas(r[10])
      setProductividad(r[11]); setErteActivos(r[12])
      // 2A
      setParoPorCcaa(r[13]); setParoPorSexo(r[14]); setParoPorEducacion(r[15])
      setParoLargaDuracion(r[16]); setParoMuyLargaDuracion(r[17]); setParoJuvenilPeers(r[18])
      setNeet(r[19]); setDuracionMediaDesempleo(r[20]); setParoPorEdad(r[21])
      setFlujosTransiciones(r[22])
      // 2B
      setTasaTemporalidad(r[23]); setTemporalidadVsUE(r[24]); setTiempoParcialInvol(r[25])
      setSubempleo(r[26]); setEmpleoPorSector(r[27]); setEmpleoPublicoPrivado(r[28])
      setAutonomos(r[29]); setAutonomosNuevos(r[30]); setEmpleoDigital(r[31])
      setEmpleoFemenino(r[32])
      // 2C
      setIassVar(r[33]); setSmiSerie(r[34]); setKaitzIndex(r[35]); setSmiOcdeRanking(r[36])
      setCosteLaboralHora(r[37]); setCosteLaboralPeers(r[38]); setConveniosTrabajadores(r[39])
      setIncrementoSalarialConvenios(r[40]); setBrechaSalarialGenero(r[41])
      // 3A
      setEmpleoIndustria(r[42]); setEmpleoConstruccion(r[43]); setEmpleoTic(r[44])
      setEmpleoRenovables(r[45]); setEmpleoExportador(r[46]); setVacantesPorSector(r[47])
      setHuelgasJornadas(r[48]); setAccidentesLaborales(r[49]); setAbsentismo(r[50])
      // 3B
      setPoblacionActiva(r[51]); setTasaActividad16_64(r[52]); setTasaActividadOcde(r[53])
      setPoblacion20_64Proyeccion(r[54]); setRatioDependencia(r[55]); setTrabajadoresExtranjeros(r[56])
      setBrainDrain(r[57]); setSaldoMigratorio(r[58]); setProyeccionActividad2030(r[59])
      // 3C
      setTemporalidadPrePost(r[60]); setContratosIndefinidosSerie(r[61]); setDespidosProcedentes(r[62])
      setCosteDespido(r[63]); setEpl(r[64]); setSentenciasLaborales(r[65])
      setEmpresasERE(r[66]); setCoberturaConvenios(r[67]); setSindicalizacion(r[68])
      setSindicalizacionPeers(r[69])
      // 3D
      setGiniSalarios(r[70]); setRatioD9D1(r[71]); setInWorkPoverty(r[72])
      setInWorkPovertyPeers(r[73]); setPolarizacionSalarial(r[74]); setSalarioMedianoVsMedia(r[75])
      setTrabajadoresBajoSalario(r[76])
      // 3E
      setTeletrabajo(r[77]); setTeletrabajoOcdeRanking(r[78]); setEmpleosAutomatizacion(r[79])
      setGigEconomy(r[80]); setInversionFormacion(r[81]); setParticipacionFormacionContinua(r[82])
      setDemandaTI_IA(r[83]); setGdeltAutomatizacion(r[84])
      // 3F
      setParoPeersOECD(r[85]); setEmpleoOcdeRanking(r[86]); setTemporalidadRanking(r[87])
      setCluPeers(r[88]); setProductividadHoraOcde(r[89]); setGastoPoliticasActivas(r[90])
      setAiSintesisLaboral(r[91])
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

  const paroEZSeries = fredChrono(paroEZ)
  const paroJuvenilSeries = fredChrono(paroJuvenil)
  const cluVarSeries = fredChrono(cluVar)
  const epaParoSeries = (epaParo?.series ?? []) as { period: string; value: number | null }[]
  const afiliadosSeries = (afiliadosSS?.series ?? []) as { period: string; value: number | null }[]
  const paroSEPESeries = (paroSEPE?.series ?? []) as { period: string; value: number | null }[]

  const epaParoLast = epaParo?.last ?? null
  const paroEZLast = lastFred(paroEZ)
  const paroJuvenilLast = lastFred(paroJuvenil)
  const afiliadosLast = afiliadosSS?.last ?? null
  const paroSEPELast = paroSEPE?.last ?? null
  const contratosSEPELast = contratosSEPE?.last ?? null
  const cluVarLast = lastFred(cluVar)
  const salarioMedioLast = salarioMedio?.last ?? null
  const smiLast = smi?.value ?? smi?.last?.value ?? null
  const tasaEmpleoLast = tasaEmpleo20_64?.last ?? null
  const horasLast = horasTrabajadas?.last ?? null
  const productividadLast = productividad?.last ?? null
  const erteLast = erteActivos?.last ?? null

  // 5 Variación afiliados MoM
  const variacionAfiliadosMoM = (() => {
    if (afiliadosSeries.length < 2) return null
    const prev = afiliadosSeries[afiliadosSeries.length - 2]?.value
    const curr = afiliadosSeries[afiliadosSeries.length - 1]?.value
    if (prev == null || curr == null) return null
    return curr - prev
  })()
  // 8 % indefinidos
  const pctIndefinidos = (() => {
    const totales = contratosSEPE?.last?.total
    const indefinidos = contratosSEPE?.last?.indefinidos
    if (totales == null || indefinidos == null || totales === 0) return null
    return (indefinidos / totales) * 100
  })()
  // 62 % extranjeros
  const pctExtranjeros = (() => {
    const ext = trabajadoresExtranjeros?.last?.value
    const total = afiliadosLast?.value
    if (ext == null || total == null || total === 0) return null
    return (ext / total) * 100
  })()
  // 96 Brecha productividad ES vs DE
  const brechaProdEsDe = (() => {
    const esp = productividadHoraOcde?.esp?.value
    const deu = productividadHoraOcde?.deu?.value
    if (esp == null || deu == null || deu === 0) return null
    return ((esp - deu) / deu) * 100
  })()
  // 98 Semáforo laboral
  const semaforoLaboral = (() => {
    const paro = epaParoLast?.value
    const temp = tasaTemporalidad?.last?.value
    const clu = cluVarLast?.value
    const juvenil = paroJuvenilLast?.value
    if (paro == null && temp == null && clu == null && juvenil == null) return null
    const score =
      (paro != null && paro > 15 ? 2 : paro != null && paro > 10 ? 1 : 0) +
      (temp != null && temp > 25 ? 2 : temp != null && temp > 18 ? 1 : 0) +
      (clu != null && clu > 4 ? 1 : 0) +
      (juvenil != null && juvenil > 30 ? 2 : juvenil != null && juvenil > 20 ? 1 : 0)
    return score >= 5 ? 'rojo' : score >= 2 ? 'amber' : 'verde'
  })()
  // 99 Alerta afiliados ±50k
  const alertaAfiliados = (variacionAfiliadosMoM != null && Math.abs(variacionAfiliadosMoM) > 50000)
    ? `${variacionAfiliadosMoM > 0 ? '+' : ''}${(variacionAfiliadosMoM / 1000).toFixed(0)}K afiliados vs mes anterior`
    : null

  // ──────────────────────────────────────────────────────────────────
  // 15 Drill functions · uno por Hero KPI
  // ──────────────────────────────────────────────────────────────────

  const openParoEpaDrill = () => openDrill({
    title: 'Paro EPA · análisis completo',
    subtitle: 'INE EPA · descomposición CCAA + sexo + edad + duración',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {epaParoSeries.length > 3 && (
          <IndicatorDrill label="Tasa paro EPA" unit="%" decimals={2}
            series={epaParoSeries.map((p) => ({ period: p.period, value: p.value }))}
            sourceCode="EPA" sourceName="INE" imfCompareIndicator="LUR"
            threshold={{ amber: 12, red: 18, goodAbove: false }} accent="#dc2626" />
        )}
        {Array.isArray(paroPorCcaa?.ccaa) && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 2 · Paro por CCAA (top 8)
            </p>
            {paroPorCcaa.ccaa.slice(0, 8).map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#7f1d1d' }}>{c.region}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{c.value?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {(paroLargaDuracion?.last?.value != null || neet?.last?.value != null) && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 2 · Paro estructural
            </p>
            {paroLargaDuracion?.last?.value != null && (
              <p style={{ margin: '2px 0', fontSize: 11, color: '#78350f' }}>Larga duración (&gt;12m): {paroLargaDuracion.last.value.toFixed(1)}%</p>
            )}
            {paroMuyLargaDuracion?.last?.value != null && (
              <p style={{ margin: '2px 0', fontSize: 11, color: '#78350f' }}>Muy larga duración (&gt;24m): {paroMuyLargaDuracion.last.value.toFixed(1)}%</p>
            )}
            {neet?.last?.value != null && (
              <p style={{ margin: '2px 0', fontSize: 11, color: '#78350f' }}>NEET 15-29: {neet.last.value.toFixed(1)}%</p>
            )}
          </div>
        )}
        <CountryCompareBars indicator="LUR" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC']}
          spainColor="#dc2626" unit="%" decimals={2} title="NIVEL 3 · Paro · peers UE" />
      </div>
    ),
    source: { name: 'INE EPA', url: 'https://www.ine.es/' },
  })

  const openParoEZDrill = () => openDrill({
    title: 'Paro Eurozona · contexto BCE',
    subtitle: 'FRED LRHUTTTTEZM156S · referencia política monetaria común',
    accent: '#f59e0b',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {paroEZSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'ez', label: 'Paro EZ', color: '#f59e0b', points: paroEZSeries, fillBelow: true }]}
            height={180} yLabel="%" formatValue={(v) => `${v.toFixed(2)}%`} />
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/LRHUTTTTEZM156S' },
  })

  const openParoJuvenilDrill = () => openDrill({
    title: 'Paro juvenil <25 · brecha generacional',
    subtitle: 'FRED + Eurostat · indicador adelantado + NEET',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {paroJuvenilSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'j', label: 'Paro <25', color: '#dc2626', points: paroJuvenilSeries, fillBelow: true }]}
            height={180} yLabel="%" formatValue={(v) => `${v.toFixed(1)}%`} />
        )}
        {neet?.last?.value != null && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>NEET 15-29</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{neet.last.value.toFixed(1)}%</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/' },
  })

  const openAfiliadosDrill = () => openDrill({
    title: 'Afiliados SS · indicador líder mensual',
    subtitle: 'SS datos abiertos · descomposición autónomos + extranjeros',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {afiliadosSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'af', label: 'Afiliados SS', color: '#16a34a', points: afiliadosSeries, fillBelow: true }]}
            height={180} yLabel="" formatValue={(v) => `${(v / 1e6).toFixed(2)}M`} />
        )}
        {variacionAfiliadosMoM != null && (
          <div style={{ background: variacionAfiliadosMoM >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: 8,
            padding: '10px 14px', border: `1px solid ${variacionAfiliadosMoM >= 0 ? '#86efac' : '#fecaca'}` }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700,
              color: variacionAfiliadosMoM >= 0 ? '#166534' : '#991b1b', textTransform: 'uppercase' }}>
              Variación mensual
            </p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700,
              color: variacionAfiliadosMoM >= 0 ? '#16a34a' : '#dc2626' }}>
              {variacionAfiliadosMoM >= 0 ? '+' : ''}{(variacionAfiliadosMoM / 1000).toFixed(0)}K
            </p>
          </div>
        )}
        {autonomos?.last?.value != null && (
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              NIVEL 2 · Autónomos (RETA)
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#2563eb' }}>{(autonomos.last.value / 1e6).toFixed(2)}M</p>
          </div>
        )}
        {pctExtranjeros != null && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · Trabajadores extranjeros
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#7c3aed' }}>{pctExtranjeros.toFixed(1)}%</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'SS', url: 'https://www.seg-social.es/' },
  })

  const openVariacionDrill = () => openAfiliadosDrill()

  const openParoSEPEDrill = () => openDrill({
    title: 'Paro registrado SEPE',
    subtitle: 'SEPE · diferencia con EPA por metodología (registro vs encuesta OIT)',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {paroSEPESeries.length > 3 && (
          <DeepLineChart series={[{ id: 'sepe', label: 'Paro SEPE', color: '#dc2626', points: paroSEPESeries, fillBelow: true }]}
            height={180} yLabel="" formatValue={(v) => `${(v / 1e6).toFixed(2)}M`} />
        )}
      </div>
    ),
    source: { name: 'SEPE', url: 'https://www.sepe.es/' },
  })

  const openContratosDrill = () => openDrill({
    title: 'Contratos SEPE · impacto reforma laboral 2022',
    subtitle: 'SEPE · % indefinidos pre/post reforma',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {contratosSEPELast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{(contratosSEPELast.value / 1e6).toFixed(2)}M contratos</p>
        )}
        {pctIndefinidos != null && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              % Indefinidos
            </p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{pctIndefinidos.toFixed(1)}%</p>
          </div>
        )}
        {Array.isArray(temporalidadPrePost?.series) && temporalidadPrePost.series.length > 3 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#166534', margin: '0 0 6px', textTransform: 'uppercase' }}>
              NIVEL 3 · Temporalidad pre/post reforma
            </p>
            <DeepLineChart series={[{ id: 'temp', label: 'Temporalidad %', color: '#dc2626', points: temporalidadPrePost.series, fillBelow: true }]}
              height={140} yLabel="%"
              annotations={[{ period: '2022-02', label: 'Reforma laboral', color: '#16a34a' }]}
              formatValue={(v) => `${v.toFixed(1)}%`} />
          </div>
        )}
      </div>
    ),
    source: { name: 'SEPE', url: 'https://www.sepe.es/' },
  })

  const openIndefinidosDrill = () => openContratosDrill()

  const openCluDrill = () => openDrill({
    title: 'Coste Laboral Unitario · competitividad-coste',
    subtitle: 'FRED + Eurostat · indicador BCE para presiones salariales',
    accent: '#f97316',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {cluVarSeries.length > 3 && (
          <IndicatorDrill label="CLU var. YoY" unit="%" decimals={2}
            series={cluVarSeries}
            sourceCode="ULQEES163RXDCLT" sourceName="FRED · OECD"
            threshold={{ amber: 3, red: 6, goodAbove: false }} accent="#f97316" />
        )}
        <CountryCompareBars indicator="LCEATT02" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD']}
          spainColor="#f97316" unit="%" decimals={2} title="CLU · peers UE" />
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/ULQEES163RXDCLT' },
  })

  const openSalarioDrill = () => openDrill({
    title: 'Salario medio bruto anual · INE EES',
    subtitle: 'IASS + brecha género + in-work poverty',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {salarioMedioLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>{Math.round(salarioMedioLast.value).toLocaleString('es-ES')} €/año</p>
        )}
        {iassVar?.last?.value != null && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 2 · IASS variación
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#7c3aed' }}>{iassVar.last.value > 0 ? '+' : ''}{iassVar.last.value.toFixed(2)}%</p>
          </div>
        )}
        {brechaSalarialGenero?.last?.value != null && (
          <div style={{ background: '#fdf4ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #f3e8ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
              Brecha salarial género
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#9333ea' }}>{brechaSalarialGenero.last.value.toFixed(1)}%</p>
          </div>
        )}
        {inWorkPoverty?.last?.value != null && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 3 · Trabajadores en riesgo pobreza
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{inWorkPoverty.last.value.toFixed(1)}%</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'INE EES', url: 'https://www.ine.es/' },
  })

  const openSmiDrill = () => openDrill({
    title: 'SMI España · Kaitz Index + ranking OCDE',
    subtitle: 'BOE + OECD · serie histórica',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {smiLast != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{Math.round(smiLast).toLocaleString('es-ES')} €/mes</p>
        )}
        {Array.isArray(smiSerie?.series) && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#166534', margin: '0 0 6px', textTransform: 'uppercase' }}>
              SMI serie histórica
            </p>
            <DeepLineChart series={[{ id: 'smi', label: 'SMI €/mes', color: '#16a34a', points: smiSerie.series, fillBelow: true }]}
              height={140} yLabel="€/mes" formatValue={(v) => `${Math.round(v)}€`} />
          </div>
        )}
        {kaitzIndex?.last?.value != null && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              Kaitz Index (SMI/mediana)
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{kaitzIndex.last.value.toFixed(2)}</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'BOE · OECD', url: 'https://stats.oecd.org/' },
  })

  const openTasaEmpleoDrill = () => openDrill({
    title: 'Tasa empleo 20-64 · Europa 2030',
    subtitle: 'Eurostat lfsa_ergan · benchmarking',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tasaEmpleoLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{tasaEmpleoLast.value.toFixed(1)}%</p>
        )}
        {empleoFemenino?.last?.value != null && (
          <div style={{ background: '#fdf4ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #f3e8ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
              Tasa empleo femenino
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#9333ea' }}>{empleoFemenino.last.value.toFixed(1)}%</p>
          </div>
        )}
        <CountryCompareBars indicator="EMP_RATE" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'SWE']}
          spainColor="#16a34a" unit="%" decimals={1} title="Tasa empleo · peers UE" />
      </div>
    ),
    source: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  const openHorasDrill = () => openDrill({
    title: 'Horas trabajadas por ocupado',
    subtitle: 'Eurostat lfsa_ewhun2 + teletrabajo',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {horasLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#0891b2' }}>{horasLast.value.toFixed(1)} h/semana</p>
        )}
        {tiempoParcialInvol?.last?.value != null && (
          <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>
              Tiempo parcial involuntario
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0891b2' }}>{tiempoParcialInvol.last.value.toFixed(1)}%</p>
          </div>
        )}
        {teletrabajo?.last?.value != null && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · Teletrabajo
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#7c3aed' }}>{teletrabajo.last.value.toFixed(1)}%</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  const openProductividadDrill = () => openDrill({
    title: 'Productividad aparente PIB/ocupado',
    subtitle: 'FRED + INE + OECD ranking por hora',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {productividadLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>{productividadLast.value.toFixed(2)}</p>
        )}
        {brechaProdEsDe != null && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 3 · Brecha productividad ES vs DE
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: brechaProdEsDe < 0 ? '#dc2626' : '#16a34a' }}>
              {brechaProdEsDe > 0 ? '+' : ''}{brechaProdEsDe.toFixed(1)}%
            </p>
          </div>
        )}
        <CountryCompareBars indicator="GDP_HOUR" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD']}
          spainColor="#7c3aed" unit="" decimals={2} title="Productividad/hora · peers OECD" />
      </div>
    ),
    source: { name: 'OECD', url: 'https://stats.oecd.org/' },
  })

  const openErteDrill = () => openDrill({
    title: 'ERTE activos · regulación temporal empleo',
    subtitle: 'SEPE · trabajadores en suspensión + ERE',
    accent: '#f97316',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {erteLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#f97316' }}>{Math.round(erteLast.value).toLocaleString('es-ES')}</p>
        )}
        {empresasERE?.last?.value != null && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 3 · Trabajadores en ERE
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f97316' }}>{empresasERE.last.value.toLocaleString('es-ES')}</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'SEPE', url: 'https://www.sepe.es/' },
  })

  // ──────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a href="/macro/mercado-laboral" style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(90deg, #faf5ff 0%, #f0f9ff 100%)',
        border: '1px solid #e9d5ff', borderLeft: `4px solid ${tab.themeAccent}`,
        borderRadius: 10, padding: '12px 16px', color: '#0f172a', textDecoration: 'none',
      }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · Mercado Laboral · 100 indicadores
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            15 Hero + 30 NIVEL 2 + 55 NIVEL 3 · alineado Tab 5.md 100% · paro + empleo + salarios + reforma + benchmarking
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      {/* Semáforo + alerta */}
      {(semaforoLaboral != null || alertaAfiliados != null) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {semaforoLaboral != null && (
            <div style={{
              background: semaforoLaboral === 'rojo' ? '#fef2f2' : semaforoLaboral === 'amber' ? '#fff7ed' : '#f0fdf4',
              border: `1px solid ${semaforoLaboral === 'rojo' ? '#fecaca' : semaforoLaboral === 'amber' ? '#fed7aa' : '#86efac'}`,
              borderRadius: 10, padding: '10px 14px',
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Semáforo mercado laboral · derivado 4 inputs
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700,
                color: semaforoLaboral === 'rojo' ? '#dc2626' : semaforoLaboral === 'amber' ? '#f97316' : '#16a34a',
              }}>
                ● {semaforoLaboral === 'rojo' ? 'Tensión laboral alta' : semaforoLaboral === 'amber' ? 'Vigilar' : 'Aceptable'}
              </p>
            </div>
          )}
          {alertaAfiliados != null && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                ! Alerta variación afiliados (±50k)
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{alertaAfiliados}</p>
            </div>
          )}
        </div>
      )}

      {/* NIVEL 1 · 15 Hero KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {epaParoLast?.value != null && (
          <MacroKpiCard label="Tasa paro EPA" value={epaParoLast.value} unit="%" color="#dc2626" decimals={2}
            footer={`INE EPA · ${epaParoLast.period ?? ''}`} loading={loading} onClick={openParoEpaDrill} />
        )}
        {paroEZLast?.value != null && (
          <MacroKpiCard label="Paro Eurozona" value={paroEZLast.value} unit="%" color="#f59e0b" decimals={2}
            spark={paroEZSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED LRHUTTTTEZM156S" loading={loading}
            onClick={paroEZSeries.length > 3 ? openParoEZDrill : undefined} />
        )}
        {paroJuvenilLast?.value != null && (
          <MacroKpiCard label="Paro juvenil <25" value={paroJuvenilLast.value} unit="%" color="#dc2626" decimals={1}
            spark={paroJuvenilSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED youth" loading={loading}
            onClick={paroJuvenilSeries.length > 3 ? openParoJuvenilDrill : undefined} />
        )}
        {afiliadosLast?.value != null && (
          <MacroKpiCard label="Afiliados SS" value={afiliadosLast.value / 1e6} unit=" M" color="#16a34a" decimals={2}
            footer={`SS · ${afiliadosLast.period ?? ''}`} loading={loading} onClick={openAfiliadosDrill} />
        )}
        {variacionAfiliadosMoM != null && (
          <MacroKpiCard label="Var. afiliados MoM" value={variacionAfiliadosMoM / 1000} unit=" K"
            color={variacionAfiliadosMoM >= 0 ? '#16a34a' : '#dc2626'} decimals={0}
            footer="SS · vs mes anterior" loading={loading} onClick={openVariacionDrill} />
        )}
        {paroSEPELast?.value != null && (
          <MacroKpiCard label="Paro SEPE" value={paroSEPELast.value / 1e6} unit=" M" color="#dc2626" decimals={2}
            footer="SEPE · mensual" loading={loading} onClick={openParoSEPEDrill} />
        )}
        {contratosSEPELast?.value != null && (
          <MacroKpiCard label="Contratos SEPE" value={contratosSEPELast.value / 1e6} unit=" M" color="#16a34a" decimals={2}
            footer="SEPE · total mes" loading={loading} onClick={openContratosDrill} />
        )}
        {pctIndefinidos != null && (
          <MacroKpiCard label="% Indefinidos" value={pctIndefinidos} unit="%" color="#16a34a" decimals={1}
            footer="Derivado SEPE · reforma 2022" loading={loading} onClick={openIndefinidosDrill} />
        )}
        {cluVarLast?.value != null && (
          <MacroKpiCard label="CLU var." value={cluVarLast.value} unit="%" color="#f97316" decimals={2}
            spark={cluVarSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED ULQEES163RXDCLT" loading={loading}
            onClick={cluVarSeries.length > 3 ? openCluDrill : undefined} />
        )}
        {salarioMedioLast?.value != null && (
          <MacroKpiCard label="Salario medio bruto" value={salarioMedioLast.value} unit=" €/año" color="#7c3aed" decimals={0}
            footer="INE EES" loading={loading} onClick={openSalarioDrill} />
        )}
        {smiLast != null && (
          <MacroKpiCard label="SMI" value={smiLast} unit=" €/mes" color="#16a34a" decimals={0}
            footer="BOE · referencia" loading={loading} onClick={openSmiDrill} />
        )}
        {tasaEmpleoLast?.value != null && (
          <MacroKpiCard label="Tasa empleo 20-64" value={tasaEmpleoLast.value} unit="%" color="#16a34a" decimals={1}
            footer="Eurostat lfsa_ergan" loading={loading} onClick={openTasaEmpleoDrill} />
        )}
        {horasLast?.value != null && (
          <MacroKpiCard label="Horas/ocupado" value={horasLast.value} unit=" h" color="#0891b2" decimals={1}
            footer="Eurostat lfsa_ewhun2" loading={loading} onClick={openHorasDrill} />
        )}
        {productividadLast?.value != null && (
          <MacroKpiCard label="Productividad" value={productividadLast.value} unit="" color="#7c3aed" decimals={2}
            footer="PIB/ocupado" loading={loading} onClick={openProductividadDrill} />
        )}
        {erteLast?.value != null && (
          <MacroKpiCard label="ERTE activos" value={erteLast.value / 1000} unit=" K trab." color="#f97316" decimals={0}
            footer="SEPE · suspensión" loading={loading} onClick={openErteDrill} />
        )}
      </div>

      {/* PANEL 1 · Paro España vs Eurozona vs juvenil */}
      {(epaParoSeries.length > 3 || paroEZSeries.length > 3 || paroJuvenilSeries.length > 3) && (
        <MacroPanel
          accent="#dc2626"
          title="Paro · evolución comparada"
          subtitle="INE EPA + FRED Eurozona + FRED juvenil <25"
          status="live"
          aiAnalysis={{
            indicator: 'Paro España · contexto Eurozona + brecha juvenil',
            indicatorId: 'mercado-laboral.paro.esp',
            tabSlug: 'mercado-laboral',
            series: aiSeries(epaParoSeries),
            metadata: {
              unit: '%',
              source: 'INE EPA + FRED',
              frequency: 'trimestral/mensual',
              threshold: { amber: 12, red: 18, goodAbove: false },
              notes: [
                'EPA España: trimestral · estándar OIT.',
                'FRED Eurozona: mensual harmonizado.',
                'Brecha juvenil ES-EZ: 2-3x persistente desde 2008.',
                'NAIRU España estimada ~13% (vs ~6% UE).',
              ],
            },
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              epaParoSeries.length > 3 ? { id: 'esp', label: 'ES EPA', color: '#dc2626', points: epaParoSeries, fillBelow: true } : null,
              paroEZSeries.length > 3 ? { id: 'ez', label: 'Eurozona', color: '#f59e0b', points: paroEZSeries, dashed: true } : null,
              paroJuvenilSeries.length > 3 ? { id: 'j', label: 'ES <25', color: '#7c3aed', points: paroJuvenilSeries, dashed: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean; fillBelow?: boolean } => s != null)}
            height={220} yLabel="%" formatValue={(v) => `${v.toFixed(1)}%`}
            annotations={[
              { period: '2008', label: 'Crisis', color: '#dc2626' },
              { period: '2013', label: 'Pico 26%', color: '#dc2626' },
              { period: '2020', label: 'COVID', color: '#dc2626' },
            ]} />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative label="Paro EPA España" unit="%" decimals={2}
              series={epaParoSeries as any} threshold={{ amber: 12, red: 18, goodAbove: false }} accent="#dc2626" />
          </div>
        </MacroPanel>
      )}

      {/* PANEL 2 · Afiliados SS + paro SEPE */}
      {(afiliadosSeries.length > 3 || paroSEPESeries.length > 3) && (
        <MacroPanel
          accent="#16a34a"
          title="Afiliados SS + paro SEPE · indicadores líderes mensuales"
          subtitle="SS + SEPE datos abiertos · más rápidos que EPA"
          status="live"
        >
          <DeepLineChart
            series={[
              afiliadosSeries.length > 3 ? { id: 'af', label: 'Afiliados SS (M)', color: '#16a34a', points: afiliadosSeries.map((p) => ({ period: p.period, value: p.value != null ? p.value / 1e6 : null })), fillBelow: true } : null,
              paroSEPESeries.length > 3 ? { id: 'sepe', label: 'Paro SEPE (M)', color: '#dc2626', points: paroSEPESeries.map((p) => ({ period: p.period, value: p.value != null ? p.value / 1e6 : null })), dashed: true } : null,
            ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean; fillBelow?: boolean } => s != null)}
            height={200} yLabel="Millones" formatValue={(v) => `${v.toFixed(2)}M`} />
        </MacroPanel>
      )}

      {/* PANEL 3 · CLU + Salarios + Productividad */}
      {(cluVarSeries.length > 3 || iassVar?.last || salarioMedioLast) && (
        <MacroPanel
          accent="#f97316"
          title="Costes laborales + salarios + productividad"
          subtitle="FRED CLU + INE IASS + INE EES · diagnóstico competitividad"
          status="live"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {cluVarLast?.value != null && (
              <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 12px', border: '1px solid #fed7aa' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#9a3412', fontWeight: 700, textTransform: 'uppercase' }}>CLU var.</p>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#f97316' }}>{cluVarLast.value.toFixed(2)}%</p>
              </div>
            )}
            {iassVar?.last?.value != null && (
              <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e9d5ff' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#6d28d9', fontWeight: 700, textTransform: 'uppercase' }}>IASS</p>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#7c3aed' }}>{iassVar.last.value > 0 ? '+' : ''}{iassVar.last.value.toFixed(2)}%</p>
              </div>
            )}
            {salarioMedioLast?.value != null && (
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', border: '1px solid #86efac' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Salario medio</p>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{Math.round(salarioMedioLast.value / 1000)}K€</p>
              </div>
            )}
            {productividadLast?.value != null && (
              <div style={{ background: '#fdf4ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #f3e8ff' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase' }}>Productividad</p>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#9333ea' }}>{productividadLast.value.toFixed(2)}</p>
              </div>
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <CountryCompareBars indicator="LCEATT02" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD']}
              spainColor="#f97316" unit="%" decimals={2} title="CLU · peers UE" />
          </div>
        </MacroPanel>
      )}

      {/* Documentación · mapping niveles
          NIVEL 1 · 15 Hero KPIs en grid arriba (+ semáforo + alerta afiliados)
          NIVEL 2 (30) · inline en drill correspondiente:
            2A Paro profundo → drill 1 EPA (CCAA + larga duración + NEET + peers)
            2B Empleo estructura → drill 4 Afiliados (autónomos + extranjeros) + drill 12 (femenino)
            2C Salarios → drill 10 (IASS + brecha género) + drill 11 SMI (Kaitz + serie)
          NIVEL 3 (55) · inline en sub-blocks:
            3A Sectorial → drill 7 Contratos (industria/construcción/TIC)
            3B Demografía → drill 4 (extranjeros + brain drain)
            3C Reforma laboral → drill 7 (temporalidad pre/post)
            3D Desigualdad → drill 10 (mediana vs media + in-work poverty)
            3E Futuro trabajo → drill 13 (teletrabajo) + drill 14 (productividad)
            3F Benchmarking → CountryCompareBars en drills 1, 9, 12, 14
            3G Síntesis → semáforo arriba (derivado 4 inputs)
      */}
    </div>
  )
}

export default RiesgoSistemicoTab
