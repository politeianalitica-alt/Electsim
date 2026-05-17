'use client'

/**
 * FiguresView — análisis de sentimiento por figura pública.
 *
 * Por cada figura:
 *   - Volumen y polaridad
 *   - Tendencia 24h (Δ polaridad vs día anterior)
 *   - Topics asociados (qué se dice de ellos)
 *   - Quién les menciona (medios con ideología)
 *   - Titulares recientes con sentimiento
 */

import { useState } from 'react'
import type { FigureSentimentDeep } from '@/lib/news-intel'

export default function FiguresView({ figures }: { figures: FigureSentimentDeep[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(figures[0]?.id ?? null)
  const active = figures.find(f => f.id === selectedId) ?? figures[0]

  if (figures.length === 0) {
    return <div style={{ padding: 80, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
      Sin figuras detectadas en el feed actual.
    </div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18 }}>
      {/* Listado ranking */}
      <aside>
        <h3 style={{ fontSize: 11.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, margin: '0 0 8px' }}>
          {figures.length} figuras públicas
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {figures.map(f => {
            const isActive = active?.id === f.id
            const polColor = f.polarity > 0.10 ? '#16A34A' : f.polarity < -0.10 ? '#DC2626' : '#6e6e73'
            const trendColor = f.trend24h > 0.05 ? '#16A34A' : f.trend24h < -0.05 ? '#DC2626' : '#9ca3af'
            return (
              <button key={f.id} onClick={() => setSelectedId(f.id)} style={{
                background: isActive ? '#1F4E8C' : '#fff',
                color:      isActive ? '#fff' : '#1d1d1f',
                border:     `1px solid ${isActive ? '#1F4E8C' : '#ECECEF'}`,
                borderRadius: 10, padding: '10px 12px',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <strong style={{ fontSize: 13.5, fontWeight: 700 }}>{f.label}</strong>
                  <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', opacity: 0.85 }}>{f.mentions}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span style={{ color: isActive ? '#fff' : polColor, fontWeight: 700 }}>
                    polaridad {f.polarity > 0 ? '+' : ''}{f.polarity.toFixed(2)}
                  </span>
                  <span style={{ color: isActive ? '#fff' : trendColor, fontWeight: 600, opacity: isActive ? 0.85 : 1 }}>
                    {f.trend24h > 0 ? '↑' : f.trend24h < 0 ? '↓' : '→'} {Math.abs(f.trend24h).toFixed(2)}
                  </span>
                </div>
                {/* Mini bar pos/neg */}
                <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', background: isActive ? 'rgba(255,255,255,0.20)' : '#ECECEF', marginTop: 6 }}>
                  <div style={{ width: `${100 * f.pos / Math.max(1, f.mentions)}%`, background: '#16A34A' }} />
                  <div style={{ width: `${100 * f.neu / Math.max(1, f.mentions)}%`, background: isActive ? '#fff' : '#94a3b8', opacity: isActive ? 0.5 : 1 }} />
                  <div style={{ width: `${100 * f.neg / Math.max(1, f.mentions)}%`, background: '#DC2626' }} />
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Detalle */}
      {active && (
        <article style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '22px 26px' }}>
          <header style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, marginBottom: 4 }}>Figura pública</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{active.label}</h2>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            <Kpi label="Menciones" value={active.mentions.toString()} accent="#1F4E8C" />
            <Kpi label="Polaridad" value={`${active.polarity > 0 ? '+' : ''}${active.polarity.toFixed(2)}`} accent={active.polarity > 0.10 ? '#16A34A' : active.polarity < -0.10 ? '#DC2626' : '#6e6e73'} />
            <Kpi label="Δ 24h" value={`${active.trend24h > 0 ? '+' : ''}${active.trend24h.toFixed(2)}`} sub={active.trend24h > 0 ? 'mejora' : active.trend24h < 0 ? 'empeora' : '—'} accent={active.trend24h > 0.05 ? '#16A34A' : active.trend24h < -0.05 ? '#DC2626' : '#6e6e73'} />
            <Kpi label="Distribución" value={`${active.pos}↑ / ${active.neg}↓`} sub={`${active.neu} neutras`} accent="#7C3AED" />
          </div>

          {/* Temas asociados */}
          {active.topTopics.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, margin: '0 0 8px' }}>
                Asociado a estas narrativas
              </h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {active.topTopics.map((t, i) => (
                  <span key={i} style={{
                    background: 'rgba(124,58,237,0.10)', color: '#7C3AED',
                    padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Quién menciona */}
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, margin: '0 0 8px' }}>
              Quién le menciona
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {active.whoMentions.map(m => (
                <div key={m.medio} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                  <span style={{
                    width: 50, fontSize: 9.5, fontWeight: 700, color: '#fff',
                    background: m.ideology < -15 ? '#4338CA' : m.ideology > 15 ? '#DC2626' : '#6e6e73',
                    padding: '2px 0', borderRadius: 4, textAlign: 'center',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}>
                    {m.ideology < -40 ? 'izq+' : m.ideology < -15 ? 'izq' : m.ideology > 40 ? 'der+' : m.ideology > 15 ? 'der' : 'centro'}
                  </span>
                  <span style={{ flex: 1, color: '#1d1d1f' }}>{m.medio}</span>
                  <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700 }}>{m.n} menciones</span>
                </div>
              ))}
            </div>
          </div>

          {/* Titulares recientes */}
          <div>
            <h3 style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, margin: '0 0 8px' }}>
              Titulares recientes
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {active.recentTitles.length === 0 ? (
                <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Sin titulares en ventana</div>
              ) : active.recentTitles.map((t, i) => {
                const c = t.sentiment > 0.10 ? '#16A34A' : t.sentiment < -0.10 ? '#DC2626' : '#6e6e73'
                return (
                  <a key={i} href={t.link} target="_blank" rel="noopener" style={{
                    padding: '10px 12px', border: '1px solid #ECECEF', borderRadius: 10,
                    textDecoration: 'none', color: 'inherit', display: 'block',
                    borderLeft: `3px solid ${c}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10.5, color: '#1F4E8C', fontWeight: 700 }}>{t.medio}</span>
                      <span style={{ fontSize: 10.5, color: c, fontWeight: 700 }}>{t.sentiment > 0 ? '+' : ''}{t.sentiment.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#1d1d1f', lineHeight: 1.35 }}>{t.title}</div>
                  </a>
                )
              })}
            </div>
          </div>
        </article>
      )}
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{ background: '#FAFAFB', border: '1px solid #ECECEF', borderLeft: `3px solid ${accent}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}
