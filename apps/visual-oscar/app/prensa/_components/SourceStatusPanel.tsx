'use client'
/**
 * SourceStatusPanel · Sprint 0.5
 *
 * Panel colapsable con el estado de las fuentes RSS / scraping. Consume
 * /api/medios/fuentes-status y muestra contadores alive/total · errored ·
 * stale. El detalle por fuente lo expone Sprint 1.1+.
 */
import { useEffect, useState } from 'react'

interface FuentesStatusResponse {
  summary?: {
    total: number
    alive: number
    errored: number
    stale: number
  }
}

export function SourceStatusPanel() {
  const [data, setData] = useState<FuentesStatusResponse | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/medios/fuentes-status')
      .then((r) => r.json())
      .then((d: FuentesStatusResponse) => {
        if (cancelled) return
        setData(d)
      })
      .catch(() => {
        if (cancelled) return
        setData(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!data?.summary) return null

  const { total, alive, errored, stale } = data.summary

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: 4,
        padding: '4px 8px',
        fontSize: 12,
        background: '#fff',
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'inherit',
          fontSize: 12,
          color: '#1d1d1f',
        }}
        aria-expanded={expanded}
      >
        ⊞ Estado fuentes · {alive}/{total} vivos
        {errored > 0 && ` · ${errored} errored`}
        {stale > 0 && ` · ${stale} stale`}
      </button>
      {expanded && (
        <div style={{ marginTop: 8, color: '#666', fontSize: 11 }}>
          (detalle por fuente · Sprint 1.1+)
        </div>
      )}
    </div>
  )
}
