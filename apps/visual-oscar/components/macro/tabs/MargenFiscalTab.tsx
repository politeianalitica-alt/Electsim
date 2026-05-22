'use client'
/**
 * `<MargenFiscalTab />` · Tab 3 · Margen fiscal PROFUNDO.
 *
 * Fuentes vivas:
 *  - IMF GGXWDG_NGDP deuda %PIB · serie histórica + forecast
 *  - IMF GGXCNL_NGDP saldo total %PIB
 *  - IMF GGXONLB_NGDP saldo primario %PIB
 *  - IMF GGR_NGDP ingresos %PIB
 *  - IMF GGX_NGDP gasto %PIB
 *
 * No más empty states de AIReF/IGAE (regla del usuario).
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

export function MargenFiscalTab() {
  const tab = getTab('margen-fiscal')
  const { openDrill } = useMacroDrawer()

  const [deuda, setDeuda] = useState<any>(null)
  const [saldo, setSaldo] = useState<any>(null)
  const [primary, setPrimary] = useState<any>(null)
  const [ingresos, setIngresos] = useState<any>(null)
  const [gasto, setGasto] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/imf/country?iso=ESP&indicator=GGXWDG_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGXCNL_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGXONLB_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGR_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGX_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([d, s, p, i, g]) => {
      if (!alive) return
      setDeuda(d); setSaldo(s); setPrimary(p); setIngresos(i); setGasto(g); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const splitImf = (d: any) => {
    const all = (d?.series || []).filter((s: any) => s.value != null) as { year: number; value: number }[]
    const cy = new Date().getFullYear()
    return {
      hist: all.filter((x) => x.year <= cy).map((x) => ({ period: String(x.year), value: x.value })),
      fc: all.filter((x) => x.year > cy).map((x) => ({ period: String(x.year), value: x.value })),
    }
  }

  const deudaSplit = splitImf(deuda)
  const saldoSplit = splitImf(saldo)
  const primarySplit = splitImf(primary)
  const ingresosSplit = splitImf(ingresos)
  const gastoSplit = splitImf(gasto)

  const deudaLast = deudaSplit.hist[deudaSplit.hist.length - 1]
  const saldoLast = saldoSplit.hist[saldoSplit.hist.length - 1]
  const primaryLast = primarySplit.hist[primarySplit.hist.length - 1]
  const ingLast = ingresosSplit.hist[ingresosSplit.hist.length - 1]
  const gastoLast = gastoSplit.hist[gastoSplit.hist.length - 1]

  // Intereses derivados: primary - total
  const intereses = primaryLast && saldoLast ? primaryLast.value - saldoLast.value : null

  const openDrill1 = (label: string, indicator: string, split: any, threshold?: any, color = tab.themeAccent) => () => {
    openDrill({
      title: `${label} · IMF WEO`,
      subtitle: `IMF DataMapper · ${indicator}`,
      accent: color,
      content: (
        <IndicatorDrill
          label={label}
          unit="%"
          decimals={2}
          series={split.hist}
          forecast={split.fc}
          sourceCode={indicator}
          sourceName="IMF DataMapper"
          imfCompareIndicator={indicator}
          threshold={threshold}
          accent={color}
        />
      ),
      source: { name: 'IMF DataMapper', url: `https://www.imf.org/external/datamapper/${indicator}@WEO/ESP` },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a
        href="/macro/margen-fiscal"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(90deg, #faf5ff 0%, #fff7ed 100%)',
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
            Vista profunda · /macro/margen-fiscal
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            7 indicadores fiscales IMF · deuda/saldos/ingresos/gasto con histórica 30y + forecast · lectura ejecutiva IA · drill por indicador
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <MacroKpiCard
          label="Deuda %PIB"
          value={deudaLast?.value ?? null}
          color={tab.themeAccent}
          spark={deudaSplit.hist.slice(-20).map((p) => p.value)}
          footer={deudaLast ? `IMF GGXWDG_NGDP · ${deudaLast.period}` : 'IMF GGXWDG_NGDP'}
          loading={loading}
          onClick={deudaSplit.hist.length > 1 ? openDrill1('Deuda %PIB', 'GGXWDG_NGDP', deudaSplit, { amber: 100, red: 120, goodAbove: false }, tab.themeAccent) : undefined}
        />
        <MacroKpiCard
          label="Saldo fiscal %PIB"
          value={saldoLast?.value ?? null}
          color="#f59e0b"
          spark={saldoSplit.hist.slice(-20).map((p) => p.value)}
          footer={saldoLast ? `IMF GGXCNL_NGDP · ${saldoLast.period}` : 'IMF GGXCNL_NGDP'}
          loading={loading}
          onClick={saldoSplit.hist.length > 1 ? openDrill1('Saldo fiscal %PIB', 'GGXCNL_NGDP', saldoSplit, undefined, '#f59e0b') : undefined}
        />
        <MacroKpiCard
          label="Saldo primario"
          value={primaryLast?.value ?? null}
          color="#10b981"
          spark={primarySplit.hist.slice(-20).map((p) => p.value)}
          footer="IMF GGXONLB_NGDP"
          loading={loading}
          onClick={primarySplit.hist.length > 1 ? openDrill1('Saldo primario', 'GGXONLB_NGDP', primarySplit, undefined, '#10b981') : undefined}
        />
        <MacroKpiCard
          label="Intereses (derivado)"
          value={intereses}
          color="#dc2626"
          footer="Primario − Total"
          decimals={2}
          loading={loading}
        />
      </div>

      {/* Trayectoria deuda · serie 30y + forecast */}
      {deudaSplit.hist.length > 5 && (
        <MacroPanel
          accent={tab.themeAccent}
          title="Trayectoria deuda pública · 30 años + forecast"
          subtitle="IMF GGXWDG_NGDP · stock deuda Maastricht %PIB · histórica + proyección 5y"
          status="live"
          aiAnalysis={{
            indicator: 'Deuda pública %PIB · IMF GGXWDG_NGDP',
            indicatorId: 'imf.weo.ggxwdg_ngdp.esp',
            tabSlug: 'margen-fiscal',
            series: [
              ...aiSeries(deudaSplit.hist),
              ...aiSeries(deudaSplit.fc.map((p: any) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '% PIB',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'GGXWDG_NGDP',
              lastUpdate: deudaLast?.period,
              frequency: 'annual',
              threshold: { amber: 100, red: 120, goodAbove: false },
              notes: [
                'Regla Maastricht: 60% PIB.',
                '2008-2014 explosión por crisis financiera; 2020 salto COVID +20pp.',
              ],
            },
            windowLabel: `${deudaSplit.hist.length}y hist + ${deudaSplit.fc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{
              id: 'd',
              label: 'Deuda %PIB',
              color: tab.themeAccent,
              points: [...deudaSplit.hist, ...deudaSplit.fc],
              forecastFromIndex: deudaSplit.hist.length,
              fillBelow: true,
            }]}
            height={240}
            yLabel="Deuda %PIB"
            annotations={[
              { period: '2008', label: 'Crisis', color: '#dc2626' },
              { period: '2020', label: 'COVID', color: '#dc2626' },
            ]}
            formatValue={(v) => `${v.toFixed(0)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Deuda pública %PIB"
              unit="%"
              decimals={1}
              series={deudaSplit.hist as any}
              forecast={deudaSplit.fc}
              threshold={{ amber: 100, red: 120, goodAbove: false }}
              accent={tab.themeAccent}
            />
          </div>
        </MacroPanel>
      )}

      {/* Saldo descompuesto · primary vs total · area chart */}
      {saldoSplit.hist.length > 5 && primarySplit.hist.length > 5 && (
        <MacroPanel
          accent="#f59e0b"
          title="Saldo fiscal · descompuesto"
          subtitle="Saldo total vs Saldo primario · intereses = diferencia · regla Maastricht 3%"
          status="live"
          aiAnalysis={{
            indicator: 'Saldo fiscal · IMF GGXCNL_NGDP',
            indicatorId: 'imf.weo.ggxcnl_ngdp.esp',
            tabSlug: 'margen-fiscal',
            series: [
              ...aiSeries(saldoSplit.hist),
              ...aiSeries(saldoSplit.fc.map((p: any) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '% PIB',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'GGXCNL_NGDP',
              lastUpdate: saldoLast?.period,
              frequency: 'annual',
              threshold: { amber: -3, red: -6, goodAbove: true },
              notes: [
                `Saldo primario último (GGXONLB_NGDP): ${primaryLast?.value?.toFixed?.(2) ?? '?'}% en ${primaryLast?.period ?? '?'}.`,
                `Intereses derivados (primario − total): ${intereses?.toFixed?.(2) ?? '?'}% PIB.`,
                'Regla Maastricht: déficit máximo 3% PIB.',
              ],
            },
            windowLabel: `${saldoSplit.hist.length}y hist + ${saldoSplit.fc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 's', label: 'Saldo total (GGXCNL_NGDP)', color: '#f59e0b', points: [...saldoSplit.hist, ...saldoSplit.fc], forecastFromIndex: saldoSplit.hist.length, fillBelow: true },
              { id: 'p', label: 'Saldo primario (GGXONLB_NGDP)', color: '#10b981', points: [...primarySplit.hist, ...primarySplit.fc], forecastFromIndex: primarySplit.hist.length },
            ]}
            height={240}
            yLabel="% PIB"
            zeroLine
            annotations={[
              { period: '2008', label: '−11% pico crisis', color: '#dc2626' },
            ]}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Saldo fiscal total"
              unit="%"
              decimals={2}
              series={saldoSplit.hist as any}
              forecast={saldoSplit.fc}
              threshold={{ amber: -3, red: -6, goodAbove: true }}
              accent="#f59e0b"
            />
          </div>
        </MacroPanel>
      )}

      {/* Ingresos vs Gasto · serie */}
      {ingresosSplit.hist.length > 5 && gastoSplit.hist.length > 5 && (
        <MacroPanel
          accent="#0891b2"
          title="Ingresos vs Gasto AAPP"
          subtitle="Tamaño Estado %PIB · GGR_NGDP vs GGX_NGDP"
          status="live"
          aiAnalysis={{
            indicator: 'Ingresos AAPP %PIB · IMF GGR_NGDP',
            indicatorId: 'imf.weo.ggr_ngdp.esp',
            tabSlug: 'margen-fiscal',
            series: [
              ...aiSeries(ingresosSplit.hist),
              ...aiSeries(ingresosSplit.fc.map((p: any) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '% PIB',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'GGR_NGDP',
              lastUpdate: ingLast?.period,
              frequency: 'annual',
              notes: [
                `Gasto AAPP (GGX_NGDP) último: ${gastoLast?.value?.toFixed?.(2) ?? '?'}% en ${gastoLast?.period ?? '?'}.`,
                `Diferencia ingresos − gasto = ${ingLast && gastoLast ? (ingLast.value - gastoLast.value).toFixed(2) : '?'}pp PIB (proxy saldo).`,
              ],
            },
            windowLabel: `${ingresosSplit.hist.length}y hist + ${ingresosSplit.fc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'r', label: 'Ingresos (GGR_NGDP)', color: '#16a34a', points: [...ingresosSplit.hist, ...ingresosSplit.fc], forecastFromIndex: ingresosSplit.hist.length },
              { id: 'x', label: 'Gasto (GGX_NGDP)', color: '#dc2626', points: [...gastoSplit.hist, ...gastoSplit.fc], forecastFromIndex: gastoSplit.hist.length },
            ]}
            height={220}
            yLabel="% PIB"
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Ingresos AAPP"
              unit="%"
              decimals={2}
              series={ingresosSplit.hist as any}
              forecast={ingresosSplit.fc}
              accent="#0891b2"
            />
          </div>
        </MacroPanel>
      )}

      {/* Comparativa peers UE */}
      <MacroPanel accent="#7c3aed" title="Deuda pública · España vs peers UE" subtitle="IMF GGXWDG_NGDP · último año disponible" status="live">
        <CountryCompareBars
          indicator="GGXWDG_NGDP"
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC', 'BEL', 'AUT']}
          spainColor={tab.themeAccent}
          unit="%"
          decimals={1}
        />
      </MacroPanel>

      <MacroPanel accent="#7c3aed" title="Saldo fiscal · España vs peers UE" subtitle="IMF GGXCNL_NGDP · último año disponible" status="live">
        <CountryCompareBars
          indicator="GGXCNL_NGDP"
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC']}
          spainColor="#f59e0b"
          unit="%"
          decimals={2}
        />
      </MacroPanel>
    </div>
  )
}

export default MargenFiscalTab
