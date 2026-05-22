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

export function RegimenMonetarioTab() {
  const tab = getTab('regimen-monetario')
  const { openDrill } = useMacroDrawer()
  const [ipc, setIpc] = useState<any>(null)
  const [imfInfl, setImfInfl] = useState<any>(null)
  const [markets, setMarkets] = useState<any>(null)
  const [bisFx, setBisFx] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/ine/ipc?n=36', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=PCPIPCH', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/macro-finance/markets', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/bis/fx-effective', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([i, im, m, b]) => {
      if (!alive) return
      setIpc(i); setImfInfl(im); setMarkets(m); setBisFx(b); setLoading(false)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

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

      {/* Curva tipos + política BCE */}
      {markets?.yield_curve && markets.yield_curve.length > 0 && (
        <MacroPanel
          accent="#dc2626"
          title="Curva soberana España"
          subtitle="ECB SDW · plazos 3m a 30y · valores actuales"
          status="live"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
            {markets.yield_curve.map((y: any, i: number) => (
              <div key={i} style={{ background: '#fef2f2', borderRadius: 6, padding: 10, textAlign: 'center', border: '1px solid #fecaca' }}>
                <p style={{ fontSize: 9, color: '#991b1b', margin: 0, fontWeight: 700, letterSpacing: 0.4 }}>{y.tenor}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {y.value?.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
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

      {/* Comparativa inflación UE */}
      <MacroPanel accent="#7c3aed" title="Comparativa inflación · España vs peers UE" subtitle="IMF PCPIPCH · último año" status="live">
        <CountryCompareBars
          indicator="PCPIPCH"
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC']}
          spainColor={tab.themeAccent}
          unit="%"
          decimals={2}
        />
      </MacroPanel>
    </div>
  )
}

export default RegimenMonetarioTab
