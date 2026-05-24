'use client'
/**
 * `<GeoTopRisks />` · Sprint G2.
 *
 * Replica del clásico "Top 10 Risks" de Eurasia Group aplicado a España:
 *  - 10 riesgos curados para Spain analyst 2026
 *  - Cada uno con impact × likelihood × Spain exposure
 *  - Visualización: tabla rankada con badges color-coded
 *
 * Diferenciador vs Eurasia Group:
 *  - Spain-first context (no Wall Street default)
 *  - Updateable cada mes (vs anual)
 *  - Combinado con feed sanciones + ACLED para detectar escalada
 */
import { useEffect, useState } from 'react'

interface Risk {
  rank: number
  title: string
  region: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  likelihood: 'low' | 'medium' | 'high'
  spain_exposure: 'low' | 'medium' | 'high' | 'critical'
  source: string
}

interface TopRisksResponse {
  ok: boolean
  year: number
  risks: Risk[]
  methodology: string
  cite: string
}

const LEVEL_COLOR: Record<string, { bg: string; fg: string }> = {
  low:      { bg: '#dcfce7', fg: '#166534' },
  medium:   { bg: '#fef3c7', fg: '#92400e' },
  high:     { bg: '#ffedd5', fg: '#9a3412' },
  critical: { bg: '#fee2e2', fg: '#991b1b' },
}

function Badge({ level }: { level: string }) {
  const c = LEVEL_COLOR[level] || LEVEL_COLOR.medium
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: 0.5,
      padding: '2px 8px',
      borderRadius: 10,
      background: c.bg,
      color: c.fg,
      textTransform: 'uppercase',
    }}>
      {level}
    </span>
  )
}

export function GeoTopRisks() {
  const [data, setData] = useState<TopRisksResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/top-risks', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #7c3aed', borderRadius: 12, padding: 18 }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#7c3aed', textTransform: 'uppercase' }}>
          ◆ Top 10 Riesgos Geopolíticos {data?.year || 2026} · estilo Eurasia Group
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
          Spain-first context · combina impacto + probabilidad + exposición España · curado mensualmente
        </p>
      </header>
      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando top risks…</p>}
      {data && data.risks && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                <th style={{ padding: '8px', fontWeight: 700 }}>#</th>
                <th style={{ padding: '8px', fontWeight: 700 }}>Riesgo</th>
                <th style={{ padding: '8px', fontWeight: 700 }}>Región</th>
                <th style={{ padding: '8px', fontWeight: 700, textAlign: 'center' }}>Impacto</th>
                <th style={{ padding: '8px', fontWeight: 700, textAlign: 'center' }}>Probabilidad</th>
                <th style={{ padding: '8px', fontWeight: 700, textAlign: 'center' }}>Exp. España</th>
                <th style={{ padding: '8px', fontWeight: 700 }}>Fuentes</th>
              </tr>
            </thead>
            <tbody>
              {data.risks.map((r) => (
                <tr key={r.rank} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px', fontWeight: 700, color: '#7c3aed', fontVariantNumeric: 'tabular-nums' as const }}>
                    #{r.rank}
                  </td>
                  <td style={{ padding: '8px', color: '#0f172a', fontWeight: 600 }}>{r.title}</td>
                  <td style={{ padding: '8px', fontSize: 11, color: '#64748b' }}>{r.region}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}><Badge level={r.impact} /></td>
                  <td style={{ padding: '8px', textAlign: 'center' }}><Badge level={r.likelihood} /></td>
                  <td style={{ padding: '8px', textAlign: 'center' }}><Badge level={r.spain_exposure} /></td>
                  <td style={{ padding: '8px', fontSize: 9, color: '#94a3b8' }}>{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && (
        <p style={{ margin: '10px 0 0', fontSize: 9, color: '#94a3b8', lineHeight: 1.5 }}>
          {data.methodology}
        </p>
      )}
    </section>
  )
}

export default GeoTopRisks
