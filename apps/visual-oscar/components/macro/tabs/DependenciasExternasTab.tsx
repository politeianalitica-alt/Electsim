'use client'
/**
 * `<DependenciasExternasTab />` · Tab 4 · Dependencias externas España.
 *
 * Combina:
 *  - OEC: top partners + ECI complejidad económica
 *  - INE CNT exports/imports YoY
 *  - HHI concentración calculado a partir de OEC partners
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { getTab } from '@/lib/macro/sources-matrix'
import { useMacroDrawer } from '../MacroDrawerProvider'

interface OecPartner { country_id: string; country_name: string; trade_value_usd: number; share_pct?: number }
interface OecData {
  ok?: boolean
  data_quality?: { source_type: string }
  top_partners_exports?: OecPartner[]
  top_partners_imports?: OecPartner[]
  eci_value?: number | null
  eci_rank?: number | null
  year?: number
}

interface CntExtra {
  ok?: boolean
  exports?: { name?: string; points: { period: string; value: number | null }[] }
  imports?: { name?: string; points: { period: string; value: number | null }[] }
}

// HHI = sum of squared market shares (in percentage points squared)
// Verde <1500 · Ámbar 1500-2500 · Rojo >2500
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
  if (hhi < 1500) return { color: '#16a34a', bg: '#dcfce7', label: 'BAJA · concentración saludable' }
  if (hhi < 2500) return { color: '#f59e0b', bg: '#fef3c7', label: 'MEDIA · vigilancia' }
  return { color: '#dc2626', bg: '#fee2e2', label: 'ALTA · concentración crítica' }
}

export function DependenciasExternasTab() {
  const tab = getTab('dependencias-externas')
  const { openDrill } = useMacroDrawer()
  const [oec, setOec] = useState<OecData | null>(null)
  const [partners, setPartners] = useState<{ exports: OecPartner[]; imports: OecPartner[] } | null>(null)
  const [cnt, setCnt] = useState<CntExtra | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/oec/spain-overview', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/oec/top-partners?direction=exports', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/oec/top-partners?direction=imports', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/cnt-extra?n=12', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([oecData, expPartners, impPartners, cntData]) => {
      if (!alive) return
      setOec(oecData)
      setPartners({
        exports: expPartners?.partners || expPartners?.top_partners || [],
        imports: impPartners?.partners || impPartners?.top_partners || [],
      })
      setCnt(cntData)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const hhiExports = calculateHHI(partners?.exports || [])
  const hhiImports = calculateHHI(partners?.imports || [])
  const hhiExpColor = hhiColor(hhiExports)
  const hhiImpColor = hhiColor(hhiImports)

  const expLast = cnt?.exports?.points?.[0]
  const impLast = cnt?.imports?.points?.[0]

  const openPartnerDrill = (partner: OecPartner, direction: 'exports' | 'imports') => {
    openDrill({
      title: `${partner.country_name} · Drill-down`,
      subtitle: `${direction === 'exports' ? 'Exportaciones' : 'Importaciones'} bilaterales · OEC ${oec?.year || ''}`,
      accent: tab.themeAccent,
      content: (
        <div>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            <strong>{partner.country_name}</strong> es el partner #{(partners?.[direction] || []).findIndex((p) => p.country_id === partner.country_id) + 1} en {direction} de España.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>VOLUMEN</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: tab.themeAccent, margin: '4px 0 0' }}>
                ${(partner.trade_value_usd / 1e9).toFixed(2)}B
              </p>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>USD anuales</p>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>CUOTA</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: tab.themeAccent, margin: '4px 0 0' }}>
                {partner.share_pct?.toFixed(1) ?? '—'}%
              </p>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>del total España</p>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 16, fontStyle: 'italic' }}>
            Fuente · OEC.world · año reportado {oec?.year || 'reciente disponible'}
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
          label="ECI · Ranking global"
          value={oec?.eci_rank ?? null}
          unit=""
          color={tab.themeAccent}
          footer={oec?.eci_value != null ? `ECI score ${oec.eci_value.toFixed(2)}` : 'Economic Complexity Index'}
          decimals={0}
          loading={loading}
        />
        <MacroKpiCard
          label="HHI · Exports concentración"
          value={hhiExports || null}
          unit=""
          color={hhiExpColor.color}
          footer={hhiExpColor.label}
          decimals={0}
          loading={loading}
        />
        <MacroKpiCard
          label="HHI · Imports concentración"
          value={hhiImports || null}
          unit=""
          color={hhiImpColor.color}
          footer={hhiImpColor.label}
          decimals={0}
          loading={loading}
        />
        <MacroKpiCard
          label="Exportaciones YoY"
          value={expLast?.value ?? null}
          color="#10b981"
          footer={expLast?.period ? `INE CNT · ${expLast.period}` : 'INE CNT'}
          loading={loading}
        />
      </div>

      {/* Top partners exports */}
      <MacroPanel
        accent="#16a34a"
        title="Top 10 Partners · Exportaciones España"
        subtitle="OEC · trade flow USD anuales · click partner para drill-down"
        status={partners?.exports?.length ? 'live' : loading ? 'loading' : 'missing'}
      >
        {partners?.exports && partners.exports.length > 0 ? (
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b', fontWeight: 600 }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b', fontWeight: 600 }}>País</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Volumen USD</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Share %</th>
              </tr>
            </thead>
            <tbody>
              {partners.exports.slice(0, 10).map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => openPartnerDrill(p, 'exports')}>
                  <td style={{ padding: '6px 10px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                  <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 500 }}>{p.country_name}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    ${(p.trade_value_usd / 1e9).toFixed(2)}B
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: tab.themeAccent }}>
                    {p.share_pct?.toFixed(1) ?? ((p.trade_value_usd / partners.exports.reduce((s, x) => s + x.trade_value_usd, 0)) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 12, color: '#94a3b8' }}>{loading ? 'Cargando OEC partners…' : 'Datos OEC no disponibles'}</p>
        )}
      </MacroPanel>

      {/* Top partners imports */}
      <MacroPanel
        accent="#f97316"
        title="Top 10 Partners · Importaciones España"
        subtitle="OEC · trade flow USD anuales · click partner para drill-down"
        status={partners?.imports?.length ? 'live' : loading ? 'loading' : 'missing'}
      >
        {partners?.imports && partners.imports.length > 0 ? (
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b', fontWeight: 600 }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b', fontWeight: 600 }}>País</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Volumen USD</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b', fontWeight: 600 }}>Share %</th>
              </tr>
            </thead>
            <tbody>
              {partners.imports.slice(0, 10).map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => openPartnerDrill(p, 'imports')}>
                  <td style={{ padding: '6px 10px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                  <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 500 }}>{p.country_name}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    ${(p.trade_value_usd / 1e9).toFixed(2)}B
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#f97316' }}>
                    {p.share_pct?.toFixed(1) ?? ((p.trade_value_usd / partners.imports.reduce((s, x) => s + x.trade_value_usd, 0)) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 12, color: '#94a3b8' }}>{loading ? 'Cargando OEC partners…' : 'Datos OEC no disponibles'}</p>
        )}
      </MacroPanel>

      <section style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: tab.themeAccent, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          ✦ Lectura Politeia · IA
        </p>
        <p style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6, margin: '8px 0 0' }}>
          Lectura dependencias con vector HHI + ECI + concentración energética + tendencia exports/imports se activa en <strong>Sprint M6</strong>. Datos OEC + INE arriba ofrecen la lectura directa.
        </p>
      </section>
    </div>
  )
}

export default DependenciasExternasTab
