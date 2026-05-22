'use client'
/**
 * `<MercadosActivosTab />` · Tab 6 PROFUNDO.
 * Fuentes vivas: Finnhub IBEX/ADRs/big tech/crypto · macro-finance yields/FX · Yahoo commodities.
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { getTab } from '@/lib/macro/sources-matrix'
import { useMacroDrawer } from '../MacroDrawerProvider'

export function MercadosActivosTab() {
  const tab = getTab('mercados-activos')
  const { openDrill } = useMacroDrawer()
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

  // Finnhub backend devuelve `spain_adrs`, `us_big_tech`, `eu_big_caps`, `crypto`, `change_percent`
  // Normalizamos a la nomenclatura usada en el componente (`adrs`, `bigtech`, `change_pct`)
  const normalize = (q: any) => q && ({ ...q, change_pct: q.change_pct ?? q.change_percent, volume: q.volume ?? q.v })
  const ibex = (finnhub?.indices?.find?.((q: any) => q.symbol?.includes('IBEX')) || finnhub?.ibex) ? normalize(finnhub?.indices?.find?.((q: any) => q.symbol?.includes('IBEX')) || finnhub?.ibex) : null
  const adrs = (finnhub?.spain_adrs || finnhub?.adrs || finnhub?.spanish_stocks || []).map(normalize)
  const bigtech = (finnhub?.us_big_tech || finnhub?.bigtech || finnhub?.us_bigtech || []).map(normalize)
  const eu_big_caps = (finnhub?.eu_big_caps || []).map(normalize)
  const crypto = (finnhub?.crypto || []).map(normalize)
  const yieldCurve = markets?.yield_curve || []
  const policyRates = markets?.policy_rates || []
  const fxRates = markets?.fx || markets?.exchange_rates || []
  const commList = commodities?.commodities || []

  const openTickerDrill = (q: any) => {
    openDrill({
      title: `${q.symbol} · live quote`,
      subtitle: 'FINNHUB',
      accent: tab.themeAccent,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 10, color: '#1e40af', margin: 0, fontWeight: 700, letterSpacing: 0.4 }}>PRECIO</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#1e40af', margin: '4px 0 0' }}>
                ${q.price?.toFixed(2)}
              </p>
            </div>
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 10, color: '#1e40af', margin: 0, fontWeight: 700 }}>VAR. DÍA</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: (q.change_pct ?? 0) >= 0 ? '#16a34a' : '#dc2626', margin: '4px 0 0' }}>
                {q.change_pct >= 0 ? '+' : ''}{q.change_pct?.toFixed(2)}%
              </p>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            <strong>Ticker:</strong> {q.symbol}<br />
            <strong>Empresa:</strong> {q.name || '—'}<br />
            <strong>Volumen:</strong> {q.volume?.toLocaleString('es-ES') ?? '—'}
          </p>
        </div>
      ),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a
        href="/macro/mercados-activos"
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
            Vista profunda · /macro/mercados-activos
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            Lectura macro-financiera: cómo los activos descuentan crecimiento, inflación, tipos, riesgo fiscal y FX · termómetro 0-100 · análisis IA Groq por gráfica
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

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
        {fxRates.length > 0 && (
          <MacroKpiCard
            label="EUR/USD"
            value={fxRates.find((f: any) => (f.symbol || f.name || '').toUpperCase().includes('USD'))?.price ?? null}
            unit=""
            color="#3b82f6"
            decimals={4}
            footer="ECB SDW"
            loading={loading}
          />
        )}
        {yieldCurve.find((y: any) => y.tenor?.includes('10Y')) && (
          <MacroKpiCard
            label="Bono 10Y España"
            value={yieldCurve.find((y: any) => y.tenor?.includes('10Y'))?.value ?? null}
            unit="%"
            color="#7c3aed"
            decimals={2}
            footer="ECB SDW"
            loading={loading}
          />
        )}
        {commList.find((c: any) => c.symbol === 'BRENT' || c.label?.toLowerCase().includes('brent')) && (
          <MacroKpiCard
            label="Brent oil"
            value={commList.find((c: any) => c.symbol === 'BRENT' || c.label?.toLowerCase().includes('brent'))?.price ?? null}
            unit=" $/bbl"
            color="#f97316"
            decimals={1}
            footer="Yahoo · live"
            loading={loading}
          />
        )}
      </div>

      {/* Curva soberana */}
      {yieldCurve.length > 0 && (
        <MacroPanel
          accent="#7c3aed"
          title="Curva soberana España"
          subtitle={`ECB SDW · ${yieldCurve.length} plazos · daily`}
          status="live"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(85px, 1fr))', gap: 8 }}>
            {yieldCurve.map((y: any, i: number) => (
              <div key={i} style={{ background: '#faf5ff', borderRadius: 6, padding: 10, textAlign: 'center', border: '1px solid #e9d5ff' }}>
                <p style={{ fontSize: 9, color: '#7c3aed', margin: 0, fontWeight: 700, letterSpacing: 0.4 }}>{y.tenor}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#7c3aed', margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {y.value?.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </MacroPanel>
      )}

      {/* IBEX ADRs */}
      {adrs.length > 0 && (
        <MacroPanel accent={tab.themeAccent} title="IBEX 35 cotizadas · click ticker" subtitle="Finnhub ADRs SAN/BBVA/TEF/FER/IBE/REP/ITX..." status="live">
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Ticker</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Empresa</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Precio</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Δ %</th>
              </tr>
            </thead>
            <tbody>
              {adrs.slice(0, 15).map((q: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => openTickerDrill(q)}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{q.symbol}</td>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>{q.name}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${q.price?.toFixed(2) ?? '—'}</td>
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
      {commList.length > 0 && (
        <MacroPanel accent="#f97316" title="Commodities" subtitle="Yahoo Finance · oil/gold/copper/BDI · live" status="live">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {commList.slice(0, 10).map((c: any, i: number) => (
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

      {/* Política BCE */}
      {policyRates.length > 0 && (
        <MacroPanel accent="#6366f1" title="BCE · Tipos oficiales" subtitle="Main Refi · Deposit Facility · Marginal Lending" status="live">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {policyRates.map((r: any, i: number) => (
              <MacroKpiCard key={i} label={r.label} value={r.value} unit="%" color="#6366f1" decimals={2} footer={r.code} />
            ))}
          </div>
        </MacroPanel>
      )}

      {/* Big tech */}
      {bigtech.length > 0 && (
        <MacroPanel accent="#3b82f6" title="US Big Tech · benchmark internacional" subtitle="Finnhub" status="live">
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <tbody>
              {bigtech.slice(0, 8).map((q: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{q.symbol}</td>
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

      {/* Crypto */}
      {crypto.length > 0 && (
        <MacroPanel accent="#eab308" title="Crypto" subtitle="Finnhub · BTC/ETH/BNB..." status="live">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {crypto.slice(0, 6).map((c: any, i: number) => (
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
    </div>
  )
}

export default MercadosActivosTab
