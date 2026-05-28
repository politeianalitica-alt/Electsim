'use client'
/**
 * <InversionPanel /> · Sprint GEO-ES C5
 *
 * Panel inversión exterior España · Top 15 posiciones FDI + análisis cartera.
 */
import { useEffect, useState } from 'react'

interface FDIPosition {
  iso3: string; name_es: string
  fdi_stock_eur_bn: number
  share_total_pct: number
  vdem_polyarchy: number | null
  risk_high: boolean
}
interface Response {
  ok: boolean
  summary: { total_fdi_stock_eur_bn: number; countries_in_catalog: number; hhi_concentration: number; hhi_label: string; exposure_high_risk_pct: number; exposure_high_risk_bn: number }
  top_positions: FDIPosition[]
}

export function InversionPanel() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/presencia-espana/inversion', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando inversión exterior…</p>
  if (!data?.ok) return null

  const maxFdi = Math.max(...data.top_positions.map((p) => p.fdi_stock_eur_bn), 1)
  const hhiLabel = data.summary.hhi_label
  const hhiColor = hhiLabel === 'diversificado' ? '#16a34a' : hhiLabel === 'moderado' ? '#f59e0b' : '#dc2626'

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      <header style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Inversión exterior España · DataInvex 2023 + análisis cartera
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
          Stock IED total + concentración HHI + exposición a países V-Dem &lt; 0.5
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        <Kpi label="Stock total" value={`€${data.summary.total_fdi_stock_eur_bn}bn`} accent="#7c3aed" />
        <Kpi label={`HHI ${hhiLabel}`} value={String(data.summary.hhi_concentration)} accent={hhiColor} />
        <Kpi label="Riesgo alto" value={`${data.summary.exposure_high_risk_pct}%`} sub={`€${data.summary.exposure_high_risk_bn}bn`} accent="#dc2626" />
      </div>

      <h4 style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Top 15 posiciones FDI
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.top_positions.map((p) => (
          <div key={p.iso3} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', background: p.risk_high ? '#fef2f2' : 'transparent', borderRadius: 4 }}>
            <span style={{ width: 130, fontSize: 10, color: '#0f172a', fontWeight: 600 }}>
              {p.name_es} {p.risk_high && <span style={{ color: '#dc2626' }}>⚠</span>}
            </span>
            <div style={{ flex: 1, height: 12, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${(p.fdi_stock_eur_bn / maxFdi) * 100}%`, height: '100%', background: p.risk_high ? '#dc2626' : '#7c3aed' }} />
            </div>
            <span style={{ width: 100, fontSize: 10, fontFamily: 'ui-monospace, monospace', textAlign: 'right', color: '#0f172a' }}>
              €{p.fdi_stock_eur_bn}bn ({p.share_total_pct}%)
            </span>
            {p.vdem_polyarchy !== null && (
              <span style={{ width: 40, fontSize: 9, color: '#94a3b8', textAlign: 'right' }}>V-Dem {p.vdem_polyarchy.toFixed(2)}</span>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, padding: '8px 10px', background: '#fef3c7', borderRadius: 6, fontSize: 10, color: '#92400e' }}>
        <strong>Próximamente</strong> · Cobertura formal por posición (APPRI + ADT + ICO + CESCE) pendiente de integrar.
      </div>
    </section>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 6, borderLeft: `3px solid ${accent}` }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace' }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>{sub}</p>}
    </div>
  )
}

export default InversionPanel
