'use client'
/**
 * `<MercadosActivosTab />` · Tab 6 PROFUNDO.
 * Fuentes vivas: Finnhub IBEX/ADRs/big tech/crypto · macro-finance yields/FX · Yahoo commodities.
 */
import { useEffect, useMemo, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { getTab } from '@/lib/macro/sources-matrix'
import { useMacroDrawer } from '../MacroDrawerProvider'
import { COMPANY_CATALOG } from '@/lib/macro/company-catalog'
import { Treemap } from '../charts/Treemap'

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

      {/* Sprint L F5 · 5 paneles nuevos · sector breakdown, yield slope, market breadth, FX matrix, commodity heatmap */}
      <EnrichmentPanels adrs={adrs} yieldCurve={yieldCurve} fxRates={fxRates} commList={commList} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Sprint L F5 · paneles enriquecidos (no hardcoded, todo dinámico)
// ──────────────────────────────────────────────────────────────────────────

function EnrichmentPanels({ adrs, yieldCurve, fxRates, commList }: { adrs: any[]; yieldCurve: any[]; fxRates: any[]; commList: any[] }) {
  // 1) Mapping ticker→sector desde COMPANY_CATALOG (no hardcoded en el componente)
  const sectorByTicker = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of COMPANY_CATALOG) {
      // ADRs vienen sin sufijo .MC: "SAN" vs catalog "SAN.MC". Indexamos por el root.
      const root = c.ticker.split('.')[0]
      m[root] = c.sector
      m[c.ticker] = c.sector
    }
    return m
  }, [])

  // Sector breakdown agregando ADRs con sector identificado
  const sectorBreakdown = useMemo(() => {
    if (!adrs.length) return [] as Array<{ id: string; label: string; value: number; perfAvg: number }>
    const groups: Record<string, { total: number; count: number; perfSum: number }> = {}
    for (const q of adrs) {
      const sym = (q.symbol || '').split('.')[0]
      const sector = sectorByTicker[sym] || 'otros'
      if (!groups[sector]) groups[sector] = { total: 0, count: 0, perfSum: 0 }
      groups[sector].total += 1
      groups[sector].count += 1
      if (typeof q.change_pct === 'number') groups[sector].perfSum += q.change_pct
    }
    return Object.entries(groups)
      .map(([sector, g]) => ({
        id: sector,
        label: sector.charAt(0).toUpperCase() + sector.slice(1),
        value: g.count,
        perfAvg: g.count > 0 ? g.perfSum / g.count : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [adrs, sectorByTicker])

  // Yield curve slope 10Y-2Y
  const yieldSlope = useMemo(() => {
    if (!Array.isArray(yieldCurve) || yieldCurve.length < 2) return null
    // yieldCurve items typically have { tenor: '2Y' | '10Y', yield: number }
    const get = (label: string) =>
      yieldCurve.find((p: any) => String(p.tenor || p.label || '').toUpperCase().includes(label))?.yield
    const t2 = get('2Y')
    const t10 = get('10Y')
    if (typeof t2 !== 'number' || typeof t10 !== 'number') return null
    return { t2, t10, slope: t10 - t2 }
  }, [yieldCurve])

  // Market breadth IBEX (ADRs en verde / total)
  const breadth = useMemo(() => {
    if (!adrs.length) return null
    const valid = adrs.filter((q: any) => typeof q.change_pct === 'number')
    if (valid.length === 0) return null
    const advancing = valid.filter((q: any) => q.change_pct > 0).length
    const declining = valid.filter((q: any) => q.change_pct < 0).length
    const flat = valid.length - advancing - declining
    const pct = (advancing / valid.length) * 100
    const sorted = [...valid].sort((a: any, b: any) => (b.change_pct ?? 0) - (a.change_pct ?? 0))
    return {
      total: valid.length,
      advancing,
      declining,
      flat,
      pct,
      gainers: sorted.slice(0, 5),
      losers: sorted.slice(-5).reverse(),
    }
  }, [adrs])

  // FX matrix · agrupa fxRates por par
  const fxList = useMemo(() => {
    if (!Array.isArray(fxRates)) return []
    return fxRates
      .filter((p: any) => p && (p.pair || p.symbol || p.from))
      .map((p: any) => ({
        pair: p.pair || p.symbol || `${p.from}/${p.to}`,
        rate: typeof p.rate === 'number' ? p.rate : typeof p.value === 'number' ? p.value : null,
        change: typeof p.change_pct === 'number' ? p.change_pct : typeof p.change === 'number' ? p.change : null,
      }))
      .filter((p) => p.rate != null)
      .slice(0, 8)
  }, [fxRates])

  return (
    <>
      {sectorBreakdown.length > 0 && (
        <MacroPanel
          accent="#7c3aed"
          title={`IBEX sector breakdown · ${sectorBreakdown.length} sectores`}
          subtitle="Agrupación de ADRs por sector COMPANY_CATALOG · tamaño = nº tickers · color = performance media"
          status="live"
        >
          <Treemap
            data={sectorBreakdown.map((s) => ({
              id: s.id,
              label: `${s.label} (${s.value})`,
              value: s.value,
            }))}
            width={760}
            height={220}
            unit=" ADRs"
            formatValue={(v) => `${v} tickers`}
          />
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 10 }}>
            {sectorBreakdown.map((s) => (
              <span
                key={s.id}
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: s.perfAvg >= 0 ? '#dcfce7' : '#fee2e2',
                  color: s.perfAvg >= 0 ? '#166534' : '#991b1b',
                  fontWeight: 600,
                }}
              >
                {s.label}: {s.perfAvg >= 0 ? '+' : ''}{s.perfAvg.toFixed(2)}%
              </span>
            ))}
          </div>
        </MacroPanel>
      )}

      {yieldSlope && (
        <MacroPanel
          accent="#0891b2"
          title="Curva soberana ES · pendiente 10Y-2Y"
          subtitle="ECB SDW · macro-finance/markets · señal de ciclo"
          status="live"
        >
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>10Y - 2Y</p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 30,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: yieldSlope.slope >= 0.5 ? '#16a34a' : yieldSlope.slope >= 0 ? '#eab308' : '#dc2626',
                }}
              >
                {yieldSlope.slope >= 0 ? '+' : ''}
                {yieldSlope.slope.toFixed(2)} pp
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>
                2Y: {yieldSlope.t2.toFixed(2)}% · 10Y: {yieldSlope.t10.toFixed(2)}%
              </p>
            </div>
            <div style={{ fontSize: 12, color: '#475569', maxWidth: 480, lineHeight: 1.45 }}>
              {yieldSlope.slope >= 0.5 && 'Curva con pendiente positiva normal → mercado anticipa crecimiento + inflación moderada.'}
              {yieldSlope.slope >= 0 && yieldSlope.slope < 0.5 && 'Curva plana → expectativas ambiguas; mercado descuenta política monetaria estable.'}
              {yieldSlope.slope < 0 && 'Curva invertida → señal histórica de recesión 12-18m vista. Vigilar.'}
            </div>
          </div>
        </MacroPanel>
      )}

      {breadth && (
        <MacroPanel
          accent="#16a34a"
          title={`Market breadth IBEX · ${breadth.advancing}/${breadth.total} en verde`}
          subtitle="% tickers IBEX-ADRs en positivo intraday · indicador de amplitud"
          status="live"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 auto' }}>
              <p style={{ margin: 0, fontSize: 38, fontWeight: 700, color: breadth.pct >= 60 ? '#16a34a' : breadth.pct >= 40 ? '#eab308' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                {breadth.pct.toFixed(0)}%
              </p>
              <p style={{ margin: 0, fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                breadth verde
              </p>
            </div>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', height: 10, borderRadius: 4, overflow: 'hidden', background: '#f1f5f9' }}>
                <div style={{ width: `${(breadth.advancing / breadth.total) * 100}%`, background: '#16a34a' }} />
                <div style={{ width: `${(breadth.flat / breadth.total) * 100}%`, background: '#cbd5e1' }} />
                <div style={{ width: `${(breadth.declining / breadth.total) * 100}%`, background: '#dc2626' }} />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b' }}>
                ▲ {breadth.advancing} · ━ {breadth.flat} · ▼ {breadth.declining}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.6 }}>Top 5 gainers</p>
              {breadth.gainers.map((q: any, i: number) => (
                <p key={i} style={{ margin: '4px 0', fontSize: 11, fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{q.symbol}</span>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>+{q.change_pct.toFixed(2)}%</span>
                </p>
              ))}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.6 }}>Top 5 losers</p>
              {breadth.losers.map((q: any, i: number) => (
                <p key={i} style={{ margin: '4px 0', fontSize: 11, fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{q.symbol}</span>
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>{q.change_pct.toFixed(2)}%</span>
                </p>
              ))}
            </div>
          </div>
        </MacroPanel>
      )}

      {fxList.length > 0 && (
        <MacroPanel
          accent="#0F766E"
          title={`FX matrix · ${fxList.length} cruces`}
          subtitle="macro-finance/markets · live"
          status="live"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
            {fxList.map((p, i) => (
              <div
                key={i}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: '8px 10px',
                }}
              >
                <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: 0.4 }}>{p.pair}</p>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{p.rate?.toFixed(4)}</p>
                {p.change != null && (
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: p.change >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {p.change >= 0 ? '▲' : '▼'} {p.change >= 0 ? '+' : ''}{p.change.toFixed(2)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </MacroPanel>
      )}

      {commList.length > 0 && (
        <MacroPanel
          accent="#dc2626"
          title={`Commodity heatmap · ${commList.length} contratos`}
          subtitle="Yahoo Finance · oil, gold, copper, BDI, etc · color por % diario"
          status="live"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6 }}>
            {commList.map((c: any, i: number) => {
              const pct = typeof c.change_pct === 'number' ? c.change_pct : null
              const bg =
                pct == null ? '#f1f5f9' :
                pct >= 2 ? '#16a34a' :
                pct >= 0.5 ? '#86efac' :
                pct >= 0 ? '#dcfce7' :
                pct >= -0.5 ? '#fee2e2' :
                pct >= -2 ? '#fca5a5' : '#dc2626'
              const fg = pct != null && Math.abs(pct) > 2 ? '#fff' : '#0f172a'
              return (
                <div
                  key={i}
                  style={{
                    background: bg,
                    color: fg,
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: '8px 10px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.4 }}>{c.symbol || c.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {c.price?.toFixed(2)} {c.unit || ''}
                  </p>
                  {pct != null && (
                    <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </MacroPanel>
      )}
    </>
  )
}

export default MercadosActivosTab
