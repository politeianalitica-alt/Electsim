'use client'
/**
 * `<RegimenMonetarioTab />` · Tab 2 · Régimen monetario PROFUNDO.
 *
 * Fuentes:
 *  - INE IPC (290750 anual, 290752 mensual, 290753 acumulada) · 24 meses
 *  - IMF PCPIPCH (serie histórica + forecast)
 *  - macro-finance markets (ECB SDW yields, policy rates) · daily
 *  - BIS effective FX broad (REER)
 *
 * Cada gráfico: chart + TrendNarrative + comparativa peers + drill.
 * Fuentes vacías eliminadas.
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

function aiSeries(
  pts: { period: string; value: number | null; forecast?: boolean }[],
): { period: string; value: number; forecast?: boolean }[] {
  return pts
    .filter((p) => p.value != null && Number.isFinite(p.value))
    .map((p) => ({ period: p.period, value: p.value as number, ...(p.forecast ? { forecast: true } : {}) }))
}

// Sprint M9 S2 · shape común a FRED · Alpha Vantage · ESIOS (newest-first natural).
// Si el endpoint no existe, catch(() => null) deja el state en null y el panel
// condicional simplemente no se renderiza.
interface FredSeriesResponse {
  ok: boolean
  series: { period: string; value: number | null }[]
  last?: { period: string; value: number | null }
}

export function RegimenMonetarioTab() {
  const tab = getTab('regimen-monetario')
  const { openDrill } = useMacroDrawer()
  const [ipc, setIpc] = useState<any>(null)
  const [imfInfl, setImfInfl] = useState<any>(null)
  const [markets, setMarkets] = useState<any>(null)
  const [bisFx, setBisFx] = useState<any>(null)
  // Sprint M9 S2 · 7 estados nuevos (todos pueden ser null sin romper render)
  const [fredCore, setFredCore] = useState<FredSeriesResponse | null>(null)
  const [fredEnergy, setFredEnergy] = useState<FredSeriesResponse | null>(null)
  const [fredFood, setFredFood] = useState<FredSeriesResponse | null>(null)
  const [fredDfr, setFredDfr] = useState<FredSeriesResponse | null>(null)
  const [eurUsd, setEurUsd] = useState<FredSeriesResponse | null>(null)
  const [eurGbp, setEurGbp] = useState<FredSeriesResponse | null>(null)
  const [esiosPrice, setEsiosPrice] = useState<FredSeriesResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/ine/ipc?n=36', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=PCPIPCH', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/macro-finance/markets', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      // Sprint M9 S2 · BIS REER extendido a 48m (antes solo 12)
      fetch('/api/bis/fx-effective?country=ESP&n=48', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      // Sprint M9 S2 · 7 fuentes nuevas (FRED IPC desagregado + BCE DFR + Alpha Vantage FX + ESIOS pool)
      fetch('/api/fred/series?id=CPGRLE01ESM659N&n=36', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // IPC subyacente ES
      fetch('/api/fred/series?id=CP0200EZM086NEST&n=36', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // IPC EZ energía
      fetch('/api/fred/series?id=CP0111EZM086NEST&n=36', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // IPC EZ alimentos
      fetch('/api/fred/series?id=ECBDFR&n=60', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),           // BCE Depo Rate 5y
      fetch('/api/alpha-vantage/fx?from=EUR&to=USD&n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // EUR/USD
      fetch('/api/alpha-vantage/fx?from=EUR&to=GBP&n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // EUR/GBP
      fetch('/api/esios/electricity-price?n=30', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),         // Pool eléctrico ES 30d
    ]).then(([i, im, m, b, fc, fe, ff, fd, fu, fg, ep]) => {
      if (!alive) return
      setIpc(i); setImfInfl(im); setMarkets(m); setBisFx(b)
      setFredCore(fc); setFredEnergy(fe); setFredFood(ff); setFredDfr(fd)
      setEurUsd(fu); setEurGbp(fg); setEsiosPrice(ep)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const reverseSeries = (pts?: any[]) => (pts || []).slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  const ipcAnualSeries = reverseSeries(ipc?.anual?.points)
  const ipcMensualSeries = reverseSeries(ipc?.mensual?.points)
  const ipcAcumuladaSeries = reverseSeries(ipc?.acumulada?.points)
  const ipcAnualLast = ipc?.anual?.points?.[0]
  const ipcMensualLast = ipc?.mensual?.points?.[0]
  const ipcAcumuladaLast = ipc?.acumulada?.points?.[0]

  const imfHist = (imfInfl?.series || []).filter((s: any) => s.value != null && s.year <= new Date().getFullYear()).map((s: any) => ({ period: String(s.year), value: s.value }))
  const imfFc = (imfInfl?.series || []).filter((s: any) => s.value != null && s.year > new Date().getFullYear()).map((s: any) => ({ period: String(s.year), value: s.value }))

  const bondEs = markets?.yield_curve?.find?.((y: any) => y.tenor?.includes('10Y'))?.value ?? null
  const policyRates: { code: string; label: string; value: number | null }[] = markets?.policy_rates || []
  const reerLast = bisFx?.broad?.points?.slice?.(-1)?.[0]?.value ?? null
  const reerSeries = (bisFx?.broad?.points || []).map((p: any) => ({ period: String(p.period || p.date || ''), value: p.value }))

  // Sprint M9 S2 · series chronológicas (FRED + Alpha Vantage + ESIOS son newest-first como INE)
  const fredCoreSeries = reverseSeries(fredCore?.series)
  const fredEnergySeries = reverseSeries(fredEnergy?.series)
  const fredFoodSeries = reverseSeries(fredFood?.series)
  const fredDfrSeries = reverseSeries(fredDfr?.series)
  const eurUsdSeries = reverseSeries(eurUsd?.series)
  const eurGbpSeries = reverseSeries(eurGbp?.series)
  const esiosPriceSeries = reverseSeries(esiosPrice?.series)
  // Últimos (preferimos el .last del endpoint · si no, last item de la serie cronológica)
  const fredCoreLast = fredCore?.last ?? fredCoreSeries[fredCoreSeries.length - 1]
  const fredEnergyLast = fredEnergy?.last ?? fredEnergySeries[fredEnergySeries.length - 1]
  const fredFoodLast = fredFood?.last ?? fredFoodSeries[fredFoodSeries.length - 1]
  const fredDfrLast = fredDfr?.last ?? fredDfrSeries[fredDfrSeries.length - 1]
  const eurUsdLast = eurUsd?.last ?? eurUsdSeries[eurUsdSeries.length - 1]
  const eurGbpLast = eurGbp?.last ?? eurGbpSeries[eurGbpSeries.length - 1]
  const esiosPriceLast = esiosPrice?.last ?? esiosPriceSeries[esiosPriceSeries.length - 1]
  // Diferencial headline − subyacente
  const ipcGap = (() => {
    const h = ipcAnualLast?.value
    const c = fredCoreLast?.value
    if (h == null || c == null) return null
    return h - c
  })()
  // Media de los últimos 30 valores no-null del precio pool
  const esiosAvg30 = (() => {
    const vals = esiosPriceSeries.map((p) => p.value).filter((v): v is number => v != null && Number.isFinite(v))
    if (vals.length === 0) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  })()
  // Crossover BCE DFR: primer punto donde value > 0 después de haber sido <= 0
  const dfrCrossover = (() => {
    if (fredDfrSeries.length < 2) return null
    for (let i = 1; i < fredDfrSeries.length; i++) {
      const prev = fredDfrSeries[i - 1].value
      const curr = fredDfrSeries[i].value
      if (curr != null && prev != null && curr > 0 && prev <= 0) {
        return fredDfrSeries[i]
      }
    }
    return null
  })()
  // Pendiente 10Y-2Y de la curva soberana
  const yieldSlope = (() => {
    const yc: any[] | undefined = markets?.yield_curve
    if (!Array.isArray(yc)) return null
    const t2 = yc.find((y) => String(y.tenor || '').includes('2Y'))?.value
    const t10 = yc.find((y) => String(y.tenor || '').includes('10Y'))?.value
    if (typeof t2 !== 'number' || typeof t10 !== 'number') return null
    return { t2, t10, slope: t10 - t2 }
  })()
  // Color helper para celda de yield según valor
  const yieldCellStyle = (v: number | null | undefined) => {
    if (v == null) return { bg: '#f8fafc', border: '#e2e8f0', color: '#475569' }
    if (v < 2) return { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' }
    if (v < 3) return { bg: '#fffbeb', border: '#fde68a', color: '#92400e' }
    if (v < 4) return { bg: '#fff7ed', border: '#fed7aa', color: '#9a3412' }
    return { bg: '#fef2f2', border: '#fecaca', color: '#991b1b' }
  }
  // Spain inflación última observación (para subtítulo dinámico de la comparativa UE)
  const esInflLast = imfHist.length > 0 ? imfHist[imfHist.length - 1].value : null

  const openIpcDrill = () => {
    openDrill({
      title: 'IPC España · drill INE',
      subtitle: 'INE IPC290750 · Nacional general var anual',
      accent: tab.themeAccent,
      content: (
        <IndicatorDrill
          label="IPC nacional general"
          unit="%"
          decimals={2}
          series={ipcAnualSeries}
          sourceCode="IPC290750"
          sourceName="INE WSTempus · IPC"
          imfCompareIndicator="PCPIPCH"
          threshold={{ amber: 2, red: 4, goodAbove: false }}
          accent={tab.themeAccent}
        />
      ),
      source: { name: 'INE · tabla 76134', url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=76134' },
    })
  }

  // Sprint M9 S2 · drill comparativo subyacente vs headline (para KPI IPC subyacente)
  const openIpcCompareDrill = () => openDrill({
    title: 'IPC España · subyacente vs headline',
    subtitle: 'FRED CPGRLE01ESM659N (core) vs INE IPC290750 (headline)',
    accent: '#f97316',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <DeepLineChart
          series={[
            { id: 'h', label: 'IPC headline INE', color: tab.themeAccent, points: ipcAnualSeries },
            { id: 'c', label: 'IPC subyacente FRED', color: '#f97316', points: fredCoreSeries, dashed: true },
          ]}
          height={260}
          yLabel="IPC YoY (%)"
          zeroLine
          formatValue={(v) => `${v.toFixed(1)}%`}
        />
        <TrendNarrative
          label="IPC subyacente"
          unit="%"
          decimals={2}
          series={fredCoreSeries as any}
          threshold={{ amber: 2, red: 4, goodAbove: false }}
          accent="#f97316"
        />
      </div>
    ),
    source: { name: 'FRED · IPC subyacente España', url: 'https://fred.stlouisfed.org/series/CPGRLE01ESM659N' },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a
        href="/macro/regimen-monetario"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(90deg, #faf5ff 0%, #f0f9ff 100%)',
          border: '1px solid #e9d5ff',
          borderLeft: `4px solid ${tab.themeAccent}`,
          borderRadius: 10,
          padding: '12px 16px',
          color: '#0f172a',
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · /macro/regimen-monetario
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            Termómetro 0-100 · indicadores IPC/IMF/REER agrupados por familia · lectura ejecutiva IA · alertas · radar datos.gob.es · 9 subpestañas por indicador
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <MacroKpiCard
          label="IPC · Variación anual"
          value={ipcAnualLast?.value ?? null}
          color={tab.themeAccent}
          spark={ipcAnualSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
          footer={ipcAnualLast?.period ? `INE IPC290750 · ${ipcAnualLast.period}` : 'INE IPC290750'}
          onClick={ipcAnualSeries.length > 1 ? openIpcDrill : undefined}
          loading={loading}
        />
        <MacroKpiCard
          label="IPC · Variación mensual"
          value={ipcMensualLast?.value ?? null}
          color="#8b5cf6"
          spark={ipcMensualSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
          footer={ipcMensualLast?.period ? `INE IPC290752 · ${ipcMensualLast.period}` : 'INE IPC290752'}
          loading={loading}
        />
        {bondEs != null && (
          <MacroKpiCard
            label="Bono 10Y España"
            value={bondEs}
            unit="%"
            color="#dc2626"
            decimals={2}
            footer="ECB SDW · Yield curve"
            loading={loading}
          />
        )}
        {policyRates.find((r) => r.code?.toUpperCase().includes('DFR')) && (
          <MacroKpiCard
            label="BCE · Depo rate"
            value={policyRates.find((r) => r.code?.toUpperCase().includes('DFR'))?.value ?? null}
            unit="%"
            color="#6366f1"
            decimals={2}
            footer="Tasa facilidad depósito"
            loading={loading}
          />
        )}
        {/* Sprint M9 S2 · 3 KPIs nuevos · cada uno condicional al dato */}
        {fredCoreLast?.value != null && (
          <MacroKpiCard
            label="IPC subyacente"
            value={fredCoreLast.value}
            unit="%"
            color="#f97316"
            decimals={2}
            spark={fredCoreSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="FRED CPGRLE01ESM659N · excl. energía+alimentos"
            loading={loading}
            onClick={fredCoreSeries.length > 1 && ipcAnualSeries.length > 1 ? openIpcCompareDrill : undefined}
          />
        )}
        {eurUsdLast?.value != null && (
          <MacroKpiCard
            label="EUR/USD"
            value={eurUsdLast.value}
            unit=""
            color="#0891b2"
            decimals={4}
            spark={eurUsdSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer="Alpha Vantage · tipo nominal"
            loading={loading}
          />
        )}
        {esiosPriceLast?.value != null && (
          <div title="El precio eléctrico diario impacta directamente el IPC energía del mes siguiente">
            <MacroKpiCard
              label="Precio pool eléctrico"
              value={esiosPriceLast.value}
              unit=" €/MWh"
              color="#f59e0b"
              decimals={1}
              footer={`ESIOS REE · ${esiosPriceLast.period ?? 'último día'}`}
              loading={loading}
            />
          </div>
        )}
      </div>

      {/* IPC España 36m + lectura */}
      {ipcAnualSeries.length > 5 && (
        <MacroPanel
          accent={tab.themeAccent}
          title="IPC España · 36 meses"
          subtitle="Variación anual + mensual + acumulada año · INE base 2021"
          status="live"
          aiAnalysis={{
            indicator: 'IPC nacional general · INE 290750',
            indicatorId: 'ine.ipc290750.anual',
            tabSlug: 'regimen-monetario',
            series: aiSeries(ipcAnualSeries),
            metadata: {
              unit: '%',
              source: 'INE WSTempus · IPC',
              sourceCode: 'IPC290750',
              lastUpdate: ipcAnualLast?.period,
              frequency: 'monthly',
              threshold: { amber: 2, red: 4, goodAbove: false },
              notes: [
                `IPC mensual último (IPC290752): ${ipcMensualLast?.value ?? '?'}% en ${ipcMensualLast?.period ?? '?'}.`,
                `IPC acumulada YTD (IPC290753) último: ${ipcAcumuladaLast?.value ?? '?'}% en ${ipcAcumuladaLast?.period ?? '?'}.`,
                'Pico inflación reciente: 10.8% en jun-2022 por shock energético.',
                'Objetivo BCE: 2% a medio plazo.',
              ],
            },
            windowLabel: '36 meses',
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'a', label: 'Anual', color: tab.themeAccent, points: ipcAnualSeries, fillBelow: true },
              { id: 'm', label: 'Mensual', color: '#8b5cf6', points: ipcMensualSeries },
              { id: 'y', label: 'YTD acumulada', color: '#a855f7', points: ipcAcumuladaSeries, dashed: true },
            ]}
            height={240}
            yLabel="IPC (%)"
            zeroLine
            annotations={[
              { period: '2022-06', label: 'Pico 10.8%', color: '#dc2626' },
            ]}
            formatValue={(v) => `${v.toFixed(1)}%`}
            onPointClick={openIpcDrill}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="IPC nacional general"
              unit="%"
              decimals={2}
              series={ipcAnualSeries as any}
              threshold={{ amber: 2, red: 4, goodAbove: false }}
              accent={tab.themeAccent}
            />
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 S2 · IPC desagregado (subyacente / energía / alimentos) · FRED 36m.
          Cada serie es opcional · el panel solo aparece si subyacente tiene ≥3 obs. */}
      {fredCoreSeries.length > 3 && (() => {
        const ipcSeries: { id: string; label: string; color: string; points: { period: string; value: number | null }[]; fillBelow?: boolean; dashed?: boolean }[] = [
          { id: 'core', label: 'Subyacente', color: '#f97316', points: fredCoreSeries, fillBelow: true },
        ]
        if (fredEnergySeries.length > 0) ipcSeries.push({ id: 'energy', label: 'Energía', color: '#dc2626', points: fredEnergySeries })
        if (fredFoodSeries.length > 0) ipcSeries.push({ id: 'food', label: 'Alimentos', color: '#16a34a', points: fredFoodSeries, dashed: true })
        return (
          <MacroPanel
            accent="#f97316"
            title="IPC España · descomposición inflación"
            subtitle="Subyacente · energía · alimentos · FRED mensual 36m"
            status="live"
            aiAnalysis={{
              indicator: 'IPC desagregado · subyacente + energía + alimentos · FRED',
              indicatorId: 'fred.ipc.desagregado.esp',
              tabSlug: 'regimen-monetario',
              series: aiSeries(fredCoreSeries),
              metadata: {
                unit: '%',
                source: 'FRED St. Louis · OECD + Eurostat',
                sourceCode: 'CPGRLE01ESM659N + CP0200EZ + CP0111EZ',
                lastUpdate: fredCoreLast?.period,
                frequency: 'monthly',
                threshold: { amber: 2, red: 4, goodAbove: false },
                notes: [
                  `Último subyacente: ${fredCoreLast?.value != null ? `${fredCoreLast.value.toFixed(2)}%` : '—'}.`,
                  `Último IPC headline (INE): ${ipcAnualLast?.value != null ? `${ipcAnualLast.value.toFixed(2)}%` : '—'}.`,
                  `Diferencial headline−subyacente: ${ipcGap != null ? `${ipcGap > 0 ? '+' : ''}${ipcGap.toFixed(2)}pp` : '—'}.`,
                  'Subyacente excluye energía y alimentos no procesados · refleja inflación estructural.',
                  'Objetivo BCE 2% medio plazo · subyacente más rígida que headline.',
                ],
              },
              windowLabel: `36 meses · ${ipcSeries.length} componentes`,
            } as ChartAnalysisInput}
          >
            <DeepLineChart
              series={ipcSeries}
              height={240}
              zeroLine
              yLabel="IPC componente (%)"
              formatValue={(v) => `${v.toFixed(1)}%`}
              annotations={[{ period: '2022-06', label: 'Pico energía', color: '#dc2626' }]}
            />
            {ipcGap != null && (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
                <div
                  style={{
                    flex: 1,
                    minWidth: 200,
                    background: '#fff7ed',
                    borderRadius: 8,
                    padding: '10px 14px',
                    border: '1px solid #fed7aa',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 11, color: '#9a3412', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                    Diferencial headline − subyacente
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 22,
                      fontWeight: 700,
                      color: ipcGap > 1 ? '#dc2626' : ipcGap < -0.5 ? '#7c3aed' : '#16a34a',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {ipcGap > 0 ? '+' : ''}{ipcGap.toFixed(1)} pp
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#78716c', lineHeight: 1.5 }}>
                    {ipcGap > 1
                      ? 'Energía/alimentos presionan más que la inflación estructural. El shock es transitorio si subyacente baja.'
                      : ipcGap < -0.5
                      ? 'Inflación subyacente más persistente que headline. Presión estructural de costes y demanda.'
                      : 'Subyacente y headline alineadas. Sin sesgo sectorial dominante.'}
                  </p>
                </div>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <TrendNarrative
                label="IPC subyacente"
                unit="%"
                decimals={2}
                series={fredCoreSeries as any}
                threshold={{ amber: 2, red: 4, goodAbove: false }}
                accent="#f97316"
              />
            </div>
          </MacroPanel>
        )
      })()}

      {/* IMF Inflación long-history + forecast */}
      {imfHist.length > 5 && (
        <MacroPanel
          accent="#7c3aed"
          title="IMF WEO · Inflación serie 20y + forecast"
          subtitle="PCPIPCH · histórica + proyección 5 años"
          status="live"
          aiAnalysis={{
            indicator: 'Inflación IPC · IMF PCPIPCH',
            indicatorId: 'imf.weo.pcpipch.esp',
            tabSlug: 'regimen-monetario',
            series: [
              ...aiSeries(imfHist),
              ...aiSeries(imfFc.map((p: any) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '%',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'PCPIPCH',
              lastUpdate: imfHist[imfHist.length - 1]?.period,
              frequency: 'annual',
              threshold: { amber: 2, red: 4, goodAbove: false },
            },
            windowLabel: `${imfHist.length}y hist + ${imfFc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{
              id: 'imf',
              label: 'IPC YoY',
              color: '#7c3aed',
              points: [...imfHist, ...imfFc],
              forecastFromIndex: imfHist.length,
              fillBelow: true,
            }]}
            height={220}
            yLabel="IPC (%)"
            zeroLine
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Inflación IMF"
              unit="%"
              decimals={2}
              series={imfHist}
              forecast={imfFc}
              threshold={{ amber: 2, red: 4, goodAbove: false }}
              accent="#7c3aed"
            />
          </div>
        </MacroPanel>
      )}

      {/* Curva tipos + política BCE · Sprint M9 S2 C8 · celdas color por valor + slope inline */}
      {markets?.yield_curve && markets.yield_curve.length > 0 && (
        <MacroPanel
          accent="#dc2626"
          title="Curva soberana España"
          subtitle="ECB SDW · plazos 3m a 30y · valores actuales · color por nivel"
          status="live"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
            {markets.yield_curve.map((y: any, i: number) => {
              const style = yieldCellStyle(y.value)
              return (
                <div
                  key={i}
                  style={{
                    background: style.bg,
                    borderRadius: 6,
                    padding: 10,
                    textAlign: 'center',
                    border: `1px solid ${style.border}`,
                  }}
                >
                  <p style={{ fontSize: 9, color: style.color, margin: 0, fontWeight: 700, letterSpacing: 0.4 }}>{y.tenor}</p>
                  <p
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: style.color,
                      margin: '4px 0 0',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {y.value?.toFixed(2)}%
                  </p>
                </div>
              )
            })}
          </div>
          {yieldSlope && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  background: yieldSlope.slope > 0 ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${yieldSlope.slope > 0 ? '#86efac' : '#fecaca'}`,
                  borderRadius: 8,
                  padding: '6px 12px',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: yieldSlope.slope > 0 ? '#166534' : '#991b1b',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  Pendiente 10Y−2Y: {yieldSlope.slope > 0 ? '+' : ''}{yieldSlope.slope.toFixed(2)} pp
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {yieldSlope.slope > 0
                    ? 'Curva normal → expectativas de crecimiento'
                    : yieldSlope.slope < -0.3
                    ? '! Curva invertida → señal de recesión histórica'
                    : 'Curva plana → incertidumbre sobre ciclo'}
                </span>
                <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
                  2Y {yieldSlope.t2.toFixed(2)}% · 10Y {yieldSlope.t10.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </MacroPanel>
      )}

      {policyRates.length > 0 && (
        <MacroPanel accent="#6366f1" title="BCE · Tipos oficiales" subtitle="Main Refi · Deposit Facility · Marginal Lending" status="live">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {policyRates.map((r, i) => (
              <MacroKpiCard key={i} label={r.label} value={r.value} unit="%" color="#6366f1" decimals={2} footer={r.code} />
            ))}
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 S2 C4 · BCE Depo Rate histórico 5 años (FRED ECBDFR).
          Anota dinámicamente el primer crossover de tipos negativos a positivos. */}
      {fredDfrSeries.length > 3 && (() => {
        const lastDfr = fredDfrLast?.value
        const annotations = dfrCrossover
          ? [{ period: dfrCrossover.period, label: 'Fin tipos negativos', color: '#16a34a' }]
          : []
        const regimeBadge = (() => {
          if (lastDfr == null) return null
          if (lastDfr > 2) return { label: 'Restrictivo', color: '#dc2626', bg: '#fef2f2' }
          if (lastDfr >= 0.5) return { label: 'Neutral', color: '#9a3412', bg: '#fff7ed' }
          if (lastDfr >= 0) return { label: 'Acomodaticio', color: '#166534', bg: '#f0fdf4' }
          return { label: 'Tipos negativos', color: '#7c3aed', bg: '#faf5ff' }
        })()
        // Para aiAnalysis · detecta ciclo: comparando últimas 6 obs vs anteriores 6
        const cycle = (() => {
          if (fredDfrSeries.length < 12) return 'estable'
          const recent = fredDfrSeries.slice(-6).map((p) => p.value).filter((v): v is number => v != null)
          const prev = fredDfrSeries.slice(-12, -6).map((p) => p.value).filter((v): v is number => v != null)
          if (recent.length === 0 || prev.length === 0) return 'estable'
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
          const prevAvg = prev.reduce((a, b) => a + b, 0) / prev.length
          if (recentAvg > prevAvg + 0.25) return 'alcista'
          if (recentAvg < prevAvg - 0.25) return 'bajista'
          return 'pausa'
        })()
        return (
          <MacroPanel
            accent="#6366f1"
            title="BCE · Deposit Facility Rate · historia 5 años"
            subtitle="FRED ECBDFR · tipo facilidad depósito · ciclo de política monetaria"
            status="live"
            aiAnalysis={{
              indicator: 'BCE Deposit Facility Rate · ciclo monetario · FRED ECBDFR',
              indicatorId: 'fred.ecbdfr',
              tabSlug: 'regimen-monetario',
              series: aiSeries(fredDfrSeries),
              metadata: {
                unit: '%',
                source: 'FRED St. Louis',
                sourceCode: 'ECBDFR',
                lastUpdate: fredDfrLast?.period,
                frequency: 'monthly',
                threshold: { amber: 1, red: 3, goodAbove: false },
                notes: [
                  `Tipo actual: ${lastDfr != null ? `${lastDfr.toFixed(2)}%` : '—'} · régimen ${regimeBadge?.label.toLowerCase() ?? '—'}.`,
                  `Ciclo monetario reciente (últimos 6 vs 12 meses): ${cycle}.`,
                  dfrCrossover ? `Salida tipos negativos: ${dfrCrossover.period}.` : 'No detectada salida de tipos negativos en la ventana visible.',
                  'Depo Rate = tipo BCE paga por reservas overnight · ancla de tipos cortos eurozona.',
                ],
              },
              windowLabel: `${fredDfrSeries.length} meses`,
            } as ChartAnalysisInput}
          >
            <DeepLineChart
              series={[{ id: 'dfr', label: 'BCE Depo Rate', color: '#6366f1', points: fredDfrSeries, fillBelow: true }]}
              height={200}
              yLabel="Tipo (%)"
              zeroLine
              formatValue={(v) => `${v.toFixed(2)}%`}
              annotations={annotations}
            />
            {regimeBadge && lastDfr != null && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                    Tipo actual
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 26,
                      fontWeight: 700,
                      color: '#6366f1',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {lastDfr.toFixed(2)}%
                  </p>
                </div>
                <span
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    background: regimeBadge.bg,
                    color: regimeBadge.color,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                  }}
                >
                  {regimeBadge.label}
                </span>
                <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>
                  Ciclo {cycle} · {fredDfrLast?.period ?? ''}
                </span>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <TrendNarrative
                label="BCE Depo Rate"
                unit="%"
                decimals={2}
                series={fredDfrSeries as any}
                threshold={{ amber: 1, red: 3, goodAbove: false }}
                accent="#6366f1"
              />
            </div>
          </MacroPanel>
        )
      })()}

      {/* REER BIS */}
      {reerSeries.length > 5 && (
        <MacroPanel
          accent="#0891b2"
          title="BIS · Tipo de cambio real efectivo España"
          subtitle="Broad effective FX index · base 2010=100"
          status="live"
          aiAnalysis={{
            indicator: 'REER broad · BIS',
            indicatorId: 'bis.reer.broad.esp',
            tabSlug: 'regimen-monetario',
            series: aiSeries(reerSeries),
            metadata: {
              unit: 'índice',
              source: 'BIS Effective Exchange Rates',
              sourceCode: 'REER_BROAD',
              lastUpdate: reerSeries[reerSeries.length - 1]?.period,
              frequency: 'monthly',
              notes: [
                'Índice base 2010=100. >100 → apreciación real frente a peers.',
                'Captura competitividad-precio agregada vía cesta ponderada por comercio.',
              ],
            },
            windowLabel: `${reerSeries.length} obs`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{ id: 'reer', label: 'REER broad', color: '#0891b2', points: reerSeries, fillBelow: true }]}
            height={180}
            yLabel="REER index"
            formatValue={(v) => v.toFixed(1)}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Tipo cambio real efectivo"
              unit=""
              decimals={1}
              series={reerSeries as any}
              accent="#0891b2"
            />
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 S2 C5 · Tipos de cambio nominales EUR/USD + EUR/GBP (Alpha Vantage 24m).
          Escalas distintas (USD ~1.08, GBP ~0.86) · DeepLineChart no soporta dualAxis,
          se renderiza grid 2 col con un chart cada uno. */}
      {(eurUsdSeries.length > 3 || eurGbpSeries.length > 3) && (
        <MacroPanel
          accent="#0891b2"
          title="Tipo de cambio nominal EUR · USD y GBP"
          subtitle="Alpha Vantage · 24 meses · escalas distintas (charts separados)"
          status="live"
          aiAnalysis={{
            indicator: 'EUR/USD nominal · Alpha Vantage',
            indicatorId: 'av.fx.eurusd',
            tabSlug: 'regimen-monetario',
            series: aiSeries(eurUsdSeries),
            metadata: {
              unit: '',
              source: 'Alpha Vantage',
              sourceCode: 'EURUSD + EURGBP',
              lastUpdate: eurUsdLast?.period,
              frequency: 'monthly',
              threshold: { amber: 1.05, red: 0.98, goodAbove: true },
              notes: [
                `EUR/USD último: ${eurUsdLast?.value != null ? eurUsdLast.value.toFixed(4) : '—'}.`,
                `EUR/GBP último: ${eurGbpLast?.value != null ? eurGbpLast.value.toFixed(4) : '—'}.`,
                'EUR/USD ↓ (dólar fuerte) encarece petróleo/gas en EUR · presión IPC energía.',
                'EUR/GBP relevante para exportaciones España al Reino Unido (5º socio comercial).',
              ],
            },
            windowLabel: '24 meses · 2 pares',
          } as ChartAnalysisInput}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 14,
            }}
          >
            {eurUsdSeries.length > 3 && (
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  EUR/USD
                </p>
                <DeepLineChart
                  series={[{ id: 'eurusd', label: 'EUR/USD', color: '#0891b2', points: eurUsdSeries }]}
                  height={180}
                  yLabel="EUR/USD"
                  formatValue={(v) => v.toFixed(4)}
                />
              </div>
            )}
            {eurGbpSeries.length > 3 && (
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  EUR/GBP
                </p>
                <DeepLineChart
                  series={[{ id: 'eurgbp', label: 'EUR/GBP', color: '#7c3aed', points: eurGbpSeries, dashed: true }]}
                  height={180}
                  yLabel="EUR/GBP"
                  formatValue={(v) => v.toFixed(4)}
                />
              </div>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 10, lineHeight: 1.5 }}>
            EUR/USD: dólar más fuerte (↓) encarece importaciones energéticas (petróleo en USD) →
            presión IPC. EUR/GBP relevante para exportaciones a Reino Unido (5º socio comercial).
          </p>
          {eurUsdSeries.length > 3 && (
            <div style={{ marginTop: 12 }}>
              <TrendNarrative
                label="EUR/USD"
                unit=""
                decimals={4}
                series={eurUsdSeries as any}
                threshold={{ amber: 1.05, red: 0.98, goodAbove: true }}
                accent="#0891b2"
              />
            </div>
          )}
        </MacroPanel>
      )}

      {/* Sprint M9 S2 C6 · Precio pool eléctrico España · ESIOS REE 30d.
          El precio diario adelanta el componente energía del IPC mensual ~4-6 semanas. */}
      {esiosPriceSeries.length > 5 && (() => {
        const lastPool = esiosPriceLast?.value ?? null
        return (
          <MacroPanel
            accent="#f59e0b"
            title="Precio pool eléctrico España · diario"
            subtitle="ESIOS REE · €/MWh · últimos 30 días"
            status="live"
            aiAnalysis={{
              indicator: 'Precio pool eléctrico España · ESIOS REE',
              indicatorId: 'esios.pool.diario',
              tabSlug: 'regimen-monetario',
              series: aiSeries(esiosPriceSeries),
              metadata: {
                unit: '€/MWh',
                source: 'ESIOS · Red Eléctrica de España',
                sourceCode: 'electricity-price',
                lastUpdate: esiosPriceLast?.period,
                frequency: 'daily',
                threshold: { amber: 100, red: 150, goodAbove: false },
                notes: [
                  `Último valor: ${lastPool != null ? `${lastPool.toFixed(1)} €/MWh` : '—'}.`,
                  `Media 30 días: ${esiosAvg30 != null ? `${esiosAvg30.toFixed(1)} €/MWh` : '—'}.`,
                  'Precio pool > 120 €/MWh suele reflejarse en IPC energía 4-6 semanas después.',
                  'Umbral alerta (rojo): 150 €/MWh sostenido · presión inflacionaria significativa.',
                ],
              },
              windowLabel: `${esiosPriceSeries.length} días`,
            } as ChartAnalysisInput}
          >
            <DeepLineChart
              series={[{ id: 'pool', label: 'Precio pool', color: '#f59e0b', points: esiosPriceSeries, fillBelow: true }]}
              height={180}
              yLabel="€/MWh"
              formatValue={(v) => `${v.toFixed(1)} €/MWh`}
            />
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 11, color: '#92400e', margin: 0, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  Último disponible
                </p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b', margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {lastPool != null ? `${lastPool.toFixed(1)} €/MWh` : '—'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#92400e', margin: 0, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  Media 30 días
                </p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#78716c', margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {esiosAvg30 != null ? `${esiosAvg30.toFixed(1)} €/MWh` : '—'}
                </p>
              </div>
              <p style={{ flex: 1, minWidth: 240, fontSize: 11, color: '#78716c', margin: 0, lineHeight: 1.5 }}>
                El precio pool es el principal determinante del componente energía del IPC mensual.
                Precios &gt;120 €/MWh suelen reflejarse en IPC energía 4-6 semanas después.
              </p>
            </div>
            <div style={{ marginTop: 12 }}>
              <TrendNarrative
                label="Precio pool eléctrico"
                unit="€/MWh"
                decimals={1}
                series={esiosPriceSeries as any}
                threshold={{ amber: 100, red: 150, goodAbove: false }}
                accent="#f59e0b"
              />
            </div>
          </MacroPanel>
        )
      })()}

      {/* Comparativa inflación UE · Sprint M9 S2 C7 · +CEE + subtítulo dinámico + interpretación */}
      <MacroPanel
        accent="#7c3aed"
        title="Comparativa inflación · España vs peers UE"
        subtitle={`IMF PCPIPCH · último año disponible · España: ${esInflLast != null ? `${esInflLast.toFixed(1)}%` : '?'}`}
        status="live"
      >
        <CountryCompareBars
          indicator="PCPIPCH"
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC', 'POL', 'CZE', 'HUN']}
          spainColor={tab.themeAccent}
          unit="%"
          decimals={2}
        />
        {esInflLast != null && (
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 10, lineHeight: 1.5 }}>
            Contexto: inflación bajo 2% BCE es política monetaria acomodaticia.
            Países con inflación &gt; media UE tienen mayor erosión salarial real y
            mayor presión sobre tipos de interés reales negativos.
          </p>
        )}
      </MacroPanel>
    </div>
  )
}

export default RegimenMonetarioTab
