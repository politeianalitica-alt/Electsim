'use client'
/**
 * `<MercadosActivosTab />` · Tab 6 · Mercados & activos.
 *
 * Combina:
 *  - Finnhub: IBEX live + ADRs SAN/BBVA/TEF/FER
 *  - macro-finance markets: yields + FX
 *  - /api/commodities/snapshot-all: oil/gold/copper/BDI
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { getTab } from '@/lib/macro/sources-matrix'

interface Quote { symbol?: string; price?: number | null; change_pct?: number | null; name?: string }

export function MercadosActivosTab() {
  const tab = getTab('mercados-activos')
  const [finnhub, setFinnhub] = useState<any>(null)
  const [markets, setMarkets] = useState<any>(null)
  const [commodities, setCommodities] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/finnhub/dashboard', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/macro-finance/markets', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/commodities/snapshot-all', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([f, m, c]) => {
      if (!alive) return
      setFinnhub(f); setMarkets(m); setCommodities(c); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const ibexQuote = finnhub?.indices?.find?.((q: Quote) => q.symbol?.includes('IBEX')) || finnhub?.ibex
  const adrs: Quote[] = finnhub?.adrs || finnhub?.spanish_stocks || []
  const bigtech: Quote[] = finnhub?.bigtech || finnhub?.us_bigtech || []
  const crypto: Quote[] = finnhub?.crypto || []
  const fxRates: Quote[] = markets?.fx || markets?.exchange_rates || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TabHeader tab={tab} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <MacroKpiCard
          label="IBEX 35"
          value={ibexQuote?.price ?? null}
          unit=" pts"
          delta={ibexQuote?.change_pct ?? null}
          color={tab.themeAccent}
          decimals={0}
          footer="Finnhub · live"
          loading={loading}
        />
        <MacroKpiCard
          label="EUR/USD"
          value={fxRates.find((f) => (f.symbol || f.name || '').toUpperCase().includes('USD'))?.price ?? null}
          unit=""
          color="#3b82f6"
          decimals={4}
          footer="ECB SDW · daily"
          loading={loading}
        />
        <MacroKpiCard
          label="Bono 10Y España"
          value={markets?.yield_curve?.find?.((y: any) => y.tenor?.includes('10Y'))?.value ?? null}
          unit="%"
          color="#7c3aed"
          decimals={2}
          footer="ECB SDW"
          loading={loading}
        />
        <MacroKpiCard
          label="Brent oil"
          value={commodities?.commodities?.find?.((c: any) => c.symbol === 'BRENT' || c.label?.toLowerCase().includes('brent'))?.price ?? null}
          unit=" $/bbl"
          color="#f97316"
          decimals={1}
          footer="Yahoo · live"
          loading={loading}
        />
      </div>

      {/* IBEX 35 + ADRs */}
      {adrs && adrs.length > 0 && (
        <MacroPanel
          accent={tab.themeAccent}
          title="Cotizadas España · ADRs Finnhub"
          subtitle="Live · SAN, BBVA, TEF, FER, IBE, REP..."
          status="live"
        >
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Ticker</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Nombre</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Precio</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Δ %</th>
              </tr>
            </thead>
            <tbody>
              {adrs.slice(0, 12).map((q, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{q.symbol}</td>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>{q.name}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    ${q.price?.toFixed(2) ?? '—'}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: (q.change_pct ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                    {q.change_pct != null ? `${q.change_pct >= 0 ? '+' : ''}${q.change_pct.toFixed(2)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </MacroPanel>
      )}

      {/* Commodities */}
      {commodities?.commodities && commodities.commodities.length > 0 && (
        <MacroPanel accent="#f97316" title="Commodities · oil, gold, copper, BDI" subtitle="Yahoo Finance · live" status="live">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {commodities.commodities.slice(0, 8).map((c: any, i: number) => (
              <MacroKpiCard
                key={i}
                label={c.label || c.symbol}
                value={c.price ?? null}
                unit={c.unit || ''}
                delta={c.change_pct ?? null}
                color="#f97316"
                decimals={2}
                footer={c.last_update}
              />
            ))}
          </div>
        </MacroPanel>
      )}

      {/* US Big tech como benchmark */}
      {bigtech && bigtech.length > 0 && (
        <MacroPanel accent="#3b82f6" title="US Big Tech · benchmark internacional" subtitle="Finnhub · AAPL, MSFT, GOOGL, NVDA..." status="live">
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <tbody>
              {bigtech.slice(0, 8).map((q, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{q.symbol}</td>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>{q.name}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${q.price?.toFixed(2)}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: (q.change_pct ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                    {q.change_pct != null ? `${q.change_pct >= 0 ? '+' : ''}${q.change_pct.toFixed(2)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </MacroPanel>
      )}

      {crypto && crypto.length > 0 && (
        <MacroPanel accent="#eab308" title="Crypto · top mercado" subtitle="Finnhub · BTC, ETH, BNB..." status="live">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {crypto.slice(0, 6).map((c, i) => (
              <MacroKpiCard
                key={i}
                label={c.symbol || c.name || ''}
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

      <section style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: tab.themeAccent, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          ✦ Lectura Politeia · IA
        </p>
        <p style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, margin: '8px 0 0' }}>
          Análisis automático de correlaciones bolsa/bonos/divisas/commodities con rotación sectorial llega en <strong>Sprint M6</strong>. Datos arriba ofrecen el snapshot directo Finnhub+ECB+Yahoo.
        </p>
      </section>
    </div>
  )
}

export default MercadosActivosTab
