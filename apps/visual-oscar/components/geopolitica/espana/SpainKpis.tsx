'use client'
/**
 * <SpainKpis /> · 5 KPIs presencia España.
 */
import { useEffect, useState } from 'react'

export function SpainKpis() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/presencia-espana/mapa', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/presencia-espana/comercio', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/presencia-espana/inversion', { cache: 'force-cache' }).then((r) => r.json()),
    ])
      .then(([m, c, i]) => { if (alive) setData({ mapa: m, comercio: c, inversion: i }) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando KPIs presencia España…</p>
  if (!data) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
      <Kpi label="FDI stock total" value={`€${data.inversion?.summary?.total_fdi_stock_eur_bn || 0}bn`} sub="DataInvex 2023" accent="#7c3aed" />
      <Kpi label="Exports 2024" value={`€${data.comercio?.summary?.total_exports_2024_bn || 0}bn`} sub="DataComex acumulado" accent="#16a34a" />
      <Kpi label="Balance comercial" value={`${data.comercio?.summary?.balance_bn >= 0 ? '+' : ''}€${data.comercio?.summary?.balance_bn || 0}bn`} sub={data.comercio?.summary?.balance_bn >= 0 ? 'superávit' : 'déficit'} accent={data.comercio?.summary?.balance_bn >= 0 ? '#16a34a' : '#dc2626'} />
      <Kpi label="Concentración FDI (HHI)" value={String(data.inversion?.summary?.hhi_concentration || 0)} sub={data.inversion?.summary?.hhi_label || ''} accent="#0891b2" />
      <Kpi label="FDI riesgo alto" value={`${data.inversion?.summary?.exposure_high_risk_pct || 0}%`} sub={`€${data.inversion?.summary?.exposure_high_risk_bn || 0}bn V-Dem <0.5`} accent="#dc2626" />
      <Kpi label="Países con IBEX" value={String(data.mapa?.summary?.countries_with_ibex || 0)} sub={`de ${data.mapa?.summary?.ibex_catalog_size || 0} cotizadas`} accent="#f59e0b" />
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ padding: '12px 14px', background: '#fff', borderRadius: 8, borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9' }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace' }}>{value}</p>
      <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8' }}>{sub}</p>
    </div>
  )
}

export default SpainKpis
