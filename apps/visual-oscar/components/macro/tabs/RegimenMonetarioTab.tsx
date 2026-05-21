'use client'
/**
 * `<RegimenMonetarioTab />` · Tab 2 · Régimen monetario España + zona euro.
 *
 * Combina:
 *  - INE IPC (variación anual + mensual + acumulada) · oficial nacional
 *  - macro-finance markets · ECB SDW yields curva + tipos política BCE
 *  - IMF PCPIPCH como verificador externo
 *  - BIS effective FX España
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { MacroSpark } from '../MacroSpark'
import { getTab } from '@/lib/macro/sources-matrix'
import { useMacroDrawer } from '../MacroDrawerProvider'

interface InePoint { period: string; year: number; value: number | null }
interface IneIpcData {
  ok: boolean
  data_quality?: { source_type: string }
  anual?: { name?: string; points: InePoint[] }
  mensual?: { name?: string; points: InePoint[] }
  acumulada?: { name?: string; points: InePoint[] }
}

interface MarketsData {
  ok: boolean
  data_quality?: { source_type: string }
  yield_curve?: { tenor: string; value: number }[]
  policy_rates?: { code: string; label: string; value: number | null }[]
}

export function RegimenMonetarioTab() {
  const tab = getTab('regimen-monetario')
  const { openDrill } = useMacroDrawer()
  const [ipc, setIpc] = useState<IneIpcData | null>(null)
  const [markets, setMarkets] = useState<MarketsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/ine/ipc?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/macro-finance/markets', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([ipcData, marketsData]) => {
      if (!alive) return
      setIpc(ipcData)
      setMarkets(marketsData)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const ipcAnualLast = ipc?.anual?.points?.[0]
  const ipcMensualLast = ipc?.mensual?.points?.[0]
  const ipcAcumuladaLast = ipc?.acumulada?.points?.[0]
  const ipcSpark = (ipc?.anual?.points || []).map((p) => p.value).filter((v): v is number => v != null).reverse()

  const openIpcDrill = () => {
    openDrill({
      title: 'IPC España · serie histórica',
      subtitle: 'INE · variación anual nacional general',
      accent: tab.themeAccent,
      content: (
        <div>
          <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            <strong>Última lectura:</strong> {ipcAnualLast?.value?.toFixed(1)}% · {ipcAnualLast?.period}
          </p>
          <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            El IPC nacional general mide la variación de precios al consumo respecto al mismo mes del año anterior.
            Base de cálculo 2021=100 (ECOICOP ver.2).
          </p>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginTop: 16 }}>Serie 24 meses</h4>
          <table style={{ width: '100%', fontSize: 11, marginTop: 8, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b' }}>Periodo</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b' }}>Anual</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b' }}>Mensual</th>
              </tr>
            </thead>
            <tbody>
              {(ipc?.anual?.points || []).slice(0, 24).map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '4px 8px', color: '#0f172a' }}>{p.period}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {p.value?.toFixed(1)}%
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                    {ipc?.mensual?.points?.[i]?.value?.toFixed(1) ?? '—'}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 12, fontStyle: 'italic' }}>
            Fuente · INE WSTempus / IPC290750 · variación anual nacional general
          </p>
        </div>
      ),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TabHeader tab={tab} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <MacroKpiCard
          label="IPC · Variación anual"
          value={ipcAnualLast?.value ?? null}
          color={tab.themeAccent}
          spark={ipcSpark.slice(-12)}
          footer={ipcAnualLast?.period ? `Último: ${ipcAnualLast.period}` : undefined}
          onClick={openIpcDrill}
          loading={loading}
        />
        <MacroKpiCard
          label="IPC · Variación mensual"
          value={ipcMensualLast?.value ?? null}
          color="#8b5cf6"
          footer={ipcMensualLast?.period ? `Último: ${ipcMensualLast.period}` : undefined}
          loading={loading}
        />
        <MacroKpiCard
          label="IPC · Acumulada año"
          value={ipcAcumuladaLast?.value ?? null}
          color="#a855f7"
          footer={ipcAcumuladaLast?.period ? `${ipcAcumuladaLast.period} · YTD` : undefined}
          loading={loading}
        />
        <MacroKpiCard
          label="BCE · Depo rate"
          value={markets?.policy_rates?.find((r) => r.code?.toUpperCase().includes('DFR'))?.value ?? null}
          color="#6366f1"
          footer="Tasa de facilidad de depósito"
          loading={loading}
        />
      </div>

      <MacroPanel
        accent={tab.themeAccent}
        title="Curva de tipos soberanos · España"
        subtitle="ECB SDW · plazos 3m a 30y · daily"
        status={markets?.ok ? 'live' : loading ? 'loading' : 'missing'}
      >
        {markets?.yield_curve && markets.yield_curve.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8 }}>
            {markets.yield_curve.map((y, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 6, padding: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>{y.tenor}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: tab.themeAccent, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {y.value?.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#94a3b8' }}>
            {loading ? 'Cargando curva yields…' : 'Curva no disponible · ECB SDW puede estar rate-limited'}
          </p>
        )}
      </MacroPanel>

      {markets?.policy_rates && markets.policy_rates.length > 0 && (
        <MacroPanel
          accent="#8b5cf6"
          title="Política BCE · Tipos oficiales"
          subtitle="Main Refinancing · Deposit Facility · Marginal Lending"
          status="live"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {markets.policy_rates.map((r, i) => (
              <MacroKpiCard key={i} label={r.label} value={r.value} color="#8b5cf6" footer={r.code} />
            ))}
          </div>
        </MacroPanel>
      )}

      {ipcSpark.length > 2 && (
        <MacroPanel
          accent="#a855f7"
          title="IPC España · serie 24 meses"
          subtitle="Variación anual · INE base 2021"
          status="live"
        >
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16 }}>
            <MacroSpark points={ipcSpark} color="#a855f7" width={760} height={120} stroke={2.5} showLast />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#64748b' }}>
              <span>{ipc?.anual?.points?.[ipc.anual.points.length - 1]?.period}</span>
              <span style={{ fontWeight: 700 }}>
                Rango: {Math.min(...ipcSpark).toFixed(1)}% – {Math.max(...ipcSpark).toFixed(1)}%
              </span>
              <span>{ipc?.anual?.points?.[0]?.period}</span>
            </div>
          </div>
        </MacroPanel>
      )}

      <section style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: tab.themeAccent, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          ✦ Lectura Politeia · IA
        </p>
        <p style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, margin: '8px 0 0' }}>
          Lectura monetaria con vector inflación, curva yields, política BCE, expectativas SPF y diferencial real se activa en <strong>Sprint M6</strong>. Por ahora los datos arriba ofrecen lectura directa INE+ECB.
        </p>
      </section>
    </div>
  )
}

export default RegimenMonetarioTab
