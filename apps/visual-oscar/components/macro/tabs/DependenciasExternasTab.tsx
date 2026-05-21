'use client'
/**
 * `<DependenciasExternasTab />` · Tab 4 · Dependencias externas PROFUNDO.
 *
 * Fuentes vivas:
 *  - OEC top partners exports/imports + ECI
 *  - IMF BCA_NGDPD cuenta corriente (serie + forecast)
 *  - IMF TX_RPCH crecimiento exports
 *  - INE CNT exports/imports YoY
 *  - HHI calculado a partir de OEC
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

interface OecPartner { country_id: string; country_name: string; trade_value_usd: number; share_pct?: number }

function calculateHHI(partners: OecPartner[]): number {
  if (!partners || partners.length === 0) return 0
  const total = partners.reduce((sum, p) => sum + p.trade_value_usd, 0)
  if (total === 0) return 0
  return partners.reduce((hhi, p) => {
    const share = (p.trade_value_usd / total) * 100
    return hhi + share * share
  }, 0)
}

function hhiColor(hhi: number): { color: string; label: string; bg: string } {
  if (hhi < 1500) return { color: '#16a34a', bg: '#dcfce7', label: 'BAJA · saludable' }
  if (hhi < 2500) return { color: '#f59e0b', bg: '#fef3c7', label: 'MEDIA · vigilancia' }
  return { color: '#dc2626', bg: '#fee2e2', label: 'ALTA · concentración crítica' }
}

export function DependenciasExternasTab() {
  const tab = getTab('dependencias-externas')
  const { openDrill } = useMacroDrawer()
  const [oec, setOec] = useState<any>(null)
  const [expPartners, setExpPartners] = useState<OecPartner[]>([])
  const [impPartners, setImpPartners] = useState<OecPartner[]>([])
  const [cuentaC, setCuentaC] = useState<any>(null)
  const [exportsGr, setExportsGr] = useState<any>(null)
  const [cnt, setCnt] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/oec/spain-overview', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/oec/top-partners?direction=exports', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/oec/top-partners?direction=imports', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=BCA_NGDPD', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=TX_RPCH', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/cnt-extra?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([oecD, exp, imp, cc, ex, ct]) => {
      if (!alive) return
      setOec(oecD)
      setExpPartners(exp?.partners || exp?.top_partners || [])
      setImpPartners(imp?.partners || imp?.top_partners || [])
      setCuentaC(cc); setExportsGr(ex); setCnt(ct); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const hhiExp = calculateHHI(expPartners)
  const hhiImp = calculateHHI(impPartners)
  const hhiExpC = hhiColor(hhiExp)
  const hhiImpC = hhiColor(hhiImp)

  const splitImf = (d: any) => {
    const all = (d?.series || []).filter((s: any) => s.value != null) as { year: number; value: number }[]
    const cy = new Date().getFullYear()
    return {
      hist: all.filter((x) => x.year <= cy).map((x) => ({ period: String(x.year), value: x.value })),
      fc: all.filter((x) => x.year > cy).map((x) => ({ period: String(x.year), value: x.value })),
    }
  }
  const ccSplit = splitImf(cuentaC)
  const exGrSplit = splitImf(exportsGr)
  const cntExpSeries = (cnt?.exports?.points || []).slice().reverse().map((p: any) => ({ period: p.period, value: p.value }))
  const cntImpSeries = (cnt?.imports?.points || []).slice().reverse().map((p: any) => ({ period: p.period, value: p.value }))

  const openPartnerDrill = (partner: OecPartner, direction: 'exports' | 'imports') => {
    openDrill({
      title: `${partner.country_name} · ${direction === 'exports' ? 'Exportaciones' : 'Importaciones'}`,
      subtitle: `OEC · bilateral España ↔ ${partner.country_name}`,
      accent: tab.themeAccent,
      content: (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#fff7ed', borderRadius: 8, padding: 12, borderLeft: `3px solid ${tab.themeAccent}` }}>
              <p style={{ fontSize: 10, color: '#9a3412', margin: 0, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>VOLUMEN</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: tab.themeAccent, margin: '4px 0 0' }}>
                ${(partner.trade_value_usd / 1e9).toFixed(2)}B
              </p>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>USD anuales</p>
            </div>
            <div style={{ background: '#fff7ed', borderRadius: 8, padding: 12, borderLeft: `3px solid ${tab.themeAccent}` }}>
              <p style={{ fontSize: 10, color: '#9a3412', margin: 0, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>CUOTA</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: tab.themeAccent, margin: '4px 0 0' }}>
                {partner.share_pct?.toFixed(1) ?? '—'}%
              </p>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>del total {direction}</p>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 14, lineHeight: 1.6 }}>
            <strong>Análisis:</strong> Si {partner.country_name} concentra más del 10% del flujo, una disrupción
            ahí (sanciones, recesión, cambio político) tendría impacto directo en el comercio exterior español.
            HHI agregado: {direction === 'exports' ? hhiExp.toFixed(0) : hhiImp.toFixed(0)} ({(direction === 'exports' ? hhiExpC : hhiImpC).label}).
          </p>
          <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 14, fontStyle: 'italic' }}>
            Fuente · OEC.world · año más reciente disponible
          </p>
        </div>
      ),
      source: { name: 'OEC.world', url: `https://oec.world/en/profile/country/${partner.country_id?.toLowerCase()}` },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {oec?.eci_rank != null && (
          <MacroKpiCard
            label="ECI · Ranking global"
            value={oec.eci_rank}
            unit=""
            color={tab.themeAccent}
            footer={oec?.eci_value != null ? `ECI score ${oec.eci_value.toFixed(2)}` : 'OEC Economic Complexity'}
            decimals={0}
            loading={loading}
          />
        )}
        {hhiExp > 0 && (
          <MacroKpiCard
            label="HHI Exports"
            value={hhiExp}
            unit=""
            color={hhiExpC.color}
            footer={hhiExpC.label}
            decimals={0}
            loading={loading}
          />
        )}
        {hhiImp > 0 && (
          <MacroKpiCard
            label="HHI Imports"
            value={hhiImp}
            unit=""
            color={hhiImpC.color}
            footer={hhiImpC.label}
            decimals={0}
            loading={loading}
          />
        )}
        {ccSplit.hist[ccSplit.hist.length - 1] && (
          <MacroKpiCard
            label="Cuenta corriente %PIB"
            value={ccSplit.hist[ccSplit.hist.length - 1]?.value ?? null}
            color="#10b981"
            spark={ccSplit.hist.slice(-12).map((p) => p.value)}
            footer="IMF BCA_NGDPD"
            decimals={2}
            loading={loading}
            onClick={ccSplit.hist.length > 1 ? () => openDrill({
              title: 'Cuenta corriente · drill IMF',
              subtitle: 'IMF BCA_NGDPD · % PIB',
              accent: '#10b981',
              content: <IndicatorDrill label="Cuenta corriente" unit="%" decimals={2} series={ccSplit.hist} forecast={ccSplit.fc} sourceCode="BCA_NGDPD" sourceName="IMF" imfCompareIndicator="BCA_NGDPD" accent="#10b981" />,
            }) : undefined}
          />
        )}
      </div>

      {/* Cuenta corriente serie larga */}
      {ccSplit.hist.length > 5 && (
        <MacroPanel
          accent="#10b981"
          title="Cuenta corriente España · 20y + forecast"
          subtitle="IMF BCA_NGDPD · superávit positivo, déficit negativo · %PIB"
          status="live"
        >
          <DeepLineChart
            series={[{
              id: 'cc',
              label: 'Cuenta corriente %PIB',
              color: '#10b981',
              points: [...ccSplit.hist, ...ccSplit.fc],
              forecastFromIndex: ccSplit.hist.length,
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
              series={ccSplit.hist as any}
              forecast={ccSplit.fc}
              accent="#10b981"
            />
          </div>
        </MacroPanel>
      )}

      {/* Comercio exterior INE CNT */}
      {cntExpSeries.length > 5 && (
        <MacroPanel
          accent="#f97316"
          title="Comercio exterior · INE CNT"
          subtitle="Exportaciones (CNTR7267) vs Importaciones (CNTR7287) · YoY volumen SA"
          status="live"
        >
          <DeepLineChart
            series={[
              { id: 'x', label: 'Exportaciones', color: '#0891b2', points: cntExpSeries },
              { id: 'm', label: 'Importaciones', color: '#f97316', points: cntImpSeries },
            ]}
            height={220}
            yLabel="Var anual (%)"
            zeroLine
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Exportaciones bienes y servicios"
              unit="%"
              decimals={2}
              series={cntExpSeries as any}
              accent="#0891b2"
            />
          </div>
        </MacroPanel>
      )}

      {/* Top partners exports */}
      {expPartners.length > 0 && (
        <MacroPanel
          accent="#16a34a"
          title="Top 10 partners · Exportaciones"
          subtitle="OEC · USD anuales · click partner para drill bilateral"
          status="live"
        >
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>País</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Volumen USD</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Share %</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Barra</th>
              </tr>
            </thead>
            <tbody>
              {expPartners.slice(0, 10).map((p, i) => {
                const share = p.share_pct ?? ((p.trade_value_usd / expPartners.reduce((s, x) => s + x.trade_value_usd, 0)) * 100)
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => openPartnerDrill(p, 'exports')}>
                    <td style={{ padding: '6px 10px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                    <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 500 }}>{p.country_name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ${(p.trade_value_usd / 1e9).toFixed(2)}B
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: tab.themeAccent }}>
                      {share.toFixed(1)}%
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ background: '#f1f5f9', height: 8, borderRadius: 4, width: 100 }}>
                        <div style={{ width: `${Math.min(share * 5, 100)}%`, height: '100%', background: '#16a34a', borderRadius: 4 }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </MacroPanel>
      )}

      {/* Top partners imports */}
      {impPartners.length > 0 && (
        <MacroPanel
          accent="#f97316"
          title="Top 10 partners · Importaciones"
          subtitle="OEC · USD anuales · click partner para drill bilateral"
          status="live"
        >
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>País</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Volumen USD</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Share %</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Barra</th>
              </tr>
            </thead>
            <tbody>
              {impPartners.slice(0, 10).map((p, i) => {
                const share = p.share_pct ?? ((p.trade_value_usd / impPartners.reduce((s, x) => s + x.trade_value_usd, 0)) * 100)
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => openPartnerDrill(p, 'imports')}>
                    <td style={{ padding: '6px 10px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                    <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 500 }}>{p.country_name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ${(p.trade_value_usd / 1e9).toFixed(2)}B
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#f97316' }}>
                      {share.toFixed(1)}%
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ background: '#f1f5f9', height: 8, borderRadius: 4, width: 100 }}>
                        <div style={{ width: `${Math.min(share * 5, 100)}%`, height: '100%', background: '#f97316', borderRadius: 4 }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </MacroPanel>
      )}
    </div>
  )
}

export default DependenciasExternasTab
