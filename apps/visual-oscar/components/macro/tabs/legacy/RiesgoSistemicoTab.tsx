'use client'
/**
 * `<RiesgoSistemicoTab />` · Tab 5 · Riesgo sistémico PROFUNDO.
 *
 * Semáforo + spread soberano serie + IMF dimensiones de riesgo.
 * Fuentes:
 *  - macro-finance markets · ECB SDW yields + spreads
 *  - IMF GGXWDG_NGDP (deuda), GGXCNL_NGDP (déficit)
 *  - INE IPC (gap inflación)
 *  - Finnhub ^VIX
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { DeepLineChart } from '../DeepLineChart'
import { TrendNarrative } from '../TrendNarrative'
import { CountryCompareBars } from '../CountryCompareBars'
import { getTab } from '@/lib/macro/sources-matrix'
import type { ChartAnalysisInput } from '@/lib/macro/ai-schema'

function aiSeries(
  pts: { period: string; value: number | null; forecast?: boolean }[],
): { period: string; value: number; forecast?: boolean }[] {
  return pts
    .filter((p) => p.value != null && Number.isFinite(p.value))
    .map((p) => ({ period: p.period, value: p.value as number, ...(p.forecast ? { forecast: true } : {}) }))
}

interface SemaforoRow {
  indicator: string
  value: number | null
  threshold_amber: number
  threshold_red: number
  unit: string
  status: 'green' | 'amber' | 'red' | 'unknown'
  fuente: string
  descripcion: string
}

export function RiesgoSistemicoTab() {
  const tab = getTab('riesgo-sistemico')
  const [markets, setMarkets] = useState<any>(null)
  const [deuda, setDeuda] = useState<any>(null)
  const [deficit, setDeficit] = useState<any>(null)
  const [ipc, setIpc] = useState<any>(null)
  const [vix, setVix] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/macro-finance/markets', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGXWDG_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGXCNL_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/ipc?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/finnhub/quote?symbol=^VIX', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([m, d, df, i, v]) => {
      if (!alive) return
      setMarkets(m); setDeuda(d); setDeficit(df); setIpc(i); setVix(v); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const spreadEsDe = markets?.spreads?.find?.((s: any) =>
    (s.code?.toLowerCase?.()?.includes('es') && s.code?.toLowerCase?.()?.includes('de')) ||
    s.label?.toLowerCase?.()?.includes('españa'),
  )?.value ?? markets?.spread_es_de ?? null
  const bondEs10y = markets?.yield_curve?.find?.((y: any) => y.tenor?.includes('10Y'))?.value ?? null

  const deudaLast = (deuda?.series || []).filter((x: any) => x.value != null).slice(-1)[0]
  const deficitLast = (deficit?.series || []).filter((x: any) => x.value != null).slice(-1)[0]
  const ipcLast = ipc?.anual?.points?.[0]?.value ?? null
  const vixLast = vix?.c ?? vix?.price ?? vix?.value ?? null

  const status = (v: number | null, amber: number, red: number): 'green' | 'amber' | 'red' | 'unknown' => {
    if (v == null || !Number.isFinite(v)) return 'unknown'
    if (v < amber) return 'green'
    if (v < red) return 'amber'
    return 'red'
  }

  const semaforo: SemaforoRow[] = [
    spreadEsDe != null ? {
      indicator: 'Spread soberano vs Bund 10Y',
      value: spreadEsDe,
      threshold_amber: 100, threshold_red: 200,
      unit: 'pb', status: status(spreadEsDe, 100, 200),
      fuente: 'ECB SDW',
      descripcion: 'Diferencial 10y España vs Alemania · indicador clave de estrés soberano',
    } : null,
    deudaLast?.value != null ? {
      indicator: 'Deuda pública %PIB',
      value: deudaLast.value,
      threshold_amber: 100, threshold_red: 120,
      unit: '%', status: status(deudaLast.value, 100, 120),
      fuente: 'IMF GGXWDG_NGDP',
      descripcion: 'Stock deuda Maastricht · 60% es el límite del Tratado',
    } : null,
    deficitLast?.value != null ? {
      indicator: 'Déficit fiscal %PIB',
      value: -deficitLast.value,
      threshold_amber: 3, threshold_red: 6,
      unit: '%', status: status(-deficitLast.value, 3, 6),
      fuente: 'IMF GGXCNL_NGDP',
      descripcion: 'Déficit > 3% rompe regla Maastricht · > 6% crisis',
    } : null,
    ipcLast != null ? {
      indicator: 'Inflación gap vs target 2%',
      value: Math.abs(ipcLast - 2.0),
      threshold_amber: 1.0, threshold_red: 2.5,
      unit: 'pp', status: status(Math.abs(ipcLast - 2.0), 1.0, 2.5),
      fuente: 'INE IPC',
      descripcion: 'Distancia absoluta IPC anual vs target BCE 2%',
    } : null,
    vixLast != null ? {
      indicator: 'VIX volatilidad',
      value: vixLast,
      threshold_amber: 20, threshold_red: 30,
      unit: '', status: status(vixLast, 20, 30),
      fuente: 'Finnhub ^VIX',
      descripcion: 'Índice de volatilidad S&P500 · > 30 risk-off generalizado',
    } : null,
  ].filter(Boolean) as SemaforoRow[]

  const statusColors = {
    green: { bg: '#dcfce7', border: '#86efac', dot: '#16a34a', label: 'BAJO' },
    amber: { bg: '#fef3c7', border: '#fcd34d', dot: '#f59e0b', label: 'MEDIO' },
    red: { bg: '#fee2e2', border: '#fca5a5', dot: '#dc2626', label: 'ALTO' },
    unknown: { bg: '#f1f5f9', border: '#cbd5e1', dot: '#94a3b8', label: 'S/D' },
  } as const

  // Score compuesto (0=todo verde, 100=todo rojo)
  const scoreNum = semaforo.length > 0
    ? semaforo.reduce((s, r) => s + (r.status === 'red' ? 100 : r.status === 'amber' ? 50 : 0), 0) / semaforo.length
    : null

  // Deuda histórica para chart
  const cy = new Date().getFullYear()
  const deudaHist = (deuda?.series || []).filter((s: any) => s.value != null && s.year <= cy).map((s: any) => ({ period: String(s.year), value: s.value }))
  const deudaFc = (deuda?.series || []).filter((s: any) => s.value != null && s.year > cy).map((s: any) => ({ period: String(s.year), value: s.value }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a
        href="/macro/riesgo-sistemico"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(90deg, #faf5ff 0%, #fef2f2 100%)',
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
            Vista profunda · /macro/riesgo-sistemico
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            Termómetro de vulnerabilidades · deuda/déficit/inflación gap/paro · lectura ejecutiva IA con diagnóstico transversal · drill 9 subpestañas
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      {/* Score compuesto */}
      {scoreNum != null && (
        <div style={{
          background: scoreNum > 50 ? '#fef2f2' : scoreNum > 25 ? '#fffbeb' : '#f0fdf4',
          border: `2px solid ${scoreNum > 50 ? '#fca5a5' : scoreNum > 25 ? '#fde68a' : '#86efac'}`,
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Score compuesto riesgo sistémico
            </p>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0', maxWidth: 500 }}>
              Media ponderada de los {semaforo.length} indicadores activos · 0=todo verde, 100=todo rojo.
            </p>
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: scoreNum > 50 ? '#dc2626' : scoreNum > 25 ? '#f59e0b' : '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
            {scoreNum.toFixed(0)}
            <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500, marginLeft: 6 }}>/ 100</span>
          </div>
        </div>
      )}

      {/* Semáforo */}
      <MacroPanel
        accent={tab.themeAccent}
        title={`Semáforo riesgo sistémico · ${semaforo.length} indicadores`}
        subtitle="Verde/Ámbar/Rojo según umbrales académicos · datos LIVE"
        status={loading ? 'loading' : 'live'}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {semaforo.map((s, i) => {
            const cfg = statusColors[s.status]
            return (
              <div key={i} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 11, color: '#0f172a', margin: 0, fontWeight: 700 }}>{s.indicator}</p>
                  <span style={{ background: cfg.dot, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                    {cfg.label}
                  </span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, color: cfg.dot, margin: '6px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {s.value != null ? `${s.value.toFixed(1)}${s.unit}` : '—'}
                </p>
                <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>{s.descripcion}</p>
                <p style={{ fontSize: 9, color: '#94a3b8', margin: '4px 0 0' }}>
                  Umbrales: ámbar ≥ {s.threshold_amber}{s.unit} · rojo ≥ {s.threshold_red}{s.unit} · {s.fuente}
                </p>
              </div>
            )
          })}
        </div>
      </MacroPanel>

      {/* Deuda histórica chart + lectura */}
      {deudaHist.length > 5 && (
        <MacroPanel
          accent="#dc2626"
          title="Deuda pública %PIB · trayectoria + forecast"
          subtitle="IMF GGXWDG_NGDP · histórica + proyección 5y · alerta a 100%/120%"
          status="live"
          aiAnalysis={{
            indicator: 'Deuda pública %PIB (vista riesgo) · IMF GGXWDG_NGDP',
            indicatorId: 'imf.weo.ggxwdg_ngdp.esp.riesgo',
            tabSlug: 'riesgo-sistemico',
            series: [
              ...aiSeries(deudaHist),
              ...aiSeries(deudaFc.map((p: any) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '% PIB',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'GGXWDG_NGDP',
              lastUpdate: deudaHist[deudaHist.length - 1]?.period,
              frequency: 'annual',
              threshold: { amber: 100, red: 120, goodAbove: false },
              notes: [
                `Score compuesto del semáforo (5 indicadores): ${scoreNum?.toFixed?.(0) ?? '?'}/100.`,
                `Spread vs Bund último: ${spreadEsDe?.toFixed?.(0) ?? '?'} pb. Bono 10y: ${bondEs10y?.toFixed?.(2) ?? '?'}%.`,
                'Interpretar como factor de estrés en interacción con spread y déficit.',
              ],
            },
            windowLabel: `${deudaHist.length}y hist + ${deudaFc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{
              id: 'd',
              label: 'Deuda %PIB',
              color: '#dc2626',
              points: [...deudaHist, ...deudaFc],
              forecastFromIndex: deudaHist.length,
              fillBelow: true,
            }]}
            height={220}
            yLabel="Deuda %PIB"
            annotations={[
              { period: '2014', label: '100% umbral', color: '#f59e0b' },
              { period: '2020', label: 'COVID', color: '#dc2626' },
            ]}
            formatValue={(v) => `${v.toFixed(0)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Deuda pública"
              unit="%"
              decimals={1}
              series={deudaHist}
              forecast={deudaFc}
              threshold={{ amber: 100, red: 120, goodAbove: false }}
              accent="#dc2626"
            />
          </div>
        </MacroPanel>
      )}

      {/* Comparativa peers */}
      <MacroPanel accent="#7c3aed" title="Deuda pública · España vs UE" subtitle="IMF GGXWDG_NGDP · último año" status="live">
        <CountryCompareBars
          indicator="GGXWDG_NGDP"
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC', 'BEL']}
          spainColor={tab.themeAccent}
          unit="%"
          decimals={1}
        />
      </MacroPanel>
    </div>
  )
}

export default RiesgoSistemicoTab
