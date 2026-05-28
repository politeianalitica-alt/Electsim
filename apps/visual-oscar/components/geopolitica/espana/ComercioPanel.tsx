'use client'
/**
 * <ComercioPanel /> · Sprint GEO-ES C5
 *
 * Panel comercio exterior España:
 * - Distribución exports por región (barras horizontales)
 * - Top 20 destinos exportación 2024
 * - 8 dependencias críticas importación con dominant_country
 */
import { useEffect, useState } from 'react'

interface TopExport {
  iso3: string; name_es: string
  exports_eur_bn: number; imports_eur_bn: number; balance_eur_bn: number
  yoy_change_pct: number | null
}
interface Region { region: string; exports_bn: number; share_pct: number }
interface Dependency {
  hs_code: string; name_es: string
  dominant_country: string; dominant_share: number
  value_imports_2024_bn: number; note: string
}
interface Response {
  ok: boolean
  summary: { total_exports_2024_bn: number; total_imports_2024_bn: number; balance_bn: number; countries_in_catalog: number }
  top_exports: TopExport[]
  critical_dependencies: Dependency[]
  region_distribution: Region[]
}

const REGION_LABEL: Record<string, string> = {
  europa_occ: 'Europa Occidental',
  europa_este: 'Europa del Este',
  norteamerica: 'Norteamérica',
  latam: 'Latinoamérica',
  asia_orient: 'Asia Oriental',
  asia_sudest: 'Asia Sudeste',
  asia_sur: 'Asia del Sur',
  asia_central: 'Asia Central',
  oriente_medio: 'Oriente Medio',
  norte_africa: 'Norte de África',
  africa_subsahariana: 'África Subsahariana',
  oceania: 'Oceanía',
}

export function ComercioPanel() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/presencia-espana/comercio', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando comercio…</p>
  if (!data?.ok) return null

  const maxRegion = Math.max(...data.region_distribution.map((r) => r.exports_bn), 1)

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      <header style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Comercio exterior España · DataComex 2024
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
          Distribución exports por región · top 20 destinos · 8 dependencias críticas de importación con dominant supplier
        </p>
      </header>

      <h4 style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Distribución exports por región
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
        {data.region_distribution.map((r) => (
          <div key={r.region} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 130, fontSize: 10, color: '#475569' }}>{REGION_LABEL[r.region] || r.region}</span>
            <div style={{ flex: 1, height: 14, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${(r.exports_bn / maxRegion) * 100}%`, height: '100%', background: '#16a34a' }} />
            </div>
            <span style={{ width: 70, fontSize: 10, fontFamily: 'ui-monospace, monospace', textAlign: 'right', color: '#0f172a' }}>
              €{r.exports_bn}bn ({r.share_pct}%)
            </span>
          </div>
        ))}
      </div>

      <h4 style={{ margin: '14px 0 6px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Top 20 destinos exportación
      </h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '4px 6px', fontWeight: 600, fontSize: 9, textTransform: 'uppercase' }}>País</th>
              <th style={{ padding: '4px 6px', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', textAlign: 'right' }}>Exports</th>
              <th style={{ padding: '4px 6px', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', textAlign: 'right' }}>Imports</th>
              <th style={{ padding: '4px 6px', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', textAlign: 'right' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.top_exports.map((e) => (
              <tr key={e.iso3} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '5px 6px', fontWeight: 600, color: '#0f172a' }}>{e.name_es} <span style={{ color: '#94a3b8', fontSize: 9, fontWeight: 400 }}>{e.iso3}</span></td>
                <td style={{ padding: '5px 6px', fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>€{e.exports_eur_bn}bn</td>
                <td style={{ padding: '5px 6px', fontFamily: 'ui-monospace, monospace', textAlign: 'right', color: '#64748b' }}>€{e.imports_eur_bn}bn</td>
                <td style={{ padding: '5px 6px', fontFamily: 'ui-monospace, monospace', textAlign: 'right', color: e.balance_eur_bn >= 0 ? '#16a34a' : '#dc2626' }}>
                  {e.balance_eur_bn >= 0 ? '+' : ''}€{e.balance_eur_bn.toFixed(1)}bn
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 style={{ margin: '16px 0 6px', fontSize: 11, fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Dependencias críticas de importación · top 8
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.critical_dependencies.map((d) => (
          <div key={d.hs_code} style={{
            padding: '8px 10px', background: '#fff', borderRadius: 6,
            borderLeft: `3px solid ${d.dominant_share > 0.5 ? '#dc2626' : '#f59e0b'}`,
            border: '1px solid #f1f5f9',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{d.name_es}</span>
              <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>HS {d.hs_code}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2, fontSize: 10 }}>
              <span style={{ color: '#475569' }}>
                Dominante: <strong style={{ color: '#0f172a' }}>{d.dominant_country}</strong> ({Math.round(d.dominant_share * 100)}%)
              </span>
              <span style={{ fontFamily: 'ui-monospace, monospace', color: '#0f172a' }}>€{d.value_imports_2024_bn}bn</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 9, color: '#7f1d1d', fontStyle: 'italic' }}>{d.note}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ComercioPanel
