'use client'

/**
 * NarrativesDeepView — anatomía completa de cada narrativa activa.
 *
 * Por cada narrativa muestra:
 *   - Headline + summary
 *   - KPIs (menciones, polaridad, velocidad de difusión, sesgo ideológico)
 *   - Audiencia objetivo (demografía estimada)
 *   - Canales de difusión (TV/Radio/Digital/Prensa)
 *   - Top mensajes (frases dominantes en titulares)
 *   - Objetivos (qué busca esta narrativa)
 *   - A quién beneficia / perjudica
 *   - Registro emocional (indignación, miedo, esperanza...)
 *   - Top medios que la sostienen + ideología media
 *   - CCAA donde más se cubre
 *   - Noticias que la componen
 *
 * Más un panel de "Coverage gaps" que muestra los temas con sesgo
 * de cobertura (más cubierto por izda vs dcha).
 */

import { useState } from 'react'
import type { NarrativeAnatomy, CoverageGap } from '@/lib/news-intel'

const EMOTION_META: Record<string, { color: string; bg: string }> = {
  indignación: { color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
  rabia:       { color: '#EA580C', bg: 'rgba(234,88,12,0.10)' },
  miedo:       { color: '#7C3AED', bg: 'rgba(124,58,237,0.10)' },
  esperanza:   { color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
  ironía:      { color: '#D97706', bg: 'rgba(217,119,6,0.10)' },
  neutro:      { color: '#6e6e73', bg: 'rgba(110,110,115,0.10)' },
}

export default function NarrativesDeepView({ narratives, gaps }: {
  narratives: NarrativeAnatomy[]
  gaps: CoverageGap[]
}) {
  const [selected, setSelected] = useState<string | null>(narratives[0]?.id ?? null)
  const active = narratives.find(n => n.id === selected) ?? narratives[0]

  if (narratives.length === 0) {
    return <div style={{ padding: 80, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
      Sin narrativas detectadas con el volumen actual. Amplía la ventana temporal.
    </div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18 }}>
      {/* ── Sidebar de narrativas ──────────────────────────── */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h3 style={{ fontSize: 11.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, margin: '0 0 4px' }}>
          Narrativas activas · {narratives.length}
        </h3>
        {narratives.map(n => {
          const isActive = selected === n.id || (!selected && n === active)
          const polColor = n.polarity > 0.10 ? '#16A34A' : n.polarity < -0.10 ? '#DC2626' : '#6e6e73'
          const velColor = n.diffusionVelocity > 60 ? '#DC2626' : n.diffusionVelocity > 30 ? '#D97706' : '#6e6e73'
          return (
            <button key={n.id} onClick={() => setSelected(n.id)} style={{
              background: isActive ? '#1F4E8C' : '#fff',
              color:      isActive ? '#fff' : '#1d1d1f',
              border:     `1px solid ${isActive ? '#1F4E8C' : '#ECECEF'}`,
              borderRadius: 10, padding: '10px 12px',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                <strong style={{ fontSize: 13, fontWeight: 700 }}>{n.topic}</strong>
                <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', opacity: 0.85 }}>{n.totalMentions}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, opacity: 0.85 }}>
                <span style={{ color: isActive ? '#fff' : polColor, fontWeight: 700 }}>
                  pol {n.polarity > 0 ? '+' : ''}{n.polarity.toFixed(2)}
                </span>
                <span style={{ opacity: 0.55 }}>·</span>
                <span style={{ color: isActive ? '#fff' : velColor, fontWeight: 700 }}>
                  vel {n.diffusionVelocity}
                </span>
                <span style={{ opacity: 0.55 }}>·</span>
                <span style={{ opacity: 0.75 }}>
                  {n.ideologyBias > 0 ? `dcha+${n.ideologyBias}` : n.ideologyBias < 0 ? `izda${n.ideologyBias}` : 'centro'}
                </span>
              </div>
            </button>
          )
        })}

        {/* Coverage Gaps */}
        {gaps.length > 0 && (
          <div style={{ marginTop: 18, padding: 12, background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 10 }}>
            <h4 style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, margin: '0 0 8px' }}>
              Sesgo de cobertura
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {gaps.slice(0, 6).map(g => {
                const total = g.leftN + g.centerN + g.rightN || 1
                return (
                  <div key={g.topic}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 11, marginBottom: 2 }}>
                      <span style={{ color: '#1d1d1f', fontWeight: 600 }}>{g.topic}</span>
                      <span style={{ color: g.bias === 'equilibrado' ? '#16A34A' : g.bias === 'izq' ? '#4338CA' : '#DC2626', fontWeight: 700 }}>
                        {g.bias}
                      </span>
                    </div>
                    <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', background: '#ECECEF' }}>
                      <div style={{ width: `${100*g.leftN/total}%`, background: '#4338CA' }}/>
                      <div style={{ width: `${100*g.centerN/total}%`, background: '#6e6e73' }}/>
                      <div style={{ width: `${100*g.rightN/total}%`, background: '#DC2626' }}/>
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 9.5, color: '#9ca3af' }}>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#4338CA', borderRadius: 2 }}/> izda</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#6e6e73', borderRadius: 2 }}/> centro</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#DC2626', borderRadius: 2 }}/> dcha</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Detalle de la narrativa ─────────────────────────── */}
      {active && (
        <article style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', overflow: 'hidden' }}>
          {/* Header */}
          <header style={{ padding: '20px 24px', borderBottom: '1px solid #ECECEF', background: 'linear-gradient(180deg, #FAFAFB 0%, #fff 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, marginBottom: 4 }}>
                  Narrativa
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {active.topic}
                </h2>
                <p style={{ fontSize: 13.5, color: '#515154', margin: 0, lineHeight: 1.5 }}>
                  {active.summary}
                </p>
              </div>
              <span style={{
                color: EMOTION_META[active.emotionalRegister].color,
                background: EMOTION_META[active.emotionalRegister].bg,
                padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                flexShrink: 0,
              }}>
                {active.emotionalRegister}
              </span>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
              <Kpi label="Menciones"  value={active.totalMentions.toString()} accent="#1F4E8C" />
              <Kpi label="Polaridad"  value={`${active.polarity > 0 ? '+' : ''}${active.polarity.toFixed(2)}`} accent={active.polarity > 0.10 ? '#16A34A' : active.polarity < -0.10 ? '#DC2626' : '#6e6e73'} />
              <Kpi label="Velocidad"  value={active.diffusionVelocity.toString()} sub="0-100" accent={active.diffusionVelocity > 60 ? '#DC2626' : '#0F766E'} />
              <Kpi label="Audiencia"  value={`${active.reach.toFixed(1)}M`} sub="lectores agregados" accent="#7C3AED" />
            </div>
          </header>

          {/* Cuerpo · 2 columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#ECECEF' }}>

            {/* COL 1 */}
            <div style={{ background: '#fff', padding: '18px 22px' }}>
              {/* Audiencia objetivo */}
              <Section title="Audiencia objetivo" icon="◐">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {active.audience.length === 0 ? <Empty>Sin segmentación clara</Empty> :
                    active.audience.map(a => (
                      <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontSize: 12, color: '#1d1d1f', flex: '0 0 150px' }}>{a.label}</div>
                        <div style={{ flex: 1, height: 7, background: '#F5F5F7', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${a.share}%`, height: '100%', background: '#1F4E8C' }} />
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1F4E8C', minWidth: 40, textAlign: 'right' }}>{a.share}%</div>
                      </div>
                    ))
                  }
                </div>
              </Section>

              {/* Canales */}
              <Section title="Canales de difusión" icon="◑">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {active.channels.map(c => (
                    <span key={c.channel} style={{
                      background: '#FAFAFB', border: '1px solid #ECECEF',
                      borderRadius: 999, padding: '5px 12px', fontSize: 11.5,
                    }}>
                      <strong>{c.channel}</strong> <span style={{ color: '#6e6e73' }}>{c.weight}%</span>
                    </span>
                  ))}
                </div>
              </Section>

              {/* Objetivos */}
              <Section title="Objetivos de la narrativa" icon="◈">
                <ol style={{ margin: 0, paddingLeft: 22, color: '#1d1d1f', fontSize: 13, lineHeight: 1.55 }}>
                  {active.goals.map((g, i) => <li key={i} style={{ marginBottom: 4 }}>{g}</li>)}
                </ol>
              </Section>

              {/* A quién beneficia/perjudica */}
              <Section title="Impacto político" icon="⊟">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#16A34A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      Beneficia ↗
                    </div>
                    {active.benefitsActor.length === 0 ? <Empty>Sin beneficiado claro</Empty> :
                      active.benefitsActor.map((b, i) => (
                        <div key={i} style={{ marginBottom: 6, fontSize: 12 }}>
                          <strong style={{ color: '#16A34A' }}>{b.actor}</strong>
                          <div style={{ color: '#515154', fontSize: 11, marginTop: 1 }}>{b.reason}</div>
                        </div>
                      ))
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      Perjudica ↘
                    </div>
                    {active.harmsActor.length === 0 ? <Empty>Sin perjudicado claro</Empty> :
                      active.harmsActor.map((h, i) => (
                        <div key={i} style={{ marginBottom: 6, fontSize: 12 }}>
                          <strong style={{ color: '#DC2626' }}>{h.actor}</strong>
                          <div style={{ color: '#515154', fontSize: 11, marginTop: 1 }}>{h.reason}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </Section>
            </div>

            {/* COL 2 */}
            <div style={{ background: '#fff', padding: '18px 22px' }}>
              {/* Top mensajes */}
              <Section title="Mensajes dominantes" icon="✦">
                {active.topMessages.length === 0 ? <Empty>Sin frase recurrente</Empty> :
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {active.topMessages.map((m, i) => (
                      <div key={i} style={{ padding: '8px 10px', background: '#FAFAFB', borderRadius: 8, borderLeft: '3px solid #1F4E8C' }}>
                        <div style={{ fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.4 }}>{m.message}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>{m.supporting} repeticiones</div>
                      </div>
                    ))}
                  </div>
                }
              </Section>

              {/* Top medios */}
              <Section title="Medios que la sostienen" icon="◫">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {active.topMedios.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{
                        width: 38, fontSize: 10, fontWeight: 700, color: '#fff',
                        background: m.ideologia < -15 ? '#4338CA' : m.ideologia > 15 ? '#DC2626' : '#6e6e73',
                        padding: '2px 0', borderRadius: 4, textAlign: 'center',
                      }}>
                        {m.ideologia < -15 ? 'izda' : m.ideologia > 15 ? 'dcha' : 'centro'}
                      </span>
                      <span style={{ flex: 1, color: '#1d1d1f', fontWeight: 500 }}>{m.nombre}</span>
                      <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700 }}>{m.n}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* CCAA */}
              {active.ccaas.length > 0 && (
                <Section title="Cobertura territorial" icon="">
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {active.ccaas.map(c => (
                      <span key={c.ccaa} style={{
                        background: 'rgba(31,78,140,0.08)', color: '#1F4E8C', padding: '3px 9px',
                        borderRadius: 999, fontSize: 11,
                      }}>
                        {c.ccaa} <strong>{c.n}</strong>
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Noticias que la componen */}
              <Section title="Noticias que la componen" icon="">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {active.articles.slice(0, 5).map((a, i) => (
                    <a key={i} href={a.link} target="_blank" rel="noopener" style={{
                      padding: '6px 0', borderBottom: '1px solid #ECECEF',
                      textDecoration: 'none', color: 'inherit', display: 'block',
                    }}>
                      <div style={{ fontSize: 12, color: '#1d1d1f', lineHeight: 1.35 }}>{a.title}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                        {a.medio.nombre} · {a.sentiment === 'positive' ? '+' : a.sentiment === 'negative' ? '–' : '·'}{a.sentiment_score.toFixed(2)}
                      </div>
                    </a>
                  ))}
                </div>
              </Section>
            </div>
          </div>
        </article>
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span style={{ color: '#1F4E8C' }}>{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, color: '#9ca3af', fontStyle: 'italic' }}>{children}</div>
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #ECECEF', borderLeft: `3px solid ${accent}`,
      borderRadius: 10, padding: '10px 12px',
    }}>
      <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}
