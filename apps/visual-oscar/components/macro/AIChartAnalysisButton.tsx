'use client'
/**
 * `<AIChartAnalysisButton />` · AUTO-LOAD del análisis Groq al montar.
 *
 * Comportamiento actualizado (2026-05-22):
 * - Se dispara automáticamente al montar; no requiere click.
 * - Render por defecto: panel inline con la lectura IA.
 * - Botón "Regenerar IA" disponible tras éxito para ignorar caché.
 *
 * Caché en cliente vía sessionStorage por `indicatorId + last period`
 * (TTL durante la sesión) → re-renders instantáneos.
 *
 * Props: `input` = `ChartAnalysisInput` (sin tier; el componente decide).
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  ChartAnalysisInput,
  ChartAnalysisResponse,
  ChartAnalysisError,
} from '@/lib/macro/ai-schema'
import { AIInsightPanel } from './AIInsightPanel'

interface Props {
  input: ChartAnalysisInput
  accent?: string
  /** Si true, renderiza inline; si false, sólo el botón. */
  inline?: boolean
  /** Callback opcional cuando llega el resultado. */
  onResult?: (r: ChartAnalysisResponse) => void
}

function sessionKey(input: ChartAnalysisInput): string {
  const last = input.series[input.series.length - 1]
  return `macro:ai:${input.indicatorId}:${last?.period ?? ''}:${input.tier ?? 'premium'}`
}

export function AIChartAnalysisButton({ input, accent = '#7c3aed', inline = true, onResult }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [data, setData] = useState<ChartAnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(async () => {
    if (state === 'loading') return

    // 1) Mira sessionStorage primero
    try {
      const key = sessionKey(input)
      const cached = typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null
      if (cached) {
        const parsed = JSON.parse(cached) as ChartAnalysisResponse
        setData({ ...parsed, cache_hit: true })
        setState('success')
        onResult?.(parsed)
        return
      }
    } catch {
      /* ignore quota errors */
    }

    setState('loading')
    setError(null)
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/macro/ai/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: ctrl.signal,
      })
      const json = (await res.json()) as ChartAnalysisResponse | ChartAnalysisError
      if (!('ok' in json) || !json.ok) {
        const e = json as ChartAnalysisError
        const detail = (e as { detail?: string }).detail
        // Sprint L F2: combinar code + detail para diagnóstico claro.
        setError(detail ? `${e.error} · ${detail.slice(0, 140)}` : (e.error || `HTTP ${res.status}`))
        setState('error')
        return
      }
      setData(json)
      setState('success')
      onResult?.(json)
      try {
        window.sessionStorage.setItem(sessionKey(input), JSON.stringify(json))
      } catch {
        /* ignore quota */
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError((err as Error).message || 'request_failed')
      setState('error')
    }
  }, [input, state, onResult])

  const regenerate = useCallback(() => {
    try {
      window.sessionStorage.removeItem(sessionKey(input))
    } catch {
      /* ignore */
    }
    setData(null)
    setState('idle')
    run()
  }, [input, run])

  // Auto-dispara el análisis al montar (cuando hay input válido y >= 4 puntos).
  // Se re-ejecuta solo si cambia el indicatorId o el último periodo.
  const indicatorId = input.indicatorId
  const lastPeriod = input.series[input.series.length - 1]?.period
  useEffect(() => {
    if (input.series && input.series.length >= 4) {
      run()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicatorId, lastPeriod])

  return (
    <>
      {state === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, fontSize: 12, color: accent, fontWeight: 600 }}>
          <span className="ai-spin" style={{ display: 'inline-block' }}>✦</span>
          <span>Groq leyendo la curva · cargando análisis…</span>
        </div>
      )}
      {state === 'error' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
          <span style={{ fontSize: 11, color: '#dc2626' }}>Análisis IA no disponible · {error}</span>
          <button onClick={run} style={pillStyle('#dc2626', false)} type="button">
            ↻ Reintentar
          </button>
        </div>
      )}

      {inline && state === 'success' && data && (
        <>
          <AIInsightPanel
            data={data}
            accent={accent}
            onClose={() => {
              setData(null)
              setState('idle')
            }}
          />
          <div style={{ marginTop: 6, textAlign: 'right' }}>
            <button
              onClick={regenerate}
              style={pillStyle(accent, false)}
              type="button"
              title="Regenerar análisis (ignora caché)"
            >
              ↻ Regenerar IA
            </button>
          </div>
        </>
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
    </>
  )
}

function pillStyle(accent: string, disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? '#f1f5f9' : '#faf5ff',
    color: disabled ? '#94a3b8' : accent,
    border: `1px solid ${disabled ? '#e2e8f0' : '#e9d5ff'}`,
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.3,
    cursor: disabled ? 'wait' : 'pointer',
    transition: 'background 120ms ease',
    display: 'inline-flex',
    gap: 4,
    alignItems: 'center',
  }
}

export default AIChartAnalysisButton
