'use client'

import { useState, useMemo } from 'react'
import { useApi } from '@/lib/useApi'
import Skeleton, { LiveDot } from './Skeleton'
import CountUp from './CountUp'
import LiveStatusBadge from './LiveStatusBadge'
import type { Narrative, NarrativeFrameAnalysis } from '../app/api/narratives/analysis/route'

// ── Categorías y colores ─────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  economia:          { label: 'Economía',          color: '#0F766E', bg: '#F0FDFA' },
  politica_interior: { label: 'Política interior', color: '#1F4E8C', bg: '#EFF6FF' },
  politica_exterior: { label: 'Política exterior', color: '#7C3AED', bg: '#F5F3FF' },
  seguridad:         { label: 'Seguridad',         color: '#991B1B', bg: '#FEF2F2' },
  justicia:          { label: 'Justicia',          color: '#1E293B', bg: '#F1F5F9' },
  territorial:       { label: 'Territorial',       color: '#C2410C', bg: '#FFF7ED' },
  identidad:         { label: 'Identidad',         color: '#BE185D', bg: '#FDF2F8' },
  sociedad:          { label: 'Sociedad',          color: '#15803D', bg: '#F0FDF4' },
  tecnologia:        { label: 'Tecnología',        color: '#4338CA', bg: '#EEF2FF' },
  medioambiente:     { label: 'Medio ambiente',    color: '#65A30D', bg: '#F7FEE7' },
  otros:             { label: 'Otros',             color: '#475569', bg: '#F8FAFC' },
}

const VELOCITY_META: Record<string, { label: string; color: string; symbol: string }> = {
  subiendo: { label: 'Acelerando',  color: '#DC2626', symbol: '▲' },
  estable:  { label: 'Estable',     color: '#6E6E73', symbol: '▬' },
  bajando:  { label: 'En declive',  color: '#16A34A', symbol: '▼' },
}

const SENTIMENT_COLOR: Record<string, string> = {
  positivo: '#16A34A',
  negativo: '#DC2626',
  neutro:   '#6E6E73',
  mixto:    '#A855F7',
}

const IDEOLOGY_BG: Record<string, string> = {
  izquierda:  'linear-gradient(90deg, #E30613 0%, #E30613 100%)',
  centro:     'linear-gradient(90deg, #6E6E73 0%, #6E6E73 100%)',
  derecha:    'linear-gradient(90deg, #009FDB 0%, #009FDB 100%)',
  transversal:'linear-gradient(90deg, #E30613 0%, #6E6E73 50%, #009FDB 100%)',
}

interface FetchResult {
  narratives: Narrative[]
  categories_dist: Record<string, number>
  total_clusters: number
}

export default function NarrativesGallery() {
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deepCache, setDeepCache] = useState<Record<string, NarrativeFrameAnalysis>>({})
  const [analyzingTopic, setAnalyzingTopic] = useState<string | null>(null)

  const { data, source, updatedAt, refresh } = useApi<FetchResult>(
    '/api/narratives/analysis?hours_back=72&min_articles_per_cluster=2',
    { refreshInterval: 180_000 }
  )

  const narratives = data?.narratives ?? []
  const dist = data?.categories_dist ?? {}

  const filtered = useMemo(() => {
    if (filter === 'all') return narratives
    return narratives.filter(n => n.category === filter)
  }, [narratives, filter])

  const allCategories = Object.keys(CATEGORY_META).filter(k => dist[k] > 0)

  async function deepAnalyze(topic: string) {
    if (deepCache[topic] || analyzingTopic === topic) return
    setAnalyzingTopic(topic)
    try {
      const res = await fetch('/api/narratives/deep-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, hours_back: 168 }),
      })
      const json = await res.json()
      if (json.framework) {
        setDeepCache(prev => ({ ...prev, [topic]: json.framework }))
      }
    } catch { /* ignore */ }
    finally { setAnalyzingTopic(null) }
  }

  function toggleExpand(topic: string) {
    if (expanded === topic) {
      setExpanded(null)
    } else {
      setExpanded(topic)
      // auto-trigger deep analysis if not cached
      const n = narratives.find(x => x.topic === topic)
      if (n && !n.framework_analysis && !deepCache[topic]) {
        deepAnalyze(topic)
      }
    }
  }

  return (
    <section style={{ marginTop: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.018em', margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'}/>
            Narrativas activas
          </h2>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0' }}>
            {data ? (
              <><CountUp value={data.total_clusters}/> narrativas detectadas en 72h · análisis Entman + Lakoff con PoliteIA</>
            ) : 'Detectando narrativas...'}
          </p>
        </div>
        <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={180} onRefresh={refresh}/>
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        <button onClick={() => setFilter('all')} style={pillStyle(filter === 'all', '#1d1d1f', '#FFFFFF')}>
          Todas <span style={{ opacity: 0.6, marginLeft: 4 }}>{narratives.length}</span>
        </button>
        {allCategories.map(cat => {
          const meta = CATEGORY_META[cat]
          const active = filter === cat
          return (
            <button key={cat} onClick={() => setFilter(cat)} style={pillStyle(active, meta.color, meta.bg)}>
              {meta.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>{dist[cat]}</span>
            </button>
          )
        })}
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
        {filtered.length > 0 ? filtered.map((n, i) => (
          <NarrativeCard
            key={n.topic}
            narrative={n}
            expanded={expanded === n.topic}
            framework={n.framework_analysis ?? deepCache[n.topic]}
            analyzing={analyzingTopic === n.topic}
            onToggle={() => toggleExpand(n.topic)}
            delay={i * 30}
          />
        )) : (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <Skeleton width="60%" height={14} radius={4} style={{ marginBottom: 8 }}/>
              <Skeleton width="100%" height={11} radius={4} style={{ marginBottom: 6 }}/>
              <Skeleton width="80%" height={11} radius={4}/>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

// ── Narrative Card ───────────────────────────────────────────────────────────
function NarrativeCard({
  narrative: n,
  expanded,
  framework,
  analyzing,
  onToggle,
  delay,
}: {
  narrative: Narrative
  expanded: boolean
  framework?: NarrativeFrameAnalysis
  analyzing: boolean
  onToggle: () => void
  delay: number
}) {
  const meta = CATEGORY_META[n.category] || CATEGORY_META.otros
  const vel = VELOCITY_META[n.velocity] || VELOCITY_META.estable
  const sentColor = SENTIMENT_COLOR[n.dominant_sentiment] || '#6E6E73'

  return (
    <div style={{
      background: '#fff', borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: `1px solid ${expanded ? meta.color : '#ECECEF'}`,
      animation: 'pol-fade-in 360ms ease-out',
      animationDelay: `${delay}ms`, animationFillMode: 'backwards',
      transition: 'border-color 200ms, box-shadow 200ms',
    }}>
      {/* Header (clickable) */}
      <button onClick={onToggle} style={{
        width: '100%', textAlign: 'left',
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: '14px 16px', fontFamily: 'inherit',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Category chip + velocity */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
              <span style={{
                fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                background: meta.bg, color: meta.color, letterSpacing: '0.05em',
              }}>{meta.label.toUpperCase()}</span>
              <span style={{ fontSize: 10.5, color: vel.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                {vel.symbol} {vel.label}
              </span>
            </div>
            {/* Topic */}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 600, letterSpacing: '-0.01em', color: '#1d1d1f', textTransform: 'capitalize' }}>
              {n.topic}
            </div>
          </div>
          {/* Expand indicator */}
          <span style={{ fontSize: 14, color: '#6E6E73', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms', flexShrink: 0 }}>▾</span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
          <span><strong style={{ color: 'var(--ink)' }}>{n.n_articles}</strong> arts</span>
          <span><strong style={{ color: 'var(--ink)' }}>{n.n_sources}</strong> medios</span>
          <span style={{ color: sentColor, fontWeight: 600 }}>● {n.dominant_sentiment}</span>
          <span>relevancia <strong style={{ color: 'var(--ink)' }}>{n.avg_relevance}</strong></span>
          {n.high_impact_count > 0 && (
            <span style={{ color: '#DC2626', fontWeight: 600 }}>{n.high_impact_count} alto impacto España</span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--hairline)' }}>
          {/* Framework analysis */}
          {framework ? (
            <FrameworkBlock framework={framework}/>
          ) : analyzing ? (
            <div style={{ padding: '12px 0' }}>
              <Skeleton width="40%" height={11} radius={4} style={{ marginBottom: 6 }}/>
              <Skeleton width="100%" height={11} radius={4} style={{ marginBottom: 6 }}/>
              <Skeleton width="92%" height={11} radius={4} style={{ marginBottom: 6 }}/>
              <Skeleton width="88%" height={11} radius={4}/>
              <p style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 10, fontStyle: 'italic' }}>Analizando con PoliteIA (framework Entman + Lakoff)...</p>
            </div>
          ) : (
            <div style={{ padding: '12px 0' }}>
              <p style={{ fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' }}>
                Análisis del frame no disponible. Pulsa Re-analizar.
              </p>
            </div>
          )}

          {/* Top actors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            {n.top_personas.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Personas</div>
                {n.top_personas.slice(0, 4).map(p => (
                  <div key={p.name} style={{ fontSize: 11, color: 'var(--ink-2)', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ color: 'var(--ink-4)', flexShrink: 0, marginLeft: 4 }}>{p.cnt}</span>
                  </div>
                ))}
              </div>
            )}
            {n.top_orgs.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Organizaciones</div>
                {n.top_orgs.slice(0, 4).map(p => (
                  <div key={p.name} style={{ fontSize: 11, color: 'var(--ink-2)', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ color: 'var(--ink-4)', flexShrink: 0, marginLeft: 4 }}>{p.cnt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sample articles */}
          {n.samples.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>Artículos representativos</div>
              {n.samples.map(a => (
                <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--hairline)' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.4, fontWeight: 500, marginBottom: 2 }}>
                    {a.title}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', display: 'flex', gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{a.source}</span>
                    <span style={{ color: SENTIMENT_COLOR[a.sentiment] || 'var(--ink-4)' }}>● {a.sentiment}</span>
                    <span>R{a.relevance}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FrameworkBlock({ framework }: { framework: NarrativeFrameAnalysis }) {
  if (framework.error) {
    return (
      <p style={{ fontSize: 11, color: 'var(--ink-4)', padding: '10px 0' }}>
        Análisis no disponible: {framework.error}
      </p>
    )
  }
  const lean = framework.ideological_lean || 'centro'
  return (
    <div style={{ padding: '12px 0 0' }}>
      {/* Frame label header */}
      {framework.frame_label && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Frame dominante</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginTop: 2 }}>
            "{framework.frame_label}"
          </div>
          {framework.dominant_metaphor && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, fontStyle: 'italic' }}>
              metáfora cognitiva: <strong>{framework.dominant_metaphor}</strong>
            </div>
          )}
        </div>
      )}

      {/* Entman 4 frames */}
      <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
        {framework.problem_definition && (
          <FrameBox label="Problema construido" text={framework.problem_definition} accent="#DC2626"/>
        )}
        {framework.causal_interpretation && (
          <FrameBox label="Atribución causal" text={framework.causal_interpretation} accent="#D97706"/>
        )}
        {framework.moral_evaluation && (
          <FrameBox label="Juicio moral implícito" text={framework.moral_evaluation} accent="#7C3AED"/>
        )}
        {framework.treatment_recommendation && (
          <FrameBox label="Solución sugerida" text={framework.treatment_recommendation} accent="#0F766E"/>
        )}
      </div>

      {/* Actors */}
      {((framework.actors_protagonist || []).length > 0 || (framework.actors_antagonist || []).length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {(framework.actors_protagonist || []).length > 0 && (
            <div>
              <div style={{ fontSize: 9.5, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 3 }}>Protagonistas</div>
              {framework.actors_protagonist!.map(a => (
                <div key={a} style={{ fontSize: 11, color: 'var(--ink-2)' }}>{a}</div>
              ))}
            </div>
          )}
          {(framework.actors_antagonist || []).length > 0 && (
            <div>
              <div style={{ fontSize: 9.5, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 3 }}>Antagonistas</div>
              {framework.actors_antagonist!.map(a => (
                <div key={a} style={{ fontSize: 11, color: 'var(--ink-2)' }}>{a}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ideology bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>
          Sesgo ideológico: <strong style={{ color: 'var(--ink-2)' }}>{lean}</strong>
        </div>
        <div style={{ height: 4, background: '#F5F5F7', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: lean === 'izquierda' ? '0%' : lean === 'derecha' ? '70%' : lean === 'transversal' ? '0%' : '40%',
            width: lean === 'transversal' ? '100%' : '30%',
            height: '100%',
            background: IDEOLOGY_BG[lean] || '#6E6E73',
            transition: 'left 600ms, width 600ms',
          }}/>
        </div>
      </div>

      {/* Strategic recs */}
      {framework.counter_frame_suggested && (
        <FrameBox label="Contra-frame sugerido" text={framework.counter_frame_suggested} accent="#1F4E8C"/>
      )}
      {framework.strategic_recommendation && (
        <div style={{ marginTop: 8 }}>
          <FrameBox label="Recomendación estratégica" text={framework.strategic_recommendation} accent="#15803D"/>
        </div>
      )}
    </div>
  )
}

function FrameBox({ label, text, accent }: { label: string; text: string; accent: string }) {
  return (
    <div style={{ padding: '8px 12px', background: '#FAFAFB', borderLeft: `3px solid ${accent}`, borderRadius: 4 }}>
      <div style={{ fontSize: 9.5, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{text}</div>
    </div>
  )
}

function pillStyle(active: boolean, color: string, bg: string): React.CSSProperties {
  return {
    background: active ? color : '#fff',
    color: active ? '#fff' : color,
    border: `1px solid ${active ? color : '#ECECEF'}`,
    borderRadius: 999, padding: '5px 12px', fontSize: 11.5,
    fontFamily: 'inherit', fontWeight: 600,
    cursor: 'pointer', transition: 'all 160ms',
    letterSpacing: '0.01em',
  }
}
