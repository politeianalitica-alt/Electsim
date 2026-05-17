'use client'

/**
 * StoryClustersView — cobertura comparada del mismo evento.
 *
 * Agrupa noticias por similitud (Jaccard sobre títulos) y muestra cómo
 * cada bloque ideológico encuadra la MISMA historia. Esencial para
 * detectar diferencias de framing.
 */

import type { StoryCluster } from '@/lib/news-intel'

export default function StoryClustersView({ clusters }: { clusters: StoryCluster[] }) {
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
          La misma noticia contada desde distintos ángulos ideológicos. Compara cómo encuadra cada bloque mediático un mismo suceso.
        </p>
      </header>

      {clusters.map(c => (
        <article key={c.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', overflow: 'hidden' }}>
          {/* Header */}
          <header style={{ padding: '16px 20px', borderBottom: '1px solid #ECECEF', background: 'linear-gradient(180deg, #FAFAFB 0%, #fff 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
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
                    {c.ideologySpread > 60 ? 'cobertura polarizada' : c.ideologySpread > 30 ? 'cobertura plural' : 'cobertura consensuada'}
                  </span>
                </div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, margin: 0, color: '#1d1d1f', letterSpacing: '-0.012em', lineHeight: 1.3 }}>
                  {c.representativeTitle}
                </h4>
              </div>
            </div>
          </header>

          {/* Framings · 3 columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#ECECEF' }}>
            <FramingColumn label="Izquierda" color="#4338CA" titles={c.framings.left} />
            <FramingColumn label="Centro"    color="#6e6e73" titles={c.framings.center} />
            <FramingColumn label="Derecha"   color="#DC2626" titles={c.framings.right} />
          </div>

          {/* Lista de medios */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #ECECEF', background: '#FAFAFB' }}>
            <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, marginBottom: 6 }}>
              Medios que la han cubierto
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {c.articles.map((a, i) => {
                const ideo = a.medio.ideologia
                const color = ideo < -15 ? '#4338CA' : ideo > 15 ? '#DC2626' : '#6e6e73'
                const sentColor = a.sentiment_score > 0.10 ? '#16A34A' : a.sentiment_score < -0.10 ? '#DC2626' : '#6e6e73'
                return (
                  <a key={i} href={a.link} target="_blank" rel="noopener" title={a.title} style={{
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
                )
              })}
            </div>
          </div>
        </article>
      ))}
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
            }}>"{t}"</li>
          ))}
        </ul>
      )}
    </div>
  )
}
