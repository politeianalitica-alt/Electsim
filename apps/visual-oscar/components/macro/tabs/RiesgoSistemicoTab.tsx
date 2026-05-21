'use client'
/**
 * `<RiesgoSistemicoTab />` · Tab 5 · Riesgo sistémico España.
 * Semáforo 5 indicadores compuestos · spread/deuda/déficit/inflación/confianza.
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { getTab } from '@/lib/macro/sources-matrix'

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
  const [cis, setCis] = useState<any>(null)
  const [ipc, setIpc] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/macro-finance/markets', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGXWDG_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGXCNL_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/cis/confianza-instituciones', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/ipc?n=12', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([m, d, df, c, i]) => {
      if (!alive) return
      setMarkets(m); setDeuda(d); setDeficit(df); setCis(c); setIpc(i)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const spreadEsDe =
    markets?.spreads?.find?.((s: any) =>
      (s.code?.toLowerCase?.()?.includes('es') && s.code?.toLowerCase?.()?.includes('de')) ||
      s.label?.toLowerCase?.()?.includes('españa'),
    )?.value ||
    markets?.spread_es_de ||
    null
  const deudaLast = (deuda?.series || []).filter((x: any) => x.value != null).slice(-1)[0]
  const deficitLast = (deficit?.series || []).filter((x: any) => x.value != null).slice(-1)[0]
  const ipcLast = ipc?.anual?.points?.[0]?.value ?? null
  const confianzaGobierno = cis?.instituciones?.find((c: any) => c.institucion?.includes('Gobierno'))?.valoracion ?? null

  const status = (v: number | null, amber: number, red: number, invertir = false): 'green' | 'amber' | 'red' | 'unknown' => {
    if (v == null || !Number.isFinite(v)) return 'unknown'
    if (invertir) {
      if (v >= amber) return 'green'
      if (v >= red) return 'amber'
      return 'red'
    }
    if (v < amber) return 'green'
    if (v < red) return 'amber'
    return 'red'
  }

  const semaforo: SemaforoRow[] = [
    {
      indicator: 'Spread soberano vs Bund 10Y',
      value: spreadEsDe,
      threshold_amber: 100,
      threshold_red: 200,
      unit: 'pb',
      status: status(spreadEsDe, 100, 200),
      fuente: 'ECB SDW',
      descripcion: 'Diferencial 10y España vs Alemania · indicador clave estrés soberano',
    },
    {
      indicator: 'Deuda pública %PIB',
      value: deudaLast?.value ?? null,
      threshold_amber: 100,
      threshold_red: 120,
      unit: '%',
      status: status(deudaLast?.value ?? null, 100, 120),
      fuente: 'IMF GGXWDG_NGDP',
      descripcion: 'Stock deuda Maastricht · si rebasa 100% inicia ámbar',
    },
    {
      indicator: 'Déficit fiscal %PIB',
      value: deficitLast?.value != null ? -deficitLast.value : null,
      threshold_amber: 3,
      threshold_red: 6,
      unit: '%',
      status: status(deficitLast?.value != null ? -deficitLast.value : null, 3, 6),
      fuente: 'IMF GGXCNL_NGDP',
      descripcion: 'Déficit > 3% rompe regla Maastricht · > 6% crisis',
    },
    {
      indicator: 'Inflación gap vs target 2%',
      value: ipcLast != null ? Math.abs(ipcLast - 2.0) : null,
      threshold_amber: 1.0,
      threshold_red: 2.5,
      unit: 'pp',
      status: status(ipcLast != null ? Math.abs(ipcLast - 2.0) : null, 1.0, 2.5),
      fuente: 'INE IPC',
      descripcion: 'Distancia absoluta IPC anual vs target BCE 2%',
    },
    {
      indicator: 'Confianza Gobierno (CIS)',
      value: confianzaGobierno,
      threshold_amber: 4.5,
      threshold_red: 3.5,
      unit: '/10',
      status: status(confianzaGobierno, 4.5, 3.5, true),
      fuente: 'CIS Barómetro',
      descripcion: 'Valoración media Gobierno escala 0-10 · indicador estabilidad política',
    },
  ]

  const statusColors = {
    green: { bg: '#dcfce7', border: '#86efac', dot: '#16a34a', label: 'BAJO' },
    amber: { bg: '#fef3c7', border: '#fcd34d', dot: '#f59e0b', label: 'MEDIO' },
    red: { bg: '#fee2e2', border: '#fca5a5', dot: '#dc2626', label: 'ALTO' },
    unknown: { bg: '#f1f5f9', border: '#cbd5e1', dot: '#94a3b8', label: 'S/D' },
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TabHeader tab={tab} />

      <MacroPanel
        accent={tab.themeAccent}
        title="Semáforo Riesgo Sistémico · 5 indicadores compuestos"
        subtitle="Verde/Ámbar/Rojo según umbrales académicos · LIVE 1h cache"
        status={loading ? 'loading' : 'live'}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {semaforo.map((s, i) => {
            const cfg = statusColors[s.status]
            return (
              <div key={i} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 11, color: '#0f172a', margin: 0, fontWeight: 700 }}>{s.indicator}</p>
                  <span style={{ background: cfg.dot, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, letterSpacing: 0.4 }}>
                    {cfg.label}
                  </span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, color: cfg.dot, margin: '6px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {s.value != null ? `${s.value.toFixed(1)}${s.unit}` : '—'}
                </p>
                <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>
                  {s.descripcion}
                </p>
                <p style={{ fontSize: 9, color: '#94a3b8', margin: '4px 0 0', letterSpacing: 0.3 }}>
                  Umbrales: ámbar≥{s.threshold_amber}{s.unit} · rojo≥{s.threshold_red}{s.unit} · fuente {s.fuente}
                </p>
              </div>
            )
          })}
        </div>
      </MacroPanel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <MacroKpiCard label="Spread ES-DE 10Y" value={spreadEsDe} unit="pb" color={tab.themeAccent} footer="ECB SDW · 10Y soberano" decimals={0} loading={loading} />
        <MacroKpiCard label="VIX Volatilidad" value={null} color="#7c3aed" footer="Pendiente · ^VIX Finnhub" loading={loading} />
        <MacroKpiCard label="Reservas BdE" value={null} unit="€B" color="#0891b2" footer="Pendiente · COFER IMF" loading={loading} />
        <MacroKpiCard label="Confianza Gobierno" value={confianzaGobierno} unit="/10" color="#0f766e" footer="CIS · escala 0-10" loading={loading} />
      </div>

      <section style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: tab.themeAccent, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          ✦ Lectura Politeia · IA
        </p>
        <p style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, margin: '8px 0 0' }}>
          Análisis combinado de estrés soberano + fragilidad fiscal + drift inflación + estabilidad política llega en <strong>Sprint M6</strong>. El semáforo arriba ofrece el resumen visual directo.
        </p>
      </section>
    </div>
  )
}

export default RiesgoSistemicoTab
