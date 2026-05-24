'use client'
/**
 * `<GeoAnalogFinder />` · Sprint G4.
 *
 * Historical Analog Finder: dado el contexto actual, surface las 5 crisis
 * pasadas más similares con outcome resumido.
 *
 * Inspiración: RAND historical analogy methodology + CIA's "How to Think
 * Like an Intelligence Analyst" pattern matching framework.
 *
 * Permite al analista pensar "¿esto se parece a 2008? ¿a 2014?" con datos.
 * Feature DIFERENCIADORA: ningún Verisk/Eurasia hace este pattern matching
 * cuantificado · sólo análisis narrativo de su staff.
 */
import { useEffect, useState } from 'react'

interface Crisis {
  id: string
  year: number
  title: string
  regions: string[]
  type: string
  tags: string[]
  duration_months: number
  outcome: string
  spain_impact: 'none' | 'low' | 'medium' | 'high' | 'critical'
  fatalities_estimate?: string
  url?: string
  similarity: number
}

interface AnalogResp {
  ok: boolean
  context_used: { types: string[]; regions: string[]; tags: string[] }
  derived: boolean
  analogs: Crisis[]
  methodology: string
  corpus_size: number
}

const IMPACT_COLOR: Record<string, { bg: string; fg: string }> = {
  none:     { bg: '#f1f5f9', fg: '#475569' },
  low:      { bg: '#dcfce7', fg: '#166534' },
  medium:   { bg: '#fef3c7', fg: '#92400e' },
  high:     { bg: '#ffedd5', fg: '#9a3412' },
  critical: { bg: '#fee2e2', fg: '#991b1b' },
}

const TYPE_LABEL: Record<string, string> = {
  military:   'Militar',
  cold_war:   'Guerra fría',
  energy:     'Energético',
  financial:  'Financiero',
  migration:  'Migratorio',
  sanctions:  'Sanciones',
  narrative:  'Narrativa',
  terrorism:  'Terrorismo',
  sovereignty:'Soberanía',
  pandemic:   'Pandémica',
}

export function GeoAnalogFinder() {
  const [data, setData] = useState<AnalogResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/historical-analog', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #ec4899', borderRadius: 12, padding: 18 }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#ec4899', textTransform: 'uppercase' }}>
          ◆ Historical Analog Finder · feature exclusiva Politeia
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          Pattern matching contexto actual vs 30 crisis 1962-2025 · RAND methodology · "¿esto se parece a 2008?"
        </p>
      </header>
      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Buscando analogías históricas…</p>}
      {data && (
        <>
          {data.derived && (
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 10,
              color: '#92400e',
              marginBottom: 10,
            }}>
              <strong>Contexto auto-derivado:</strong> {data.context_used.types.join(' · ')} en {data.context_used.regions.join(', ')}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.analogs.map((c) => {
              const isExpanded = expanded === c.id
              const impc = IMPACT_COLOR[c.spain_impact]
              return (
                <div key={c.id} style={{
                  background: '#fafafa',
                  border: '1px solid #f1f5f9',
                  borderRadius: 8,
                  padding: 12,
                  cursor: 'pointer',
                  transition: 'background 120ms',
                }}
                  onClick={() => setExpanded(isExpanded ? null : c.id)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fafafa' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto auto', gap: 10, alignItems: 'center' }}>
                    <span style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#ec4899',
                      fontVariantNumeric: 'tabular-nums' as const,
                    }}>
                      {c.similarity}
                    </span>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {c.title}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>
                        {c.year} · {TYPE_LABEL[c.type] || c.type} · {c.duration_months}m · {c.regions.slice(0, 3).join(', ')}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      padding: '3px 8px',
                      borderRadius: 10,
                      background: impc.bg,
                      color: impc.fg,
                      textTransform: 'uppercase',
                    }}>
                      ES · {c.spain_impact}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {isExpanded ? '▾' : '▸'}
                    </span>
                  </div>
                  {isExpanded && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                      <p style={{ margin: 0, fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                        <strong style={{ color: '#0f172a' }}>Outcome:</strong> {c.outcome}
                      </p>
                      {c.fatalities_estimate && (
                        <p style={{ margin: '6px 0 0', fontSize: 10, color: '#dc2626' }}>
                          <strong>Fallecidos estimados:</strong> {c.fatalities_estimate}
                        </p>
                      )}
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {c.tags.map((t) => (
                          <span key={t} style={{
                            fontSize: 9,
                            padding: '1px 6px',
                            background: '#e2e8f0',
                            color: '#475569',
                            borderRadius: 3,
                          }}>{t}</span>
                        ))}
                      </div>
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-block', marginTop: 8, fontSize: 10, color: '#ec4899' }}>
                          Fuente externa →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 9, color: '#94a3b8' }}>
            Corpus: {data.corpus_size} crisis · {data.methodology}
          </p>
        </>
      )}
    </section>
  )
}

export default GeoAnalogFinder
