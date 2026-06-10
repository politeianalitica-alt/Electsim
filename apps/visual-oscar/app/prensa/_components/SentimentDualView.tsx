'use client'

/**
 * SentimentDualView — análisis de sentimiento con vista dual:
 *
 *   - POLÍTICO: temas × partido (heatmap), figuras bajo presión,
 *     evolución por bloque (izda/centro/dcha)
 *
 *   - EMPRESARIAL: empresas IBEX35 ranking, sectores agregados,
 *     mapa de calor sector × tono, top noticias empresariales
 *
 * Esencial para que la plataforma sirva tanto a partidos como a
 * empresas y consultoras corporativas.
 */

import { useState, useMemo } from 'react'
import type { TopicPartyCell, FigureSentimentDeep, CompanySentiment, SectorSentiment } from '@/lib/news-intel'
import ArchiveLink from '@/components/medios/ArchiveLink'

type View = 'politico' | 'empresarial'

const PARTIES_ORDER = ['PSOE', 'PP', 'Vox', 'Sumar', 'Podemos', 'ERC', 'Junts', 'Bildu', 'PNV', 'BNG']

function cellColor(score: number, n: number, maxN: number): string {
  if (n === 0) return '#FAFAFB'
  const intensity = 0.4 + 0.6 * Math.min(1, n / maxN)
  if (score >  0.10) return `rgba(34, 197, 94, ${intensity.toFixed(2)})`
  if (score < -0.10) return `rgba(220, 38, 38, ${intensity.toFixed(2)})`
  return `rgba(100, 116, 139, ${(intensity * 0.6).toFixed(2)})`
}

export default function SentimentDualView({ cells, figures, companies, sectors }: {
  cells: TopicPartyCell[]
  figures: FigureSentimentDeep[]
  companies: CompanySentiment[]
  sectors: SectorSentiment[]
}) {
  const [view, setView] = useState<View>('politico')

  return (
    <div>
      {/* Switch político / empresarial */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', background: '#fff', borderRadius: 12, padding: 4, border: '1px solid #ECECEF' }}>
          <ViewBtn label="Análisis político"     active={view === 'politico'}    color="#1F4E8C" onClick={() => setView('politico')} />
          <ViewBtn label="Análisis empresarial"  active={view === 'empresarial'} color="#7C3AED" onClick={() => setView('empresarial')} />
        </div>
        <span style={{ fontSize: 11.5, color: '#6e6e73', marginLeft: 'auto' }}>
          {view === 'politico' ? 'Sentimiento por tema y partido · figuras bajo presión' : 'Sentimiento por empresa IBEX35 y sector · marcas con riesgo'}
        </span>
      </div>

      {view === 'politico'
        ? <PoliticoView cells={cells} figures={figures} />
        : <EmpresarialView companies={companies} sectors={sectors} />}
    </div>
  )
}

function ViewBtn({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? color : 'transparent',
      color: active ? '#fff' : '#3a3a3d',
      border: 0, borderRadius: 9, padding: '7px 16px',
      fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
    }}>{label}</button>
  )
}

// ── Vista política ──────────────────────────────────────────────────────

function PoliticoView({ cells, figures }: { cells: TopicPartyCell[]; figures: FigureSentimentDeep[] }) {
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
    const topics = Array.from(topicsSet)
      .map(t => ({ topic: t, total: Object.values(grid[t] || {}).reduce((s, c) => s + c.n, 0) }))
      .sort((a, b) => b.total - a.total)
      .map(x => x.topic)
    return { topics, grid, maxN, partyTotals }
  }, [cells])

  const partiesPresent = PARTIES_ORDER.filter(p => partyTotals[p])
  const worstParty = partiesPresent.length
    ? partiesPresent.reduce((w, p) => partyTotals[p].score < partyTotals[w].score ? p : w, partiesPresent[0])
    : null
  const bestParty = partiesPresent.length
    ? partiesPresent.reduce((b, p) => partyTotals[p].score > partyTotals[b].score ? p : b, partiesPresent[0])
    : null

  if (cells.length === 0) {
    return <div style={{ padding: 80, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
      No hay datos suficientes para cruzar temas × partidos en la ventana actual.
    </div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
      <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '20px 24px' }}>
        <header style={{ marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.018em' }}>
            Tema × partido
          </h3>
          <p style={{ fontSize: 12.5, color: '#515154', margin: 0 }}>
            Color = polaridad media · intensidad = volumen · valores en cada celda: nº de menciones y score
          </p>
        </header>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 120 + partiesPresent.length * 80 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: '#fff', textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>Tema ↓ / Partido →</th>
                {partiesPresent.map(p => (
                  <th key={p} style={{ padding: '8px 4px', textAlign: 'center', minWidth: 76 }}>
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
                      <td key={p} style={{ padding: 0, borderTop: '1px solid #ECECEF' }}>
                        <div title={cell ? `${topic} × ${p}: ${n} menciones · pos ${cell.pos} / neg ${cell.neg} / score ${cell.score}` : `${topic} × ${p}: sin menciones`} style={{
                          margin: 4, padding: '10px 4px', textAlign: 'center',
                          background: cellColor(score, n, maxN), borderRadius: 6,
                          color: n > maxN / 2 ? '#fff' : '#1d1d1f',
                          fontWeight: 700, fontSize: 11.5,
                          cursor: n > 0 ? 'pointer' : 'default',
                          minHeight: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {n > 0 ? (
                            <>
                              <span style={{ fontFamily: 'var(--font-display)' }}>{n}</span>
                              <span style={{ fontSize: 9.5, opacity: 0.85, fontWeight: 600 }}>{score > 0 ? '+' : ''}{score.toFixed(2)}</span>
                            </>
                          ) : <span style={{ color: '#cbd5e1' }}>·</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '16px 18px' }}>
          <h4 style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, margin: '0 0 12px' }}>
            Balance del marco
          </h4>
          {bestParty && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>Mejor cobertura ↗</span>
                <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>+{partyTotals[bestParty].score.toFixed(2)}</span>
              </div>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{bestParty}</strong>
              <div style={{ fontSize: 11.5, color: '#515154', marginTop: 4 }}>
                {partyTotals[bestParty].pos} positivas vs {partyTotals[bestParty].neg} negativas
              </div>
            </div>
          )}
          {worstParty && worstParty !== bestParty && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>Peor cobertura ↘</span>
                <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>{partyTotals[worstParty].score.toFixed(2)}</span>
              </div>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{worstParty}</strong>
              <div style={{ fontSize: 11.5, color: '#515154', marginTop: 4 }}>
                {partyTotals[worstParty].neg} negativas vs {partyTotals[worstParty].pos} positivas
              </div>
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '16px 18px' }}>
          <h4 style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, margin: '0 0 10px' }}>
            Figuras bajo presión
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {figures.slice().sort((a, b) => a.polarity - b.polarity).slice(0, 6).map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 12, color: '#1d1d1f', fontWeight: 500 }}>{f.label}</span>
                <span style={{ fontSize: 10, color: '#6e6e73' }}>{f.mentions}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: f.polarity > 0.10 ? '#16A34A' : f.polarity < -0.10 ? '#DC2626' : '#6e6e73',
                  minWidth: 44, textAlign: 'right',
                }}>{f.polarity > 0 ? '+' : ''}{f.polarity.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

// ── Vista empresarial ──────────────────────────────────────────────────────

function EmpresarialView({ companies, sectors }: { companies: CompanySentiment[]; sectors: SectorSentiment[] }) {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const selected = companies.find(c => c.id === selectedCompany) ?? companies[0]

  if (companies.length === 0 && sectors.length === 0) {
    return <div style={{ padding: 80, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
      No hay menciones empresariales detectadas en el feed actual.<br/>
      Amplía la ventana o las fuentes (incluyendo prensa económica).
    </div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      {/* COL 1: Sectores agregados */}
      <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '20px 24px' }}>
        <header style={{ marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>
            Sectores en el foco mediático
          </h3>
          <p style={{ fontSize: 12.5, color: '#515154', margin: 0 }}>
            Agregado de empresas IBEX + keywords sectoriales · {sectors.length} sectores con cobertura
          </p>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sectors.map(s => {
            const pColor = s.polarity > 0.10 ? '#16A34A' : s.polarity < -0.10 ? '#DC2626' : '#6e6e73'
            return (
              <div key={s.sector} style={{
                background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 10,
                padding: '12px 14px', borderLeft: `4px solid ${pColor}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <strong style={{ fontSize: 14, color: '#1d1d1f' }}>{s.sector}</strong>
                  <span style={{ fontSize: 12, fontWeight: 700, color: pColor }}>
                    {s.polarity > 0 ? '+' : ''}{s.polarity.toFixed(2)} · {s.mentions} menciones
                  </span>
                </div>
                {s.companies.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                    {s.companies.slice(0, 5).map(c => (
                      <span key={c.name} style={{
                        background: '#fff', border: '1px solid #ECECEF',
                        padding: '2px 8px', borderRadius: 999, fontSize: 10.5,
                        color: c.polarity > 0.10 ? '#16A34A' : c.polarity < -0.10 ? '#DC2626' : '#1d1d1f',
                        fontWeight: 600,
                      }}>
                        {c.name} <span style={{ color: '#9ca3af', fontWeight: 500 }}>{c.mentions}</span>
                      </span>
                    ))}
                  </div>
                )}
                {s.topNews.slice(0, 2).map((n, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <a href={n.link} target="_blank" rel="noopener" style={{
                      display: 'block', fontSize: 11.5, color: '#1d1d1f', lineHeight: 1.35,
                      padding: '4px 0', textDecoration: 'none', borderTop: i === 0 ? '1px solid #ECECEF' : 0,
                    }}>
                      <span style={{ color: '#9ca3af', fontSize: 10, marginRight: 6, fontWeight: 600 }}>{n.medio}</span>
                      {n.title}
                    </a>
                    <ArchiveLink url={n.link} size={9} />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </section>

      {/* COL 2: Ranking empresas + detalle */}
      <section>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '20px 24px', marginBottom: 12 }}>
          <header style={{ marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>
              IBEX35 · ranking por menciones
            </h3>
            <p style={{ fontSize: 12.5, color: '#515154', margin: 0 }}>
              {companies.length} empresas mencionadas · click para detalle
            </p>
          </header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
            {companies.slice(0, 20).map(c => {
              const isSel = selected?.id === c.id
              return (
                <button key={c.id} onClick={() => setSelectedCompany(c.id)} style={{
                  display: 'grid', gridTemplateColumns: '1fr 60px 50px 60px', alignItems: 'center',
                  background: isSel ? 'rgba(124,58,237,0.10)' : '#FAFAFB',
                  border: `1px solid ${isSel ? '#7C3AED' : '#ECECEF'}`,
                  borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', gap: 8,
                }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f' }}>{c.label}</span>
                  <span style={{ fontSize: 10, color: '#7C3AED', fontWeight: 700 }}>{c.ticker || '—'}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f', textAlign: 'right' }}>{c.mentions}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: c.polarity > 0.10 ? '#16A34A' : c.polarity < -0.10 ? '#DC2626' : '#6e6e73',
                    textAlign: 'right',
                  }}>{c.polarity > 0 ? '+' : ''}{c.polarity.toFixed(2)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {selected && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '20px 24px' }}>
            <header style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700 }}>
                {selected.sector || '—'} · {selected.ticker || '—'}
              </div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, margin: '2px 0 0' }}>
                {selected.label}
              </h4>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              <KPI label="Menciones" value={String(selected.mentions)} accent="#7C3AED" />
              <KPI label="Pol" value={selected.polarity.toFixed(2)} accent={selected.polarity > 0.10 ? '#16A34A' : selected.polarity < -0.10 ? '#DC2626' : '#6e6e73'} />
              <KPI label="Dist" value={`${selected.pos}/${selected.neg}`} accent="#0F766E" />
            </div>
            {selected.topics.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, marginBottom: 6 }}>
                  Temas asociados
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {selected.topics.map(t => (
                    <span key={t} style={{
                      background: 'rgba(124,58,237,0.10)', color: '#7C3AED',
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, marginBottom: 6 }}>
                Noticias recientes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.recent.map((n, i) => {
                  const sColor = n.sentiment > 0.10 ? '#16A34A' : n.sentiment < -0.10 ? '#DC2626' : '#6e6e73'
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <a href={n.link} target="_blank" rel="noopener" style={{
                        background: '#FAFAFB', border: '1px solid #ECECEF',
                        borderRadius: 8, padding: '8px 10px', textDecoration: 'none', color: 'inherit',
                        borderLeft: `3px solid ${sColor}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 10.5, color: '#1F4E8C', fontWeight: 700 }}>{n.medio}</span>
                          <span style={{ fontSize: 10, color: sColor, fontWeight: 700 }}>{n.sentiment > 0 ? '+' : ''}{n.sentiment.toFixed(2)}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.35 }}>{n.title}</div>
                      </a>
                      <ArchiveLink url={n.link} size={9} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function KPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: '#FAFAFB', border: '1px solid #ECECEF', borderLeft: `3px solid ${accent}`,
      borderRadius: 10, padding: '8px 10px',
    }}>
      <div style={{ fontSize: 9.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{value}</div>
    </div>
  )
}
