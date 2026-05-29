'use client'
/**
 * <DefenseCommoditiesPanel /> · Sprint GEO-MIL C5
 *
 * Panel 6 commodities críticos para defensa con precio (cuando disponible),
 * proveedores dominantes, severidad UE y notas estratégicas.
 *
 * Consume /api/militar/commodities-defensa.
 */
import { useEffect, useState } from 'react'
import { isoToName } from '@/lib/geopolitica/country-coords'

interface Commodity {
  id: string
  name_es: string
  hs_code: string
  use_military: string
  dominant_suppliers: string[]
  eu_strategic_reserve: boolean
  severity_eu: number
  notes: string
  spot_price_usd: number | null
  spot_currency: string | null
  spot_unit: string | null
  source: string
}
interface Response {
  ok: boolean
  commodities: Commodity[]
  summary: { total: number; with_live_price: number; high_severity_eu: number }
}

export function DefenseCommoditiesPanel() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/militar/commodities-defensa', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      <header style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Commodities críticos para defensa · UE supply chain
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
          {data?.commodities?.length ?? 14} minerales/materiales sin los que no hay industria militar moderna · USGS Mineral Commodity Summaries 2024 + Alpha Vantage spot
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando commodities defensa…</p>}

      {!loading && data?.ok && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {data.commodities.map((c) => {
            const sevColor = c.severity_eu === 3 ? '#7f1d1d' : c.severity_eu === 2 ? '#dc2626' : '#f59e0b'
            return (
              <div key={c.id} style={{
                padding: '12px 14px', background: '#fff', borderRadius: 8,
                borderLeft: `3px solid ${sevColor}`, border: '1px solid #f1f5f9',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{c.name_es}</span>
                  <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>HS {c.hs_code}</span>
                </div>
                <p style={{ margin: '0 0 6px', fontSize: 10, color: '#475569', lineHeight: 1.4 }}>
                  {c.use_military}
                </p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  {c.dominant_suppliers.map((iso3) => (
                    <span key={iso3} style={{
                      padding: '2px 7px', background: '#fef2f2', color: '#7f1d1d',
                      borderRadius: 10, fontSize: 9, fontWeight: 600,
                    }}>{isoToName(iso3)}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                  <div>
                    <span style={{
                      padding: '2px 7px', borderRadius: 3,
                      background: `${sevColor}20`, color: sevColor,
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, fontSize: 9,
                    }}>SEV {c.severity_eu}/3</span>
                    {c.eu_strategic_reserve && (
                      <span style={{ marginLeft: 4, padding: '2px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: 3, fontSize: 9, fontWeight: 700 }}>RESERVA UE</span>
                    )}
                  </div>
                  {c.spot_price_usd !== null ? (
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#0f172a' }}>
                      ${c.spot_price_usd.toFixed(2)} {c.spot_unit}
                    </span>
                  ) : (
                    <span style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>sin spot</span>
                  )}
                </div>
                {c.notes && (
                  <p style={{ margin: '6px 0 0', fontSize: 9, color: '#7f1d1d', fontStyle: 'italic', background: '#fef2f2', padding: '4px 6px', borderRadius: 4 }}>
                    {c.notes}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default DefenseCommoditiesPanel
