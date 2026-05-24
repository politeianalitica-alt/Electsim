'use client'
/**
 * `<GeoIaBrief />` · Sprint G3.
 *
 * Brief ejecutivo automático generado por Gemini Flash Lite a partir de
 * todo el contexto geo agregado: risk index + top risks + cascading events
 * + sanciones + osint stats.
 *
 * Análogo a /api/macro/ai/analyze-tab pero adaptado a contexto geopolítico
 * con disclaimer riguroso (no recommendations + distingue hecho vs inferencia).
 *
 * Diferenciador: replica lo que un Eurasia Group analyst hace manualmente
 * (briefing diario), pero automatizado y refrescado cada 6h.
 */
import { useEffect, useState } from 'react'
import { GeoAudioBrief } from './GeoAudioBrief'

interface BriefResp {
  ok: boolean
  brief?: string
  context_used?: any
  fallback_brief?: string
  model?: string
  generated_at?: string
  error?: string
}

// Render simple markdown (## headers + listas + bold) sin libs externas
function renderMarkdown(md: string): JSX.Element[] {
  const lines = md.split('\n')
  const out: JSX.Element[] = []
  let listBuf: string[] = []
  const flushList = (key: string) => {
    if (listBuf.length === 0) return
    out.push(
      <ul key={key} style={{ margin: '4px 0 10px 18px', padding: 0, color: '#cbd5e1' }}>
        {listBuf.map((item, i) => (
          <li key={i} style={{ marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fbbf24">$1</strong>') }} />
        ))}
      </ul>,
    )
    listBuf = []
  }
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('## ')) {
      flushList(`l-${i}`)
      out.push(
        <h3 key={`h-${i}`} style={{ margin: '14px 0 6px', fontSize: 12, fontWeight: 700, color: '#fbbf24', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {trimmed.slice(3)}
        </h3>,
      )
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listBuf.push(trimmed.slice(2))
    } else if (trimmed) {
      flushList(`l-${i}`)
      out.push(
        <p key={`p-${i}`} style={{ margin: '0 0 8px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{ __html: trimmed.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fbbf24">$1</strong>') }} />,
      )
    }
  })
  flushList('l-final')
  return out
}

export function GeoIaBrief() {
  const [data, setData] = useState<BriefResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/ia-brief', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: 'linear-gradient(180deg, #1a1325 0%, #0f172a 100%)',
      border: '1px solid #312e81',
      borderLeft: '4px solid #7c3aed',
      borderRadius: 12,
      padding: 18,
      color: '#f1f5f9',
    }}>
      <header style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#a855f7', textTransform: 'uppercase' }}>
            ◆ Brief geopolítico IA · estilo Eurasia Group diario
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
            Generado por Gemini 2.0 Flash Lite · contexto: risk index + top risks + eventos + sanciones
          </p>
        </div>
        <GeoAudioBrief />
      </header>
      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Generando brief…</p>}
      {data?.error && (
        <p style={{ fontSize: 11, color: '#fca5a5' }}>
          Brief IA no disponible · {data.error}
          {data.fallback_brief && (
            <span style={{ display: 'block', marginTop: 4, color: '#94a3b8' }}>{data.fallback_brief}</span>
          )}
        </p>
      )}
      {data?.ok && data.brief && (
        <>
          <div>{renderMarkdown(data.brief)}</div>
          <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: 8 }}>
            Modelo: {data.model} · generado {data.generated_at?.slice(0, 16).replace('T', ' ')} · cache 6h
          </p>
        </>
      )}
    </section>
  )
}

export default GeoIaBrief
