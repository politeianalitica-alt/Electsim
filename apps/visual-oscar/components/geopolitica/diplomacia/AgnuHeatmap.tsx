'use client'
/**
 * <AgnuHeatmap /> · Sprint GEO-DIP C3
 *
 * Heatmap 40 países × 10 resoluciones AGNU clave.
 * Verde = a favor del bloque occidental · rojo = contra · gris = abstención.
 * Sin fetch · usa el dataset estático directamente.
 */
import { useState } from 'react'
import { AGNU_RESOLUTIONS, AGNU_VOTES, type Vote } from '@/lib/geopolitica/agnu-voting'
import { isoToName } from '@/lib/geopolitica/country-coords'

function voteColor(v: Vote): string {
  if (v === 1) return '#16a34a'
  if (v === -1) return '#dc2626'
  if (v === 0) return '#94a3b8'
  return '#f1f5f9'
}

function voteLabel(v: Vote): string {
  if (v === 1) return 'A favor'
  if (v === -1) return 'En contra'
  if (v === 0) return 'Abstención'
  return 'Ausente'
}

export function AgnuHeatmap() {
  const [hover, setHover] = useState<{ iso3: string; resId: string; vote: Vote } | null>(null)
  const [filterTopic, setFilterTopic] = useState<string | null>(null)

  const resolutions = filterTopic
    ? AGNU_RESOLUTIONS.filter((r) => r.topic === filterTopic)
    : AGNU_RESOLUTIONS

  // Ordenar países por alignment occidental descendente
  const countries = Object.keys(AGNU_VOTES).sort((a, b) => {
    const sumA = Object.values(AGNU_VOTES[a]).filter((v): v is 1 | -1 | 0 => v !== null).reduce((s, v) => s + v, 0)
    const sumB = Object.values(AGNU_VOTES[b]).filter((v): v is 1 | -1 | 0 => v !== null).reduce((s, v) => s + v, 0)
    return sumB - sumA
  })

  const topics = Array.from(new Set(AGNU_RESOLUTIONS.map((r) => r.topic)))

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      <header style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Heatmap votaciones AGNU · 50 países × 10 resoluciones clave 2022-2024
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
          Verde = a favor línea occidental · Rojo = en contra · Gris = abstención · Vacío = ausente.
          Países ordenados por alineamiento descendente.
        </p>
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterTopic(null)} style={chipStyle(filterTopic === null)}>Todas</button>
          {topics.map((t) => (
            <button key={t} onClick={() => setFilterTopic(filterTopic === t ? null : t)} style={chipStyle(filterTopic === t)}>{t.replace(/_/g, ' ')}</button>
          ))}
        </div>
      </header>

      <div style={{ overflowX: 'auto', position: 'relative' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 9 }}>
          <thead>
            <tr>
              <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '2px solid #f1f5f9', position: 'sticky', left: 0, background: '#fff', zIndex: 2 }}>País</th>
              {resolutions.map((r) => (
                <th key={r.id} style={{ padding: '4px 4px', writingMode: 'vertical-rl', textOrientation: 'mixed', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #f1f5f9', minHeight: 60, height: 80, whiteSpace: 'nowrap' }} title={r.title_es}>
                  {r.title_es.slice(0, 40)}{r.title_es.length > 40 ? '…' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {countries.map((iso3) => (
              <tr key={iso3}>
                <td style={{ padding: '2px 8px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f8fafc', position: 'sticky', left: 0, background: '#fff', zIndex: 1, fontSize: 10 }}>
                  {isoToName(iso3)} <span style={{ color: '#94a3b8', fontSize: 8 }}>{iso3}</span>
                </td>
                {resolutions.map((r) => {
                  const vote = AGNU_VOTES[iso3][r.id]
                  return (
                    <td key={r.id} style={{ padding: 0, borderBottom: '1px solid #f8fafc' }}>
                      <div
                        onMouseEnter={() => setHover({ iso3, resId: r.id, vote })}
                        onMouseLeave={() => setHover(null)}
                        style={{
                          width: 18, height: 16, background: voteColor(vote),
                          margin: '1px auto', borderRadius: 2, cursor: 'help',
                        }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hover && (
        <div style={{
          marginTop: 8, padding: '6px 10px', background: '#0f172a', color: '#fff',
          borderRadius: 6, fontSize: 11, display: 'inline-block',
        }}>
          <strong>{isoToName(hover.iso3)}</strong> · <span style={{ color: voteColor(hover.vote) }}>{voteLabel(hover.vote)}</span>
          {' '} · {AGNU_RESOLUTIONS.find((r) => r.id === hover.resId)?.title_es}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 9, color: '#475569' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#16a34a', borderRadius: 2 }} />A favor</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#dc2626', borderRadius: 2 }} />En contra</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#94a3b8', borderRadius: 2 }} />Abstención</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#f1f5f9', borderRadius: 2 }} />Ausente</span>
      </div>
    </section>
  )
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '3px 8px', borderRadius: 6,
    border: active ? '1px solid #0f172a' : '1px solid #e2e8f0',
    background: active ? '#0f172a' : '#fff',
    color: active ? '#fff' : '#475569',
    fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }
}

export default AgnuHeatmap
