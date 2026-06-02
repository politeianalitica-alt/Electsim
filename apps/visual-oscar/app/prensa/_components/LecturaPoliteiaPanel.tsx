'use client'
/**
 * <LecturaPoliteiaPanel /> · Sprint M3.
 *
 * Capa transversal · sustituye a la tab "Análisis IA · Groq" que era
 * un módulo suelto. Ahora se renderiza dentro de cualquier tab con el
 * contexto estructurado de esa tab.
 *
 * Recibe `context` con datos estructurados (NO sólo titulares):
 *   - n_articles, sentiment, actors, topics, narratives, ideologicalComparison
 *   - readings_summary · si se pasa, sube la confianza de la lectura
 *   - source_methodology · si se pasa, la IA cita warnings
 *
 * Hace POST a /api/medios/lectura · render con ConfidenceBadge + disclaimer.
 */

import { useState } from 'react'
import { ConfidenceBadge } from './MethodologyComponents'
import { FLAGS } from '@/lib/medios/feature-flags'

// Sprint 1.4 · feature flag: cuando USE_CANONICAL_PULSO esté activo en el
// preview de Vercel, hidratamos la lectura desde la capa canónica
// (/api/medios/pulso) en lugar del endpoint legacy /api/medios/intel.
// En producción la flag default es FALSE → comportamiento legacy intacto.
// La transición usará el endpoint /api/medios/lectura ya existente, que
// internamente decide el origen según `pulsoEndpoint`.
const PULSO_ENDPOINT = FLAGS.USE_CANONICAL_PULSO
  ? '/api/medios/pulso?window=72h'
  : '/api/medios/intel?window=72h'

interface ReadingsSummary {
  n_readings: number
  dominant_frames: Array<{ frame: string; count: number }>
  avg_controversy: number
  avg_political_risk: number
  avg_confidence: number
  top_beneficiaries: Array<{ actor: string; count: number }>
  top_affected: Array<{ actor: string; count: number }>
  action_verbs: Array<{ verb: string; count: number }>
}

interface SourceMethodology {
  selected_sources?: number
  balance_mode?: string
  ideological_balance_score?: number
  warnings?: string[]
}

export interface LecturaContext {
  n_articles?: number
  total_results?: number
  top_sources?: { source: string; count: number }[]
  actors?: { name: string; mentions: number; sentiment: number }[]
  topics?: { label: string; count: number }[]
  narratives?: { frame: string; count: number }[]
  sentiment?: { score: number; positive: number; negative: number; neutral: number }
  ideologicalComparison?: { bucket: string; count: number; sentiment: number; dominantFrames?: string[] }[]
  timeline_summary?: { from: string; to: string; peak_date?: string; peak_value?: number }
  sample_titles?: string[]
  readings_summary?: ReadingsSummary
  source_methodology?: SourceMethodology
}

interface ApiMeta {
  source: string
  confidence?: number
  warnings: string[]
  latency_ms: number
}

interface LecturaResponse {
  ok: boolean
  lectura?: string
  generated_at?: string
  disclaimer?: string
  error?: string
  hint?: string
  _meta?: ApiMeta
}

export function LecturaPoliteiaPanel({
  tabId,
  query,
  context,
  title = 'Lectura Politeia',
  collapsedByDefault = false,
}: {
  tabId?: string
  query?: string
  context: LecturaContext
  title?: string
  collapsedByDefault?: boolean
}) {
  const [collapsed, setCollapsed] = useState(collapsedByDefault)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<LecturaResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasStructured = !!(context.readings_summary || context.source_methodology)
  const contextSizeHint = (() => {
    const bits: string[] = []
    if (context.n_articles != null) bits.push(`${context.n_articles} artículos`)
    if (context.readings_summary?.n_readings) bits.push(`${context.readings_summary.n_readings} readings estructurados`)
    if (context.actors?.length) bits.push(`${context.actors.length} actores`)
    if (context.narratives?.length) bits.push(`${context.narratives.length} frames`)
    if (context.source_methodology?.selected_sources) bits.push(`${context.source_methodology.selected_sources} fuentes`)
    return bits.join(' · ')
  })()

  async function generar() {
    setLoading(true); setError(null); setData(null)
    try {
      const r = await fetch('/api/medios/lectura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabId, query, context }),
      })
      const j = (await r.json()) as LecturaResponse
      if (!j.ok) {
        setError(j.error || 'Lectura no disponible')
      } else {
        setData(j)
      }
    } catch (e: any) {
      setError(String(e?.message ?? e).slice(0, 160))
    } finally {
      setLoading(false)
    }
  }

  if (collapsed) {
    return (
      <section style={{
        background: '#faf5ff', border: '1px solid #d8b4fe', borderLeft: '4px solid #a855f7',
        borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: '#7c3aed', textTransform: 'uppercase' }}>
            ◆ {title} · IA capa transversal
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569' }}>
            {contextSizeHint || 'Sin contexto cargado'} · {hasStructured ? 'contexto estructurado · alta confianza' : 'contexto plano · confianza media'}
          </p>
        </div>
        <button
          onClick={() => setCollapsed(false)}
          style={{
            background: '#a855f7', color: '#fff', border: 'none', borderRadius: 4,
            fontSize: 10, fontWeight: 700, padding: '5px 12px', cursor: 'pointer', letterSpacing: 0.4,
          }}
        >
          ▾ generar lectura
        </button>
      </section>
    )
  }

  return (
    <section style={{
      background: 'linear-gradient(180deg, #faf5ff 0%, #fff 100%)',
      border: '1px solid #d8b4fe', borderLeft: '4px solid #a855f7',
      borderRadius: 10, padding: 14,
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>
            ◆ {title} · IA capa transversal
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
            La IA recibe datos estructurados (ArticleReading + NarrativeCluster + SourceMethodology + Confidence), no
            sólo titulares. {hasStructured
              ? 'Detectado contexto estructurado · confianza elevada.'
              : 'Sin contexto estructurado · confianza media · considera enviar readings_summary.'}
            {contextSizeHint && <span style={{ color: '#0f172a' }}> · {contextSizeHint}.</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {data?._meta?.confidence != null && (
            <ConfidenceBadge value={data._meta.confidence} label="conf IA" size="xs" reasons={data._meta.warnings} />
          )}
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: 'transparent', color: '#7c3aed', border: '1px solid #d8b4fe',
              borderRadius: 4, fontSize: 10, padding: '3px 8px', cursor: 'pointer',
            }}
          >
            × ocultar
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <button
          onClick={generar}
          disabled={loading}
          style={{
            background: loading ? '#94a3b8' : '#7c3aed', color: '#fff', border: 'none',
            borderRadius: 4, fontSize: 11, fontWeight: 700, padding: '6px 14px',
            cursor: loading ? 'wait' : 'pointer', letterSpacing: 0.4,
          }}
        >
          {loading ? '… generando' : data ? '↻ regenerar' : '▶ generar lectura'}
        </button>
        {data?._meta?.latency_ms != null && (
          <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
            {data._meta.latency_ms} ms
          </span>
        )}
        {data?.disclaimer && (
          <span style={{ fontSize: 9, color: '#92400e', background: '#fef3c7', padding: '2px 6px', borderRadius: 3, letterSpacing: 0.3 }}>
            ! {data.disclaimer}
          </span>
        )}
      </div>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Generando lectura…</p>}

      {error && (
        <div style={{ fontSize: 11, color: '#dc2626', background: '#fee2e2', padding: 8, borderRadius: 4 }}>
          Lectura no disponible · {error}
        </div>
      )}

      {data?.ok && data.lectura && (
        <article style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6,
          padding: 14, fontSize: 12, color: '#0f172a', lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--font-body)',
        }}>
          {data.lectura}
        </article>
      )}

      {!loading && !data && !error && (
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
          Pulsa "generar lectura" para obtener el briefing IA del contexto actual.
        </p>
      )}
    </section>
  )
}

export default LecturaPoliteiaPanel
