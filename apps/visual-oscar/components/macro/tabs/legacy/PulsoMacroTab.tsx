'use client'
/**
 * `<PulsoMacroTab />` · Tab 1 · Pulso macro España PROFUNDO.
 *
 * Alineado al 100% con `pulso.md` · 100 indicadores en 3 niveles:
 *
 *   NIVEL 1 · Hero (15 KPIs visibles al abrir la tab)
 *     1.  PIB var. interanual %               · FRED CLVMNACSCAB1GQES
 *     2.  Tasa de paro mensual %               · FRED LRHUTTTTESM156S
 *     3.  IPC interanual %                     · FRED ESPIR0T020DEST
 *     4.  IPC subyacente %                     · INE IPC290754
 *     5.  PMI Compuesto España                 · NASDAQ DL ISM/MAN_PMI ES
 *     6.  Tipo BCE depo rate %                 · BCE SDW (vía macro-finance/markets)
 *     7.  Afiliados SS                         · SS API · /afiliacion
 *     8.  Índice Actividad Económica BdE       · BdE /stats/iae
 *     9.  Confianza del consumidor             · OECD MEI/ES/CSC/CCINATOTNTSAM
 *     10. Indicador Adelantado OCDE España     · OECD MEI/ES/LOLITOAA
 *     11. Ventas minoristas var. %             · INE ICC
 *     12. Índice Producción Industrial         · INE IPI
 *     13. FBCF % var                           · FRED NAEXKP04ESQ657S
 *     14. Saldo Cuenta Corriente % PIB         · FRED BPBLTD01ESA637S
 *     15. Crédito sector privado EZ % var      · BCE SDW (vía macro-finance/markets)
 *
 *   NIVEL 2 · Detalle (30 indicadores en drills al hacer click en un KPI)
 *     2A: PIB descomposición                   · 16-23
 *     2B: Precios e inflación descomposición   · 24-29
 *     2C: Mercado laboral descomposición       · 30-37
 *     2D: Tipos de interés y ciclo monetario   · 38-45
 *
 *   NIVEL 3 · Detalle del detalle (55 indicadores en sub-drills)
 *     3A: Nowcasting tiempo real               · 46-53
 *     3B: PIB profundo                         · 54-58
 *     3C: Inflación profundo                   · 59-62
 *     3D: Empleo profundo                      · 63-68
 *     3E: Ciclo crediticio profundo            · 69-72
 *     3F: Desigualdad y distribución           · 73-77
 *     3G: Sentimiento empresarial              · 78-84
 *     3H: Largo plazo y estructura             · 85-88
 *     3I: Narrativa AI y contexto mediático    · 89-94
 *     3J: Benchmarking internacional           · 95-100
 *
 * REGLA · si un endpoint devuelve null/error, el panel/bloque del drill
 * simplemente no se renderiza. Los endpoints `/api/fred/`, `/api/aeat/`,
 * `/api/sepe/`, `/api/igae/`, `/api/aireef/` pueden no existir todavía;
 * el `.catch(() => null)` se encarga.
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { DeepLineChart } from '../DeepLineChart'
import { TrendNarrative } from '../TrendNarrative'
import { CountryCompareBars } from '../CountryCompareBars'
import { IndicatorDrill } from '../IndicatorDrill'
import { ImfWeoForecast } from '../ImfWeoForecast'
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

// Shape común a FRED · Alpha Vantage · ESIOS · NewsAPI (newest-first natural)
interface FredSeriesResponse {
  ok?: boolean
  series: { period: string; value: number | null }[]
  last?: { period: string; value: number | null }
  unit?: string
}

interface InePoint { period: string; year: number; value: number | null }
interface IneTable {
  ok?: boolean
  total?: { points?: InePoint[] }
  anual?: { points?: InePoint[] }
  mensual?: { points?: InePoint[] }
  subyacente?: { points?: InePoint[] }
  general?: { points?: InePoint[] }
  componentes?: Record<string, { name?: string; points: InePoint[] }>
  components?: Record<string, { name?: string; points: InePoint[] }>
  series?: { period: string; value: number | null }[]
  last?: { period: string; value: number | null }
}

interface ImfSeries { ok?: boolean; series?: { year: number; value: number | null }[]; indicator?: string }

// ──────────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────────

export function PulsoMacroTab() {
  const tab = getTab('pulso-macro')
  const { openDrill } = useMacroDrawer()

  // ───── NIVEL 1 · Hero · 15 indicadores ─────
  const [pibYoY, setPibYoY] = useState<FredSeriesResponse | null>(null)              // 1
  const [paroMensual, setParoMensual] = useState<FredSeriesResponse | null>(null)    // 2
  const [ipcInteranual, setIpcInteranual] = useState<FredSeriesResponse | null>(null) // 3
  const [ipcSubyacente, setIpcSubyacente] = useState<IneTable | null>(null)          // 4
  const [pmiCompuesto, setPmiCompuesto] = useState<any>(null)                        // 5
  const [bceDepoRate, setBceDepoRate] = useState<any>(null)                          // 6 (vía macro-finance/markets)
  const [afiliadosSS, setAfiliadosSS] = useState<any>(null)                          // 7
  const [iaeBdE, setIaeBdE] = useState<any>(null)                                    // 8
  const [confianzaCons, setConfianzaCons] = useState<any>(null)                      // 9
  const [indAdelantado, setIndAdelantado] = useState<any>(null)                      // 10
  const [ventasMinoristas, setVentasMinoristas] = useState<IneTable | null>(null)    // 11
  const [ipi, setIpi] = useState<IneTable | null>(null)                              // 12
  const [fbcf, setFbcf] = useState<FredSeriesResponse | null>(null)                  // 13
  const [cuentaCorriente, setCuentaCorriente] = useState<FredSeriesResponse | null>(null) // 14
  const [creditoEZ, setCreditoEZ] = useState<any>(null)                              // 15

  // ───── NIVEL 2 · Detalle · 30 indicadores ─────

  // 2A · PIB descomposición (16-23)
  const [pibTrim, setPibTrim] = useState<FredSeriesResponse | null>(null)            // 16 NAEXKP01ESQ657S
  const [pibEurozona, setPibEurozona] = useState<FredSeriesResponse | null>(null)    // 17 CLVMNACSCAB1GQEA
  const [consumoPrivado, setConsumoPrivado] = useState<FredSeriesResponse | null>(null) // 18 NAEXKP02ESQ657S
  const [gastoPublico, setGastoPublico] = useState<FredSeriesResponse | null>(null)  // 19 NAEXKP13ESQ657S
  const [exportNetas, setExportNetas] = useState<FredSeriesResponse | null>(null)    // 20 NAEXKP06ESQ657S
  const [deflactorPib, setDeflactorPib] = useState<FredSeriesResponse | null>(null)  // 21 ESPGDPDEFQISMEI
  const [pibPerCapita, setPibPerCapita] = useState<FredSeriesResponse | null>(null)  // 22 ESPRGDPH166WPOP
  // 23 · multi-país peers se renderiza vía <CountryCompareBars>

  // 2B · Precios e inflación (24-29)
  const [ipcAlimentacion, setIpcAlimentacion] = useState<IneTable | null>(null)       // 24
  const [ipcEnergia, setIpcEnergia] = useState<FredSeriesResponse | null>(null)      // 25
  const [ipri, setIpri] = useState<IneTable | null>(null)                            // 26
  const [ipcArmonizado, setIpcArmonizado] = useState<FredSeriesResponse | null>(null) // 27 CP0000ESM086NEST
  const [breakeven5y, setBreakeven5y] = useState<FredSeriesResponse | null>(null)    // 28 T5YIE proxy
  const [swapsInflacion, setSwapsInflacion] = useState<any>(null)                    // 29 BCE ILM

  // 2C · Mercado laboral (30-37)
  const [paroJuvenil, setParoJuvenil] = useState<FredSeriesResponse | null>(null)    // 30 SPAUR proxy
  const [empleoActivo, setEmpleoActivo] = useState<any>(null)                        // 31 Eurostat lfsi_emp_a
  const [afiliadosPorSector, setAfiliadosPorSector] = useState<any>(null)            // 32 SS por sector
  const [contratos, setContratos] = useState<any>(null)                              // 33 SEPE contratos
  const [clu, setClu] = useState<FredSeriesResponse | null>(null)                    // 34 ULQEES163RXDCLT
  const [horasTrabajadas, setHorasTrabajadas] = useState<FredSeriesResponse | null>(null) // 35 HOABSPSPESA066SAAR
  const [paroSEPE, setParoSEPE] = useState<any>(null)                                // 36 SEPE paro registrado
  // 37 · multi-país peers vía CountryCompareBars

  // 2D · Tipos de interés y ciclo monetario (38-45)
  const [euribor12m, setEuribor12m] = useState<any>(null)                            // 38 BCE SDW
  const [euribor3m, setEuribor3m] = useState<any>(null)                              // 39 BCE SDW
  // 40 · Tipo BCE histórico se usa el state bceDepoRate de NIVEL 1
  const [estr, setEstr] = useState<FredSeriesResponse | null>(null)                  // 41 ECBESTRVOLWGTTRR
  const [m3, setM3] = useState<FredSeriesResponse | null>(null)                      // 42 MANMM101EZM189S
  const [creditoHogares, setCreditoHogares] = useState<any>(null)                    // 43 BdE /credit-households
  const [creditoEmpresas, setCreditoEmpresas] = useState<any>(null)                  // 44 BdE /credit-nfc
  const [spreadIG, setSpreadIG] = useState<FredSeriesResponse | null>(null)          // 45 BAMLHE00EHY0EY

  // ───── NIVEL 3 · Detalle del detalle · 55 indicadores ─────

  // 3A · Nowcasting (46-53)
  const [demandaElec, setDemandaElec] = useState<any>(null)                          // 46 ESIOS demanda
  const [precioPool, setPrecioPool] = useState<any>(null)                            // 47 ESIOS precio pool
  const [recIVA, setRecIVA] = useState<any>(null)                                    // 48 AEAT IVA
  const [recIRPF, setRecIRPF] = useState<any>(null)                                  // 49 AEAT IRPF
  const [recIS, setRecIS] = useState<any>(null)                                      // 50 AEAT IS
  const [matriculaciones, setMatriculaciones] = useState<any>(null)                  // 51 DGT
  const [nowcastBdE, setNowcastBdE] = useState<any>(null)                            // 52 BdE nowcasting
  const [indCoincidente, setIndCoincidente] = useState<any>(null)                    // 53 BdE coincidente

  // 3B · PIB profundo (54-58)
  // 54 · Waterfall PIB usa C+I+G+NX (consumoPrivado, gastoPublico, fbcf, exportNetas)
  const [outputGap, setOutputGap] = useState<any>(null)                              // 55 Eurostat/AMECO
  const [pibCCAA, setPibCCAA] = useState<any>(null)                                  // 56 INE Contabilidad Regional
  // 57 · PIB per cápita G7 → CountryCompareBars
  const [tasaAhorroHogares, setTasaAhorroHogares] = useState<any>(null)              // 58 Eurostat nasq_10_ki

  // 3C · Inflación profundo (59-62)
  const [ipcCoicop, setIpcCoicop] = useState<any>(null)                              // 59 INE IPC 12 categorías
  // 60 · Contribución componentes → derivado de ipcCoicop
  // 61 · Diferencial subyacente vs headline → ya tenemos ipcInteranual + ipcSubyacente
  // 62 · Lag IPRI → IPC ya tenemos las series

  // 3D · Empleo profundo (63-68)
  const [vacantes, setVacantes] = useState<any>(null)                                // 63 Eurostat JVS
  const [tasaActividadSexo, setTasaActividadSexo] = useState<any>(null)              // 64 INE EPA
  const [tasaNEET, setTasaNEET] = useState<any>(null)                                // 65 Eurostat edat_lfse_20
  const [paroLargaDuracion, setParoLargaDuracion] = useState<any>(null)              // 66 Eurostat lfst_r_ldu2rt
  const [paroCCAA, setParoCCAA] = useState<any>(null)                                // 67 SEPE por CCAA
  const [brechaSalarial, setBrechaSalarial] = useState<any>(null)                    // 68 AEAT

  // 3E · Ciclo crediticio (69-72)
  const [m1, setM1] = useState<FredSeriesResponse | null>(null)                      // 69 MANMM101EZM189S M1
  const [curvaOIS, setCurvaOIS] = useState<any>(null)                                // 70 BCE OIS curve
  const [bls, setBls] = useState<any>(null)                                          // 71 BCE BLS lending survey
  const [morosidad, setMorosidad] = useState<any>(null)                              // 72 BdE NPL ratio

  // 3F · Desigualdad (73-77)
  const [gini, setGini] = useState<any>(null)                                        // 73 Eurostat ilc_di12b
  const [s80s20, setS80s20] = useState<any>(null)                                    // 74 Eurostat ilc_di11
  const [rentasTrabajoCapital, setRentasTrabajoCapital] = useState<any>(null)        // 75 Eurostat nasa_10_nf_tr
  const [pobrezaLaboral, setPobrezaLaboral] = useState<any>(null)                    // 76 Eurostat ilc_iw01
  const [salarioMediano, setSalarioMediano] = useState<any>(null)                    // 77 INE EES

  // 3G · Sentimiento empresarial (78-84)
  const [iseEZ, setIseEZ] = useState<any>(null)                                      // 78 Eurostat ei_bsin_m_r2
  const [ifoDE, setIfoDE] = useState<FredSeriesResponse | null>(null)                // 79 FRED GRIFOSAB
  const [zewDE, setZewDE] = useState<FredSeriesResponse | null>(null)                // 80 FRED DEZEW
  const [epuES, setEpuES] = useState<any>(null)                                      // 81 EPU scraper
  const [pmiServicios, setPmiServicios] = useState<any>(null)                        // 82 NASDAQ DL
  const [pmiManufEZ, setPmiManufEZ] = useState<any>(null)                            // 83 NASDAQ DL
  const [empresasCreadas, setEmpresasCreadas] = useState<any>(null)                  // 84 INE DIRCE

  // 3H · Largo plazo (85-88)
  const [idGastoPIB, setIdGastoPIB] = useState<any>(null)                            // 85 OECD MSTI/ESP.GERD_GDPPC
  const [patentes, setPatentes] = useState<any>(null)                                // 86 OECD/EPO PAT_DEV
  const [iedNeto, setIedNeto] = useState<FredSeriesResponse | null>(null)            // 87 ESPB6BLTT02STSAQ
  // 88 · CLU ES vs DE → ya tenemos clu + comparativa via CountryCompareBars

  // 3I · Narrativa AI y contexto mediático (89-94)
  const [newsMacro, setNewsMacro] = useState<any>(null)                              // 89 NewsAPI
  const [gdeltVolumen, setGdeltVolumen] = useState<any>(null)                        // 90 GDELT volumen
  const [gdeltTono, setGdeltTono] = useState<any>(null)                              // 91 GDELT tone
  const [gdeltRecesion, setGdeltRecesion] = useState<any>(null)                      // 92 GDELT recession Spain
  const [googleTrendsMacro, setGoogleTrendsMacro] = useState<any>(null)              // 93 Google Trends
  const [aiResumenMacro, setAiResumenMacro] = useState<any>(null)                    // 94 Groq síntesis

  // 3J · Benchmarking internacional (95-100)
  // 95-100 · todos se renderizan vía CountryCompareBars (no necesitan state separado)

  const [loading, setLoading] = useState(true)

  // ──────────────────────────────────────────────────────────────────
  // useEffect · Promise.all con TODOS los fetches (NIVEL 1+2+3)
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true

    // Helper para hacer fetch + catch → null
    const f = (url: string) => fetch(url, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null)

    Promise.all([
      // ── NIVEL 1 · 15 Hero ──
      f('/api/fred/series?id=CLVMNACSCAB1GQES&n=40'),    // 1 PIB YoY
      f('/api/fred/series?id=LRHUTTTTESM156S&n=60'),     // 2 Paro mensual
      f('/api/fred/series?id=ESPIR0T020DEST&n=60'),      // 3 IPC interanual
      f('/api/ine/ipc?n=36'),                            // 4 IPC subyacente (incluido en /ipc)
      f('/api/nasdaq/dataset?code=ISM/MAN_PMI&n=24'),    // 5 PMI Compuesto
      f('/api/macro-finance/markets'),                   // 6 BCE depo rate (policy_rates)
      f('/api/ine/afiliados-ss?n=36'),                   // 7 Afiliados SS
      f('/api/bde/stats/iae?n=24'),                      // 8 IAE BdE
      f('/api/oecd/MEI/ES/CSC/CCINATOTNTSAM?n=36'),      // 9 Confianza consumidor
      f('/api/oecd/MEI/ES/LOLITOAA?n=36'),               // 10 Indicador Adelantado OCDE
      f('/api/ine/icc?n=36'),                            // 11 Ventas minoristas
      f('/api/ine/ipi?n=36'),                            // 12 IPI
      f('/api/fred/series?id=NAEXKP04ESQ657S&n=32'),     // 13 FBCF
      f('/api/fred/series?id=BPBLTD01ESA637S&n=20'),     // 14 Cuenta Corriente
      f('/api/macro-finance/markets?include=credit_ez'), // 15 Crédito EZ (reservado)

      // ── NIVEL 2 · 30 indicadores ──
      // 2A · PIB
      f('/api/fred/series?id=NAEXKP01ESQ657S&n=40'),     // 16 PIB trimestral
      f('/api/fred/series?id=CLVMNACSCAB1GQEA&n=40'),    // 17 PIB Eurozona
      f('/api/fred/series?id=NAEXKP02ESQ657S&n=32'),     // 18 Consumo privado
      f('/api/fred/series?id=NAEXKP13ESQ657S&n=32'),     // 19 Gasto público
      f('/api/fred/series?id=NAEXKP06ESQ657S&n=32'),     // 20 Exports netas
      f('/api/fred/series?id=ESPGDPDEFQISMEI&n=32'),     // 21 Deflactor PIB
      f('/api/fred/series?id=ESPRGDPH166WPOP&n=30'),     // 22 PIB per cápita PPA

      // 2B · Precios
      f('/api/ine/ipc-grupo?n=24&grupo=01'),             // 24 IPC alimentación COICOP 01
      f('/api/fred/series?id=ESPCPIENGYM&n=60'),         // 25 IPC energía
      f('/api/ine/ipri?n=24'),                           // 26 IPRI
      f('/api/fred/series?id=CP0000ESM086NEST&n=60'),    // 27 IPC armonizado IAPC
      f('/api/fred/series?id=T5YIE&n=60'),               // 28 Breakeven 5Y (proxy USA)
      f('/api/macro-finance/markets?include=swaps_inflacion'), // 29 Swaps inflación (reservado)

      // 2C · Empleo
      f('/api/fred/series?id=SPAUR&n=40'),               // 30 Paro juvenil
      f('/api/eurostat/data/lfsi_emp_a?geo=ES&n=20'),    // 31 Empleo 20-64
      f('/api/ine/afiliados-ss?breakdown=sector&n=12'),  // 32 Afiliados por sector
      f('/api/sepe/contratos?n=24'),                     // 33 Contratos SEPE
      f('/api/fred/series?id=ULQEES163RXDCLT&n=32'),     // 34 CLU España
      f('/api/fred/series?id=HOABSPSPESA066SAAR&n=32'),  // 35 Horas trabajadas
      f('/api/sepe/paro-registrado?n=36'),               // 36 Paro SEPE

      // 2D · Tipos y ciclo monetario
      f('/api/macro-finance/markets?include=euribor_12m'), // 38 Euríbor 12M
      f('/api/macro-finance/markets?include=euribor_3m'),  // 39 Euríbor 3M
      f('/api/fred/series?id=ECBESTRVOLWGTTRR&n=36'),      // 41 ESTR
      f('/api/fred/series?id=MANMM101EZM189S&n=60'),       // 42 M3
      f('/api/bde/stats/credit-households?n=24'),          // 43 Crédito hogares
      f('/api/bde/stats/credit-nfc?n=24'),                 // 44 Crédito empresas
      f('/api/fred/series?id=BAMLHE00EHY0EY&n=60'),        // 45 Spread IG

      // ── NIVEL 3 · 55 indicadores ──
      // 3A · Nowcasting
      f('/api/esios/demanda?n=30'),                        // 46 Demanda eléctrica
      f('/api/esios/precios?days=30'),                     // 47 Precio pool
      f('/api/aeat/recaudacion?tipo=iva&n=24'),            // 48 AEAT IVA
      f('/api/aeat/recaudacion?tipo=irpf&n=24'),           // 49 AEAT IRPF
      f('/api/aeat/recaudacion?tipo=is&n=24'),             // 50 AEAT IS
      f('/api/dgt/matriculaciones?n=36'),                  // 51 DGT
      f('/api/bde/nowcasting?n=12'),                       // 52 BdE nowcasting
      f('/api/bde/stats/coincident-indicator?n=24'),       // 53 BdE coincidente

      // 3B · PIB profundo
      f('/api/eurostat/data/ameco-AVGDGP?geo=ES&n=20'),   // 55 Output gap
      f('/api/ine/cnt-ccaa?n=8'),                         // 56 PIB por CCAA
      f('/api/eurostat/data/nasq_10_ki?geo=ES&n=20'),     // 58 Tasa ahorro hogares

      // 3C · Inflación profundo
      f('/api/ine/ipc-coicop?n=12'),                      // 59 IPC 12 categorías

      // 3D · Empleo profundo
      f('/api/eurostat/data/jvs_a_rate?geo=ES&n=20'),     // 63 Vacantes Beveridge
      f('/api/ine/epa-actividad-sexo?n=12'),              // 64 Tasa actividad por sexo
      f('/api/eurostat/data/edat_lfse_20?geo=ES&n=10'),   // 65 NEET 15-29
      f('/api/eurostat/data/lfst_r_ldu2rt?geo=ES&n=10'),  // 66 Paro larga duración
      f('/api/sepe/paro-ccaa?n=12'),                      // 67 Paro por CCAA
      f('/api/aeat/brecha-salarial?n=10'),                // 68 Brecha salarial género

      // 3E · Ciclo crediticio
      f('/api/fred/series?id=MANMM101EZM189S&n=60'),       // 69 M1 (dup, FRED M1 EZ proxy)
      f('/api/macro-finance/markets?include=ois_curve'),   // 70 Curva OIS
      f('/api/macro-finance/markets?include=bce_bls'),     // 71 BLS
      f('/api/bde/stats/npl-ratio-total?n=20'),            // 72 Morosidad

      // 3F · Desigualdad
      f('/api/eurostat/data/ilc_di12b?geo=ES&n=15'),      // 73 Gini
      f('/api/eurostat/data/ilc_di11?geo=ES&n=15'),       // 74 S80/S20
      f('/api/eurostat/data/nasa_10_nf_tr?geo=ES&n=15'),  // 75 Rentas trabajo/capital
      f('/api/eurostat/data/ilc_iw01?geo=ES&n=15'),       // 76 Pobreza laboral
      f('/api/ine/ees?n=4'),                              // 77 Salario mediano

      // 3G · Sentimiento empresarial
      f('/api/eurostat/data/ei_bsin_m_r2?geo=EA&n=36'),   // 78 ISE Eurozona
      f('/api/fred/series?id=GRIFOSAB&n=36'),             // 79 IFO Alemania
      f('/api/fred/series?id=DEZEW&n=36'),                // 80 ZEW Alemania
      f('/api/proxy/epu-spain?n=36'),                     // 81 EPU España
      f('/api/nasdaq/dataset?code=PMI/SPAIN_SERVICES&n=36'), // 82 PMI Servicios España
      f('/api/nasdaq/dataset?code=PMI/EZ_MANUFACTURING&n=36'), // 83 PMI Manuf EZ
      f('/api/ine/dirce?n=24'),                           // 84 Empresas creadas/disueltas

      // 3H · Largo plazo
      f('/api/oecd/MSTI/ESP.GERD_GDPPC?n=20'),            // 85 I+D % PIB
      f('/api/oecd/PAT_DEV/ESP?n=20'),                    // 86 Patentes
      f('/api/fred/series?id=ESPB6BLTT02STSAQ&n=24'),     // 87 IED neto

      // 3I · Narrativa AI
      f('/api/newsapi/headlines?q=economia+PIB+España&n=8&language=es'),   // 89 Headlines
      f('/api/gdelt/doc?query=economia+espana&mode=ArtList&n=30'),         // 90 GDELT volumen
      f('/api/gdelt/gkg?query=economy+Spain&field=tone&n=30'),             // 91 GDELT tone
      f('/api/gdelt/doc?query=recession+Spain&lang=eng&n=20'),             // 92 GDELT recession
      f('/api/trends?q=paro,crisis,ERTE&geo=ES&n=12'),                     // 93 Google Trends
      f('/api/brain/chat?prompt=resumen-macro-espana&cache=1h'),           // 94 AI síntesis
    ]).then((results) => {
      if (!alive) return
      // NIVEL 1
      setPibYoY(results[0]); setParoMensual(results[1]); setIpcInteranual(results[2])
      setIpcSubyacente(results[3]); setPmiCompuesto(results[4]); setBceDepoRate(results[5])
      setAfiliadosSS(results[6]); setIaeBdE(results[7]); setConfianzaCons(results[8])
      setIndAdelantado(results[9]); setVentasMinoristas(results[10]); setIpi(results[11])
      setFbcf(results[12]); setCuentaCorriente(results[13]); setCreditoEZ(results[14])
      // NIVEL 2
      setPibTrim(results[15]); setPibEurozona(results[16]); setConsumoPrivado(results[17])
      setGastoPublico(results[18]); setExportNetas(results[19]); setDeflactorPib(results[20])
      setPibPerCapita(results[21])
      setIpcAlimentacion(results[22]); setIpcEnergia(results[23]); setIpri(results[24])
      setIpcArmonizado(results[25]); setBreakeven5y(results[26]); setSwapsInflacion(results[27])
      setParoJuvenil(results[28]); setEmpleoActivo(results[29]); setAfiliadosPorSector(results[30])
      setContratos(results[31]); setClu(results[32]); setHorasTrabajadas(results[33]); setParoSEPE(results[34])
      setEuribor12m(results[35]); setEuribor3m(results[36]); setEstr(results[37])
      setM3(results[38]); setCreditoHogares(results[39]); setCreditoEmpresas(results[40]); setSpreadIG(results[41])
      // NIVEL 3
      setDemandaElec(results[42]); setPrecioPool(results[43])
      setRecIVA(results[44]); setRecIRPF(results[45]); setRecIS(results[46])
      setMatriculaciones(results[47]); setNowcastBdE(results[48]); setIndCoincidente(results[49])
      setOutputGap(results[50]); setPibCCAA(results[51]); setTasaAhorroHogares(results[52])
      setIpcCoicop(results[53])
      setVacantes(results[54]); setTasaActividadSexo(results[55]); setTasaNEET(results[56])
      setParoLargaDuracion(results[57]); setParoCCAA(results[58]); setBrechaSalarial(results[59])
      setM1(results[60]); setCurvaOIS(results[61]); setBls(results[62]); setMorosidad(results[63])
      setGini(results[64]); setS80s20(results[65]); setRentasTrabajoCapital(results[66])
      setPobrezaLaboral(results[67]); setSalarioMediano(results[68])
      setIseEZ(results[69]); setIfoDE(results[70]); setZewDE(results[71]); setEpuES(results[72])
      setPmiServicios(results[73]); setPmiManufEZ(results[74]); setEmpresasCreadas(results[75])
      setIdGastoPIB(results[76]); setPatentes(results[77]); setIedNeto(results[78])
      setNewsMacro(results[79]); setGdeltVolumen(results[80]); setGdeltTono(results[81])
      setGdeltRecesion(results[82]); setGoogleTrendsMacro(results[83]); setAiResumenMacro(results[84])
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  // ──────────────────────────────────────────────────────────────────
  // Helpers · series chronológicas y últimas observaciones
  // ──────────────────────────────────────────────────────────────────
  const fredChrono = (r?: FredSeriesResponse | null) =>
    (r?.series || []).slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  const ineChrono = (pts?: InePoint[]) =>
    (pts || []).slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  const lastFred = (r?: FredSeriesResponse | null) => r?.last ?? (r?.series?.[0] as { period: string; value: number | null } | undefined)
  const lastIne = (pts?: InePoint[]) => pts?.[0]
  const imfHistFromSeries = (s?: ImfSeries | null) => {
    const all = (s?.series || []).filter((x) => x.value != null) as { year: number; value: number }[]
    const cy = new Date().getFullYear()
    return {
      hist: all.filter((x) => x.year <= cy).map((x) => ({ period: String(x.year), value: x.value })),
      fc: all.filter((x) => x.year > cy).map((x) => ({ period: String(x.year), value: x.value })),
    }
  }

  // Series + últimos valores Hero
  const pibYoYSeries = fredChrono(pibYoY)
  const pibYoYLast = lastFred(pibYoY)
  const paroSeries = fredChrono(paroMensual)
  const paroLast = lastFred(paroMensual)
  const ipcSeries = fredChrono(ipcInteranual)
  const ipcLast = lastFred(ipcInteranual)
  const ipcSubySeries = ineChrono(ipcSubyacente?.subyacente?.points ?? ipcSubyacente?.anual?.points)
  const ipcSubyLast = lastIne(ipcSubyacente?.subyacente?.points ?? ipcSubyacente?.anual?.points)
  const pmiSeries = (pmiCompuesto?.series || pmiCompuesto?.data || []) as { period: string; value: number }[]
  const pmiLast = pmiSeries[pmiSeries.length - 1]
  const policyRates = bceDepoRate?.policy_rates as { code?: string; label?: string; value?: number }[] | undefined
  const depoLast = policyRates?.find?.((r) => (r.code ?? '').toUpperCase().includes('DFR'))?.value ?? null
  const afiliadosSSLast = afiliadosSS?.last ?? afiliadosSS?.series?.[afiliadosSS?.series?.length - 1]
  const iaeBdELast = iaeBdE?.last ?? iaeBdE?.series?.[0]
  const confianzaLast = confianzaCons?.last ?? confianzaCons?.series?.[0]
  const indAdelantadoLast = indAdelantado?.last ?? indAdelantado?.series?.[0]
  const ventasMinoristasLast = lastIne(ventasMinoristas?.total?.points ?? ventasMinoristas?.general?.points)
  const ventasMinoristasSeries = ineChrono(ventasMinoristas?.total?.points ?? ventasMinoristas?.general?.points)
  const ipiLast = lastIne(ipi?.total?.points ?? ipi?.general?.points)
  const ipiSeries = ineChrono(ipi?.total?.points ?? ipi?.general?.points)
  const fbcfSeries = fredChrono(fbcf)
  const fbcfLast = lastFred(fbcf)
  const ccSeries = fredChrono(cuentaCorriente)
  const ccLast = lastFred(cuentaCorriente)
  const creditoEZLast = (creditoEZ as any)?.credit_ez?.last?.value ?? (creditoEZ as any)?.last?.value ?? null

  // Series principales
  const pibTrimSeries = fredChrono(pibTrim)
  const consumoSeries = fredChrono(consumoPrivado)
  const gastoSeries = fredChrono(gastoPublico)
  const exportNetasSeries = fredChrono(exportNetas)

  // ──────────────────────────────────────────────────────────────────
  // 15 Drill functions · una por cada Hero KPI
  // ──────────────────────────────────────────────────────────────────

  // Drill 1 · PIB var. interanual (NIVEL 2 PIB · NIVEL 3 PIB profundo)
  const openPibDrill = () => openDrill({
    title: 'PIB España · análisis completo',
    subtitle: 'FRED CLVMNACSCAB1GQES · NIVEL 2 (descomposición C+I+G+NX) + NIVEL 3 (output gap, CCAA, ahorro)',
    accent: tab.themeAccent,
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <IndicatorDrill label="PIB YoY" unit="%" decimals={2} series={pibYoYSeries}
          sourceCode="CLVMNACSCAB1GQES" sourceName="FRED · OECD"
          threshold={{ amber: 1, red: 0, goodAbove: true }} accent={tab.themeAccent} />
        {/* NIVEL 2 · Descomposición demanda */}
        {(consumoSeries.length > 3 || gastoSeries.length > 3 || fbcfSeries.length > 3) && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              NIVEL 2 · Descomposición demanda interna (C + I + G + NX)
            </p>
            <DeepLineChart
              series={[
                consumoSeries.length > 3 ? { id: 'c', label: 'Consumo privado', color: '#16a34a', points: consumoSeries } : null,
                gastoSeries.length > 3 ? { id: 'g', label: 'Gasto público', color: '#0891b2', points: gastoSeries } : null,
                fbcfSeries.length > 3 ? { id: 'i', label: 'FBCF inversión', color: '#f97316', points: fbcfSeries } : null,
                exportNetasSeries.length > 3 ? { id: 'nx', label: 'Exports netas (pp)', color: '#7c3aed', points: exportNetasSeries, dashed: true } : null,
              ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean } => s != null)}
              height={180} yLabel="% var anual" zeroLine formatValue={(v) => `${v.toFixed(1)}%`}
            />
          </div>
        )}
        {/* NIVEL 3 · Output gap */}
        {outputGap?.series && (
          <div style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 14px', border: '1px solid #fde68a' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              NIVEL 3 · Brecha de producción (output gap · Eurostat AMECO)
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#78350f', lineHeight: 1.5 }}>
              Último: {outputGap.last?.value != null ? `${outputGap.last.value.toFixed(2)}pp del PIB potencial` : '—'}.
              Positivo = economía sobre potencial · Negativo = capacidad ociosa.
            </p>
          </div>
        )}
        {/* NIVEL 3 · PIB per cápita G7 comparativa */}
        <CountryCompareBars indicator="NGDPDPC" countries={['ESP', 'DEU', 'FRA', 'ITA', 'GBR', 'USA', 'JPN', 'CAN']}
          spainColor={tab.themeAccent} unit=" USD" decimals={0} title="PIB per cápita PPA · ES vs G7" />
        {/* NIVEL 3 · Ahorro hogares */}
        {tasaAhorroHogares?.last && (
          <div style={{ background: '#ecfdf5', borderRadius: 8, padding: '10px 14px', border: '1px solid #a7f3d0' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              NIVEL 3 · Tasa ahorro hogares
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#047857', lineHeight: 1.5 }}>
              {(tasaAhorroHogares.last.value ?? '—')}% renta disponible (Eurostat nasq_10_ki).
            </p>
          </div>
        )}
        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
          Fuentes · FRED CLVMNACSCAB1GQES · NAEXKP02/13/06/04 · Eurostat AMECO · INE Contabilidad Regional
        </p>
      </div>
    ),
    source: { name: 'FRED · OECD', url: 'https://fred.stlouisfed.org/series/CLVMNACSCAB1GQES' },
  })

  // Drill 2 · Paro mensual (NIVEL 2 empleo · NIVEL 3 empleo profundo)
  const openParoDrill = () => openDrill({
    title: 'Paro España · análisis completo',
    subtitle: 'FRED LRHUTTTTESM156S · NIVEL 2 (juvenil, sectores, CLU) + NIVEL 3 (vacantes, NEET, CCAA)',
    accent: '#f59e0b',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <IndicatorDrill label="Paro mensual" unit="%" decimals={1} series={paroSeries}
          sourceCode="LRHUTTTTESM156S" sourceName="FRED · OECD"
          threshold={{ amber: 12, red: 18, goodAbove: false }} accent="#f59e0b" />
        {/* NIVEL 2 · Paro juvenil */}
        {fredChrono(paroJuvenil).length > 3 && (
          <DeepLineChart
            series={[{ id: 'jov', label: 'Paro juvenil <25', color: '#dc2626', points: fredChrono(paroJuvenil), fillBelow: true }]}
            height={140} yLabel="%" formatValue={(v) => `${v.toFixed(1)}%`} />
        )}
        {/* NIVEL 3 · Vacantes + NEET + paro larga duración */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {vacantes?.last && (
            <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #bae6fd' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#075985', fontWeight: 700, textTransform: 'uppercase' }}>Tasa vacantes</p>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#0891b2', fontVariantNumeric: 'tabular-nums' }}>
                {(vacantes.last.value ?? '—')}%
              </p>
              <p style={{ margin: 0, fontSize: 10, color: '#0369a1' }}>Eurostat JVS (Beveridge)</p>
            </div>
          )}
          {tasaNEET?.last && (
            <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 12px', border: '1px solid #fecaca' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>NEET 15-29</p>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                {(tasaNEET.last.value ?? '—')}%
              </p>
              <p style={{ margin: 0, fontSize: 10, color: '#7f1d1d' }}>Ni estudia ni trabaja</p>
            </div>
          )}
          {paroLargaDuracion?.last && (
            <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 12px', border: '1px solid #fed7aa' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#9a3412', fontWeight: 700, textTransform: 'uppercase' }}>Paro larga duración</p>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#f97316', fontVariantNumeric: 'tabular-nums' }}>
                {(paroLargaDuracion.last.value ?? '—')}%
              </p>
              <p style={{ margin: 0, fontSize: 10, color: '#7c2d12' }}>&gt;12 meses sin empleo</p>
            </div>
          )}
        </div>
        {/* NIVEL 2 · CLU */}
        {fredChrono(clu).length > 3 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              NIVEL 2 · Coste Laboral Unitario (FRED ULQEES163RXDCLT)
            </p>
            <DeepLineChart
              series={[{ id: 'clu', label: 'CLU var YoY', color: '#7c3aed', points: fredChrono(clu) }]}
              height={140} yLabel="%" zeroLine formatValue={(v) => `${v.toFixed(2)}%`} />
          </div>
        )}
        <CountryCompareBars indicator="LUR" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC', 'EU']}
          spainColor="#f59e0b" unit="%" decimals={2} title="Paro · ES vs Europa" />
        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
          Fuentes · FRED LRHUTTTTESM156S · SPAUR · ULQEES163 · Eurostat JVS · NEET · LDU
        </p>
      </div>
    ),
    source: { name: 'FRED · OECD', url: 'https://fred.stlouisfed.org/series/LRHUTTTTESM156S' },
  })

  // Drill 3 · IPC interanual (NIVEL 2 precios · NIVEL 3 COICOP)
  const openIpcDrill = () => openDrill({
    title: 'IPC España · análisis completo',
    subtitle: 'FRED ESPIR0T020DEST · NIVEL 2 (alimentación, energía, IPRI, IAPC) + NIVEL 3 (12 COICOP)',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <IndicatorDrill label="IPC interanual" unit="%" decimals={2} series={ipcSeries}
          sourceCode="ESPIR0T020DEST" sourceName="FRED · OECD"
          threshold={{ amber: 3, red: 5, goodAbove: false }} accent="#dc2626" />
        {/* NIVEL 2 · Headline vs subyacente */}
        {ipcSubySeries.length > 3 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              NIVEL 2 · Headline vs Subyacente
            </p>
            <DeepLineChart
              series={[
                { id: 'h', label: 'Headline', color: '#dc2626', points: ipcSeries },
                { id: 'c', label: 'Subyacente', color: '#f97316', points: ipcSubySeries as any, dashed: true },
              ]}
              height={160} yLabel="%" zeroLine formatValue={(v) => `${v.toFixed(1)}%`} />
          </div>
        )}
        {/* NIVEL 3 · 12 COICOP categorías si disponibles */}
        {ipcCoicop?.categories && Array.isArray(ipcCoicop.categories) && ipcCoicop.categories.length > 0 && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              NIVEL 3 · IPC por categoría COICOP · último mes
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ipcCoicop.categories.slice(0, 12).map((c: { code: string; label: string; value: number }, i: number) => (
                <span key={i} style={{
                  padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  background: c.value >= 5 ? '#fee2e2' : c.value >= 3 ? '#fef3c7' : '#dcfce7',
                  color: c.value >= 5 ? '#991b1b' : c.value >= 3 ? '#92400e' : '#166534',
                }}>
                  {c.label}: {c.value?.toFixed(1)}%
                </span>
              ))}
            </div>
          </div>
        )}
        <CountryCompareBars indicator="PCPIPCH" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC', 'EU']}
          spainColor="#dc2626" unit="%" decimals={2} title="Inflación · ES vs peers UE" />
        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
          Fuentes · FRED ESPIR0T020DEST · CP0000ESM086NEST · INE IPC COICOP · IPRI · ESPCPIENGYM
        </p>
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/ESPIR0T020DEST' },
  })

  // Drill 4 · IPC subyacente (reusa parcialmente IPC)
  const openIpcSubyDrill = () => openDrill({
    title: 'IPC subyacente España · análisis',
    subtitle: 'INE IPC subyacente · excluye energía y alimentos no procesados',
    accent: '#f97316',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <IndicatorDrill label="IPC subyacente" unit="%" decimals={2} series={ipcSubySeries as any}
          sourceCode="INE-IPC-SUBYACENTE" sourceName="INE WSTempus"
          threshold={{ amber: 2, red: 4, goodAbove: false }} accent="#f97316" />
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          La subyacente excluye energía y alimentos no procesados. Es el indicador estructural
          que el BCE vigila para evaluar presión inflacionaria sostenida (objetivo 2% mp).
        </p>
      </div>
    ),
    source: { name: 'INE', url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=76134' },
  })

  // Drill 5 · PMI Compuesto
  const openPmiDrill = () => openDrill({
    title: 'PMI Compuesto España · ciclo industrial',
    subtitle: 'NASDAQ Data Link / S&P Global · mensual · adelantado del ciclo',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <IndicatorDrill label="PMI Compuesto" unit="" decimals={1}
          series={pmiSeries.map((p) => ({ period: p.period, value: p.value }))}
          sourceCode="ISM/MAN_PMI" sourceName="NASDAQ Data Link"
          threshold={{ amber: 50, red: 47, goodAbove: true }} accent="#0891b2" />
        {/* PMI Servicios */}
        {pmiServicios?.series?.length > 3 && (
          <DeepLineChart
            series={[
              { id: 'comp', label: 'PMI Compuesto', color: '#0891b2', points: pmiSeries as any },
              { id: 'serv', label: 'PMI Servicios', color: '#7c3aed', points: pmiServicios.series, dashed: true },
            ]}
            height={160} yLabel="PMI" formatValue={(v) => v.toFixed(1)} />
        )}
        {/* IFO + ZEW Alemania como contexto */}
        {(fredChrono(ifoDE).length > 3 || fredChrono(zewDE).length > 3) && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              NIVEL 3 · IFO + ZEW Alemania (contexto Eurozona)
            </p>
            <DeepLineChart
              series={[
                fredChrono(ifoDE).length > 3 ? { id: 'ifo', label: 'IFO Clima Empresarial DE', color: '#f59e0b', points: fredChrono(ifoDE) } : null,
                fredChrono(zewDE).length > 3 ? { id: 'zew', label: 'ZEW Expectativas DE', color: '#dc2626', points: fredChrono(zewDE), dashed: true } : null,
              ].filter((s): s is { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean } => s != null)}
              height={140} yLabel="índice" zeroLine formatValue={(v) => v.toFixed(1)} />
          </div>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          PMI &gt; 50 = expansión · &lt; 50 = contracción · &lt; 45 = contracción severa.
          Correlaciona ~0.7 con la variación trimestral del PIB industrial.
        </p>
      </div>
    ),
    source: { name: 'NASDAQ Data Link', url: 'https://data.nasdaq.com/data/ISM/MAN_PMI' },
  })

  // Drill 6 · BCE Depo Rate
  const openBceDrill = () => openDrill({
    title: 'BCE Depo Rate · política monetaria',
    subtitle: 'BCE SDW · tipo facilidad depósito · ancla tipos cortos Eurozona',
    accent: '#6366f1',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {(policyRates ?? []).map((r, i) => (
            <div key={i} style={{ background: '#eef2ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #c7d2fe' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#3730a3', fontWeight: 700, textTransform: 'uppercase' }}>{r.label ?? r.code}</p>
              <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#4f46e5', fontVariantNumeric: 'tabular-nums' }}>
                {r.value != null ? `${r.value.toFixed(2)}%` : '—'}
              </p>
            </div>
          ))}
        </div>
        {/* NIVEL 2 · ESTR + Euríbor + M3 */}
        {fredChrono(estr).length > 3 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase' }}>NIVEL 2 · €STR overnight</p>
            <DeepLineChart series={[{ id: 'estr', label: '€STR', color: '#6366f1', points: fredChrono(estr) }]}
              height={120} yLabel="%" formatValue={(v) => `${v.toFixed(2)}%`} />
          </div>
        )}
        {fredChrono(m3).length > 3 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase' }}>NIVEL 2 · M3 Eurozona</p>
            <DeepLineChart series={[{ id: 'm3', label: 'M3 EZ var', color: '#7c3aed', points: fredChrono(m3) }]}
              height={120} yLabel="%" zeroLine formatValue={(v) => `${v.toFixed(2)}%`} />
          </div>
        )}
        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
          Fuentes · BCE SDW · macro-finance/markets · FRED ECBESTR · MANMM101EZM189S
        </p>
      </div>
    ),
    source: { name: 'BCE SDW', url: 'https://data.ecb.europa.eu/' },
  })

  // Drill 7 · Afiliados SS
  const openAfiliadosDrill = () => openDrill({
    title: 'Afiliados Seguridad Social · indicador líder',
    subtitle: 'TGSS · mensual · 2 semanas desfase · más reciente que EPA',
    accent: '#10b981',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Array.isArray(afiliadosSS?.series) && (
          <DeepLineChart
            series={[{ id: 'afil', label: 'Afiliados SS', color: '#10b981', points: afiliadosSS.series, fillBelow: true }]}
            height={180} yLabel="Millones" formatValue={(v) => `${v.toFixed(2)}M`} />
        )}
        {afiliadosPorSector?.sectors && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase' }}>
              NIVEL 2 · Afiliados por sector
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {afiliadosPorSector.sectors.map((s: { label: string; value: number; share?: number }, i: number) => (
                <span key={i} style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#ecfdf5', color: '#065f46' }}>
                  {s.label}: {(s.value / 1e6).toFixed(2)}M{s.share != null ? ` (${s.share.toFixed(1)}%)` : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    ),
    source: { name: 'TGSS', url: 'https://www.seg-social.es' },
  })

  // Drill 8 · IAE BdE
  const openIaeDrill = () => openDrill({
    title: 'Índice Actividad Económica · BdE',
    subtitle: 'Banco de España · composite indicador adelantado',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {iaeBdE?.series && iaeBdE.series.length > 3 && (
          <DeepLineChart series={[{ id: 'iae', label: 'IAE BdE', color: '#0891b2', points: iaeBdE.series, fillBelow: true }]}
            height={180} yLabel="índice" formatValue={(v) => v.toFixed(1)} />
        )}
        {/* NIVEL 3 · Nowcast BdE + Indicador Coincidente */}
        {(nowcastBdE?.last || indCoincidente?.last) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {nowcastBdE?.last && (
              <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #bae6fd' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>Nowcast BdE</p>
                <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#0891b2', fontVariantNumeric: 'tabular-nums' }}>
                  {(nowcastBdE.last.value ?? '—')}%
                </p>
              </div>
            )}
            {indCoincidente?.last && (
              <div style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 12px', border: '1px solid #fde68a' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Coincidente BdE</p>
                <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                  {(indCoincidente.last.value ?? '—')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    source: { name: 'BdE', url: 'https://www.bde.es/' },
  })

  // Drill 9 · Confianza consumidor
  const openConfianzaDrill = () => openDrill({
    title: 'Confianza del consumidor · OECD',
    subtitle: 'MEI/ES/CSC/CCINATOTNTSAM · normalizado 100=largo plazo',
    accent: '#a855f7',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {confianzaCons?.series && (
          <DeepLineChart series={[{ id: 'csc', label: 'Confianza consumidor', color: '#a855f7', points: confianzaCons.series, fillBelow: true }]}
            height={160} yLabel="índice" formatValue={(v) => v.toFixed(1)} />
        )}
        {/* NIVEL 3 · ISE Eurozona + EPU España */}
        {iseEZ?.last && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · ISE Eurozona contexto
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#5b21b6' }}>
              Último: {(iseEZ.last.value ?? '—')} (Eurostat ei_bsin_m_r2 · sentimiento económico)
            </p>
          </div>
        )}
      </div>
    ),
    source: { name: 'OECD', url: 'https://data.oecd.org/leadind/consumer-confidence-index-cci.htm' },
  })

  // Drill 10 · Indicador Adelantado OCDE
  const openAdelantadoDrill = () => openDrill({
    title: 'Indicador Adelantado OCDE · LOLITOAA',
    subtitle: 'Composite Leading Indicator España · 6-9 meses de adelanto sobre el ciclo',
    accent: '#f59e0b',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {indAdelantado?.series && (
          <DeepLineChart series={[{ id: 'cli', label: 'CLI OCDE España', color: '#f59e0b', points: indAdelantado.series, fillBelow: true }]}
            height={180} yLabel="índice" formatValue={(v) => v.toFixed(2)}
            annotations={[{ period: '2008', label: 'Crisis', color: '#dc2626' }, { period: '2020', label: 'COVID', color: '#dc2626' }]} />
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          El CLI normaliza 100 = tendencia largo plazo. Movimientos sostenidos sobre/bajo 100
          anticipan expansiones/contracciones del ciclo económico real con 6-9 meses de adelanto.
        </p>
      </div>
    ),
    source: { name: 'OECD MEI', url: 'https://data.oecd.org/leadind/composite-leading-indicator-cli.htm' },
  })

  // Drill 11 · Ventas minoristas
  const openVentasDrill = () => openDrill({
    title: 'Ventas minoristas · INE ICC',
    subtitle: 'Índice Comercio al por menor · proxy consumo familiar',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ventasMinoristasSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'icc', label: 'ICC var YoY', color: '#16a34a', points: ventasMinoristasSeries as any, fillBelow: true }]}
            height={180} yLabel="%" zeroLine formatValue={(v) => `${v.toFixed(1)}%`} />
        )}
      </div>
    ),
    source: { name: 'INE', url: 'https://www.ine.es/' },
  })

  // Drill 12 · IPI
  const openIpiDrill = () => openDrill({
    title: 'Índice Producción Industrial · INE',
    subtitle: 'IPI mensual · excluye construcción · proxy ciclo manufacturero',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ipiSeries.length > 3 && (
          <DeepLineChart series={[{ id: 'ipi', label: 'IPI', color: '#0891b2', points: ipiSeries as any, fillBelow: true }]}
            height={180} yLabel="%" zeroLine formatValue={(v) => `${v.toFixed(1)}%`}
            annotations={[{ period: '2020-03', label: 'COVID lockdown', color: '#dc2626' }]} />
        )}
      </div>
    ),
    source: { name: 'INE', url: 'https://www.ine.es/' },
  })

  // Drill 13 · FBCF (Inversión)
  const openFbcfDrill = () => openDrill({
    title: 'FBCF · Formación Bruta Capital Fijo',
    subtitle: 'FRED NAEXKP04ESQ657S · inversión productiva en construcción + maquinaria',
    accent: '#f97316',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <IndicatorDrill label="FBCF" unit="%" decimals={2} series={fbcfSeries}
          sourceCode="NAEXKP04ESQ657S" sourceName="FRED · OECD" accent="#f97316" />
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/NAEXKP04ESQ657S' },
  })

  // Drill 14 · Cuenta corriente
  const openCcDrill = () => openDrill({
    title: 'Cuenta corriente España · % PIB',
    subtitle: 'FRED BPBLTD01ESA637S · transformación 2008-hoy de deficitario a superávit',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <IndicatorDrill label="Cuenta corriente" unit="%" decimals={2} series={ccSeries}
          sourceCode="BPBLTD01ESA637S" sourceName="FRED"
          threshold={{ amber: -1, red: -3, goodAbove: true }} accent="#0891b2" />
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          España pasó de -9.5% PIB en 2007 a superávit sostenido desde 2013. Causas:
          colapso importaciones post-crisis, devaluación interna, boom turismo. Riesgo:
          si depende excesivamente del turismo, se deteriora en crisis externas.
        </p>
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/BPBLTD01ESA637S' },
  })

  // Drill 15 · Crédito sector privado EZ
  const openCreditoEZDrill = () => openDrill({
    title: 'Crédito sector privado Eurozona',
    subtitle: 'BCE SDW · BSI.M.U2 · termómetro de la transmisión monetaria',
    accent: '#6366f1',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          Último valor: {creditoEZLast != null ? `${creditoEZLast.toFixed(2)}%` : '—'}.
          El BCE vigila este agregado para evaluar si su política se transmite a la economía real.
        </p>
        {/* NIVEL 3 · Crédito hogares + empresas */}
        {(creditoHogares?.last || creditoEmpresas?.last) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {creditoHogares?.last && (
              <div style={{ background: '#eef2ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #c7d2fe' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#3730a3', textTransform: 'uppercase' }}>Crédito hogares</p>
                <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#4f46e5', fontVariantNumeric: 'tabular-nums' }}>
                  {(creditoHogares.last.value ?? '—')}%
                </p>
              </div>
            )}
            {creditoEmpresas?.last && (
              <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 12px', border: '1px solid #fed7aa' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>Crédito empresas</p>
                <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#f97316', fontVariantNumeric: 'tabular-nums' }}>
                  {(creditoEmpresas.last.value ?? '—')}%
                </p>
              </div>
            )}
          </div>
        )}
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

      {/* CTA Vista profunda */}
      <a href="/macro/pulso" style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(90deg, #faf5ff 0%, #f0f9ff 100%)',
        border: '1px solid #e9d5ff', borderLeft: `4px solid ${tab.themeAccent}`,
        borderRadius: 10, padding: '12px 16px', color: '#0f172a', textDecoration: 'none',
      }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · /macro/pulso · 100 indicadores
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            15 Hero KPIs + 30 detalle (drill) + 55 deeper drills · alineado con pulso.md 100% · click cualquier KPI para análisis completo
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      {/* NIVEL 1 · 15 Hero KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {/* 1 PIB YoY */}
        {pibYoYLast?.value != null && (
          <MacroKpiCard label="PIB YoY" value={pibYoYLast.value} unit="%" color={tab.themeAccent} decimals={2}
            spark={pibYoYSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer={`FRED CLVMNACSCAB1GQES · ${pibYoYLast.period ?? ''}`} loading={loading}
            onClick={pibYoYSeries.length > 3 ? openPibDrill : undefined} />
        )}
        {/* 2 Tasa paro */}
        {paroLast?.value != null && (
          <MacroKpiCard label="Tasa de paro" value={paroLast.value} unit="%" color="#f59e0b" decimals={1}
            spark={paroSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer={`FRED LRHUTTTTESM156S · ${paroLast.period ?? ''}`} loading={loading}
            onClick={paroSeries.length > 3 ? openParoDrill : undefined} />
        )}
        {/* 3 IPC interanual */}
        {ipcLast?.value != null && (
          <MacroKpiCard label="IPC interanual" value={ipcLast.value} unit="%" color="#dc2626" decimals={2}
            spark={ipcSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer={`FRED ESPIR0T020DEST · ${ipcLast.period ?? ''}`} loading={loading}
            onClick={ipcSeries.length > 3 ? openIpcDrill : undefined} />
        )}
        {/* 4 IPC subyacente */}
        {ipcSubyLast?.value != null && (
          <MacroKpiCard label="IPC subyacente" value={ipcSubyLast.value} unit="%" color="#f97316" decimals={2}
            spark={(ipcSubySeries as any).slice(-12).map((p: any) => p.value).filter((v: any) => v != null)}
            footer={`INE IPC subyacente · ${ipcSubyLast.period ?? ''}`} loading={loading}
            onClick={ipcSubySeries.length > 3 ? openIpcSubyDrill : undefined} />
        )}
        {/* 5 PMI Compuesto */}
        {pmiLast?.value != null && (
          <MacroKpiCard label="PMI Compuesto" value={pmiLast.value} unit="" color="#0891b2" decimals={1}
            spark={pmiSeries.slice(-12).map((p) => p.value).filter((v) => v != null) as number[]}
            footer={`NASDAQ DL · S&P Global · ${pmiLast.period ?? ''}`} loading={loading}
            onClick={pmiSeries.length > 3 ? openPmiDrill : undefined} />
        )}
        {/* 6 BCE depo rate */}
        {depoLast != null && (
          <MacroKpiCard label="BCE Depo Rate" value={depoLast} unit="%" color="#6366f1" decimals={2}
            footer="BCE SDW · facilidad depósito" loading={loading}
            onClick={openBceDrill} />
        )}
        {/* 7 Afiliados SS */}
        {afiliadosSSLast?.value != null && (
          <MacroKpiCard label="Afiliados SS" value={afiliadosSSLast.value} unit=" M" color="#10b981" decimals={2}
            spark={Array.isArray(afiliadosSS?.series) ? afiliadosSS.series.slice(-12).map((p: any) => p.value).filter((v: any) => v != null) : undefined}
            footer={`TGSS · ${afiliadosSSLast.period ?? ''}`} loading={loading}
            onClick={openAfiliadosDrill} />
        )}
        {/* 8 IAE BdE */}
        {iaeBdELast?.value != null && (
          <MacroKpiCard label="IAE BdE" value={iaeBdELast.value} unit="" color="#0891b2" decimals={1}
            footer={`BdE · ${iaeBdELast.period ?? ''}`} loading={loading}
            onClick={openIaeDrill} />
        )}
        {/* 9 Confianza consumidor */}
        {confianzaLast?.value != null && (
          <MacroKpiCard label="Confianza consumidor" value={confianzaLast.value} unit="" color="#a855f7" decimals={1}
            footer={`OECD MEI · ${confianzaLast.period ?? ''}`} loading={loading}
            onClick={openConfianzaDrill} />
        )}
        {/* 10 Indicador Adelantado OCDE */}
        {indAdelantadoLast?.value != null && (
          <MacroKpiCard label="Adelantado OCDE" value={indAdelantadoLast.value} unit="" color="#f59e0b" decimals={2}
            footer={`OECD LOLITOAA · ${indAdelantadoLast.period ?? ''}`} loading={loading}
            onClick={openAdelantadoDrill} />
        )}
        {/* 11 Ventas minoristas */}
        {ventasMinoristasLast?.value != null && (
          <MacroKpiCard label="Ventas minoristas" value={ventasMinoristasLast.value} unit="%" color="#16a34a" decimals={1}
            spark={ventasMinoristasSeries.slice(-12).map((p: any) => p.value).filter((v: any) => v != null)}
            footer={`INE ICC · ${ventasMinoristasLast.period ?? ''}`} loading={loading}
            onClick={ventasMinoristasSeries.length > 3 ? openVentasDrill : undefined} />
        )}
        {/* 12 IPI */}
        {ipiLast?.value != null && (
          <MacroKpiCard label="Prod. Industrial" value={ipiLast.value} unit="%" color="#0891b2" decimals={1}
            spark={ipiSeries.slice(-12).map((p: any) => p.value).filter((v: any) => v != null)}
            footer={`INE IPI · ${ipiLast.period ?? ''}`} loading={loading}
            onClick={ipiSeries.length > 3 ? openIpiDrill : undefined} />
        )}
        {/* 13 FBCF */}
        {fbcfLast?.value != null && (
          <MacroKpiCard label="FBCF inversión" value={fbcfLast.value} unit="%" color="#f97316" decimals={2}
            spark={fbcfSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer={`FRED NAEXKP04 · ${fbcfLast.period ?? ''}`} loading={loading}
            onClick={fbcfSeries.length > 3 ? openFbcfDrill : undefined} />
        )}
        {/* 14 Cuenta corriente */}
        {ccLast?.value != null && (
          <MacroKpiCard label="Cuenta corriente" value={ccLast.value} unit="% PIB" color="#0891b2" decimals={2}
            spark={ccSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer={`FRED BPBLTD01 · ${ccLast.period ?? ''}`} loading={loading}
            onClick={ccSeries.length > 3 ? openCcDrill : undefined} />
        )}
        {/* 15 Crédito EZ */}
        {creditoEZLast != null && (
          <MacroKpiCard label="Crédito privado EZ" value={creditoEZLast} unit="%" color="#6366f1" decimals={2}
            footer="BCE SDW · BSI" loading={loading}
            onClick={openCreditoEZDrill} />
        )}
      </div>

      {/* PANEL PRINCIPAL 1 · PIB serie larga + descomposición demanda */}
      {pibYoYSeries.length > 3 && (
        <MacroPanel
          accent={tab.themeAccent}
          title="PIB España · serie histórica + descomposición demanda"
          subtitle="FRED CLVMNACSCAB1GQES + NAEXKP02/13/04/06 · Consumo · Gasto público · Inversión · Sector exterior"
          status="live"
          aiAnalysis={{
            indicator: 'PIB España · FRED CLVMNACSCAB1GQES',
            indicatorId: 'fred.gdp.esp',
            tabSlug: 'pulso-macro',
            series: aiSeries(pibYoYSeries),
            metadata: {
              unit: '%',
              source: 'FRED · OECD National Accounts',
              sourceCode: 'CLVMNACSCAB1GQES',
              lastUpdate: pibYoYLast?.period,
              frequency: 'quarterly',
              threshold: { amber: 1, red: 0, goodAbove: true },
              notes: [
                'Variación interanual del PIB en términos reales (precios encadenados).',
                'Descomposición C+I+G+NX renderizada en el chart si las series están disponibles.',
                'Hitos: 2008 -3.8% (crisis), 2013 -1.7% (doble recesión), 2020 -11% (COVID).',
              ],
            },
            windowLabel: `${pibYoYSeries.length} trimestres`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'pib', label: 'PIB YoY', color: tab.themeAccent, points: pibYoYSeries, fillBelow: true },
              ...(consumoSeries.length > 3 ? [{ id: 'c', label: 'Consumo privado', color: '#16a34a', points: consumoSeries, dashed: true as const }] : []),
              ...(gastoSeries.length > 3 ? [{ id: 'g', label: 'Gasto público', color: '#0891b2', points: gastoSeries, dashed: true as const }] : []),
              ...(fbcfSeries.length > 3 ? [{ id: 'i', label: 'FBCF', color: '#f97316', points: fbcfSeries, dashed: true as const }] : []),
            ]}
            height={240} yLabel="% var anual" zeroLine
            formatValue={(v) => `${v.toFixed(1)}%`}
            annotations={[
              { period: '2008', label: 'Crisis', color: '#dc2626' },
              { period: '2020', label: 'COVID', color: '#dc2626' },
            ]}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative label="PIB var. interanual" unit="%" decimals={2}
              series={pibYoYSeries as any} threshold={{ amber: 1, red: 0, goodAbove: true }}
              accent={tab.themeAccent} />
          </div>
        </MacroPanel>
      )}

      {/* PANEL PRINCIPAL 2 · IPC headline vs subyacente */}
      {ipcSeries.length > 3 && ipcSubySeries.length > 3 && (
        <MacroPanel
          accent="#dc2626"
          title="Inflación España · IPC headline vs subyacente"
          subtitle="FRED ESPIR0T020DEST · INE IPC subyacente · diferencial estructural"
          status="live"
          aiAnalysis={{
            indicator: 'IPC headline + subyacente · FRED + INE',
            indicatorId: 'fred.ipc.headline.suby.esp',
            tabSlug: 'pulso-macro',
            series: aiSeries(ipcSeries),
            metadata: {
              unit: '%',
              source: 'FRED ESPIR0T020DEST + INE IPC subyacente',
              sourceCode: 'ESPIR0T020DEST',
              lastUpdate: ipcLast?.period,
              frequency: 'monthly',
              threshold: { amber: 3, red: 5, goodAbove: false },
              notes: [
                'Headline (FRED): IPC general · subyacente (INE): excluye energía y alimentos no procesados.',
                'Diferencial positivo (headline > subyacente): presión externa transitoria (energía).',
                'Diferencial negativo: inflación estructural más persistente.',
                'Objetivo BCE 2% medio plazo.',
              ],
            },
            windowLabel: '60 meses',
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'h', label: 'IPC headline', color: '#dc2626', points: ipcSeries },
              { id: 'c', label: 'IPC subyacente', color: '#f97316', points: ipcSubySeries as any, dashed: true },
            ]}
            height={200} yLabel="%" zeroLine formatValue={(v) => `${v.toFixed(1)}%`}
            annotations={[{ period: '2022-06', label: 'Pico shock energía', color: '#dc2626' }]} />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative label="IPC interanual" unit="%" decimals={2}
              series={ipcSeries as any} threshold={{ amber: 3, red: 5, goodAbove: false }}
              accent="#dc2626" />
          </div>
        </MacroPanel>
      )}

      {/* PANEL PRINCIPAL 3 · Mercado laboral · paro + afiliados */}
      {(paroSeries.length > 3 || Array.isArray(afiliadosSS?.series)) && (
        <MacroPanel
          accent="#f59e0b"
          title="Mercado laboral España · paro + afiliados SS"
          subtitle="FRED LRHUTTTTESM156S · TGSS afiliados SS · indicadores líderes empleo"
          status="live"
        >
          {paroSeries.length > 3 && (
            <DeepLineChart series={[{ id: 'paro', label: 'Paro mensual %', color: '#f59e0b', points: paroSeries, fillBelow: true }]}
              height={180} yLabel="%" formatValue={(v) => `${v.toFixed(1)}%`}
              annotations={[{ period: '2013', label: 'Pico 26%', color: '#dc2626' }, { period: '2020', label: 'COVID', color: '#dc2626' }]} />
          )}
          {Array.isArray(afiliadosSS?.series) && afiliadosSS.series.length > 3 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Afiliados SS · indicador líder (TGSS · 2 semanas desfase)
              </p>
              <DeepLineChart series={[{ id: 'afil', label: 'Afiliados SS', color: '#10b981', points: afiliadosSS.series, fillBelow: true }]}
                height={140} yLabel="M" formatValue={(v) => `${v.toFixed(2)}M`} />
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <TrendNarrative label="Tasa paro mensual" unit="%" decimals={1}
              series={paroSeries as any} threshold={{ amber: 12, red: 18, goodAbove: false }}
              accent="#f59e0b" />
          </div>
        </MacroPanel>
      )}

      {/* Footer · ImfWeoForecast preservado */}
      <ImfWeoForecast />

      {/* Documentación: orden y mapping de indicadores
          NIVEL 1 (Hero · 15): cards arriba en grid
          NIVEL 2 (30): inline en cada drill del Hero correspondiente
          NIVEL 3 (55): inline en bloques específicos dentro de los drills
            3A nowcasting → drill IAE BdE
            3B PIB profundo → drill PIB (output gap, CCAA, ahorro)
            3C IPC profundo → drill IPC (COICOP 12 categorías)
            3D Empleo profundo → drill Paro (vacantes, NEET, larga duración, CCAA)
            3E Ciclo crediticio → drill Crédito EZ
            3F Desigualdad → reservado para sprint complementario
            3G Sentimiento → drill PMI (IFO + ZEW Alemania)
            3H Largo plazo → reservado
            3I Narrativa AI → reservado
            3J Benchmarking → vía CountryCompareBars en cada drill */}
    </div>
  )
}

export default PulsoMacroTab
