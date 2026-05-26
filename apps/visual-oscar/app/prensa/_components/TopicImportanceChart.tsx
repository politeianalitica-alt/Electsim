'use client'
/**
 * `<TopicImportanceChart />` · Sprint G15 FASE C
 *
 * Gráfico de importancia temática para la tab Pulso. Barras horizontales
 * sobrias · sin nuevas deps · usa los datos que ya devuelve `/api/medios/intel`
 * con `?include=topic_importance`.
 *
 * Cada tema lleva:
 *  - count (volumen) + share (% del total)
 *  - polaridad media (-1..+1, color por banda)
 *  - tags RSS reales asociados (de source_tags propagados desde parseRSS)
 *  - top 3 medios que empujan
 *  - sample title on hover
 *
 * Click en tema → abre detalle expandido inline con todos los sample titles
 * y opción "Filtrar feed por este tema" (callback opcional). Si no se pasa
 * onSelectTopic, solo abre detalle inline.
 */
import { useState } from 'react'

export interface TopicImportanceItem {
  id: string
  label: string
  count: number
  share: number                                          // 0..1
  polarity: number                                       // -1..+1
  sourceTags: string[]
  topMedios: Array<{ nombre: string; n: number }>
  sampleTitles: string[]
}

interface Props {
  topics: TopicImportanceItem[] | undefined
  loading?: boolean
  onSelectTopic?: (id: string, label: string) => void
}

function polarityColor(p: number): { bar: string; label: string } {
  if (p >= 0.15) return { bar: '#16a34a', label: 'positivo' }
  if (p <= -0.15) return { bar: '#dc2626', label: 'negativo' }
  return { bar: '#94a3b8', label: 'neutro' }
}

export function TopicImportanceChart({ topics, loading, onSelectTopic }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading) {
    return (
      <section style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
        padding: 16, borderLeft: '4px solid #1F4E8C',
      }}>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Calculando importancia temática…</p>
      </section>
    )
  }

  if (!topics || topics.length === 0) {
    return (
      <section style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
        padding: 16, borderLeft: '4px solid #1F4E8C',
      }}>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          Sin datos suficientes de importancia temática (necesitamos ≥2 artículos por tema).
        </p>
      </section>
    )
  }

  const maxCount = Math.max(...topics.map((t) => t.count), 1)

  return (
    <section style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      padding: 16, borderLeft: '4px solid #1F4E8C',
    }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#1F4E8C', textTransform: 'uppercase' }}>
          ▦ Importancia temática · {topics.length} temas dominantes
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
          Combina los <strong>tags reales</strong> que publican los medios en sus RSS
          (<code style={{ background: '#f1f5f9', padding: '0 4px', borderRadius: 2, fontSize: 10 }}>&lt;category&gt;</code>)
          con la heurística de categoría sobre titulares. Cada barra = volumen del tema.
          El color refleja la polaridad media (verde positivo · gris neutro · rojo negativo).
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {topics.map((t) => {
          const widthPct = (t.count / maxCount) * 100
          const pol = polarityColor(t.polarity)
          const isOpen = expandedId === t.id
          return (
            <article key={t.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
              <button
                onClick={() => setExpandedId(isOpen ? null : t.id)}
                style={{
                  width: '100%', background: 'transparent', border: 'none', padding: 0,
                  textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {/* Label + count */}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>
                    {t.label}
                  </span>
                  <span style={{ fontSize: 10, color: '#64748b', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {t.count} · {Math.round(t.share * 100)}%
                    <span style={{ marginLeft: 8, color: pol.bar, fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {pol.label}
                    </span>
                  </span>
                </div>
                {/* Barra */}
                <div style={{ background: '#f1f5f9', borderRadius: 3, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    background: pol.bar, height: '100%', width: `${widthPct}%`,
                    transition: 'width 0.3s ease, background 0.2s ease',
                  }} />
                </div>
              </button>

              {/* Tags + top medios chips · siempre visibles · compact */}
              {(t.sourceTags.length > 0 || t.topMedios.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, fontSize: 9, color: '#64748b' }}>
                  {t.sourceTags.slice(0, 3).map((tag) => (
                    <span key={tag} style={{
                      background: '#eef2ff', color: '#3730a3', padding: '1px 6px', borderRadius: 2,
                      fontWeight: 500,
                    }}>#{tag}</span>
                  ))}
                  {t.topMedios.slice(0, 3).map((m) => (
                    <span key={m.nombre} style={{
                      background: '#f9fafb', color: '#475569', padding: '1px 6px', borderRadius: 2,
                      border: '1px solid #e5e7eb',
                    }}>{m.nombre} <span style={{ opacity: 0.6 }}>×{m.n}</span></span>
                  ))}
                </div>
              )}

              {/* Detalle expandido */}
              {isOpen && (
                <div style={{
                  marginTop: 6, padding: 8, background: '#f9fafb', borderRadius: 6, fontSize: 11, color: '#334155',
                }}>
                  {t.sampleTitles.length > 0 && (
                    <>
                      <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                        Titulares representativos
                      </p>
                      <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {t.sampleTitles.map((title, i) => (
                          <li key={i} style={{ lineHeight: 1.4, fontSize: 11 }}>{title}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {onSelectTopic && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectTopic(t.id, t.label) }}
                        style={{
                          background: '#1F4E8C', color: '#fff', border: 'none',
                          borderRadius: 4, fontSize: 10, fontWeight: 600, padding: '4px 10px',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >Filtrar feed por este tema →</button>
                    </div>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>

      <p style={{ margin: '10px 0 0', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
        Click en un tema para ver titulares representativos. Mínimo 2 artículos por tema para evitar ruido.
        Origen: <code style={{ background: '#f1f5f9', padding: '0 3px', borderRadius: 2 }}>topicImportance()</code> en lib/news-intel.ts.
      </p>
    </section>
  )
}

export default TopicImportanceChart
