'use client'
/**
 * <IntelFusionPanel /> · Sprint G24
 *
 * Panel ejecutivo que muestra todas las fuentes integradas:
 *   - GCRI top risk countries (JRC/EU)
 *   - CFR critical conflicts
 *   - Intel briefings recientes (Janes/Oxford Analytica/IISS/CSIS/Atlantic Council)
 *
 * Consume /api/geopolitica/intel-fusion · vista global (sin iso3).
 */
import { useEffect, useState } from 'react'

interface GcriCountry {
  iso3: string; conflict_risk: number; rank_global: number | null
  category: 'low' | 'moderate' | 'high' | 'severe'
  top_drivers: string[]; notes: string
}

interface CfrConflict {
  id: string; name: string; region: string
  category: 'critical' | 'worsening' | 'unchanging' | 'improving'
  us_impact: 'critical' | 'significant' | 'limited'
  countries_iso3: string[]; summary: string
  recent_developments: string; europe_implications: string
  estimated_fatalities: string; cfr_url: string
}

interface IntelBriefing {
  id: string; source: string; category: string
  countries_iso3: string[]; title: string; summary: string
  key_implications: string[]; analyst_take: string
  published: string; source_url: string
}

interface FusionResp {
  ok: boolean
  top_risk_countries_gcri: GcriCountry[]
  critical_conflicts: CfrConflict[]
  recent_briefings: IntelBriefing[]
}

const CATEGORY_COLOR: Record<CfrConflict['category'], string> = {
  critical: '#7f1d1d', worsening: '#dc2626', unchanging: '#f59e0b', improving: '#16a34a',
}
const GCRI_COLOR: Record<GcriCountry['category'], string> = {
  severe: '#7f1d1d', high: '#dc2626', moderate: '#f59e0b', low: '#16a34a',
}
const SOURCE_COLOR: Record<string, string> = {
  'Janes': '#0c4a6e', 'Oxford Analytica': '#7c3aed', 'IISS': '#0891b2',
  'CFR Foreign Affairs': '#dc2626', 'RUSI': '#16a34a', 'CSIS': '#475569', 'Atlantic Council': '#7f1d1d',
}

export function IntelFusionPanel() {
  const [data, setData] = useState<FusionResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'risks' | 'conflicts' | 'briefings'>('risks')

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/intel-fusion', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) return <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando intel fusion (GCRI + CFR + Janes + Oxford Analytica + IISS)…</p>
  if (!data?.ok) return null

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      <header style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Intel Fusion · 6 fuentes integradas
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
          UCDP + GCRI (JRC/EU) + Freedom House + V-Dem + CFR Conflict Tracker +
          Janes/Oxford Analytica/IISS/CSIS/Atlantic Council briefings.
        </p>
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {(['risks', 'conflicts', 'briefings'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '4px 10px', borderRadius: 5,
                border: tab === t ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: tab === t ? '#0f172a' : '#fff',
                color: tab === t ? '#fff' : '#475569',
                fontSize: 10, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t === 'risks' ? `GCRI Top 15 (JRC/EU)` : t === 'conflicts' ? `CFR Conflictos críticos` : `Briefings (${data.recent_briefings.length})`}
            </button>
          ))}
        </div>
      </header>

      {tab === 'risks' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 6 }}>
          {data.top_risk_countries_gcri.map((c) => (
            <div key={c.iso3} style={{
              padding: '10px 12px', background: '#fff', borderRadius: 6,
              borderLeft: `3px solid ${GCRI_COLOR[c.category]}`, border: '1px solid #f1f5f9',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{c.iso3}</span>
                <span style={{ padding: '1px 7px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: `${GCRI_COLOR[c.category]}20`, color: GCRI_COLOR[c.category], textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {c.category}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: GCRI_COLOR[c.category], fontFamily: 'ui-monospace, monospace' }}>
                  {(c.conflict_risk * 100).toFixed(0)}%
                </span>
                <span style={{ fontSize: 9, color: '#94a3b8' }}>riesgo conflicto 1-4y · rank #{c.rank_global ?? '?'}</span>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: '#475569', lineHeight: 1.3 }}>
                <strong>Drivers:</strong> {c.top_drivers.join(' · ')}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: '#0f172a', fontStyle: 'italic' }}>{c.notes}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'conflicts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.critical_conflicts.map((c) => (
            <div key={c.id} style={{
              padding: '12px 14px', background: '#fff', borderRadius: 8,
              borderLeft: `3px solid ${CATEGORY_COLOR[c.category]}`, border: '1px solid #f1f5f9',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{c.name}</span>
                <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: `${CATEGORY_COLOR[c.category]}20`, color: CATEGORY_COLOR[c.category], textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {c.category}
                </span>
                <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>
                  US impact: {c.us_impact}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: '#94a3b8' }}>{c.region}</span>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: '#0f172a', lineHeight: 1.4 }}>{c.summary}</p>
              <p style={{ margin: '0 0 6px', fontSize: 10, color: '#475569' }}>
                <strong style={{ color: '#7f1d1d' }}>Recientes:</strong> {c.recent_developments}
              </p>
              <p style={{ margin: '0 0 6px', fontSize: 10, color: '#475569' }}>
                <strong style={{ color: '#1e40af' }}>Implicaciones EU/ES:</strong> {c.europe_implications}
              </p>
              <p style={{ margin: '0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
                Víctimas: {c.estimated_fatalities}
              </p>
              <a href={c.cfr_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: '#0891b2', textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                CFR Global Conflict Tracker →
              </a>
            </div>
          ))}
        </div>
      )}

      {tab === 'briefings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.recent_briefings.map((b) => {
            const color = SOURCE_COLOR[b.source] || '#475569'
            return (
              <div key={b.id} style={{
                padding: '12px 14px', background: '#fff', borderRadius: 8,
                borderLeft: `3px solid ${color}`, border: '1px solid #f1f5f9',
              }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: `${color}20`, color, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {b.source}
                  </span>
                  <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>
                    {b.category}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
                    {b.published}
                  </span>
                </div>
                <h5 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{b.title}</h5>
                <p style={{ margin: '0 0 6px', fontSize: 11, color: '#0f172a', lineHeight: 1.4 }}>{b.summary}</p>
                <p style={{ margin: '0 0 4px', fontSize: 10, color: '#475569', fontWeight: 600 }}>Implicaciones clave:</p>
                <ul style={{ margin: '0 0 6px', paddingLeft: 18, fontSize: 10, color: '#475569' }}>
                  {b.key_implications.map((k, i) => <li key={i}>{k}</li>)}
                </ul>
                <p style={{ margin: '6px 0 0', fontSize: 10, color: '#0f172a', fontStyle: 'italic', padding: '6px 8px', background: '#f0f9ff', borderRadius: 4, borderLeft: '2px solid #0891b2' }}>
                  <strong>Analyst take:</strong> {b.analyst_take}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8' }}>
                  Países: {b.countries_iso3.join(' · ')} · {b.source_url ? <a href={b.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0891b2' }}>Fuente →</a> : ''}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default IntelFusionPanel
