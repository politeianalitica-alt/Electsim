'use client'
/**
 * `<FlujosCapitalTab />` · Tab 7 · Flujos de capital PROFUNDO.
 * Fuentes vivas:
 *  - IMF BCA_NGDPD (cuenta corriente) + BCA_BP6_USD (en USD)
 *  - IMF GGXWDG_NGDP comparativa
 *  - INE CNT exports/imports
 *  - BIS effective FX
 * Empty states de DataInvex/SCI eliminados (regla del usuario).
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { DeepLineChart } from '../DeepLineChart'
import { TrendNarrative } from '../TrendNarrative'
import { CountryCompareBars } from '../CountryCompareBars'
import { getTab } from '@/lib/macro/sources-matrix'

export function FlujosCapitalTab() {
  const tab = getTab('flujos-capital')
  const [cuentaCp, setCuentaCp] = useState<any>(null)
  const [cuentaCusd, setCuentaCusd] = useState<any>(null)
  const [cnt, setCnt] = useState<any>(null)
  const [bisFx, setBisFx] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/imf/country?iso=ESP&indicator=BCA_NGDPD', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=BCA_BP6_USD', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/cnt-extra?n=20', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/bis/fx-effective', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([cp, cu, ct, b]) => {
      if (!alive) return
      setCuentaCp(cp); setCuentaCusd(cu); setCnt(ct); setBisFx(b); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const cy = new Date().getFullYear()
  const splitImf = (d: any) => {
    const all = (d?.series || []).filter((s: any) => s.value != null) as { year: number; value: number }[]
    return {
      hist: all.filter((x) => x.year <= cy).map((x) => ({ period: String(x.year), value: x.value })),
      fc: all.filter((x) => x.year > cy).map((x) => ({ period: String(x.year), value: x.value })),
    }
  }

  const cpSplit = splitImf(cuentaCp)
  const cusdSplit = splitImf(cuentaCusd)
  const cpLast = cpSplit.hist[cpSplit.hist.length - 1]
  const cusdLast = cusdSplit.hist[cusdSplit.hist.length - 1]

  const rev = (pts: any[] = []) => pts.slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  const expSeries = rev(cnt?.exports?.points)
  const impSeries = rev(cnt?.imports?.points)
  const expLast = cnt?.exports?.points?.[0]
  const impLast = cnt?.imports?.points?.[0]
  const reerSeries = (bisFx?.broad?.points || []).map((p: any) => ({ period: String(p.period || p.date || ''), value: p.value }))
  const reerLast = reerSeries[reerSeries.length - 1]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a
        href="/macro/flujos-capital"
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(90deg, #faf5ff 0%, #f0f9ff 100%)',
          border: '1px solid #e9d5ff', borderLeft: `4px solid ${tab.themeAccent}`,
          borderRadius: 10, padding: '12px 16px', color: '#0f172a', textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · /macro/flujos-capital
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            Atracción/salida de capital · cuenta corriente · deuda · PII · análisis IA Groq por gráfica · radar datos.gob.es
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {cpLast && (
          <MacroKpiCard
            label="Cuenta corriente %PIB"
            value={cpLast.value}
            color={tab.themeAccent}
            spark={cpSplit.hist.slice(-12).map((p) => p.value)}
            footer={`IMF BCA_NGDPD · ${cpLast.period}`}
            loading={loading}
          />
        )}
        {cusdLast && (
          <MacroKpiCard
            label="Cuenta corriente USD"
            value={cusdLast.value / 1e9}
            unit="B$"
            color="#0891b2"
            decimals={1}
            footer={`IMF BCA_BP6_USD · ${cusdLast.period}`}
            loading={loading}
          />
        )}
        {expLast && (
          <MacroKpiCard
            label="Exportaciones YoY"
            value={expLast.value}
            color="#10b981"
            footer={`INE CNT · ${expLast.period}`}
            loading={loading}
          />
        )}
        {reerLast && (
          <MacroKpiCard
            label="REER broad"
            value={reerLast.value}
            unit=""
            color="#f97316"
            decimals={1}
            footer="BIS · tipo cambio real efectivo"
            loading={loading}
          />
        )}
      </div>

      {/* Cuenta corriente serie larga */}
      {cpSplit.hist.length > 5 && (
        <MacroPanel
          accent={tab.themeAccent}
          title="Cuenta corriente España · 20y + forecast"
          subtitle="IMF BCA_NGDPD · superávit positivo · déficit negativo"
          status="live"
        >
          <DeepLineChart
            series={[{
              id: 'cc',
              label: 'Cuenta corriente %PIB',
              color: tab.themeAccent,
              points: [...cpSplit.hist, ...cpSplit.fc],
              forecastFromIndex: cpSplit.hist.length,
              fillBelow: true,
            }]}
            height={220}
            yLabel="% PIB"
            zeroLine
            annotations={[
              { period: '2008', label: 'Déficit −10%', color: '#dc2626' },
              { period: '2013', label: 'Vuelta a superávit', color: '#16a34a' },
            ]}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Cuenta corriente"
              unit="%"
              decimals={2}
              series={cpSplit.hist as any}
              forecast={cpSplit.fc}
              accent={tab.themeAccent}
            />
          </div>
        </MacroPanel>
      )}

      {/* Exports vs Imports INE */}
      {expSeries.length > 5 && impSeries.length > 5 && (
        <MacroPanel
          accent="#0891b2"
          title="Comercio exterior · YoY · INE CNT"
          subtitle="Exportaciones (CNTR7267) vs Importaciones (CNTR7287) · volumen SA"
          status="live"
        >
          <DeepLineChart
            series={[
              { id: 'x', label: 'Exportaciones', color: '#0891b2', points: expSeries },
              { id: 'm', label: 'Importaciones', color: '#f97316', points: impSeries },
            ]}
            height={220}
            yLabel="Var anual %"
            zeroLine
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Exportaciones"
              unit="%"
              decimals={2}
              series={expSeries as any}
              accent="#0891b2"
            />
          </div>
        </MacroPanel>
      )}

      {/* REER */}
      {reerSeries.length > 5 && (
        <MacroPanel
          accent="#f97316"
          title="BIS · Tipo cambio real efectivo amplio"
          subtitle="Broad effective FX · base 2010=100 · indicador competitividad"
          status="live"
        >
          <DeepLineChart
            series={[{ id: 'reer', label: 'REER broad', color: '#f97316', points: reerSeries, fillBelow: true }]}
            height={200}
            yLabel="REER index"
            formatValue={(v) => v.toFixed(1)}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="REER broad"
              unit=""
              decimals={1}
              series={reerSeries as any}
              accent="#f97316"
            />
          </div>
        </MacroPanel>
      )}

      {/* Comparativa peers cuenta corriente */}
      <MacroPanel accent="#7c3aed" title="Cuenta corriente · España vs peers UE" subtitle="IMF BCA_NGDPD · último año" status="live">
        <CountryCompareBars
          indicator="BCA_NGDPD"
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC']}
          spainColor={tab.themeAccent}
          unit="%"
          decimals={2}
        />
      </MacroPanel>
    </div>
  )
}

export default FlujosCapitalTab
