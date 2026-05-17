'use client'

/**
 * TopicPartyHeatmap — heatmap de sentimiento topic × partido.
 *
 * Visualiza para cada combinación tema × partido:
 *   - Volumen de menciones (tamaño/intensidad)
 *   - Polaridad media (color: verde positivo, rojo negativo)
 *
 * Complementado con un ranking de figuras y un resumen ejecutivo del
 * partido que peor lo pasa en agenda actual.
 */

import { useMemo } from 'react'
import type { TopicPartyCell, FigureSentimentDeep } from '@/lib/news-intel'

const PARTIES_ORDER = ['PSOE', 'PP', 'Vox', 'Sumar', 'ERC', 'Junts', 'Bildu', 'PNV']

function cellColor(score: number, n: number, maxN: number): string {
  if (n === 0) return '#FAFAFB'
  const intensity = 0.4 + 0.6 * Math.min(1, n / maxN)
  if (score >  0.10) return `rgba(34, 197, 94, ${intensity.toFixed(2)})`
  if (score < -0.10) return `rgba(220, 38, 38, ${intensity.toFixed(2)})`
  return `rgba(100, 116, 139, ${(intensity * 0.6).toFixed(2)})`
}

export default function TopicPartyHeatmap({ cells, figures }: {
  cells: TopicPartyCell[]
  figures: FigureSentimentDeep[]
}) {
  // Construir grid topics × partidos
  const { topics, grid, maxN, partyTotals } = useMemo(() => {
    const topicsSet = new Set<string>()
    const grid: Record<string, Record<string, TopicPartyCell>> = {}
    let maxN = 0
    const partyTotals: Record<string, { pos: number; neg: number; n: number; score: number }> = {}
    for (const c of cells) {
      topicsSet.add(c.topic)
      grid[c.topic] = grid[c.topic] || {}
      grid[c.topic][c.party] = c
      if (c.n > maxN) maxN = c.n
      partyTotals[c.party] = partyTotals[c.party] || { pos: 0, neg: 0, n: 0, score: 0 }
      partyTotals[c.party].pos += c.pos
      partyTotals[c.party].neg += c.neg
      partyTotals[c.party].n   += c.n
    }
    for (const p of Object.keys(partyTotals)) {
      const t = partyTotals[p]
      t.score = t.n > 0 ? +((t.pos - t.neg) / t.n).toFixed(2) : 0
    }
    // Orden topics por menciones totales
    const topics = Array.from(topicsSet)
      .map(t => ({ topic: t, total: Object.values(grid[t] || {}).reduce((s, c) => s + c.n, 0) }))
      .sort((a, b) => b.total - a.total)
      .map(x => x.topic)
    return { topics, grid, maxN, partyTotals }
  }, [cells])

  const partiesPresent = PARTIES_ORDER.filter(p => partyTotals[p])
  const worstParty = partiesPresent.length
    ? partiesPresent.reduce((worst, p) => partyTotals[p].score < partyTotals[worst].score ? p : worst, partiesPresent[0])
    : null
  const bestParty = partiesPresent.length
    ? partiesPresent.reduce((best, p) => partyTotals[p].score > partyTotals[best].score ? p : best, partiesPresent[0])
    : null

  if (cells.length === 0) {
    return <div style={{ padding: 80, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
      No hay datos suficientes para cruzar temas × partidos.
    </div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
      {/* ── Heatmap ─────────────────────────────────────────── */}
      <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '20px 24px' }}>
        <header style={{ marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.018em' }}>
            Sentimiento por tema × partido
          </h3>
          <p style={{ fontSize: 12.5, color: '#515154', margin: 0 }}>
            Color = polaridad media en cobertura · intensidad = volumen de menciones · click en celda para inspección
          </p>
        </header>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 100 + partiesPresent.length * 80 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: '#fff', textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>Tema ↓ / Partido →</th>
                {partiesPresent.map(p => (
                  <th key={p} style={{ padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 11.5, color: '#1d1d1f' }}>{p}</div>
                    <div style={{ fontSize: 10, color: partyTotals[p].score > 0.10 ? '#16A34A' : partyTotals[p].score < -0.10 ? '#DC2626' : '#6e6e73', fontWeight: 600, marginTop: 1 }}>
                      {partyTotals[p].score > 0 ? '+' : ''}{partyTotals[p].score.toFixed(2)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topics.slice(0, 14).map(topic => (
                <tr key={topic}>
                  <td style={{ position: 'sticky', left: 0, background: '#fff', padding: '6px 10px', fontWeight: 500, color: '#1d1d1f', whiteSpace: 'nowrap', borderTop: '1px solid #ECECEF' }}>
                    {topic}
                  </td>
                  {partiesPresent.map(p => {
                    const cell = grid[topic]?.[p]
                    const score = cell?.score ?? 0
                    const n = cell?.n ?? 0
                    return (
                      <td key={p} style={{
                        padding: 0, borderTop: '1px solid #ECECEF',
                      }}>
                        <div title={cell ? `${topic} × ${p}: ${n} menciones · pos ${cell.pos} / neg ${cell.neg} / score ${cell.score}` : `${topic} × ${p}: sin menciones`} style={{
                          margin: 4,
                          padding: '10px 4px', textAlign: 'center',
                          background: cellColor(score, n, maxN),
                          borderRadius: 6,
                          color: n > maxN / 2 ? '#fff' : '#1d1d1f',
                          fontWeight: 700, fontSize: 11.5,
                          cursor: n > 0 ? 'pointer' : 'default',
                          minHeight: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {n > 0 ? (
                            <>
                              <span style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
                              <span style={{ fontSize: 9.5, opacity: 0.85, fontWeight: 600 }}>
                                {score > 0 ? '+' : ''}{score.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>·</span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, paddingTop: 12, borderTop: '1px solid #ECECEF', fontSize: 10.5, color: '#6e6e73' }}>
          <span style={{ fontWeight: 700 }}>Leyenda:</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(34,197,94,0.8)', borderRadius: 3, verticalAlign: 'middle', marginRight: 4 }}/> positivo</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(100,116,139,0.5)', borderRadius: 3, verticalAlign: 'middle', marginRight: 4 }}/> neutro</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(220,38,38,0.8)', borderRadius: 3, verticalAlign: 'middle', marginRight: 4 }}/> negativo</span>
          <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>n = nº de menciones (titulares)</span>
        </div>
      </section>

      {/* ── Sidebar: Resumen ejecutivo ──────────────────────── */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Quién gana / quién pierde */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '16px 18px' }}>
          <h4 style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, margin: '0 0 12px' }}>
            Balance del marco
          </h4>
          {bestParty && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>Mejor cobertura ↗</span>
                <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>+{partyTotals[bestParty].score.toFixed(2)}</span>
              </div>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{bestParty}</strong>
              <div style={{ fontSize: 11.5, color: '#515154', marginTop: 4 }}>
                {partyTotals[bestParty].pos} positivas vs {partyTotals[bestParty].neg} negativas
              </div>
            </div>
          )}
          {worstParty && worstParty !== bestParty && (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>Peor cobertura ↘</span>
                <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>{partyTotals[worstParty].score.toFixed(2)}</span>
              </div>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{worstParty}</strong>
              <div style={{ fontSize: 11.5, color: '#515154', marginTop: 4 }}>
                {partyTotals[worstParty].neg} negativas vs {partyTotals[worstParty].pos} positivas
              </div>
            </div>
          )}
        </div>

        {/* Figuras peor paradas */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '16px 18px' }}>
          <h4 style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, margin: '0 0 10px' }}>
            Figuras bajo presión
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {figures
              .slice()
              .sort((a, b) => a.polarity - b.polarity)
              .slice(0, 5)
              .map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 12, color: '#1d1d1f', fontWeight: 500 }}>{f.label}</span>
                  <span style={{ fontSize: 10, color: '#6e6e73' }}>{f.mentions}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: f.polarity > 0.10 ? '#16A34A' : f.polarity < -0.10 ? '#DC2626' : '#6e6e73',
                    minWidth: 44, textAlign: 'right',
                  }}>{f.polarity > 0 ? '+' : ''}{f.polarity.toFixed(2)}</span>
                </div>
              ))
            }
          </div>
        </div>
      </aside>
    </div>
  )
}
