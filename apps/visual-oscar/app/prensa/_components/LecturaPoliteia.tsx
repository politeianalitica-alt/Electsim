'use client'
/**
 * `<LecturaPoliteia />` · Card analítica IA reutilizable.
 *
 * Llama a /api/medios/lectura con el contexto del tab/búsqueda y muestra
 * el resumen LLM con disclaimer "Generado por IA · revisar".
 *
 * Lazy: solo dispara cuando el usuario pulsa "Generar lectura" para evitar
 * costes en cada page-load.
 */
import { useState } from 'react'

interface Props {
  tabId?: string
  query?: string
  accent?: string
  context: any
}

export function LecturaPoliteia({ tabId, query, accent = '#7C3AED', context }: Props) {
  const [loading, setLoading] = useState(false)
  const [lectura, setLectura] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setLoading(true); setError(null); setLectura(null)
    try {
      const r = await fetch('/api/medios/lectura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabId, query, context }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) {
        setError(d.error || d.hint || `HTTP ${r.status}`)
      } else {
        setLectura(d.lectura)
      }
    } catch (e: any) {
      setError(String(e?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: 14, borderLeft: `4px solid ${accent}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
            ✦ Lectura Politeia · IA
          </p>
          <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
            Análisis ejecutivo generado por LLM a partir del contexto del tab. Revisar antes de citar.
          </p>
        </div>
        {!lectura && !loading && (
          <button
            onClick={run}
            style={{ background: accent, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Generar lectura →
          </button>
        )}
        {lectura && (
          <button
            onClick={run}
            style={{ background: '#fff', color: accent, border: `1px solid ${accent}`, borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >
            ↻ Regenerar
          </button>
        )}
      </div>

      {loading && (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '14px 0 0', fontStyle: 'italic' }}>
          Generando análisis con LLM…
        </p>
      )}
      {error && (
        <div style={{ marginTop: 12, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
          <p style={{ fontSize: 11, color: '#991b1b', margin: 0 }}>▲ {error}</p>
        </div>
      )}
      {lectura && (
        <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 6 }}>
          <pre style={{ fontFamily: 'inherit', fontSize: 13, color: '#0f172a', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{lectura}</pre>
          <p style={{ fontSize: 9, color: '#94a3b8', margin: '12px 0 0', fontStyle: 'italic' }}>
            Generado por IA · revisar antes de citar · CLAUDE.md A2 disclaimer
          </p>
        </div>
      )}
    </section>
  )
}

export default LecturaPoliteia
