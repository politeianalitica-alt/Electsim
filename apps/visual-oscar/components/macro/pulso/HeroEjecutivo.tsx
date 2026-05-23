'use client'
/**
 * Hero ejecutivo · panel superior del landing `/macro/pulso`.
 *
 * - Pidió análisis IA automático tab-level al endpoint `/api/macro/ai/analyze-tab`
 *   cuando montas el componente con suficientes señales.
 * - Mientras carga, muestra una lectura determinista con la primera frase
 *   computada del termómetro (no usa IA).
 * - Tras éxito, renderiza headline + diagnosis + strengths + vulnerabilities.
 */
import { useEffect, useRef, useState } from 'react'
import type { TabAnalysisResponse, TabAnalysisInput } from '@/lib/macro/ai-tab-schema'

interface Signal {
  id: string
  family: string
  label: string
  unit: string
  lastValue: number | null
  lastPeriod: string | null
  source: string
  sourceCode: string
  threshold?: { amber?: number; red?: number; goodAbove?: boolean }
  status: 'live' | 'stale' | 'missing'
}

interface Props {
  tabSlug: string
  tabLabel: string
  termometroScore: number
  signals: Signal[]
  loading?: boolean
}

const SEVERITY_COLOR = {
  low: { bg: '#f1f5f9', color: '#475569' },
  medium: { bg: '#fef3c7', color: '#92400e' },
  high: { bg: '#fee2e2', color: '#991b1b' },
} as const

export function HeroEjecutivo({ tabSlug, tabLabel, termometroScore, signals, loading }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [data, setData] = useState<TabAnalysisResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)
  // Sprint N5 fix: cacheKey-based tried tracking en lugar de useRef plano.
  // El useRef persistía entre cambios de tabSlug y bloqueaba el refetch, por
  // eso la lectura ejecutiva mostraba el análisis del primer tab visitado en
  // todas las pestañas posteriores.
  const triedKeyRef = useRef<string>('')

  useEffect(() => {
    if (loading) return
    if (signals.length < 3) return

    const cacheKey = `macro:hero:${tabSlug}:${termometroScore}:${signals.map((s) => s.id + s.lastValue).join('|')}`
    if (triedKeyRef.current === cacheKey) return
    triedKeyRef.current = cacheKey

    // Reset estado al cambiar de tab antes de leer cache (evita parpadeos del análisis anterior)
    setData(null)
    setErr(null)
    setState('loading')

    try {
      const cached = window.sessionStorage.getItem(cacheKey)
      if (cached) {
        setData({ ...(JSON.parse(cached) as TabAnalysisResponse), cache_hit: true })
        setState('success')
        return
      }
    } catch {
      /* ignore */
    }

    const input: TabAnalysisInput = {
      tabSlug,
      tabLabel,
      termometroScore,
      signals,
    }
    fetch('/api/macro/ai/analyze-tab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
      .then((r) => r.json())
      .then((json) => {
        if (!json?.ok) {
          setErr(json?.error || 'request_failed')
          setState('error')
          return
        }
        setData(json as TabAnalysisResponse)
        setState('success')
        try { window.sessionStorage.setItem(cacheKey, JSON.stringify(json)) } catch { /* */ }
      })
      .catch((e) => {
        setErr(e.message)
        setState('error')
      })
  }, [tabSlug, tabLabel, termometroScore, signals, loading])

  const accent = termometroScore >= 70 ? '#16a34a' : termometroScore >= 50 ? '#f59e0b' : '#dc2626'

  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #faf5ff 0%, #fff 60%)',
        border: '1px solid #e9d5ff',
        borderLeft: `4px solid ${accent}`,
        borderRadius: 12,
        padding: 18,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#7c3aed', textTransform: 'uppercase' }}>
            ✦ Lectura ejecutiva IA · {tabLabel}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
            {state === 'success' && data
              ? data.insight.headline
              : state === 'loading'
              ? 'Generando lectura ejecutiva con IA…'
              : state === 'error'
              ? 'Lectura IA no disponible'
              : `Pulso macro España · score ${termometroScore}/100`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {state === 'success' && data && (
            <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, letterSpacing: 0.4 }}>
              {data.provider === 'groq' ? 'Groq GPT-OSS' : 'Anthropic Claude'} · confianza {Math.round((data.insight.confidenceScore ?? 0) * 100)}%
            </span>
          )}
          {state === 'loading' && (
            <span style={{ fontSize: 11, color: '#7c3aed' }}>
              <span className="ai-spin" style={{ display: 'inline-block', marginRight: 6 }}>✦</span>
              Razonando…
            </span>
          )}
          {state === 'error' && (
            <span style={{ fontSize: 11, color: '#dc2626' }}>{err}</span>
          )}
        </div>
      </header>

      {state === 'success' && data && (
        <div style={{ marginTop: 14, color: '#334155', fontSize: 14, lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 14px' }}>{data.insight.diagnosis}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {data.insight.strengths.length > 0 && (
              <SectionBlock title="Fortalezas">
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {data.insight.strengths.map((s, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      <strong style={{ color: '#16a34a' }}>{s.family}:</strong> {s.description}
                    </li>
                  ))}
                </ul>
              </SectionBlock>
            )}
            {data.insight.vulnerabilities.length > 0 && (
              <SectionBlock title="Vulnerabilidades">
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {data.insight.vulnerabilities.map((v, i) => {
                    const sev = SEVERITY_COLOR[v.severity]
                    return (
                      <li key={i} style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 9, padding: '2px 6px', background: sev.bg, color: sev.color, borderRadius: 4, fontWeight: 700, letterSpacing: 0.3, marginRight: 6 }}>
                          {v.severity.toUpperCase()}
                        </span>
                        <strong style={{ color: '#0f172a' }}>{v.family}:</strong> {v.description}
                      </li>
                    )
                  })}
                </ul>
              </SectionBlock>
            )}
            <SectionBlock title="Implicaciones de política">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {data.insight.policyImplications.map((p, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{p}</li>
                ))}
              </ul>
            </SectionBlock>
            <SectionBlock title="A vigilar">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {data.insight.watchNext.map((p, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{p}</li>
                ))}
              </ul>
            </SectionBlock>
          </div>

          <p style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 12 }}>
            {data.disclaimer}
          </p>
        </div>
      )}

      {state === 'loading' && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#64748b' }}>
          El modelo está sintetizando un diagnóstico transversal a partir de {signals.length} señales macro live.
        </p>
      )}

      <style jsx>{`
        @keyframes ai-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        :global(.ai-spin) {
          animation: ai-spin 1.4s linear infinite;
        }
      `}</style>
    </section>
  )
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>
        {title}
      </p>
      <div style={{ marginTop: 4, fontSize: 12.5, color: '#334155' }}>{children}</div>
    </div>
  )
}

export default HeroEjecutivo
