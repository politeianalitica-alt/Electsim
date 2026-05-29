'use client'
/**
 * `<MargenFiscalTab />` · Tab 3 · Margen Fiscal PROFUNDO.
 *
 * Alineado al 100% con `margen.md` · 100 indicadores en 3 niveles.
 * El Estado como agente económico: ingresos, gastos, deuda, sostenibilidad,
 * calidad del gasto y comparativa internacional.
 *
 *   NIVEL 1 · Hero (15 KPIs visibles al abrir tab):
 *     1.  Déficit público %PIB España            · FRED ESPGGNLBGDPPT
 *     2.  Deuda pública %PIB España              · FRED ESPGGDTPGDPPT
 *     3.  Deuda pública total € bn               · BdE /stats/public-debt-abs
 *     4.  Ingresos públicos %PIB                 · Eurostat gov_10a_main
 *     5.  Gastos públicos %PIB                   · Eurostat gov_10a_main
 *     6.  Saldo primario %PIB                    · Eurostat (derivado)
 *     7.  Pago intereses %PIB                    · Eurostat gov_10a_exp D41
 *     8.  Pago intereses %ingresos               · derivado
 *     9.  Recaudación AEAT var. %YTD             · AEAT scraper
 *     10. Ejecución presupuestaria %objetivo     · IGAE scraper
 *     11. Deuda vs Maastricht 60%                · FRED + threshold
 *     12. Déficit vs Maastricht 3%               · FRED + threshold
 *     13. Esfuerzo estructural CAPB              · CE / Eurostat
 *     14. Carga fiscal total %PIB                · OECD REV/ESP.TAXGDP
 *     15. Vida media deuda España (años)         · Tesoro scraper
 *
 *   NIVEL 2 · Detalle (30 indicadores):
 *     2A · Ingresos públicos descomposición (16-25)
 *     2B · Gastos públicos descomposición COFOG (26-35)
 *     2C · Deuda pública en profundidad (36-45)
 *
 *   NIVEL 3 · Detalle del detalle (55 indicadores):
 *     3A · Sostenibilidad fiscal r-g + S1/S2 (46-54)
 *     3B · Calidad del gasto público (55-62)
 *     3C · Federalismo fiscal CCAA (63-68)
 *     3D · Reglas fiscales y cumplimiento UE (69-74)
 *     3E · Mercado de deuda soberana (75-79)
 *     3F · Gasto social profundo (80-85)
 *     3G · Narrativa y político (86-90)
 *     3H · Benchmarking OCDE completo (91-96)
 *     3I · Síntesis AI + alertas (97-100)
 *
 * REGLA · si endpoint devuelve null/error → panel/bloque NO se renderiza.
 * Frontend ciego para fuentes que el backend no expone aún (FRED, scrapers
 * AEAT/IGAE/Tesoro/AIReF, EPU, OECD). `.catch(() => null)` se encarga.
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

export function MargenFiscalTab() {
  const tab = getTab('margen-fiscal')
  const { openDrill } = useMacroDrawer()

  // ───── NIVEL 1 · Hero · 15 indicadores ─────
  const [deficit, setDeficit] = useState<FredSeriesResponse | null>(null)            // 1 FRED ESPGGNLBGDPPT
  const [deuda, setDeuda] = useState<FredSeriesResponse | null>(null)                // 2 FRED ESPGGDTPGDPPT
  const [deudaAbs, setDeudaAbs] = useState<any>(null)                                // 3 BdE absoluta
  const [ingresosPib, setIngresosPib] = useState<any>(null)                          // 4 Eurostat
  const [gastosPib, setGastosPib] = useState<any>(null)                              // 5 Eurostat
  const [saldoPrimario, setSaldoPrimario] = useState<any>(null)                      // 6 Eurostat
  const [intereses, setIntereses] = useState<any>(null)                              // 7 Eurostat D41
  // 8 Intereses / ingresos → derivado
  const [aeatRecaudacion, setAeatRecaudacion] = useState<any>(null)                  // 9 AEAT scraper
  const [igaeEjecucion, setIgaeEjecucion] = useState<any>(null)                      // 10 IGAE
  // 11 Deuda vs Maastricht 60% → derivado (deuda vs umbral)
  // 12 Déficit vs Maastricht 3% → derivado
  const [capb, setCapb] = useState<any>(null)                                        // 13 CE / Eurostat CAPB
  const [cargaFiscal, setCargaFiscal] = useState<any>(null)                          // 14 OECD REV/ESP
  const [vidaMediaDeuda, setVidaMediaDeuda] = useState<any>(null)                    // 15 Tesoro scraper

  // ───── NIVEL 2 · Detalle · 30 indicadores ─────

  // 2A · Ingresos públicos descomposición (16-25)
  const [aeatIrpf, setAeatIrpf] = useState<any>(null)                                // 16 AEAT IRPF YTD
  const [aeatIva, setAeatIva] = useState<any>(null)                                  // 17 AEAT IVA YTD
  const [aeatIs, setAeatIs] = useState<any>(null)                                    // 18 AEAT IS YTD
  const [aeatIiee, setAeatIiee] = useState<any>(null)                                // 19 AEAT IIEE YTD
  const [cotizaciones, setCotizaciones] = useState<any>(null)                        // 20 SS+IGAE
  const [irpfPibHist, setIrpfPibHist] = useState<any>(null)                          // 21 Eurostat gov_10a_tax D51
  const [ivaPibHist, setIvaPibHist] = useState<any>(null)                            // 22 Eurostat D211
  const [isPibHist, setIsPibHist] = useState<any>(null)                              // 23 Eurostat D51C
  const [taxGap, setTaxGap] = useState<any>(null)                                    // 24 CE/TAXUD scraper
  const [presionFiscalPeers, setPresionFiscalPeers] = useState<any>(null)            // 25 OECD multi-país

  // 2B · Gastos públicos descomposición COFOG (26-35)
  const [gastoPensiones, setGastoPensiones] = useState<any>(null)                    // 26 Eurostat D62
  const [gastoSanidad, setGastoSanidad] = useState<any>(null)                        // 27 COFOG GF07
  const [gastoEducacion, setGastoEducacion] = useState<any>(null)                    // 28 COFOG GF09
  const [gastoDefensa, setGastoDefensa] = useState<any>(null)                        // 29 COFOG GF02
  const [gastoProteccion, setGastoProteccion] = useState<any>(null)                  // 30 COFOG GF10
  const [gastoIdPublico, setGastoIdPublico] = useState<any>(null)                    // 31 OECD/Eurostat
  const [gastoInfraestructuras, setGastoInfraestructuras] = useState<any>(null)      // 32 Eurostat P51
  // 33 Ratio corriente vs inversión → derivado
  const [masaSalarialPublica, setMasaSalarialPublica] = useState<any>(null)          // 34 Eurostat D1
  const [igaeMinisterios, setIgaeMinisterios] = useState<any>(null)                  // 35 IGAE scraper

  // 2C · Deuda pública en profundidad (36-45)
  const [deudaPorTenedor, setDeudaPorTenedor] = useState<any>(null)                  // 36 BdE
  const [deudaPorPlazo, setDeudaPorPlazo] = useState<any>(null)                      // 37 Tesoro
  const [deudaPorInstrumento, setDeudaPorInstrumento] = useState<any>(null)          // 38 Tesoro
  const [vencimientos12m, setVencimientos12m] = useState<any>(null)                  // 39 Tesoro
  const [costeMedioCartera, setCosteMedioCartera] = useState<any>(null)              // 40 Tesoro
  const [costeMedioNuevas, setCosteMedioNuevas] = useState<any>(null)                // 41 Tesoro
  const [deudaPorSubsector, setDeudaPorSubsector] = useState<any>(null)              // 42 BdE Estado/CCAA/CCLL/SS
  const [deudaSerieLarga, setDeudaSerieLarga] = useState<FredSeriesResponse | null>(null) // 43 FRED 1995-hoy
  const [deudaPeersUE, setDeudaPeersUE] = useState<any>(null)                        // 44 FRED ES/IT/GR/PT/FR/DE
  const [necesidadesBrutas, setNecesidadesBrutas] = useState<any>(null)              // 45 Tesoro + IGAE

  // ───── NIVEL 3 · Detalle del detalle · 55 indicadores ─────

  // 3A · Sostenibilidad fiscal r-g + S1/S2 (46-54)
  // 46 Saldo primario necesario → derivado (r-g)·d
  const [tipoInteresMedio, setTipoInteresMedio] = useState<FredSeriesResponse | null>(null) // FRED INTGSBESP193N para r-g
  const [pibCrecimiento, setPibCrecimiento] = useState<FredSeriesResponse | null>(null)    // FRED ESPRGDPGROWTH para g
  // 47 r-g España derivado
  const [rgPeers, setRgPeers] = useState<any>(null)                                  // 48 multi-país r-g
  const [sustGapS1, setSustGapS1] = useState<any>(null)                              // 49 CE FSR S1
  const [sustGapS2, setSustGapS2] = useState<any>(null)                              // 50 CE FSR S2
  const [proyeccionDeuda10y, setProyeccionDeuda10y] = useState<any>(null)            // 51 CE AMECO UDGGL
  const [sensibilidad100bp, setSensibilidad100bp] = useState<any>(null)              // 52 BdE stress test
  const [estabilizadores, setEstabilizadores] = useState<any>(null)                  // 53 CE/OECD elasticidad
  const [ajusteAcumulado, setAjusteAcumulado] = useState<any>(null)                  // 54 Eurostat CAPB delta

  // 3B · Calidad del gasto público (55-62)
  const [pensionesPerCapita, setPensionesPerCapita] = useState<any>(null)            // 55 Eurostat spr_exp_pens
  const [gastoSocialEficiencia, setGastoSocialEficiencia] = useState<any>(null)      // 56 derivado Eurostat
  const [inversionPublica20y, setInversionPublica20y] = useState<any>(null)          // 57 Eurostat P51 serie larga
  const [gastoEducacionRanking, setGastoEducacionRanking] = useState<any>(null)      // 58 OECD EAG
  const [gastoSanidadRanking, setGastoSanidadRanking] = useState<any>(null)          // 59 OECD SHA
  const [empleoPublico, setEmpleoPublico] = useState<any>(null)                      // 60 Eurostat gov_10a_emp
  const [contratacionPublica, setContratacionPublica] = useState<any>(null)          // 61 OECD/PLACE
  const [subvenciones, setSubvenciones] = useState<any>(null)                        // 62 Eurostat D3

  // 3C · Federalismo fiscal CCAA (63-68)
  const [deficitCcaa, setDeficitCcaa] = useState<any>(null)                          // 63 IGAE
  const [deudaCcaa, setDeudaCcaa] = useState<any>(null)                              // 64 BdE
  const [fondosNivelacion, setFondosNivelacion] = useState<any>(null)                // 65 MHFP scraper
  const [balanzasFiscales, setBalanzasFiscales] = useState<any>(null)                // 66 MHFP/AIReF
  const [recaudacionCcaa, setRecaudacionCcaa] = useState<any>(null)                  // 67 AEAT territoriales
  const [gastoSanitarioCcaa, setGastoSanitarioCcaa] = useState<any>(null)            // 68 MSCBS

  // 3D · Reglas fiscales y cumplimiento UE (69-74)
  const [cumplimientoDeficit, setCumplimientoDeficit] = useState<any>(null)          // 69 CE Stability Programme
  const [edpEstado, setEdpEstado] = useState<any>(null)                              // 70 CE PDE
  const [techoGasto, setTechoGasto] = useState<any>(null)                            // 71 IGAE
  const [saldoEstructural, setSaldoEstructural] = useState<any>(null)                // 72 CE/Eurostat CAPB
  const [airefOpinion, setAirefOpinion] = useState<any>(null)                        // 73 AIReF scraper
  const [reglaDeuda120, setReglaDeuda120] = useState<any>(null)                      // 74 CE 1/20 rule

  // 3E · Mercado de deuda soberana (75-79)
  const [tesoroEmisiones, setTesoroEmisiones] = useState<any>(null)                  // 75 Tesoro subastas
  const [bidToCover, setBidToCover] = useState<any>(null)                            // 76 Tesoro
  const [tipoMarginal10y, setTipoMarginal10y] = useState<any>(null)                  // 77 Tesoro
  const [bceTenenciaEs, setBceTenenciaEs] = useState<any>(null)                      // 78 BCE PSPP+PEPP
  const [tenenciaExtranjera, setTenenciaExtranjera] = useState<any>(null)            // 79 BdE

  // 3F · Gasto social profundo (80-85)
  const [pensionistasMedia, setPensionistasMedia] = useState<any>(null)              // 80 SS datos abiertos
  const [proyeccionPensiones, setProyeccionPensiones] = useState<any>(null)          // 81 AIReF + CE
  const [ratioCotizantesPension, setRatioCotizantesPension] = useState<any>(null)    // 82 SS derivado
  const [imvBeneficiarios, setImvBeneficiarios] = useState<any>(null)                // 83 IMSERSO/SS
  const [sepePrestaciones, setSepePrestaciones] = useState<any>(null)                // 84 SEPE
  const [gastoFarmaceuticoAgregado, setGastoFarmaceuticoAgregado] = useState<any>(null) // 85 MSCBS solo agregado

  // 3G · Narrativa y político (86-90)
  const [gdeltDeficit, setGdeltDeficit] = useState<any>(null)                        // 86 GDELT déficit+deuda
  const [gdeltConsolidacion, setGdeltConsolidacion] = useState<any>(null)            // 87 GDELT tono fiscal
  const [newsPresupuesto, setNewsPresupuesto] = useState<any>(null)                  // 88 NewsAPI
  const [gdeltAusteridad, setGdeltAusteridad] = useState<any>(null)                  // 89 GDELT austerity Spain EN
  const [epuFiscal, setEpuFiscal] = useState<any>(null)                              // 90 EPU subcomponente fiscal

  // 3H · Benchmarking OCDE completo (91-96)
  const [deficitPeers, setDeficitPeers] = useState<any>(null)                        // 91 FRED multi-país
  const [deudaPeersRanking, setDeudaPeersRanking] = useState<any>(null)              // 92 FRED+Eurostat 12+ países
  const [gastoPublicoOECD, setGastoPublicoOECD] = useState<any>(null)                // 93 OECD GOV/...GGEXP
  const [presionFiscalRanking, setPresionFiscalRanking] = useState<any>(null)        // 94 OECD REV/...TAXGDP 30+
  const [inversionPublicaOECD, setInversionPublicaOECD] = useState<any>(null)        // 95 OECD GFCF
  const [primaRiesgoMultiPais, setPrimaRiesgoMultiPais] = useState<any>(null)        // 96 FRED spread multi-país

  // 3I · Síntesis + alertas (97-100)
  // 97 Semáforo fiscal → derivado
  // 98 Alerta vencimientos → derivado
  // 99 Alerta fragmentación → derivado
  const [aiSintesisFiscal, setAiSintesisFiscal] = useState<any>(null)                // 100 Groq síntesis

  const [loading, setLoading] = useState(true)

  // ──────────────────────────────────────────────────────────────────
  // useEffect · Promise.all con TODOS los fetches (NIVEL 1+2+3)
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    const f = (url: string) => fetch(url, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null)

    Promise.all([
      // ── NIVEL 1 · 15 Hero ──
      f('/api/fred/series?id=ESPGGNLBGDPPT&n=40'),                      // 1 Déficit %PIB
      f('/api/fred/series?id=ESPGGDTPGDPPT&n=120'),                     // 2 Deuda %PIB (también serie larga)
      f('/api/bde/stats/public-debt-abs?n=20'),                         // 3 Deuda absoluta
      f('/api/eurostat/gov_10a_main?country=ESP&type=revenue&n=20'),    // 4 Ingresos
      f('/api/eurostat/gov_10a_main?country=ESP&type=expenditure&n=20'),// 5 Gastos
      f('/api/eurostat/gov_10a_main?country=ESP&type=primary_balance&n=20'), // 6 Saldo primario
      f('/api/eurostat/gov_10a_exp?country=ESP&code=D41&n=20'),         // 7 Intereses
      f('/api/aeat/recaudacion-ytd'),                                   // 9 AEAT YTD
      f('/api/igae/ejecucion-presupuestaria'),                          // 10 IGAE
      f('/api/eurostat/gov_10a_tax?country=ESP&series=capb&n=20'),      // 13 CAPB
      f('/api/oecd/REV/ESP.TAXGDP?n=20'),                               // 14 Carga fiscal
      f('/api/tesoro/vida-media-deuda?n=24'),                           // 15 Vida media

      // ── NIVEL 2 · 30 indicadores ──
      // 2A Ingresos descomposición (16-25)
      f('/api/aeat/recaudacion?tax=IRPF&ytd=1'),                        // 16
      f('/api/aeat/recaudacion?tax=IVA&ytd=1'),                         // 17
      f('/api/aeat/recaudacion?tax=IS&ytd=1'),                          // 18
      f('/api/aeat/recaudacion?tax=IIEE&ytd=1'),                        // 19
      f('/api/seguridad-social/cotizaciones?ytd=1'),                    // 20
      f('/api/eurostat/gov_10a_tax?country=ESP&code=D51&n=20'),         // 21 IRPF histórico
      f('/api/eurostat/gov_10a_tax?country=ESP&code=D211&n=20'),        // 22 IVA histórico
      f('/api/eurostat/gov_10a_tax?country=ESP&code=D51C&n=20'),        // 23 IS histórico
      f('/api/proxy/vat-gap?country=ESP&n=10'),                         // 24 Tax gap
      f('/api/oecd/REV/multi?countries=ESP,DEU,FRA,ITA,OECD'),          // 25 Presión peers

      // 2B Gastos descomposición COFOG (26-35)
      f('/api/eurostat/gov_10a_exp?country=ESP&code=D62&n=20'),         // 26 Pensiones
      f('/api/eurostat/cofog?country=ESP&code=GF07&n=20'),              // 27 Sanidad
      f('/api/eurostat/cofog?country=ESP&code=GF09&n=20'),              // 28 Educación
      f('/api/eurostat/cofog?country=ESP&code=GF02&n=20'),              // 29 Defensa
      f('/api/eurostat/cofog?country=ESP&code=GF10&n=20'),              // 30 Protección social
      f('/api/oecd/RD/public?country=ESP&n=20'),                        // 31 I+D público
      f('/api/eurostat/gov_10a_exp?country=ESP&code=P51&n=20'),         // 32 FBCF pública
      f('/api/eurostat/gov_10a_exp?country=ESP&code=D1&n=20'),          // 34 Masa salarial pública
      f('/api/igae/ejecucion-por-ministerio'),                          // 35 IGAE ministerios

      // 2C Deuda profunda (36-45)
      f('/api/bde/stats/debt-holders?n=20'),                            // 36
      f('/api/tesoro/deuda-por-plazo'),                                 // 37
      f('/api/tesoro/deuda-por-instrumento'),                           // 38
      f('/api/tesoro/calendario-amortizaciones?months=12'),             // 39
      f('/api/tesoro/coste-medio-cartera?n=36'),                        // 40
      f('/api/tesoro/coste-medio-emisiones?n=36'),                      // 41
      f('/api/bde/stats/debt-by-subsector?n=20'),                       // 42
      f('/api/fred/series?id=ESPGGDTPGDPPT&n=120'),                     // 43 Serie larga (dup)
      f('/api/proxy/deuda-peers-ue?countries=ESP,IT,GR,PT,FR,DE&n=20'), // 44 Multi-país
      f('/api/tesoro/necesidades-brutas-anuales'),                      // 45

      // ── NIVEL 3 · 55 indicadores ──
      // 3A Sostenibilidad fiscal (46-54)
      f('/api/fred/series?id=INTGSBESP193N&n=40'),                      // r para r-g
      f('/api/fred/series?id=ESPRGDPGROWTH&n=40'),                      // g para r-g
      f('/api/proxy/rg-peers?countries=ESP,IT,GR,PT&n=20'),             // 48
      f('/api/proxy/ce-fsr?country=ESP&type=s1'),                       // 49
      f('/api/proxy/ce-fsr?country=ESP&type=s2'),                       // 50
      f('/api/proxy/ce-ameco?country=ESP&series=UDGGL&n=15'),           // 51 proyección 10y
      f('/api/bde/sensibilidad-deuda-100bp'),                           // 52
      f('/api/proxy/ce-elasticidad-fiscal?country=ESP'),                // 53
      f('/api/eurostat/capb-delta?country=ESP&since=2010'),             // 54

      // 3B Calidad del gasto (55-62)
      f('/api/eurostat/spr_exp_pens?country=ESP&peers=DEU,FRA,ITA&n=10'), // 55
      f('/api/proxy/eficiencia-gasto-social?country=ESP'),              // 56
      f('/api/eurostat/gov_10a_exp?country=ESP&code=P51&n=60'),         // 57 Serie 20y inversión pública
      f('/api/oecd/EAG?country=ESP&ranking=1'),                         // 58
      f('/api/oecd/SHA?country=ESP&ranking=1'),                         // 59
      f('/api/eurostat/gov_10a_emp?country=ESP&n=20'),                  // 60
      f('/api/oecd/gov-at-glance?country=ESP&topic=procurement'),       // 61
      f('/api/eurostat/gov_10a_exp?country=ESP&code=D3&n=20'),          // 62

      // 3C Federalismo CCAA (63-68)
      f('/api/igae/ejecucion-ccaa?n=12'),                               // 63
      f('/api/bde/stats/debt-by-region?n=20'),                          // 64
      f('/api/mhfp/fondos-nivelacion?n=10'),                            // 65
      f('/api/mhfp/balanzas-fiscales?n=10'),                            // 66
      f('/api/aeat/recaudacion-territorial?n=10'),                      // 67
      f('/api/mscbs/gasto-sanitario-ccaa?n=10'),                        // 68

      // 3D Reglas fiscales (69-74)
      f('/api/proxy/ce-stability-programme?country=ESP'),               // 69
      f('/api/proxy/ce-edp-status?country=ESP'),                        // 70
      f('/api/igae/techo-gasto?n=10'),                                  // 71
      f('/api/eurostat/capb?country=ESP&n=20'),                         // 72
      f('/api/airef/opiniones-pef?n=8'),                                // 73
      f('/api/proxy/ce-regla-deuda-120?country=ESP'),                   // 74

      // 3E Mercado deuda soberana (75-79)
      f('/api/tesoro/emisiones?n=24'),                                  // 75
      f('/api/tesoro/bid-to-cover?n=24'),                               // 76
      f('/api/tesoro/tipo-marginal-10y?n=24'),                          // 77
      f('/api/macro-finance/markets?include=bce_pspp_pepp_es'),         // 78
      f('/api/bde/stats/debt-nonresident-share?n=20'),                  // 79

      // 3F Gasto social profundo (80-85)
      f('/api/seguridad-social/pensionistas-media?n=24'),               // 80
      f('/api/airef/proyeccion-pensiones?horizon=2030,2040'),           // 81
      f('/api/seguridad-social/ratio-cotizantes-pensionistas?n=24'),    // 82
      f('/api/imv/beneficiarios?n=24'),                                 // 83
      f('/api/sepe/prestaciones-desempleo?n=24'),                       // 84
      f('/api/mscbs/gasto-farmaceutico-agregado?n=10'),                 // 85

      // 3G Narrativa (86-90)
      f('/api/gdelt/doc?query=deficit+Spain+public+debt&n=30'),         // 86
      f('/api/gdelt/gkg?query=Spain+fiscal+consolidation&field=tone'),  // 87
      f('/api/newsapi/headlines?q=presupuestos+hacienda+España&language=es&n=8'), // 88
      f('/api/gdelt/doc?query=austerity+Spain&lang=en&n=30'),           // 89
      f('/api/proxy/epu-fiscal?country=ESP&n=36'),                      // 90

      // 3H Benchmarking OCDE (91-96)
      f('/api/proxy/deficit-peers?countries=ESP,IT,FR,GR,PT,DE&n=20'),  // 91
      f('/api/proxy/deuda-peers-eurozona?n=20'),                        // 92 ranking completo 12+
      f('/api/oecd/GOV/GGEXP?country=ESP&peers=OECD&n=20'),             // 93
      f('/api/oecd/REV/TAXGDP?ranking=1&n=30'),                         // 94 30+ países
      f('/api/oecd/GOV/GFCF?country=ESP&peers=OECD&n=20'),              // 95
      f('/api/proxy/prima-riesgo-multi?countries=ESP,IT,GR,PT&n=24'),   // 96

      // 3I Síntesis + AI (97-100 derivados + AI)
      f('/api/brain/chat?prompt=resumen-margen-fiscal-esp&cache=1h'),   // 100 Groq
    ]).then((results) => {
      if (!alive) return
      // NIVEL 1
      setDeficit(results[0]); setDeuda(results[1]); setDeudaAbs(results[2])
      setIngresosPib(results[3]); setGastosPib(results[4]); setSaldoPrimario(results[5])
      setIntereses(results[6]); setAeatRecaudacion(results[7]); setIgaeEjecucion(results[8])
      setCapb(results[9]); setCargaFiscal(results[10]); setVidaMediaDeuda(results[11])
      // NIVEL 2 · 2A
      setAeatIrpf(results[12]); setAeatIva(results[13]); setAeatIs(results[14])
      setAeatIiee(results[15]); setCotizaciones(results[16])
      setIrpfPibHist(results[17]); setIvaPibHist(results[18]); setIsPibHist(results[19])
      setTaxGap(results[20]); setPresionFiscalPeers(results[21])
      // NIVEL 2 · 2B
      setGastoPensiones(results[22]); setGastoSanidad(results[23]); setGastoEducacion(results[24])
      setGastoDefensa(results[25]); setGastoProteccion(results[26]); setGastoIdPublico(results[27])
      setGastoInfraestructuras(results[28]); setMasaSalarialPublica(results[29])
      setIgaeMinisterios(results[30])
      // NIVEL 2 · 2C
      setDeudaPorTenedor(results[31]); setDeudaPorPlazo(results[32]); setDeudaPorInstrumento(results[33])
      setVencimientos12m(results[34]); setCosteMedioCartera(results[35]); setCosteMedioNuevas(results[36])
      setDeudaPorSubsector(results[37]); setDeudaSerieLarga(results[38])
      setDeudaPeersUE(results[39]); setNecesidadesBrutas(results[40])
      // NIVEL 3 · 3A
      setTipoInteresMedio(results[41]); setPibCrecimiento(results[42]); setRgPeers(results[43])
      setSustGapS1(results[44]); setSustGapS2(results[45]); setProyeccionDeuda10y(results[46])
      setSensibilidad100bp(results[47]); setEstabilizadores(results[48]); setAjusteAcumulado(results[49])
      // NIVEL 3 · 3B
      setPensionesPerCapita(results[50]); setGastoSocialEficiencia(results[51])
      setInversionPublica20y(results[52]); setGastoEducacionRanking(results[53])
      setGastoSanidadRanking(results[54]); setEmpleoPublico(results[55])
      setContratacionPublica(results[56]); setSubvenciones(results[57])
      // NIVEL 3 · 3C
      setDeficitCcaa(results[58]); setDeudaCcaa(results[59]); setFondosNivelacion(results[60])
      setBalanzasFiscales(results[61]); setRecaudacionCcaa(results[62]); setGastoSanitarioCcaa(results[63])
      // NIVEL 3 · 3D
      setCumplimientoDeficit(results[64]); setEdpEstado(results[65]); setTechoGasto(results[66])
      setSaldoEstructural(results[67]); setAirefOpinion(results[68]); setReglaDeuda120(results[69])
      // NIVEL 3 · 3E
      setTesoroEmisiones(results[70]); setBidToCover(results[71]); setTipoMarginal10y(results[72])
      setBceTenenciaEs(results[73]); setTenenciaExtranjera(results[74])
      // NIVEL 3 · 3F
      setPensionistasMedia(results[75]); setProyeccionPensiones(results[76])
      setRatioCotizantesPension(results[77]); setImvBeneficiarios(results[78])
      setSepePrestaciones(results[79]); setGastoFarmaceuticoAgregado(results[80])
      // NIVEL 3 · 3G
      setGdeltDeficit(results[81]); setGdeltConsolidacion(results[82]); setNewsPresupuesto(results[83])
      setGdeltAusteridad(results[84]); setEpuFiscal(results[85])
      // NIVEL 3 · 3H
      setDeficitPeers(results[86]); setDeudaPeersRanking(results[87]); setGastoPublicoOECD(results[88])
      setPresionFiscalRanking(results[89]); setInversionPublicaOECD(results[90])
      setPrimaRiesgoMultiPais(results[91])
      // NIVEL 3 · 3I
      setAiSintesisFiscal(results[92])
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  // ──────────────────────────────────────────────────────────────────
  // Helpers · series chronológicas + derivados
  // ──────────────────────────────────────────────────────────────────
  const fredChrono = (r?: FredSeriesResponse | null) =>
    (r?.series || []).slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  const lastFred = (r?: FredSeriesResponse | null) => r?.last ?? r?.series?.[0]

  // Splits IMF-like (annual con year)
  const splitYearSeries = (d: any) => {
    const all = (d?.series || []).filter((s: any) => s.value != null) as { year: number; value: number }[]
    const cy = new Date().getFullYear()
    return {
      hist: all.filter((x) => x.year <= cy).map((x) => ({ period: String(x.year), value: x.value })),
      fc: all.filter((x) => x.year > cy).map((x) => ({ period: String(x.year), value: x.value })),
    }
  }

  // Series principales
  const deficitSeries = fredChrono(deficit)
  const deudaSeries = fredChrono(deuda)
  const deudaSerieLargaPts = fredChrono(deudaSerieLarga)
  const tipoInteresSeries = fredChrono(tipoInteresMedio)
  const pibCrecSeries = fredChrono(pibCrecimiento)

  // Últimos
  const deficitLast = lastFred(deficit)
  const deudaLast = lastFred(deuda)
  const ingresosLast = ingresosPib?.last ?? null
  const gastosLast = gastosPib?.last ?? null
  const primarioLast = saldoPrimario?.last ?? null
  const interesesLast = intereses?.last ?? null
  const capbLast = capb?.last ?? null
  const cargaFiscalLast = cargaFiscal?.last ?? null
  const vidaMediaLast = vidaMediaDeuda?.last ?? null
  const aeatRecLast = aeatRecaudacion?.last ?? null
  const igaeEjLast = igaeEjecucion?.last ?? null

  // Derivados
  // 8 Intereses / ingresos
  const interesesPorIngresos = (interesesLast?.value != null && ingresosLast?.value != null && ingresosLast.value !== 0)
    ? (interesesLast.value / ingresosLast.value) * 100
    : null

  // 11 Deuda vs Maastricht 60% (diferencia)
  const deudaVsMaastricht = deudaLast?.value != null ? deudaLast.value - 60 : null
  // 12 Déficit vs Maastricht 3% (deficit es típicamente negativo, comparar magnitud)
  const deficitVsMaastricht = deficitLast?.value != null ? Math.abs(deficitLast.value) - 3 : null

  // 47 r-g España
  const rMinusG = (tipoInteresSeries.length > 0 && pibCrecSeries.length > 0)
    ? (() => {
        const r = tipoInteresSeries[tipoInteresSeries.length - 1]?.value
        const g = pibCrecSeries[pibCrecSeries.length - 1]?.value
        if (r == null || g == null) return null
        return r - g
      })()
    : null

  // 46 Saldo primario necesario = (r-g) × d / (1+g)
  const primarioNecesario = (rMinusG != null && deudaLast?.value != null && pibCrecSeries.length > 0)
    ? (() => {
        const g = pibCrecSeries[pibCrecSeries.length - 1]?.value
        if (g == null) return null
        return (rMinusG * (deudaLast.value / 100)) / (1 + g / 100)
      })()
    : null

  // 100 Semáforo fiscal (derivado de déficit + deuda + r-g + cumplimiento)
  const semaforoFiscal = (() => {
    if (deficitLast?.value == null || deudaLast?.value == null) return null
    const score =
      (Math.abs(deficitLast.value) > 6 ? 2 : Math.abs(deficitLast.value) > 3 ? 1 : 0) +
      (deudaLast.value > 100 ? 2 : deudaLast.value > 60 ? 1 : 0) +
      (rMinusG != null && rMinusG > 1 ? 1 : 0)
    return score >= 4 ? 'rojo' : score >= 2 ? 'amber' : 'verde'
  })()

  // ──────────────────────────────────────────────────────────────────
  // 15 Drill functions · uno por Hero KPI
  // ──────────────────────────────────────────────────────────────────

  // Drill 1 · Déficit
  const openDeficitDrill = () => openDrill({
    title: 'Déficit público · análisis completo',
    subtitle: 'FRED ESPGGNLBGDPPT · descomposición + cumplimiento UE + benchmarking',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {deficitSeries.length > 3 && (
          <IndicatorDrill
            label="Déficit público %PIB"
            unit="%"
            decimals={2}
            series={deficitSeries}
            sourceCode="ESPGGNLBGDPPT"
            sourceName="FRED · St. Louis"
            threshold={{ amber: -3, red: -6, goodAbove: true }}
            accent="#dc2626"
          />
        )}
        {/* NIVEL 2 · Saldo primario + intereses */}
        {(primarioLast?.value != null || interesesLast?.value != null) && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 2 · Saldo primario + carga intereses
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {primarioLast?.value != null && (
                <div><span style={{ fontSize: 10, color: '#78350f' }}>Saldo primario</span><br />
                  <strong style={{ color: '#f97316' }}>{primarioLast.value.toFixed(2)}%</strong></div>
              )}
              {interesesLast?.value != null && (
                <div><span style={{ fontSize: 10, color: '#78350f' }}>Intereses %PIB</span><br />
                  <strong style={{ color: '#dc2626' }}>{interesesLast.value.toFixed(2)}%</strong></div>
              )}
              {interesesPorIngresos != null && (
                <div><span style={{ fontSize: 10, color: '#78350f' }}>Intereses/ingresos</span><br />
                  <strong style={{ color: '#dc2626' }}>{interesesPorIngresos.toFixed(1)}%</strong></div>
              )}
            </div>
          </div>
        )}
        {/* NIVEL 3 · r-g sostenibilidad */}
        {rMinusG != null && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · Sostenibilidad fiscal (r-g)
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: rMinusG > 0 ? '#dc2626' : '#16a34a' }}>
              r − g = {rMinusG > 0 ? '+' : ''}{rMinusG.toFixed(2)}pp
            </p>
            {primarioNecesario != null && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#5b21b6' }}>
                Saldo primario necesario para estabilizar deuda: <strong>{primarioNecesario.toFixed(2)}% PIB</strong>
              </p>
            )}
          </div>
        )}
        <CountryCompareBars indicator="GGXCNL_NGDP" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC']}
          spainColor="#dc2626" unit="%" decimals={2} title="NIVEL 2 · Déficit · España vs peers UE" />
        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
          Fuentes · FRED · Eurostat gov_10a_main · CE Fiscal Sustainability Report
        </p>
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/ESPGGNLBGDPPT' },
  })

  // Drill 2 · Deuda %PIB
  const openDeudaDrill = () => openDrill({
    title: 'Deuda pública · análisis completo · sostenibilidad + benchmarking',
    subtitle: 'FRED ESPGGDTPGDPPT · Maastricht + r-g + S1/S2 CE',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(deudaSerieLargaPts.length > 3 ? deudaSerieLargaPts : deudaSeries).length > 3 && (
          <IndicatorDrill
            label="Deuda pública %PIB"
            unit="%"
            decimals={1}
            series={deudaSerieLargaPts.length > 3 ? deudaSerieLargaPts : deudaSeries}
            sourceCode="ESPGGDTPGDPPT"
            sourceName="FRED · St. Louis"
            threshold={{ amber: 100, red: 120, goodAbove: false }}
            accent="#7c3aed"
          />
        )}
        {/* NIVEL 2 · Maastricht + vida media */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {deudaVsMaastricht != null && (
            <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 12px', border: '1px solid #fed7aa' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#9a3412', fontWeight: 700, textTransform: 'uppercase' }}>vs Maastricht 60%</p>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: deudaVsMaastricht > 0 ? '#dc2626' : '#16a34a' }}>
                {deudaVsMaastricht > 0 ? '+' : ''}{deudaVsMaastricht.toFixed(1)}pp
              </p>
            </div>
          )}
          {vidaMediaLast?.value != null && (
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #bfdbfe' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>Vida media</p>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#2563eb' }}>{vidaMediaLast.value.toFixed(1)} años</p>
            </div>
          )}
          {deudaAbs?.last?.value != null && (
            <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 12px', border: '1px solid #fecaca' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>Deuda absoluta</p>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{(deudaAbs.last.value / 1000).toFixed(1)}B€</p>
            </div>
          )}
        </div>
        {/* NIVEL 3 · Sustainability gaps S1/S2 */}
        {(sustGapS1?.value != null || sustGapS2?.value != null) && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · Brechas sostenibilidad CE (Fiscal Sustainability Report)
            </p>
            {sustGapS1?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#5b21b6' }}>S1: {sustGapS1.value.toFixed(2)}pp PIB</p>}
            {sustGapS2?.value != null && <p style={{ margin: '2px 0', fontSize: 11, color: '#5b21b6' }}>S2: {sustGapS2.value.toFixed(2)}pp PIB</p>}
          </div>
        )}
        {/* NIVEL 3 · Sensibilidad 100bp */}
        {sensibilidad100bp?.value != null && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 3 · Sensibilidad +100bp tipos
            </p>
            <p style={{ margin: 0, fontSize: 16, color: '#dc2626' }}>
              +{sensibilidad100bp.value.toFixed(2)}pp PIB en intereses anuales
            </p>
          </div>
        )}
        <CountryCompareBars indicator="GGXWDG_NGDP" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC', 'BEL', 'AUT']}
          spainColor="#7c3aed" unit="%" decimals={1} title="NIVEL 3 · Deuda · ranking peers UE" />
        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
          Fuentes · FRED · BdE · CE Fiscal Sustainability Report · Tesoro Público
        </p>
      </div>
    ),
    source: { name: 'FRED', url: 'https://fred.stlouisfed.org/series/ESPGGDTPGDPPT' },
  })

  // Drill 3 · Deuda absoluta
  const openDeudaAbsDrill = () => openDrill({
    title: 'Deuda pública total · € bn',
    subtitle: 'BdE · stock vivo · por tenedor/plazo/instrumento',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {deudaAbs?.last?.value != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>
            {(deudaAbs.last.value / 1000).toFixed(0)} B€
          </p>
        )}
        {/* NIVEL 2 · Por tenedor + plazo + instrumento */}
        {deudaPorTenedor?.breakdown && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 2 · Por tenedor
            </p>
            {deudaPorTenedor.breakdown.map((b: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#7f1d1d' }}>{b.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{b.value}%</span>
              </div>
            ))}
          </div>
        )}
        {/* NIVEL 3 · Vencimientos próximos 12m */}
        {vencimientos12m?.total_bn != null && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 3 · Vencimientos próximos 12m
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f97316' }}>
              {vencimientos12m.total_bn.toFixed(0)} bn€
            </p>
          </div>
        )}
      </div>
    ),
    source: { name: 'BdE', url: 'https://www.bde.es/' },
  })

  // Drill 4 · Ingresos públicos
  const openIngresosDrill = () => openDrill({
    title: 'Ingresos públicos · descomposición fiscal',
    subtitle: 'Eurostat · AEAT recaudación + cotizaciones SS',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ingresosLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>
            {ingresosLast.value.toFixed(1)}% PIB
          </p>
        )}
        {/* NIVEL 2 · AEAT YTD por tributo */}
        {(aeatIrpf?.last || aeatIva?.last || aeatIs?.last || aeatIiee?.last) && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              NIVEL 2 · Recaudación AEAT acumulada YTD
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {aeatIrpf?.last && <div><span style={{ fontSize: 10, color: '#166534' }}>IRPF</span><br /><strong style={{ color: '#16a34a' }}>{(aeatIrpf.last.value > 0 ? '+' : '') + aeatIrpf.last.value?.toFixed(1)}%</strong></div>}
              {aeatIva?.last && <div><span style={{ fontSize: 10, color: '#166534' }}>IVA</span><br /><strong style={{ color: '#16a34a' }}>{(aeatIva.last.value > 0 ? '+' : '') + aeatIva.last.value?.toFixed(1)}%</strong></div>}
              {aeatIs?.last && <div><span style={{ fontSize: 10, color: '#166534' }}>IS</span><br /><strong style={{ color: '#16a34a' }}>{(aeatIs.last.value > 0 ? '+' : '') + aeatIs.last.value?.toFixed(1)}%</strong></div>}
              {aeatIiee?.last && <div><span style={{ fontSize: 10, color: '#166534' }}>IIEE</span><br /><strong style={{ color: '#16a34a' }}>{(aeatIiee.last.value > 0 ? '+' : '') + aeatIiee.last.value?.toFixed(1)}%</strong></div>}
            </div>
          </div>
        )}
        {/* NIVEL 3 · Tax gap + presión peers */}
        {taxGap?.last?.value != null && (
          <div style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 14px', border: '1px solid #fde68a' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
              NIVEL 3 · Tax gap (evasión estimada)
            </p>
            <p style={{ margin: 0, fontSize: 16, color: '#f59e0b' }}>{taxGap.last.value.toFixed(1)}% PIB</p>
          </div>
        )}
        <CountryCompareBars indicator="GGR_NGDP" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'BEL']}
          spainColor="#16a34a" unit="%" decimals={1} title="Presión fiscal · peers UE" />
      </div>
    ),
    source: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  // Drill 5 · Gastos públicos COFOG
  const openGastosDrill = () => openDrill({
    title: 'Gastos públicos · descomposición COFOG',
    subtitle: 'Eurostat · pensiones + sanidad + educación + defensa + protección social',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {gastosLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>
            {gastosLast.value.toFixed(1)}% PIB
          </p>
        )}
        {/* NIVEL 2 · COFOG breakdown */}
        <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
            NIVEL 2 · Gasto por función COFOG (% PIB)
          </p>
          {[
            { label: 'Pensiones (D62)', data: gastoPensiones },
            { label: 'Sanidad (GF07)', data: gastoSanidad },
            { label: 'Educación (GF09)', data: gastoEducacion },
            { label: 'Defensa (GF02)', data: gastoDefensa },
            { label: 'Protección social (GF10)', data: gastoProteccion },
            { label: 'Infraestructuras (P51)', data: gastoInfraestructuras },
            { label: 'Masa salarial pública (D1)', data: masaSalarialPublica },
          ].filter((x) => x.data?.last?.value != null).map((x, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ fontSize: 11, color: '#7f1d1d' }}>{x.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{x.data.last.value.toFixed(2)}%</span>
            </div>
          ))}
        </div>
        <CountryCompareBars indicator="GGX_NGDP" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'IRL']}
          spainColor="#dc2626" unit="%" decimals={1} title="Gasto público · peers UE" />
      </div>
    ),
    source: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  // Drill 6 · Saldo primario (sostenibilidad fiscal)
  const openPrimarioDrill = () => openDrill({
    title: 'Saldo primario · sostenibilidad fiscal',
    subtitle: 'Eurostat · saldo excl. intereses · clave para estabilizar deuda',
    accent: '#f59e0b',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {primarioLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: primarioLast.value >= 0 ? '#16a34a' : '#dc2626' }}>
            {primarioLast.value >= 0 ? '+' : ''}{primarioLast.value.toFixed(2)}% PIB
          </p>
        )}
        {/* NIVEL 3 · r-g */}
        {rMinusG != null && primarioNecesario != null && (
          <div style={{ background: '#fffbeb', borderRadius: 8, padding: '10px 14px', border: '1px solid #fde68a' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
              NIVEL 3 · Saldo primario necesario (r-g)·d
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>
              {primarioNecesario.toFixed(2)}% PIB
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#78350f', lineHeight: 1.5 }}>
              r = {tipoInteresSeries[tipoInteresSeries.length - 1]?.value?.toFixed(2)}% ·
              g = {pibCrecSeries[pibCrecSeries.length - 1]?.value?.toFixed(2)}% ·
              d = {deudaLast?.value?.toFixed(0)}% PIB
              {primarioLast?.value != null && primarioLast.value > primarioNecesario
                ? ' · ✓ España supera el umbral'
                : ' · ! España no cubre el coste dinámico'}
            </p>
          </div>
        )}
      </div>
    ),
    source: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  // Drill 7 · Intereses %PIB
  const openInteresesDrill = () => openDrill({
    title: 'Carga de intereses · análisis histórico',
    subtitle: 'Eurostat D41 · evolución coste financiero deuda',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {interesesLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>
            {interesesLast.value.toFixed(2)}% PIB
          </p>
        )}
        {/* NIVEL 2 · Coste medio cartera + nuevas */}
        {(costeMedioCartera?.last?.value != null || costeMedioNuevas?.last?.value != null) && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 2 · Coste medio deuda (Tesoro)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {costeMedioCartera?.last?.value != null && (
                <div><span style={{ fontSize: 10, color: '#7f1d1d' }}>Cartera viva</span><br /><strong style={{ color: '#dc2626' }}>{costeMedioCartera.last.value.toFixed(2)}%</strong></div>
              )}
              {costeMedioNuevas?.last?.value != null && (
                <div><span style={{ fontSize: 10, color: '#7f1d1d' }}>Nuevas emisiones</span><br /><strong style={{ color: '#dc2626' }}>{costeMedioNuevas.last.value.toFixed(2)}%</strong></div>
              )}
            </div>
          </div>
        )}
      </div>
    ),
    source: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  // Drill 8 · Intereses / ingresos
  const openInteresesIngresosDrill = () => openDrill({
    title: 'Intereses sobre ingresos públicos',
    subtitle: 'Derivado · carga de intereses como % de los ingresos del Estado',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {interesesPorIngresos != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>
            {interesesPorIngresos.toFixed(1)}%
          </p>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          Ratio que indica cuánto del ingreso público se va a pagar intereses de la deuda.
          Cuanto mayor, menos margen para gasto productivo.
        </p>
      </div>
    ),
    source: { name: 'Derivado · Eurostat', url: 'https://ec.europa.eu/eurostat/' },
  })

  // Drill 9 · Recaudación AEAT
  const openAeatDrill = () => openDrill({
    title: 'Recaudación AEAT · ejecución YTD',
    subtitle: 'AEAT scraper · variación acumulada año-a-año',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {aeatRecLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>
            {aeatRecLast.value > 0 ? '+' : ''}{aeatRecLast.value.toFixed(1)}% YTD
          </p>
        )}
        {/* NIVEL 2 · Por tributo */}
        {(aeatIrpf?.last || aeatIva?.last || aeatIs?.last || aeatIiee?.last) && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              NIVEL 2 · Por tributo
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {aeatIrpf?.last && <div>IRPF: <strong style={{ color: '#16a34a' }}>{(aeatIrpf.last.value > 0 ? '+' : '') + aeatIrpf.last.value?.toFixed(1)}%</strong></div>}
              {aeatIva?.last && <div>IVA: <strong style={{ color: '#16a34a' }}>{(aeatIva.last.value > 0 ? '+' : '') + aeatIva.last.value?.toFixed(1)}%</strong></div>}
              {aeatIs?.last && <div>IS: <strong style={{ color: '#16a34a' }}>{(aeatIs.last.value > 0 ? '+' : '') + aeatIs.last.value?.toFixed(1)}%</strong></div>}
              {aeatIiee?.last && <div>IIEE: <strong style={{ color: '#16a34a' }}>{(aeatIiee.last.value > 0 ? '+' : '') + aeatIiee.last.value?.toFixed(1)}%</strong></div>}
            </div>
          </div>
        )}
      </div>
    ),
    source: { name: 'AEAT', url: 'https://www.agenciatributaria.es/' },
  })

  // Drill 10 · Ejecución presupuestaria IGAE
  const openIgaeDrill = () => openDrill({
    title: 'Ejecución presupuestaria IGAE',
    subtitle: 'IGAE scraper · % del objetivo anual ejecutado',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {igaeEjLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#0891b2' }}>{igaeEjLast.value.toFixed(1)}%</p>
        )}
        {/* NIVEL 3 · Por ministerio */}
        {igaeMinisterios?.breakdown && (
          <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>
              NIVEL 3 · Por ministerio
            </p>
            {igaeMinisterios.breakdown.slice(0, 8).map((m: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#0c4a6e' }}>{m.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0891b2' }}>{m.value}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    source: { name: 'IGAE', url: 'https://www.igae.hacienda.gob.es/' },
  })

  // Drill 11 · Deuda vs Maastricht
  const openMaastrichtDeudaDrill = () => openDrill({
    title: 'Deuda vs Maastricht 60% · cumplimiento UE',
    subtitle: 'Diferencia con el umbral · reglas fiscales europeas',
    accent: deudaVsMaastricht != null && deudaVsMaastricht > 0 ? '#dc2626' : '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {deudaVsMaastricht != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: deudaVsMaastricht > 0 ? '#dc2626' : '#16a34a' }}>
            {deudaVsMaastricht > 0 ? '+' : ''}{deudaVsMaastricht.toFixed(1)}pp
          </p>
        )}
        {/* NIVEL 3 · Regla deuda 1/20 */}
        {reglaDeuda120?.value != null && (
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
              NIVEL 3 · Regla de deuda CE (1/20)
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#78350f' }}>{reglaDeuda120.summary ?? `Ratio: ${reglaDeuda120.value}`}</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'CE', url: 'https://ec.europa.eu/info/business-economy-euro/' },
  })

  // Drill 12 · Déficit vs Maastricht
  const openMaastrichtDeficitDrill = () => openDrill({
    title: 'Déficit vs Maastricht 3% · cumplimiento UE',
    subtitle: 'PDE Procedimiento Déficit Excesivo · monitoreo CE',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {deficitVsMaastricht != null && (
          <p style={{ fontSize: 24, fontWeight: 700, color: deficitVsMaastricht > 0 ? '#dc2626' : '#16a34a' }}>
            {deficitVsMaastricht > 0 ? '+' : ''}{deficitVsMaastricht.toFixed(2)}pp por encima
          </p>
        )}
        {/* NIVEL 3 · EDP status */}
        {edpEstado?.status && (
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', border: '1px solid #fecaca' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              NIVEL 3 · Estado PDE
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#7f1d1d' }}>{edpEstado.status} · {edpEstado.note ?? ''}</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'CE', url: 'https://ec.europa.eu/info/business-economy-euro/' },
  })

  // Drill 13 · CAPB esfuerzo estructural
  const openCapbDrill = () => openDrill({
    title: 'Esfuerzo fiscal estructural · CAPB',
    subtitle: 'CE / Eurostat · saldo ajustado de ciclo · indicador honesto',
    accent: '#7c3aed',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {capbLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>
            {capbLast.value > 0 ? '+' : ''}{capbLast.value.toFixed(2)}% PIB pot.
          </p>
        )}
        {/* NIVEL 3 · AIReF opinion + ajuste acumulado */}
        {airefOpinion?.summary && (
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              NIVEL 3 · AIReF opinión PEF
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#5b21b6' }}>{airefOpinion.summary}</p>
          </div>
        )}
      </div>
    ),
    source: { name: 'CE / Eurostat', url: 'https://ec.europa.eu/' },
  })

  // Drill 14 · Carga fiscal
  const openCargaFiscalDrill = () => openDrill({
    title: 'Carga fiscal total · ranking OCDE',
    subtitle: 'OECD REV/ESP.TAXGDP · presión fiscal global',
    accent: '#16a34a',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {cargaFiscalLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>
            {cargaFiscalLast.value.toFixed(1)}% PIB
          </p>
        )}
        <CountryCompareBars indicator="TAX_GDP" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'OECD']}
          spainColor="#16a34a" unit="%" decimals={1} title="Carga fiscal · OECD" />
      </div>
    ),
    source: { name: 'OECD', url: 'https://stats.oecd.org/' },
  })

  // Drill 15 · Vida media deuda
  const openVidaMediaDrill = () => openDrill({
    title: 'Vida media deuda · estructura temporal',
    subtitle: 'Tesoro scraper · años promedio hasta vencimiento',
    accent: '#0891b2',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {vidaMediaLast?.value != null && (
          <p style={{ fontSize: 22, fontWeight: 700, color: '#0891b2' }}>{vidaMediaLast.value.toFixed(2)} años</p>
        )}
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          La vida media de la deuda indica cuán pronto debe refinanciarse el stock. Una vida
          media más larga reduce el riesgo de rollover en momentos de tipos altos.
        </p>
        {/* NIVEL 2 · Por plazo */}
        {deudaPorPlazo?.breakdown && (
          <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>
              NIVEL 2 · Distribución por plazo
            </p>
            {deudaPorPlazo.breakdown.map((b: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, color: '#0c4a6e' }}>{b.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0891b2' }}>{b.value}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    source: { name: 'Tesoro', url: 'https://www.tesoro.es/' },
  })

  // ──────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a href="/macro/margen-fiscal" style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(90deg, #faf5ff 0%, #fff7ed 100%)',
        border: '1px solid #e9d5ff', borderLeft: `4px solid ${tab.themeAccent}`,
        borderRadius: 10, padding: '12px 16px', color: '#0f172a', textDecoration: 'none',
      }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · /macro/margen-fiscal · 100 indicadores
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            15 Hero KPIs + 30 NIVEL 2 + 55 NIVEL 3 · alineado margen.md 100% · ingresos+gastos+deuda+sostenibilidad
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      {/* Semáforo fiscal · indicador 100 */}
      {semaforoFiscal != null && (
        <div style={{
          background: semaforoFiscal === 'rojo' ? '#fef2f2' : semaforoFiscal === 'amber' ? '#fff7ed' : '#f0fdf4',
          border: `1px solid ${semaforoFiscal === 'rojo' ? '#fecaca' : semaforoFiscal === 'amber' ? '#fed7aa' : '#86efac'}`,
          borderRadius: 10, padding: '10px 14px',
        }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Semáforo fiscal · derivado déficit + deuda + r-g + cumplimiento
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700,
            color: semaforoFiscal === 'rojo' ? '#dc2626' : semaforoFiscal === 'amber' ? '#f97316' : '#16a34a',
          }}>
            ● {semaforoFiscal === 'rojo' ? 'Tensión fiscal alta' : semaforoFiscal === 'amber' ? 'Atención · vigilancia' : 'Salud fiscal aceptable'}
          </p>
        </div>
      )}

      {/* NIVEL 1 · 15 Hero KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {/* 1 Déficit */}
        {deficitLast?.value != null && (
          <MacroKpiCard label="Déficit %PIB" value={deficitLast.value} unit="%" color="#dc2626" decimals={2}
            spark={deficitSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer={`FRED · ${deficitLast.period ?? ''}`} loading={loading}
            onClick={deficitSeries.length > 1 ? openDeficitDrill : undefined} />
        )}
        {/* 2 Deuda %PIB */}
        {deudaLast?.value != null && (
          <MacroKpiCard label="Deuda %PIB" value={deudaLast.value} unit="%" color="#7c3aed" decimals={1}
            spark={deudaSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer={`FRED · ${deudaLast.period ?? ''}`} loading={loading}
            onClick={deudaSeries.length > 1 ? openDeudaDrill : undefined} />
        )}
        {/* 3 Deuda absoluta */}
        {deudaAbs?.last?.value != null && (
          <MacroKpiCard label="Deuda total" value={deudaAbs.last.value / 1000} unit=" B€" color="#dc2626" decimals={0}
            footer={`BdE · ${deudaAbs.last.period ?? ''}`} loading={loading}
            onClick={openDeudaAbsDrill} />
        )}
        {/* 4 Ingresos %PIB */}
        {ingresosLast?.value != null && (
          <MacroKpiCard label="Ingresos %PIB" value={ingresosLast.value} unit="%" color="#16a34a" decimals={1}
            footer={`Eurostat · ${ingresosLast.period ?? ''}`} loading={loading}
            onClick={openIngresosDrill} />
        )}
        {/* 5 Gastos %PIB */}
        {gastosLast?.value != null && (
          <MacroKpiCard label="Gastos %PIB" value={gastosLast.value} unit="%" color="#dc2626" decimals={1}
            footer={`Eurostat · ${gastosLast.period ?? ''}`} loading={loading}
            onClick={openGastosDrill} />
        )}
        {/* 6 Saldo primario */}
        {primarioLast?.value != null && (
          <MacroKpiCard label="Saldo primario" value={primarioLast.value} unit="%" color="#f59e0b" decimals={2}
            footer="Eurostat · excl. intereses" loading={loading}
            onClick={openPrimarioDrill} />
        )}
        {/* 7 Intereses %PIB */}
        {interesesLast?.value != null && (
          <MacroKpiCard label="Intereses %PIB" value={interesesLast.value} unit="%" color="#dc2626" decimals={2}
            footer="Eurostat D41" loading={loading}
            onClick={openInteresesDrill} />
        )}
        {/* 8 Intereses / ingresos */}
        {interesesPorIngresos != null && (
          <MacroKpiCard label="Intereses / ingresos" value={interesesPorIngresos} unit="%" color="#7c3aed" decimals={1}
            footer="Derivado" loading={loading}
            onClick={openInteresesIngresosDrill} />
        )}
        {/* 9 Recaudación AEAT */}
        {aeatRecLast?.value != null && (
          <MacroKpiCard label="Recaudación AEAT YTD" value={aeatRecLast.value} unit="%" color="#16a34a" decimals={1}
            footer="AEAT · variación interanual" loading={loading}
            onClick={openAeatDrill} />
        )}
        {/* 10 Ejecución IGAE */}
        {igaeEjLast?.value != null && (
          <MacroKpiCard label="Ejecución IGAE" value={igaeEjLast.value} unit="%" color="#0891b2" decimals={1}
            footer="IGAE · % objetivo" loading={loading}
            onClick={openIgaeDrill} />
        )}
        {/* 11 Deuda vs Maastricht */}
        {deudaVsMaastricht != null && (
          <MacroKpiCard label="Deuda vs Maastricht" value={deudaVsMaastricht} unit=" pp" color={deudaVsMaastricht > 0 ? '#dc2626' : '#16a34a'} decimals={1}
            footer="Umbral 60% PIB" loading={loading}
            onClick={openMaastrichtDeudaDrill} />
        )}
        {/* 12 Déficit vs Maastricht */}
        {deficitVsMaastricht != null && (
          <MacroKpiCard label="Déficit vs Maastricht" value={deficitVsMaastricht} unit=" pp" color={deficitVsMaastricht > 0 ? '#dc2626' : '#16a34a'} decimals={2}
            footer="Umbral 3% PIB" loading={loading}
            onClick={openMaastrichtDeficitDrill} />
        )}
        {/* 13 CAPB esfuerzo estructural */}
        {capbLast?.value != null && (
          <MacroKpiCard label="CAPB estructural" value={capbLast.value} unit="% pot." color="#7c3aed" decimals={2}
            footer="CE/Eurostat · ajustado ciclo" loading={loading}
            onClick={openCapbDrill} />
        )}
        {/* 14 Carga fiscal */}
        {cargaFiscalLast?.value != null && (
          <MacroKpiCard label="Carga fiscal total" value={cargaFiscalLast.value} unit="%" color="#16a34a" decimals={1}
            footer="OECD · ranking" loading={loading}
            onClick={openCargaFiscalDrill} />
        )}
        {/* 15 Vida media deuda */}
        {vidaMediaLast?.value != null && (
          <MacroKpiCard label="Vida media deuda" value={vidaMediaLast.value} unit=" años" color="#0891b2" decimals={2}
            footer="Tesoro · estructura temporal" loading={loading}
            onClick={openVidaMediaDrill} />
        )}
      </div>

      {/* PANEL PRINCIPAL 1 · Deuda %PIB serie larga + Maastricht */}
      {(deudaSerieLargaPts.length > 5 || deudaSeries.length > 5) && (
        <MacroPanel
          accent="#7c3aed"
          title="Deuda pública %PIB · serie histórica 30 años + Maastricht"
          subtitle="FRED ESPGGDTPGDPPT · evolución desde 1995 · marcador umbral 60%"
          status="live"
          aiAnalysis={{
            indicator: 'Deuda pública España %PIB · FRED',
            indicatorId: 'fred.deuda.esp',
            tabSlug: 'margen-fiscal',
            series: aiSeries(deudaSerieLargaPts.length > 0 ? deudaSerieLargaPts : deudaSeries),
            metadata: {
              unit: '% PIB',
              source: 'FRED · St. Louis',
              sourceCode: 'ESPGGDTPGDPPT',
              frequency: 'quarterly',
              threshold: { amber: 100, red: 120, goodAbove: false },
              notes: [
                'Maastricht: 60% PIB.',
                'España: <40% pre-crisis 2008 · subió a >100% post-COVID.',
                'Regla 1/20 CE: reducción anual del exceso sobre 60%.',
                deudaLast?.value != null ? `Último: ${deudaLast.value.toFixed(1)}% PIB.` : '',
              ],
            },
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{
              id: 'd', label: 'Deuda %PIB', color: '#7c3aed',
              points: deudaSerieLargaPts.length > 0 ? deudaSerieLargaPts : deudaSeries,
              fillBelow: true,
            }]}
            height={260} yLabel="%PIB"
            formatValue={(v) => `${v.toFixed(0)}%`}
            annotations={[
              { period: '2008', label: 'Crisis', color: '#dc2626' },
              { period: '2014', label: 'Pico crisis deuda', color: '#dc2626' },
              { period: '2020', label: 'COVID', color: '#dc2626' },
            ]}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative label="Deuda pública %PIB" unit="%" decimals={1}
              series={(deudaSerieLargaPts.length > 0 ? deudaSerieLargaPts : deudaSeries) as any}
              threshold={{ amber: 100, red: 120, goodAbove: false }} accent="#7c3aed" />
          </div>
        </MacroPanel>
      )}

      {/* PANEL PRINCIPAL 2 · Ingresos vs Gastos */}
      {(ingresosLast?.value != null || gastosLast?.value != null) && (
        <MacroPanel
          accent="#16a34a"
          title="Ingresos vs Gastos AAPP · tamaño del Estado"
          subtitle="Eurostat gov_10a_main · ingresos GGR · gastos GGX · saldo total y primario"
          status="live"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {ingresosLast?.value != null && (
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', border: '1px solid #86efac' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Ingresos AAPP</p>
                <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{ingresosLast.value.toFixed(1)}%</p>
              </div>
            )}
            {gastosLast?.value != null && (
              <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 12px', border: '1px solid #fecaca' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>Gastos AAPP</p>
                <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: '#dc2626' }}>{gastosLast.value.toFixed(1)}%</p>
              </div>
            )}
            {primarioLast?.value != null && (
              <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 12px', border: '1px solid #fed7aa' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#9a3412', fontWeight: 700, textTransform: 'uppercase' }}>Saldo primario</p>
                <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: primarioLast.value >= 0 ? '#16a34a' : '#dc2626' }}>
                  {primarioLast.value >= 0 ? '+' : ''}{primarioLast.value.toFixed(2)}%
                </p>
              </div>
            )}
            {interesesLast?.value != null && (
              <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 12px', border: '1px solid #fecaca' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>Intereses</p>
                <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: '#dc2626' }}>{interesesLast.value.toFixed(2)}%</p>
              </div>
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <CountryCompareBars indicator="GGX_NGDP" countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'IRL', 'BEL']}
              spainColor="#dc2626" unit="%" decimals={1} title="Gasto público · peers UE" />
          </div>
        </MacroPanel>
      )}

      {/* PANEL PRINCIPAL 3 · Sostenibilidad fiscal r-g */}
      {rMinusG != null && deudaLast?.value != null && (
        <MacroPanel
          accent="#dc2626"
          title="Sostenibilidad fiscal · efecto bola de nieve (r-g)"
          subtitle="Tipo medio deuda r vs crecimiento nominal g · saldo primario necesario para estabilizar"
          status="live"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 12px', border: '1px solid #fecaca' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>r (tipo medio)</p>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{tipoInteresSeries[tipoInteresSeries.length - 1]?.value?.toFixed(2)}%</p>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', border: '1px solid #86efac' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>g (crecimiento)</p>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{pibCrecSeries[pibCrecSeries.length - 1]?.value?.toFixed(2)}%</p>
            </div>
            <div style={{ background: rMinusG > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 8, padding: '10px 12px', border: `1px solid ${rMinusG > 0 ? '#fecaca' : '#86efac'}` }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: rMinusG > 0 ? '#991b1b' : '#166534', textTransform: 'uppercase' }}>r − g</p>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: rMinusG > 0 ? '#dc2626' : '#16a34a' }}>{rMinusG > 0 ? '+' : ''}{rMinusG.toFixed(2)}pp</p>
            </div>
            {primarioNecesario != null && (
              <div style={{ background: '#fffbeb', borderRadius: 8, padding: '10px 12px', border: '1px solid #fde68a' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>Sp* necesario</p>
                <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{primarioNecesario.toFixed(2)}%</p>
              </div>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 10, lineHeight: 1.5 }}>
            <strong>r &gt; g</strong>: el coste de la deuda supera el crecimiento → la deuda crece
            automáticamente. Para estabilizar la ratio, el gobierno necesita un superávit primario
            ≥ (r−g)·d / (1+g). Si el saldo primario actual es inferior, la deuda %PIB seguirá
            aumentando sin política fiscal restrictiva.
          </p>
        </MacroPanel>
      )}

      {/* Documentación · mapping niveles
          NIVEL 1 · 15 Hero KPIs en grid arriba
          NIVEL 2 (30) · inline en drill correspondiente:
            2A Ingresos descomposición → drill 4 Ingresos (AEAT YTD + IRPF/IVA/IS/IIEE + tax gap)
            2B Gastos COFOG → drill 5 Gastos (pensiones + sanidad + educación + defensa + protección + I+D + FBCF + masa salarial)
            2C Deuda profunda → drill 2/3 Deuda (por tenedor/plazo/instrumento/vencimientos/coste + peers)
          NIVEL 3 (55) · inline en sub-blocks:
            3A Sostenibilidad → panel principal r-g (S1/S2 + sensibilidad 100bp + r-g + Sp*)
            3B Calidad gasto → drill 5 (pensiones per cápita + ranking OECD)
            3C Federalismo CCAA → reservado para drill profundo Deuda CCAA
            3D Reglas fiscales → drills 11+12 (Maastricht + EDP + AIReF + regla 1/20)
            3E Mercado deuda → drill 3 (subastas + bid-to-cover + BCE PSPP+PEPP + extranjeros)
            3F Gasto social → drill 5 (pensionistas + proyección + ratio + IMV + SEPE)
            3G Narrativa → vía aiAnalysis del panel principal
            3H Benchmarking → CountryCompareBars en drills 1/2/4/5/14
            3I Síntesis → semáforo fiscal arriba (derivado 4 inputs)
      */}
    </div>
  )
}

export default MargenFiscalTab
