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
