'use client'
/**
 * `<EmpresasBeneficiosTab />` · Tab 9 PROFUNDO.
 * Fuentes vivas: Finnhub IBEX live, ADRs, big tech.
 * Sin empty states Registradores (regla del usuario).
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { getTab } from '@/lib/macro/sources-matrix'
import { useMacroDrawer } from '../MacroDrawerProvider'

export function EmpresasBeneficiosTab() {
  const tab = getTab('empresas-beneficios')
  const { openDrill } = useMacroDrawer()
  const [finnhub, setFinnhub] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/finnhub/dashboard', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((d) => { if (alive) { setFinnhub(d); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const adrs = finnhub?.adrs || finnhub?.spanish_stocks || []
  const ibex = finnhub?.indices?.find?.((q: any) => q.symbol?.includes('IBEX')) || finnhub?.ibex
  const bigtech = finnhub?.bigtech || finnhub?.us_bigtech || []
  const crypto = finnhub?.crypto || []

  const gainers = adrs.filter((a: any) => (a.change_pct ?? 0) > 0)
  const losers = adrs.filter((a: any) => (a.change_pct ?? 0) < 0)
  const breadth = adrs.length > 0 ? (gainers.length - losers.length) / adrs.length : null

  const openTickerDrill = (q: any) => {
    openDrill({
      title: `${q.symbol} · ${q.name || ''}`,
      subtitle: 'FINNHUB · QUOTE LIVE',
      accent: tab.themeAccent,
      content: (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div style={{ background: '#faf5ff', borderRadius: 8, padding: 12, borderLeft: `3px solid ${tab.themeAccent}` }}>
              <p style={{ fontSize: 10, color: '#581c87', margin: 0, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>PRECIO</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: tab.themeAccent, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                ${q.price?.toFixed(2) ?? '—'}
              </p>
            </div>
            <div style={{ background: '#faf5ff', borderRadius: 8, padding: 12, borderLeft: `3px solid ${tab.themeAccent}` }}>
              <p style={{ fontSize: 10, color: '#581c87', margin: 0, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>VAR. DÍA</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: (q.change_pct ?? 0) >= 0 ? '#16a34a' : '#dc2626', margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                {q.change_pct != null ? `${q.change_pct >= 0 ? '+' : ''}${q.change_pct.toFixed(2)}%` : '—'}
              </p>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 16, lineHeight: 1.6 }}>
            <strong>Ticker:</strong> {q.symbol}<br />
            <strong>Empresa:</strong> {q.name || '—'}<br />
            <strong>Volumen:</strong> {q.volume?.toLocaleString('es-ES') ?? '—'}<br />
            <strong>Apertura:</strong> ${q.open?.toFixed(2) ?? '—'} · <strong>Máx:</strong> ${q.high?.toFixed(2) ?? '—'} · <strong>Mín:</strong> ${q.low?.toFixed(2) ?? '—'}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 16, fontStyle: 'italic' }}>
            Fuente · Finnhub.io · datos US ADRs
          </p>
        </div>
      ),
      source: { name: 'Finnhub', url: `https://finnhub.io/quote/${q.symbol}` },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {ibex && (
          <MacroKpiCard
            label="IBEX 35"
            value={ibex.price}
            unit=" pts"
            delta={ibex.change_pct}
            color={tab.themeAccent}
            decimals={0}
            footer="Finnhub · live"
            loading={loading}
          />
        )}
        {adrs.length > 0 && (
          <>
            <MacroKpiCard
              label="Cotizadas en verde"
              value={gainers.length}
              unit=""
              color="#16a34a"
              decimals={0}
              footer={`${gainers.length}/${adrs.length} ADRs`}
              loading={loading}
            />
            <MacroKpiCard
              label="Cotizadas en rojo"
              value={losers.length}
              unit=""
              color="#dc2626"
              decimals={0}
              footer={`${losers.length}/${adrs.length} ADRs`}
              loading={loading}
            />
            {breadth != null && (
              <MacroKpiCard
                label="Market breadth"
                value={breadth * 100}
                unit="%"
                color="#7c3aed"
                decimals={1}
                footer="Gainers − losers / total"
                loading={loading}
              />
            )}
          </>
        )}
      </div>

      {/* Cotizadas ES top */}
      {adrs.length > 0 && (
        <MacroPanel
          accent={tab.themeAccent}
          title={`Cotizadas España · ${adrs.length} ADRs Finnhub`}
          subtitle="SAN, BBVA, TEF, FER, IBE, REP, ITX · click ticker → drill"
          status="live"
        >
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Ticker</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Empresa</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Precio</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Δ %</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Movim</th>
              </tr>
            </thead>
            <tbody>
              {adrs.slice(0, 20).map((q: any, i: number) => {
                const pct = q.change_pct ?? 0
                const sign = pct >= 0 ? 1 : -1
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => openTickerDrill(q)}>
                    <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{q.symbol}</td>
                    <td style={{ padding: '6px 10px', color: '#64748b' }}>{q.name || '—'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${q.price?.toFixed(2) ?? '—'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: pct >= 0 ? '#16a34a' : '#dc2626' }}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ background: '#f1f5f9', height: 6, borderRadius: 3, width: 80, position: 'relative' }}>
                        <div style={{
                          width: `${Math.min(Math.abs(pct) * 10, 50)}%`,
                          height: '100%',
                          background: pct >= 0 ? '#16a34a' : '#dc2626',
                          borderRadius: 3,
                          position: 'absolute',
                          left: sign > 0 ? '50%' : `${50 - Math.min(Math.abs(pct) * 10, 50)}%`,
                        }} />
                        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: '#94a3b8' }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </MacroPanel>
      )}

      {/* Big tech US benchmark */}
      {bigtech.length > 0 && (
        <MacroPanel accent="#3b82f6" title="US Big Tech · benchmark internacional" subtitle="Finnhub · AAPL, MSFT, GOOGL, NVDA..." status="live">
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <tbody>
              {bigtech.slice(0, 10).map((q: any, i: number) => {
                const pct = q.change_pct ?? 0
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{q.symbol}</td>
                    <td style={{ padding: '6px 10px', color: '#64748b' }}>{q.name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${q.price?.toFixed(2)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: pct >= 0 ? '#16a34a' : '#dc2626' }}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </MacroPanel>
      )}

      {/* Crypto */}
      {crypto.length > 0 && (
        <MacroPanel accent="#eab308" title="Crypto · top mercado" subtitle="Finnhub · BTC, ETH, BNB..." status="live">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {crypto.slice(0, 8).map((c: any, i: number) => (
              <MacroKpiCard
                key={i}
                label={c.symbol || c.name}
                value={c.price ?? null}
                unit=" $"
                delta={c.change_pct ?? null}
                color="#eab308"
                decimals={0}
              />
            ))}
          </div>
        </MacroPanel>
      )}
    </div>
  )
}

export default EmpresasBeneficiosTab
