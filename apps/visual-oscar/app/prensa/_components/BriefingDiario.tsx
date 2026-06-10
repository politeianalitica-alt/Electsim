'use client'

/**
 * BriefingDiario — resumen del pulso de prensa. SIEMPRE muestra un briefing
 * determinista construido con los datos (funciona sin IA). Botón opcional
 * "Redactar con IA" que llama a /api/medios/briefing (Gemini); si no hay clave
 * configurada, degrada con un aviso y conserva el determinista. Sin emojis.
 */

import { useMemo, useState } from 'react'

interface ClusterLike {
  title: string
  main_topic?: string
  frame_type?: string
  acceleration_score?: number
  velocity_score?: number
  controversy_score?: number
}
interface GapLike { topic: string }

export default function BriefingDiario({
  clusters,
  gaps,
  balanceScore,
  totalArticles,
}: {
  clusters?: ClusterLike[]
  gaps?: GapLike[]
  balanceScore?: number
  totalArticles?: number
}) {
  const [iaText, setIaText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [iaError, setIaError] = useState<string | null>(null)

  const cl = clusters ?? []

  const deterministic = useMemo(() => {
    if (cl.length === 0) return 'Sin suficientes datos para un briefing en esta ventana.'
    const top = cl.slice(0, 3).map((c) => c.title).filter(Boolean)
    const accel = cl
      .filter((c) => (c.acceleration_score ?? 0) >= 55 || (c.velocity_score ?? 0) >= 70)
      .map((c) => c.main_topic || c.title)
      .filter(Boolean)
      .slice(0, 3)
    const polemica = cl.filter((c) => (c.controversy_score ?? 0) >= 65).map((c) => c.main_topic || c.title).slice(0, 2)
    const parts: string[] = []
    parts.push(`Hoy la agenda mediática${totalArticles ? ` (${totalArticles} titulares)` : ''} la marcan ${cl.length} narrativas.`)
    if (top.length) parts.push(`Las más relevantes: ${top.join('; ')}.`)
    if (accel.length) parts.push(`Acelerando: ${accel.join(', ')}.`)
    if (polemica.length) parts.push(`Mayor polémica: ${polemica.join(', ')}.`)
    if (gaps && gaps.length) parts.push(`Cobertura baja en: ${gaps.slice(0, 2).map((g) => g.topic).join(', ')}.`)
    if (balanceScore != null) parts.push(`Equilibrio ideológico de la cobertura: ${Math.round(balanceScore * 100)}/100.`)
    return parts.join(' ')
  }, [cl, gaps, balanceScore, totalArticles])

  const context = useMemo(() => {
    const lines: string[] = []
    lines.push(`Narrativas dominantes (${cl.length}):`)
    for (const c of cl.slice(0, 8)) {
      lines.push(`- ${c.title}${c.main_topic ? ` [tema: ${c.main_topic}]` : ''}${c.frame_type ? ` [enfoque: ${c.frame_type}]` : ''}${(c.acceleration_score ?? 0) >= 55 ? ' [acelerando]' : ''}${(c.controversy_score ?? 0) >= 65 ? ' [polémica alta]' : ''}`)
    }
    if (gaps && gaps.length) lines.push(`Huecos de cobertura: ${gaps.slice(0, 4).map((g) => g.topic).join(', ')}.`)
    if (balanceScore != null) lines.push(`Equilibrio ideológico: ${Math.round(balanceScore * 100)}/100.`)
    if (totalArticles) lines.push(`Total titulares analizados: ${totalArticles}.`)
    return lines.join('\n')
  }, [cl, gaps, balanceScore, totalArticles])

  async function redactarIA() {
    setLoading(true)
    setIaError(null)
    try {
      const res = await fetch('/api/medios/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      })
      if (res.status === 503) {
        setIaError('La redacción con IA no está disponible (falta configurar la clave del modelo). Se mantiene el resumen automático.')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json?.briefing) setIaText(json.briefing)
      else throw new Error('respuesta vacía')
    } catch {
      setIaError('No se pudo redactar con IA ahora mismo. Se mantiene el resumen automático.')
    } finally {
      setLoading(false)
    }
  }

  if (cl.length === 0) return null

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderLeft: '3px solid #14274E', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#14274E' }}>
          ◆ Briefing del día
        </span>
        <button
          onClick={redactarIA}
          disabled={loading}
          style={{ background: loading ? '#F5F5F7' : '#14274E', color: loading ? '#6e6e73' : '#fff', border: 'none', borderRadius: 999, padding: '6px 14px', fontSize: 11.5, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        >
          {loading ? 'Redactando…' : iaText ? '↻ Reescribir con IA' : '✦ Redactar con IA'}
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: '#1d1d1f' }}>
        {iaText || deterministic}
      </p>
      {iaText && <p style={{ margin: '6px 0 0', fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>Redactado con IA a partir del análisis automático.</p>}
      {iaError && <p style={{ margin: '6px 0 0', fontSize: 11, color: '#b45309' }}>{iaError}</p>}
    </section>
  )
}
