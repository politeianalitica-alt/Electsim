'use client'
/**
 * <DiplomaticKpis /> · Sprint GEO-DIP C2
 * 5 KPIs: total entities sancionados · regímenes · países pariah · alineados · señales 7d
 */
import { useEffect, useState } from 'react'

export function DiplomaticKpis() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/diplomacia/sanciones-mapa', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/diplomacia/senales', { cache: 'force-cache' }).then((r) => r.json()),
    ])
      .then(([m, s]) => { if (alive) setData({ map: m, signals: s }) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando KPIs diplomáticos…</p>
  if (!data) return null

  const s = data.map?.summary || {}
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
      <Kpi label="Países con sanciones" value={String(s.with_sanctions || 0)} sub={`${s.pariah_states || 0} pariah states`} accent="#dc2626" />
      <Kpi label="Entidades sancionadas" value="~60.000" sub="OpenSanctions agregado 333+ fuentes" accent="#7f1d1d" />
      <Kpi label="Pro-occidentales AGNU" value={String(s.western_aligned || 0)} sub="alignment > +50" accent="#1e40af" />
      <Kpi label="Pro-orientales AGNU" value={String(s.eastern_aligned || 0)} sub="alignment < -30" accent="#7f1d1d" />
      <Kpi label="No alineados" value={String(s.non_aligned || 0)} sub="abstención frecuente" accent="#94a3b8" />
      <Kpi label="Señales 7d" value={String(data.signals?.signals?.length || 0)} sub="GDELT diplomatic events" accent="#0891b2" />
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

export default DiplomaticKpis
