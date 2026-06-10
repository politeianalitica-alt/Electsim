'use client'

/**
 * StoryClustersView — cobertura comparada del mismo evento.
 *
 * Mejorado con:
 *   - KPIs agregados (total clusters, polarizados, consensuados)
 *   - Distribución por nivel de polarización
 *   - Cluster cards con: framings izq/centro/dcha, sentimiento por bloque,
 *     medios con sentimiento, gaps (silencios), evolución temporal
 *   - Filtros por polarización y tamaño
 */

import { useMemo, useState } from 'react'
import type { StoryCluster } from '@/lib/news-intel'
import ArchiveLink from '@/components/medios/ArchiveLink'

type FiltroPol = 'todos' | 'polarizada' | 'plural' | 'consensuada'

export default function StoryClustersView({ clusters }: { clusters: StoryCluster[] }) {
  const [filtroPol, setFiltroPol] = useState<FiltroPol>('todos')
  const [minMedios, setMinMedios] = useState(2)

  // Stats agregados
  const stats = useMemo(() => {
    const polarizadas = clusters.filter(c => c.ideologySpread > 60).length
    const plurales    = clusters.filter(c => c.ideologySpread > 30 && c.ideologySpread <= 60).length
    const consensuadas = clusters.filter(c => c.ideologySpread <= 30).length
    const totalMedios = clusters.reduce((s, c) => s + c.articles.length, 0)
    const promMedios  = clusters.length > 0 ? +(totalMedios / clusters.length).toFixed(1) : 0
    // Sentiment global
    const allSent = clusters.flatMap(c => c.articles.map(a => a.sentiment_score))
    const sentMean = allSent.length > 0 ? +(allSent.reduce((s, v) => s + v, 0) / allSent.length).toFixed(2) : 0
    return { polarizadas, plurales, consensuadas, totalMedios, promMedios, sentMean }
  }, [clusters])

  // Filtros
  const filtered = useMemo(() => {
    return clusters.filter(c => {
      if (c.articles.length < minMedios) return false
      if (filtroPol === 'polarizada' && c.ideologySpread <= 60) return false
      if (filtroPol === 'plural' && (c.ideologySpread <= 30 || c.ideologySpread > 60)) return false
      if (filtroPol === 'consensuada' && c.ideologySpread > 30) return false
      return true
    })
  }, [clusters, filtroPol, minMedios])

  if (clusters.length === 0) {
    return <div style={{ padding: 80, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
      No se han detectado clusters de cobertura comparable. Amplía la ventana o el número de fuentes.
    </div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.018em' }}>
          Cobertura comparada · {clusters.length} historias
        </h3>
        <p style={{ fontSize: 13, color: '#515154', margin: 0 }}>
          La misma noticia contada desde distintos ángulos ideológicos. Identifica framings divergentes, gaps de cobertura y patrones de polarización mediática.
        </p>
      </header>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        <KPI label="HISTORIAS DETECTADAS" value={String(clusters.length)} color="#1d1d1f"/>
        <KPI label="POLARIZADAS" value={String(stats.polarizadas)} color="#DC2626" sub="izq vs dcha enfrentadas"/>
        <KPI label="PLURALES" value={String(stats.plurales)} color="#F97316" sub="varios encuadres"/>
        <KPI label="CONSENSUADAS" value={String(stats.consensuadas)} color="#16A34A" sub="framing similar"/>
        <KPI label="MEDIOS / HISTORIA" value={String(stats.promMedios)} color="#7C3AED"/>
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 10, padding: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>FILTRAR</span>
        {(['todos', 'polarizada', 'plural', 'consensuada'] as FiltroPol[]).map(f => {
          const active = filtroPol === f
          const colors: Record<FiltroPol, string> = { 'todos': '#1d1d1f', 'polarizada': '#DC2626', 'plural': '#F97316', 'consensuada': '#16A34A' }
          return (
            <button key={f} onClick={() => setFiltroPol(f)}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                       border: '1px solid', borderColor: active ? colors[f] : '#DDDDE3',
                       background: active ? colors[f] : '#fff', color: active ? '#fff' : '#3a3a3d',
                       cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
              {f}
            </button>
          )
        })}
        <span style={{ fontSize: 11, color: '#6e6e73', marginLeft: 8 }}>
          Min medios:
          <input type="number" value={minMedios} min={2} max={20} onChange={e => setMinMedios(+e.target.value || 2)}
            style={{ marginLeft: 6, width: 50, padding: '4px 6px', fontSize: 11, borderRadius: 4, border: '1px solid #DDDDE3' }}/>
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6e6e73' }}>{filtered.length} mostradas</span>
      </div>

      {/* Clusters */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>Sin clusters para los filtros</div>
      ) : (
        filtered.map(c => <ClusterCard key={c.id} c={c}/>)
      )}
    </div>
  )
}

function ClusterCard({ c }: { c: StoryCluster }) {
  const [expanded, setExpanded] = useState(false)

  // Calcular sentimiento medio por bloque ideológico
  const sentByBlock = useMemo(() => {
    const blocks: Record<'left' | 'center' | 'right', number[]> = { left: [], center: [], right: [] }
    for (const a of c.articles) {
      const ideo = a.medio.ideologia
      if (ideo < -15) blocks.left.push(a.sentiment_score)
      else if (ideo > 15) blocks.right.push(a.sentiment_score)
      else blocks.center.push(a.sentiment_score)
    }
    const avg = (arr: number[]) => arr.length > 0 ? +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2) : null
    return { left: avg(blocks.left), center: avg(blocks.center), right: avg(blocks.right),
             nLeft: blocks.left.length, nCenter: blocks.center.length, nRight: blocks.right.length }
  }, [c])

  // Detectar gaps de cobertura
  const gaps: string[] = []
  if (sentByBlock.nLeft === 0) gaps.push('Sin cobertura desde la izquierda')
  if (sentByBlock.nRight === 0) gaps.push('Sin cobertura desde la derecha')
  if (sentByBlock.nCenter === 0) gaps.push('Sin cobertura desde el centro')

  return (
    <article style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ padding: '16px 20px', borderBottom: '1px solid #ECECEF', background: 'linear-gradient(180deg, #FAFAFB 0%, #fff 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700 }}>
                Historia · {c.articles.length} medios
              </span>
              {c.firstSeen && (
                <span style={{ fontSize: 10, color: '#9ca3af' }}>
                  desde {new Date(c.firstSeen).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit' })}
                </span>
              )}
              <span style={{
                fontSize: 9.5, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                color: c.ideologySpread > 60 ? '#DC2626' : c.ideologySpread > 30 ? '#D97706' : '#16A34A',
                background: c.ideologySpread > 60 ? 'rgba(220,38,38,0.10)' : c.ideologySpread > 30 ? 'rgba(217,119,6,0.10)' : 'rgba(22,163,74,0.10)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {c.ideologySpread > 60 ? 'polarizada' : c.ideologySpread > 30 ? 'plural' : 'consensuada'}
              </span>
              <span style={{ fontSize: 9.5, color: '#6e6e73' }}>· Spread ideológico: {c.ideologySpread.toFixed(0)}</span>
            </div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, margin: 0, color: '#1d1d1f', letterSpacing: '-0.012em', lineHeight: 1.3 }}>
              {c.representativeTitle}
            </h4>
            {/* Sentimiento por bloque */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <SentChip label="Izquierda" color="#4338CA" n={sentByBlock.nLeft} sent={sentByBlock.left}/>
              <SentChip label="Centro" color="#6e6e73" n={sentByBlock.nCenter} sent={sentByBlock.center}/>
              <SentChip label="Derecha" color="#DC2626" n={sentByBlock.nRight} sent={sentByBlock.right}/>
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)}
            style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #DDDDE3', background: '#fff', color: '#3a3a3d', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {expanded ? '↑ Colapsar' : '↓ Ver framings'}
          </button>
        </div>
      </header>

      {/* Gaps detectados */}
      {gaps.length > 0 && (
        <div style={{ padding: '8px 20px', background: 'rgba(220,38,38,0.04)', borderBottom: '1px solid #ECECEF' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#7F1D1D', fontWeight: 600 }}>
            <strong>Gaps de cobertura:</strong> {gaps.join(' · ')}
          </p>
        </div>
      )}

      {/* Framings · 3 columnas (solo si expandido) */}
      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#ECECEF' }}>
          <FramingColumn label="Izquierda" color="#4338CA" titles={c.framings.left} />
          <FramingColumn label="Centro"    color="#6e6e73" titles={c.framings.center} />
          <FramingColumn label="Derecha"   color="#DC2626" titles={c.framings.right} />
        </div>
      )}

      {/* Lista de medios */}
      <div style={{ padding: '12px 20px', borderTop: expanded ? '1px solid #ECECEF' : 'none', background: '#FAFAFB' }}>
        <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, marginBottom: 6 }}>
          Medios que la han cubierto
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {c.articles.map((a, i) => {
            const ideo = a.medio.ideologia
            const color = ideo < -15 ? '#4338CA' : ideo > 15 ? '#DC2626' : '#6e6e73'
            const sentColor = a.sentiment_score > 0.10 ? '#16A34A' : a.sentiment_score < -0.10 ? '#DC2626' : '#6e6e73'
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <a href={a.link} target="_blank" rel="noopener" title={a.title} style={{
                  background: '#fff', border: '1px solid #ECECEF',
                  padding: '4px 10px', borderRadius: 999, fontSize: 11,
                  color: '#1d1d1f', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                  <strong>{a.medio.nombre}</strong>
                  <span style={{ color: sentColor, fontWeight: 600 }}>
                    {a.sentiment_score > 0 ? '+' : ''}{a.sentiment_score.toFixed(2)}
                  </span>
                </a>
                <ArchiveLink url={a.link} size={9} />
              </span>
            )
          })}
        </div>
      </div>
    </article>
  )
}

function SentChip({ label, color, n, sent }: { label: string; color: string; n: number; sent: number | null }) {
  const sentColor = sent == null ? '#9CA3AF' : sent > 0.10 ? '#16A34A' : sent < -0.10 ? '#DC2626' : '#9CA3AF'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: `${color}10`, borderRadius: 6, border: `1px solid ${color}30` }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }}/>
      <span style={{ fontSize: 10, color: '#3a3a3d', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 10, color: '#9CA3AF' }}>{n}</span>
      {sent != null && <span style={{ fontSize: 10, color: sentColor, fontWeight: 700 }}>{sent > 0 ? '+' : ''}{sent}</span>}
    </div>
  )
}

function KPI({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 9.5, color: '#9CA3AF' }}>{sub}</div>}
    </div>
  )
}

function FramingColumn({ label, color, titles }: { label: string; color: string; titles: string[] }) {
  return (
    <div style={{ background: '#fff', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 10.5, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em' }}>{label}</span>
      </div>
      {titles.length === 0 ? (
        <div style={{ fontSize: 11.5, color: '#9ca3af', fontStyle: 'italic' }}>Sin cobertura de este bloque</div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {titles.map((t, i) => (
            <li key={i} style={{
              fontSize: 12, color: '#1d1d1f', lineHeight: 1.4,
              paddingLeft: 10, borderLeft: `2px solid ${color}`,
            }}>&laquo;{t}&raquo;</li>
          ))}
        </ul>
      )}
    </div>
  )
}
