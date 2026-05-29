'use client'
/**
 * <InversionPanel /> · Sprint GEO-ES C5
 *
 * Panel inversión exterior España · Top 15 posiciones FDI + análisis cartera.
 */
import { useEffect, useState } from 'react'

interface Cobertura {
  appri_in_force: boolean
  adt_in_force: boolean
  ico_available: boolean
  ico_max_eur_m: number | null
  cesce_rating: string
  cesce_open: boolean
  cesce_short_term: string
  cesce_medium_long_term: string
  notes: string
}

interface FDIPosition {
  iso3: string; name_es: string
  fdi_stock_eur_bn: number
  share_total_pct: number
  vdem_polyarchy: number | null
  risk_high: boolean
  cobertura?: Cobertura | null
}
interface Response {
  ok: boolean
  summary: { total_fdi_stock_eur_bn: number; countries_in_catalog: number; hhi_concentration: number; hhi_label: string; exposure_high_risk_pct: number; exposure_high_risk_bn: number }
  top_positions: FDIPosition[]
}

interface Props {
  onCountryClick?: (iso3: string) => void
}

export function InversionPanel({ onCountryClick }: Props = {}) {
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
        Top 15 posiciones FDI + cobertura formal por posición
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.top_positions.map((p) => (
          <div key={p.iso3}
            onClick={() => onCountryClick?.(p.iso3)}
            style={{
              padding: '6px 8px',
              background: p.risk_high ? '#fef2f2' : '#fff',
              borderRadius: 5,
              border: '1px solid #f1f5f9',
              cursor: onCountryClick ? 'pointer' : 'default',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 130, fontSize: 11, color: '#0f172a', fontWeight: 600 }}>
                {p.name_es} {p.risk_high && <span style={{ color: '#dc2626' }}>!</span>}
              </span>
              <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${(p.fdi_stock_eur_bn / maxFdi) * 100}%`, height: '100%', background: p.risk_high ? '#dc2626' : '#7c3aed' }} />
              </div>
              <span style={{ width: 90, fontSize: 10, fontFamily: 'ui-monospace, monospace', textAlign: 'right', color: '#0f172a' }}>
                €{p.fdi_stock_eur_bn}bn ({p.share_total_pct}%)
              </span>
              {p.vdem_polyarchy !== null && (
                <span style={{ width: 40, fontSize: 9, color: '#94a3b8', textAlign: 'right' }}>V-Dem {p.vdem_polyarchy.toFixed(2)}</span>
              )}
            </div>
            {/* G24 · Cobertura formal en linea (APPRI/ADT/ICO/CESCE) */}
            {p.cobertura && (
              <div style={{ display: 'flex', gap: 4, marginTop: 4, fontSize: 9, flexWrap: 'wrap' }}>
                <Pill label={p.cobertura.appri_in_force ? 'APPRI vigor' : 'APPRI no'} on={p.cobertura.appri_in_force} />
                <Pill label={p.cobertura.adt_in_force ? 'ADT vigor' : 'ADT no'} on={p.cobertura.adt_in_force} />
                <Pill
                  label={p.cobertura.ico_available ? `ICO €${p.cobertura.ico_max_eur_m ?? '?'}M` : 'ICO cerrada'}
                  on={p.cobertura.ico_available}
                />
                <Pill
                  label={`CESCE ${p.cobertura.cesce_rating} · ${p.cobertura.cesce_short_term}/${p.cobertura.cesce_medium_long_term}`}
                  on={p.cobertura.cesce_open}
                />
                {p.cobertura.notes && (
                  <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 9 }}>
                    {p.cobertura.notes.slice(0, 80)}{p.cobertura.notes.length > 80 ? '…' : ''}
                  </span>
                )}
              </div>
            )}
            {!p.cobertura && (
              <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
                Cobertura formal pendiente para este país (top 30 ES seed).
              </p>
            )}
          </div>
        ))}
      </div>

      <p style={{ margin: '10px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
        Cobertura formal: APPRI (Bilateral Investment Treaty) + ADT (Acuerdo Doble Tributación) +
        ICO Línea Internacional + CESCE rating OCDE riesgo país. Datos exteriores.gob.es + cesce.es.
        Click en cualquier posición para abrir ficha país.
      </p>
    </section>
  )
}

function Pill({ label, on }: { label: string; on: boolean }) {
  return (
    <span style={{
      padding: '1px 6px',
      background: on ? '#dcfce7' : '#fef2f2',
      color: on ? '#15803d' : '#7f1d1d',
      borderRadius: 3,
      fontSize: 9,
      fontWeight: 600,
    }}>{label}</span>
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
