'use client'
/**
 * <MilitaryKpis /> · 5 KPIs estratégicos globales · Tab 4.
 *
 * - Gasto militar mundial 2024 (sum SIPRI)
 * - Países OTAN >2% PIB
 * - Alianzas activas
 * - Commodities críticos alta severidad
 * - Señales reconfiguración 7d
 */
import { useEffect, useState } from 'react'

export function MilitaryKpis() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/militar/mapa-gasto', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/militar/alianzas', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/militar/commodities-defensa', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/militar/senales-feed', { cache: 'force-cache' }).then((r) => r.json()),
    ])
      .then(([m, a, c, s]) => { if (alive) setData({ milex: m, alliances: a, commodities: c, signals: s }) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando KPIs militares…</p>
  if (!data) return null

  const totalUsd = data.milex?.summary?.total_milex_usd_bn || 0
  const natoCount = data.alliances?.alliances?.find((a: any) => a.id === 'nato')?.members?.length || 0
  const natoAbove2 = data.milex?.countries_all?.filter((c: any) =>
    data.alliances?.alliances?.find((a: any) => a.id === 'nato')?.members?.includes(c.iso3) &&
    (c.milex_pct_gdp || 0) >= 2.0
  ).length || 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
      <Kpi label="Gasto militar mundial" value={`$${totalUsd}bn`} sub="SIPRI 2024 · 60 países cubiertos" accent="#dc2626" />
      <Kpi label="OTAN >2% PIB" value={`${natoAbove2}/${natoCount}`} sub="cumplimiento objetivo aliados" accent="#1e40af" />
      <Kpi label="Alianzas tracked" value={String(data.alliances?.alliances?.length || 0)} sub="NATO+CSTO+SCO+AUKUS+PESCO+QUAD+BRICS" accent="#7c3aed" />
      <Kpi label="Commodities riesgo alto UE" value={String(data.commodities?.summary?.high_severity_eu || 0)} sub="severity 3 · sin sustituto" accent="#f59e0b" />
      <Kpi label="Señales reconfiguración 7d" value={String(data.signals?.signals?.length || 0)} sub="GDELT MIL_EXERCISE + GOV_CHANGE" accent="#0891b2" />
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{
      padding: '12px 14px', background: '#fff', borderRadius: 8,
      borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9',
    }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace', lineHeight: 1.1 }}>{value}</p>
      <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8' }}>{sub}</p>
    </div>
  )
}

export default MilitaryKpis
