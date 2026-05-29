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
import { getRecentSanctions } from '@/lib/geopolitica/sanctions-detail-seed'

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
  // G19 item 15 · resolución seleccionada (click) para ver detalle qué se votaba
  const [selectedResId, setSelectedResId] = useState<string | null>(null)

  const resolutions = filterTopic
    ? AGNU_RESOLUTIONS.filter((r) => r.topic === filterTopic)
    : AGNU_RESOLUTIONS

  const selectedResolution = selectedResId
    ? AGNU_RESOLUTIONS.find((r) => r.id === selectedResId) ?? null
    : null

  // Ordenar países por alignment occidental descendente
  const countries = Object.keys(AGNU_VOTES).sort((a, b) => {
    const sumA = Object.values(AGNU_VOTES[a]).filter((v): v is 1 | -1 | 0 => v !== null).reduce((s: number, v: number) => s + v, 0)
    const sumB = Object.values(AGNU_VOTES[b]).filter((v): v is 1 | -1 | 0 => v !== null).reduce((s: number, v: number) => s + v, 0)
    return sumB - sumA
  })

  const topics = Array.from(new Set(AGNU_RESOLUTIONS.map((r) => r.topic)))

  const recentSanctions = getRecentSanctions(8)

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      <header style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Heatmap votaciones AGNU · 50 países × {AGNU_RESOLUTIONS.length} resoluciones clave 2022-2025
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
          Verde = a favor línea occidental · Rojo = en contra · Gris = abstención · Vacío = ausente.
          Países ordenados por alineamiento descendente. <strong>Hover sobre cualquier cuadrado para ver detalle.
          Click en el título de cualquier resolución para ampliar.</strong>
        </p>
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterTopic(null)} style={chipStyle(filterTopic === null)}>Todas</button>
          {topics.map((t) => (
            <button key={t} onClick={() => setFilterTopic(filterTopic === t ? null : t)} style={chipStyle(filterTopic === t)}>{t.replace(/_/g, ' ')}</button>
          ))}
        </div>
      </header>

      {/* G23 · layout 2 columnas · heatmap izq, panel sanctions+resolution detail derecha */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)', gap: 16 }}>
        {/* Columna izquierda · heatmap */}
        <div style={{ overflowX: 'auto', position: 'relative' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 9 }}>
            <thead>
              <tr>
                <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '2px solid #f1f5f9', position: 'sticky', left: 0, background: '#fff', zIndex: 2 }}>País</th>
                {resolutions.map((r) => (
                  <th
                    key={r.id}
                    onClick={() => setSelectedResId(selectedResId === r.id ? null : r.id)}
                    style={{
                      padding: '4px 4px', writingMode: 'vertical-rl', textOrientation: 'mixed',
                      fontWeight: 600, borderBottom: '2px solid #f1f5f9',
                      minHeight: 60, height: 80, whiteSpace: 'nowrap',
                      color: selectedResId === r.id ? '#0891b2' : '#64748b',
                      cursor: 'pointer',
                      background: selectedResId === r.id ? '#f0f9ff' : 'transparent',
                    }}
                    title={`${r.id} · ${r.date} · ${r.title_es}\n\n${r.summary_es ?? ''}`}
                  >
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
                    // G23 · tooltip nativo HTML title con detalle completo
                    const resTitle = AGNU_RESOLUTIONS.find((x) => x.id === r.id)?.title_es ?? ''
                    return (
                      <td key={r.id} style={{ padding: 0, borderBottom: '1px solid #f8fafc' }}>
                        <div
                          onMouseEnter={() => setHover({ iso3, resId: r.id, vote })}
                          onMouseLeave={() => setHover(null)}
                          title={`${isoToName(iso3)} (${iso3})\nResolución: ${resTitle}\nFecha: ${r.date}\nVoto: ${voteLabel(vote)}`}
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

        {/* Columna derecha · panel info siempre presente */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Hover detail */}
          {hover ? (
            <div style={{
              padding: '10px 12px', background: '#0f172a', color: '#fff',
              borderRadius: 8, fontSize: 11,
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700 }}>{isoToName(hover.iso3)}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#cbd5e1' }}>
                <span style={{ color: voteColor(hover.vote), fontWeight: 700 }}>{voteLabel(hover.vote)}</span>
                {' · '}
                {AGNU_RESOLUTIONS.find((r) => r.id === hover.resId)?.title_es}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8' }}>
                {AGNU_RESOLUTIONS.find((r) => r.id === hover.resId)?.date} · {hover.resId}
              </p>
            </div>
          ) : (
            <div style={{
              padding: '10px 12px', background: '#f8fafc', color: '#64748b',
              borderRadius: 8, fontSize: 11, border: '1px dashed #cbd5e1',
            }}>
              Hover sobre un cuadrado del heatmap para ver detalle de la votación.
            </div>
          )}

          {/* G23 · sanciones recientes detalladas (sustituye espacio en blanco a la derecha) */}
          <div style={{ padding: '12px 14px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Sanciones recientes · top 8
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentSanctions.map((s, i) => (
                <div key={i} style={{
                  padding: '8px 10px', background: '#fef2f2', borderRadius: 5,
                  borderLeft: '3px solid #dc2626',
                }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 3 }}>
                    <strong style={{ fontSize: 11, color: '#0f172a' }}>{s.target_name}</strong>
                    <span style={{ fontSize: 9, color: '#94a3b8' }}>{s.target_iso3}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 10, color: '#475569' }}>
                    <strong style={{ color: '#7f1d1d' }}>{s.target_role}</strong>
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 10, color: '#475569', lineHeight: 1.3 }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>{s.imposed_by}:</span> {s.reason}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
                    {s.designated} · {s.program}
                  </p>
                </div>
              ))}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
              Datos OpenSanctions (clone repo) · OFAC SDN + UE FSF + UNSC + UK OFSI + CPI.
            </p>
          </div>
        </aside>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 9, color: '#475569' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#16a34a', borderRadius: 2 }} />A favor</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#dc2626', borderRadius: 2 }} />En contra</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#94a3b8', borderRadius: 2 }} />Abstención</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#f1f5f9', borderRadius: 2 }} />Ausente</span>
      </div>

      {/* G19 item 15 · panel detalle resolución seleccionada */}
      {selectedResolution && (
        <div style={{
          marginTop: 14,
          padding: '14px 16px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderLeft: '3px solid #0891b2',
          borderRadius: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
            <div>
              <p style={{
                margin: 0, fontSize: 9, color: '#0891b2', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 0.4,
              }}>
                Resolución {selectedResolution.id} · {selectedResolution.date} · {selectedResolution.topic.replace(/_/g, ' ')}
              </p>
              <h4 style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: '#0c4a6e' }}>
                {selectedResolution.title_es}
              </h4>
            </div>
            <button
              onClick={() => setSelectedResId(null)}
              style={{
                background: 'none', border: 'none', fontSize: 18, color: '#64748b',
                cursor: 'pointer', padding: 0, lineHeight: 1,
              }}
              aria-label="Cerrar detalle"
            >×</button>
          </div>
          {selectedResolution.summary_es && (
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#0f172a', lineHeight: 1.55 }}>
              {selectedResolution.summary_es}
            </p>
          )}
          {selectedResolution.outcome && (
            <div style={{ display: 'flex', gap: 12, fontSize: 11, marginBottom: 8 }}>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>A favor: {selectedResolution.outcome.yes}</span>
              <span style={{ color: '#dc2626', fontWeight: 700 }}>En contra: {selectedResolution.outcome.no}</span>
              <span style={{ color: '#64748b', fontWeight: 700 }}>Abstención: {selectedResolution.outcome.abstain}</span>
            </div>
          )}
          {selectedResolution.sponsors && selectedResolution.sponsors.length > 0 && (
            <p style={{ margin: 0, fontSize: 10, color: '#475569' }}>
              <strong style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3 }}>Sponsors:</strong>{' '}
              {selectedResolution.sponsors.join(' · ')}
            </p>
          )}
          {selectedResolution.source_url && (
            <p style={{ margin: '8px 0 0', fontSize: 10 }}>
              <a
                href={selectedResolution.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0891b2', fontWeight: 600, textDecoration: 'none' }}
              >Texto oficial digitallibrary.un.org →</a>
            </p>
          )}
        </div>
      )}
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
