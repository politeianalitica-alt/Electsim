'use client'
/**
 * <GeoRiskKpis /> · Sprint GEO-RP C2
 *
 * 5 KPIs ejecutivos globales para Tab 3 (encima del mapa):
 *   - Países en alerta IRPC >55
 *   - Países con regresión democrática V-Dem
 *   - Episodios estrés soberano (placeholder hasta CDS)
 *   - Anomalías portuarias (placeholder hasta agregado PortWatch global)
 *   - Conflictos activos con >100 arts WAR_CONFLICT/30d
 *
 * Consume /api/geopolitica/irpc + /api/geopolitica/conflictos-activos.
 */
import { useEffect, useState } from 'react'

interface IRPCResponse {
  ok: boolean
  countries: Array<{ irpc: number; risk_level: string; raw: { polyarchy_trend?: string; gdelt_articles_30d?: number } }>
  summary: { total: number; en_crisis: number; en_alerta: number; regresiones_democraticas: number; ews_activos: number }
}

interface ConflictsResp {
  ok: boolean
  conflicts: Array<{ events_30d: number }>
  total_with_signal: number
}

export function GeoRiskKpis() {
  const [irpc, setIrpc] = useState<IRPCResponse | null>(null)
  const [conflicts, setConflicts] = useState<ConflictsResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/geopolitica/irpc', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/geopolitica/conflictos-activos', { cache: 'force-cache' }).then((r) => r.json()),
    ])
      .then(([i, c]) => { if (alive) { setIrpc(i); setConflicts(c) } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando KPIs globales…</p>

  const enAlerta = irpc?.summary.en_alerta ?? 0
  const regresiones = irpc?.summary.regresiones_democraticas ?? 0
  const ewsActivos = irpc?.summary.ews_activos ?? 0
  const conflictosAltos = conflicts?.conflicts.filter((c) => c.events_30d > 100).length ?? 0

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 10,
    }}>
      <Kpi label="Países en alerta" value={String(enAlerta)} sub="IRPC > 55" accent="#dc2626" />
      <Kpi label="Regresión democrática" value={String(regresiones)} sub="V-Dem trend regresion/severa" accent="#7c3aed" />
      <Kpi label="EWS activos" value={String(ewsActivos)} sub="violencia 7d > 1.5x esperada" accent="#f59e0b" />
      <Kpi label="Conflictos altos" value={String(conflictosAltos)} sub="GDELT WAR >100 arts 30d" accent="#7f1d1d" />
      <Kpi label="Cobertura geográfica" value={String(irpc?.summary.total ?? 0)} sub="países en catálogo" accent="#0891b2" />
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
      <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace', lineHeight: 1.1 }}>{value}</p>
      <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8' }}>{sub}</p>
    </div>
  )
}

export default GeoRiskKpis
