'use client'
/**
 * `<MercadosEnrichmentBlock />` · Sprint N1.
 *
 * Bloque exclusivo de mercados-activos: sector breakdown + yield slope +
 * market breadth + FX matrix + commodity heatmap. Self-contained (hace su
 * propio fetch a Finnhub dashboard + macro-finance/markets + commodities).
 *
 * Extraído del legacy MercadosActivosTab.tsx (que se mueve a tabs/legacy/
 * en la migración a SubtabContent). Se renderiza condicionalmente cuando
 * subtabSlug === 'mercados-activos' dentro de SubtabContent.
 */
import { useEffect, useMemo, useState } from 'react'
import { MacroPanel } from '../MacroPanel'
import { Treemap } from '../charts/Treemap'
import { COMPANY_CATALOG } from '@/lib/macro/company-catalog'

interface Q { symbol?: string; change_pct?: number; change_percent?: number; price?: number; unit?: string; name?: string }

export function MercadosEnrichmentBlock() {
  const [finnhub, setFinnhub] = useState<any>(null)
  const [markets, setMarkets] = useState<any>(null)
  const [commodities, setCommodities] = useState<any>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/finnhub/dashboard', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/macro-finance/markets', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/commodities/snapshot-all', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([f, m, c]) => {
      if (!alive) return
      setFinnhub(f); setMarkets(m); setCommodities(c)
    })
    return () => { alive = false }
  }, [])

  const normalize = (q: any) => q && ({ ...q, change_pct: q.change_pct ?? q.change_percent })
  const adrs: Q[] = (finnhub?.spain_adrs || finnhub?.adrs || []).map(normalize)
  const yieldCurve = markets?.yield_curve || []
  const fxRates = markets?.fx || markets?.exchange_rates || []
  const commList: Q[] = commodities?.commodities || []

  const sectorByTicker = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of COMPANY_CATALOG) {
      const root = c.ticker.split('.')[0]
      m[root] = c.sector
      m[c.ticker] = c.sector
    }
    return m
  }, [])

  const sectorBreakdown = useMemo(() => {
    if (!adrs.length) return [] as Array<{ id: string; label: string; value: number; perfAvg: number }>
    const groups: Record<string, { count: number; perfSum: number }> = {}
    for (const q of adrs) {
      const sym = (q.symbol || '').split('.')[0]
      const sector = sectorByTicker[sym] || 'otros'
      if (!groups[sector]) groups[sector] = { count: 0, perfSum: 0 }
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

  const yieldSlope = useMemo(() => {
    if (!Array.isArray(yieldCurve) || yieldCurve.length < 2) return null
    const get = (label: string) =>
      yieldCurve.find((p: any) => String(p.tenor || p.label || '').toUpperCase().includes(label))?.yield
    const t2 = get('2Y')
    const t10 = get('10Y')
    if (typeof t2 !== 'number' || typeof t10 !== 'number') return null
    return { t2, t10, slope: t10 - t2 }
  }, [yieldCurve])

  const breadth = useMemo(() => {
    if (!adrs.length) return null
    const valid = adrs.filter((q) => typeof q.change_pct === 'number') as Required<Q>[]
    if (valid.length === 0) return null
    const advancing = valid.filter((q) => q.change_pct > 0).length
    const declining = valid.filter((q) => q.change_pct < 0).length
    const flat = valid.length - advancing - declining
    const pct = (advancing / valid.length) * 100
    const sorted = [...valid].sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0))
    // Sprint N14 fix: gainers SOLO los positivos, losers SOLO los negativos.
    // Antes incluía TEF +0.00% en gainers cuando todos estaban en rojo.
    const gainers = sorted.filter((q) => q.change_pct > 0).slice(0, 5)
    const losers = sorted.filter((q) => q.change_pct < 0).slice(-5).reverse()
    return { total: valid.length, advancing, declining, flat, pct, gainers, losers }
  }, [adrs])

  // Sprint N14 · enriquece cada ADR con metadata del COMPANY_CATALOG
  const enrichedAdrs = useMemo(() => {
    return adrs
      .map((q) => {
        const sym = (q.symbol || '').split('.')[0]
        const company = COMPANY_CATALOG.find((c) => c.ticker.split('.')[0] === sym)
        return {
          symbol: q.symbol || '',
          name: company?.shortName || q.symbol || '',
          sector: company?.sector || 'otros',
          price: q.price ?? null,
          change_pct: typeof q.change_pct === 'number' ? q.change_pct : null,
          companyId: company?.id,
        }
      })
      .sort((a, b) => (b.change_pct ?? -999) - (a.change_pct ?? -999))
  }, [adrs])

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
      {/* Sprint N14: reemplazado treemap de sectores por grid de empresas
          individuales. El analista quería ver empresas directamente, no
          categorías. El badge sector está al lado para mantener contexto. */}
      {enrichedAdrs.length > 0 && (
        <MacroPanel accent="#7c3aed" title={`IBEX cotizadas tractoras · ${enrichedAdrs.length} empresas live`} subtitle="ADRs + acciones BME ordenadas por performance del día · click para detalle empresa" status="live">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            {enrichedAdrs.map((c) => {
              const chColor = c.change_pct == null ? '#94a3b8' : c.change_pct > 0 ? '#16a34a' : c.change_pct < 0 ? '#dc2626' : '#64748b'
              const inner = (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>{c.symbol}</span>
                    <span style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>{c.sector}</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.3 }}>{c.name}</p>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' as const }}>
                      {c.price != null ? c.price.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : '—'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: chColor, fontVariantNumeric: 'tabular-nums' as const }}>
                      {c.change_pct != null ? `${c.change_pct >= 0 ? '+' : ''}${c.change_pct.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                </>
              )
              const baseStyle = { background: '#fff', border: '1px solid #e5e7eb', borderLeft: `3px solid ${chColor}`, borderRadius: 6, padding: 10, textDecoration: 'none', color: '#0f172a', display: 'block' }
              return c.companyId
                ? <a key={c.symbol} href={`/macro/empresas-beneficios/company/${c.companyId}`} style={baseStyle}>{inner}</a>
                : <div key={c.symbol} style={baseStyle}>{inner}</div>
            })}
          </div>
        </MacroPanel>
      )}

      {yieldSlope && (
        <MacroPanel accent="#0891b2" title="Curva soberana ES · pendiente 10Y-2Y" subtitle="ECB SDW · señal de ciclo (positiva normal / plana / invertida)" status="live">
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>10Y - 2Y</p>
              <p style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as any, color: yieldSlope.slope >= 0.5 ? '#16a34a' : yieldSlope.slope >= 0 ? '#eab308' : '#dc2626' }}>
                {yieldSlope.slope >= 0 ? '+' : ''}{yieldSlope.slope.toFixed(2)} pp
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
        <MacroPanel accent="#16a34a" title={`Market breadth IBEX · ${breadth.advancing}/${breadth.total} en verde`} subtitle="% tickers IBEX-ADRs en positivo intraday · indicador de amplitud" status="live">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 auto' }}>
              <p style={{ margin: 0, fontSize: 38, fontWeight: 700, color: breadth.pct >= 60 ? '#16a34a' : breadth.pct >= 40 ? '#eab308' : '#dc2626', fontVariantNumeric: 'tabular-nums' as any }}>
                {breadth.pct.toFixed(0)}%
              </p>
              <p style={{ margin: 0, fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>breadth verde</p>
            </div>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', height: 10, borderRadius: 4, overflow: 'hidden', background: '#f1f5f9' }}>
                <div style={{ width: `${(breadth.advancing / breadth.total) * 100}%`, background: '#16a34a' }} />
                <div style={{ width: `${(breadth.flat / breadth.total) * 100}%`, background: '#cbd5e1' }} />
                <div style={{ width: `${(breadth.declining / breadth.total) * 100}%`, background: '#dc2626' }} />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b' }}>▲ {breadth.advancing} · ━ {breadth.flat} · ▼ {breadth.declining}</p>
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.6 }}>Top gainers</p>
              {breadth.gainers.length === 0 && (
                <p style={{ margin: '4px 0', fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>Ningún ticker en positivo intraday</p>
              )}
              {breadth.gainers.map((q, i) => (
                <p key={i} style={{ margin: '4px 0', fontSize: 11, fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{q.symbol}</span>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>+{q.change_pct!.toFixed(2)}%</span>
                </p>
              ))}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.6 }}>Top losers</p>
              {breadth.losers.length === 0 && (
                <p style={{ margin: '4px 0', fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>Ningún ticker en negativo intraday</p>
              )}
              {breadth.losers.map((q, i) => (
                <p key={i} style={{ margin: '4px 0', fontSize: 11, fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{q.symbol}</span>
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>{q.change_pct!.toFixed(2)}%</span>
                </p>
              ))}
            </div>
          </div>
        </MacroPanel>
      )}

      {fxList.length > 0 && (
        <MacroPanel accent="#0F766E" title={`FX matrix · ${fxList.length} cruces`} subtitle="macro-finance/markets · live" status="live">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
            {fxList.map((p, i) => (
              <div key={i} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: 0.4 }}>{p.pair}</p>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' as any }}>{p.rate?.toFixed(4)}</p>
                {p.change != null && (
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: p.change >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700, fontVariantNumeric: 'tabular-nums' as any }}>
                    {p.change >= 0 ? '▲' : '▼'} {p.change >= 0 ? '+' : ''}{p.change.toFixed(2)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </MacroPanel>
      )}

      {commList.length > 0 && (
        <MacroPanel accent="#dc2626" title={`Commodity heatmap · ${commList.length} contratos`} subtitle="Yahoo Finance · oil, gold, copper, BDI, etc · color por % diario" status="live">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6 }}>
            {commList.map((c, i) => {
              const pct = typeof c.change_pct === 'number' ? c.change_pct : null
              const bg = pct == null ? '#f1f5f9' :
                pct >= 2 ? '#16a34a' :
                pct >= 0.5 ? '#86efac' :
                pct >= 0 ? '#dcfce7' :
                pct >= -0.5 ? '#fee2e2' :
                pct >= -2 ? '#fca5a5' : '#dc2626'
              const fg = pct != null && Math.abs(pct) > 2 ? '#fff' : '#0f172a'
              return (
                <div key={i} style={{ background: bg, color: fg, border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px' }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.4 }}>{c.symbol || c.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as any }}>
                    {c.price?.toFixed(2)} {c.unit || ''}
                  </p>
                  {pct != null && (
                    <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as any }}>
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

export default MercadosEnrichmentBlock
