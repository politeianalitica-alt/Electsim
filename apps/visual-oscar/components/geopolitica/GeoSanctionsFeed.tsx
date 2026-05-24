'use client'
/**
 * `<GeoSanctionsFeed />` · Sprint G2.
 *
 * Feed consolidado de sanciones recientes (EU + OFAC + UN) con filtro por
 * fuente y Spain exposure tag. Inspiración: OpenSanctions.org consolidator.
 *
 * Diferenciador: tag explícito de spain_exposure (low/medium/high/critical)
 * que ningún consolidador comercial mete. Permite al analista filtrar
 * sólo lo que afecta a España.
 */
import { useEffect, useState } from 'react'

interface Sanction {
  date: string
  source: 'EU' | 'OFAC' | 'UN'
  entity: string
  reason: string
  sector: string
  spain_exposure?: 'low' | 'medium' | 'high' | 'critical'
}

interface SanctionsResponse {
  ok: boolean
  source: string
  sanctions: Sanction[]
  sources_covered: string[]
}

const SOURCE_COLOR: Record<string, { bg: string; fg: string }> = {
  EU:   { bg: '#dbeafe', fg: '#1e40af' },
  OFAC: { bg: '#fee2e2', fg: '#991b1b' },
  UN:   { bg: '#dcfce7', fg: '#166534' },
}
const SECTOR_LABEL: Record<string, string> = {
  energy:      'Energía',
  finance:     'Finanzas',
  security:    'Seguridad',
  commodities: 'Materias primas',
  tech:        'Tecnología',
}
const EXPOSURE_COLOR: Record<string, { bg: string; fg: string }> = {
  low:      { bg: '#dcfce7', fg: '#166534' },
  medium:   { bg: '#fef3c7', fg: '#92400e' },
  high:     { bg: '#ffedd5', fg: '#9a3412' },
  critical: { bg: '#fee2e2', fg: '#991b1b' },
}

export function GeoSanctionsFeed() {
  const [data, setData] = useState<SanctionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'all' | 'EU' | 'OFAC' | 'UN'>('all')

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/geopolitica/sanciones?source=${source}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [source])

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #f59e0b', borderRadius: 12, padding: 18 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#f59e0b', textTransform: 'uppercase' }}>
            ◆ Sanciones consolidadas · EU + OFAC + UN
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
            Inspirado en OpenSanctions.org · tag Spain exposure exclusivo Politeia
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'EU', 'OFAC', 'UN'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              type="button"
              style={{
                background: source === s ? '#f59e0b' : '#f1f5f9',
                color: source === s ? '#fff' : '#475569',
                border: 'none',
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s === 'all' ? 'TODAS' : s}
            </button>
          ))}
        </div>
      </header>
      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando feed sanciones…</p>}
      {data && data.sanctions.length === 0 && (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin sanciones recientes en el filtro.</p>
      )}
      {data && data.sanctions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.sanctions.map((s, i) => {
            const srcC = SOURCE_COLOR[s.source]
            const expC = s.spain_exposure ? EXPOSURE_COLOR[s.spain_exposure] : null
            return (
              <div key={i} style={{
                background: '#f8fafc',
                border: '1px solid #f1f5f9',
                borderLeft: `3px solid ${srcC.fg}`,
                borderRadius: 6,
                padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: srcC.bg,
                    color: srcC.fg,
                  }}>{s.source}</span>
                  <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>{s.date}</span>
                  <span style={{ fontSize: 9, color: '#64748b' }}>· {SECTOR_LABEL[s.sector] || s.sector}</span>
                  {expC && s.spain_exposure && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: expC.bg,
                      color: expC.fg,
                      textTransform: 'uppercase',
                    }}>
                      ES exposure · {s.spain_exposure}
                    </span>
                  )}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#0f172a', fontWeight: 600 }}>
                  {s.entity}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569' }}>
                  {s.reason}
                </p>
              </div>
            )
          })}
        </div>
      )}
      {data && (
        <p style={{ margin: '10px 0 0', fontSize: 9, color: '#94a3b8' }}>
          Fuentes: {data.sources_covered.join(' · ')}
        </p>
      )}
    </section>
  )
}

export default GeoSanctionsFeed
